import 'dart:math' as math;
import 'dart:typed_data';
import 'package:image/image.dart' as img;

/// 照片质量自检：识别「空白照片」（整张几乎纯色 / 无法解析 / 尺寸过小）。
/// 补货提交、上传商品图、同步照片前都先自检，
/// 避免把空白图写进银豹，把商品原本正常的照片覆盖成空白。
class ImageQuality {
  ImageQuality._();

  /// 判定「空白」的亮度标准差上限（0~255）。低于这个值说明整张图几乎没有内容
  static const double blankStdLimit = 4.0;

  /// 返回 null 表示照片正常；否则返回可复制的中文原因（含取证数据）
  /// 「本机解不开这张图」的可复制原因（含取证：文件大小 + 前 8 字节 HEX）。
  /// 裁剪页也用它：万一真机上解码失败，能给出一份能复制的线索。
  static String unreadableReason(List<int> bytes, {String label = '照片'}) {
    if (bytes.isEmpty) {
      return '$label 内容为空（0 字节），没有可提交的图片数据。';
    }
    final sizeKb = (bytes.length / 1024).toStringAsFixed(1);
    return '$label 无法解析（文件 $sizeKb KB，前 8 字节 HEX: ${headHex(bytes)}）：'
        '文件可能损坏、不完整，本机不支持的格式（如 WebP/AVIF/HEIC），'
        '或者拿到的其实是网页/错误页。\n'
        '请重新拍照或换一张图片后再试。';
  }

  /// strict = true（默认）：读不出来就当作不可用（服务器回读校验、网页/错误页拦截用）。
  /// strict = false：用于「我们自己刚写出来的照片」——个别机型上重新解码自己的
  /// JPEG 会失败，不能因为这个就把用户的正常照片拦下。文件头是标准图片格式就放行，
  /// 网页/错误页（HTML 之类）依然会被拦。
  static String? blankReason(
    List<int> bytes, {
    String label = '照片',
    bool strict = true,
  }) {
    if (bytes.isEmpty) return unreadableReason(bytes, label: label);
    img.Image? im;
    try {
      im = img.decodeImage(Uint8List.fromList(bytes));
    } catch (_) {
      im = null;
    }
    if (im == null) {
      if (!strict && looksLikeImage(bytes)) return null;
      return unreadableReason(bytes, label: label);
    }
    return blankImageReason(im, label: label, byteSize: bytes.length);
  }

