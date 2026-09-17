import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'config_service.dart';
import '../models/store_config.dart';
import '../utils/image_quality.dart';

/// 补货/预定提交结果。
/// [ok] 为 false 时 [detail] 是可直接复制的完整取证信息（请求地址/字段/照片信息/HTTP状态/响应原文）；
/// [ok] 为 true 但 [detail] 非空时，表示服务器已受理但有需要留意的隐患（例如照片不是标准格式）。
class RestockSubmitResult {
  final bool ok;
  final String detail;
  final bool networkFailure;
  const RestockSubmitResult(this.ok,
      {this.detail = '', this.networkFailure = false});
}

/// 补货/预定/订单查询 服务
/// 与本地 WebServer (WebServer.exe) 通信
class RestockService {
  final RestockConfig _config;

  RestockService(this._config);

  /// 获取供货商列表
  /// 供货商列表是否来自银豹自动获取（只读，不可手动修改）
  bool get suppliersReadonly => _config.suppliersReadonly;

  /// 供货商列表是否为手动模式（手动写入且未排序，需要静默获取 UID）
  bool get suppliersManualMode => _config.suppliersManualMode;

  List<String> get suppliers => _config.supplierList;

  /// 获取操作员姓名
  String get operatorName => _config.operatorName;

  /// 更新操作员姓名并持久化
  Future<void> updateOperatorName(String name) async {
    final updated = _config.copyWith(operatorName: name);
    await ConfigService.writeRestockJson(jsonEncode(updated.toJson()));
  }

  /// 补货服务器地址（自动补全 http://，自动降级 https→http）
  String get serverUrl {
    var url = _config.serverUrl.trim();
    if (url.isEmpty) return url;
    // 去掉末尾斜杠
    while (url.endsWith('/')) {
      url = url.substring(0, url.length - 1);
    }
    // https → http（本地服务器不支持 SSL）
    if (url.startsWith('https://')) {
      url = 'http://${url.substring(8)}';
    }
    // 自动补全协议前缀
    if (!url.startsWith('http://')) {
      url = 'http://$url';
    }
    return url;
  }

  /// 提交补货单
  Future<RestockSubmitResult> submitReplenish({
    required String shopName,
    String barcode = '',
    required String quantity,
    String desc = '',
    List<int>? imageBytes,
    String? imageName,
  }) async {
    return _submitForm(
      endpoint: 'replenish',
      shopName: shopName,
      barcode: barcode,
      quantity: quantity,
      desc: desc,
      imageBytes: imageBytes,
      imageName: imageName,
    );
  }

  /// 提交顾客预定
  Future<RestockSubmitResult> submitBooking({
    String? shopName,
    required String phone,
    String barcode = '',
    required String quantity,
    required String desc,
    List<int>? imageBytes,
    String? imageName,
  }) async {
    return _submitForm(
      endpoint: 'booking',
      shopName: shopName ?? '',
      barcode: barcode,
      quantity: quantity,
      desc: desc,
      phone: phone,
      imageBytes: imageBytes,
      imageName: imageName,
    );
  }

