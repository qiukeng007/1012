import 'dart:convert';

import 'package:http/http.dart' as http;

import 'update_service.dart';

/// 操作员停用状态（服务器 PIC/user_status.txt）
class UserStatusResult {
  final bool enabled;
  final String reason;

  const UserStatusResult({required this.enabled, this.reason = ''});
}

/// 从补货服务器读取用户状态：
///   user_status.txt 每行：操作员|1  或  操作员|0|停用原因
///   *|0 表示「没写到的操作员默认停用」（白名单模式）
/// 文件不存在 / 网络失败 → 默认允许，避免误锁人。
class UserStatusService {
  static Future<UserStatusResult> check(
      String serverUrl, String operator) async {
    final url = UpdateService.normalizeUrl(serverUrl);
    final name = operator.trim();
    if (url.isEmpty || name.isEmpty) {
      return const UserStatusResult(enabled: true);
    }
    try {
      final uri = Uri.parse(
          '$url/PIC/user_status.txt?t=${DateTime.now().millisecondsSinceEpoch}');
      final resp = await http.get(uri).timeout(const Duration(seconds: 5));
      if (resp.statusCode != 200) {
        return const UserStatusResult(enabled: true);
      }
      // 服务器一般不带 charset，按 UTF-8 解（中文操作员名）
      final body = utf8.decode(resp.bodyBytes, allowMalformed: true);
      return _parse(body, name);
    } catch (_) {
      return const UserStatusResult(enabled: true);
    }
  }

  static UserStatusResult _parse(String raw, String name) {
    var defaultEnabled = true;
    var defaultReason = '';
    bool? explicit;
    var explicitReason = '';

    for (final line in raw.split(RegExp(r'\r?\n'))) {
      final s = line.trim();
      if (s.isEmpty || s.startsWith('#')) continue;
      final parts = s.split('|');
      if (parts.length < 2) continue;
      final who = parts[0].trim();
      final flag = parts[1].trim().toLowerCase();
      final enabled = flag == '1' || flag == 'true' || flag == 'yes';
      final reason =
          parts.length > 2 ? parts.sublist(2).join('|').trim() : '';
      if (who == '*') {
        defaultEnabled = enabled;
        defaultReason = reason;
      }
      if (who == name) {
        explicit = enabled;
        explicitReason = reason;
      }
    }

    if (explicit != null) {
      return UserStatusResult(enabled: explicit, reason: explicitReason);
    }
    return UserStatusResult(enabled: defaultEnabled, reason: defaultReason);
  }
}
