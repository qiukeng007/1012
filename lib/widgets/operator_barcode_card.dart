import 'dart:convert';

import 'package:barcode/barcode.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/auth_service.dart';
import '../utils/constants.dart';

/// 操作员条码的固定前缀：不好手输的 ASCII 符号 + 竖线，后面接操作员姓名。
///
/// 为什么前缀只放 ASCII 符号（^ ~ | \ @ # $ % & * 这类）：
/// 非 ASCII 符号要么得走 Code128 的 FNC4 扩展（很多扫码枪不认，扫出来会断），
/// 要么得写成 %XX（长度翻好几倍）。ASCII 一个只占 11 个模块，谁都读得出来。
/// 想加符号就改这一行。
const String kOperatorBarcodePrefix = '^|';

/// 一维码要编码的内容 + 是否需要 {n} 转义。
class OperatorBarcodeData {
  const OperatorBarcodeData(this.payload, this.escapes);

  final String payload;
  final bool escapes;
}

/// 把要编码的文字转成 **纯 ASCII** 的 Code128 负载。
///
///  * 纯英文/数字：原样编码，扫码结果就是原文。
///  * 含中文/特殊符号：**不用 FNC4 扩展** —— 很多扫码枪（尤其是一维枪）
///    不认 FNC4，扫到扩展段就断掉，实测 `^|蚊子` 会被扫成 `^|` 然后回车。
///    改成按 UTF-8 逐字节写成 %XX（percent-encoding），整个负载只剩 ASCII
///    可见字符 → 任何扫码枪都能读出来。
///    读的一方：去掉前缀后做一次 URL 解码（易语言：编码_URL解码 (内容, 真)）。
OperatorBarcodeData buildOperatorBarcode(String text) {
  final hasNonAscii = text.runes.any((int r) => r > 127);
  if (!hasNonAscii) return OperatorBarcodeData(text, false);
  final bytes = utf8.encode(text);
  final sb = StringBuffer();
  for (final int b in bytes) {
    if (b < 128) {
      sb.writeCharCode(b);
    } else {
      sb.write('%');
      sb.write(b.toRadixString(16).toUpperCase().padLeft(2, '0'));
    }
  }
  return OperatorBarcodeData(sb.toString(), false);
}

/// 把任意文字画成 Code128 一维码（黑条白底）。所有条码卡都用它。
Widget buildBarcodeBars(String text, double width, double height) {
  final data = buildOperatorBarcode(text);
  final bc = Barcode.code128(escapes: data.escapes);
  final elements = bc
      .make(data.payload, width: width, height: height)
      .toList(growable: false);
  return CustomPaint(
    size: Size(width, height),
    painter: _BarsPainter(elements, Colors.black),
  );
}

/// 点条码放大：条码很长时横着放每个模块不到一个像素、扫不出来，
/// 所以默认竖排（转 90 度）用满屏幕高度，模块宽 3 个像素左右就好扫了。
/// 放大之后**再点一下条码就收起**（不用去找关闭按钮）。
Future<void> showBarcodeLargeDialog(
  BuildContext context, {
  required String title,
  required String text,
}) async {
  if (text.trim().isEmpty) return;
  var vertical = true;
  await showDialog<void>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setDlg) {
        final media = MediaQuery.of(ctx);
        final barLength =
            (media.size.height - 320).clamp(300.0, 860.0).toDouble();
        final barWidth =
            (media.size.width - 92).clamp(200.0, 900.0).toDouble();
        return Dialog(
          insetPadding: const EdgeInsets.all(12),
          // 点弹窗里任意位置都能收起（里面的按钮自己处理点击，不受影响）
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => Navigator.pop(ctx),
            child: Padding(
            padding: const EdgeInsets.fromLTRB(10, 10, 10, 4),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(title,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              fontSize: 15, fontWeight: FontWeight.w600)),
                    ),
                    TextButton(
                      onPressed: () => setDlg(() => vertical = !vertical),
                      child: Text(vertical ? '改成横排' : '改成竖排',
                          style: const TextStyle(fontSize: 13)),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                // 点条码本身 = 收起
                GestureDetector(
                  onTap: () => Navigator.pop(ctx),
                  child: Container(
                    color: Colors.white,
                    padding: const EdgeInsets.all(8),
                    child: vertical
                        ? SizedBox(
                            width: 120,
                            height: barLength,
                            child: RotatedBox(
                              quarterTurns: 1,
                              child: buildBarcodeBars(text, barLength, 112),
                            ),
                          )
                        : buildBarcodeBars(text, barWidth, 112),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  vertical
                      ? '点条码可收起；竖排时把扫码枪转 90° 顺着竖条扫（影像枪直接扫）'
                      : '点条码可收起；横排只适合能读任意方向的影像枪',
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
          ),
        );
      },
    ),
  );
}

