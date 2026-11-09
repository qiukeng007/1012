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

  /// true = 这份预填是给「顾客预订」的；false = 日常补货
  final bool booking;

  /// 查询时各门店的库存（门店名 → 库存文本），按门店顺序。
  /// 提交补货时写成「进价 + 各店库存」存到服务器的「库存进价说明」。
  final Map<String, String> storeStocks;

  const RestockPrefillData({
    required this.barcode,
    this.uid,
    this.supplier = '',
    this.productName = '',
    this.specification = '',
    this.buyPrice,
    this.sellPrice,
    this.imageUrl,
    this.booking = false,
    this.imageBytes,
    this.storeStocks = const {},
  });
}
