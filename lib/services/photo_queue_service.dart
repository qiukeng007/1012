/// 照片后台队列：提交照片后立即返回，App 后台按顺序逐店处理。
/// 失败最多重试 [maxAttempts] 次（带退避）；未登录不计次数并等待登录后继续；
/// 任务持久化，退出登录/杀 App 后仍保留；完成后记录写入 history，
/// 配置页可查看逐店/逐步耗时并手动重试。
library;

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';
import '../models/store_config.dart';
import 'product_image_cache.dart';
import 'query_service.dart';

/// 照片任务来源
enum PhotoJobType { add, restock, sync }

extension PhotoJobTypeX on PhotoJobType {
  String get label {
    switch (this) {
      case PhotoJobType.add:
        return '新增照片';
      case PhotoJobType.restock:
        return '补货照片';
      case PhotoJobType.sync:
        return '同步照片';
    }
  }
}

/// 任务状态
enum PhotoJobStatus {
  pending,
  processing,
  success,
  partial,
  failed,
  superseded,
  waitingLogin,
}

extension PhotoJobStatusX on PhotoJobStatus {
  String get label {
    switch (this) {
      case PhotoJobStatus.pending:
        return '排队中';
      case PhotoJobStatus.processing:
        return '处理中';
      case PhotoJobStatus.success:
        return '成功';
      case PhotoJobStatus.partial:
        return '部分成功';
      case PhotoJobStatus.failed:
        return '已放弃';
      case PhotoJobStatus.superseded:
        return '被取代';
      case PhotoJobStatus.waitingLogin:
        return '等待登录';
    }
  }

  bool get isFinished =>
      this == PhotoJobStatus.success ||
      this == PhotoJobStatus.partial ||
      this == PhotoJobStatus.failed ||
      this == PhotoJobStatus.superseded;

  bool get canRetry =>
      this == PhotoJobStatus.partial || this == PhotoJobStatus.failed;
}

/// 单步耗时记录
class PhotoStep {
  final String name;
  final int ms;
  final String? detail;
  const PhotoStep({required this.name, required this.ms, this.detail});

  Map<String, dynamic> toJson() => {
        'name': name,
        'ms': ms,
        'detail': detail,
      };

  factory PhotoStep.fromJson(Map<String, dynamic> json) => PhotoStep(
        name: json['name'] as String? ?? '',
        ms: (json['ms'] as num?)?.toInt() ?? 0,
        detail: json['detail'] as String?,
      );
}

/// 单店处理结果
class PhotoStoreResult {
  final String storeKey;
  final String storeName;
  final String status; // success / failed / waitingLogin
  final String? imageUrl;
  final String? error;
  final List<PhotoStep> steps;
  final int wallMs;
  const PhotoStoreResult({
    required this.storeKey,
    required this.storeName,
    required this.status,
    this.imageUrl,
    this.error,
    this.wallMs = 0,
    this.steps = const [],
  });

  String get statusText {
    switch (status) {
      case 'success':
        return '成功';
      case 'waitingLogin':
        return '未登录';
      default:
        return '失败';
    }
  }

  Map<String, dynamic> toJson() => {
        'storeKey': storeKey,
        'storeName': storeName,
        'status': status,
        'imageUrl': imageUrl,
        'error': error,
        'steps': steps.map((e) => e.toJson()).toList(),
        'wallMs': wallMs,
      };

  factory PhotoStoreResult.fromJson(Map<String, dynamic> json) =>
      PhotoStoreResult(
        storeKey: json['storeKey'] as String? ?? '',
        storeName: json['storeName'] as String? ?? '',
        status: json['status'] as String? ?? 'failed',
        imageUrl: json['imageUrl'] as String?,
        error: json['error'] as String?,
        steps: ((json['steps'] as List?) ?? const [])
            .map((e) => PhotoStep.fromJson(e as Map<String, dynamic>))
            .toList(),
        wallMs: (json['wallMs'] as num?)?.toInt() ?? 0,
      );
}

/// 队列完成事件（供页面刷新图片 / 角标）
class PhotoJobEvent {
  final String jobId;
  final PhotoJobType type;
  final PhotoJobStatus status;
  final String barcode;
  final String? productUid;
  final String? imageUrl;
  final int successCount;
  final int totalStores;
  final List<String> failedStores;
  final int? totalMs;
  const PhotoJobEvent({
    required this.jobId,
    required this.type,
    required this.status,
    required this.barcode,
    this.productUid,
    this.imageUrl,
    required this.successCount,
    required this.totalStores,
    this.failedStores = const [],
    this.totalMs,
  });

  bool get fullSuccess =>
      status == PhotoJobStatus.success && failedStores.isEmpty;
}
/// 照片后台队列服务（单例）
class PhotoQueueService {
  PhotoQueueService._();

