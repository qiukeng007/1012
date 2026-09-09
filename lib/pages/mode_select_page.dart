import 'package:flutter/material.dart';
import '../services/mode_service.dart';
import '../utils/constants.dart';

/// 首次使用/重置时的「选择登录模式」页面。
///
/// firstRun=true 时不可返回（必须选一个模式）；重置进入时 firstRun=false，
/// 可返回、当前模式高亮，确认后仅切换当前使用的模式数据（两套数据独立保留）。
class ModeSelectPage extends StatefulWidget {
  final bool firstRun;

  const ModeSelectPage({super.key, this.firstRun = false});

  @override
  State<ModeSelectPage> createState() => _ModeSelectPageState();
}

class _ModeSelectPageState extends State<ModeSelectPage> {
  late bool _store = ModeService.instance.isStoreMode;
  bool _saving = false;

  Widget _optionCard({
    required bool store,
    required String title,
    required String subtitle,
    required List<String> points,
  }) {
    final selected = _store == store;
    return GestureDetector(
      onTap: () => setState(() => _store = store),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFE3F2FD) : AppConstants.bgColor,
          borderRadius: BorderRadius.circular(AppConstants.radiusMd),
          border: Border.all(
            color:
                selected ? AppConstants.primaryColor : AppConstants.dividerColor,
            width: selected ? 1.6 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(
                store ? Icons.storefront : Icons.account_balance,
                size: 20,
                color: selected
                    ? AppConstants.primaryColor
                    : AppConstants.textSecondary,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(title,
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w600)),
              ),
              Radio<bool>(
                value: store,
                groupValue: _store,
                onChanged: (v) => setState(() => _store = v ?? _store),
              ),
            ]),
            const SizedBox(height: 4),
            Text(subtitle,
                style: const TextStyle(
                    fontSize: 12, color: AppConstants.textSecondary)),
            const SizedBox(height: 8),
            for (final pt in points)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('· ',
                      style: TextStyle(
                          fontSize: 12, color: AppConstants.textSecondary)),
                  Expanded(
                    child: Text(pt,
                        style: const TextStyle(
                            fontSize: 12,
                            color: AppConstants.textSecondary)),
                  ),
                ]),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirm() async {
    if (_saving) return;
    setState(() => _saving = true);
    await ModeService.instance.setStoreMode(_store);
    if (!mounted) return;
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final firstRun = widget.firstRun;
    final Widget scaffold = Scaffold(
      appBar: AppBar(
        title: Text(firstRun ? '选择登录模式' : '重新选择登录模式'),
        automaticallyImplyLeading: !firstRun,
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            margin: EdgeInsets.zero,
            elevation: 0,
            color: AppConstants.bgColor,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppConstants.radiusMd)),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Text(
                firstRun
                    ? '请选择这台手机使用的登录方式（一部手机通常固定一种）。选定后不会再询问，需要更换时到「配置页底部 → 重置模式」。'
                    : '更换模式不会删除两种模式各自保存的门店与登录配置，可随时再切回来。',
                style: const TextStyle(
                    fontSize: 13, color: AppConstants.textPrimary),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFFFEBEE),
              borderRadius: BorderRadius.circular(AppConstants.radiusMd),
              border: Border.all(color: const Color(0xFFE53935), width: 1.2),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.warning_amber_rounded,
                    size: 20, color: Color(0xFFE53935)),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    '注意：总部模式适用于旗下有多家门店（大于 1 家）的情况；门店模式适用于单一门店使用。',
                    style: TextStyle(
                      fontSize: 13,
                      color: Color(0xFFE53935),
                      fontWeight: FontWeight.w700,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
          _optionCard(
            store: false,
            title: '总部模式',
            subtitle: '用总账号登录，自动同步并勾选需要搜索的门店',
            points: ['适合总部/管理员查看全部门店库存', '内部版本 1012-2'],
          ),
          _optionCard(
            store: true,
            title: '门店模式',
            subtitle: '逐店填写账号/工号/密码分别登录',
            points: ['适合单个门店员工使用', '内部版本 1012-1'],
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            height: 46,
            child: FilledButton(
              onPressed: _saving ? null : _confirm,
              style: FilledButton.styleFrom(
                backgroundColor: AppConstants.primaryColor,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppConstants.radiusMd)),
              ),
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('确认使用该模式', style: TextStyle(fontSize: 15)),
            ),
          ),
        ],
      ),
    );
    return PopScope(
      canPop: !firstRun,
      child: scaffold,
    );
  }
}