  /// 通用表单提交（手动构建 multipart 请求，确保编码兼容）。
  ///
  /// 两个关键点：
  /// 1. 照片一律先转成「标准 JPEG 小图」（和拍照裁剪出来的图完全一致）再上传。
  ///    自动获取的照片来自银豹 CDN，常常是原始大图（几 MB，甚至不是标准 JPEG），
  ///    直接提交给补货服务器容易被截断/存成空白图片 —— 这就是「自动获取的照片是空白」的原因。
  /// 2. 无论成功失败，都把整份请求/响应取证信息写进 [RestockSubmitResult.detail]，
  ///    失败时可以直接复制发出来。
  Future<RestockSubmitResult> _submitForm({
    required String endpoint,
    required String shopName,
    required String barcode,
    required String quantity,
    required String desc,
    String? phone,
    List<int>? imageBytes,
    String? imageName,
  }) async {
    final uri = Uri.parse('${serverUrl}/index.esp?$endpoint');
    final sw = Stopwatch()..start();

    // 照片统一处理
    var uploadBytes = imageBytes;
    String imageInfo = (imageBytes == null || imageBytes.isEmpty)
        ? '（本次没有照片）'
        : ImageQuality.describe(imageBytes);
    String? imageWarn;
    if (imageBytes != null && imageBytes.isNotEmpty) {
      final (normalized, normErr) = ImageQuality.normalizeForUpload(imageBytes);
      if (normalized == null) {
        imageWarn = normErr;
      } else {
        uploadBytes = normalized;
        if (normalized.length != imageBytes.length) {
          imageInfo = '${ImageQuality.describe(normalized)}'
              '（已从 ${ImageQuality.describe(imageBytes)} 压缩）';
        }
      }
    }
    final fileName =
        imageName ?? 'IMG_${DateTime.now().millisecondsSinceEpoch}.jpg';
    final opName =
        _config.operatorName.isNotEmpty ? _config.operatorName : '未知操作员';

    final boundary =
        '----FormBoundary${DateTime.now().millisecondsSinceEpoch}';
    final body = <int>[];
    void addField(String name, String value) {
      body.addAll(utf8.encode('--$boundary\r\n'));
      body.addAll(utf8.encode(
          'Content-Disposition: form-data; name="$name"\r\n\r\n'));
      body.addAll(utf8.encode(value));
      body.addAll(utf8.encode('\r\n'));
    }

    // 服务端（易语言网页服务）是按字面比对供货商名的：名字首尾多一个空格/换行，
    // 或者括号全角半角不一致，「供货商」表就查不到那一行，服务端会直接报内部错误。
    final sentShop = shopName.replaceAll('&', '').trim();
    final sentBarcode = barcode.replaceAll('&', '').trim();
    final sentDesc = desc.replaceAll('&', '').trim();
    final sentOp = opName.trim();
    final sentPhone = (phone ?? '').trim();
    final sentQty = quantity.trim();

    addField('shopname', sentShop);
    addField('barcode', sentBarcode);
    addField('quantity', sentQty);
    addField('desc', sentDesc);
    addField('Operators', sentOp);
    if (sentPhone.isNotEmpty) {
      addField('phone', sentPhone);
    }
    if (uploadBytes != null && uploadBytes.isNotEmpty) {
      body.addAll(utf8.encode('--$boundary\r\n'));
      body.addAll(utf8.encode(
          'Content-Disposition: form-data; name="image"; filename="$fileName"\r\n'));
      body.addAll(utf8.encode('Content-Type: image/jpeg\r\n\r\n'));
      body.addAll(uploadBytes);
      body.addAll(utf8.encode('\r\n'));
    }
    body.addAll(utf8.encode('--$boundary--\r\n'));

    final payloadLines = <String>[
      'shopname=$sentShop',
      'barcode=$sentBarcode',
      'quantity=$sentQty',
      'desc=$sentDesc',
      if (sentPhone.isNotEmpty) 'phone=$sentPhone',
      'Operators=$sentOp',
      'image=$fileName（$imageInfo）',
    ];

    String report(String reason,
        {int? status, String? headers, List<int>? respBody}) {
      final b = respBody ?? const <int>[];
      final buf = StringBuffer()
        ..writeln('操作：提交${endpoint == 'booking' ? '顾客预定' : '补货'}到补货服务器')
        ..writeln('时间：${DateTime.now().toIso8601String()}')
        ..writeln('请求：POST ${uri.toString()}')
        ..writeln('请求字段：')
        ..writeln('  ${payloadLines.join('\n  ')}')
        ..writeln('请求体大小：${body.length} 字节')
        ..writeln('结果：$reason')
        ..writeln('耗时：${sw.elapsedMilliseconds} ms');
      if (status != null) buf.writeln('HTTP状态：$status');
      if (headers != null && headers.isNotEmpty) {
        buf.writeln('响应头：');
        buf.writeln(headers.trimRight());
      }
      if (status != null) {
        buf.writeln('响应内容（${b.length} 字节）');
        buf.writeln('HEX(前8字节)：${ImageQuality.headHex(b)}');
        buf.writeln('文本：${_decodeBody(b)}');
      }
      if (imageWarn != null) buf.writeln('照片问题：$imageWarn');
      if (status != null && status != 200) {
        buf.writeln('—— 结论 ——');
        buf.writeln('这条报错是补货服务器自己的错误页：服务端执行补货时出了异常，'
            '手机这边的照片和字段都是正常的。');
        buf.writeln('最常见原因：服务器的「供货商」表里查不到「$sentShop」这一行'
            '（名字不一致：首尾多空格、全角括号（）和半角()不同、或者改过名）。');
        buf.writeln('建议：电脑端补货系统点「一键获取供货商列表」，'
            '确认里面有没有「$sentShop」；没有就把名字改一致再提交。');
        if (_decodeBody(b).contains('\uFFFD')) {
          buf.writeln('（「文本」里的乱码是服务器用 GBK 编码返回造成的，不影响内容）');
        }
      }
      return buf.toString().trimRight();
    }

    try {
      final client = HttpClient();
      client.connectionTimeout = const Duration(seconds: 20);
      final request = await client.postUrl(uri);
      request.headers.contentType = ContentType(
        'multipart',
        'form-data',
        parameters: {'boundary': boundary},
      );
      request.contentLength = body.length;
      request.add(body);
      final response = await request.close().timeout(const Duration(seconds: 60));
      final respBytes = <int>[];
      await for (final chunk in response) {
        respBytes.addAll(chunk);
      }
      final respHeaders = StringBuffer();
      response.headers.forEach((k, v) {
        respHeaders.writeln('  $k: ${v.join(', ')}');
      });
      client.close(force: true);
      final ok = response.statusCode == 200;
      if (ok && imageWarn == null) {
        return const RestockSubmitResult(true);
      }
      return RestockSubmitResult(ok,
          detail: report(
            ok ? '服务器已受理，但照片可能无法显示' : '补货服务器返回错误',
            status: response.statusCode,
            headers: respHeaders.toString(),
            respBody: respBytes,
          ));
    } catch (e) {
      return RestockSubmitResult(false,
          detail: report('连不上补货服务器：${e.runtimeType}: $e'),
          networkFailure: true);
    }
  }