  static final PhotoQueueService instance = PhotoQueueService._();

  /// 网络/银豹错误最多重试次数，超过后放弃并记录（未登录不计次数）
  static const int maxAttempts = 5;

  /// 配置页日志最多保留条数
  static const int historyCap = 200;

  static const List<int> _backoffMs = [5000, 15000, 60000, 60000];

  final _PhotoQueueNotifier _notifier = _PhotoQueueNotifier();
  final StreamController<PhotoJobEvent> _events =
      StreamController<PhotoJobEvent>.broadcast();
  QueryService? _queryService;
  bool _pumping = false;
  int _pendingCount = 0;
  int _seq = 0;
  /// 当前是否有任务正在上传（驱动首页“运行中”转圈动画）
  bool _processingActive = false;
  /// 运行中已被新任务取代的任务 id：worker 内存态可能落后于磁盘标记，
  /// 需以此集合为准，避免旧任务继续跑完剩余门店。
  final Set<String> _cancelledIds = <String>{};

  ChangeNotifier get notifier => _notifier;
  Stream<PhotoJobEvent> get events => _events.stream;
  int get pendingCount => _pendingCount;
  bool get isProcessingActive => _processingActive;

  void addListener(void Function() l) => _notifier.addListener(l);
  void removeListener(void Function() l) => _notifier.removeListener(l);

  /// 首页加载完成后绑定 QueryService 并启动消费
  Future<void> attach(QueryService qs) async {
    _queryService = qs;
    await refreshCount();
    start();
  }

  Future<void> start() async {
    if (_pumping) return;
    _pumping = true;
    try {
      await _pumpLoop();
    } finally {
      _pumping = false;
    }
  }

  /// 照片提交的目标门店：总账号模式(存在门店ID)取全部有效门店；
  /// 门店单独登录模式(1011-1)取已登录有效门店。
  static List<StoreConfig> photoTargetStores(List<StoreConfig> configs) {
    final hasMaster = configs.any((c) => c.storeId.isNotEmpty);
    if (hasMaster) {
      return configs.where((c) => c.storeId.isNotEmpty || c.isValid).toList();
    }
    return configs.where((c) => c.isValid).toList();
  }

  // ==================== 入队 ====================

  /// 入队一张照片任务。[imageBytes] 与 [sourceUrl] 二选一：
  /// 新照片传字节（本地压缩后落盘）；同步已有照片传 CDN 原图地址（Worker 下载）。
  Future<PhotoJob> enqueue({
    required PhotoJobType type,
    required String barcode,
    required String productName,
    String? productUid,
    List<int>? imageBytes,
    String? sourceUrl,
    String opName = '',
    bool writeDesc = false,
    /// 同步已有图任务的源店（已有图的门店，可以是任意门店含总部）；
    /// 提供且有门店ID时优先走官方 SyncUpdateProductToStores 同步
    StoreConfig? sourceStore,
    required List<StoreConfig> stores,
  }) async {
    if (stores.isEmpty) {
      throw StateError('没有可同步的有效门店');
    }
    final code = barcode.trim();
    if (code.isEmpty) throw StateError('条码为空');
    if ((imageBytes == null) == (sourceUrl == null)) {
      throw StateError('必须且只能提供 imageBytes 或 sourceUrl 之一');
    }

    // 同商品(条码+uid)合并：丢弃旧任务只跑最新
    final oldJobs = await _loadQueue();
    for (final dup in oldJobs) {
      if (dup.barcode != code ||
          (dup.productUid ?? '') != (productUid ?? '') ||
          dup.status.isFinished) {
        continue;
      }
      if (dup.status == PhotoJobStatus.processing) {
        dup.superseded = true;
        _cancelledIds.add(dup.id);
        await _saveQueueJob(dup);
      } else {
        await _deleteImage(dup);
        await _deleteQueueFile(dup.id);
      }
    }

    final now = DateTime.now();
    final id =
        '${now.millisecondsSinceEpoch}_${(_seq++).toString().padLeft(3, '0')}';
    String? fileName;
    if (imageBytes != null) {
      final compressed = compressForUpload(Uint8List.fromList(imageBytes));
      fileName = '$id.jpg';
      final file =
          File('${(await _imgDir()).path}${Platform.pathSeparator}$fileName');
      await file.writeAsBytes(compressed, flush: true);
    }

    final job = PhotoJob(
      id: id,
      type: type,
      barcode: code,
      productName: productName,
      productUid: productUid,
      opName: opName,
      opDesc: _actionDesc(type),
      writeDesc: writeDesc,
      createdAt: now,
      status: PhotoJobStatus.pending,
      imageFile: fileName,
      sourceUrl: sourceUrl,
      sourceStore: sourceStore,
      stores: List.of(stores),
    );
    await _saveQueueJob(job);
    await refreshCount();
    _notify();
    start();
    return job;
  }

