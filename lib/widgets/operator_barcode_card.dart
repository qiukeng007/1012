import 'dart:convert';

import 'package:barcode/barcode.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/auth_service.dart';
import '../utils/constants.dart';

/// 操作员条码的固定前缀：不好手输的 ASCII 符号 + 竖线，后面接操作员姓名。
///
/// 只放 ASCII 符号（^ ~ | \ @ # $ % & * 这类）是有原因的：
/// 非 ASCII 符号（☀♔∑ 这种）在 Code128 里要按 UTF-8 字节 + FNC4 扩展编码，
/// 一个符号就多 88 个模块，而且不少扫码枪不认 FNC4 扩展 → 直接扫不出来。
/// ASCII 符号一个只占 11 个模块，兼容所有扫码枪。想加符号就改这一行。
const String kOperatorBarcodePrefix = '^|';

/// 一维码要编码的内容 + 是否需要 {n} 转义。
class OperatorBarcodeData {
  const OperatorBarcodeData(this.payload, this.escapes);

  final String payload;
  final bool escapes;
}

/// 把要编码的文字转成 Code128 能装的负载。
///
///  * 纯英文/数字：原样编码，扫码结果就是原文，兼容所有扫码枪。
///  * 含中文/特殊符号：Code128 只能装 0~255 的单字节，所以按 UTF-8
///    逐字节编码 —— 字节 >=128 的前面加一个 FNC4（写成 "{4}"），
///    这是 Code128 的「扩展 ASCII」写法；扫码端按 UTF-8 解析就能还原。
///    代价：每个汉字/符号要占 6 个符号位（3 字节 x2），条码会明显变长。
OperatorBarcodeData buildOperatorBarcode(String text) {
  final hasNonAscii = text.runes.any((int r) => r > 127);
  if (!hasNonAscii) return OperatorBarcodeData(text, false);
  final bytes = utf8.encode(text);
  final sb = StringBuffer();
  for (final int b in bytes) {
    if (b < 128) {
      sb.writeCharCode(b);
    } else {
      sb.write('{4}');
      sb.writeCharCode(b - 128);
    }
  }
  return OperatorBarcodeData(sb.toString(), true);
}

/// 配置页顶部长期显示的操作员一维码（Code128）。
///
/// 内容 = 固定特殊字符前缀 + 操作员姓名；页面上只显示条码本身，
/// 不显示姓名，也没有修改入口。点条码可放大（默认竖排，长条码更好扫）。
class OperatorBarcodeCard extends StatefulWidget {
  const OperatorBarcodeCard({super.key});

  @override
  State<OperatorBarcodeCard> createState() => _OperatorBarcodeCardState();
}

class _OperatorBarcodeCardState extends State<OperatorBarcodeCard> {
  String _operator = '';
  bool _loaded = false;
  SharedPreferences? _prefs;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    String op = '';
    try {
      final prefs = await SharedPreferences.getInstance();
      _prefs = prefs;
      op = AuthService(prefs).operatorName.trim();
    } catch (_) {}
    if (!mounted) return;
    setState(() {
      _operator = op;
      _loaded = true;
    });
  }

  Widget _buildBars(double width, double height) {
    final data = buildOperatorBarcode(kOperatorBarcodePrefix + _operator);
    final bc = Barcode.code128(escapes: data.escapes);
    final elements = bc
        .make(data.payload, width: width, height: height)
        .toList(growable: false);
    return CustomPaint(
      size: Size(width, height),
      painter: _BarsPainter(elements, Colors.black),
    );
  }

  /// 放大显示：条码很长时横着放，每个模块不到一个像素，扫不出来；
  /// 竖排（转 90 度）能用满屏幕的高度，模块宽 3 个像素左右，就好扫了。
  Future<void> _showLarge() async {
    if (_operator.isEmpty) return;
    var vertical = true;
    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) {
          final media = MediaQuery.of(ctx);
          final barLength =
              (media.size.height - 300).clamp(360.0, 1000.0).toDouble();
          final barWidth =
              (media.size.width - 92).clamp(200.0, 900.0).toDouble();
          return Dialog(
            insetPadding: const EdgeInsets.all(12),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 10, 10, 4),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      const Text('操作员条码',
                          style: TextStyle(
                              fontSize: 15, fontWeight: FontWeight.w600)),
                      const Spacer(),
                      TextButton(
                        onPressed: () => setDlg(() => vertical = !vertical),
                        child: Text(vertical ? '改成横排' : '改成竖排',
                            style: const TextStyle(fontSize: 13)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Container(
                    color: Colors.white,
                    padding: const EdgeInsets.all(8),
                    child: vertical
                        ? SizedBox(
                            width: 148,
                            height: barLength,
                            child: RotatedBox(
                              quarterTurns: 1,
                              child: _buildBars(barLength, 140),
                            ),
                          )
                        : _buildBars(barWidth, 170),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    vertical
                        ? '条码较长，已竖排：把扫码枪转 90° 顺着竖条扫（能读任意方向的影像枪直接扫）'
                        : '横排显示：只适合能读任意方向的影像枪',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontSize: 12, color: AppConstants.textSecondary),
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('关闭')),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // 每次重建都读一次真值：在别处改了操作员姓名，切回配置页就会跟着变
    final prefs = _prefs;
    if (prefs != null) {
      _operator = AuthService(prefs).operatorName.trim();
    }
    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      color: AppConstants.bgColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppConstants.radiusSm),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(8, 12, 8, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.qr_code_2,
                    size: 16, color: AppConstants.primaryColor),
                const SizedBox(width: 6),
                const Text(
                  '操作员条码',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppConstants.primaryColor,
                  ),
                ),
                const Spacer(),
                if (_operator.isNotEmpty)
                  const Text('点条码放大',
                      style: TextStyle(
                          fontSize: 11, color: AppConstants.textSecondary)),
              ],
            ),
            const SizedBox(height: 8),
            if (!_loaded)
              const Text('读取中…',
                  style: TextStyle(
                      fontSize: 12, color: AppConstants.textSecondary))
            else if (_operator.isEmpty)
              const Text(
                '还没设置操作员姓名，条码暂时不显示。',
                style: TextStyle(fontSize: 12, color: AppConstants.textSecondary),
              )
            else
              GestureDetector(
                onTap: _showLarge,
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppConstants.dividerColor),
                  ),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                  child: LayoutBuilder(
                    builder: (c, cons) => _buildBars(cons.maxWidth, 92),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _BarsPainter extends CustomPainter {
  const _BarsPainter(this.elements, this.color);

  final List<BarcodeElement> elements;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;
    for (final el in elements) {
      // 只画黑条；白色部分是底，不用画
      if (el is BarcodeBar && el.black) {
        canvas.drawRect(
            Rect.fromLTWH(el.left, el.top, el.width, el.height), paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _BarsPainter old) =>
      old.color != color || !identical(old.elements, elements);
}
