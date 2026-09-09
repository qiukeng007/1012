/// 全局补货配置
class RestockConfig {

  /// 补货服务器地址（如 http://192.168.1.100）
  final String serverUrl;

  /// 供货商列表（逗号分隔）
  final String suppliers;

  /// 操作员姓名
  final String operatorName;

  /// 供货商列表是否来自银豹自动获取（只读，不可手动修改）
  final bool suppliersReadonly;

  const RestockConfig({
    this.serverUrl = '',
    this.suppliers = '',
    this.operatorName = '',
    this.suppliersReadonly = false,
  });

  RestockConfig copyWith({
    String? serverUrl,
    String? suppliers,
    String? operatorName,
    bool? suppliersReadonly,
  }) {
    return RestockConfig(
      serverUrl: serverUrl ?? this.serverUrl,
      suppliers: suppliers ?? this.suppliers,
      operatorName: operatorName ?? this.operatorName,
      suppliersReadonly: suppliersReadonly ?? this.suppliersReadonly,
    );
  }

  Map<String, dynamic> toJson() => {
        'serverUrl': serverUrl,
        'suppliers': suppliers,
        'operatorName': operatorName,
        'suppliersReadonly': suppliersReadonly,
      };

  factory RestockConfig.fromJson(Map<String, dynamic> json) => RestockConfig(
        serverUrl: json['serverUrl'] as String? ?? 'http://localhost',
        suppliers: json['suppliers'] as String? ?? '',
        operatorName: json['operatorName'] as String? ?? '',
        suppliersReadonly: json['suppliersReadonly'] as bool? ?? false,
      );

  /// 获取排序后的供货商列表
  List<String> get supplierList {
    if (suppliers.isEmpty) return [];
    return suppliers
        .split(',')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList()
      ..sort((a, b) => a.compareTo(b));
  }

  /// 供货商列表原始顺序是否已按字母序排列（自动获取会排序，手动写入通常无序）
  bool get suppliersSorted {
    final list = suppliers
        .split(',')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();
    for (var i = 1; i < list.length; i++) {
      if (list[i].compareTo(list[i - 1]) < 0) return false;
    }
    return true;
  }

  /// 供货商列表为手动模式：未自动获取过（非只读）且原始顺序无序
  bool get suppliersManualMode => !suppliersReadonly && !suppliersSorted;

  bool get isValid =>
      serverUrl.isNotEmpty && operatorName.isNotEmpty;
}

/// 门店配置模型
class StoreConfig {
  final String name;
  final String account;
  final String cashierJobNumber;
  final String password;
  final String baseUrl;

  /// 银豹门店ID（总账号登录后由「ID数据管理」同步，用于按门店查询）
  final String storeId;

  /// 登录方式：'job'=员工工号登录，'account'=账号密码登录
  final String loginMethod;

  /// 是否参与首页搜索（勾选后才查询该门店库存）
  final bool enabled;

  const StoreConfig({
    this.name = '',
    this.account = '',
    this.cashierJobNumber = '',
    this.password = '',
    this.baseUrl = 'https://beta28.pospal.cn',
    this.storeId = '',
    this.loginMethod = 'job',
    this.enabled = true,
  });

  StoreConfig copyWith({
    String? name,
    String? account,
    String? cashierJobNumber,
    String? password,
    String? baseUrl,
    String? storeId,
    String? loginMethod,
    bool? enabled,
  }) {
    return StoreConfig(
      name: name ?? this.name,
      account: account ?? this.account,
      cashierJobNumber: cashierJobNumber ?? this.cashierJobNumber,
      password: password ?? this.password,
      baseUrl: baseUrl ?? this.baseUrl,
      storeId: storeId ?? this.storeId,
      loginMethod: loginMethod ?? this.loginMethod,
      enabled: enabled ?? this.enabled,
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'account': account,
        'cashierJobNumber': cashierJobNumber,
        'baseUrl': baseUrl,
        'storeId': storeId,
        'loginMethod': loginMethod,
        'enabled': enabled,
      };

  /// 从 JSON 恢复（不含密码，密码单独加密存储）
  factory StoreConfig.fromJson(Map<String, dynamic> json) => StoreConfig(
        name: json['name'] as String? ?? '',
        account: json['account'] as String? ?? '',
        cashierJobNumber: json['cashierJobNumber'] as String? ?? '',
        baseUrl: json['baseUrl'] as String? ?? 'https://beta28.pospal.cn',
        storeId: json['storeId'] as String? ?? '',
        loginMethod: json['loginMethod'] as String? ?? 'job',
        enabled: json['enabled'] as bool? ?? true,
      );

  /// 门店唯一标识（用于 Cookie 存储 key）
  /// 有门店ID时用「后台|账号|门店ID」区分总账号下的不同门店；
  /// 无门店ID时保持原「后台|账号|工号」逻辑（工号登录）。
  String get storeKey {
    if (storeId.isNotEmpty) return '$baseUrl|$account|$storeId';
    // 账号密码登录没有工号：用固定后缀 regular 区分会话
    final suffix =
        loginMethod == 'account' ? 'regular' : cashierJobNumber;
    return '$baseUrl|$account|$suffix';
  }
  bool get isValid {
    if (name.isEmpty || account.isEmpty || password.isEmpty) return false;
    // 工号登录必须填工号；账号密码登录不需要工号
    if (loginMethod != 'account' && cashierJobNumber.isEmpty) return false;
    return true;
  }
}