  static String _actionDesc(PhotoJobType type) {
    switch (type) {
      case PhotoJobType.add:
      case PhotoJobType.restock:
        return '更新照片';
      case PhotoJobType.sync:
        return '同步照片';
    }
  }

  // ==================== 查询 ====================

  Future<List<PhotoJob>> pendingJobs() => _loadQueue();

  Future<List<PhotoJob>> historyJobs() => _loadHistory();

  /// 该商品(条码+uid)是否已有排队/处理中的任务
  Future<bool> hasActiveJob(String barcode, String? productUid) async {
    final jobs = await _loadQueue();
    return jobs.any((j) =>
        j.barcode == barcode &&
        (j.productUid ?? '') == (productUid ?? '') &&
        !j.status.isFinished);
  }

  /// 队列 + 历史（时间倒序），供配置页展示
  Future<List<PhotoJob>> allJobs() async {
    final q = await _loadQueue();
    final h = await _loadHistory();
    final all = [...q, ...h];
    all.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return all;
  }

  Future<void> refreshCount() async {
    final jobs = await _loadQueue();
    _pendingCount = jobs.length;
    _processingActive = jobs.any((j) => j.status == PhotoJobStatus.processing);
  }

  // ==================== 人工操作 ====================

  /// 重试一条已放弃/部分成功的任务（需本地图片仍在或有源URL）
  Future<String?> retryJob(String id) async {
    final jobs = await _loadHistory();
    PhotoJob? job;
    for (final j in jobs) {
      if (j.id == id) {
        job = j;
        break;
      }
    }
    if (job == null) return '未找到该记录';
    _cancelledIds.remove(id);
    if (!job.canRetryNow) {
      return '该记录的图片已清理，无法自动重试，请重新拍照提交';
    }
    job.status = PhotoJobStatus.pending;
    job.attempts = 0;
    job.nextAttemptAt = 0;
    job.finishedAt = null;
    job.totalMs = null;
    job.results = [];
    await _deleteHistoryFile(job.id);
    await _saveQueueJob(job);
    await refreshCount();
    _notify();
    start();
    return null;
  }

  /// 删除一条记录（队列或历史），并清理其本地图片文件
  Future<void> deleteJob(String id) async {
    _cancelledIds.remove(id);
    await _deleteQueueFile(id);
    await _deleteHistoryFile(id);
    try {
      final f =
          File('${(await _imgDir()).path}${Platform.pathSeparator}$id.jpg');
      if (await f.exists()) await f.delete();
    } catch (_) {}
    await refreshCount();
    _notify();
  }

  /// 清空历史日志（含图片）
  Future<void> clearHistory() async {
    final jobs = await _loadHistory();
    for (final j in jobs) {
      await deleteJob(j.id);
    }
    _notify();
  }
  // ==================== 后台处理 ====================

  Future<void> _pumpLoop() async {
    while (_pumping) {
      final qs = _queryService;
      if (qs == null) break;
      final jobs = await _loadQueue();
      if (jobs.isEmpty) break;

      // 崩溃/杀进程恢复：处理中被中断的任务回到排队重跑；已被取代的收尾归档
      for (final j in jobs) {
        if (j.superseded) {
          await _finishSuperseded(j);
        } else if (j.status == PhotoJobStatus.processing) {
          j.status = PhotoJobStatus.pending;
          j.nextAttemptAt = 0;
          await _saveQueueJob(j);
        }
      }

      final nowMs = DateTime.now().millisecondsSinceEpoch;
      PhotoJob? todo;
      int? soonest;
      for (final j in jobs) {
        if (j.status == PhotoJobStatus.pending && j.nextAttemptAt <= nowMs) {
          todo = j;
          break;
        }
        if (j.status == PhotoJobStatus.pending && j.nextAttemptAt > nowMs) {
          if (soonest == null || j.nextAttemptAt < soonest) {
            soonest = j.nextAttemptAt;
          }
        }
      }

      if (todo == null) {
        // 无待办：可能在退避，也可能在等待登录（Cookie 恢复后自动转回排队）
        var anyWaiting = false;
        for (final j in jobs) {
          if (j.status != PhotoJobStatus.waitingLogin) continue;
          anyWaiting = true;
          for (final s in j.stores) {
            if (await qs.hasSessionCookie(s)) {
              j.status = PhotoJobStatus.pending;
              j.nextAttemptAt = 0;
              await _saveQueueJob(j);
              todo = j;
              break;
            }
          }
          if (todo != null) break;
        }
        if (todo == null) {
          final waitMs = soonest != null
              ? (soonest - nowMs).clamp(1000, 20000)
              : (anyWaiting ? 20000 : 5000);
          await Future<void>.delayed(
              Duration(milliseconds: (waitMs as num).toInt()));
          continue;
        }
      }

      final fresh = await _loadQueueJob(todo.id);
      if (fresh == null) continue; // 文件已被删除（合并/删除）
      if (fresh.superseded) _cancelledIds.add(fresh.id);
      await _processJob(qs, fresh);
    }
  }

