import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 高级设置：控制查询首页可用的「修改」入口是否放开。
///
/// 入口：配置页底部「高级设置」按钮 → 验证密码（与启动验证同一来源：
/// 补货服务器 PIC/password.txt；连不上服务器时用默认密码）。
/// 默认全部开启；远程改了 password.txt，这里的验证密码自动跟着变。
class AdvancedSettingsService extends ChangeNotifier {
  AdvancedSettingsService._();
  static final AdvancedSettingsService instance = AdvancedSettingsService._();

  /// 连不上补货服务器时的默认密码（与启动验证一致）
  static const String fallbackPassword = '21771737';

  static const _keyProductName = 'adv_allow_product_name';
  static const _keySupplier = 'adv_allow_supplier';
  static const _keyUnit = 'adv_allow_unit';
  static const _keyPrice = 'adv_allow_price';
  static const _keyExtBarcode = 'adv_allow_ext_barcode';

  bool _loaded = false;
  bool _allowProductName = true;
  bool _allowSupplier = true;
  bool _allowUnit = true;
  bool _allowPrice = true;
  bool _allowExtBarcode = true;

  bool get loaded => _loaded;
  bool get allowProductName => _allowProductName;
  bool get allowSupplier => _allowSupplier;
  bool get allowUnit => _allowUnit;
  bool get allowPrice => _allowPrice;
  bool get allowExtBarcode => _allowExtBarcode;

  Future<void> ensureLoaded() async {
    if (_loaded) return;
    final prefs = await SharedPreferences.getInstance();
    _allowProductName = prefs.getBool(_keyProductName) ?? true;
    _allowSupplier = prefs.getBool(_keySupplier) ?? true;
    _allowUnit = prefs.getBool(_keyUnit) ?? true;
    _allowPrice = prefs.getBool(_keyPrice) ?? true;
    _allowExtBarcode = prefs.getBool(_keyExtBarcode) ?? true;
    _loaded = true;
  }

  Future<void> setAllowProductName(bool value) async {
    _allowProductName = value;
    _loaded = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyProductName, value);
    notifyListeners();
  }

  Future<void> setAllowSupplier(bool value) async {
    _allowSupplier = value;
    _loaded = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keySupplier, value);
    notifyListeners();
  }

  Future<void> setAllowUnit(bool value) async {
    _allowUnit = value;
    _loaded = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyUnit, value);
    notifyListeners();
  }

  Future<void> setAllowPrice(bool value) async {
    _allowPrice = value;
    _loaded = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyPrice, value);
    notifyListeners();
  }

  Future<void> setAllowExtBarcode(bool value) async {
    _allowExtBarcode = value;
    _loaded = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyExtBarcode, value);
    notifyListeners();
  }
}