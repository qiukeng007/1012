import 'package:flutter/material.dart';

/// 应用常量
class AppConstants {
  static const String appName = '银豹查询';
  static const String defaultBaseUrl = 'https://beta28.pospal.cn';
  static const int maxStores = 10;
  static const int defaultStoreCount = 1;

  /// 银豹后台地址归一化：域名一律使用 https。
  /// 微信扫码登录的 OAuth 回调必须走 https，银豹会话也只在 https 下正常下发；
  /// 局域网 IP / localhost 保留原协议（本地调试用）。
  /// 注意：不要用 AuthService.normalizeUrl()——那是补货服务器（局域网）用的，
  /// 它会把 https 强制降级成 http，导致银豹登录/扫码失败。
  static String normalizePospalUrl(String url) {
    var u = url.trim();
    if (u.isEmpty) return defaultBaseUrl;
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      u = 'https://$u';
    }
    u = u.replaceAll(RegExp(r'/+$'), '');
    if (u.startsWith('http://')) {
      final host = u.substring(7).split('/').first.split(':').first;
      final isIp = RegExp(r'^\d{1,3}(\.\d{1,3}){3}$').hasMatch(host);
      if (!isIp && host != 'localhost') return 'https://${u.substring(7)}';
    }
    return u;
  }

  // 颜色
  static const Color primaryColor = Color(0xFF1976D2);
  static const Color primaryDark = Color(0xFF1565C0);
  static const Color accentColor = Color(0xFF42A5F5);
  static const Color errorColor = Color(0xFFE53935);
  static const Color successColor = Color(0xFF43A047);
  static const Color warningColor = Color(0xFFFFA000);
  static const Color bgColor = Color(0xFFF5F5F5);
  static const Color cardColor = Colors.white;
  static const Color textPrimary = Color(0xFF212121);
  static const Color textSecondary = Color(0xFF757575);
  static const Color dividerColor = Color(0xFFE0E0E0);

  // 间距
  static const double spacingXs = 4;
  static const double spacingSm = 8;
  static const double spacingMd = 12;
  static const double spacingLg = 16;
  static const double spacingXl = 24;

  // 圆角
  static const double radiusSm = 6;
  static const double radiusMd = 10;
  static const double radiusLg = 14;
}
