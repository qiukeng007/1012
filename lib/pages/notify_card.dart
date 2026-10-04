import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/notify_service.dart';
import '../utils/constants.dart';

/// 通知播报的两块界面（布局照眼镜项目那一版）：
/// - [NotifyRunBar]：钉在通知页最下面的运行条（语音播报总开关 + 当前状态 + 自检）；
/// - [NotifySettingsCard]：放在「配置」页里的可折叠设置卡（授权 / 播报 / 应用 / 屏蔽词）。
/// 两边都读 NotifyService.settings 这一份设置，不会各存一份互相覆盖。

// ───────────────────────── 共用的小工具 ─────────────────────────

/// 现在这一刻会不会念，不会的话是因为哪一条
String describeNotifyRuntime(Map<String, dynamic> rt) {
  if (rt.isEmpty) return '';
  final inUse = rt['inUse'] == true;
  final disp = (rt['disp'] as String?) ?? '';
  final willSpeak = rt['willSpeak'] == true;
  final listener = rt['listenerEnabled'] == true;
  final b = StringBuffer();
  if (inUse) {
    b.write('正在用手机（屏幕正常亮着，而且解锁了）→ 不念');
  } else if (disp == '正常亮着') {
    b.write('屏幕亮着但还在锁屏（当成不在用）→ 念');
  } else if (disp.isNotEmpty && disp != '未知') {
    b.write('$disp（人不在）→ 念');
  } else {
    b.write('屏幕灭（人不在）→ 念');
  }
  if (!listener) {
    b.write(' · 通知使用权没开');
  } else if (rt['connected'] != true) {
    b.write(' · 监听服务没连上（收不到通知，点右边复制图标看处理办法）');
  } else if (willSpeak) {
    b.write(' → 现在收到通知会念');
  } else {
    b.write(' → 现在收到通知不会念');
    if (rt['speak'] != true) {
      b.write('（语音播报关着）');
    } else if (rt['activeWindow'] != true) {
      b.write('（不在启用时段内）');
    } else if (rt['screenPolicy'] != true && inUse) {
      b.write('（「亮屏时也播报」关着，所以现在不念）');
    }
  }
  return b.toString();
}
/// 播报诊断正文：maxItems<=0 = 全部通知（出问题时复制一次就够）
Future<String> buildNotifyDiagnosis(int maxItems) async {
  final s = NotifyService.instance;
  final rt = await s.runtimeState();
  final st = await s.speakStatus();
  final cfg = s.settings.value;
  final now = DateTime.now();
  String two(int v) => v.toString().padLeft(2, '0');
  final items = s.items.value;
  final list = maxItems <= 0 ? items : items.take(maxItems).toList();
  final b = StringBuffer()
    ..writeln('通知播报诊断')
    ..writeln('导出时间：${now.year}-${two(now.month)}-${two(now.day)} '
        '${two(now.hour)}:${two(now.minute)}:${two(now.second)}')
    ..writeln('通知使用权：${rt['listenerEnabled'] == true ? '已开启' : '没开'}')
    ..writeln('通知监听服务：${rt['connected'] == true ? '已连接' : '未连接（系统把监听解绑了）'}')
    ..writeln('上次自动重连：${s.lastReconnect.isEmpty ? '还没试过' : s.lastReconnect}')
    ..writeln('语音引擎：$st')
    ..writeln('语音播报开关：${rt['speak'] == true ? '开' : '关'}')
    ..writeln('正在用手机时也播报：${rt['screenPolicy'] == true ? '开' : '关'}')
    ..writeln('在启用时段内：${rt['activeWindow'] == true ? '是' : '否'}')
    ..writeln('现在收到通知会不会念：${rt['willSpeak'] == true ? '会' : '不会'}')
    ..writeln('当前状态：${describeNotifyRuntime(rt)}')
    ..writeln('判定依据：屏幕=${(rt['disp'] as String?) ?? '未知'}'
        '${rt['screenOnSec'] is int && (rt['screenOnSec'] as int) >= 0 ? '（已亮${rt['screenOnSec']}秒）' : ''}'
        ' · 解锁广播=${rt['unlocked'] == true ? '有' : '无'}'
        ' · 锁屏需密码=${rt['keyguardClear'] == true ? '否' : '是'}'
        ' · 刚点亮=${rt['justLit'] == true ? '是' : '否'}');
  if (cfg.route == 2) {
    b.writeln('！注意：播报方式选的是「蓝牙」，声音会走耳机，'
        '耳机没戴在耳朵上就等于听不见；想从手机出声请选「手机扬声器」');
  } else if (cfg.route == 1) {
    b.writeln('播报方式：手机扬声器（一定从手机出声）');
  } else {
    b.writeln('播报方式：跟随系统（连着蓝牙时会走蓝牙）');
  }
  if (items.isEmpty) {
    b.writeln('上次收到通知：（还没有任何记录）');
  } else {
    final last = items.first;
    final mins = DateTime.now().difference(last.time).inMinutes;
    b.writeln('上次收到通知：${last.timeText}'
        '（${mins <= 0 ? '刚刚' : '$mins 分钟前'}）');
  }
  final skipNow = (rt['lastSkip'] as String?) ?? '';
  if (skipNow.isNotEmpty) b.writeln('最近一次跳过的原因：$skipNow');
  if (rt['listenerEnabled'] == true && rt['connected'] != true) {
    b.writeln('！监听服务没连上，收不到任何通知。处理办法（按顺序试）：'
        '1) 重启一次 App，会自动重连；'
        '2) 点「重连」按钮；'
        '3) 去系统设置 > 通知 > 通知使用权，把「银豹查询」关掉再打开；'
        '4) 还不行就重启手机。装完新包后系统经常会把监听解绑，这是安卓本身的问题。');
  }
  b.writeln('--- 通知（共 ${items.length} 条，列出 ${list.length} 条）---');
  for (final e in list) {
    final r = e.spoke
        ? '已交给引擎（引擎:${e.voice.isEmpty ? '未知' : e.voice}）'
        : '没念（${e.whySilent}）';
    final on = e.onSec >= 0 ? '，屏幕已亮${e.onSec}秒' : '';
    b.writeln('${e.timeText} ${e.app} | ${e.oneLine} | $r | ${e.screenText}$on');
  }
  return b.toString();
}
/// 存完再读回来比对；对不上就弹「可复制」窗口。返回是否真的落盘了。
Future<bool> saveAndVerifyNotifySettings(
    BuildContext context, NotifySettings wanted) async {
  final s = NotifyService.instance;
  await s.saveSettings(wanted);
  // 存完再读回来比对：万一真没存进去（比如原生侧报错），界面上要看得见
  final back = await s.loadSettings();
  final diffs = <String>[];
  if (back.speak != wanted.speak) {
    diffs.add('语音播报：界面 ${wanted.speak} / 系统 ${back.speak}');
  }
  if (back.speakWhenScreenOn != wanted.speakWhenScreenOn) {
    diffs.add('亮屏时也播报：界面 ${wanted.speakWhenScreenOn} / 系统 ${back.speakWhenScreenOn}');
  }
  if (back.activeEnabled != wanted.activeEnabled) {
    diffs.add('只在启用时段内工作：界面 ${wanted.activeEnabled} / 系统 ${back.activeEnabled}');
  }
  // 速度只比到小数点后两位：安卓里存的是 float，尾数本来就会差一丁点
  if ((back.rate - wanted.rate).abs() > 0.005) {
    diffs.add('播报速度：界面 ${wanted.rate} / 系统 ${back.rate}');
  }
  if (back.route != wanted.route) {
    diffs.add('播报方式：界面 ${wanted.route} / 系统 ${back.route}');
  }
  if (back.apps.length != wanted.apps.length) {
    diffs.add('监听应用个数：界面 ${wanted.apps.length} / 系统 ${back.apps.length}');
  }
  if (diffs.isNotEmpty) {
    if (context.mounted) showNotifyNotSavedDialog(context, diffs);
    return false;
  }
  return true;
}

