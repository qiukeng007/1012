import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;
import '../utils/image_quality.dart';

/// 裁剪 — 拖动选框，等比映射
class CropPage extends StatefulWidget {
  final String imagePath;
  const CropPage({super.key, required this.imagePath});
  @override
  State<CropPage> createState() => _CropPageState();
}

class _CropPageState extends State<CropPage> {
  bool _busy = false;
  double _cropW = 0, _cropX = -1, _cropY = -1;
  double _scale = 1.0;
  double _baseScale = 1.0;
  img.Image? _src;
  Rect _imgRect = Rect.zero;
  bool _loaded = false;
  String? _failReason;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    img.Image? decoded;
    List<int> bytes = const [];
    String? failReason;
    try {
      bytes = await File(widget.imagePath).readAsBytes();
    } catch (e) {
      failReason = '读不到这张照片的文件：$e';
    }
    if (failReason == null) {
      try {
        decoded = img.decodeImage(bytes);
      } catch (e) {
        decoded = null;
        failReason = '解码时出错：$e';
      }
      if (decoded == null && failReason == null) {
        failReason = ImageQuality.unreadableReason(bytes, label: '这张照片');
      }
    }
    _src = decoded;
    _failReason = failReason;
    if (mounted) setState(() => _loaded = true);
  }

  /// 照片在本机解不开时的提示：文字可一键复制，并且不会卡死在裁剪页。
  Future<void> _showUnreadable() async {
    final detail =
        '${_failReason ?? '这张照片在本机解不开。'}\n\n文件：${widget.imagePath}';
    final back = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('这张照片打不开', style: TextStyle(fontSize: 16)),
        content: SingleChildScrollView(
          child: SelectableText(detail, style: const TextStyle(fontSize: 13)),
        ),
        actions: [
          TextButton(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: detail));
              if (ctx.mounted) Navigator.pop(ctx, true);
            },
            child: const Text('复制'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('返回重选'),
          ),
        ],
      ),
    );
    if (back == true && mounted) Navigator.pop(context);
  }

  double get _topPad => MediaQuery.of(context).padding.top + kToolbarHeight;

  Rect _computeImgRect(double bw, double bh) {
    if (_src == null) return Rect.zero;
    final a = _src!.width / _src!.height;
    final va = bw / bh.clamp(1, double.infinity);
    double iw, ih;
    if (a > va) { iw = bw; ih = iw / a; }
    else { ih = bh; iw = ih * a; }
    return Rect.fromLTWH((bw - iw) / 2, (bh - ih) / 2, iw, ih);
  }

  Future<void> _done() async {
    if (_busy || _src == null) return;
    setState(() => _busy = true);
    try {
      final bw = MediaQuery.of(context).size.width;
      final bh = MediaQuery.of(context).size.height - _topPad;
      final ir = _computeImgRect(bw, bh);
      // 缩放后图片显示区域
      final scaledW = ir.width * _scale;
      final scaledH = ir.height * _scale;
      final scaledLeft = ir.left - (scaledW - ir.width) / 2;
      final scaledTop = ir.top - (scaledH - ir.height) / 2;
      final sx = ((_cropX - scaledLeft) / scaledW * _src!.width).round().clamp(0, _src!.width - 1);
      final sy = ((_cropY - scaledTop) / scaledH * _src!.height).round().clamp(0, _src!.height - 1);
      final sw = (_cropW / scaledW * _src!.width).round().clamp(1, _src!.width - sx);
      final sh = (_cropW / scaledH * _src!.height).round().clamp(1, _src!.height - sy);

      final cropped = img.copyCrop(_src!, sx, sy, sw, sh);
      final resized = img.copyResize(cropped, width: 800, height: 800);
      final jpg = img.encodeJpg(resized, quality: 85);
      // 空白照片就地拦下：这种图提交上去，会把银豹里原本正常的商品照片覆盖成空白。
      // 注意：这里直接判断内存里的图，不再解码刚编码出来的 JPEG
      // （个别机型上重新解码自己的 JPEG 会失败，导致误报「无法解析」）。
      final blank = ImageQuality.blankImageReason(resized,
          label: '裁剪后的照片', byteSize: jpg.length);
      if (blank != null) {
        final useAnyway = mounted ? await _showBlankDialog(blank) : false;
        if (!useAnyway) {
          if (mounted) setState(() => _busy = false);
          return;
        }
      }
      final out = File('${Directory.systemTemp.path}/crop_${DateTime.now().millisecondsSinceEpoch}.jpg');
      await out.writeAsBytes(jpg);
      if (mounted) Navigator.pop(context, out.path);
    } catch (e, st) {
      // 裁剪本来就没成功过：以前这里会悄悄拿「没裁剪的原图」去提交，
      // 现在改成把原因原样摆出来（可复制），不做静默替换。
      if (!mounted) return;
      setState(() => _busy = false);
      await _showCropFailed(e, st);
    }
  }

  /// 裁剪出错：原因可一键复制，留在裁剪页让用户重选或返回。
  Future<void> _showCropFailed(Object e, StackTrace st) async {
    final detail = '裁剪这张照片时出错，没有生成新照片（也没有提交任何东西）。\n\n'
        '照片：${widget.imagePath}\n'
        '裁剪框：x=${_cropX.toStringAsFixed(0)} y=${_cropY.toStringAsFixed(0)} '
        '边长=${_cropW.toStringAsFixed(0)} 缩放=${_scale.toStringAsFixed(2)}\n'
        '原图尺寸：${_src == null ? '未加载' : '${_src!.width}x${_src!.height}'}\n'
        '错误：$e\n'
        '位置：${st.toString().split('\n').take(3).join(' | ')}\n\n'
        '可以先返回，重新拍一张或换一张相册里的图片再试。';
    final back = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('裁剪失败', style: TextStyle(fontSize: 16)),
        content: SingleChildScrollView(
          child: SelectableText(detail, style: const TextStyle(fontSize: 13)),
        ),
        actions: [
          TextButton(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: detail));
              if (ctx.mounted) Navigator.pop(ctx, false);
            },
            child: const Text('复制'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('返回重选'),
          ),
        ],
      ),
    );
    if (back == true && mounted) Navigator.pop(context);
  }

  /// 空白照片提示：取证文字可一键复制。
  /// 返回 true = 用户选择「仍然使用这张图」，false = 回裁剪页重拍/重选（默认不提交）。
  Future<bool> _showBlankDialog(String detail) async {
    final use = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('这张照片是空白的', style: TextStyle(fontSize: 16)),
        content: SingleChildScrollView(
          child: SelectableText(detail, style: const TextStyle(fontSize: 13)),
        ),
        actions: [
          TextButton(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: detail));
              if (ctx.mounted) Navigator.pop(ctx, false);
            },
            child: const Text('复制'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('返回重拍'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('仍然使用'),
          ),
        ],
      ),
    );
    return use == true;
  }

  @override
  Widget build(BuildContext context) {
    final sw = MediaQuery.of(context).size.width;
    final bh = MediaQuery.of(context).size.height - _topPad;
    if (_cropW == 0) _cropW = sw - 80;
    _imgRect = _computeImgRect(sw, bh);
    if (_cropX < 0) { _cropX = (sw - _cropW) / 2; _cropY = (bh - _cropW) / 2; }

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black, foregroundColor: Colors.white,
        title: const Text('裁剪 (拖动选框)'),
        actions: [
          TextButton(
            onPressed: (_busy || !_loaded) ? null : _done,
            child: Text(_busy ? '…' : '确认 ✓',
                style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: !_loaded
          ? const Center(child: CircularProgressIndicator(color: Colors.white))
          : (_src == null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.broken_image_outlined,
                          color: Colors.white70, size: 56),
                      const SizedBox(height: 12),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 24),
                        child: Text('这张照片在本机打不开，不能裁剪',
                            style: TextStyle(color: Colors.white, fontSize: 15)),
                      ),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: _showUnreadable,
                        child: const Text('查看原因 / 复制'),
                      ),
                    ],
                  ),
                )
              : LayoutBuilder(builder: (_, c) {
              return GestureDetector(
                onScaleStart: (_) => _baseScale = _scale,
                onScaleUpdate: (d) {
                  setState(() {
                    if (d.pointerCount >= 2) {
                      _scale = (_baseScale * d.scale).clamp(0.5, 4.0);
                    } else {
                      _cropX = (_cropX + d.focalPointDelta.dx).clamp(0.0, c.maxWidth - _cropW);
                      _cropY = (_cropY + d.focalPointDelta.dy).clamp(0.0, c.maxHeight - _cropW);
                    }
                  });
                },
                child: Stack(
                  children: [
                    Transform.scale(
                      scale: _scale,
                      alignment: Alignment.center,
                      child: Image.file(File(widget.imagePath), fit: BoxFit.contain,
                          width: c.maxWidth, height: c.maxHeight),
                    ),
                    CustomPaint(
                      size: Size(c.maxWidth, c.maxHeight),
                      painter: _Mask(Rect.fromLTWH(_cropX, _cropY, _cropW, _cropW)),
                    ),
                    if (_busy) const Center(child: CircularProgressIndicator(color: Colors.white)),
                  ],
                ),
              );
            })),
    );
  }
}

class _Mask extends CustomPainter {
  final Rect crop;
  _Mask(this.crop);
  @override
  void paint(Canvas canvas, Size size) {
    final r = Rect.fromLTWH(0, 0, size.width, size.height);
    canvas.drawPath(Path.combine(PathOperation.difference, Path()..addRect(r), Path()..addRect(crop)), Paint()..color = Colors.black54);
    canvas.drawRect(crop, Paint()..color = Colors.white..style = PaintingStyle.stroke..strokeWidth = 2.0);
  }
  @override
  bool shouldRepaint(_Mask old) => old.crop != crop;
}
