import 'dart:io' show Platform;
import 'package:flutter/services.dart';

/// Android 前台服务控制（后台保活）
/// 通过 MethodChannel 与原生 KeepAliveService 通信
class ForegroundService {
  static const _channel = MethodChannel('com.example.pospal_stock_app/foreground');

  /// 启动前台服务（App 进入后台时调用）
  static Future<bool> start() async {
    if (!Platform.isAndroid) return false;
    try {
      return await _channel.invokeMethod<bool>('startService') ?? false;
    } catch (_) {
      return false;
    }
  }

  /// 停止前台服务（App 回到前台时调用）
  static Future<bool> stop() async {
    if (!Platform.isAndroid) return false;
    try {
      return await _channel.invokeMethod<bool>('stopService') ?? false;
    } catch (_) {
      return false;
    }
  }

  /// 查询服务是否在运行
  static Future<bool> isRunning() async {
    if (!Platform.isAndroid) return false;
    try {
      return await _channel.invokeMethod<bool>('isRunning') ?? false;
    } catch (_) {
      return false;
    }
  }

  static Future<bool> isNotificationEnabled() async {
    if (!Platform.isAndroid) return true;
    try {
      return await _channel.invokeMethod<bool>('isNotificationEnabled') ?? false;
    } catch (_) { return false; }
  }

  /// 上传期间申请「省电锁」：屏幕熄灭后 CPU / Wi-Fi 不睡，照片才传得动。
  /// 进队列开始传时 true，队列暂空立刻 false（不会一直耗电）。
  static Future<bool> setUploading(bool on) async {
    if (!Platform.isAndroid) return false;
    try {
      return await _channel.invokeMethod<bool>('setUploading', {'on': on}) ?? false;
    } catch (_) {
      return false;
    }
  }

  /// 省电锁当前是否持有（排查用）
  static Future<bool> uploadWakeHeld() async {
    if (!Platform.isAndroid) return false;
    try {
      return await _channel.invokeMethod<bool>('uploadWakeHeld') ?? false;
    } catch (_) {
      return false;
    }
  }

  /// 是否已加入「电池优化白名单」（不在白名单里，锁屏后系统可能冻结 App）
  static Future<bool> isIgnoringBatteryOptimizations() async {
    if (!Platform.isAndroid) return true;
    try {
      return await _channel
              .invokeMethod<bool>('isIgnoringBatteryOptimizations') ??
          false;
    } catch (_) {
      return false;
    }
  }

  /// 弹出系统对话框，把这个 App 加入电池优化白名单
  static Future<bool> requestIgnoreBatteryOptimizations() async {
    if (!Platform.isAndroid) return false;
    try {
      return await _channel
              .invokeMethod<bool>('requestIgnoreBatteryOptimizations') ??
          false;
    } catch (_) {
      return false;
    }
  }
}
