import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/notify_service.dart';
import '../utils/constants.dart';
import 'notify_card.dart';

/// 通知页（仅安卓）：手机收到的通知在这里排队显示，新的在最上面。
/// 抓取和播报都在安卓原生侧（NotificationListenerService + 系统 TTS），
/// 所以锁屏、App 在后台也能收到并播报。
///
/// 布局照眼镜项目那一版：记录在上面滚，运行条钉在最下面（不跟着记录跑），
/// 授权 / 播报 / 应用 / 屏蔽词那些设置全在「配置 → 通知播报」里。
class NotifyPage extends StatefulWidget {
  const NotifyPage({super.key});

  @override
  State<NotifyPage> createState() => _NotifyPageState();
}

class _NotifyPageState extends State<NotifyPage>
    with WidgetsBindingObserver, AutomaticKeepAliveClientMixin {
  final _service = NotifyService.instance;
  bool _loading = true;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _service.markAllRead();
    unawaited(_service.start());
    _load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _load();
  }

  Future<void> _load() async {
    if (!NotifyService.supported) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    await _service.refreshListenerEnabled();
    // 从文件里重新读一遍记录：App 在后台/被杀过的时候，新通知只写进了文件，
    // 没推给界面，不重读的话页面上就看不到（之前就是这个毛病）
    await _service.loadHistory();
    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    if (!NotifyService.supported) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text('通知播报只支持安卓',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        ),
      );
    }
    return Column(
      children: [
        _buildListHeader(),
        Expanded(child: _buildList()),
        // 运行条钉在最下面：记录再多也够得着「语音播报」开关
        const NotifyRunBar(),
      ],
    );
  }

  /// 记录头：左边「通知记录」，右边「复制全部 / 清空」（不显示条数）
  Widget _buildListHeader() {
    return ValueListenableBuilder<List<NotifyItem>>(
      valueListenable: _service.items,
      builder: (ctx, list, _) => Padding(
        padding: const EdgeInsets.fromLTRB(12, 6, 4, 0),
        child: Row(
          children: [
            const Text('通知记录',
                style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
            const Spacer(),
            TextButton(
              onPressed: list.isEmpty ? null : _copyAll,
              child: const Text('复制全部', style: TextStyle(fontSize: 12)),
            ),
            TextButton(
              onPressed: list.isEmpty ? null : _clearAll,
              child: const Text('清空', style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
      ),
    );
  }

  /// 连诊断信息一起复制，出问题时用户复制一次就够我定位
  Future<void> _copyAll() async {
    final text = await buildNotifyDiagnosis(0);
    if (!mounted) return;
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('已复制全部通知（含诊断信息）'),
        duration: Duration(seconds: 2)));
  }

  Future<void> _clearAll() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('清空通知记录？'),
        content: const Text('只清空这里显示的记录，不影响手机通知栏。'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('取消')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('清空')),
        ],
      ),
    );
    if (ok != true) return;
    await _service.clear();
    if (!mounted) return;
    setState(() {});
  }
  Widget _buildList() {
    return ValueListenableBuilder<List<NotifyItem>>(
      valueListenable: _service.items,
      builder: (ctx, list, _) {
        if (_loading) {
          return const Center(child: CircularProgressIndicator());
        }
        if (list.isEmpty) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: Text('还没有收到通知',
                  style: TextStyle(
                      fontSize: 13, color: AppConstants.textSecondary)),
            ),
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
          itemCount: list.length,
          itemBuilder: (ctx, i) => _buildItem(list[i]),
        );
      },
    );
  }

  /// 一条记录：上面一行「应用名（左）+ 时间（右）」，下面正文和「念没念」。
  /// 整条可以点一下复制，长按试念一句。
  Widget _buildItem(NotifyItem item) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: AppConstants.dividerColor),
      ),
      child: InkWell(
        onTap: () {
          Clipboard.setData(ClipboardData(
              text: '${item.timeText} ${item.app} ${item.oneLine}'));
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('已复制这一条'), duration: Duration(seconds: 1)));
        },
        onLongPress: () => _service.speakTest('${item.app}，${item.oneLine}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      item.app,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: AppConstants.primaryColor),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(item.timeText,
                      style: const TextStyle(
                          fontSize: 11, color: AppConstants.textSecondary)),
                ],
              ),
              if (item.title.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(item.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 13, color: AppConstants.textPrimary)),
                ),
              if (item.text.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(item.text,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 13, color: AppConstants.textPrimary)),
                ),
            ],
          ),
        ),
      ),
    );
  }
}