/// 设置没落盘时给「可复制」窗口（不要一闪而过，也不要让人去截图）
void showNotifyNotSavedDialog(BuildContext context, List<String> diffs) {
  final now = DateTime.now();
  String two(int v) => v.toString().padLeft(2, '0');
  final detail = StringBuffer()
    ..writeln('操作：在「配置 → 通知播报」里改播报设置')
    ..writeln('结果：写进系统后读回来的值跟界面不一致（这次改动没落盘）')
    ..writeln('时间：${now.year}-${two(now.month)}-${two(now.day)} '
        '${two(now.hour)}:${two(now.minute)}:${two(now.second)}')
    ..writeln('--- 对不上的项（界面 / 系统实际存的值）---')
    ..writeln(diffs.join('\n'));
  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.error_outline, color: Colors.red, size: 20),
          SizedBox(width: 8),
          Expanded(
            child: Text('设置没能存进系统', style: TextStyle(fontSize: 16)),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: SelectableText(
          detail.toString(),
          style: const TextStyle(fontSize: 13, fontFamily: 'monospace'),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('关闭'),
        ),
        TextButton.icon(
          onPressed: () async {
            await Clipboard.setData(ClipboardData(text: detail.toString()));
            if (ctx.mounted) Navigator.pop(ctx);
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                  content: Text('已复制，黏贴给我就行'),
                  duration: Duration(seconds: 2)));
            }
          },
          icon: const Icon(Icons.copy, size: 16),
          label: const Text('复制全部'),
        ),
      ],
    ),
  );
}

