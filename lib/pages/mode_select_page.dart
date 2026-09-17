import 'package:flutter/material.dart';
import '../services/mode_service.dart';
import '../services/photo_queue_service.dart';
import '../utils/constants.dart';
import '../widgets/copyable_error_dialog.dart';

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
                    fontSize: 13,
                    color: Color(0xFFE53935),
                    fontWeight: FontWeight.w700)),
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

  /// 队列里还没同步完的照片任务（切换模式前必须拦下来）
  Future<List<PhotoJob>> _unfinishedJobs() async {
    try {
      final jobs = await PhotoQueueService.instance.pendingJobs();
      return jobs.where((j) => !j.status.isFinished).toList();
    } catch (_) {
      return const [];
    }
  }

  Future<void> _confirm() async {
    if (_saving) return;

    // 队列里还有没同步完的照片时不许切换模式：两套模式的登录态/门店
    // 完全不同，切过去这些任务会卡住或者同步到另一套的门店上。
    final pending = await _unfinishedJobs();
    if (pending.isNotEmpty) {
      if (!mounted) return;
      final lines = <String>[];
      for (final j in pending) {
        lines.add('· ${j.type.label} · 条码 ${j.barcode}'
            '${j.productName.isNotEmpty ? ' · ${j.productName}' : ''}'
            ' · ${j.status.label} · 已尝试 ${j.attempts}/${PhotoQueueService.maxAttempts}');
      }
      final detail = StringBuffer()
        ..writeln('当前还有 ${pending.length} 个照片任务没有同步完，'
            '现在切换模式会打断它们，所以先不让切。')
        ..writeln()
        ..writeln('未同步完的任务：')
        ..writeln(lines.join('\n'))
        ..writeln()
        ..writeln('怎么办：')
        ..writeln('1. 保持这个模式、保持手机联网，让队列自己跑完'
            '（回到首页就行，队列在后台继续跑）；')
        ..writeln('2. 想快点结束，去 配置页 → 照片队列日志，'
            '点那条任务的「删除记录」把它去掉；')
        ..writeln('3. 等上面的任务都同步完（或都删掉）之后，再切换模式。');
      await showCopyableError(context, '还有照片没同步完，暂时不能切换模式',
          detail.toString().trim());
      return;
    }

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
                    : '不可随意切换模式，否则可能数据丢失',
                style: TextStyle(
                    fontSize: 13,
                    color: firstRun
                        ? AppConstants.textPrimary
                        : const Color(0xFFE53935),
                    fontWeight: firstRun ? FontWeight.normal : FontWeight.w700),
              ),
            ),
          ),
          const SizedBox(height: 12),
          _optionCard(
            store: false,
            title: '总部模式',
            subtitle: '该模式需要使用总账号登录，且旗下门店大于一家',
            points: ['修改数据可同步到所有门店', '内部版本 1012-2'],
          ),
          _optionCard(
            store: true,
            title: '门店模式',
            subtitle: '该模式支持账号密码登录与员工工号登录',
            points: ['可添加不同门店', '内部版本 1012-1'],
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
