import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/printer_config.dart';
import '../models/store_config.dart';
import 'mode_service.dart';

/// 配置持久化服务（按登录模式隔离存储，两套模式数据互不影响）
/// - 门店配置（不含密码）：shared_preferences
/// - 密码：flutter_secure_storage 加密存储
/// - 门店模式：store_configs_store / pwd_store_ / restock_config_store / cookie_store_
/// - 总部模式：store_configs_hq / pwd_hq_ / restock_config_hq / cookie_
/// - 旧版 1011-1/1011-2 使用无后缀 key，读取时自动兼容并迁移到当前模式 key
class ConfigService {
  static const _configKeyHq = 'store_configs_hq';
  static const _configKeyStore = 'store_configs_store';
  static const _configKeyLegacy = 'store_configs';
  static const _passwordPrefixHq = 'pwd_hq_';
  static const _passwordPrefixStore = 'pwd_store_';
  static const _passwordPrefixLegacy = 'pwd_';
  static const _baseUrlKey = 'base_url';
  static const _restockConfigKeyHq = 'restock_config_hq';
  static const _restockConfigKeyStore = 'restock_config_store';
  static const _restockConfigKeyLegacy = 'restock_config';
  /// 旧版把补货服务器地址与操作员名做成「两模式共用」；现已改为每个登录模式
  /// 各存一套（地址/供货商/操作员互不影响）。这两个 key 只作为升级时
  /// 的首次播种来源，不再写入。
  static const _serverUrlKeyLegacy = 'restock_server_url';
  static const _operatorNameKeyLegacy = 'restock_operator_name';
  /// 某个模式是否已从旧版共用值播种过（播种后该模式独立保存，互不覆盖）
  static const _seedKeyHq = 'restock_mode_seeded_hq';
  static const _seedKeyStore = 'restock_mode_seeded_store';

  final FlutterSecureStorage _secureStorage;

  ConfigService()
      : _secureStorage = const FlutterSecureStorage(
          aOptions: AndroidOptions(encryptedSharedPreferences: true),
        );

  /// 按当前登录模式读取补货配置原始 JSON（旧版 restock_config 兼容读取，不迁移）
  static Future<String?> readRestockJson() async {
    final prefs = await SharedPreferences.getInstance();
    await ModeService.instance.ensureLoaded();
    final key = ModeService.instance.isStoreMode
        ? _restockConfigKeyStore
        : _restockConfigKeyHq;
    final jsonStr = prefs.getString(key);
    if (jsonStr != null) return jsonStr;
    return prefs.getString(_restockConfigKeyLegacy);
  }

  /// 按当前登录模式写入补货配置原始 JSON
  static Future<void> writeRestockJson(String json) async {
    final prefs = await SharedPreferences.getInstance();
    await ModeService.instance.ensureLoaded();
    final key = ModeService.instance.isStoreMode
        ? _restockConfigKeyStore
        : _restockConfigKeyHq;
    await prefs.setString(key, json);
  }

  /// 保存所有门店配置（不含密码），按当前登录模式写入独立 key
  Future<void> saveConfigs(List<StoreConfig> configs) async {
    await ModeService.instance.ensureLoaded();
    final storeMode = ModeService.instance.isStoreMode;
    final prefs = await SharedPreferences.getInstance();
    final jsonList = configs.map((c) => c.toJson()).toList();
    final key = storeMode ? _configKeyStore : _configKeyHq;
    await prefs.setString(key, jsonEncode(jsonList));

    // 密码写入当前模式的独立前缀
    final pwdPrefix =
        storeMode ? _passwordPrefixStore : _passwordPrefixHq;
    for (final config in configs) {
      if (config.password.isNotEmpty) {
        await _secureStorage.write(
          key: '$pwdPrefix${config.storeKey}',
          value: config.password,
        );
      }
    }
  }

