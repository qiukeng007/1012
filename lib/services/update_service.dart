import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

/// APP 版本更新服务
class UpdateService {
  /// 规范化 URL：https → http，补前缀，去斜杠
  static String normalizeUrl(String serverUrl) {
    var url = serverUrl.trim();
    if (url.isEmpty) return url;
    if (url.startsWith('https://')) {
      url = 'http://${url.substring(8)}';
    }
    if (!url.startsWith('http://')) {
      url = 'http://$url';
    }
    while (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }
    return url;
  }

  /// 获取当前 APP 版本号（build number）
  Future<int> get currentVersion async {
    final info = await PackageInfo.fromPlatform();
    return int.tryParse(info.buildNumber) ?? 1;
  }

  /// 获取当前 APP 版本名称（如 1.0.4）
  Future<String> get versionName async {
    final info = await PackageInfo.fromPlatform();
    return info.version;
  }

  /// 当前内部版本号，形如 1012.42（与配置页/后台上报一致）
  Future<String> get currentInternalVersion async {
    final info = await PackageInfo.fromPlatform();
    return '${info.version.replaceAll('.', '')}.${info.buildNumber}';
  }

  /// 检查更新。
  /// 返回服务器上的新版本号文本（如 "1012.43"）；已是最新或检查失败返回空字符串。
  /// 兼容旧格式：服务器只写 "43" 时按 build 号比较。
  Future<String> checkUpdate(String serverUrl) async {
    final url = normalizeUrl(serverUrl);
    if (url.isEmpty) return '';

    List<int> parse(String s) {
      final t = s.trim();
      if (t.isEmpty) return const <int>[];
      return t
          .split(RegExp(r'[.\-_\s]+'))
          .map((e) => int.tryParse(e.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0)
          .toList();
    }

    final info = await PackageInfo.fromPlatform();
    final current = <int>[
      int.tryParse(info.version.replaceAll('.', '')) ?? 0,
      int.tryParse(info.buildNumber) ?? 0,
    ];

    try {
      final uri = Uri.parse('$url/PIC/app_version.txt');
      final response = await http.get(uri).timeout(const Duration(seconds: 5));
      if (response.statusCode != 200) return '';
      final remoteText = response.body.trim();
      final remote = parse(remoteText);
      if (remote.isEmpty) return '';

      bool newer;
      if (remote.length == 1) {
        // 旧格式：只有一个数字，按 build 号比较
        newer = remote[0] > current.last;
      } else {
        final n = remote.length > current.length ? remote.length : current.length;
        newer = false;
        for (var i = 0; i < n; i++) {
          final a = i < remote.length ? remote[i] : 0;
          final b = i < current.length ? current[i] : 0;
          if (a != b) {
            newer = a > b;
            break;
          }
        }
      }
      return newer ? remoteText : '';
    } catch (_) {
      return '';
    }
  }
  /// 打开浏览器下载 APK
  Future<bool> openDownloadPage(String serverUrl) async {
    final baseUrl = normalizeUrl(serverUrl);
    final url = '$baseUrl/PIC/app-release.apk';
    final uri = Uri.parse(url);
    return launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}
