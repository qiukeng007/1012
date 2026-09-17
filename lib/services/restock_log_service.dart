import 'dart:async';

import 'package:flutter/foundation.dart';
import '../utils/restock_time_format.dart';
import 'server_txt_service.dart';

/// 「这个商品上次什么时候提交过补货」的共享记录。
///
/// 存在补货服务器的公共文本文件里：所有手机、所有操作员看到的是同一份，
/// 换手机也不丢。文件放在 PIC 目录下，一行一个条码，打开就能看懂、也能手工改：
///
///   6901234567890=2026.09.14 15:22 新店 张三
///
/// 读写都走现成接口（GET /PIC/xxx.txt 读、index.esp?uploadlog 写），
/// 补货服务器不需要做任何改动。
///
/// 只认最近 [RestockTimeFormat.recentDays] 天（20 天）的记录：更早的既不显示，
/// 也会在下次提交补货写回文件时被删掉，文件不会越滚越大。
class RestockLogService {
  RestockLogService._();

  static final RestockLogService instance = RestockLogService._();

  /// 服务器 PIC 目录里的文件名
  static const String fileName = 'replenish_time.txt';

  /// 缓存有效期：同一次使用里，搜索时不必每次都重新下载
  static const Duration _ttl = Duration(minutes: 3);

  /// 条码 → 日期（2026.09.14）
  final Map<String, String> _dates = {};

  /// 条码 → 完整一行（2026.09.14 15:22 新店 张三）
  final Map<String, String> _lines = {};

  DateTime? _fetchedAt;
  String _loadedUrl = '';
  Future<void>? _inflight;
  String? _lastError;

  /// 记录变化的通知（每写成功一条、或重新下载完内容就 +1）。
  /// 查询页靠它立刻刷新补货按钮上的日期，不用等 3 分钟缓存过期。
  final ValueNotifier<int> revision = ValueNotifier<int>(0);

  /// 最近一次下载失败的原因（null = 没出错）
  String? get lastError => _lastError;

  /// 已经拿到的记录条数
  int get count => _dates.length;

  /// 某个条码上次提交补货的日期，例：2026.09.14；没有记录、或记录已超过
  /// 有效期（[RestockTimeFormat.recentDays] 天）返回 null
  String? lastDate(String barcode) => _recentLine(barcode) == null
      ? null
      : _dates[barcode.trim()];

  /// 某个条码上次提交补货的完整一行（含时间/门店/操作员）；
  /// 超过有效期的按没有记录处理
  String? lastLine(String barcode) => _recentLine(barcode);

  /// 取这个条码还在有效期内的那一行；没有/已过期返回 null
  String? _recentLine(String barcode) {
    final code = barcode.trim();
    final value = _lines[code];
    if (value == null) return null;
    if (!RestockTimeFormat.isRecent(value, DateTime.now())) return null;
    return value;
  }

  /// 确保已经拿到服务器上的记录（默认 3 分钟内只下载一次）。
  /// force = true 时强制重新下载。返回 true 表示这次真的重新下载过。
  Future<bool> ensureFresh(String serverUrl, {bool force = false}) async {
    final url = ServerTxtService.normalizeUrl(serverUrl);
    if (url.isEmpty) return false;
    final usable = _fetchedAt != null &&
        _loadedUrl == url &&
        DateTime.now().difference(_fetchedAt!) < _ttl;
    if (!force && usable) return false;
    // 已经在下载了就等它，不重复发请求（服务器按 IP 限流，省着点用）
    final running = _inflight;
    if (running != null) {
      await running;
      return false;
    }
    final task = _download(url);
    _inflight = task;
    try {
      await task;
    } finally {
      _inflight = null;
    }
    return true;
  }

  Future<void> _download(String url) async {
    try {
      final text = await ServerTxtService.instance.fetchTxt(url, fileName);
      loadText(text);
      _lastError = null;
    } catch (e) {
      // 文件还不存在（第一次用）不算出错；其它失败保留上一次的数据，下次再试
      final msg = e.toString();
      _lastError = msg.contains('不存在') ? null : msg;
    } finally {
      _fetchedAt = DateTime.now();
      _loadedUrl = url;
      revision.value++;
    }
  }

  /// 记录一次补货提交。成功返回 null；失败返回可复制的原因。
  Future<String?> record(
    String serverUrl,
    String barcode, {
    String store = '',
    String operator = '',
    DateTime? at,
  }) async {
    final url = ServerTxtService.normalizeUrl(serverUrl);
    final code = barcode.trim();
    if (url.isEmpty) return '补货服务器地址为空，没有记录这次提交时间';
    if (code.isEmpty) return '条码为空，没有记录这次提交时间';

    // 先拉服务器上的最新内容：这是公共文件，别人可能刚写过，不能直接覆盖
    await ensureFresh(url, force: true);

    final when = at ?? DateTime.now();
    final date = RestockTimeFormat.dateOfTime(when);
    final stamp = RestockTimeFormat.stamp(when);
    final who =
        [store.trim(), operator.trim()].where((s) => s.isNotEmpty).join(' ');
    final value = who.isEmpty ? stamp : '$stamp $who';

    // 写回前把过期的清掉：下次打开文件不会越来越大
    final removed = RestockTimeFormat.keepRecent(_lines, when);
    _lines
      ..clear()
      ..addAll(removed);
    _dates.removeWhere((k, _) => !_lines.containsKey(k));

    final oldDate = _dates[code];
    final oldLine = _lines[code];
    _dates[code] = date;
    _lines[code] = value;

    final err =
        await ServerTxtService.instance.uploadTxt(url, fileName, _serialize());
    if (err != null) {
      // 没写成功：把内存里这条撤回去，免得界面显示一个服务器上并不存在的时间
      if (oldDate == null) {
        _dates.remove(code);
      } else {
        _dates[code] = oldDate;
      }
      if (oldLine == null) {
        _lines.remove(code);
      } else {
        _lines[code] = oldLine;
      }
      _lastError = err;
      return err;
    }
    _lastError = null;
    revision.value++;
    return null;
  }

  /// 载入服务器上的文件内容（过期的行在这里就被丢掉）。
  /// 公开出来是为了能自检：正常流程只由 [_download] 调用。
  void loadText(String text) {
    _dates.clear();
    _lines.clear();
    final now = DateTime.now();
    RestockTimeFormat.parse(text).forEach((code, value) {
      // 超过有效期的直接丢：不显示，下次提交补货写回时也就从文件里删掉了
      if (!RestockTimeFormat.isRecent(value, now)) return;
      _lines[code] = value;
      _dates[code] = RestockTimeFormat.dateOf(value);
    });
  }

  String _serialize() => RestockTimeFormat.serialize(_lines);
}