  /// 加载所有门店配置（含密码），按当前登录模式读取；
  /// 命中旧版共享 key 时一次性迁移到模式 key
  Future<List<StoreConfig>> loadConfigs() async {
    await ModeService.instance.ensureLoaded();
    final storeMode = ModeService.instance.isStoreMode;
    final modeKey = storeMode ? _configKeyStore : _configKeyHq;
    final pwdPrefix =
        storeMode ? _passwordPrefixStore : _passwordPrefixHq;
    final prefs = await SharedPreferences.getInstance();

    var jsonStr = prefs.getString(modeKey);
    var fromLegacy = false;
    if (jsonStr == null || jsonStr.isEmpty) {
      jsonStr = prefs.getString(_configKeyLegacy);
      fromLegacy = jsonStr != null && jsonStr.isNotEmpty;
    }
    if (jsonStr == null || jsonStr.isEmpty) {
      // 总部模式：门店由微信扫码登录后同步生成；
      // 门店模式下默认 1 个空门店，用户逐店填写登录
      return storeMode ? [const StoreConfig(name: '门店1')] : [];
    }

    try {
      final List<dynamic> jsonList = jsonDecode(jsonStr);
      final configs = <StoreConfig>[];
      for (final json in jsonList) {
        final config = StoreConfig.fromJson(json as Map<String, dynamic>);
        if (!storeMode) {
          // 总部模式：丢弃旧的手动门店（没有门店ID，在总账号模式下无法查询）
          if (config.storeId.isEmpty) continue;
        }
        var password =
            await _secureStorage.read(key: '$pwdPrefix${config.storeKey}') ??
                '';
        if (password.isEmpty) {
          // 旧版（1011-1 门店 / 1011-2 总部）密码前缀兼容
          password = await _secureStorage.read(
                key: '$_passwordPrefixLegacy${config.storeKey}',
              ) ??
              '';
        }
        configs.add(config.copyWith(password: password));
      }
      // 旧版共享 key → 当前模式 key（一次性迁移，避免另一模式读到旧数据）
      if (fromLegacy) {
        await prefs.setString(
          modeKey,
          jsonEncode(configs.map((c) => c.toJson()).toList()),
        );
        await prefs.remove(_configKeyLegacy);
      }
      return configs;
    } catch (_) {
      return storeMode ? [const StoreConfig(name: '门店1')] : [];
    }
  }

  /// 保存单个门店密码（当前模式前缀）
  Future<void> savePassword(String storeKey, String password) async {
    if (password.isEmpty) return;
    await ModeService.instance.ensureLoaded();
    final prefix = ModeService.instance.isStoreMode
        ? _passwordPrefixStore
        : _passwordPrefixHq;
    await _secureStorage.write(key: '$prefix$storeKey', value: password);
  }

  /// 获取单个门店密码（兼容旧版 pwd_ 前缀）
  Future<String> getPassword(String storeKey) async {
    await ModeService.instance.ensureLoaded();
    final prefix = ModeService.instance.isStoreMode
        ? _passwordPrefixStore
        : _passwordPrefixHq;
    return (await _secureStorage.read(key: '$prefix$storeKey')) ??
        (await _secureStorage.read(
              key: '$_passwordPrefixLegacy$storeKey',
            )) ??
        '';
  }

  /// 删除门店密码（两种前缀一并清理）
  Future<void> deletePassword(String storeKey) async {
    await _secureStorage.delete(key: '$_passwordPrefixHq$storeKey');
    await _secureStorage.delete(key: '$_passwordPrefixStore$storeKey');
    await _secureStorage.delete(key: '$_passwordPrefixLegacy$storeKey');
  }

