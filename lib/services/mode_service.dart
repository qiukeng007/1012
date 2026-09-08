import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// 登录模式（门店模式 / 总部模式）与「是否已选择」的持久化状态。
///
/// 设计：一部手机首次使用时选择一次模式（或由旧数据自动识别），
/// 之后不再询问；升级/重装不重新选择。需要更换时在配置页底部
/// 「重置模式」重新进入选择页，两套模式数据互相独立、不丢失。
class ModeService {
  ModeService._();

  static final ModeService instance = ModeService._();

  static const String prefsKey = 'login_mode';
  static const String selectedKey = 'mode_selected';
  static const String storeValue = 'store';
  static const String hqValue = 'hq';

  /// 旧版（1011-2 / 1011-1 等）数据使用的配置 key，用于升级时自动识别模式
  static const String legacyConfigKey = 'store_configs';

  bool _store = false;
  bool _loaded = false;
  bool _selected = false;

  /// 是否门店模式（逐店工号登录）
  bool get isStoreMode => _store;

  /// 是否总部模式（总账号微信扫码登录）
  bool get isHqMode => !_store;

  /// 是否已经选择过模式（首次选择或旧数据自动识别后为 true）
  bool get isSelected => _loaded && _selected;

  /// 是否已从本地读取过
  bool get isLoaded => _loaded;

  /// 读取并缓存登录模式；从未选择过时按旧版数据识别一个默认值，
  /// 但不会静默写入「已选择」：旧版本（1011/早期1012）升级后
  /// 会由引导页提示一次，让用户确认当前手机使用的登录模式
  Future<void> ensureLoaded() async {
    if (_loaded) return;
    final prefs = await SharedPreferences.getInstance();
    _store = prefs.getString(prefsKey) == storeValue;
    _selected = prefs.getBool(selectedKey) ?? false;
    if (!_selected) {
      // 只把识别结果当作选择页的默认高亮，不写 mode_selected
      final detected = await _detectLegacyMode(prefs);
      if (detected != null) _store = detected;
    }
    _loaded = true;
  }

  /// 根据旧版 store_configs 数据识别：含门店ID → 总部；仅有工号门店 → 门店模式；
  /// 无任何数据 → 不识别（等待首次引导页）
  Future<bool?> _detectLegacyMode(SharedPreferences prefs) async {
    final raw = prefs.getString(legacyConfigKey);
    if (raw != null && raw.trim().isNotEmpty) {
      try {
        final list = jsonDecode(raw) as List<dynamic>;
        var anyStore = false;
        for (final item in list) {
          final map = item as Map<String, dynamic>;
          final storeId = map['storeId'] as String? ?? '';
          if (storeId.isNotEmpty) return false; // 总部数据
          final account = (map['account'] as String? ?? '').trim();
          final job = (map['cashierJobNumber'] as String? ?? '').trim();
          if (account.isNotEmpty || job.isNotEmpty) anyStore = true;
        }
        if (anyStore) return true; // 门店数据（逐店工号）
      } catch (_) {}
    }
    // 无门店数据但保存过总账号信息 → 总部模式
    final masterAccount = prefs.getString('login_account') ?? '';
    final masterCookiePrefix = 'cookie_';
    final hasMaster = prefs
        .getKeys()
        .any((k) =>
            k.startsWith(masterCookiePrefix) &&
            k.contains('|master'));
    if (masterAccount.isNotEmpty || hasMaster) return false;
    return null;
  }

  /// 用户明确选择并持久化登录模式（此后视为已选择）
  Future<void> setStoreMode(bool store) async {
    _store = store;
    _selected = true;
    _loaded = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(prefsKey, store ? storeValue : hqValue);
    await prefs.setBool(selectedKey, true);
  }

  /// 防重复弹出模式选择页的标志（首页与配置页共用）
  bool prompting = false;
}
