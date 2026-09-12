import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// A single operation record
class OperationLog {
  final String id;         // unique entry id
  final String time;       // "06-21 14:30"
  final String store;      // "新店"
  final String action;     // "多店查询", "补货"
  final String barcode;
  final String? detail;    // extra info like query duration
  final String? name;      // 商品名称快照
  final String? transName; // 商品中文翻译名称
  final String? stocks;    // 各门店库存快照
  final String? errorDetail; // 完整报错原文（列表只显示摘要，原文可点开复制）

  const OperationLog({
    required this.id,
    required this.time,
    required this.store,
    required this.action,
    required this.barcode,
    this.detail,
    this.name,
    this.transName,
    this.stocks,
    this.errorDetail,
  });

  Map<String, dynamic> toJson() => {
    'id': id, 'time': time, 'store': store, 'action': action,
    'barcode': barcode, if (detail != null) 'detail': detail,
    if (name != null) 'name': name,
    if (transName != null) 'transName': transName,
    if (stocks != null) 'stocks': stocks,
    if (errorDetail != null) 'errorDetail': errorDetail,
  };

  factory OperationLog.fromJson(Map<String, dynamic> json) => OperationLog(
    id: json['id'] as String? ?? '',
    time: json['time'] as String? ?? '',
    store: json['store'] as String? ?? '',
    action: json['action'] as String? ?? '',
    barcode: json['barcode'] as String? ?? '',
    detail: json['detail'] as String?,
    name: json['name'] as String?,
    transName: json['transName'] as String?,
    stocks: json['stocks'] as String?,
    errorDetail: json['errorDetail'] as String?,
  );
}

/// Stores and retrieves operation logs via SharedPreferences.
/// Logs are kept as a JSON array, newest first, capped at 200 entries.
class OperationLogService {
  static const _key = 'operation_logs';
  static const _maxEntries = 200;

  /// Append a log entry
  /// 返回该条记录的 id（供异步补全翻译名称等字段用）
  static Future<String> add({
    required String store,
    required String action,
    required String barcode,
    String? detail,
    String? name,
    String? transName,
    String? stocks,
    String? errorDetail,
  }) async {
    final id = DateTime.now().microsecondsSinceEpoch.toString();
    final now = DateTime.now();
    final time = '${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')} '
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

    final entry = OperationLog(
        id: id,
        time: time,
        store: store,
        action: action,
        barcode: barcode,
        detail: detail,
        name: name,
        transName: transName,
        stocks: stocks,
        errorDetail: errorDetail);
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key) ?? '[]';
    final list = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
    list.insert(0, entry.toJson());
    if (list.length > _maxEntries) list.removeRange(_maxEntries, list.length);
    await prefs.setString(_key, jsonEncode(list));
    return id;
  }

  /// 按 id 更新某条记录的字段（异步补全中文翻译名称等）
  static Future<void> update(String id, {String? transName}) async {
    if (id.isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key) ?? '[]';
    final list = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
    var changed = false;
    for (final e in list) {
      if (e['id'] != id) continue;
      if (transName != null) {
        e['transName'] = transName;
        changed = true;
      }
      break;
    }
    if (changed) await prefs.setString(_key, jsonEncode(list));
  }

  /// Get all logs, newest first
  static Future<List<OperationLog>> getAll() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key) ?? '[]';
    final list = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
    return list.map((e) => OperationLog.fromJson(e)).toList();
  }

  /// Clear all logs
  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, '[]');
  }

  /// 收藏记录 id 存储键（只标记被点的那一条记录，不再按条码收藏）
  static const _favIdKey = 'favorite_log_ids';
  /// 旧版按条码收藏的键（首次读取时迁移成对应最新一条记录的 id）
  static const _legacyFavBarcodeKey = 'favorite_log_barcodes';

  /// 当前收藏的记录 id 集合（会自动把旧的按条码收藏迁移成记录 id）
  static Future<Set<String>> getFavoriteIds() async {
    final prefs = await SharedPreferences.getInstance();
    final ids = (prefs.getStringList(_favIdKey) ?? const []).toList();
    if (ids.isNotEmpty) return ids.toSet();
    final legacy = prefs.getStringList(_legacyFavBarcodeKey) ?? const [];
    if (legacy.isEmpty) return <String>{};
    final logs = await getAll();
    for (final code in legacy) {
      for (final log in logs) {
        if (log.barcode == code && !ids.contains(log.id)) {
          ids.add(log.id);
          break;
        }
      }
    }
    await prefs.setStringList(_favIdKey, ids);
    await prefs.remove(_legacyFavBarcodeKey);
    return ids.toSet();
  }

  /// 切换某一条记录的收藏状态，返回最新收藏集合
  static Future<Set<String>> toggleFavoriteId(String id) async {
    if (id.isEmpty) return <String>{};
    final prefs = await SharedPreferences.getInstance();
    final list = (prefs.getStringList(_favIdKey) ?? const []).toList();
    if (list.contains(id)) {
      list.remove(id);
    } else {
      list.insert(0, id);
    }
    await prefs.setStringList(_favIdKey, list);
    return list.toSet();
  }
}
