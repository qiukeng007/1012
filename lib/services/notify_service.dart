import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// 抓到的一条手机通知
class NotifyItem {
  final DateTime time;
  final String app;
  final String pkg;
  final String title;
  final String text;
  /// 这条有没有真的念出来
  final bool spoke;
  /// 命中的屏蔽词（没命中为空）
  final String skipWord;
  /// 落在「启用时段」之外被跳过
  final bool outOfWindow;
  /// 这条来的时候屏幕是不是亮着
  final bool screenOn;
  /// 当时手机是不是锁屏状态
  final bool locked;
  /// 当时是不是「人正在用手机」（屏幕正常亮着 + 已解锁）
  final bool inUse;
  /// 当时屏幕是不是刚被点亮（多半是这条通知自己点亮的）
  final bool justLit;
  /// 当时屏幕的状态（正常亮着 / 息屏显示 / 灭屏）
  final String disp;
  /// 当时屏幕已经亮了多久（秒），-1 = 灭屏或不知道
  final int onSec;
  /// 当时手机是不是已经解锁（没解锁＝人不在）
  final bool unlocked;
  /// 当时的「亮屏时也播报」开关状态（关着 = 正在用手机时不念）
  final bool screenPolicy;
  /// 交给引擎播的时候，语音引擎是什么状态（就绪 / 初始化中 / 不可用）
  final String voice;

  NotifyItem({
    required this.time,
    required this.app,
    this.pkg = '',
    required this.title,
    required this.text,
    this.spoke = false,
    this.skipWord = '',
    this.outOfWindow = false,
    this.screenOn = false,
    this.locked = false,
    this.inUse = false,
    this.justLit = false,
    this.disp = '',
    this.onSec = -1,
    this.unlocked = false,
    this.screenPolicy = true,
    this.voice = '',
  });

  factory NotifyItem.fromJson(Map<String, dynamic> j) => NotifyItem(
        time: DateTime.fromMillisecondsSinceEpoch(
            (j['t'] as num?)?.toInt() ?? 0),
        app: (j['app'] as String?) ?? '',
        pkg: (j['pkg'] as String?) ?? '',
        title: (j['title'] as String?) ?? '',
        text: (j['text'] as String?) ?? '',
        spoke: j['spoke'] == true,
        skipWord: (j['skip'] as String?) ?? '',
        outOfWindow: j['outOfWindow'] == true,
        screenOn: j['screenOn'] == true,
        locked: j['locked'] == true,
        inUse: j['inUse'] == true,
        justLit: j['justLit'] == true,
        disp: (j['disp'] as String?) ?? '',
        onSec: (j['onSec'] as num?)?.toInt() ?? -1,
        // 老记录里没有这个字段，不能当成「锁屏中」，否则历史记录全被误显示成锁屏
        unlocked: j.containsKey('unlocked') ? j['unlocked'] == true : true,
        screenPolicy: j['screenPolicy'] != false,
        voice: (j['voice'] as String?) ?? '',
      );

  String get oneLine {
    final parts = <String>[];
    if (title.isNotEmpty) parts.add(title);
    if (text.isNotEmpty) parts.add(text);
    return parts.join(' ');
  }

  String get timeText {
    String two(int n) => n.toString().padLeft(2, '0');
    return '${two(time.month)}-${two(time.day)} ${two(time.hour)}:${two(time.minute)}:${two(time.second)}';
  }

  /// 收到这条时手机的状态（排查用）
  String get screenText {
    if (disp.isNotEmpty && disp != '未知') return disp;
    return screenOn ? '屏幕亮着' : '屏幕灭';
  }

  /// 这条为什么没念（空 = 念了）
  String get whySilent {
    if (spoke) return '';
    if (skipWord.isNotEmpty) return '命中屏蔽词「$skipWord」';
    if (outOfWindow) return '不在启用时段内';
    if (!screenPolicy && inUse) return '正在用手机（屏幕正常亮着且已解锁）·「亮屏时也播报」关着';
    return '语音播报未开启';
  }

  /// 列表里显示的那行小字
  String get statusText {
    if (spoke) {
      final v = voice.isEmpty ? '未知' : voice;
      return '已交给引擎（引擎:$v）· $screenText · 长按重念，点一下复制';
    }
    return '未播报（$whySilent）· $screenText · 点一下复制';
  }
}