  /// 官方同步执行器：总账号(带门店ID)任务优先走银豹 SyncUpdateProductToStores，
  /// 源店一次上传/取图后，其余门店仅发轻量 JSON 同步请求。
  /// 返回 (是否已处理, 是否真实执行过网络请求)。
  Future<(bool, bool)> _tryOfficialRun(
    QueryService qs,
    PhotoJob job,
    List<int>? bytes,
    String? resolveErr,
    List<StoreConfig> todoStores,
    List<PhotoStoreResult> storeResults,
  ) async {
    if (todoStores.isEmpty) return (false, false);
    // 源店：同步已有图任务用 job.sourceStore（任意门店含总部）；
    // 新照片任务默认取第一个待处理门店作为“上传一次”的种子店
    final seed = job.sourceStore ??
        (job.stores.length > 1 ? job.stores.first : null);
    if (seed == null || seed.storeId.isEmpty) return (false, false);
    if (!job.stores.every((s) => s.storeId.isNotEmpty)) {
      return (false, false);
    }
    // 新照片(imageFile)时 job.sourceStore=归属门店
    // 一律从该源店上传一次，其余门店(含总部)走官方同步
    final needUpload = job.imageFile != null;
    if (needUpload && bytes == null) return (false, false);
    if (!needUpload && (job.sourceStore == null || job.sourceUrl == null)) {
      return (false, false);
    }

    if (!await qs.hasSessionCookie(seed)) {
      // 与旧逻辑一致的“等待登录”语义：不消耗重试次数
      for (final s in job.stores) {
        if (storeResults.any((r) =>
            r.storeKey == s.storeKey && r.status == 'success')) {
          continue;
        }
        storeResults.removeWhere((r) => r.storeKey == s.storeKey);
        storeResults.add(PhotoStoreResult(
          storeKey: s.storeKey,
          storeName: s.name,
          status: 'waitingLogin',
          error: '未登录',
        ));
      }
      job.results = storeResults;
      await _saveQueueJob(job);
      _notify();
      return (true, false);
    }

    final targets = job.stores
        .where((s) => s.storeKey != seed.storeKey)
        .where((s) => !storeResults.any((r) =>
            r.storeKey == s.storeKey && r.status == 'success'))
        .toList();
    final sw = Stopwatch()..start();

    String? globalErr;
    String? imageUrl;
    List<(StoreConfig store, String? error, int ms)> syncResults =
        const [];
    if (needUpload) {
      // 种子店也缺图：源店删旧图+上传一次（必要时保存），再同步给其余门店
      final r = await qs.officialSyncProductImages(
        seed: seed,
        targets: targets,
        barcode: job.barcode,
        productUid: job.productUid,
        newImageBytes: bytes,
        imageName: 'IMG_${job.id}.jpg',
      );
      globalErr = r.$1;
      imageUrl = r.$2;
      syncResults = r.$3;
    } else {
      // 种子店已有图（自动补图/同步）：直接把种子店图片同步给缺图门店
      final r = await qs.officialSyncProductImages(
        seed: seed,
        targets: targets,
        barcode: job.barcode,
        productUid: job.productUid,
      );
      globalErr = r.$1;
      imageUrl = r.$2;
      syncResults = r.$3;
    }

    final syncWallMs = sw.elapsedMilliseconds;
    final noteResults = <String, ({int ms, String? error})>{};
    final needNote = job.writeDesc &&
        job.opName.trim().isNotEmpty &&
        globalErr == null;
    if (needNote) {
      final noteTasks = <Future<void>>[];
      Future<void> noteOne(StoreConfig s) async {
        final dw = Stopwatch()..start();
        final e = await qs.updateProductOperationNote(
          s,
          job.barcode,
          job.opName,
          job.opDesc,
          productUid: job.productUid,
        );
        noteResults[s.storeKey] = (ms: dw.elapsedMilliseconds, error: e);
      }
      if (job.stores.any((st) => st.storeKey == seed.storeKey)) {
        noteTasks.add(noteOne(seed));
      }
      for (final (store, error, _) in syncResults) {
        if (error != null) continue;
        if (storeResults.any((r) =>
            r.storeKey == store.storeKey && r.status == 'success')) {
          continue;
        }
        noteTasks.add(noteOne(store));
      }
      if (noteTasks.isNotEmpty) await Future.wait(noteTasks);
    }

    // 种子店结果（种子店同时是待同步门店时才记录）
    if (job.stores.any((s) => s.storeKey == seed.storeKey)) {
      final sSteps = <PhotoStep>[
        PhotoStep(name: '官方同步', ms: syncWallMs, detail: globalErr)
      ];
      final seedOk = globalErr == null;
      final seedNote = noteResults[seed.storeKey];
      if (seedNote != null) {
        sSteps.add(PhotoStep(
            name: '写操作记录', ms: seedNote.ms, detail: seedNote.error));
      }
      storeResults.removeWhere((r) => r.storeKey == seed.storeKey);
      storeResults.add(PhotoStoreResult(
        storeKey: seed.storeKey,
        storeName: seed.name,
        status: seedOk ? 'success' : 'failed',
        imageUrl: imageUrl,
        error: globalErr ?? seedNote?.error,
        steps: sSteps,
        wallMs: syncWallMs,
      ));
    }

    if (globalErr != null && targets.isNotEmpty && syncResults.isEmpty) {
      // 全局失败（源店上传/取图失败）：其余待处理门店一并失败
      for (final s in targets) {
        storeResults.removeWhere((r) => r.storeKey == s.storeKey);
        storeResults.add(PhotoStoreResult(
          storeKey: s.storeKey,
          storeName: s.name,
          status: 'failed',
          error: globalErr,
          steps: const [PhotoStep(name: '官方同步', ms: 0, detail: '')],
          wallMs: syncWallMs,
        ));
      }
    } else {
      for (final (store, error, ms) in syncResults) {
        if (storeResults.any((r) =>
            r.storeKey == store.storeKey && r.status == 'success')) {
          continue;
        }
        final ok = error == null;
        final sSteps = <PhotoStep>[
          PhotoStep(name: '官方同步', ms: ms, detail: error)
        ];
        final note = noteResults[store.storeKey];
        if (ok && note != null) {
          sSteps.add(PhotoStep(
              name: '写操作记录', ms: note.ms, detail: note.error));
        }
        storeResults.removeWhere((r) => r.storeKey == store.storeKey);
        storeResults.add(PhotoStoreResult(
          storeKey: store.storeKey,
          storeName: store.name,
          status: ok ? 'success' : 'failed',
          imageUrl: imageUrl,
          error: error ?? note?.error,
          steps: sSteps,
          wallMs: ms,
        ));
      }
    }
    job.results = storeResults;
    await _saveQueueJob(job);
    _notify();
    final realRun =
        needUpload || syncResults.isNotEmpty || globalErr != null;
    return (true, realRun);
  }

