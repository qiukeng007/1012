import 'package:http/http.dart' as http;
import 'dart:convert';

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

  /// 补丁更新说明固定从这台服务器取，不受前台「补货服务器地址」配置影响
  static const String fixedServer = 'https://wenzi778899.dpdns.org';

  /// 拉取本次补丁的更新内容（PIC/patch_notes.txt），取不到返回空串
  Future<String> fetchPatchNotes() async {
    try {
      final uri = Uri.parse(
          '$fixedServer/PIC/patch_notes.txt?t=${DateTime.now().millisecondsSinceEpoch}');
      final resp = await http.get(uri).timeout(const Duration(seconds: 6));
      if (resp.statusCode != 200) return '';
      // 服务器一般不带 charset，必须按 UTF-8 解字节，否则中文乱码
      final body = utf8.decode(resp.bodyBytes, allowMalformed: true);
      return body.replaceFirst('\uFEFF', '').trim();
    } catch (_) {
      return '';
    }
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
    return info.version;
  }

  /// 检查更新。
  /// 返回服务器上的新版本号文本（如 "1.0.13"）；已是最新或检查失败返回空字符串。
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
    // 当前版本按点分段：1.0.13 → [1, 0, 13]
    final current = info.version
        .split('.')
        .map((e) => int.tryParse(e) ?? 0)
        .toList();
    final currentBuild = int.tryParse(info.buildNumber) ?? 0;

    try {
      final ts = DateTime.now().millisecondsSinceEpoch;
      // 新格式：PIC/app_version_full.txt 写 1.0.25（新版读这个）
      // 旧客户端只认 PIC/app_version.txt 里的构建号（如 58），两个文件都要维护
      var remoteText = '';
      try {
        final fullUri = Uri.parse('$url/PIC/app_version_full.txt?t=$ts');
        final fullResp =
            await http.get(fullUri).timeout(const Duration(seconds: 5));
        if (fullResp.statusCode == 200) {
          remoteText =
              utf8.decode(fullResp.bodyBytes, allowMalformed: true).trim();
        }
      } catch (_) {}
      if (remoteText.isEmpty) {
        final uri = Uri.parse('$url/PIC/app_version.txt?t=$ts');
        final response =
            await http.get(uri).timeout(const Duration(seconds: 5));
        if (response.statusCode != 200) return '';
        remoteText = response.body.trim();
      }      final remote = parse(remoteText);
      if (remote.isEmpty) return '';

      // 旧服务器可能还写着 1012.43 这种老格式：新版 1.x 直接忽略，避免被旧号卡住
      if (remote.length >= 2 &&
          remote[0] >= 1000 &&
          current.isNotEmpty &&
          current[0] < 1000) {
        return '';
      }

      bool newer;
      if (remote.length == 1) {
        // 旧格式：只有一个数字，按 build 号比较
        newer = remote[0] > currentBuild;
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