// ───────────────────── 通知页底部钉住的运行条 ─────────────────────

/// 通知页底下那一块（钉在屏幕底部 —— 记录再长也不用划到最后才按得到）。
/// 布局照眼镜项目：一张 18dp 圆角的卡片，左边两行字（时段 / 现在会不会念），
/// 右边一颗 66dp 的圆钮 —— 圆钮自己就是状态灯：绿「开始」（按下就开播报）、
/// 红「停止」（按下就停），所以"正在播报"这几个字不用再写第二遍。
/// 真出问题（没授权 / 监听掉线）时下面多一行红字 + 两颗能立刻按的按钮。
class NotifyRunBar extends StatefulWidget {
  const NotifyRunBar({super.key});

  @override
  State<NotifyRunBar> createState() => _NotifyRunBarState();
}

class _NotifyRunBarState extends State<NotifyRunBar>
    with WidgetsBindingObserver {
  final _service = NotifyService.instance;
  String _runtimeText = '';
  bool _connected = true;
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_refreshRuntime());
    // 通知使用权是在系统设置里改的，改完切回来这一页未必重建，隔一会自己看一眼
    _tick = Timer.periodic(const Duration(seconds: 5), (_) {
      // 监听掉线就自己重连，不用用户去按「重连」
      unawaited(_service.ensureConnected());
      unawaited(_refreshRuntime());
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_service.refreshListenerEnabled());
      unawaited(_refreshRuntime());
    }
  }

  Future<void> _refreshRuntime() async {
    final rt = await _service.runtimeState();
    if (!mounted) return;
    setState(() {
      _runtimeText = describeNotifyRuntime(rt);
      if (rt.containsKey('connected')) _connected = rt['connected'] == true;
    });
  }

  /// 圆钮：按下就是「启动 / 停止」语音播报（原来那个开关）
  Future<void> _toggleRun() async {
    final s = _service.settings.value;
    final on = !s.speak;
    s.speak = on;
    await saveAndVerifyNotifySettings(context, s);
    // 刚要开始播报，就顺手确认监听是连着的
    if (on) unawaited(_service.ensureConnected());
    if (!mounted) return;
    await _refreshRuntime();
    if (!mounted) return;
    setState(() {});
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(on ? '已启动：收到通知会念出来（锁屏也念）' : '已停止：收到通知不再念'),
      duration: const Duration(seconds: 2),
    ));
  }

  /// 重连通知监听：装完新包 / 被系统解绑后，靠这一步自己接回来。
  /// 走的是加码重连（光喊 requestRebind 这台机不理）。
  Future<void> _rebind() async {
    await _service.forceReconnect();
    await _service.refreshListenerEnabled();
    await _refreshRuntime();
    if (!mounted) return;
    setState(() {});
    final ok = _service.listenerConnected.value;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(ok
          ? '通知监听已连上'
          : '还没连上（${_service.lastReconnect}）—— 也可以去系统设置把「银豹查询」关掉再打开'),
      duration: const Duration(seconds: 4),
    ));
  }

  /// 去系统的「通知使用权」名单。打不开就把手动路径写清楚（用户复制得走）。
  Future<void> _goListenerSettings() async {
    final ok = await _service.openListenerSettings();
    if (!mounted) return;
    if (!ok) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text(
              '打不开系统设置，请手动去 设置 > 通知 > 通知使用权，勾选「银豹查询」')));
    }
  }

  static String _mm(int minutes) {
    final h = (minutes ~/ 60).toString().padLeft(2, '0');
    final m = (minutes % 60).toString().padLeft(2, '0');
    return '$h:$m';
  }

  @override
  Widget build(BuildContext context) {
    final granted = _service.listenerEnabled.value;
    // 通了就一个字都不显示 —— 这一块不放「一切正常」这种占地方的话
    final warn = !granted
        ? '⚠ 通知使用权没开 —— 现在收不到通知，语音也不会念。'
        : (_connected != true
            ? '⚠ 通知使用权给了，但监听服务没连上 —— 现在一样收不到通知。'
            : '');
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
      child: ValueListenableBuilder<NotifySettings>(
        valueListenable: _service.settings,
        builder: (ctx, cfg, _) => Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppConstants.cardColor,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppConstants.dividerColor),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          cfg.activeEnabled
                              ? '只在 ${_mm(cfg.activeStart)}-${_mm(cfg.activeEnd)} 工作'
                              : '全天工作',
                          style: const TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                              color: AppConstants.textPrimary),
                        ),
                        if (_runtimeText.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(_runtimeText,
                                style: const TextStyle(
                                    fontSize: 11,
                                    color: AppConstants.textSecondary)),
                          ),
                        if (warn.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(warn,
                                style: const TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                    color: AppConstants.errorColor)),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  _roundButton(cfg.speak),
                ],
              ),
              if (warn.isNotEmpty) ...[
                const SizedBox(height: 6),
                Row(
                  children: [
                    TextButton(
                        onPressed: _goListenerSettings,
                        child: const Text('去开启通知使用权',
                            style: TextStyle(fontSize: 13))),
                    TextButton(
                        onPressed: _rebind,
                        child:
                            const Text('重连', style: TextStyle(fontSize: 13))),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  /// 那颗圆的启停钮：绿 = 没在播报（按下去就开始），红 = 正在播报（按下去就停）
  Widget _roundButton(bool running) {
    return SizedBox(
      width: 66,
      height: 66,
      child: Material(
        color:
            running ? AppConstants.errorColor : AppConstants.successColor,
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: _toggleRun,
          child: Center(
            child: Text(
              running ? '停止' : '开始',
              style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Colors.white),
            ),
          ),
        ),
      ),
    );
  }
}