  Future<void> _processJob(QueryService qs, PhotoJob job) async {
    if (job.superseded || _cancelledIds.contains(job.id)) {
      await _finishSuperseded(job);
      return;
    }
    job.status = PhotoJobStatus.processing;
    job.startedAt ??= DateTime.now().toIso8601String();
    await _saveQueueJob(job);
    await refreshCount();
    _notify();

    // 预解析图片字节（所有门店共用一份）
    List<int>? bytes;
    String? resolveErr;
    if (job.imageFile != null) {
      final f = File(
          '${(await _imgDir()).path}${Platform.pathSeparator}${job.imageFile}');
      try {
        if (await f.exists()) bytes = await f.readAsBytes();
      } catch (_) {}
      if (bytes == null) resolveErr = '本地图片文件缺失';
    } else if (job.sourceUrl != null) {
      bytes = await ProductImageCache.loadBytes(job.sourceUrl!);
      if (bytes == null) resolveErr = '原图下载失败';
    } else {
      resolveErr = '缺少图片来源';
    }

    final storeResults = List<PhotoStoreResult>.from(job.results);
    var realRun = false;

    final todoStores = job.stores
        .where((store) => !storeResults.any((r) =>
            r.storeKey == store.storeKey && r.status == 'success'))
        .toList();

    // 官方同步（总账号模式，所有门店均带 storeId）：
    // 源店一次改图/取图后，其余门店走官方 SyncUpdateProductToStores 轻量同步，
    // 避免每家店重复上传大图导致“4店≈2分钟 / 504”。
    final officialRun = await _tryOfficialRun(
      qs,
      job,
      bytes,
      resolveErr,
      todoStores,
      storeResults,
    );
    if (!officialRun.$1) {
      // 门店单独登录模式/无总账号门店ID：保持原逻辑——各门店并行独立上传
      final ranFlags = <bool>[];
      await Future.wait(todoStores.map((store) async {
        if (job.superseded || _cancelledIds.contains(job.id)) return;
        final result = await _runStore(
          qs,
          job,
          store,
          bytes: bytes,
          resolveErr: resolveErr,
        );
        storeResults.removeWhere((r) => r.storeKey == result.storeKey);
        storeResults.add(result);
        job.results = storeResults;
        ranFlags.add(result.status != 'waitingLogin');
        await _saveQueueJob(job);
        _notify();
      }));
      realRun = ranFlags.any((ran) => ran);
    } else {
      realRun = officialRun.$2;
    }

    if (job.superseded || _cancelledIds.contains(job.id)) {
      await _finishSuperseded(job);
      return;
    }

    final successCount =
        storeResults.where((r) => r.status == 'success').length;
    final waitingCount =
        storeResults.where((r) => r.status == 'waitingLogin').length;

    if (successCount == job.stores.length) {
      await _finalize(job, PhotoJobStatus.success);
      return;
    }

    if (waitingCount == job.stores.length) {
      // 全部未登录：不消耗次数，等待登录后继续
      job.status = PhotoJobStatus.waitingLogin;
      await _saveQueueJob(job);
      await refreshCount();
      _notify();
      return;
    }

    if (realRun) job.attempts++;

    if (job.attempts >= maxAttempts) {
      final st = successCount > 0
          ? PhotoJobStatus.partial
          : PhotoJobStatus.failed;
      await _finalize(job, st);
      return;
    }

    job.status = PhotoJobStatus.pending;
    final idx = (job.attempts - 1).clamp(0, _backoffMs.length - 1);
    final delayMs = _backoffMs[(idx as num).toInt()];
    job.nextAttemptAt = DateTime.now().millisecondsSinceEpoch + delayMs;
    await _saveQueueJob(job);
    await refreshCount();
    _notify();
  }