/// 手机上装的一个应用（给勾选列表用）
class InstalledApp {
  final String pkg;
  final String label;
  InstalledApp({required this.pkg, required this.label});
}

/// 通知页的设置项（存在安卓侧，锁屏时播放也读得到）
class NotifySettings {
  /// 语音播报总开关
  bool speak;
  /// 语速 0.5 ~ 2.0
  double rate;
  /// 播报方式：0 跟随系统 / 1 手机扬声器 / 2 蓝牙
  int route;
  /// 亮屏时也播报
  bool speakWhenScreenOn;
  /// 启用时段（只在这段时间内工作）
  bool activeEnabled;
  int activeStart;
  int activeEnd;
  /// 屏蔽词，一行一个
  String skipWords;
  /// 监听哪些应用：0 全部 / 1 只监听勾选的
  int appMode;
  List<String> apps;

  NotifySettings({
    // 默认关：没设置过的机器不能自己就开始播报，要用户按圆钮才开
    this.speak = false,
    this.rate = 1.0,
    this.route = 0,
    this.speakWhenScreenOn = false,
    this.activeEnabled = false,
    this.activeStart = 8 * 60,
    this.activeEnd = 22 * 60,
    this.skipWords = '',
    this.appMode = 0,
    List<String>? apps,
  }) : apps = apps ?? <String>[];

  Map<String, dynamic> toJson() => {
        'speak_enabled': speak,
        'speak_rate': rate,
        'speak_route': route,
        'speak_screen_on': speakWhenScreenOn,
        'active_enabled': activeEnabled,
        'active_start_min': activeStart,
        'active_end_min': activeEnd,
        'skip_words': skipWords,
        'app_mode': appMode,
        'apps': apps,
      };

  factory NotifySettings.fromJson(Map<String, dynamic> j) => NotifySettings(
        speak: j['speak_enabled'] == true,
        rate: (j['speak_rate'] as num?)?.toDouble() ?? 1.0,
        route: (j['speak_route'] as num?)?.toInt() ?? 0,
        speakWhenScreenOn: j['speak_screen_on'] == true,
        activeEnabled: j['active_enabled'] == true,
        activeStart: (j['active_start_min'] as num?)?.toInt() ?? 8 * 60,
        activeEnd: (j['active_end_min'] as num?)?.toInt() ?? 22 * 60,
        skipWords: (j['skip_words'] as String?) ?? '',
        appMode: (j['app_mode'] as num?)?.toInt() ?? 0,
        apps: (j['apps'] is List)
            ? (j['apps'] as List)
                .map((e) => e.toString())
                .where((e) => e.isNotEmpty)
                .toList()
            : <String>[],
      );

  String get routeLabel => switch (route) {
        1 => '手机扬声器',
        2 => '蓝牙',
        _ => '跟随系统',
      };
}

/// 通知抓取 + 语音播报（安卓原生实现，Dart 这边只做展示与控制）
class NotifyService {
  static const MethodChannel _ch =
      MethodChannel('com.example.pospal_stock_app/notify');
  static const EventChannel _events =
      EventChannel('com.example.pospal_stock_app/notify_events');

  static final NotifyService instance = NotifyService._();
  NotifyService._();

  /// 只有安卓能抓通知（iOS 系统不给第三方 App 读通知栏）
  static bool get supported => !kIsWeb && Platform.isAndroid;

  /// 最多留多少条
  static const int cap = 200;

  final ValueNotifier<List<NotifyItem>> items =
      ValueNotifier<List<NotifyItem>>(<NotifyItem>[]);
  final ValueNotifier<bool> listenerEnabled = ValueNotifier<bool>(false);
  /// 还没看过的条数（底部红点用）
  final ValueNotifier<int> unread = ValueNotifier<int>(0);

  /// 当前设置：通知页底部的运行条和「配置 → 通知播报」卡片都读这一份，
  /// 免得两边各存一份、互相覆盖（在一边关了播报，另一边又给打开）
  final ValueNotifier<NotifySettings> settings =
      ValueNotifier<NotifySettings>(NotifySettings());

  StreamSubscription<dynamic>? _sub;
  bool _started = false;

  /// 通知监听到底连上了没（授权开着也可能没连上，重启 App 后经常这样）
  final ValueNotifier<bool> listenerConnected = ValueNotifier<bool>(false);
  Timer? _connectWatch;
  DateTime? _lastRebindAt;
  int _rebindTries = 0;
  /// 最后一次加码重连每一步的结果（排查用，播报诊断里会显示）
  String lastReconnect = '';