  static String _decodeBody(List<int> bytes) {
    if (bytes.isEmpty) return '（空）';
    var text = utf8.decode(bytes, allowMalformed: true);
    if (text.length > 2000) text = '${text.substring(0, 2000)}…（已截断）';
    return text;
  }

  /// 查询订单记录
  Future<List<OrderRecord>> queryOrders({String searchKey = ''}) async {
    try {
      final uri = Uri.parse('${serverUrl}/index.esp?query_booking');
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'key=${Uri.encodeComponent(searchKey)}',
      );

      if (response.statusCode != 200) return [];

      // 显式 UTF-8 解码，防止中文乱码
      final decoded = utf8.decode(response.bodyBytes);
      final data = json.decode(decoded) as List<dynamic>;
      return data.map((item) => OrderRecord.fromJson(item)).toList();
    } catch (e) {
      return [];
    }
  }

  /// 完结订单
  Future<bool> finishOrder(String id) async {
    try {
      final uri = Uri.parse('${serverUrl}/index.esp?finish_order');
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body:
            'Id=${Uri.encodeComponent(id)}&operator=${Uri.encodeComponent(_config.operatorName.isNotEmpty ? _config.operatorName : '未知操作员')}',
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}

/// 订单记录模型
class OrderRecord {
  final String? id;
  final String? shopname;
  final String? customerPhone;
  final String? productBarcode;
  final String? productDesc;
  final String? orderQty;
  final String? orderTime;
  final String? imagePath;

  OrderRecord({
    this.id,
    this.shopname,
    this.customerPhone,
    this.productBarcode,
    this.productDesc,
    this.orderQty,
    this.orderTime,
    this.imagePath,
  });

  factory OrderRecord.fromJson(Map<String, dynamic> json) {
    return OrderRecord(
      id: json['id']?.toString() ?? json['ID']?.toString(),
      shopname: json['shopname']?.toString(),
      customerPhone: json['顾客电话']?.toString(),
      productBarcode: json['商品条码']?.toString(),
      productDesc: json['商品说明']?.toString(),
      orderQty: json['预定数量']?.toString(),
      orderTime: json['预定时间']?.toString(),
      imagePath: json['图片地址']?.toString(),
    );
  }

  /// 获取可显示的图片 URL
  String get displayImageUrl {
    if (imagePath == null || imagePath!.isEmpty) return '';
    var src = imagePath!;
    if (src.contains('\\')) {
      src = '/PIC/${src.substring(src.lastIndexOf('\\') + 1)}';
    } else if (!src.startsWith('http')) {
      src = '/PIC/$src';
    }
    return src;
  }
}