  Future<PhotoStoreResult> _runStore(
    QueryService qs,
    PhotoJob job,
    StoreConfig store, {
    required List<int>? bytes,
    required String? resolveErr,
  }) async {
    final steps = <PhotoStep>[];
    final sw = Stopwatch()..start();

    if (bytes == null) {
      final err = resolveErr ?? '图片数据为空';
      return PhotoStoreResult(
        storeKey: store.storeKey,
        storeName: store.name,
        status: 'failed',
        error: err,
        steps: [PhotoStep(name: '准备图片', ms: 0, detail: err)],
      );
    }

    final (err, url) = await qs.replaceProductImage(
      store,
      job.barcode,
      bytes,
      'IMG_${job.id}.jpg',
      productUid: job.productUid,
      productId: qs.getCachedProductId(store, job.barcode, job.productUid),
      onStep: (name, ms, detail) =>
          steps.add(PhotoStep(name: name, ms: ms, detail: detail)),
    );

    if (err == '未登录') {
      return PhotoStoreResult(
        storeKey: store.storeKey,
        storeName: store.name,
        status: 'waitingLogin',
        error: '未登录',
        steps: steps,
        wallMs: sw.elapsedMilliseconds,
      );
    }
    if (err != null || url == null) {
      return PhotoStoreResult(
        storeKey: store.storeKey,
        storeName: store.name,
        status: 'failed',
        error: err ?? '上传失败',
        steps: steps,
        wallMs: sw.elapsedMilliseconds,
      );
    }

    String? descErr;
    if (job.writeDesc && !job.superseded && job.opName.trim().isNotEmpty) {
      final dw = Stopwatch()..start();
      descErr = await qs.updateProductOperationNote(
        store,
        job.barcode,
        job.opName,
        job.opDesc,
        productUid: job.productUid,
      );
      steps.add(PhotoStep(
          name: '写操作记录',
          ms: dw.elapsedMilliseconds,
          detail: descErr));
    }

    return PhotoStoreResult(
      storeKey: store.storeKey,
      storeName: store.name,
      status: 'success',
      imageUrl: url,
      error: descErr,
      steps: steps,
      wallMs: sw.elapsedMilliseconds,
    );
  }

  Future<void> _finalize(PhotoJob job, PhotoJobStatus status) async {
    _cancelledIds.remove(job.id);
    job.status = status;
    job.finishedAt = DateTime.now().toIso8601String();
    job.totalMs = DateTime.now().difference(job.createdAt).inMilliseconds;
    final success = job.results
        .where((r) => r.status == 'success' && r.imageUrl != null)
        .toList();
    final imageUrl = success.isEmpty ? null : success.last.imageUrl;
    await _deleteQueueFile(job.id);
    await _saveHistoryJob(job);
    if (status == PhotoJobStatus.success ||
        status == PhotoJobStatus.superseded) {
      await _deleteImage(job);
    }
    await _pruneHistory();
    await refreshCount();
    _notify();
    _events.add(PhotoJobEvent(
      jobId: job.id,
      type: job.type,
      status: status,
      barcode: job.barcode,
      productUid: job.productUid,
      imageUrl: imageUrl,
      successCount: success.length,
      totalStores: job.stores.length,
      failedStores: job.results
          .where((r) => r.status == 'failed')
          .map((r) => r.storeName)
          .toList(),
      totalMs: job.totalMs,
    ));
  }

