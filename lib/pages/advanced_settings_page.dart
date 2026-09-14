import 'package:flutter/material.dart';
import '../services/advanced_settings_service.dart';
import '../utils/constants.dart';

/// 高级设置：控制查询首页可用的「修改」入口（默认全部开启）。
///
/// 入口：配置页底部「高级设置」按钮 → 验证密码（与启动验证同一来源）。
class AdvancedSettingsPage extends StatefulWidget {
  const AdvancedSettingsPage({super.key});

  @override
  State<AdvancedSettingsPage> createState() => _AdvancedSettingsPageState();
}

class _AdvancedSettingsPageState extends State<AdvancedSettingsPage> {
  final _svc = AdvancedSettingsService.instance;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    await _svc.ensureLoaded();
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('高级设置')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(12),
              children: [
                Card(
                  elevation: 0,
                  color: AppConstants.bgColor,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppConstants.radiusSm),
                  ),
                  child: const Padding(
                    padding: EdgeInsets.all(12),
                    child: Text(
                      '关掉某一项后，查询首页对应的修改入口（铅笔、加号等图标）会一起隐藏，'
                      '点也不会有任何反应；扫码查询、打印、保存等功能不受影响。默认全部开启。',
                      style: TextStyle(
                          fontSize: 12, color: AppConstants.textSecondary),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Card(
                  margin: EdgeInsets.zero,
                  child: Column(
                    children: [
                      _switchTile(
                        icon: Icons.drive_file_rename_outline,
                        title: '商品名称修改',
                        subtitle: '双击商品名称可改名并同步到门店',
                        value: _svc.allowProductName,
                        onChanged: (v) async {
                          await _svc.setAllowProductName(v);
                          if (mounted) setState(() {});
                        },
                      ),
                      const Divider(height: 1),
                      _switchTile(
                        icon: Icons.business,
                        title: '供货商修改',
                        subtitle: '点击供货商可更换并同步到门店',
                        value: _svc.allowSupplier,
                        onChanged: (v) async {
                          await _svc.setAllowSupplier(v);
                          if (mounted) setState(() {});
                        },
                      ),
                      const Divider(height: 1),
                      _switchTile(
                        icon: Icons.scale,
                        title: '单位修改',
                        subtitle: '双击单位可从门店已有单位里更换',
                        value: _svc.allowUnit,
                        onChanged: (v) async {
                          await _svc.setAllowUnit(v);
                          if (mounted) setState(() {});
                        },
                      ),
                      const Divider(height: 1),
                      _switchTile(
                        icon: Icons.monetization_on,
                        title: '价格修改',
                        subtitle: '双击售价 / 进价可改价并同步到门店',
                        value: _svc.allowPrice,
                        onChanged: (v) async {
                          await _svc.setAllowPrice(v);
                          if (mounted) setState(() {});
                        },
                      ),
                      const Divider(height: 1),
                      _switchTile(
                        icon: Icons.qr_code_2,
                        title: '扩展条码增加',
                        subtitle: '点条码旁的「+」可增加扩展条码并同步到门店',
                        value: _svc.allowExtBarcode,
                        onChanged: (v) async {
                          await _svc.setAllowExtBarcode(v);
                          if (mounted) setState(() {});
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _switchTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return SwitchListTile(
      value: value,
      onChanged: onChanged,
      secondary: Icon(icon, size: 20, color: AppConstants.primaryColor),
      title: Text(title, style: const TextStyle(fontSize: 14)),
      subtitle: Text(subtitle,
          style: const TextStyle(
              fontSize: 11, color: AppConstants.textSecondary)),
    );
  }
}