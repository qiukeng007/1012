import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';

/// 服务器 PIC 目录下的一个 txt 文件条目
class PicTxtEntry {
  final String name;
  final String dateText;
  final String sizeText;

  const PicTxtEntry({
    required this.name,
    required this.dateText,
    required this.sizeText,
  });
}

/// 管理员后门「PIC 文件管理」数据层
///
/// 补货服务器（Webesp）无需任何改动即可支持全部操作：
///  - GET /PIC/         服务器自带目录索引，返回 HTML 文件列表
///  - GET /PIC/xxx.txt  直接返回文本内容
///  - POST index.esp?uploadlog（multipart: user=文件名, image=内容）
///    把内容保存回 PIC/xxx.txt
/// 上传写法与「登录使用记录上报」完全一致（服务器已实测可用）。
class ServerTxtService {
  ServerTxtService._();

  static final ServerTxtService instance = ServerTxtService._();

  static const _cacheDirName = 'server_txt';

  /// 规范化补货服务器地址（缺协议头时补 http://，去掉结尾斜杠）
  /// 注意：不要像旧逻辑那样把 https 强制降级成 http——
  /// 走明文 http 时，手机网络/网关可能返回异常响应（实测遇到返回 "0000100"）导致上传失败；
  /// 使用记录上报走的就是 https，一直正常。
  static String normalizeUrl(String serverUrl) {
    var url = serverUrl.trim();
    if (url.isEmpty) return url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://$url';
    }
    while (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }
    return url;
  }

  static bool _safeName(String name) {
    return name.isNotEmpty &&
        name.toLowerCase().endsWith('.txt') &&
        !name.contains('/') &&
        !name.contains('\\') &&
        !name.startsWith('.');
  }

  /// 读取服务器 PIC 目录索引页原始内容（连接是否成功、页面多大都在这里体现）
  Future<String> fetchPicIndex(String serverUrl) async {
    final url = normalizeUrl(serverUrl);
    if (url.isEmpty) return '';
    return _getText('$url/PIC/');
  }

  /// 通过服务器 piclist 接口获取 PIC 目录 txt 文件名（方案B）。
  /// 服务器 index.esp 增加 piclist 分支后可用；未加分支/失败时返回空列表。
  /// 通过服务器 piclist 接口获取 PIC 目录 txt 文件名（方案B）。
  /// 服务器 index.esp 增加 piclist 分支后可用；未加分支/失败时返回空列表。
  ///
  /// 注意：用与“日常补货/使用记录”完全一致的多部分表单 POST（带一个普通
  /// 字段）发送，避免空内容请求被服务器安全防护误判为攻击而自动拉黑。
  Future<List<String>> fetchPicTxtList(String serverUrl) async {
    final url = normalizeUrl(serverUrl);
    if (url.isEmpty) return const [];
    final boundary = '----cashcarry${DateTime.now().millisecondsSinceEpoch}';
    final body = BytesBuilder();
    void w(List<int> bytes) => body.add(bytes);
    void line(String s) => w(utf8.encode('$s\r\n'));
    line('--$boundary');
    line('Content-Disposition: form-data; name="t"');
    line('');
    w(utf8.encode(DateTime.now().millisecondsSinceEpoch.toString()));
    w(const [13, 10]);
    line('--$boundary--');
    line('');
    final payload = body.toBytes();

    final client = HttpClient()..connectionTimeout = const Duration(seconds: 8);
    try {
      final req = await client.postUrl(Uri.parse('$url/index.esp?piclist'));
      req.headers.set(
        HttpHeaders.contentTypeHeader,
        'multipart/form-data; boundary=$boundary',
      );
      req.contentLength = payload.length;
      req.add(payload);
      final resp = await req.close().timeout(const Duration(seconds: 15));
      final bytes =
          await resp.fold<List<int>>(<int>[], (a, e) => a..addAll(e));
      if (resp.statusCode != 200) return const [];
      final text = utf8.decode(bytes, allowMalformed: true);
      final names = <String>{};
      for (final raw in text.split('\n')) {
        final n = raw.trim();
        if (_safeName(n)) names.add(n);
      }
      final list = names.toList()..sort();
      return list;
    } catch (_) {
      return const [];
    } finally {
      client.close();
    }
  }

  /// 列出 PIC 目录下所有 .txt（解析服务器自带目录索引页）
  Future<List<PicTxtEntry>> listTxt(String serverUrl) async {
    final body = await fetchPicIndex(serverUrl);
    return parseIndex(body);
  }

  /// 从目录索引 HTML 解析出全部 .txt 条目（独立出来便于页面诊断）
  static List<PicTxtEntry> parseIndex(String body) {
    final entries = <PicTxtEntry>[];
    if (body.isEmpty) return entries;
    final re = RegExp(
      r'<a href="([^"]+\.txt)"[^>]*>[^<]*</a>\s*([0-9/]+ [0-9:]+)?\s*([0-9]+)?',
      caseSensitive: false,
    );
    for (final m in re.allMatches(body)) {
      final name = m.group(1)!.trim();
      if (!_safeName(name)) continue;
      entries.add(PicTxtEntry(
        name: name,
        dateText: (m.group(2) ?? '').trim(),
        sizeText: (m.group(3) ?? '').trim(),
      ));
    }
    entries.sort((a, b) => a.name.compareTo(b.name));
    return entries;
  }

  /// 下载单个 txt 文件内容（服务器按原样返回，按 UTF-8 解码）
  Future<String> fetchTxt(String serverUrl, String name) async {
    final url = normalizeUrl(serverUrl);
    final bytes = await _getBytes('$url/PIC/${Uri.encodeComponent(name)}');
    final text = utf8.decode(bytes, allowMalformed: true);
    // Webesp/代理在“文件不存在”时也会返回 200 + 网页错误页，识别后按失败处理，
    // 避免把 HTML 错误页当文本内容打开或误覆盖上传。
    final t = text.trimLeft();
    if (t.startsWith('<') &&
        (t.contains('<html') ||
            t.contains('<HTML') ||
            t.contains('不存在') ||
            t.contains('Error') ||
            t.contains('error'))) {
      throw StateError('服务器上不存在 PIC/$name（或返回的不是文本内容）');
    }
    return text;
  }

  /// 回传（覆盖）PIC 下同名 txt；成功返回 null，失败返回原因
  Future<String?> uploadTxt(
    String serverUrl,
    String name,
    String content,
  ) async {
    final url = normalizeUrl(serverUrl);
    if (url.isEmpty) return '服务器地址为空';
    // 服务器按 multipart 的 user 字段 + ".txt" 命名保存
    final baseName = name.toLowerCase().endsWith('.txt')
        ? name.substring(0, name.length - 4)
        : name;
    final contentBytes = utf8.encode(content);
    final userBytes = utf8.encode(baseName);
    final boundary = '----picmgr${DateTime.now().millisecondsSinceEpoch}';
    final body = BytesBuilder();
    void w(List<int> bytes) => body.add(bytes);
    void line(String s) => w(utf8.encode('$s\r\n'));
    line('--$boundary');
    line('Content-Disposition: form-data; name="user"');
    line('');
    w(userBytes);
    w(const [13, 10]);
    line('--$boundary');
    line('Content-Disposition: form-data; name="image"; filename="log.txt"');
    line('Content-Type: text/plain');
    line('');
    w(contentBytes);
    line('--$boundary--');
    line('');
    final payload = body.toBytes();

    final client = HttpClient()..connectionTimeout = const Duration(seconds: 8);
    try {
      final postUrl = '$url/index.esp?uploadlog';
      final req = await client.postUrl(Uri.parse(postUrl));
      req.headers.set(
        HttpHeaders.contentTypeHeader,
        'multipart/form-data; boundary=$boundary',
      );
      req.contentLength = payload.length;
      req.add(payload);
      final resp = await req.close().timeout(const Duration(seconds: 15));
      final respBody = utf8
          .decode(
            await resp.fold<List<int>>(<int>[], (a, e) => a..addAll(e)),
            allowMalformed: true,
          )
          .replaceAll('\u{FEFF}', '')
          .trim();
      if (resp.statusCode == 200 && (respBody == 'ok' || respBody.isEmpty)) {
        return null;
      }
      // 服务器返回了非 "ok" 的内容（例如某些网关/防护返回 0000100）：
      // 回读服务器上的同名文件做二次确认，内容一致就按成功处理，
      // 避免把已经写成功的修改误报成失败。
      if (resp.statusCode == 200) {
        try {
          final back = await fetchTxt(serverUrl, name);
          if (back.replaceAll('\r\n', '\n') ==
              content.replaceAll('\r\n', '\n')) {
            return null;
          }
        } catch (_) {}
      }
      return 'HTTP ${resp.statusCode} 返回=$respBody（$postUrl）';
    } catch (e) {
      return e.toString();
    } finally {
      client.close();
    }
  }

  /// 本地已缓存（下载到手机）的文件名
  Future<List<String>> cachedNames() async {
    final dir = await cacheDir();
    if (!await dir.exists()) return const [];
    final names = <String>[];
    await for (final e in dir.list()) {
      if (e is File && e.path.toLowerCase().endsWith('.txt')) {
        names.add(e.path.split(RegExp(r'[\\/]')).last);
      }
    }
    return names;
  }

  /// 把内容保存到手机本地缓存
  Future<void> cacheTxt(String name, String content) async {
    final dir = await cacheDir();
    if (!await dir.exists()) await dir.create(recursive: true);
    await File('${dir.path}${Platform.pathSeparator}$name')
        .writeAsString(content, flush: true);
  }

  /// 读取手机本地缓存的文件内容（没有则返回 null）
  Future<String?> readCached(String name) async {
    final dir = await cacheDir();
    final f = File('${dir.path}${Platform.pathSeparator}$name');
    if (!await f.exists()) return null;
    return f.readAsString();
  }

  /// 删除手机本地缓存的文件（手动删除文件名时一并清理，避免下次刷新又出现）
  Future<void> deleteCache(String name) async {
    try {
      final dir = await cacheDir();
      final f = File('${dir.path}${Platform.pathSeparator}$name');
      if (await f.exists()) await f.delete();
    } catch (_) {}
  }

  Future<String> _getText(String uri) async {
    final bytes = await _getBytes(uri);
    return utf8.decode(bytes, allowMalformed: true);
  }

  Future<List<int>> _getBytes(String uri) async {
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 8);
    try {
      final req = await client.getUrl(Uri.parse(uri));
      final resp = await req.close().timeout(const Duration(seconds: 15));
      final bytes =
          await resp.fold<List<int>>(<int>[], (a, e) => a..addAll(e));
      if (resp.statusCode != 200) {
        throw HttpException('HTTP ${resp.statusCode}', uri: Uri.parse(uri));
      }
      return bytes;
    } finally {
      client.close();
    }
  }

  Future<Directory> cacheDir() async {
    final docs = await getApplicationDocumentsDirectory();
    return Directory('${docs.path}${Platform.pathSeparator}$_cacheDirName');
  }
}