  Future<void> _finishSuperseded(PhotoJob job) async {
    _cancelledIds.remove(job.id);
    job.status = PhotoJobStatus.superseded;
    job.finishedAt = DateTime.now().toIso8601String();
    job.totalMs = DateTime.now().difference(job.createdAt).inMilliseconds;
    await _deleteQueueFile(job.id);
    await _saveHistoryJob(job);
    await _deleteImage(job);
    await _pruneHistory();
    await refreshCount();
    _notify();
  }
  // ==================== 存储 ====================

  Future<Directory> _rootDir() async {
    final docs = await getApplicationDocumentsDirectory();
    final dir =
        Directory('${docs.path}${Platform.pathSeparator}photo_queue');
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir;
  }

  Future<Directory> _queueDir() async {
    final d = Directory(
        '${(await _rootDir()).path}${Platform.pathSeparator}queue');
    if (!await d.exists()) await d.create(recursive: true);
    return d;
  }

  Future<Directory> _historyDir() async {
    final d = Directory(
        '${(await _rootDir()).path}${Platform.pathSeparator}history');
    if (!await d.exists()) await d.create(recursive: true);
    return d;
  }

  Future<Directory> _imgDir() async {
    final d = Directory(
        '${(await _rootDir()).path}${Platform.pathSeparator}images');
    if (!await d.exists()) await d.create(recursive: true);
    return d;
  }

  Future<List<PhotoJob>> _loadQueue() async => _loadDir(await _queueDir());

  Future<List<PhotoJob>> _loadHistory() async => _loadDir(await _historyDir());