/// 一张自定义条码卡：标题 + 条码内容，都能手改，存在本地。
class BarcodeCardItem {
  BarcodeCardItem({required this.title, required this.content});

  String title;
  String content;

  Map<String, dynamic> toJson() => <String, dynamic>{
        'title': title,
        'content': content,
      };

  static BarcodeCardItem fromJson(dynamic raw) {
    final map = (raw is Map) ? raw : const <String, dynamic>{};
    return BarcodeCardItem(
      title: (map['title'] ?? '').toString(),
      content: (map['content'] ?? '').toString(),
    );
  }
}

/// 配置页最上面的「条码卡」区（做成切换卡的样子）：
///
///  * 默认显示第一张：操作员条码（内容固定 = ^| + 操作员姓名，**不可编辑**）
///  * 左右滑动或点底部的圆点/箭头切换；点「＋加一张」能加自定义卡
///  * 自定义卡的名称和条码内容都能改，存在本地
///  * 点条码放大，放大后再点一下条码就收起
class BarcodeCardsPanel extends StatefulWidget {
  const BarcodeCardsPanel({super.key, this.isVisible = true});

  /// 配置页是否正显示在屏幕上：从别的页切回来时，自动跳回第一张（操作员条码）
  final bool isVisible;

  @override
  State<BarcodeCardsPanel> createState() => _BarcodeCardsPanelState();
}

class _BarcodeCardsPanelState extends State<BarcodeCardsPanel> {
  static const String _prefsKey = 'barcode_cards_v1';
  static const int _maxCards = 12;

  /// 条码区高度（压低过了，不占地方）
  static const double _barAreaHeight = 62;

  final List<BarcodeCardItem> _cards = <BarcodeCardItem>[];
  final PageController _pageController = PageController();