// ───────────────────── 配置页里的可折叠设置卡 ─────────────────────

/// 「配置 → 通知播报」：授权 / 播报 / 应用 / 屏蔽词。
/// 默认折起来，点标题那一行展开。
class NotifySettingsCard extends StatefulWidget {
  const NotifySettingsCard({super.key});

  @override
  State<NotifySettingsCard> createState() => _NotifySettingsCardState();
}

class _NotifySettingsCardState extends State<NotifySettingsCard> {
  final _service = NotifyService.instance;
  final _skipCtrl = TextEditingController();
  bool _foldOpen = false;
  bool _loading = true;
  bool _skipSeeded = false;
  String _speakStatus = '';
  String _runtimeText = '';
  bool _connected = true;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  @override
  void dispose() {
    _skipCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (!NotifyService.supported) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    await _service.refreshListenerEnabled();
    unawaited(_service.ensureConnected());
    // 已选应用要显示成应用名，所以顺手把应用列表读进来
    if (_service.settings.value.apps.isNotEmpty) await _service.installedApps();
    final s = await _service.loadSettings();
    final st = await _service.speakStatus();
    final rt = await _service.runtimeState();
    if (!mounted) return;
    setState(() {
      if (!_skipSeeded) {
        _skipCtrl.text = s.skipWords;
        _skipSeeded = true;
      }
      _speakStatus = st;
      _applyRuntime(rt);
      _loading = false;
    });
  }

  void _applyRuntime(Map<String, dynamic> rt) {
    _runtimeText = describeNotifyRuntime(rt);
    if (rt.containsKey('connected')) _connected = rt['connected'] == true;
  }

  Future<void> _refreshRuntime() async {
    final rt = await _service.runtimeState();
    if (!mounted) return;
    setState(() => _applyRuntime(rt));
  }

