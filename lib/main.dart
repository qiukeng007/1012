import 'package:flutter/material.dart';
import 'app.dart';
import 'services/advanced_settings_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // 高级设置（首页四个修改入口的开关）在首帧前读好，默认全部开启
  await AdvancedSettingsService.instance.ensureLoaded();
  runApp(const PospalStockApp());
}