  /// 文件头是不是常见图片格式（JPEG/PNG/GIF/WebP）。
  /// 用来区分「真的是一张图，只是本机解不开」和「拿到的是网页/错误页」。
  static bool looksLikeImage(List<int> b) {
    if (b.length < 12) return false;
    if (b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return true;
    if (b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47) return true;
    if (b[0] == 0x47 && b[1] == 0x49 && b[2] == 0x46) return true;
    if (b[0] == 0x52 &&
        b[1] == 0x49 &&
        b[2] == 0x46 &&
        b[3] == 0x46 &&
        b[8] == 0x57 &&
        b[9] == 0x45 &&
        b[10] == 0x42 &&
        b[11] == 0x50) {
      return true;
    }
    return false;
  }

  /// 直接对「已经解码好的图片」做空白判断。
  /// 裁剪页用这个版本：刚编码出来的 JPEG 没必要再解码一次
  /// （个别机型上重新解码自己的 JPEG 会失败，导致误报「无法解析」）。
  static String? blankImageReason(
    img.Image im, {
    String label = '照片',
    int? byteSize,
  }) {
    final w = im.width;
    final h = im.height;
    final sizeText =
        byteSize == null ? '' : '，文件 ${(byteSize / 1024).toStringAsFixed(1)} KB';
    if (w < 50 || h < 50) {
      return '$label 尺寸过小（${w}x$h$sizeText），不能作为商品图。\n'
          '请重新拍照或换一张图片后再试。';
    }
    // 抽样统计亮度：整张图是同一个颜色就是空白照片
    final step = math.max(1, math.sqrt((w * h) / 12000).ceil());
    var n = 0;
    double sum = 0;
    double sumSq = 0;
    double rSum = 0;
    double gSum = 0;
    double bSum = 0;
    for (var y = 0; y < h; y += step) {
      for (var x = 0; x < w; x += step) {
        final px = im.getPixel(x, y);
        final r = img.getRed(px).toDouble();
        final g = img.getGreen(px).toDouble();
        final b = img.getBlue(px).toDouble();
        rSum += r;
        gSum += g;
        bSum += b;
        final lum = 0.299 * r + 0.587 * g + 0.114 * b;
        sum += lum;
        sumSq += lum * lum;
        n++;
      }
    }
    if (n == 0) return null;
    final mean = sum / n;
    final variance = (sumSq / n) - mean * mean;
    final std = variance <= 0 ? 0.0 : math.sqrt(variance);
    final avg = '#${_hex(rSum / n)}${_hex(gSum / n)}${_hex(bSum / n)}';
    if (std < blankStdLimit) {
      return '$label 是空白照片：整张图几乎纯色。\n'
          '取证：平均色 $avg，亮度标准差 ${std.toStringAsFixed(2)}，'
          '尺寸 ${w}x$h$sizeText。\n'
          '常见原因：拍照时镜头被挡住/没对好，相册里选到了空图，'
          '或者裁剪框只框到了纯色区域。\n'
          '会把银豹里的商品照片覆盖成空白，请重新拍照或换一张图片。';
    }
    return null;
  }
  /// 上传前的统一处理：把图片转成「标准 JPEG」，和拍照裁剪出来的图一致。
  /// 银豹 CDN 上的原图常常是几 MB 的大图（也可能不是标准 JPEG），
  /// 直接丢给补货服务器容易被截断/存成空白，所以先压成小图再提交。
  /// 已经够小、够标准的图原样返回，不重复压缩（少损失画质）。
  /// 返回 (bytes, error)：error 非空表示这张图根本解析不了。
  static (Uint8List?, String?) normalizeForUpload(
    List<int> bytes, {
    int maxSide = 1200,
    int quality = 85,
    int skipBelowBytes = 400 * 1024,
  }) {
    if (bytes.isEmpty) return (null, '图片内容为空（0 字节）');
    img.Image? im;
    try {
      im = img.decodeImage(Uint8List.fromList(bytes));
    } catch (_) {
      im = null;
    }
    if (im == null) {
      // 文件头是标准图片格式，只是本机解不开（个别机型会这样）：
      // 原样提交，不因为「我们解不开」就丢掉这张照片。
      if (looksLikeImage(bytes)) return (Uint8List.fromList(bytes), null);
      return (
        null,
        '无法解析成图片（文件 ${(bytes.length / 1024).toStringAsFixed(1)} KB，'
            '前 8 字节 HEX: ${headHex(bytes)}）。'
            '通常是拿到的是网页/错误页，或者不是标准 JPEG/PNG（如 WebP/AVIF/HEIC）。'
      );
    }
    final long = math.max(im.width, im.height);
    if (bytes.length <= skipBelowBytes && long <= maxSide) {
      return (Uint8List.fromList(bytes), null);
    }
    var out = im;
    if (long > maxSide) {
      out = im.width >= im.height
          ? img.copyResize(im, width: maxSide)
          : img.copyResize(im, height: maxSide);
    }
    return (Uint8List.fromList(img.encodeJpg(out, quality: quality)), null);
  }

  /// 图片概要（取证用），例：'JPEG 1200x1200 185.3KB'
  static String describe(List<int> bytes) {
    final kb = (bytes.length / 1024).toStringAsFixed(1);
    img.Image? im;
    try {
      im = img.decodeImage(Uint8List.fromList(bytes));
    } catch (_) {
      im = null;
    }
    if (im == null) {
      return '无法解析的图片 $kb KB（前 8 字节 HEX: ${headHex(bytes)}）';
    }
    final isJpg = bytes.length > 2 && bytes[0] == 0xFF && bytes[1] == 0xD8;
    final isPng = bytes.length > 8 && bytes[0] == 0x89 && bytes[1] == 0x50;
    final fmt = isJpg ? 'JPEG' : (isPng ? 'PNG' : '非标准格式');
    return '$fmt ${im.width}x${im.height} $kb KB';
  }

  /// 前 8 字节的 HEX，用于确认拿到的到底是不是图片
  static String headHex(List<int> bytes) {
    final n = bytes.length < 8 ? bytes.length : 8;
    return bytes
        .take(n)
        .map((v) => v.toRadixString(16).padLeft(2, '0').toUpperCase())
        .join(' ');
  }

  static String _hex(double v) {
    final n = v.round().clamp(0, 255);
    return n.toRadixString(16).padLeft(2, '0').toUpperCase();
  }
}
