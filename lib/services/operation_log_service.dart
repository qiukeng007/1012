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
  });

  Map<String, dynamic> toJson() => {
    'id': id, 'time': time, 'store': store, 'action': action,
    'barcode': barcode, if (detail != null) 'detail': detail,
    if (name != null) 'name': name,
    if (transName != null) 'transName': transName,
    if (stocks != null) 'stocks': stocks,
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
        stocks: stocks);
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

  /// 收藏条码存储键（按条码收藏，置顶便于后续网页端核对问题条码）
  static const _favKey = 'favorite_log_barcodes';

  /// 当前收藏的条码集合
  static Future<Set<String>> getFavoriteBarcodes() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList(_favKey) ?? const []).toSet();
  }

  /// 切换某条码的收藏状态，返回最新收藏集合
  static Future<Set<String>> toggleFavoriteBarcode(String barcode) async {
    final code = barcode.trim();
    if (code.isEmpty) return <String>{};
    final prefs = await SharedPreferences.getInstance();
    final list = (prefs.getStringList(_favKey) ?? const []).toList();
    if (list.contains(code)) {
      list.remove(code);
    } else {
      list.insert(0, code);
    }
    await prefs.setStringList(_favKey, list);
    return list.toSet();
  }
}
