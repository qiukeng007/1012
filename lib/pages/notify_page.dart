import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/notify_service.dart';
import '../utils/constants.dart';

/// 通知页：手机收到的通知在这里排队显示，开了语音播报就用系统语音念出来。
/// 抓取和播报都在安卓原生侧（NotificationListenerService + 系统 TTS），
/// 所以锁屏、App 在后台也能收到并播报。
class NotifyPage extends StatefulWidget {
  const NotifyPage({super.key});

  @override
  State<NotifyPage> createState() => _NotifyPageState();
}

class _NotifyPageState extends State<NotifyPage>
    with WidgetsBindingObserver, AutomaticKeepAliveClientMixin {
  final _service = NotifyService.instance;
  final _skipCtrl = TextEditingController();
  NotifySettings _settings = NotifySettings();
  bool _loading = true;
  String _speakStatus = '';
  String _runtimeText = '';
  bool _rebindTried = false;
  /// 通知监听服务是否真的连上了（权限开着也可能没连上）
  bool _connected = true;
  /// 「通知设置」折叠着还是摊开：这一页主要是看通知，设置默认收起来。
  bool _foldOpen = false;

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
    _skipCtrl.dispose();
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
    // 装完新包后安卓常常把通知监听的绑定解掉（表现就是「再也收不到通知」），
    // 每次打开 App 主动要求重连一次，能自己救回来
    if (!_rebindTried) {
      _rebindTried = true;
      await _service.rebindListener();
      await _service.refreshListenerEnabled();
    }
    // 从文件里重新读一遍记录：App 在后台/被杀过的时候，新通知只写进了文件，
    // 没推给界面，不重读的话页面上就看不到（之前就是这个毛病）
    await _service.loadHistory();
    final s = await _service.loadSettings();
    final st = await _service.speakStatus();
    // 已选应用要显示成应用名，所以顺手把应用列表读进来
    if (s.apps.isNotEmpty) await _service.installedApps();
    final rt = await _service.runtimeState();
    if (!mounted) return;
    setState(() {
      _settings = s;
      _skipCtrl.text = s.skipWords;
      _speakStatus = st;
      _applyRuntime(rt);
      _loading = false;
    });
  }

  /// 页面上那行自检：现在这一刻会不会念，不会的话是因为哪一条
  String _describeRuntime(Map<String, dynamic> rt) {
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

  /// 把原生返回的运行时状态落到界面上（自检那行 + 监听是否连上）
  void _applyRuntime(Map<String, dynamic> rt) {
    _runtimeText = _describeRuntime(rt);
    if (rt.containsKey('connected')) _connected = rt['connected'] == true;
  }

  Future<void> _refreshRuntime() async {
    final rt = await _service.runtimeState();
    if (!mounted) return;
    setState(() => _runtimeText = _describeRuntime(rt));
  }

  /// 重连通知监听：装完新包后系统常把监听解绑，这一步能自己救回来。
  Future<void> _rebindListener() async {
    final ok = await _service.rebindListener();
    await _service.refreshListenerEnabled();
    await _refreshRuntime();
    if (!mounted) return;
    setState(() {});
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(ok
          ? '已要求系统重新连接通知监听，等一条新通知看看'
          : '重连失败，请去系统设置把「银豹查询」关掉再打开'),
      duration: const Duration(seconds: 3),
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

  /// 诊断正文：maxItems<=0 = 全部通知
  Future<String> _diagnosisText(int maxItems) async {
    final rt = await _service.runtimeState();
    final st = await _service.speakStatus();
    final now = DateTime.now();
    String two(int v) => v.toString().padLeft(2, '0');
    final items = _service.items.value;
    final list = maxItems <= 0 ? items : items.take(maxItems).toList();
    final b = StringBuffer()
      ..writeln('通知播报诊断')
      ..writeln('导出时间：${now.year}-${two(now.month)}-${two(now.day)} '
          '${two(now.hour)}:${two(now.minute)}:${two(now.second)}')
      ..writeln('通知使用权：${rt['listenerEnabled'] == true ? '已开启' : '没开'}')
      ..writeln('通知监听服务：${rt['connected'] == true ? '已连接' : '未连接（系统把监听解绑了）'}')
      ..writeln('语音引擎：$st')
      ..writeln('语音播报开关：${rt['speak'] == true ? '开' : '关'}')
      ..writeln('正在用手机时也播报：${rt['screenPolicy'] == true ? '开' : '关'}')
      ..writeln('在启用时段内：${rt['activeWindow'] == true ? '是' : '否'}')
      ..writeln('现在收到通知会不会念：${rt['willSpeak'] == true ? '会' : '不会'}')
      ..writeln('当前状态：${_describeRuntime(rt)}')
      ..writeln('判定依据：屏幕=${(rt['disp'] as String?) ?? '未知'}'
          '${rt['screenOnSec'] is int && (rt['screenOnSec'] as int) >= 0 ? '（已亮${rt['screenOnSec']}秒）' : ''}'
          ' · 解锁广播=${rt['unlocked'] == true ? '有' : '无'}'
          ' · 锁屏需密码=${rt['keyguardClear'] == true ? '否' : '是'}'
          ' · 刚点亮=${rt['justLit'] == true ? '是' : '否'}');
    if (_settings.route == 2) {
      b.writeln('！注意：播报方式选的是「蓝牙」，声音会走耳机，'
          '耳机没戴在耳朵上就等于听不见；想从手机出声请选「手机扬声器」');
    } else if (_settings.route == 1) {
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
          '1) 回上一页再进本页，会自动重连一次；'
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
      b.writeln(
          '${e.timeText} ${e.app} | ${e.oneLine} | $r | ${e.screenText}$on');
    }
    return b.toString();
  }

  /// 播报诊断：出问题时一键复制，不用截图（复制图标那个）
  Future<void> _copyDiagnosis() async {
    final text = await _diagnosisText(5);
    final rt = await _service.runtimeState();
    if (!mounted) return;
    await Clipboard.setData(ClipboardData(text: text));
    if (!mounted) return;
    setState(() => _runtimeText = _describeRuntime(rt));
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

  Future<void> _save({bool toast = false}) async {
    _settings.skipWords = _skipCtrl.text;
    // 速度滑杆本身就是 0.1 一档，存之前先按 1 位小数收一下：
    // 否则浮点尾数（1.2 会存成 1.2000000476837158）读回来对不上，会误报"没存进去"
    _settings.rate = (_settings.rate.clamp(0.5, 2.0) * 10).round() / 10;
    await _service.saveSettings(_settings);
    // 存完再读回来比对：万一真没存进去（比如原生侧报错），界面上要看得见
    final back = await _service.loadSettings();
    final rt = await _service.runtimeState();
    if (!mounted) return;
    final diffs = <String>[];
    if (back.speak != _settings.speak) {
      diffs.add("语音播报：界面 ${_settings.speak} / 系统 ${back.speak}");
    }
    if (back.speakWhenScreenOn != _settings.speakWhenScreenOn) {
      diffs.add(
          "亮屏时也播报：界面 ${_settings.speakWhenScreenOn} / 系统 ${back.speakWhenScreenOn}");
    }
    if (back.activeEnabled != _settings.activeEnabled) {
      diffs.add(
          "只在启用时段内工作：界面 ${_settings.activeEnabled} / 系统 ${back.activeEnabled}");
    }
    // 速度只比到小数点后两位：安卓里存的是 float，尾数本来就会差一丁点
    if ((back.rate - _settings.rate).abs() > 0.005) {
      diffs.add("播报速度：界面 ${_settings.rate} / 系统 ${back.rate}");
    }
    if (back.route != _settings.route) {
      diffs.add("播报方式：界面 ${_settings.route} / 系统 ${back.route}");
    }
    if (back.apps.length != _settings.apps.length) {
      diffs.add(
          "监听应用个数：界面 ${_settings.apps.length} / 系统 ${back.apps.length}");
    }
    setState(() {
      _settings = back;
      _applyRuntime(rt);
    });
    if (diffs.isNotEmpty) {
      _showNotSaved(diffs);
      return;
    }
    if (toast) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('" + "已保存" + "'), duration: Duration(seconds: 1)),
      );
    }
  }

  /// 设置没落盘时给「可复制」窗口（不要一闪而过，也不要让人去截图）
  void _showNotSaved(List<String> diffs) {
    final now = DateTime.now();
    String two(int v) => v.toString().padLeft(2, '0');
    final detail = StringBuffer()
      ..writeln('操作：在「通知」页改播报设置')
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
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                  content: Text('已复制，黏贴给我就行'),
                  duration: Duration(seconds: 2)));
            },
            icon: const Icon(Icons.copy, size: 16),
            label: const Text('复制全部'),
          ),
        ],
      ),
    );
  }

  /// 时间选择：小时 + 分钟两个下拉，比系统那个转盘好点
  Future<void> _pickTime(bool isStart) async {
    var hour = (isStart ? _settings.activeStart : _settings.activeEnd) ~/ 60;
    var minute = ((isStart ? _settings.activeStart : _settings.activeEnd) % 60) ~/ 5 * 5;
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
                        child: Text(
                            '${m.toString().padLeft(2, '0')} 分')),
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
    setState(() {
      final m = hour * 60 + minute;
      if (isStart) {
        _settings.activeStart = m;
      } else {
        _settings.activeEnd = m;
      }
    });
    await _save(toast: true);
  }

  static String _mm(int minutes) {
    final h = (minutes ~/ 60).toString().padLeft(2, '0');
    final m = (minutes % 60).toString().padLeft(2, '0');
    return '$h:$m';
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return ListView(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      children: [
        _buildRunBar(),
        if (NotifyService.supported) ...[
          const SizedBox(height: 6),
          _buildFoldHeader(),
          if (_foldOpen) ...[
            const SizedBox(height: 6),
            _buildStatusCard(),
            const SizedBox(height: 8),
            _buildSpeakCard(),
            const SizedBox(height: 8),
            _buildAppCard(),
            const SizedBox(height: 8),
            _buildSkipCard(),
          ],
        ],
        const SizedBox(height: 4),
        _buildListHeader(),
        const SizedBox(height: 4),
        _buildList(),
      ],
    );
  }

  Widget _card({required List<Widget> children}) {
    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: children,
        ),
      ),
    );
  }

  Widget _title(String text) => Text(text,
      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600));

  Widget _hint(String text) => Text(text,
      style: const TextStyle(fontSize: 11, color: AppConstants.textSecondary));

  // ---------------- 常显的运行条（「启动 / 停止」不折起来） ----------------

  /// 最上面这张卡不折：语音播报总开关就是这一页的「启动 / 停止」，
  /// 下面那行是「现在到底会不会念」的自检（带复制诊断 / 刷新）。
  /// 收进折子里会出现「不播报了却找不到那个开关」的局面。
  Widget _buildRunBar() {
    if (!NotifyService.supported) {
      return _card(children: const [
        Text('通知播报只支持安卓',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        SizedBox(height: 6),
        Text('iOS 系统不允许第三方 App 读取通知栏内容，所以这个功能在 iPhone 上用不了。',
            style: TextStyle(fontSize: 12, color: AppConstants.textSecondary)),
      ]);
    }
    final granted = _service.listenerEnabled.value;
    // 「没给通知使用权 / 监听掉了线」是整件事的根：这句话必须在**常显**的卡片上、而且红字。
    // 从前它只在折起来的设置卡里，设置一折，一句红字都看不到。
    final warn = !granted
        ? '⚠ 通知使用权没打开 —— 现在一条通知都收不到，语音也不会念。\n'
            '1) 点下面「去开启通知使用权」\n'
            '2) 在名单里把「银豹查询」勾上\n'
            '（有的手机在：设置 → 通知 → 通知使用权；也有的在「特殊应用权限」里）'
        : (_connected != true
            ? '⚠ 通知使用权给了，但监听服务没连上 —— 现在一样收不到通知。\n'
                '1) 点下面「重连」\n'
                '2) 不行就去系统设置把「银豹查询」关掉再打开\n'
                '3) 再不行重启手机（装完新包后系统常会把监听解绑，这是安卓的老毛病）'
            : '');
    return _card(children: [
      SwitchListTile(
        contentPadding: EdgeInsets.zero,
        dense: true,
        value: _settings.speak,
        onChanged: (v) async {
          setState(() => _settings.speak = v);
          await _save();
        },
        title: _title('语音播报'),
        subtitle: _hint('收到通知就用语音念出来（锁屏也会念）'),
      ),
      if (warn.isNotEmpty) ...[
        const SizedBox(height: 4),
        SelectableText(warn,
            style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppConstants.errorColor)),
        Row(children: [
          TextButton(
              onPressed: _rebindListener,
              child: const Text('重连', style: TextStyle(fontSize: 13))),
          TextButton(
              onPressed: _goListenerSettings,
              child:
                  const Text('去开启通知使用权', style: TextStyle(fontSize: 13))),
        ]),
      ],
      if (_runtimeText.isNotEmpty) ...[
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppConstants.bgColor,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Row(
            children: [
              Expanded(
                child: SelectableText(_runtimeText,
                    style: TextStyle(
                        fontSize: 11,
                        color: warn.isNotEmpty
                            ? AppConstants.errorColor
                            : AppConstants.textPrimary)),
              ),
              GestureDetector(
                onTap: _copyDiagnosis,
                child: const Icon(Icons.copy,
                    size: 16, color: AppConstants.primaryColor),
              ),
              const SizedBox(width: 12),
              GestureDetector(
                onTap: _refreshRuntime,
                child: const Icon(Icons.refresh,
                    size: 16, color: AppConstants.primaryColor),
              ),
            ],
          ),
        ),
      ],
    ]);
  }

  /// 「通知设置」那一行标题：点一下展开 / 收起下面那几张设置卡。
  Widget _buildFoldHeader() {
    // 整行做 48dp 高的热区：手指点东西本来就不准，只有一个 18px 的小箭头时经常点不中。
    return InkWell(
      onTap: () => setState(() => _foldOpen = !_foldOpen),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 48),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
          child: Row(children: [
            const Icon(Icons.tune, size: 18, color: AppConstants.textSecondary),
            const SizedBox(width: 6),
            Expanded(
              child: Text('通知设置（授权 / 播报 / 应用 / 屏蔽词）',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
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

  // ---------------- 状态 ----------------

  Widget _buildStatusCard() {
    if (!NotifyService.supported) {
      return _card(children: const [
        Text('通知播报只支持安卓',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        SizedBox(height: 6),
        Text('iOS 系统不允许第三方 App 读取通知栏内容，所以这个功能在 iPhone 上用不了。',
            style: TextStyle(fontSize: 12, color: AppConstants.textSecondary)),
      ]);
    }
    final granted = _service.listenerEnabled.value;
    return _card(children: [
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
        Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: SelectableText(
            '监听服务没连上：现在收不到任何通知。\n'
            '1) 回上一页再进本页会自动重连一次\n'
            '2) 点「重连」按钮\n'
            '3) 去系统设置把「银豹查询」的通知使用权关掉再打开\n'
            '4) 还不行就重启手机\n'
            '（装完新包后系统常会把监听解绑，这是安卓的老毛病）',
            style: const TextStyle(
                fontSize: 12, color: AppConstants.errorColor),
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
                  '银豹查询，语音播报测试，语速${_settings.rate.toStringAsFixed(1)}倍');
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
        ],
      ),
      if (_speakStatus.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: SelectableText('语音引擎：$_speakStatus',
              style: const TextStyle(
                  fontSize: 11, color: AppConstants.textSecondary)),
        ),
    ]);
  }

  // ---------------- 播报设置：语速 / 方式 / 亮屏 / 启用时段 ----------------

  Widget _buildSpeakCard() {
    if (!NotifyService.supported) return const SizedBox.shrink();
    return _card(children: [
      Row(
        children: [
          _title('播报速度'),
          const Spacer(),
          Text('${_settings.rate.toStringAsFixed(1)} 倍',
              style: const TextStyle(
                  fontSize: 13, color: AppConstants.primaryColor)),
        ],
      ),
      Slider(
        value: _settings.rate.clamp(0.5, 2.0),
        min: 0.5,
        max: 2.0,
        divisions: 15,
        label: '${_settings.rate.toStringAsFixed(1)}x',
        onChanged: (v) => setState(() => _settings.rate = v),
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
              selected: _settings.route == r,
              onSelected: (_) async {
                setState(() => _settings.route = r);
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
        value: _settings.speakWhenScreenOn,
        onChanged: (v) async {
          setState(() => _settings.speakWhenScreenOn = v);
          await _save(toast: true);
        },
        title: _title('亮屏时也播报'),
        subtitle: _hint('关着时：正在用手机（屏幕正常亮着、而且解锁了）才不念；'
            '屏幕灭、息屏显示、锁屏亮着都念'),
      ),
      SwitchListTile(
        contentPadding: EdgeInsets.zero,
        dense: true,
        value: _settings.activeEnabled,
        onChanged: (v) async {
          setState(() => _settings.activeEnabled = v);
          await _save(toast: true);
        },
        title: _title('只在启用时段内工作'),
        subtitle: _hint('关掉 = 全天工作；打开 = 只在这段时间里抓取和播报'),
      ),
      if (_settings.activeEnabled)
        Row(
          children: [
            OutlinedButton(
              onPressed: () => _pickTime(true),
              child: Text('开始 ${_mm(_settings.activeStart)}',
                  style: const TextStyle(fontSize: 13)),
            ),
            const SizedBox(width: 8),
            OutlinedButton(
              onPressed: () => _pickTime(false),
              child: Text('结束 ${_mm(_settings.activeEnd)}',
                  style: const TextStyle(fontSize: 13)),
            ),
            const SizedBox(width: 8),
            const Text('点一下改时间',
                style: TextStyle(
                    fontSize: 11, color: AppConstants.textSecondary)),
          ],
        ),
    ]);
  }

  // ---------------- 监听哪些应用 ----------------

  Widget _buildAppCard() {
    if (!NotifyService.supported) return const SizedBox.shrink();
    final onlyPicked = _settings.appMode == 1;
    final picked = _settings.apps;
    return _card(children: [
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
              selected: _settings.appMode == m,
              onSelected: (_) async {
                setState(() => _settings.appMode = m);
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
                  color: AppConstants.primaryColor.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: AppConstants.primaryColor.withValues(alpha: 0.35)),
                ),
                child: Text(_service.labelOf(pkg),
                    style: const TextStyle(
                        fontSize: 12, color: AppConstants.primaryColor)),
              ),
            if (picked.length > 40)
              Text('…等 ${picked.length} 个',
                  style: const TextStyle(
                      fontSize: 12, color: AppConstants.textSecondary)),
          ],
        ),
      ],
      if (onlyPicked && picked.isEmpty)
        const Padding(
          padding: EdgeInsets.only(top: 6),
          child: Text('现在一个应用都没勾，等于什么都收不到 —— 点上面按钮去勾。',
              style: TextStyle(fontSize: 12, color: AppConstants.errorColor)),
        ),
    ]);
  }

  Future<void> _pickApps() async {
    final result = await Navigator.of(context).push<List<String>>(
      MaterialPageRoute(
        builder: (_) => _AppPickerPage(selected: List<String>.from(_settings.apps)),
      ),
    );
    if (result == null) return;
    setState(() => _settings.apps = result);
    await _service.installedApps();
    await _save(toast: true);
  }

  // ---------------- 屏蔽词 ----------------

  Widget _buildSkipCard() {
    if (!NotifyService.supported) return const SizedBox.shrink();
    return _card(children: [
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
    ]);
  }

  // ---------------- 记录列表 ----------------

  Widget _buildListHeader() {
    final count = _service.items.value.length;
    return Row(
      children: [
        Text('通知记录（$count 条，最多留 ${NotifyService.cap} 条）',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        const Spacer(),
        TextButton(
          onPressed: count == 0
              ? null
              : () async {
                  // 连诊断信息一起复制，出问题时用户复制一次就够我定位
                  final text = await _diagnosisText(0);
                  await Clipboard.setData(ClipboardData(text: text));
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                      content: Text('已复制全部通知（含诊断信息）'),
                      duration: Duration(seconds: 2)));
                },
          child: const Text('复制全部', style: TextStyle(fontSize: 12)),
        ),
        TextButton(
          onPressed: count == 0 ? null : _clearAll,
          child: const Text('清空', style: TextStyle(fontSize: 12)),
        ),
      ],
    );
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
          return const Padding(
            padding: EdgeInsets.all(24),
            child: Center(child: CircularProgressIndicator()),
          );
        }
        if (list.isEmpty) {
          return const Padding(
            padding: EdgeInsets.all(24),
            child: Center(
              child: Text('还没有收到通知',
                  style: TextStyle(
                      fontSize: 13, color: AppConstants.textSecondary)),
            ),
          );
        }
        return Column(
          children: list.map((e) => _buildItem(e)).toList(),
        );
      },
    );
  }

  Widget _buildItem(NotifyItem item) {
    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: const BorderSide(color: AppConstants.dividerColor),
      ),
      child: InkWell(
        onTap: () {
          Clipboard.setData(ClipboardData(
              text: '${item.timeText} ${item.app} ${item.oneLine}'));
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('已复制这一条'),
              duration: Duration(seconds: 1)));
        },
        onLongPress: () => _service.speakTest('${item.app}，${item.oneLine}'),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(item.app,
                      style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppConstants.primaryColor)),
                  const Spacer(),
                  Text(item.timeText,
                      style: const TextStyle(
                          fontSize: 11, color: AppConstants.textSecondary)),
                ],
              ),
              if (item.title.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(item.title,
                      style: const TextStyle(
                          fontSize: 13, color: AppConstants.textPrimary)),
                ),
              if (item.text.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(item.text,
                      style: const TextStyle(
                          fontSize: 13, color: AppConstants.textPrimary)),
                ),
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  item.statusText,
                  style: TextStyle(
                    fontSize: 11,
                    color: item.spoke
                        ? AppConstants.successColor
                        : AppConstants.textSecondary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
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
                    title: Text(a.label,
                        style: const TextStyle(fontSize: 13)),
                    subtitle: Text(a.pkg,
                        style: const TextStyle(
                            fontSize: 10, color: AppConstants.textSecondary)),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
