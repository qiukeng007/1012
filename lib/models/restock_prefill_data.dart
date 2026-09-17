/// Data passed from QueryPage to RestockPage via HomePage
class RestockPrefillData {
  final String barcode;
  final String? uid;
  final String supplier;
  final String productName;
  final String specification;
  final double? buyPrice;
  final double? sellPrice;
  final String? imageUrl;

  /// 队列里还没同步完的新照片（本地字节）。
  /// 查询页刚提交过照片时会带上它：补货直接用这张发，不用等队列先同步。
  final List<int>? imageBytes;

  const RestockPrefillData({
    required this.barcode,
    this.uid,
    this.supplier = '',
    this.productName = '',
    this.specification = '',
    this.buyPrice,
    this.sellPrice,
    this.imageUrl,
    this.imageBytes,
  });
}