  SharedPreferences? _prefs;
  String _operator = '';
  int _index = 0;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(BarcodeCardsPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    // 从别的页切回配置页 → 自动回到第一张（操作员条码）
    if (!oldWidget.isVisible && widget.isVisible) {
      if (_index != 0) setState(() => _index = 0);
      if (_pageController.hasClients) _pageController.jumpToPage(0);
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    String op = '';
    try {
      final prefs = await SharedPreferences.getInstance();
      _prefs = prefs;
      op = AuthService(prefs).operatorName.trim();
      final raw = prefs.getString(_prefsKey);
      if (raw != null && raw.isNotEmpty) {
        final decoded = jsonDecode(raw);
        if (decoded is List) {
          for (final item in decoded) {
            _cards.add(BarcodeCardItem.fromJson(item));
          }
        }
      }
    } catch (_) {}
    if (!mounted) return;
    setState(() {
      _operator = op;
      _loaded = true;
    });
  }

  Future<void> _save() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _prefsKey,
        jsonEncode(_cards.map((e) => e.toJson()).toList()),
      );
    } catch (_) {}
  }

  int get _pageCount => 1 + _cards.length;

  void _go(int i) {
    if (i < 0 || i >= _pageCount) return;
    _pageController.animateToPage(
      i,
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOut,
    );
  }

  String get _currentTitle {
    if (_index == 0) return '操作员条码';
    final t = _cards[_index - 1].title.trim();
    return t.isEmpty ? '条码卡$_index' : t;
  }

  Future<void> _addCard() async {
    if (_cards.length >= _maxCards) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('最多 $_maxCards 张条码卡')),
      );
      return;
    }
    final item = BarcodeCardItem(title: '条码卡${_cards.length + 1}', content: '');
    final ok = await _editCard(item, isNew: true);
    if (ok != true) return;
    setState(() {
      _cards.add(item);
      _index = _cards.length;
    });
    await _save();
    if (!mounted) return;
    _pageController.jumpToPage(_index);
  }

  /// 编辑一张卡；返回 true=点确定，false/null=取消
  Future<bool?> _editCard(BarcodeCardItem item, {bool isNew = false}) async {
    final titleCtrl = TextEditingController(text: item.title);
    final contentCtrl = TextEditingController(text: item.content);
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isNew ? '新建条码卡' : '编辑条码卡'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(
                  labelText: '卡片名称',
                  hintText: '例如：打印机、货架',
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: contentCtrl,
                minLines: 1,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: '条码内容',
                  hintText: '扫出来就是这段文字',
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              item.title = titleCtrl.text.trim();
              item.content = contentCtrl.text.trim();
              if (item.title.isEmpty) item.title = '条码卡';
              Navigator.pop(ctx, true);
            },
            child: const Text('确定'),
          ),
        ],
      ),
    );
    titleCtrl.dispose();
    contentCtrl.dispose();
    return result;
  }

  Future<void> _editAndSave(BarcodeCardItem item) async {
    final ok = await _editCard(item);
    if (ok != true) return;
    if (!mounted) return;
    setState(() {});
    await _save();
  }

  Future<void> _deleteCard(int customIndex) async {
    final item = _cards[customIndex];
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('删除条码卡'),
        content: Text('确定删除「${item.title}」？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('删除',
                style: TextStyle(color: AppConstants.errorColor)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    setState(() {
      _cards.removeAt(customIndex);
      if (_index > _cards.length) _index = _cards.length;
    });
    await _save();
    if (!mounted) return;
    _pageController.jumpToPage(_index);
  }

  Widget _barBox(String text, String title) {
    return GestureDetector(
      onTap: () => showBarcodeLargeDialog(context, title: title, text: text),
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppConstants.dividerColor),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
        child: LayoutBuilder(
          builder: (c, cons) =>
              buildBarcodeBars(text, cons.maxWidth, cons.maxHeight),
        ),
      ),
    );
  }

  Widget _emptyBox(String hint, {VoidCallback? onTap}) {
    final box = Container(
      width: double.infinity,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppConstants.dividerColor),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Text(
        hint,
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 12, color: AppConstants.textSecondary),
      ),
    );
    if (onTap == null) return box;
    return GestureDetector(onTap: onTap, child: box);
  }

  Widget _pageAt(int i) {
    if (i == 0) {
      if (_operator.isEmpty) {
        return _emptyBox('还没设置操作员姓名，条码暂时不显示。');
      }
      return _barBox(kOperatorBarcodePrefix + _operator, '操作员条码');
    }
    final item = _cards[i - 1];
    final title = item.title.trim().isEmpty ? '条码卡$i' : item.title.trim();
    if (item.content.trim().isEmpty) {
      return _emptyBox('还没填条码内容，点这里编辑',
          onTap: () => _editAndSave(item));
    }
    return _barBox(item.content, title);
  }

  /// 标题行固定 28 高（操作员卡右边是提示文字、自定义卡右边是两个小图标）——
  /// 高度不固定的话，左右滑动时卡片会忽高忽低。
  Widget _buildHeader() {
    final bool isOperator = _index == 0;
    return SizedBox(
      height: 28,
      child: Row(
        children: [
          const Icon(Icons.qr_code_2,
              size: 16, color: AppConstants.primaryColor),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              _currentTitle,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppConstants.primaryColor,
              ),
            ),
          ),
          if (isOperator)
            const Text('点条码放大',
                style: TextStyle(
                    fontSize: 11, color: AppConstants.textSecondary))
          else ...[
            _smallIconButton(Icons.edit, AppConstants.primaryColor, '编辑条码内容',
                () => _editAndSave(_cards[_index - 1])),
            const SizedBox(width: 2),
            _smallIconButton(Icons.delete_outline, AppConstants.errorColor,
                '删除这张卡', () => _deleteCard(_index - 1)),
          ],
        ],
      ),
    );
  }

  /// 固定尺寸的小图标按钮：不要用 IconButton（最小 30x30），会把标题行撑高
  Widget _smallIconButton(
      IconData icon, Color color, String tip, VoidCallback onTap) {
    return Tooltip(
      message: tip,
      child: InkResponse(
        onTap: onTap,
        radius: 14,
        child: SizedBox(
          width: 26,
          height: 26,
          child: Icon(icon, size: 17, color: color),
        ),
      ),
    );
  }

  Widget _navButton(IconData icon, VoidCallback? onTap) {
    return InkResponse(
      onTap: onTap,
      radius: 16,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 2),
        child: Icon(
          icon,
          size: 20,
          color: onTap == null
              ? AppConstants.dividerColor
              : AppConstants.primaryColor,
        ),
      ),
    );
  }

  Widget _buildIndicator() {
    final int n = _pageCount;
    if (n <= 8) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          for (int i = 0; i < n; i++)
            GestureDetector(
              onTap: () => _go(i),
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: i == _index ? 15 : 7,
                height: 7,
                decoration: BoxDecoration(
                  color: i == _index
                      ? AppConstants.primaryColor
                      : AppConstants.dividerColor,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
        ],
      );
    }
    return Center(
      child: Text(
        '${_index + 1} / $n',
        style:
            const TextStyle(fontSize: 12, color: AppConstants.textSecondary),
      ),
    );
  }

  /// 底部切换条：左右箭头 + 圆点 + 加一张
  Widget _buildFooter() {
    return SizedBox(
      height: 30,
      child: Row(
        children: [
          _navButton(Icons.chevron_left, _index > 0 ? () => _go(_index - 1) : null),
          Expanded(child: _buildIndicator()),
          _navButton(Icons.chevron_right,
              _index < _pageCount - 1 ? () => _go(_index + 1) : null),
          const SizedBox(width: 8),
          InkWell(
            onTap: _addCard,
            borderRadius: BorderRadius.circular(14),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppConstants.dividerColor),
                color: Colors.white,
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.add, size: 14, color: AppConstants.primaryColor),
                  SizedBox(width: 2),
                  Text('加一张',
                      style: TextStyle(
                          fontSize: 12, color: AppConstants.primaryColor)),
                ],
              ),
            ),
          ),
        ],
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
    if (!_loaded) {
      return Card(
        margin: EdgeInsets.zero,
        elevation: 0,
        color: AppConstants.bgColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.radiusSm),
        ),
        child: const Padding(
          padding: EdgeInsets.symmetric(vertical: 18),
          child: Center(
            child: Text('读取中…',
                style: TextStyle(
                    fontSize: 12, color: AppConstants.textSecondary)),
          ),
        ),
      );
    }
    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      color: AppConstants.bgColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppConstants.radiusSm),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(8, 8, 8, 6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(),
            SizedBox(
              height: _barAreaHeight,
              child: PageView.builder(
                controller: _pageController,
                itemCount: _pageCount,
                onPageChanged: (int i) => setState(() => _index = i),
                itemBuilder: (c, i) => _pageAt(i),
              ),
            ),
            _buildFooter(),
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
