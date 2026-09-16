import 'dart:async';
import 'package:flutter/material.dart';
import 'app.dart';
import 'services/advanced_settings_service.dart';
import 'services/login_diag.dart';

void main() async {
  runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();

    // 全局异常留痕：iOS 上这类错误不会弹窗，
    // 写进诊断日志才能在登录页一键复制出来
    FlutterError.onError = (details) {
      FlutterError.presentError(details);
      unawaited(LoginDiagLogger()
          .logError('Flutter异常', details.exception, details.stack));
    };
    WidgetsBinding.instance.platformDispatcher.onError = (error, stack) {
      unawaited(LoginDiagLogger().logError('未捕获异常', error, stack));
      return true;
    };

    await LoginDiagLogger().log('App 启动');
    // 高级设置（首页四个修改入口的开关）在首帧前读好，默认全部开启
    await AdvancedSettingsService.instance.ensureLoaded();
    runApp(const PospalStockApp());
  }, (error, stack) {
    unawaited(LoginDiagLogger().logError('runZonedGuarded', error, stack));
  });
}