  Future<void> start() async {
    if (_started) return;
    _started = true;
    if (!supported) return;
    try {
      _sub = _events.receiveBroadcastStream().listen(_onRaw, onError: (_) {});
    } catch (_) {}
    await refreshListenerEnabled();
    await loadHistory();
    // 装完新包后安卓常常把通知监听的绑定解掉（表现就是「再也收不到通知」），
    // 每次启动主动要求重连一次，能自己救回来
    await rebindListener();
    await refreshListenerEnabled();
    // 标准 rebind 在这台机上经常完全没反应（系统就是不绑），几秒后还没连上
    // 就走一遍加码重连（原生那边会把组件状态写一变，逼系统重新登记监听）
    unawaited(Future<void>.delayed(const Duration(seconds: 3), _reconnectIfNeeded));
    // 一次不够：重启 App 后系统经常隔一会儿才肯绑回来，这里自己盯着重连
    _connectWatch ??= Timer.periodic(
      const Duration(seconds: 3),
      (_) => unawaited(_watchTick()),
    );
  }

  /// 监听掉线就自己重连：没连上时每 3 秒喊一次（最多 20 次，约一分钟），
  /// 之后转成 30 秒一轮的慢喊。连上以后什么都不做。
  Future<void> _watchTick() async {
    if (!supported) return;
    try {
      await refreshListenerEnabled();
      if (!listenerEnabled.value) return;
      if (listenerConnected.value) {
        _rebindTries = 0;
        return;
      }
      final now = DateTime.now();
      final last = _lastRebindAt;
      if (_rebindTries >= 20 &&
          last != null &&
          now.difference(last).inSeconds < 30) {
        return;
      }
      _lastRebindAt = now;
      _rebindTries++;
      // 每 4 次插一次「加码」重连：光喊 requestRebind 在这台机上没有用
      if (_rebindTries % 4 == 0) {
        await forceReconnect();
      } else {
        await rebindListener();
      }
    } catch (_) {}
  }

  Future<void> _reconnectIfNeeded() async {
    await refreshListenerEnabled();
    if (listenerEnabled.value && !listenerConnected.value) {
      await forceReconnect();
    }
  }

  /// 加码重连：原生侧会走 requestRebind + 组件状态写一变，
  /// 返回每一步的结果（放进诊断里，方便排查为什么没连上）
  Future<String> forceReconnect() async {
    if (!supported) return '';
    try {
      final info = await _ch.invokeMethod<String>('forceReconnect') ?? '';
      lastReconnect = info;
      return info;
    } catch (_) {
      return '';
    }
  }

  /// 主动检查一遍，没连上就立刻重连（切回前台、进通知页时用）
  Future<void> ensureConnected() async {
    if (!supported) return;
    try {
      await refreshListenerEnabled();
      if (!listenerEnabled.value || listenerConnected.value) return;
      await forceReconnect();
      await refreshListenerEnabled();
    } catch (_) {}
  }

  /// 装完新包/被系统解绑后，主动要求系统重新绑定通知监听
  Future<bool> rebindListener() async {
    if (!supported) return false;
    try {
      return await _ch.invokeMethod<bool>('rebindListener') ?? false;
    } catch (_) {
      return false;
    }
  }

  Future<void> refreshListenerEnabled() async {
    if (!supported) return;
    try {
      final on = await _ch.invokeMethod<bool>('isListenerEnabled') ?? false;
      listenerEnabled.value = on;
      final cn = await _ch.invokeMethod<bool>('isListenerConnected') ?? false;
      listenerConnected.value = cn;
    } catch (_) {}
  }

  /// 打开系统的「通知使用权」设置页
  Future<bool> openListenerSettings() async {
    if (!supported) return false;
    try {
      return await _ch.invokeMethod<bool>('openListenerSettings') ?? false;
    } catch (_) {
      return false;
    }
  }

  Future<void> loadHistory() async {
    if (!supported) return;
    try {
      final raw = await _ch.invokeMethod<String>('getHistory') ?? '';
      final list = <NotifyItem>[];
      for (final line in raw.split('\n')) {
        if (line.trim().isEmpty) continue;
        try {
          list.add(
              NotifyItem.fromJson(jsonDecode(line) as Map<String, dynamic>));
        } catch (_) {}
      }
      list.sort((a, b) => b.time.compareTo(a.time));
      items.value = list.take(cap).toList();
    } catch (_) {}
  }

