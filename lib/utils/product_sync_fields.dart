/// 银豹「同步商品到门店」可选字段清单（与网页同步弹窗右侧勾选项一致）。
/// 用于 attributesJson：productJson 中字段名用小写 productimages，
/// 而同步字段 key 用驼峰 productImages（网页就是这么传的，服务端会映射）。
library;

class ProductSyncField {
  final String key;
  final String label;
  const ProductSyncField(this.key, this.label);
}

const List<ProductSyncField> kProductSyncFields = <ProductSyncField>[
  ProductSyncField('enable', '是否启用'),
  ProductSyncField('productName', '商品名称'),
  ProductSyncField('pinyin', '拼音码'),
  ProductSyncField('productImages', '商品图片'),
  ProductSyncField('productCategory', '所属分类'),
  ProductSyncField('sellPrice', '销售价'),
  ProductSyncField('buyPrice', '进货价'),
  ProductSyncField('sellPrice2', '批发价'),
  ProductSyncField('customerPrice', '会员价'),
  ProductSyncField('isCustomerDiscount', '会员折扣'),
  ProductSyncField('productBrand', '商品品牌'),
  ProductSyncField('supplier', '供货商'),
  ProductSyncField('productionDate', '生产日期'),
  ProductSyncField('shelfLife', '保质期'),
  ProductSyncField('productUnitExchange', '商品单位'),
  ProductSyncField('attribute6', '商品规格'),
  ProductSyncField('minStock', '库存下限'),
  ProductSyncField('maxStock', '库存上限'),
  ProductSyncField('attribute1', '自定义1'),
  ProductSyncField('attribute2', '自定义2'),
  ProductSyncField('attribute3', '自定义3'),
  ProductSyncField('attribute4', '货号'),
  ProductSyncField('productTag', '商品标签'),
  ProductSyncField('pluCode', '称编码'),
  ProductSyncField('noStock', '不计库存'),
  ProductSyncField('stockPosition', '库位'),
  ProductSyncField('weight', '重量'),
  ProductSyncField('remarks', '商品描述'),
  ProductSyncField('productExtBarcode', '扩展条码'),
];

/// 网页在用户勾选基础上强制追加的内部字段（多规格/组合结构字段，不可取消）
const List<String> kForcedSyncAttributes = <String>[
  'attribute5',
  'attribute7',
];