  Future<void> _save({bool toast = false}) async {
    final s = _service.settings.value;
    s.skipWords = _skipCtrl.text;
    // 速度滑杆本身就是 0.1 一档，存之前先按 1 位小数收一下：
    // 否则浮点尾数（1.2 会存成 1.2000000476837158）读回来对不上，会误报「没存进去」
    s.rate = (s.rate.clamp(0.5, 2.0) * 10).round() / 10;
    final ok = await saveAndVerifyNotifySettings(context, s);
    if (!mounted) return;
    await _refreshRuntime();
    if (!mounted) return;
    setState(() {});
    if (!ok) return;
    if (toast) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('已保存'), duration: Duration(seconds: 1)),
      );
    }
  }
  Future<void> _rebindListener() async {
    await _service.forceReconnect();
    await _service.refreshListenerEnabled();
    await _refreshRuntime();
    if (!mounted) return;
    setState(() {});
    final ok = _service.listenerConnected.value;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(ok
          ? '通知监听已连上'
          : '还没连上（${_service.lastReconnect}）—— 也可以去系统设置把「银豹查询」关掉再打开'),
      duration: const Duration(seconds: 4),
    ));
  }

  Future<void> _goListenerSettings() async {
    final ok = await _service.openListenerSettings();
    if (!mounted) return;
    if (!ok) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text(
              '打不开系统设置，请手动去 设置 > 通知 > 通知使用权，勾选「银豹查询」')));
    }
  }

  /// 播报诊断：出问题时一键复制，不用截图
  Future<void> _copyDiagnosis() async {
    final text = await buildNotifyDiagnosis(5);
    if (!mounted) return;
    await Clipboard.setData(ClipboardData(text: text));
    await _refreshRuntime();
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('播报诊断（已复制）', style: TextStyle(fontSize: 16)),
        content: SingleChildScrollView(
          child: SelectableText(text,
              style: const TextStyle(fontSize: 12, fontFamily: 'monospace')),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('关闭')),
        ],
      ),
    );
  }

  /// 时间选择：小时 + 分钟两个下拉，比系统那个转盘好点
  Future<void> _pickTime(bool isStart) async {
    final cfg = _service.settings.value;
    var hour = (isStart ? cfg.activeStart : cfg.activeEnd) ~/ 60;
    var minute = ((isStart ? cfg.activeStart : cfg.activeEnd) % 60) ~/ 5 * 5;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: Text(isStart ? '几点开始' : '几点结束',
              style: const TextStyle(fontSize: 15)),
          content: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              DropdownButton<int>(
                value: hour,
                items: [
                  for (var h = 0; h < 24; h++)
                    DropdownMenuItem(value: h, child: Text('$h 点')),
                ],
                onChanged: (v) => setDlg(() => hour = v ?? hour),
              ),
              const SizedBox(width: 16),
              DropdownButton<int>(
                value: minute,
                items: [
                  for (var m = 0; m < 60; m += 5)
                    DropdownMenuItem(
                        value: m,
                        child: Text('${m.toString().padLeft(2, '0')} 分')),
                ],
                onChanged: (v) => setDlg(() => minute = v ?? minute),
              ),
            ],
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('取消')),
            TextButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('确定')),
          ],
        ),
      ),
    );
    if (ok != true) return;
    final m = hour * 60 + minute;
    setState(() {
      if (isStart) {
        cfg.activeStart = m;
      } else {
        cfg.activeEnd = m;
      }
    });
    await _save(toast: true);
  }

  Future<void> _pickApps() async {
    final cur = _service.settings.value;
    final result = await Navigator.of(context).push<List<String>>(
      MaterialPageRoute(
        builder: (_) =>
            _AppPickerPage(selected: List<String>.from(cur.apps)),
      ),
    );
    if (result == null) return;
    setState(() => cur.apps = result);
    await _service.installedApps();
    await _save(toast: true);
  }

  static String _mm(int minutes) {
    final h = (minutes ~/ 60).toString().padLeft(2, '0');
    final m = (minutes % 60).toString().padLeft(2, '0');
    return '$h:$m';
  }

  Widget _title(String text) => Text(text,
      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600));

  Widget _hint(String text) => Text(text,
      style: const TextStyle(fontSize: 11, color: AppConstants.textSecondary));

  @override
  Widget build(BuildContext context) {
    if (!NotifyService.supported) return const SizedBox.shrink();
    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: AppConstants.dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _foldHeader(),
          if (_foldOpen)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: _loading
                  ? const Padding(
                      padding: EdgeInsets.all(16),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildStatusSection(),
                        const Divider(height: 18),
                        _buildSpeakSection(),
                        const Divider(height: 18),
                        _buildAppSection(),
                        const Divider(height: 18),
                        _buildSkipSection(),
                      ],
                    ),
            ),
        ],
      ),
    );
  }

  /// 「通知播报」那一行标题：整行 48dp 热区，点一下展开 / 收起
  Widget _foldHeader() {
    return InkWell(
      onTap: () => setState(() => _foldOpen = !_foldOpen),
      borderRadius: BorderRadius.circular(18),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 48),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
          child: Row(children: [
            const Icon(Icons.notifications_active_outlined,
                size: 18, color: AppConstants.textSecondary),
            const SizedBox(width: 6),
            const Expanded(
              child: Text('通知播报（授权 / 播报 / 应用 / 屏蔽词）',
                  style:
                      TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            ),
            Text(_foldOpen ? '收起' : '展开',
                style: const TextStyle(
                    fontSize: 12, color: AppConstants.primaryColor)),
            Icon(_foldOpen ? Icons.expand_less : Icons.expand_more,
                size: 26, color: AppConstants.primaryColor),
          ]),
        ),
      ),
    );
  }
  // ---------------- 授权 / 状态 ----------------

  Widget _buildStatusSection() {
    final granted = _service.listenerEnabled.value;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            _title('通知使用权'),
            const SizedBox(width: 8),
            Text(
              granted ? '已开启' : '未开启',
              style: TextStyle(
                fontSize: 12,
                color: granted
                    ? AppConstants.successColor
                    : AppConstants.errorColor,
              ),
            ),
            const Spacer(),
            TextButton(
              onPressed: _rebindListener,
              child: const Text('重连', style: TextStyle(fontSize: 13)),
            ),
            TextButton(
              onPressed: _goListenerSettings,
              child: Text(granted ? '去系统设置' : '去开启',
                  style: const TextStyle(fontSize: 13)),
            ),
          ],
        ),
        if (granted && _connected != true)
          const Padding(
            padding: EdgeInsets.only(bottom: 6),
            child: SelectableText(
              '监听服务没连上：现在收不到任何通知。\n'
              '1) 重开一次 App 会自动重连\n'
              '2) 点「重连」按钮\n'
              '3) 去系统设置把「银豹查询」的通知使用权关掉再打开\n'
              '4) 还不行就重启手机\n'
              '（装完新包后系统常会把监听解绑，这是安卓的老毛病）',
              style: TextStyle(fontSize: 12, color: AppConstants.errorColor),
            ),
          ),
        if (!granted)
          const Padding(
            padding: EdgeInsets.only(bottom: 6),
            child: Text(
              '还没有权限：去系统设置里把「银豹查询」勾上，系统才允许我们读通知。',
              style: TextStyle(fontSize: 12, color: AppConstants.errorColor),
            ),
          ),
        Row(
          children: [
            OutlinedButton.icon(
              onPressed: () async {
                final st = await _service.speakTest(
                    '银豹查询，语音播报测试，语速${_service.settings.value.rate.toStringAsFixed(1)}倍');
                if (!mounted) return;
                setState(() => _speakStatus = st);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: Text('语音引擎：$st'),
                  duration: const Duration(seconds: 3),
                ));
              },
              icon: const Icon(Icons.volume_up, size: 16),
              label: const Text('试念一句', style: TextStyle(fontSize: 12)),
            ),
            const SizedBox(width: 8),
            OutlinedButton.icon(
              onPressed: () => _service.stopSpeak(),
              icon: const Icon(Icons.stop, size: 16),
              label: const Text('停止播报', style: TextStyle(fontSize: 12)),
            ),
            const Spacer(),
            IconButton(
              onPressed: _copyDiagnosis,
              tooltip: '复制诊断',
              icon: const Icon(Icons.copy,
                  size: 18, color: AppConstants.primaryColor),
            ),
          ],
        ),
        if (_speakStatus.isNotEmpty)
          SelectableText('语音引擎：$_speakStatus',
              style: const TextStyle(
                  fontSize: 11, color: AppConstants.textSecondary)),
        if (_runtimeText.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: SelectableText(_runtimeText,
                style: const TextStyle(
                    fontSize: 11, color: AppConstants.textSecondary)),
          ),
      ],
    );
  }
  // ---------------- 播报设置：语速 / 方式 / 亮屏 / 启用时段 ----------------

  Widget _buildSpeakSection() {
    return ValueListenableBuilder<NotifySettings>(
      valueListenable: _service.settings,
      builder: (ctx, s, _) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _title('播报速度'),
              const Spacer(),
              Text('${s.rate.toStringAsFixed(1)} 倍',
                  style: const TextStyle(
                      fontSize: 13, color: AppConstants.primaryColor)),
            ],
          ),
          Slider(
            value: s.rate.clamp(0.5, 2.0),
            min: 0.5,
            max: 2.0,
            divisions: 15,
            label: '${s.rate.toStringAsFixed(1)}x',
            onChanged: (v) => setState(() => s.rate = v),
            onChangeEnd: (v) => _save(),
          ),
          _hint('0.5 倍最慢、2.0 倍最快，调完点「试念一句」听一下'),
          const SizedBox(height: 10),
          _title('播报方式'),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            children: [
              for (final r in const [0, 1, 2])
                ChoiceChip(
                  label: Text(
                    switch (r) { 1 => '手机扬声器', 2 => '蓝牙', _ => '跟随系统' },
                    style: const TextStyle(fontSize: 12),
                  ),
                  selected: s.route == r,
                  onSelected: (_) async {
                    setState(() => s.route = r);
                    await _save();
                    if (!mounted) return;
                    final st = await _service.speakTest('播报方式已切换');
                    if (!mounted) return;
                    setState(() => _speakStatus = st);
                  },
                ),
            ],
          ),
          const SizedBox(height: 4),
          _hint('手机扬声器 = 连着蓝牙音箱也只从手机出声；蓝牙 = 走已连接的蓝牙设备；'
              '跟随系统 = 系统怎么路由就怎么走'),
          const SizedBox(height: 6),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            dense: true,
            value: s.speakWhenScreenOn,
            onChanged: (v) async {
              setState(() => s.speakWhenScreenOn = v);
              await _save(toast: true);
            },
            title: _title('亮屏时也播报'),
            subtitle: _hint('关着时：正在用手机（屏幕正常亮着、而且解锁了）才不念；'
                '屏幕灭、息屏显示、锁屏亮着都念'),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            dense: true,
            value: s.activeEnabled,
            onChanged: (v) async {
              setState(() => s.activeEnabled = v);
              await _save(toast: true);
            },
            title: _title('只在启用时段内工作'),
            subtitle: _hint('关掉 = 全天工作；打开 = 只在这段时间里抓取和播报'),
          ),
          if (s.activeEnabled)
            Row(
              children: [
                OutlinedButton(
                  onPressed: () => _pickTime(true),
                  child: Text('开始 ${_mm(s.activeStart)}',
                      style: const TextStyle(fontSize: 13)),
                ),
                const SizedBox(width: 8),
                OutlinedButton(
                  onPressed: () => _pickTime(false),
                  child: Text('结束 ${_mm(s.activeEnd)}',
                      style: const TextStyle(fontSize: 13)),
                ),
                const SizedBox(width: 8),
                const Text('点一下改时间',
                    style: TextStyle(
                        fontSize: 11, color: AppConstants.textSecondary)),
              ],
            ),
        ],
      ),
    );
  }
  // ---------------- 监听哪些应用 ----------------

  Widget _buildAppSection() {
    return ValueListenableBuilder<NotifySettings>(
      valueListenable: _service.settings,
      builder: (ctx, s, _) {
        final onlyPicked = s.appMode == 1;
        final picked = s.apps;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _title('监听哪些应用'),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              children: [
                for (final m in const [0, 1])
                  ChoiceChip(
                    label: Text(
                      m == 0 ? '全部应用' : '只监听我勾选的应用',
                      style: const TextStyle(fontSize: 12),
                    ),
                    selected: s.appMode == m,
                    onSelected: (_) async {
                      setState(() => s.appMode = m);
                      await _save();
                    },
                  ),
              ],
            ),
            const SizedBox(height: 6),
            OutlinedButton.icon(
              onPressed: _pickApps,
              icon: const Icon(Icons.apps, size: 16),
              label: Text('选择应用（已选 ${picked.length} 个）',
                  style: const TextStyle(fontSize: 12)),
            ),
            if (picked.isNotEmpty) ...[
              const SizedBox(height: 8),
              _hint('已选：'),
              const SizedBox(height: 4),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final pkg in picked.take(40))
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color:
                            AppConstants.primaryColor.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: AppConstants.primaryColor
                                .withValues(alpha: 0.35)),
                      ),
                      child: Text(_service.labelOf(pkg),
                          style: const TextStyle(
                              fontSize: 12,
                              color: AppConstants.primaryColor)),
                    ),
                  if (picked.length > 40)
                    Text('…等 ${picked.length} 个',
                        style: const TextStyle(
                            fontSize: 12,
                            color: AppConstants.textSecondary)),
                ],
              ),
            ],
            if (onlyPicked && picked.isEmpty)
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text('现在一个应用都没勾，等于什么都收不到 —— 点上面按钮去勾。',
                    style:
                        TextStyle(fontSize: 12, color: AppConstants.errorColor)),
              ),
          ],
        );
      },
    );
  }

  // ---------------- 屏蔽词 ----------------

  Widget _buildSkipSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _title('屏蔽词（一行一个，命中就不念）'),
        const SizedBox(height: 6),
        TextField(
          controller: _skipCtrl,
          maxLines: 3,
          minLines: 2,
          decoration: const InputDecoration(
            isDense: true,
            hintText: '例如：条新消息、红包、验证码',
            border: OutlineInputBorder(),
          ),
          style: const TextStyle(fontSize: 13),
        ),
        const SizedBox(height: 6),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => _save(toast: true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppConstants.primaryColor,
              foregroundColor: Colors.white,
            ),
            child: const Text('保存设置', style: TextStyle(fontSize: 13)),
          ),
        ),
      ],
    );
  }
}
/// 选择要监听的应用（带搜索，勾选后返回选中包名）
class _AppPickerPage extends StatefulWidget {
  final List<String> selected;
  const _AppPickerPage({required this.selected});

