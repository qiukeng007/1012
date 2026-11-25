import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'utils/constants.dart';
import 'pages/home_page.dart';

/// App 配置 + 主题
class PospalStockApp extends StatelessWidget {
  const PospalStockApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      // 全局按钮/列表点击反馈：系统点击音 + 轻震动（滑动、长按不触发）
      builder: (context, child) =>
          TapFeedbackScope(child: child ?? const SizedBox.shrink()),
      locale: const Locale('zh', 'CN'),
      supportedLocales: const [Locale('zh', 'CN'), Locale('en')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: AppConstants.primaryColor,
        scaffoldBackgroundColor: AppConstants.bgColor,
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          elevation: 0,
        ),
        cardTheme: CardThemeData(
          elevation: 1,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppConstants.radiusMd),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppConstants.radiusSm),
          ),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 10,
            vertical: 10,
          ),
          isDense: true,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppConstants.radiusSm),
            ),
          ),
        ),
      ),
      home: const HomePage(),
    );
  }
}

/// 全局点击反馈：轻触按钮/列表时播放系统点击音并轻震动；滑动、长按不触发
class TapFeedbackScope extends StatefulWidget {
  final Widget child;
  const TapFeedbackScope({super.key, required this.child});

  @override
  State<TapFeedbackScope> createState() => _TapFeedbackScopeState();
}

class _TapFeedbackScopeState extends State<TapFeedbackScope> {
  Offset? _downPos;
  DateTime? _downAt;
  DateTime _last = DateTime.fromMillisecondsSinceEpoch(0);

  @override
  Widget build(BuildContext context) {
    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (e) {
        _downPos = e.position;
        _downAt = DateTime.now();
      },
      onPointerUp: (e) {
        final down = _downPos;
        final at = _downAt;
        _downPos = null;
        _downAt = null;
        if (down == null || at == null) return;
        final moved = (e.position - down).distance;
        final ms = DateTime.now().difference(at).inMilliseconds;
        // 滑动 / 长按不算点击
        if (moved > 12 || ms > 400) return;
        final now = DateTime.now();
        if (now.difference(_last).inMilliseconds < 80) return;
        _last = now;
        // 只保留系统点击音：震动放到具体按钮里，避免点空白也震动
        Feedback.forTap(context);
      },
      child: widget.child,
    );
  }
}