  Future<PhotoJob?> _loadQueueJob(String id) async {
    final f = File(
        '${(await _queueDir()).path}${Platform.pathSeparator}$id.json');
    try {
      if (!await f.exists()) return null;
      return PhotoJob.fromJson(
          jsonDecode(await f.readAsString()) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  Future<List<PhotoJob>> _loadDir(Directory dir) async {
    final out = <PhotoJob>[];
    try {
      await for (final e in dir.list()) {
        if (e is! File || !e.path.endsWith('.json')) continue;
        try {
          final j = PhotoJob.fromJson(
              jsonDecode(await e.readAsString()) as Map<String, dynamic>);
          out.add(j);
        } catch (_) {}
      }
    } catch (_) {}
    out.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return out;
  }

  Future<void> _saveQueueJob(PhotoJob job) async {
    final f = File(
        '${(await _queueDir()).path}${Platform.pathSeparator}${job.id}.json');
    await f.writeAsString(jsonEncode(job.toJson()), flush: true);
  }

  Future<void> _saveHistoryJob(PhotoJob job) async {
    final f = File(
        '${(await _historyDir()).path}${Platform.pathSeparator}${job.id}.json');
    await f.writeAsString(jsonEncode(job.toJson()), flush: true);
  }

  Future<void> _deleteQueueFile(String id) async {
    try {
      final f = File(
          '${(await _queueDir()).path}${Platform.pathSeparator}$id.json');
      if (await f.exists()) await f.delete();
    } catch (_) {}
  }

  Future<void> _deleteHistoryFile(String id) async {
    try {
      final f = File(
          '${(await _historyDir()).path}${Platform.pathSeparator}$id.json');
      if (await f.exists()) await f.delete();
    } catch (_) {}
  }

  Future<void> _deleteImage(PhotoJob job) async {
    if (job.imageFile == null) return;
    try {
      final f = File(
          '${(await _imgDir()).path}${Platform.pathSeparator}${job.imageFile}');
      if (await f.exists()) await f.delete();
    } catch (_) {}
  }

  Future<void> _pruneHistory() async {
    try {
      final jobs = await _loadHistory();
      jobs.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      for (final j in jobs.skip(historyCap)) {
        await _deleteHistoryFile(j.id);
        await _deleteImage(j);
      }
    } catch (_) {}
  }

  void _notify() => _notifier.emit();

  // ==================== 压缩 ====================

  /// 银豹限制单图 ≤3MB；统一压缩到 ≤500KB（与旧页面逻辑一致）
  static List<int> compressForUpload(Uint8List bytes) {
    if (bytes.length < 512 * 1024) return bytes;
    try {
      final decoded = img.decodeImage(bytes);
      if (decoded == null) return bytes;
      final img2 = decoded.width >= decoded.height
          ? img.copyResize(decoded, width: 1200)
          : img.copyResize(decoded, height: 1200);
      for (final q in const [85, 70, 50, 35]) {
        final encoded = img.encodeJpg(img2, quality: q);
        if (encoded.length < 512 * 1024) return encoded;
      }
      final img3 = img2.width >= img2.height
          ? img.copyResize(img2, width: 800)
          : img.copyResize(img2, height: 800);
      return img.encodeJpg(img3, quality: 60);
    } catch (_) {
      return bytes;
    }
  }
}
/// 允许外部实例触发通知的 ChangeNotifier 子类
class _PhotoQueueNotifier extends ChangeNotifier {
  void emit() => notifyListeners();
}
/// 队列任务
class PhotoJob {
  final String id;
  final PhotoJobType type;
  final String barcode;
  final String productName;
  final String? productUid;
  final String opName;
  final String opDesc;
  final bool writeDesc;
  final DateTime createdAt;
  PhotoJobStatus status;
  int attempts;
  int nextAttemptAt;
  bool superseded;
  String? imageFile;
  String? sourceUrl;
  /// 同步已有图任务的源店（空 = 无固定源店/走逐店上传）
  StoreConfig? sourceStore;
  List<StoreConfig> stores;
  List<PhotoStoreResult> results;
  String? startedAt;
  String? finishedAt;
  int? totalMs;

  PhotoJob({
    required this.id,
    required this.type,
    required this.barcode,
    required this.productName,
    this.productUid,
    this.opName = '',
    this.opDesc = '',
    this.writeDesc = false,
    required this.createdAt,
    required this.status,
    this.attempts = 0,
    this.nextAttemptAt = 0,
    this.superseded = false,
    this.imageFile,
    this.sourceUrl,
    this.sourceStore,
    required this.stores,
    this.results = const [],
    this.startedAt,
    this.finishedAt,
    this.totalMs,
  });

  String get elapsedText {
    final ms = finishedAt == null
        ? DateTime.now().difference(createdAt).inMilliseconds
        : (totalMs ?? 0);
    if (ms < 1000) return '${ms} 毫秒';
    if (ms < 60000) return '${(ms / 1000).toStringAsFixed(1)} 秒';
    return '${(ms / 60000).toStringAsFixed(1)} 分钟';
  }

  bool get canRetryNow {
    if (!status.canRetry) return false;
    return (imageFile != null) || (sourceUrl != null);
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        'barcode': barcode,
        'productName': productName,
        'productUid': productUid,
        'opName': opName,
        'opDesc': opDesc,
        'writeDesc': writeDesc,
        'createdAt': createdAt.toIso8601String(),
        'status': status.name,
        'attempts': attempts,
        'nextAttemptAt': nextAttemptAt,
        'superseded': superseded,
        'imageFile': imageFile,
        'sourceUrl': sourceUrl,
        'sourceStore': sourceStore?.toJson(),
        'stores': stores.map((e) => e.toJson()).toList(),
        'results': results.map((e) => e.toJson()).toList(),
        'startedAt': startedAt,
        'finishedAt': finishedAt,
        'totalMs': totalMs,
      };

  factory PhotoJob.fromJson(Map<String, dynamic> json) => PhotoJob(
        id: json['id'] as String? ?? '',
        type: PhotoJobType.values.firstWhere(
            (e) => e.name == (json['type'] as String? ?? 'add'),
            orElse: () => PhotoJobType.add),
        barcode: json['barcode'] as String? ?? '',
        productName: json['productName'] as String? ?? '',
        productUid: json['productUid'] as String?,
        opName: json['opName'] as String? ?? '',
        opDesc: json['opDesc'] as String? ?? '',
        writeDesc: json['writeDesc'] as bool? ?? false,
        createdAt:
            DateTime.tryParse(json['createdAt'] as String? ?? '') ??
                DateTime.now(),
        status: PhotoJobStatus.values.firstWhere(
            (e) => e.name == (json['status'] as String? ?? 'pending'),
            orElse: () => PhotoJobStatus.pending),
        attempts: (json['attempts'] as num?)?.toInt() ?? 0,
        nextAttemptAt: (json['nextAttemptAt'] as num?)?.toInt() ?? 0,
        superseded: json['superseded'] as bool? ?? false,
        imageFile: json['imageFile'] as String?,
        sourceUrl: json['sourceUrl'] as String?,
        sourceStore: json['sourceStore'] == null
            ? null
            : StoreConfig.fromJson(
                json['sourceStore'] as Map<String, dynamic>),
        stores: ((json['stores'] as List?) ?? const [])
            .map((e) => StoreConfig.fromJson(e as Map<String, dynamic>))
            .toList(),
        results: ((json['results'] as List?) ?? const [])
            .map((e) => PhotoStoreResult.fromJson(e as Map<String, dynamic>))
            .toList(),
        startedAt: json['startedAt'] as String?,
        finishedAt: json['finishedAt'] as String?,
        totalMs: (json['totalMs'] as num?)?.toInt(),
      );
}
