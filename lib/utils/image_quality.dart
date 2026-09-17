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
    final im = tryDecode(bytes);
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

  /// 解码图片：先按原样解；解不开、但确实是一张 JPEG 时，去掉附加段再解一次。
  /// 返回 null 表示本机真的解不开（网页/错误页、不支持的格式等）。
  ///
  /// 为什么要多试一次：银豹 CDN 上有些图的 EXIF 段本身不标准
  /// （实测一张 800x800 的商品图，「图像描述」这一项的长度写成了 0），
  /// 解码库读到这里会直接抛错、放弃整张图——但像素数据是完好的。
  static img.Image? tryDecode(List<int> bytes) {
    if (bytes.isEmpty) return null;
    try {
      final im = img.decodeImage(Uint8List.fromList(bytes));
      if (im != null) return im;
    } catch (_) {}
    final stripped = stripJpegExtraSegments(bytes);
    if (stripped == null) return null;
    try {
      return img.decodeImage(stripped);
    } catch (_) {
      return null;
    }
  }

  /// 去掉 JPEG 里跟像素无关的附加段（EXIF/JFIF/注释等 APPn、COM），
  /// 只留下尺寸表、编码表、扫面数据。不是规范的 JPEG（例如拿到的是网页）
  /// 返回 null。
  static Uint8List? stripJpegExtraSegments(List<int> bytes) {
    if (bytes.length < 4) return null;
    if (bytes[0] != 0xFF || bytes[1] != 0xD8) return null;
    final out = <int>[0xFF, 0xD8];
    var i = 2;
    while (i + 1 < bytes.length) {
      if (bytes[i] != 0xFF) return null;
      final marker = bytes[i + 1];
      // 没有长度字段的标记：原样照抄
      if (marker == 0x01 || (marker >= 0xD0 && marker <= 0xD9)) {
        out.addAll(bytes.sublist(i, i + 2));
        i += 2;
        continue;
      }
      // 扫面数据开始：后面全是要保留的压缩数据
      if (marker == 0xDA) {
        out.addAll(bytes.sublist(i));
        return Uint8List.fromList(out);
      }
      if (i + 3 >= bytes.length) return null;
      final len = (bytes[i + 2] << 8) | bytes[i + 3];
      if (len < 2 || i + 2 + len > bytes.length) return null;
      final isApp = marker >= 0xE0 && marker <= 0xEF;
      if (!isApp && marker != 0xFE) {
        out.addAll(bytes.sublist(i, i + 2 + len));
      }
      i += 2 + len;
    }
    return null;
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
    // 先按原样解一次：能解开就说明这张图的附加段没问题（不用重编码）
    var decodedAsIs = true;
    img.Image? im;
    try {
      im = img.decodeImage(Uint8List.fromList(bytes));
    } catch (_) {
      im = null;
    }
    if (im == null) {
      decodedAsIs = false;
      im = tryDecode(bytes);
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
    // 「不用重编码」只适用于原样就解开、且已经够小够标准的图；
    // 靠去掉附加段才解开的（不标准 EXIF），一律重新编码成干净 JPEG 再提交。
    if (decodedAsIs &&
        bytes.length <= skipBelowBytes &&
        long <= maxSide &&
        !hasJpegExtraSegments(bytes)) {
      return (Uint8List.fromList(bytes), null);
    }
    var out = im;
    if (long > maxSide) {
      out = im.width >= im.height
          ? img.copyResize(im, width: maxSide)
          : img.copyResize(im, height: maxSide);
    } else {
      // 不缩小也要把 EXIF 旋转方向烘进像素，
      // 否则重新编码后照片会横过来
      out = img.bakeOrientation(im);
    }
    return (Uint8List.fromList(img.encodeJpg(out, quality: quality)), null);
  }

  /// 判断 JPEG 里是否带着跟像素无关的附加段（EXIF、APPn、注释等）。
  ///
  /// 为什么要查这个：银豹 CDN 上的商品图经常带不标准的 EXIF 段
  /// （实测有一张 800x800 的商品图，「图像描述」长度写成 0），
  /// 直接丢给补货服务器（易语言网页服务）时容易让服务端解图出错。
  static bool hasJpegExtraSegments(List<int> bytes) {
    if (bytes.length < 4 || bytes[0] != 0xFF || bytes[1] != 0xD8) {
      // 不是 JPEG（比如 PNG）：上传时也应该统一转成 JPEG
      return true;
    }
    var i = 2;
    while (i + 3 < bytes.length) {
      if (bytes[i] != 0xFF) return true;
      final marker = bytes[i + 1];
      if (marker == 0x01 || (marker >= 0xD0 && marker <= 0xD9)) {
        i += 2;
        continue;
      }
      if (marker == 0xDA) return false; // 到了扫描数据，前面都看完了
      final len = (bytes[i + 2] << 8) | bytes[i + 3];
      if (len < 2) return true;
      if (marker == 0xFE) return true; // 注释段
      if (marker >= 0xE0 && marker <= 0xEF) {
        // APP0 里只有干净的 JFIF 头算正常
        final isJfif = marker == 0xE0 &&
            len >= 7 &&
            i + 8 < bytes.length &&
            bytes[i + 4] == 0x4A && // J
            bytes[i + 5] == 0x46 && // F
            bytes[i + 6] == 0x49 && // I
            bytes[i + 7] == 0x46;   // F
        if (!isJfif) return true;
      }
      i += 2 + len;
    }
    return false;
  }

  /// 图片概要（取证用），例：'JPEG 1200x1200 185.3KB'
  static String describe(List<int> bytes) {
    final kb = (bytes.length / 1024).toStringAsFixed(1);
    final im = tryDecode(bytes);
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