  @override
  State<_AppPickerPage> createState() => _AppPickerPageState();
}

class _AppPickerPageState extends State<_AppPickerPage> {
  List<InstalledApp> _apps = [];
  late Set<String> _chosen;
  String _keyword = '';
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _chosen = widget.selected.toSet();
    _load();
  }

  Future<void> _load() async {
    final list = await NotifyService.instance.loadInstalledApps();
    if (!mounted) return;
    setState(() {
      _apps = list;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final kw = _keyword.trim().toLowerCase();
    final filtered = kw.isEmpty
        ? _apps
        : _apps
            .where((a) =>
                a.label.toLowerCase().contains(kw) ||
                a.pkg.toLowerCase().contains(kw))
            .toList();
    return Scaffold(
      appBar: AppBar(
        title: Text('选择应用（已选 ${_chosen.length} 个）',
            style: const TextStyle(fontSize: 16)),
        backgroundColor: AppConstants.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, _chosen.toList()),
            child: const Text('完成',
                style: TextStyle(color: Colors.white, fontSize: 15)),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
            child: TextField(
              decoration: const InputDecoration(
                hintText: '搜应用名称',
                prefixIcon: Icon(Icons.search),
                isDense: true,
                border: OutlineInputBorder(),
              ),
              onChanged: (v) => setState(() => _keyword = v),
            ),
          ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(24),
              child: CircularProgressIndicator(),
            )
          else if (_apps.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Text('读不到应用列表：请确认是安卓手机',
                  style: TextStyle(fontSize: 13)),
            )
          else
            Expanded(
              child: ListView.builder(
                itemCount: filtered.length,
                itemBuilder: (ctx, i) {
                  final a = filtered[i];
                  return CheckboxListTile(
                    dense: true,
                    value: _chosen.contains(a.pkg),
                    onChanged: (v) => setState(() {
                      if (v == true) {
                        _chosen.add(a.pkg);
                      } else {
                        _chosen.remove(a.pkg);
                      }
                    }),
                    title:
                        Text(a.label, style: const TextStyle(fontSize: 13)),
                    subtitle: Text(a.pkg,
                        style: const TextStyle(
                            fontSize: 10,
                            color: AppConstants.textSecondary)),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}