  /// 保存全局后台地址
  Future<void> saveBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_baseUrlKey, url);
  }

  /// 获取全局后台地址
  Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_baseUrlKey) ?? 'https://beta28.pospal.cn';
  }

  /// 保存补货配置：服务器地址/供货商/操作员全部按当前登录模式独立保存，
  /// 门店模式与总部模式各一套，切换模式时互不覆盖
  Future<void> saveRestockConfig(RestockConfig config) async {
    await writeRestockJson(jsonEncode(config.toJson()));
  }

  /// 加载补货配置（供货商列表由银豹登录后自动获取）。
  /// 按当前登录模式读取各自那一套：地址/供货商/操作员两模式互不影响。
  /// 升级后第一次读某个模式时，用旧版共用值播种一次并落盘，
  /// 保证「切换模式时原来的记录还在」，之后两个模式各改各的。
  Future<RestockConfig> loadRestockConfig() async {
    final prefs = await SharedPreferences.getInstance();
    await ModeService.instance.ensureLoaded();
    final storeMode = ModeService.instance.isStoreMode;
    final modeKey = storeMode ? _restockConfigKeyStore : _restockConfigKeyHq;
    final seedKey = storeMode ? _seedKeyStore : _seedKeyHq;

    var jsonStr = prefs.getString(modeKey);
    if (jsonStr == null || jsonStr.isEmpty) {
      // 旧版无后缀 key 只当播种来源，保留着给另一个模式首次读取时用
      jsonStr = prefs.getString(_restockConfigKeyLegacy);
    }
    final legacyUrl = (prefs.getString(_serverUrlKeyLegacy) ?? '').trim();
    final legacyOp = (prefs.getString(_operatorNameKeyLegacy) ?? '').trim();
    final seeded = prefs.getBool(seedKey) ?? false;

    var config = RestockConfig(serverUrl: legacyUrl, operatorName: legacyOp);
    if (jsonStr != null && jsonStr.isNotEmpty) {
      try {
        config = RestockConfig.fromJson(
          jsonDecode(jsonStr) as Map<String, dynamic>,
        );
      } catch (_) {
        // 旧数据损坏：退回旧版共用值，不让配置页拿不到东西
      }
    }
    if (!seeded) {
      // 两个模式都先继承原来共用的地址/操作员（否则切换模式后会看到
      // 1011 时代留在模式 JSON 里的旧地址），播种后各自独立
      if (legacyUrl.isNotEmpty) config = config.copyWith(serverUrl: legacyUrl);
      if (legacyOp.isNotEmpty) {
        config = config.copyWith(operatorName: legacyOp);
      }
      await prefs.setBool(seedKey, true);
      await prefs.setString(modeKey, jsonEncode(config.toJson()));
    }
    return config;
  }

  static const _printerConfigKey = 'printer_configs';

  /// 保存打印机配置
  Future<void> savePrinterConfigs(List<PrinterConfig> configs) async {
    final prefs = await SharedPreferences.getInstance();
    final list = configs.map((c) => c.toJson()).toList();
    await prefs.setString(_printerConfigKey, jsonEncode(list));
  }

  /// 加载打印机配置
  Future<List<PrinterConfig>> loadPrinterConfigs() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_printerConfigKey);
    if (jsonStr == null || jsonStr.isEmpty) return defaultPrinters();
    try {
      final list = jsonDecode(jsonStr) as List<dynamic>;
      final configs = list
          .map((e) => PrinterConfig.fromJson(e as Map<String, dynamic>))
          .toList();
      return configs.isEmpty ? defaultPrinters() : configs;
    } catch (_) {
      return defaultPrinters();
    }
  }

  // ===== 打印机多场地配置 =====
  static const _profileActiveKey = 'printer_profile_active';
  static const _profileListKey = 'printer_profile_list';
  static const _profilePrefix = 'printer_profile_';

  /// 获取当前激活的配置名称
  Future<String> getActiveProfileName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_profileActiveKey) ?? '默认';
  }

  /// 获取所有配置名称列表
  Future<List<String>> getProfileNames() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_profileListKey);
    if (jsonStr == null || jsonStr.isEmpty) return ['默认'];
    try {
      return (jsonDecode(jsonStr) as List<dynamic>).cast<String>();
    } catch (_) {
      return ['默认'];
    }
  }

  /// 切换激活的配置
  Future<void> setActiveProfile(String name) async {
    // 保存当前配置到当前 profile
    final currentConfigs = await loadPrinterConfigs();
    final currentName = await getActiveProfileName();
    await _saveProfile(currentName, currentConfigs);

    // 切换
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_profileActiveKey, name);

    // 加载新 profile 的配置
    final newConfigs = await _loadProfile(name);
    await savePrinterConfigs(newConfigs);
  }

  /// 新建配置（复制当前）
  Future<void> createProfile(String name) async {
    final currentConfigs = await loadPrinterConfigs();
    await _saveProfile(name, currentConfigs);

    final names = await getProfileNames();
    names.add(name);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_profileListKey, jsonEncode(names));
  }

  /// 重命名配置
  Future<void> renameProfile(String oldName, String newName) async {
    final prefs = await SharedPreferences.getInstance();
    final oldJson = prefs.getString('$_profilePrefix$oldName');
    if (oldJson != null) {
      await prefs.setString('$_profilePrefix$newName', oldJson);
      await prefs.remove('$_profilePrefix$oldName');
    }

    final names = await getProfileNames();
    final idx = names.indexOf(oldName);
    if (idx >= 0) {
      names[idx] = newName;
      await prefs.setString(_profileListKey, jsonEncode(names));
    }

    final active = await getActiveProfileName();
    if (active == oldName) {
      await prefs.setString(_profileActiveKey, newName);
    }
  }

  /// 删除配置
  Future<void> deleteProfile(String name) async {
    final names = await getProfileNames();
    names.remove(name);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_profileListKey, jsonEncode(names));
    await prefs.remove('$_profilePrefix$name');

    // 如果删的是激活的，切到第一个
    final active = await getActiveProfileName();
    if (active == name && names.isNotEmpty) {
      await setActiveProfile(names.first);
    }
  }

  /// 保存当前配置到指定 profile
  Future<void> saveProfileConfigs(String name, List<PrinterConfig> configs) async {
    await _saveProfile(name, configs);
  }

  Future<void> _saveProfile(String name, List<PrinterConfig> configs) async {
    final prefs = await SharedPreferences.getInstance();
    final list = configs.map((c) => c.toJson()).toList();
    await prefs.setString('$_profilePrefix$name', jsonEncode(list));
  }

  /// 加载指定 profile 的配置
  Future<List<PrinterConfig>> _loadProfile(String name) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString('$_profilePrefix$name');
    if (jsonStr == null || jsonStr.isEmpty) return defaultPrinters();
    try {
      final list = jsonDecode(jsonStr) as List<dynamic>;
      return list.map((e) => PrinterConfig.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return defaultPrinters();
    }
  }

  /// 清除所有数据（两种登录模式及旧版遗留数据一并清理）
  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_configKeyHq);
    await prefs.remove(_configKeyStore);
    await prefs.remove(_configKeyLegacy);
    await prefs.remove(_baseUrlKey);
    await prefs.remove(_restockConfigKeyHq);
    await prefs.remove(_restockConfigKeyStore);
    await prefs.remove(_restockConfigKeyLegacy);
    await _secureStorage.deleteAll();
  }
}