  Future<void> clear() async {
    if (!supported) return;
    try {
      await _ch.invokeMethod<bool>('clearHistory');
    } catch (_) {}
    items.value = <NotifyItem>[];
    unread.value = 0;
  }

  Future<NotifySettings> loadSettings() async {
    if (!supported) return settings.value;
    NotifySettings parsed;
    try {
      final raw = await _ch.invokeMethod<String>('getSettings') ?? '';
      parsed = raw.isEmpty
          ? NotifySettings()
          : NotifySettings.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      parsed = NotifySettings();
    }
    settings.value = parsed;
    return parsed;
  }

  Future<void> saveSettings(NotifySettings s) async {
    if (!supported) return;
    try {
      await _ch.invokeMethod<bool>('setSettings',
          {'json': jsonEncode(s.toJson())});
    } catch (_) {}
    // 换成一份副本：界面上的开关跟着这一份走，存完立刻能反映出来
    settings.value = NotifySettings.fromJson(s.toJson());
  }

  /// 现在这一刻的状态：屏幕亮不亮、会不会念（页面上那行自检用）
  Future<Map<String, dynamic>> runtimeState() async {
    if (!supported) return <String, dynamic>{};
    try {
      final raw = await _ch.invokeMethod<String>('getRuntimeState') ?? '';
      if (raw.isEmpty) return <String, dynamic>{};
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return <String, dynamic>{};
    }
  }

  List<InstalledApp> _installedCache = <InstalledApp>[];
  bool _installedLoaded = false;

  /// 应用列表带缓存（页面里要把包名显示成应用名）
  Future<List<InstalledApp>> installedApps({bool force = false}) async {
    if (!force && _installedLoaded) return _installedCache;
    final list = await loadInstalledApps();
    if (list.isNotEmpty) {
      _installedCache = list;
      _installedLoaded = true;
    }
    return list.isEmpty ? _installedCache : list;
  }

  /// 包名 -> 应用名（没查到就用包名兜底）
  String labelOf(String pkg) {
    for (final a in _installedCache) {
      if (a.pkg == pkg) return a.label;
    }
    return pkg;
  }

  /// 已安装的应用（只含有桌面图标的）
  Future<List<InstalledApp>> loadInstalledApps() async {
    if (!supported) return <InstalledApp>[];
    try {
      final raw = await _ch.invokeMethod<String>('getInstalledApps') ?? '[]';
      final arr = jsonDecode(raw) as List;
      final out = arr
          .map((e) => InstalledApp(
                pkg: (e['pkg'] as String?) ?? '',
                label: (e['label'] as String?) ?? '',
              ))
          .where((e) => e.pkg.isNotEmpty)
          .toList();
      out.sort((a, b) => a.label.compareTo(b.label));
      return out;
    } catch (_) {
      return <InstalledApp>[];
    }
  }

  /// 试念一句；返回语音引擎状态文字（不可用时能知道原因）
  Future<String> speakTest(String text) async {
    if (!supported) return 'iOS 不支持抓通知播报';
    try {
      return await _ch.invokeMethod<String>('speakTest', {'text': text}) ?? '';
    } catch (e) {
      return '调用失败：$e';
    }
  }

  Future<String> speakStatus() async {
    if (!supported) return '';
    try {
      return await _ch.invokeMethod<String>('speakStatus') ?? '';
    } catch (_) {
      return '';
    }
  }

  Future<void> stopSpeak() async {
    if (!supported) return;
    try {
      await _ch.invokeMethod<bool>('stopSpeak');
    } catch (_) {}
  }

  void markAllRead() => unread.value = 0;

  void _onRaw(dynamic raw) {
    if (raw is! String || raw.trim().isEmpty) return;
    try {
      final item = NotifyItem.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      final list = List<NotifyItem>.from(items.value);
      if (list.isNotEmpty &&
          list.first.time == item.time &&
          list.first.app == item.app &&
          list.first.text == item.text) {
        return;
      }
      list.insert(0, item);
      if (list.length > cap) list.removeRange(cap, list.length);
      items.value = list;
      unread.value = unread.value + 1;
    } catch (_) {}
  }

  void dispose() {
    _sub?.cancel();
    _sub = null;
    _connectWatch?.cancel();
    _connectWatch = null;
    _started = false;
  }
}
