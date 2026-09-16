import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

/// 运行诊断日志（登录流程 + 全局异常）
///
/// 针对 iOS「闪退后什么都拿不到」设计：
/// 1. 每一步先落盘再执行 —— 崩溃时文件里的最后一行就是崩溃前最后动作；
/// 2. 日志跨重启保留：不覆盖旧日志，而是追加一行「新会话开始」分隔；
/// 3. 新会话开头会把上次的最后一条日志单独列出来；
/// 4. Dart 层未捕获异常（含平台通道异常）也写进同一份日志，可直接复制。
class LoginDiagLogger {
  static final LoginDiagLogger _instance = LoginDiagLogger._();
  factory LoginDiagLogger() => _instance;
  LoginDiagLogger._();

  static const int _maxLines = 800;

  final List<String> _lines = [];
  bool _loaded = false;
  File? _file;

  Future<File?> _logFile() async {
    if (_file != null) return _file;
    try {
      final dir = await getApplicationDocumentsDirectory();
      _file = File('${dir.path}/login_diag.log');
    } catch (_) {}
    return _file;
  }

  /// 首次写入前：读入上次运行的日志（保留末尾若干行），并标出上次的最后一步
  Future<void> _ensureLoaded() async {
    if (_loaded) return;
    _loaded = true;
    String tail = '';
    try {
      final f = await _logFile();
      if (f != null && await f.exists()) {
        final old = await f.readAsString();
        final oldLines = old
            .split('\n')
            .map((l) => l.trimRight())
            .where((l) => l.trim().isNotEmpty)
            .toList();
        if (oldLines.length > _maxLines - 60) {
          oldLines.removeRange(0, oldLines.length - (_maxLines - 60));
        }
        _lines.addAll(oldLines);
        if (oldLines.isNotEmpty) tail = oldLines.last;
      }
    } catch (_) {}
    _lines.add('');
    _lines.add('══════ 新会话开始 ${DateTime.now().toIso8601String()} ══════');
    if (tail.isNotEmpty) {
      _lines.add('上次的最后一条日志：$tail');
      _lines.add('（如果上次是闪退/被系统杀掉，上面这条就是崩溃前最后动作）');
    }
  }

  /// 追加一条日志（先写内存 → 立即同步落盘，保证崩溃前已写入磁盘）
  Future<void> log(String msg) async {
    try {
      await _ensureLoaded();
      _append('[${DateTime.now().toIso8601String()}] $msg');
      await _flush();
    } catch (_) {}
    debugPrint('[DiagLog] $msg');
  }

  /// 关键步骤留痕（崩溃前最后动作一眼可见）
  Future<void> step(String msg) => log('▸ $msg');

  /// 未捕获异常：连同堆栈一起写盘，供一键复制
  Future<void> logError(String where, Object error, [StackTrace? stack]) async {
    final buf = StringBuffer();
    buf.write('✖ 异常[$where] $error');
    if (stack != null) {
      buf.write('\n');
      buf.write(stack.toString());
    }
    await log(buf.toString());
  }

  void _append(String line) {
    _lines.add(line);
    if (_lines.length > _maxLines) {
      _lines.removeRange(0, _lines.length - _maxLines);
    }
  }

  /// 同步写盘：不依赖事件循环，崩溃前一定已经写入
  Future<void> _flush() async {
    try {
      final f = await _logFile();
      if (f == null) return;
      final raf = f.openSync(mode: FileMode.write);
      try {
        raf.writeStringSync(_lines.join('\n'));
        raf.flushSync();
      } finally {
        raf.closeSync();
      }
    } catch (_) {}
  }

  /// 读取日志全文（供复制到剪贴板）
  Future<String> readAll() async {
    await _ensureLoaded();
    return _lines.join('\n');
  }

  /// 日志尾部若干行（供页面直接展示）
  Future<List<String>> tail(int count) async {
    await _ensureLoaded();
    if (_lines.length <= count) return List<String>.from(_lines);
    return _lines.sublist(_lines.length - count);
  }

  /// 清空日志
  Future<void> clear() async {
    _lines.clear();
    try {
      final f = await _logFile();
      if (f != null && await f.exists()) {
        await f.delete();
      }
    } catch (_) {}
  }

  /// 导出为可复制的文本
  Future<String> exportText() async {
    final buf = StringBuffer();
    buf.writeln('现金carry 运行诊断日志');
    buf.writeln('导出时间: ${DateTime.now().toIso8601String()}');
    buf.writeln('');
    buf.writeln('═══ 日志内容 ═══');
    buf.writeln('');
    buf.writeln(await readAll());
    return buf.toString();
  }
}
