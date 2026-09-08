var listTool = pospal.tool.getListTool();
var ddlTool = pospal.tool.getTreeTool();
var userSelector;
var advancedStoreSelector;//高级门店选择
var categorySelector;
var enableSelector;
var supplierSelector;
var brandSelector;
var productTagSelector;
var categorysAddvancedSelector;
var brandAddvancedSelector;
var supplierAddvancedSelector;
var colorAddvancedSelector;
var sizeAddvancedSelector;
var paging;
var storeProductUnits;
var storePrinters;
var restaurantAreas;
var defaultPrintSize;
var labelPrinters;
var taggroupsWithtags;
var tastegroupsWithtastes;
var productBrands;
var imageDomain;
var industryNumber;
var secondIndustryNumber;
var hasPriceAuth;
var hasClothingAttribute;
var hasProductClothingExtAttribute;
var productColorGroups;
var productSizeGroups;
var hasProductAttribute9;
var hasNoStockPrepay;
var hasTimingProduct;
var fromPage;
var groupRadioBox;
var isMeiYe;//判断是否商品分类特殊处理，目前只有美业处理;
var isYiPei;//艺培行业判断是否商品分类和列表特殊处理;
var isPetHospital;//宠物医院行业判断是否商品分类和列表特殊处理;
var isMuYinSecondary;//母婴二级行业需要隐藏是否服务开关和处理分类
var userList;//门店行业对应信息表
var categoryList;//从后台加载回来的分类集合
var userUIConfig;//自定义表头配置项
var urlParms = pospal.getUrlParms();
var storeSupplierOptions;
var productColors = [];//门店颜色集合
var productSizes = [];//门店尺码集合
var fromActionPage;//是否从新商品资料页跳转
var startNewProductTime;
var attrCfg = {};
var hasUserConfig1367;//是否开启商品分类绑定默认厨打小票机
var hasNewCaseProductForRetail = false;
var hasAutoFreshBarcodeGenerationRule = false;
var hasFreshBarcodeCategoryCode = false;
var hasAvoidPayPlatformBarcodePrefix = false;
var scalePluCodeLength;
var preparationTimeUnitConst = { minute: 0, day: 1 };

$(function () {
    industryNumber = $("#industryNumber").val();
    secondIndustryNumber = $("#secondIndustryNumber").val();
    hasPriceAuth = $("#hf_hasPriceAuth").val() == "True";
    hasClothingAttribute = $("#hf_hasClothingAttribute").val() == "True";
    hasNoStockPrepay = $("#hf_hasNoStockPrepay").val() == "True";
    hasTimingProduct = $("#hf_hasTimingProduct").val() == "True";
    userList = JSON.parse($("#userList").val());
    imageDomain = $("#imageDomain").val();
    hasProductClothingExtAttribute = $("#hf_hasProductClothingExtAttribute").val() == "True";

    hasProductAttribute9 = hasCombProductItem || hasProductPackingAttribute || hasNewProductInfoAuth;

    buildBlankRows();

    initControls();

    bindEvent();

    addvancedProduct.init();

    exportProduct.init();

    importProduct.init();

    copyProduct.init();

    actionPage.init();

    toStandardProduct.init();

    editStoreProductUnits.init();

    batchEditImages.init();

    editMulColorSizeImages.init();

    standardProductSelector.init();

    if (hasClothingAttribute) {
        editColorSizeBase.init();
        editColorSizeGroup.init();
        editMulColorSizeProduct.init();
        pospal.browserBackButton.init(function () {
            var arr = [
                $("#mulColorSizeBaseDiv"),
                $("#mulColorSizeGroupDiv"),
                $("#mulColorSizeProductDiv")
            ].filter(function (it) { return !$(it).hasClass("nodis"); });
            if (arr.length == 0) {
                window.history.go(-1);
            } else {
                $(arr[0]).addClass("nodis");
            }
        });
    }

    editProduct.init();

    editImages.init();

    imageSegmentation.init();

    editStorePrinters.init();

    editLabelPrinters.init();

    sync.init();

    customAttribute.init();

    productTagApp.init();

    categoryManage.init();

    productBrand.init();

    brandCopy.init();

    editUIConfig.init();

    verifyCodeApp.init();

    guide.init();

    editExtBarcode.init();

    productSelectorApp.init();
    productSelectorApp.updateSelector(userSelector.getSelectedValue());

    supplierRangeManager.init();

    editStockPositionObjApp.init();

    editMoreSpecOrder.init();

    editPrinterV2.init();

    cookbookocrApp.init();

    editProductBarcodeGenerationRule.init();

    buildCategorySupplierDDlUnitsTagsAndPrinters();
});

function initControls() {
    var storeOptionsLength = pospal.tool.getOptionsCount(storeOptions);
    var isSmallScreen = ($(window).width() <= 1080 ? true : false) && storeOptionsLength > 1;

    if (hasNewProductInfoIndustry && !hasNewCateringIndustryAuth) { pospal.ui.headWidget(hasNewProductInfoAuth ? "切换旧版" : "切换新版"); }
    initEnterNewVersionButton();

    attrCfg.depositValidDays = $("#edit_depositValidDays").length > 0;

    userSelector = new pospal.ui.singleSelector({
        container: $('#ddl_subUsers'),
        textWidth: isSmallScreen ? 50 : 80,
        selectBoxWidth: 260,
        withTip: true,
        onlyShowFilter: true,
        options: storeOptions,
        onChange: function () {
            buildCategorySupplierDDlUnitsTagsAndPrinters();
            productSelectorApp.updateSelector(userSelector.getSelectedValue());
        }
    });
    advancedStoreSelector = new pospal.storeSelectorV2({
        options: addvancedStoreOptions,
        singleSelect: true,
        doubleClick: true,
        canParentNodeSelect: false,
        onConfirm: function () {
            var stores = advancedStoreSelector.getSelectedStores();
            var selectedUserId = stores.length > 0 ? stores[0].storeId : currentUserId;
            if (selectedUserId != userSelector.getSelectedValue()) {
                userSelector.setSelectedValue(selectedUserId);
                userSelector.opts.onChange();
            }
        },
        onCancel: function () {

        }
    });
    if (storeOptionsLength == 1) {
        $("#ddl_subUsers").hide();
        $(".conditionNav .btnMultipleAdvanced").hide();
        $(".btnCopy,.btnCopyDrop").hide();
    }

    categorySelector = new pospal.ui.singleSelector({
        container: $('#ddl_category'),
        textWidth: isSmallScreen ? 49 : 70,
        selectBoxWidth: 200,
        selectBoxMaxHeight: 300,
        onlyShowFilter: true,
        options: [{ text: lang.tryGet("全部分类"), value: "" }]
    });

    enableSelector = new pospal.ui.singleSelector({
        container: $('#ddl_enable'),
        textWidth: { cn: 28, en: 60 },
        selectBoxWidth: { cn: 33, en: 65 },
        options: [{ text: lang.tryGet("启用"), value: "1" }, { text: lang.tryGet("禁用"), value: "0" }]
    });

    supplierSelector = new pospal.ui.singleSelector({
        container: $('#ddl_supplier'),
        textWidth: isSmallScreen ? 60 : 70,
        selectBoxWidth: 200,
        options: [{ text: lang.tryGet("全部供货商"), value: "" }]
    });

    if (hasProductBrandPrepay) {
        brandSelector = new pospal.ui.singleSelector({
            container: $('#ddl_brand'),
            textWidth: isSmallScreen ? 48 : 60,
            selectBoxWidth: 200,
            options: [{ text: lang.tryGet("全部商品品牌"), value: "" }]
        });
    }

    productTagSelector = new pospal.ui.singleSelector({
        container: $('#ddl_productTag'),
        textWidth: isSmallScreen ? 49 : 65,
        selectBoxWidth: 86,
        options: [{ text: lang.tryGet("全部标签"), value: "" }]
    });

    categorysAddvancedSelector = new pospal.ui.multiTreeOptionSelector({
        title: "选择分类",
        options: [],
        newWidget: true,
        onConfirm: function () {
            var selectedValues = categorysAddvancedSelector.getSelectedValues();

            $("#selectCategory").data("selectedValues", selectedValues);

            if (selectedValues.length == 0)
                $("#categoryText").text("不限分类");
            else
                $("#categoryText").text("已选择" + selectedValues.length + "种品类");
        }
    });

    brandAddvancedSelector = new pospal.ui.multiTreeOptionSelector({
        title: "选择品牌",
        options: [],
        newWidget: true,
        onConfirm: function () {
            var $container = $("#selectedBrands");
            var selectedValues = brandAddvancedSelector.getSelectedValues();

            $container.data("selectedValues", selectedValues);

            if (selectedValues.length == 0)
                $container.prev().text("不限品牌");
            else
                $container.prev().text("已选择 " + selectedValues.length + " 个品牌");
        }
    });

    colorAddvancedSelector = new pospal.multiSelector({
        title: "选择颜色",
        options: [],
        onConfirm: function () {
            var $container = $("#selectedColorList");
            var selectedValues = colorAddvancedSelector.getSelectedValues();

            $container.data("selectedValues", selectedValues);

            if (selectedValues.length == 0)
                $container.prev().text("不限颜色");
            else
                $container.prev().text(lang.tryFormat("已选择X种颜色", [selectedValues.length]));
        }
    });

    sizeAddvancedSelector = new pospal.multiSelector({
        title: "选择尺码",
        options: [],
        onConfirm: function () {
            var $container = $("#selectedSizeList");
            var selectedValues = sizeAddvancedSelector.getSelectedValues();

            $container.data("selectedValues", selectedValues);

            if (selectedValues.length == 0)
                $container.prev().text("不限尺码");
            else
                $container.prev().text(lang.tryFormat("已选择X种尺码", [selectedValues.length]));
        }
    });

    supplierAddvancedSelector = new pospal.multiSelector({
        title: "选择供应商",
        options: [],
        onConfirm: function () {
            var $container = $("#selectedSuppliers");
            var selectedValues = supplierAddvancedSelector.getSelectedValues();

            $container.data("selectedValues", selectedValues);

            if (selectedValues.length == 0)
                $container.prev().text("不限供应商");
            else
                $container.prev().text(lang.tryFormat("已选择X个供应商", [selectedValues.length]));
        }
    });

    groupRadioBox = new pospal.ui.radioBox({
        container: $('#groupRadioBox'),
        text: industryNumber == "103" || secondIndustryNumber == "11003" || secondIndustryNumber == "11603" || industryNumber == 112 ? lang.tryGet("合并同货号商品") : "合并多规格商品",
        checked: industryNumber == "103" ? true : false,
        clickCallBack: function () {
            loadCurrentQueryProducts();
        }
    });

    paging = new pospal.ui.paging({
        "loadSummaryUrl": "/Product/LoadProductSummary",
        "loadContentUrl": "/Product/LoadProductsByPage",
        loadedSummary: function () {
            if ($("#mainTable tbody tr.noRecord").length > 0) {
                editUIConfig.filterHeader();
                //根据可见列构建自定义表头UI
                editUIConfig.buildUI();
                calcContentAreaHeight();
            }
            try {
                //重新初始化翻译脚本，不翻译表格
                pospalTranslate = new PospalTranslate({ ignoreSelectors: ['#mainTable tbody'] });
                pospalTranslate.run();
            } catch (e) { }
            handleFromOtherPage.init();
        },
        loadedContent: function () {
            if ($("#mainTable tbody .noRecord").length == 0) {
                editUIConfig.filterHeader();
                //根据可见列构建自定义表头UI
                editUIConfig.buildUI();
                buildBlankRows();

                $("#mainTable td.hasData img").Magnify({
                    Toolbar: [
                        'prev',
                        'next',
                        'actualSize'
                    ],
                    keyboard: true,
                    draggable: false,
                    movable: true,
                    modalSize: [800, 600],
                    beforeOpen: function (obj, data) {
                        $("#popupBg").show();
                    },
                    opened: function (obj, data) {
                        console.log('opened')
                    },
                    beforeClose: function (obj, data) {
                        console.log('beforeClose')
                    },
                    closed: function (obj, data) {
                        $("#popupBg").hide();
                    },
                    beforeChange: function (obj, data) {
                        console.log('beforeChange')
                    },
                    changed: function (obj, data) {
                        console.log('changed')
                    }
                });

                $(".btnShowEditArea").bind("click", function () {
                    var productId = $(this).parent().parent().attr("data");
                    if (hasNewProductInfoAuth) {
                        if (hasNewCateringIndustryAuth) {
                            pospal.openPage("/ProductInfo/Catering?userId=" + userSelector.getSelectedValue() + "&uid=" + $(this).parents('tr').attr("data-uid"), false);
                        }
                        else {
                            pospal.openPage("/ProductInfo/Retail?productId=" + productId, false);
                        }
                    }
                    else {
                        editProduct.findProduct(productId);
                        $("#mainTable tr").removeClass("selected");
                        $(this).parent().parent().addClass("selected");
                    }
                });
                $(".btnSetProductStockType").bind("click", function () {
                    openCloudErpProductStockTypeSet($(this).attr("data-barcode"));
                    return false;
                });

                //点击货号，查看同货号商品库存情况 （服装版本）
                $("#mainTable .attribute4").bind("click", function () {
                    var productId = $(this).parent().parent().attr("data");
                    var doing = new pospal.ui.loading($("#mainArea"));
                    pospal.ajax({
                        url: "/Product/LoadMulColorSizeProductsDetail",
                        data: { "productId": productId },
                        success: function (result) {
                            $("#popupBg").show();
                            $("#mulColorSizeProductDetail").removeClass("nodis");
                            $("#mulColorSizeProductDetail .popupTitle h1").html("● " + result.productName);
                            $("#mulColorSizeProductDetail .detailDiv").html(result.view);
                        },
                        complete: function () {
                            doing.destroy();
                        }
                    });
                });

                try {
                    //重新初始化翻译脚本，不翻译表格
                    pospalTranslate = new PospalTranslate({ ignoreSelectors: ['#mainTable tbody'] });
                    pospalTranslate.run();
                } catch (e) { }
                calcContentAreaHeight();
                $("#contentArea").mCustomScrollbar("update");
            }
        }
    });

    //处理其他页面跳转到商品页面时逻辑
    fromPage = pospal.getLocationParamsWithDecode("fromPage").toLowerCase();
    handleFromOtherPage.setUserId();
    if (urlParms.barcode) $("#txt_keyword").val(urlParms.barcode);
    if (urlParms.groupBySpu != null) {
        groupRadioBox.checked = urlParms.groupBySpu == "1"; groupRadioBox.reset();
    }
}

function openCloudErpProductStockTypeSet(barcode) {
    var cloudErpReturnUrlBase = urlParms.cloudErpReturnUrlBase || "";
    if (!cloudErpReturnUrlBase && document.referrer) {
        cloudErpReturnUrlBase = document.referrer.split("#")[0];
    }
    if (!cloudErpReturnUrlBase) {
        cloudErpReturnUrlBase = "/cloud-erp/";
    }

    var queryParams = [];
    var selectedUserId = userSelector ? userSelector.getSelectedValue() : "";
    if (selectedUserId) {
        queryParams.push("userId=" + encodeURIComponent(selectedUserId));
    }
    if (barcode) {
        queryParams.push("barcode=" + encodeURIComponent(barcode));
    }
    var query = queryParams.length > 0 ? "?" + queryParams.join("&") : "";
    var targetUrl = cloudErpReturnUrlBase + "#/product-stock-type-set/index" + query;
    if (window.top && window.top !== window.self) {
        window.top.location.href = targetUrl;
    } else {
        window.location.href = targetUrl;
    }
}

function getFilterType() {
    var filterType = "product";
    var filterTypeParam = pospal.getLocationParamsWithDecode("filterType").toLowerCase();
    if (filterTypeParam && filterTypeParam != '') {
        filterType = filterTypeParam;
    }
    return filterType;
}

function getCategoryType() {
    var categoryType = 0;
    var filterType = pospal.getLocationParamsWithDecode("filterType").toLowerCase();
    if (filterType == 'examination') {
        categoryType = 5;
    }
    if (filterType == 'operation') {
        categoryType = 6;
    }
    if (filterType == 'registration') {
        categoryType = 7;
    }
    return categoryType;
}

function getDefaultCategoryTab() {
    var categoryTab = 'server';
    var categoryTabParam = pospal.getLocationParamsWithDecode("filterType").toLowerCase();
    if (categoryTabParam && categoryTabParam != '') {
        categoryTab = categoryTabParam;
    }
    return categoryTab;
}

function bindEvent() {
    $(".conditionNav .btnMultipleAdvanced").bind("click", function () {
        advancedStoreSelector.reset([userSelector.getSelectedValue()]);
        advancedStoreSelector.show();
    });

    $(".btnShowEditProductTagDiv").bind("click", function () {
        productTagApp.show();
    });

    $(".btnShowStandardProductDiv").bind("click", function (event) {
        if ($(event.target).closest(".standardProductMenuItem").length > 0) return;
        if ($(this).find(".standardProductMenuItem").length > 0) return;
        toStandardProduct.show();
    });

    $(".btnShowStandardProductDiv .standardProductMenuItem").bind("click", function (event) {
        event.stopPropagation();
        $(".btnShowStandardProductDiv").data("selected-url", $(this).attr("data-url"));
        toStandardProduct.show();
    });

    $(".conditionNav .submitBtn").bind("click", function () {
        loadProducts();
    });

    $(".yb-breadcrumb__inner_button").bind("click", function () {
        new pospal.ui.msgBox({
            boxType: "confirm",
            content: lang.tryFormat("确认切换到X商品资料", [(hasNewProductInfoAuth ? "旧版" : "新版")]) + "？",
            confirmText: lang.tryGet("是"),
            cancelText: lang.tryGet("否"),
            onConfirm: function () {
                if (this.confirmValue) {
                    editProduct.changeProductInfo();
                }
            }
        });
    });


    $(document).on("click", ".mCS_img_SettingHeader", function () {
        editUIConfig.show();
    })

    $(document).on("click", ".thSort,.thAsc,.thDesc", function () {
        pospal.sendEventReport("ProductListOrderClick", $(this).text().trim() + "排序次数");
        var queryCriterias = paging.opts.loadSummaryUrl == "/Product/LoadProductSummary" ? buildBaseQueryCriterias() : addvancedProduct.buildRequestQueryCriterias(addvancedProduct.queryCriterias);
        paging.orderColumn = $(this).attr("data");
        paging.asc = !($(this).attr("class").indexOf("Asc") > -1 ? true : false);

        paging.load(queryCriterias);
    });

    $("#txt_keyword").keyup(function (event) {
        if (event.keyCode == 13) {
            loadProducts();
        }
    });

    $(".btnEditEshopProduct").bind("click", function () {
        var url = "/Eshop/Product";
        if (pospal.website.forClientFrame) {
            url += "?forClientFrame=true";
        }
        window.location.href = url;
    });

    $("#mulColorSizeProductDetail .popupClose").bind("click", function () {
        $("#popupBg").hide();
        $("#mulColorSizeProductDetail").addClass("nodis");
    });

    $("#quickAdd").click(function () {
        cookbookocrApp.show();
    });

    $(".btnToBatchUpdate").click(function () {
        pospal.openPage("/Product/BatchUpdate?menuTabId=copy&menuUserId=" + userSelector.getSelectedValue(), true);
    });
}

function initEnterNewVersionButton() {
    if (!hasNewCateringIndustryAuth || hasNewProductInfoAuth) {
        return;
    }
    if ($("#editArea .editBottom .enterNewVersion").length > 0) {
        return;
    }
    $('<div class="btn enterNewVersion">进入新版</div>').insertAfter("#editArea .btn.cancel");
}

//初始化分类，供应商，标签等下拉框
function buildCategorySupplierDDlUnitsTagsAndPrinters() {
    var loadedNum = 0;

    var userId = userSelector.getSelectedValue();
    hasAutoFreshBarcodeGenerationRule = false;
    hasFreshBarcodeCategoryCode = false;
    //只有美业才展示商品分类的分类
    var industryNum = 200;
    $.each(userList, function (i, v) {
        if (v.id == userId) {
            industryNum = v.industryNum;
        }
    });

    isMuYinSecondary = false;
    isMeiYe = false;
    if (industryNum.toString().indexOf('108') == 0) {
        isMeiYe = true;
    }
    else if (industryNum.toString().indexOf('112') == 0) {
        isYiPei = true;
    }
    else if (industryNum == '10602') {
        isPetHospital = true;
    }
    else if (industryNum == '10501' || industryNum == '10502' || industryNum == '10503' || industryNum == '10504' || industryNum == '10505' || industryNum == '10506') {
        isMuYinSecondary = true;
    }

    $("#linkdownload, #linkdownload2").each(function (i, elem) {
        $(this).attr("href", $(this).attr("origin-data").replace("{userId}", userId))
    });

    var loading = new pospal.ui.loading($("#mainArea"));

    pospal.ajax({
        url: "/Product/FindUserConfig1220",
        data: { "userId": userSelector.getSelectedValue() },
        success: function (result) {
            if (result.successed) {
                var userConfig1220 = result.userConfig1220;
                var userConfig1228 = result.userConfig1228;
                hasAvoidPayPlatformBarcodePrefix = !!result.hasAvoidPayPlatformBarcodePrefix;
                var userConfig1999 = result.userConfig1999;
                editStorePrinters.printerPrintSizeSelector.setSelectedValue(userConfig1220 == null ? 1 : userConfig1220.configValue);
                editStorePrinters.printerPrintSortSelector.setSelectedValue(userConfig1228 == null ? 0 : userConfig1228.configValue);
                scalePluCodeLength = userConfig1999 != null && !isNaN(parseInt(userConfig1999.configValue, 10)) ? parseInt(userConfig1999.configValue, 10) : 5;
            }
        },
        complete: function () {
            loadedNum++;
            checkLoadedAll();
        }
    });

    pospal.ajax({
        url: "/Category/LoadCategoryDDLJson",
        data: {
            "userId": userSelector.getSelectedValue(),
            "withMnemonicCode": true,
            "withCashierCategoryDisable": true,
            "withCategoryPrinter": hasCategoryPrinter,
            "withCategoryDefaultSetting": hasCategoryDefaultSettingAuth,
        },
        success: function (result) {
            if (result.successed) {
                categoryList = result.categorys;

                var categoryType = getCategoryType();
                var categoryOptions = JSON.parse(JSON.stringify(categoryList));
                if (isMeiYe || isYiPei || isPetHospital || isMuYinSecondary) {
                    categoryOptions = $.grep(categoryOptions,
                        function (v, i) {
                            if (categoryType == 0) {
                                return v.categoryType == null || v.categoryType == 0 || v.categoryType == 2;
                            }
                            else {
                                return v.categoryType == categoryType;
                            }
                        });
                }

                var options = pospal.buildCategoryOptions(categoryOptions);
                options.unshift({ text: lang.tryGet("全部分类"), value: "" });
                options.push({ text: lang.tryGet("无", true), value: "0" });

                categorySelector.update(options);

                var categorys = [];
                $.each(categoryOptions,
                    function () {
                        categorys.push({ text: this.name, value: this.txtUid });
                    });

                options = pospal.buildCategoryOptions(categoryOptions);
                options.push({ text: lang.tryGet("无", true), value: "0" });
                categorysAddvancedSelector.rebind(options);

                var disableCategoryUids = result.disableCategoryUids;
                categorysAddvancedSelector.opts.disabledOptionIds = disableCategoryUids;
            }
        },
        complete: function () {
            loadedNum++;
            checkLoadedAll();
        }
    });

    if (hasViewProductSupplierAuth) {
        pospal.ajax({
            url: "/Supplier/LoadSupplierDDLJson",
            data: { "userId": userSelector.getSelectedValue(), "withNumber": true },
            success: function (result) {
                if (result.successed) {
                    if (result.supplierDDL.length >= 10) {
                        supplierAddvancedSelector.rebind(result.supplierDDL);
                        $("#supplierQueryDiv .pop").show();
                        $("#supplierQueryDiv .unpop").hide();
                    }
                    else {
                        $("#supplierQueryDiv .pop").hide();
                        $("#supplierQueryDiv .unpop").show();
                        var html = '';
                        $.each(result.supplierDDL, function () {
                            html += "<li data='" + this.value + "'><div class='checkBox14'><i></i></div>" + this.text + "</li>";
                        })
                        if (html == '')
                            $("#supplierAddvancedDiv").html('').parent().hide();
                        else
                            $("#supplierAddvancedDiv").html(html).parent().show();
                    }

                    var supplierOptions = JSON.parse(JSON.stringify(result.supplierDDL));
                    supplierOptions.unshift({ text: lang.tryGet("全部供货商"), value: "" });

                    supplierSelector.update(supplierOptions);

                    storeSupplierOptions = JSON.parse(result.suppliersJson);
                }
            },
            complete: function () {
                loadedNum++;
                checkLoadedAll();
            }
        });
    } else {
        storeSupplierOptions = [];
        loadedNum++;
        checkLoadedAll();
    }

    pospal.ajax({
        url: "/Product/LoadStoreProductUnits",
        data: { "userId": userSelector.getSelectedValue() },
        success: function (result) {
            if (result.successed) {
                storeProductUnits = result.productunits;
            }
        },
        complete: function () {
            loadedNum++;
            checkLoadedAll();
        }
    });

    pospal.ajax({
        url: "/Product/HasAutoFreshBarcodeGenerationRule",
        data: { "userId": userSelector.getSelectedValue() },
        success: function (result) {
            if (result.successed) {
                hasAutoFreshBarcodeGenerationRule = result.hasAutoFreshBarcodeGenerationRule;
                hasFreshBarcodeCategoryCode = result.hasFreshBarcodeCategoryCode;
            }
        },
        complete: function () {
            loadedNum++;
            checkLoadedAll();
        }
    });

    pospal.ajax({
        url: "/Product/LoadUserPrinters",
        data: { "userId": userSelector.getSelectedValue(), "onlyRestaurantArea": true },
        success: function (result) {
            if (result.successed) {
                storePrinters = result.printerList;
                restaurantAreas = result.restaurantAreaList;
                defaultPrintSize = result.defaultPrintSize;
            }
        },
        complete: function () {
            loadedNum++;
            checkLoadedAll();
        }
    });

    pospal.ajax({
        url: "/Product/LoadUserLabelPrinters",
        data: { "userId": userSelector.getSelectedValue() },
        success: function (result) {
            if (result.successed) {
                labelPrinters = result.printerList;
            }
        },
        complete: function () {
            loadedNum++;
            checkLoadedAll();
        }
    });

    var dtd_tag = pospal.ajax({
        url: "/Product/LoadStoreProductTagGroups",
        data: { "userId": userSelector.getSelectedValue() },
        success: function (result) {
            if (result.successed) {
                taggroupsWithtags = result.productTagGroups;
                productTagApp.onChangedProductTagGroup();
                onChangedProductTag();
            }
        },
        complete: function () {
            loadedNum++;
            checkLoadedAll();
        }
    });

    if ($("#edit_btnSelectTaste").length > 0) {//加载口味数据
        pospal.ajax({
            url: "/Product/LoadStoreProductTasteGroups",
            data: { "userId": userSelector.getSelectedValue() },
            success: function (result) {
                if (result.successed) {
                    tastegroupsWithtastes = result.productTasteGroups;
                }
            }
        });
    }

    if (hasProductBrandPrepay) {
        pospal.ajax({
            url: "/ProductBrand/LoadStoreProductBrands",
            data: { "userId": userSelector.getSelectedValue(), orderBy: "zh-cn" },
            success: function (result) {
                if (result.successed) {
                    productBrands = result.productBrands;
                    onChangedProductBrand();
                }
            },
            complete: function () {
                loadedNum++;
                checkLoadedAll();
            }
        });
    }

    if (industryNumber == "103") {
        pospal.ajax({
            url: "/Product/LoadProductColorSizes",
            data: { "userId": userSelector.getSelectedValue(), "groupByName": true },
            success: function (result) {
                if (result.successed) {
                    productColors = result.productColors;
                    productSizes = result.productSizes;
                    onChangedProductColorSize();
                }
            },
            complete: function () {
            }
        });
    }
    if (hasCategoryPrinter) {
        pospal.ajax({
            url: '/Setting/FindUserConfig',
            data: { "userId": userSelector.getSelectedValue(), typeNumber: "1367" },
            success: function (result) {
                if (result.successed) {
                    hasUserConfig1367 = result.userConfig != null && result.userConfig.configValue == "1" ? true : false;
                }
            },
            complete: function () {
            }
        });
    }
    else {
        hasUserConfig1367 = false;
    }
    pospal.ajax({
        url: '/ProductExt/HasNewCaseProductForRetailAuth',
        data: { "userId": userSelector.getSelectedValue() },
        success: function (result) {
            if (result.successed) {
                hasNewCaseProductForRetail = result.hasNewCaseProductForRetail;
            }
        },
        complete: function () {
        }
    });
    var dtd_addvan = addvancedProduct.dependOnUserSelector(dtd_tag);

    function checkLoadedAll() {
        var totalLoadNum = hasProductBrandPrepay ? 9 : 8;
        if (loadedNum == totalLoadNum) {
            $.when(dtd_addvan).then(function () {
                loading.destroy(1);
                addvancedProduct.clearQueryCriterias();
                loadProducts();
            });
        }
    }
}

//计算区域滚动条高度
function calcContentAreaHeight() {
    $("#contentArea").height($("#mainArea").height() - $('#summaryInfo').height() - 40 - ($(".advancedNav").is(":hidden") ? 0 : $(".advancedNav").outerHeight()) + 5);
}

function getValueForTagUid() {
    var arrs = productTagSelector.getSelectedSubOptionValues();
    return $.grep(arrs, function (e) { return !(e && e.length > 0 && e[0] == "g"); });
}

function buildBaseQueryCriterias() {
    var queryCriterias = {};
    queryCriterias.groupBySpu = groupRadioBox.checked;
    queryCriterias.userId = userSelector.getSelectedValue();
    if (hasProductBrandPrepay) queryCriterias.productbrand = brandSelector.getSelectedValue();
    queryCriterias.categorysJson = JSON.stringify(categorySelector.getSelectedSubOptionValues());
    queryCriterias.enable = enableSelector.getSelectedValue();
    queryCriterias.supplierUid = hasViewProductSupplierAuth ? supplierSelector.getSelectedValue() : null;
    queryCriterias.productTagUidsJson = JSON.stringify(getValueForTagUid());
    queryCriterias.keyword = $.trim($("#txt_keyword").val());
    if (queryCriterias.keyword == lang.tryGet("条码名称拼音码")) queryCriterias.keyword = "";
    queryCriterias.categoryType = (isMeiYe || isYiPei || isPetHospital || isMuYinSecondary) ? getCategoryType() : null;
    if (urlParms.showCloudErpProductStockTypeSet == "1") {
        queryCriterias.showCloudErpProductStockTypeSet = "1";
    }

    return queryCriterias;
}

function loadProducts(keepPageIndex) {
    layout.showOrHideEditArea(false);
    editUIConfig.hide();
    if ($("#txt_keyword").val() != lang.tryGet("条码名称拼音码")) $("#txt_keyword").select();

    addvancedProduct.close();
    var queryCriterias = buildBaseQueryCriterias();
    paging.opts.loadSummaryUrl = "/Product/LoadProductSummary";
    paging.opts.loadContentUrl = "/Product/LoadProductsByPage";
    paging.queryCriterias = null;
    paging.load(queryCriterias, keepPageIndex ? paging.queryPageIndex : null);
}

function reLoadProducts(userId) {
    userSelector.setSelectedValue(userId);
    enableSelector.setSelectedValue("1");
    categorySelector.setSelectedValue("");
    supplierSelector.setSelectedValue("");
    $("#txt_keyword").val(lang.tryGet("条码名称拼音码"));

    buildCategorySupplierDDlUnitsTagsAndPrinters();
}

function loadCurrentQueryProducts(keepPageIndex) {
    layout.showOrHideEditArea(false);
    editUIConfig.hide();

    var queryCriterias = paging.opts.loadSummaryUrl == "/Product/LoadProductSummary" ? buildBaseQueryCriterias() : addvancedProduct.buildRequestQueryCriterias(addvancedProduct.buildBaseQueryCriterias());
    paging.load(queryCriterias, keepPageIndex ? paging.queryPageIndex : null);
}

var addvancedProduct = {
    queryCriterias: null,
    init: function () {
        var _this = this;

        this.productTagAddvancedSelector = new _this.ctrls.tagAddvanSelectorWrap({
            title: "选择标签",
            emptyText: "不限标签",
            formatText: "已选择 {0} 种标签".WrapPts(),
            container: $("#selectedProductTagsLi")
        });

        $("#btnAdvanceResearch").click(function () {
            editUIConfig.hide();
            $("#conditionDiv").html('');
            $(".placeholderDiv,.advancedNav").show();
        });
        $("#btnAdvanceSearch").click(function () {
            _this.load();
        });
        $("#btnAdvanceClose").click(function () {
            $(".placeholderDiv").hide();
        });
        $("#btnAdvanceClear").click(function () {
            _this.clearQueryCriterias();
        });
        $(".advancedBtn").click(function () {
            if (!$(this).hasClass("on")) {
                editUIConfig.hide();
                $(this).addClass("on");
                _this.clearQueryCriterias();
                $("#conditionDiv").html('');
                $(".placeholderDiv,.advancedNav").show();
                var height = $(".item-ul").height();
                var maxHeight = $("#mainArea").height() - 202;
                if (height >= maxHeight) {
                    $("#addvancedContentArea").height(maxHeight);
                    $("#addvancedContentArea").mCustomScrollbar('update');
                }
                else {
                    $("#addvancedContentArea").height(height);
                    $("#addvancedContentArea").mCustomScrollbar('update');
                }
            }
        })
        $(".advancedBtn .close").click(function (e) {
            e.stopPropagation();
            _this.close();
        })

        $(".cp-ul.singer").on("click", "li:not(.noPadding)", function () {
            if ($(this).hasClass("on")) {
                $(this).removeClass('on');
            }
            else {
                $(this).addClass('on');
            }

            $(this).siblings("li").removeClass("on");
            if ($(this).parent().attr("data-type") == "enable") {
                _this.toggleProductEnable($(this).attr("data"));
            }
        });

        $(".cp-ul.multi").on("click", "li", function () {
            if ($(this).hasClass('on'))
                $(this).removeClass('on')
            else
                $(this).addClass('on')
        });
        $("#selectCategory").bind("click", function () {
            categorysAddvancedSelector.reset($("#selectCategory").data("selectedValues") || []);
            categorysAddvancedSelector.show();
        });
        $("#selectedBrands").click(function () {
            var selectedValues = $("#selectedBrands").data("selectedValues") || [];
            brandAddvancedSelector.reset(selectedValues);
            brandAddvancedSelector.show();
        })

        $("#selectedColorList").click(function () {
            var selectedValues = $("#selectedColorList").data("selectedValues");
            colorAddvancedSelector.show(selectedValues);
        })

        $("#selectedSizeList").click(function () {
            var selectedValues = $("#selectedSizeList").data("selectedValues");
            sizeAddvancedSelector.show(selectedValues);
        })

        $("#selectedSuppliers").click(function () {
            var selectedValues = $("#selectedSuppliers").data("selectedValues");
            supplierAddvancedSelector.show(selectedValues);
        })

        this.txt_startDateTime = new pospal.ui.dateTimePicker({ container: $('#txt_startDatetime'), type: "single", showArrow: false, yearRange: "2015:" + (parseInt(new Date().getFullYear()) + 10) });
        this.txt_endDateTime = new pospal.ui.dateTimePicker({ container: $('#txt_endDatetime'), type: "single", showArrow: false, yearRange: "2015:" + (parseInt(new Date().getFullYear()) + 10) });
    },
    dependOnUserSelector: function (dtd_tag) {
        var that = this;
        this.productTagAddvancedSelector.updateWithLabel([]);
        dtd_tag.then(function (result) {
            if (result.successed) {
                var tagOptions = pospal.buildProductTagOptions(result.productTagGroups);
                that.productTagAddvancedSelector.updateWithLabel($.extend(true, [], tagOptions), null);
            }
        });

        return $.when(dtd_tag);
    },
    close: function () {
        $(".advancedBtn").removeClass("on");
        $(".placeholderDiv,.advancedNav").hide();
    },
    toggleProductEnable: function (enable) {
        var $lifecycleDiv = $("#lifecycleAddvancedDiv");
        if ($lifecycleDiv.length == 0) return;

        $lifecycleDiv.empty();
        var limitStatusArray = [];
        if (enable == "" || enable == "1") {
            limitStatusArray = ["0", "1", "2", "3", "5"];
        }
        if (enable == "" || enable == "0") {
            limitStatusArray.push("4");
        }
        $.each(productLifecycleStatusList, function (index, item) {
            if (pospal.isInArray(limitStatusArray, item.value)) {
                var $li = $("<li/>").attr("data", item.value).text(item.text).appendTo($lifecycleDiv);
                $("<div/>").addClass("checkBox14").html("<i/>").appendTo($li);
                if (limitStatusArray.length == 1) {//只有一项默认选中
                    $li.addClass("on");
                }
            }
        });
    },

    buildLifecycleStatus: function () {
        var orderStatusListt = [];
        $("#lifecycleAddvancedDiv li.on").each(function () {
            orderStatusListt.push($(this).attr("data"));
        })
        return orderStatusListt;
    },

    clearQueryCriterias: function () {
        $(".item-ul").find("li").removeClass("on");
        $(".item-ul").find("input").val('');
        $("#categoryText").html("不限分类");
        categorysAddvancedSelector.bulidOptionList(true);
        brandAddvancedSelector.bulidOptionList(true);
        colorAddvancedSelector.bulidOptionList(true);
        sizeAddvancedSelector.bulidOptionList(true);
        supplierAddvancedSelector.bulidOptionList(true);
        this.productTagAddvancedSelector.clear();
        $("#selectCategory").data("selectedValues", []);
        $("#selectedBrands").prev().text("不限品牌");
        $("#selectedBrands").data("selectedValues", []);
        $("#selectedSuppliers").prev().text("不限供应商");
        $("#selectedSuppliers").data("selectedValues", []);
        $("#selectedColorList").prev().text("不限颜色");
        $("#selectedColorList").data("selectedValues", []);
        $("#selectedSizeList").prev().text("不限尺码");
        $("#selectedSizeList").data("selectedValues", []);
        this.toggleProductEnable("");
    },
    buildBaseQueryCriterias: function () {
        var query = {};
        query.queryString = "";

        query.categoryType = (isMeiYe || isYiPei || isPetHospital || isMuYinSecondary) ? getCategoryType() : null;
        query.userId = userSelector.getSelectedValue();
        query.queryString += "<li>门店：" + userSelector.getSelectedText() + "</li>";
        query.groupBySpu = groupRadioBox.checked;

        var categoryUids = categorysAddvancedSelector.getSelectedValues();
        query.categorysJson = JSON.stringify(categoryUids || []);
        if (categoryUids.length > 0) {
            query.queryString += "<li>分类：已选中 " + categoryUids.length + " 种分类</li>";
        }

        var brandsString = '<li>品牌：';
        var brands = brandAddvancedSelector.getSelectedValues();
        if (brands.length > 0) brandsString += $("#selectedBrands").prev().text();
        $("#brandAddvancedDiv li.on").each(function (index, item) {
            brands.push($(item).attr("data"));
            brandsString += $(item).text().trim() + '、';
        });
        brandsString = brandsString.lastIndexOf('、') > -1 ? brandsString.substr(0, brandsString.length - 1) : brandsString + "</li>";
        if (brands.length > 0) {
            query.brandsJson = JSON.stringify(brands);
            query.queryString += brandsString;
        }

        var tagSelect = this.productTagAddvancedSelector.getValue();
        query.tagSelect = JSON.stringify(tagSelect);
        if (tagSelect && tagSelect.taggroups.length > 0) {
            query.queryString += "<li>" + this.productTagAddvancedSelector.getText().join("</li><li>") + "</li>";
        }

        if (hasViewProductSupplierAuth) {
            var suppliersString = '<li>供应商：';
            var suppliers = supplierAddvancedSelector.getSelectedValues();
            if (suppliers.length > 0) suppliersString += $("#selectedSuppliers").prev().text();
            $("#supplierAddvancedDiv li.on").each(function (index, item) {
                suppliers.push($(item).attr("data"));
                suppliersString += $(item).text().trim() + '、';
            });
            suppliersString = suppliersString.lastIndexOf('、') > -1 ? suppliersString.substr(0, suppliersString.length - 1) : suppliersString + "</li>";
            if (suppliers.length > 0) {
                query.suppliersJson = JSON.stringify(suppliers);
                query.queryString += suppliersString;
            }
        }

        var lifecycleStatusList = this.buildLifecycleStatus();
        if (lifecycleStatusList.length > 0) {
            query.lifecycleStatusList = JSON.stringify(lifecycleStatusList);
            query.queryString += "<li>商品状态：已选中 " + lifecycleStatusList.length + " 种</li>";
        }

        var startDatetime = $('#txt_startDatetime').val();
        var endDatetime = $('#txt_endDatetime').val();
        if (startDatetime != "" && endDatetime != "") {
            query.createdDateRange = [startDatetime + " 00:00:00", endDatetime + " 23:59:59"];
            query.queryString += "<li>" + lang.tryFormat("录入时间X", [$('#txt_startDatetime').val().replace(/-/g, "/") + "-" + $('#txt_endDatetime').val().replace(/-/g, "/")]) + "</li>";
        }

        var minSellPrice = $('#minSellPrice').val().trim();
        var maxSellPrice = $('#maxSellPrice').val().trim();
        if (minSellPrice != "" && maxSellPrice != "") {
            query.sellPriceRange = [minSellPrice, maxSellPrice];
            query.queryString += "<li>价格区间：" + minSellPrice + currencySymbol + "-" + maxSellPrice + currencySymbol + "</li>";
        }

        var minStock = $('#minStock').val().trim();
        var maxStock = $('#maxStock').val().trim();
        if (minStock != "" && maxStock != "") {
            query.stockRange = [minStock, maxStock];
            query.queryString += "<li>" + lang.tryFormat("库存区间X", [minStock + "-" + maxStock]) + "</li>";
        }

        $(".cp-ul.singer li.on,.keyword").each(function (index, item) {
            var queryType = $(item).parent().attr("data-type");
            var data = $(item).attr("data");

            if (queryType == "artKeyword" || queryType == "speKeyword" || queryType == "spuKeyword" || queryType == "productKeyword" || queryType == "stockPosition") {
                var queryVaule = $(item).find("input").val().trim();
                if (queryVaule != "") {
                    query.queryString += "<li>" + $(item).parent().prev().text();
                    query[queryType] = queryVaule;
                    query.queryString += queryVaule;
                    query.queryString += "</li>";
                }
            }
            else {
                query.queryString += "<li>" + $(item).parent().prev().text();
                query[queryType] = data;
                query.queryString += $(item).text();
                query.queryString += "</li>";
            }

        });

        if (query.isMoreSpu == "1" || query.isMoreSpu == "0") {
            query.isMoreSpu = query.isMoreSpu == "1" ? true : false;
        }

        if (query.isMoreUnit == "1" || query.isMoreUnit == "0") {
            query.isMoreUnit = query.isMoreUnit == "1" ? true : false;
        }

        if (query.isPacking == "1" || query.isPacking == "0") {
            query.isPacking = query.isPacking == "1" ? true : false;
        }

        var colorString = '<li>颜色：';
        var colorList = colorAddvancedSelector.getSelectedValues();
        if (colorList.length > 0) colorString += $("#selectedColorList").prev().text();
        colorString = colorString.lastIndexOf('、') > -1 ? colorString.substr(0, colorString.length - 1) : colorString + "</li>";
        if (colorList.length > 0) {
            query.colorList = JSON.stringify(colorList);
            query.queryString += colorString;
        }

        var sizeString = '<li>尺码：';
        var sizeList = sizeAddvancedSelector.getSelectedValues();
        if (sizeList.length > 0) sizeString += $("#selectedSizeList").prev().text();
        sizeString = sizeString.lastIndexOf('、') > -1 ? sizeString.substr(0, sizeString.length - 1) : sizeString + "</li>";
        if (sizeList.length > 0) {
            query.sizeList = JSON.stringify(sizeList);
            query.queryString += sizeString;
        }

        if (query["basicAttribute"]) {
            if (query["basicAttribute"] == "1") {
                query.hasExtBarcodes = true;
            }
            if (query["basicAttribute"] == "2") {
                query.isWeighing = true;
            }
            if (query["basicAttribute"] == "3") {
                query.attribute9 = "2";
            }
            if (query["basicAttribute"] == "4") {
                query.attribute9 = "3";
            }
            if (query["basicAttribute"] == "5") {
                query.isBarcodeScale = true;
            }
            if (query["basicAttribute"] == "6") {
                query.attribute9 = "1";
            }
        }

        //以下条件查询单个商品，不支持合并货号展示
        if (query.enable || query.lifecycleStatusList || query.createdDateRange || query.sellPriceRange || query.stockRange || query.productKeyword || query.speKeyword || query.artKeyword || query.spuKeyword || query.stockPosition || query.colorList || query.sizeList || query["basicAttribute"]) {
            query.groupBySpu = false;
        }
        if (urlParms.showCloudErpProductStockTypeSet == "1") {
            query.showCloudErpProductStockTypeSet = "1";
        }

        return query;
    },
    buildRequestQueryCriterias: function (queryCriterias) {
        var requestQueryCriterias = $.extend({}, queryCriterias);
        delete requestQueryCriterias.queryString;
        return requestQueryCriterias;
    },
    checkQueryCriterias: function () {
        var formValidator = new pospal.formValidator();

        var startDatetime = $('#txt_startDatetime').val();
        var endDatetime = $('#txt_endDatetime').val();
        if (startDatetime != "" && endDatetime != "") {
            if (new Date(startDatetime) > new Date(endDatetime)) {
                new pospal.ui.msgBox({ content: "录入时间开始时间不能大于结束时间" });
                return false;
            }
        }
        var minSellPrice = $('#minSellPrice').val().trim();
        var maxSellPrice = $('#maxSellPrice').val().trim();
        if (minSellPrice != "" && maxSellPrice != "") {
            if (!formValidator.isNonnegativeNumber(maxSellPrice) || !formValidator.isNonnegativeNumber(minSellPrice)) {
                new pospal.ui.msgBox({ content: "商品价格不能为负数" });
                return false;
            }
            if (parseFloat(minSellPrice) > parseFloat(maxSellPrice)) {
                new pospal.ui.msgBox({ content: "商品价格范围异常" });
                return false;
            }
        }

        var minStock = $('#minStock').val().trim();
        var maxStock = $('#maxStock').val().trim();
        if (minStock != "" && maxStock != "") {
            if (!formValidator.isNonnegativeNumber(maxStock) || !formValidator.isNonnegativeNumber(minStock)) {
                new pospal.ui.msgBox({ content: "库存不能为负数" });
                return false;
            }
            if (parseFloat(minStock) > parseFloat(maxStock)) {
                new pospal.ui.msgBox({ content: "库存范围异常" });
                return false;
            }
        }

        return true;
    },
    load: function () {
        var _this = this;
        if (!this.checkQueryCriterias()) return;

        var queryCriterias = this.buildBaseQueryCriterias();
        if (queryCriterias.queryString == "") queryCriterias.queryString = "<li>全部商品</li>";
        $("#conditionDiv").html(queryCriterias.queryString);
        $(".placeholderDiv").hide();
        _this.queryCriterias = queryCriterias;

        paging.opts.loadSummaryUrl = "/Product/LoadAddvancedProductSummary";
        paging.opts.loadContentUrl = "/Product/LoadAddvancedProductsByPage";
        paging.queryCriterias = null;
        paging.load(this.buildRequestQueryCriterias(queryCriterias));
    },
    ctrls: {
        tagAddvanSelectorWrap: function (opt) {
            var _this = this;
            this.opt = opt;
            opt.onChange = opt.onChange || function () { };
            var container = this.container = opt.container;

            _this.widget = new pospal.ui.tagAddvanSelector({
                title: opt.title,
                search: true,
                options: [],
                $bg: $(".popupBg"),
                onConfirm: function (val) {
                    setData(val);
                    opt.onChange();
                }
            });
            container.find(".multiText").next().click(function () {
                _this.widget.show(getData());
            });

            var setData = function (v) {
                container.data("value", v);
                container.find(".multiText").text(_this.getText().join('、'));
            }
            var getData = function () { return container.data("value") || []; }

            //method
            this.getText = function () {
                var v = getData();
                if (v.length == 0) return [opt.emptyText];
                var r = [];
                $.each(v, function (i, item) {
                    r.push(item.text + '：' + opt.formatText.WrapPts().replace("{0}", item.subOptions.length))
                });
                return r;
            }
            this.getValue = function () {
                var r = [];
                $.each(getData(), function (i, item) {
                    var g = [];
                    $.each(item.subOptions, function (i, item0) { g.push(item0.value) });
                    r.push(g);
                });
                return r.length == 0 ? null : { taggroups: r };
            }
            this.updateWithLabel = function (options, content) {
                setData([]);
                _this.widget.setTitle(_this.opt.title + (content ? " (" + content + ")" : ""));
                _this.widget.data = options;
            }
            this.clear = function () {
                setData([]);
                opt.onChange();
            }
        }
    }
};

exportProduct = {
    init: function () {
        var _this = this;

        $(".btnExport").bind("click", function () {
            var type = $(this).attr("data-type");
            if (type == null) {
                new pospal.ui.msgBox("配置加载中...请稍后再试");
                return;
            } else if (type == "1") {
                verifyCodeApp.show().then(function (verifyCode) {
                    _this.exportByPost(verifyCode);
                });
            } else {
                _this.exportByPost();
            }
        });
    },

    exportByPost: function (verifyCode) {
        var url = paging.opts.loadSummaryUrl == "/Product/LoadProductSummary" ? "/Export/Product" : "/Export/AddvancedProduct";
        var queryCriterias = paging.opts.loadSummaryUrl == "/Product/LoadProductSummary" ? buildBaseQueryCriterias() : addvancedProduct.queryCriterias;
        queryCriterias = $.extend({}, queryCriterias);
        delete queryCriterias.queryString;
        queryCriterias.groupBySpu = groupRadioBox.checked;//高级搜索目前兼容合并货号，改为单独取
        queryCriterias.verifyCode = verifyCode;
        queryCriterias.storeId = queryCriterias.userId;
        var ascEl = $("#scrollBox thead .thAsc,#scrollBox thead .thDesc").eq(0);

        queryCriterias.asc = false;
        if (ascEl && ascEl.length > 0) {
            queryCriterias.asc = $(ascEl).attr("class").indexOf("Asc") > -1;
            queryCriterias.orderColumn = $(ascEl).attr("data");
        }

        var loading = new pospal.ui.loading($("#mainArea"));
        pospal.ajax({
            url: url,
            data: queryCriterias,
            success: function (result) {
                if (result.successed) {
                    if (!result.useJob) {
                        pospal.formPost("/Export/DownLoadFile", result, false);
                    } else {
                        if (result.hasUnCompleteJob) {
                            userJobApp.showGuideMsgBox("您已提交过相同任务，等待处理中，请勿重复提交。<br/>任务编号：" + result.orderNo);
                        } else {
                            userJobApp.showGuideMsgBox("系统已收到导出任务。任务编号：" + result.orderNo, result.orderNo);
                        }
                    }
                } else {
                    new pospal.ui.msgBox({ content: result.msg || result.message, autoCloseSec: 0 });
                }
            },
            complete: function () {
                loading.destroy();
            }
        });

    }
};

var verifyCodeApp = {

    init: function () {
        var _this = this;
        this.container = $("#verifyCodeDiv");
        this.$btnGetVerifyCode = this.container.find(".btnGetCode");
        this.container.find(".popupClose").click(function () { _this.hide() });
        this.container.find(".confirm").click(function () { _this.confirm() });

        this.$btnGetVerifyCode.click(function () { _this.getVerifyCode(); });

    },

    getVerifyCode: function () {
        var _this = this;

        if (this.$btnGetVerifyCode.hasClass("red")) {
            new pospal.ui.msgBox("短信验证码已发送");
            return false;
        }

        var doing = new pospal.ui.loading(this.container);
        pospal.ajax({
            url: "/Setting/GetVerifyCode",
            data: {},
            success: function (result) {
                if (result.successed) {
                    new pospal.ui.msgBox("短信验证码已发送");
                    _this.senconds = 120;
                    _this.timer = setInterval(function () {
                        _this.countDown();
                    }, 1000);
                } else {
                    new pospal.ui.msgBox({ content: result.msg, autoCloseSec: 0 });
                }
            },
            complete: function () {
                doing.destroy();
            }
        });
    },

    countDown: function () {
        this.senconds--;
        if (this.senconds == 0) {
            this.$btnGetVerifyCode.html("获取手机验证码").removeClass("red");
            this.senconds = 120;
            clearInterval(this.timer);
        } else {
            this.$btnGetVerifyCode.html(this.senconds).addClass("red");
        }
    },

    show: function () {
        var _this = this,
            $tel = $("#verifyCodeDiv .tel");
        this.dtd = $.Deferred();
        $tel.html('');
        this.container.find("input[p-model=code]").val('');
        $("#popupBg,#verifyCodeDiv").show();
        var doing = new pospal.ui.loading($("#verifyCodeDiv"));
        pospal.ajax({
            url: "/Setting/GetStoreBindTelV2",
            data: {},
            success: function (result) {
                if (!result.tel) {
                    new pospal.ui.msgBox({
                        content: "当前账号尚未绑定手机号，无法申请导出。您需前往账户管理绑定手机！", autoCloseSec: 0, onClose: function () {
                            _this.hide();
                        }
                    })
                    return;
                }
                $tel.html(result.tel.replace(/^(\d{3})\d{4}/, '$1****'));
            },
            complete: function () {
                doing.destroy();
            }
        });
        return this.dtd;
    },

    confirm: function () {
        var v = this.container.find("input[p-model=code]").val();
        if (!v) {
            new pospal.ui.msgBox("请输入验证码");
            return;
        }
        this.hide();
        this.dtd.resolve(v);
    },

    hide: function () {
        $("#popupBg,#verifyCodeDiv").hide();
    }
};

var importWayApp = new pospal.ui.app({
    el: "#importWayDiv",
    methods: {
        init: function () {
            this._init();

            this.rg_Type = new pospal.ui.radioGroup($(this.el).find(".radioBox14"));
            this.rg_Type.setSelectedValue("0");
        },
        show: function () {
            layout.showOrHideEditArea(false);
            $("#popupBg").show();
            $(this.el).show();
        },
        hide: function () { $("#popupBg").hide(); $(this.el).hide(); },
        confirm: function () {
            var configValue = this.rg_Type.getSelectedValue();
            this.hide();
            if (configValue == "0" || configValue == "1")
                importProduct.show(configValue);
            else if (configValue == "2" || configValue == "3" || configValue == "4")
                batchEditImages.show(configValue);
        }
    }
});

importProduct = {
    currentFile: null,
    show: function (importWay) {
        this.importWay = importWay;
        if (importWay == "0") {
            $("#importDiv").find(".popupTitle>h1").text("● 批量导入");
            $("#importDiv").find("a[data-down1]").show();
            $("#importDiv").find("a[data-down2]").hide();
            $("#importDiv").find(".forMulColorSize").hide();
            $("#cb_createSupplier").show();
            if (pospal.website.industryNumber == 103) {
                $("#cb_createSupplier").hide();
                if (this.createSupplier) {
                    this.createSupplier.checked = false;
                    this.createSupplier.reset();
                }
            }
        } else if (importWay == "1") {
            $("#importDiv").find(".popupTitle>h1").text("● 多颜色尺码商品导入");
            $("#importDiv").find("a[data-down1]").hide();
            $("#importDiv").find("a[data-down2]").show();
            if (industryNumber == '106') {
                $(".hasProductMainCodeDes").hide();
            }
            $("#importDiv").find(".forMulColorSize").show();
            $("#cb_createSupplier").show();
        }
        layout.showOrHideEditArea(false);

        $("#popupBg").show();
        $("#importDiv").show();

        var textAreaHeight = $("#importDiv .leftArea").height() - $("#importDiv .editItem.tipIndex").height() - 170;
        $("#importMsg").height(textAreaHeight).text('导入支持格式为.xls或.xlsx的excel文件，一次导入不超过1500条记录。');

        this.importStoreSelector.setSelectedValue(userSelector.getSelectedValue());

        if (this.uploader == null) this.buildUploader();
        this.uploader.refresh();
        this.uploader.splice(0); //清空队列
        $("#importFileName").val(lang.tryGet("选择商品文件"));
        this.cb_createCategory.setValue(false);
        this.cb_createUnit.setValue(false);
        this.createProductbrand.setValue(false);
        if (this.createSupplier) this.createSupplier.setValue(false);
        this.rg_aboutExistingProduct.clean();
        this.rg_updateExistingExtBarcodes.set("1");
        $("#importDiv #importAttributeCheckBoxList div.checkBoxDiv:not(.disable)").each(function () {
            if ($(this).attr("origin-data") == 'true') {
                $(this).addClass("on");
            } else {
                $(this).removeClass("on");
            }
        });
    },

    hide: function () {
        $("#popupBg").hide();
        $("#importDiv").hide();
    },

    init: function () {
        var _this = this;

        this.importStoreSelector = new pospal.ui.singleSelector({
            container: $('#ddl_importStore'),
            textWidth: 226,
            selectBoxWidth: 222,
            withTip: true,
            options: storeOptions
        });

        this.cb_createCategory = new pospal.ui.checkBox({
            container: $("#cb_createCategory"),
            value: 1,
            text: "分类"
        });
        //子门店没有创建分类权限
        if (!hasAddProductCategoryAuth) $("#cb_createCategory").hide();

        if (hasProductBrandPrepay) {
            this.createProductbrand = new pospal.ui.checkBox({
                container: $("#cb_createProductbrand"),
                value: 1,
                text: "品牌"
            });
        }

        if ($("#cb_createSupplier").length > 0) {
            this.createSupplier = new pospal.ui.checkBox({
                container: $("#cb_createSupplier"),
                value: 1,
                text: "供货商"
            });
        }

        this.cb_createUnit = new pospal.ui.checkBox({
            container: $("#cb_createUnit"),
            value: 1,
            text: "单位"
        });

        this.rg_aboutExistingProduct = new pospal.ui.radioGroup($("#rg_aboutExistingProductDiv .radioBoxDiv"));
        this.rg_updateExistingProductStock = new pospal.ui.radioGroup($("#rg_updateExistingProductStockDiv .radioBoxDiv"));
        this.rg_updateExistingProductStock.set("1");
        this.rg_updateExistingExtBarcodes = new pospal.ui.radioGroup($("#rg_updateExistingExtBarcodesDiv .radioBoxDiv"));
        this.rg_updateExistingExtBarcodes.set("1");

        $("#importDiv #importAttributeCheckBoxList div.checkBoxDiv:not(.disable)").bind("click", function () {
            if ($(this).hasClass("on")) {
                $(this).removeClass("on");
            } else {
                $(this).addClass("on");
            }
        });

        $(".btnImport").bind("click", function () {
            importWayApp.show();
        });

        $("#importDiv .popupClose,#importDiv .btnCancel").bind("click", function () {
            _this.hide();
        });

        $("#importDiv .btnSave").bind("click", function () {

        });

        $("#importDiv .cb_importEditStock").hover(function () {
            $(this).find(".popupTip").show();
        }, function () {
            $(this).find(".popupTip").hide();
        });

        $("#importConfirmDiv .btnCancel,#importConfirmDiv .popupClose").bind("click", function () {
            _this.hideConfirm();
            $("#importMsg").text('文件已取消导入');
        });

        $("#importResultDiv .btnCancel,#importResultDiv .popupClose").bind("click", function () {
            _this.hideResult();
        });

        $("#importConfirmDiv .btnSave").bind("click", function () {
            _this.hideConfirm();
            //up 修改url，并重新上传
            var _up = _this.uploader;
            _up.refresh();
            _up.settings.url = _this.buildUploaderUrl();
            _up.addFile(_this.currentFile); //添加文件到队列

            _up.start();
            _up.disableBrowse(true);
        });

        $("#importResultDiv .btnDownload").bind("click", function () {
            pospal.formPost("/Export/DownLoadFile", $(this).data("errorFile"), false);
        });

        importWayApp.init();
    },

    buildUploaderUrl: function (onlyCheck) {
        var _this = this;
        var updateExistingProduct = _this.rg_aboutExistingProduct.getSelectedValue();
        var overwriteExistingProductStock = _this.rg_updateExistingProductStock.getSelectedValue() != "0";
        var updateExistingExtBarcodes = _this.rg_updateExistingExtBarcodes.getSelectedValue() == "1";
        var autoCreateCategoryType = getCategoryType();
        var uploadUrl = "/Product/ImportProductsFromExcelV2?storeId=" + _this.importStoreSelector.getSelectedValue() + "&autoCreateCategory=" + _this.cb_createCategory.checked
            + "&autoCreateUnit=" + _this.cb_createUnit.checked + "&updateExistingProduct=" + (updateExistingProduct == 1) + "&autoCreateProductbrand=" + _this.createProductbrand.checked
            + "&updateExistingExtBarcodes=" + updateExistingExtBarcodes + "&overwriteExistingProductStock=" + overwriteExistingProductStock;
        if (_this.createSupplier) {
            uploadUrl += "&autoCreateSupplier=" + _this.createSupplier.checked;
        }

        if (_this.rg_updateExistingProductTag)
            uploadUrl += "&updateExistingProductTag=" + (_this.rg_updateExistingProductTag.getSelectedValue() == "1");
        if (_this.importWay == "1") {
            uploadUrl += "&forMulColorSize=true";
        }
        if (autoCreateCategoryType && autoCreateCategoryType != 0 && autoCreateCategoryType != 2) {
            uploadUrl += "&autoCreateCategoryType=" + autoCreateCategoryType;
        }
        var filterType = getFilterType();
        uploadUrl += "&filterType=" + filterType;

        if (onlyCheck) {
            uploadUrl += "&onlyCheck=true";
        }
        return uploadUrl;
    },

    buildUploader: function () {
        var _this = this;

        var opts = {};
        opts.browse_button = "btnPickFile";
        opts.url = "/Product/ImportProductsFromExcelV2";
        opts.multi_selection = false;
        opts.max_file_size = $("#maxExcelExt").val() + 'mb';
        opts.extensions = "xls,xlsx";
        opts.PostInit = function (up) {
            $("#btnUploadFile").bind("click", function () {
                if (up.files.length == 0) {
                    $("#importMsg").text(lang.tryGet("选择商品文件") + "!");
                    $("#importFileName").val(lang.tryGet("选择商品文件"));
                } else if (up.files.length > 1) {
                    $("#importMsg").text(lang.tryGet("只选择一个文件"));
                } else {
                    var updateExistingProduct = _this.rg_aboutExistingProduct.getSelectedValue();
                    if (updateExistingProduct == null) {
                        new pospal.ui.msgBox(lang.tryGet("选择已有商品是否更新"));
                    } else {
                        up.settings.url = _this.buildUploaderUrl(true);

                        var updateExistingAttributes = [];
                        $("#importDiv #importAttributeCheckBoxList div.checkBoxDiv.on").each(function (index, item) {
                            if ($(item).find("div").attr("data")) {
                                updateExistingAttributes.push($(item).find("div").attr("data"));
                            }
                        });
                        up.settings.multipart_params = {
                            'updateExistingAttributes': JSON.stringify(updateExistingAttributes)
                        };
                        _this.currentFile = up.files[0].getNative();//缓存当前文件，用于二次上传

                        up.start();
                        up.disableBrowse(true);
                    }
                }
                return false;
            });
        }

        opts.FilesAdded = function (up, files) {

            //清空队列前面文件
            up.splice(0, up.files.length - 1);

            var selectedFile = files[0];
            var msg = selectedFile.name + "(" + (selectedFile.size / 1024) + "k)";

            $("#importFileName").val(msg);

            $("#importMsg").text(lang.format('当前选择的文件', [msg]));
        }

        opts.UploadProgress = function (up, file) {
            if (file.percent == 100) {
                $("#importMsg").text(lang.tryGet("文件上传成功"));
            }

            $("#uploadPercent").css("width", file.percent + "%");
        }

        opts.FileUploaded = function (up, file, response) {
            if (response != null && response.response != null && response.response != "") {
                var result = JSON.parse(response.response);

                if (result.successed) {
                    if (result.invalidColumns && result.invalidColumns.length) {
                        _this.showConfirm(result.invalidColumns);
                    }
                    else {
                        _this.hide();
                        var msg = result.msg || lang.tryGet("商品导入成功")
                        $("#importMsg").text(msg);
                        _this.showResult(result);
                    }
                } else {
                    $("#importMsg").text("导入商品失败！\n" + result.msg.replace("\\n", "\n"));

                }
            }
            up.disableBrowse(false);
            up.splice(0, up.files.length);
        }

        opts.Error = function (up, err) {
            var err = err.file.name + "：" + err.message;
            $("#importMsg").text(err);

            up.disableBrowse(false);
        }

        _this.uploader = pospal.buildUploader(opts);
    },

    showConfirm: function (invalidColumns) {
        var $div = $("#importConfirmDiv .invalidCols").empty();
        if (invalidColumns && invalidColumns.length > 0) {
            $.each(invalidColumns, function (index, item) {
                $("<strong/>").text(item).appendTo($div);
            });
        }

        $("#importConfirmDiv,#importPopupBg").show();
    },

    hideConfirm: function () {
        $("#importConfirmDiv,#importPopupBg").hide();
    },

    showResult: function (result) {
        $("#importResultDiv .successCount").text(result.successCount);
        $("#importResultDiv .errorCount").text(result.errorCount);

        var hasError = result.errorCount && result.errorFile;
        $("#importResultDiv .successDiv")[hasError ? "hide" : "show"]();
        $("#importResultDiv .errorDiv")[hasError ? "show" : "hide"]();
        $("#importResultDiv .btnDownload").data("errorFile", result.errorFile);
        $("#importResultDiv,#popupBg").show();
    },
    hideResult: function () {
        var _this = this;
        $("#importResultDiv,#popupBg").hide();
        reLoadProducts(_this.importStoreSelector.getSelectedValue());
    },
};

copyProduct = {
    userCheckedDic: {},
    init: function () {
        var _this = this;

        this.defaultKeyword = lang.tryGet("搜索门店关键字", true);

        this.rg_copyType = new pospal.ui.radioGroup($("#copyTypeDiv .radioBox14"));
        $("#copyTypeDiv .radioBox14").bind("click", function () {
            $("#copyTypeDiv.radioGroup .option").removeClass("on");
            $(this).parent().addClass("on");

            if (_this.rg_copyType.getSelectedValue() == 1) {
                $("#copyNewProductOptionDiv").show();
                $("#updateProductOptionDiv").hide();
            } else {
                $("#copyNewProductOptionDiv").hide();
                $("#updateProductOptionDiv").show();
            }
            _this.triggerIsWeighing();
        });

        $(".btnCopy").bind("click", function () {
            _this.show();
            if (hasMultiCopyIndusAuth) {
                //请求当前门店商品总数
                var doing = new pospal.ui.loading($("#copyDiv"));
                pospal.ajax({
                    url: "/Product/LoadProductSummary",
                    data: { userId: userSelector.getSelectedValue(), enable: 1, productTagUidsJson: '[]' },
                    success: function (result) {
                        if (result.successed) {
                            $('#copyDiv .totalRecord font').text(result.totalRecord);
                            $('#copyDiv .totalRecord').show();

                        }
                        else {
                            new pospal.ui.msgBox({ content: result.msg });
                        }
                    },
                    complete: function () {
                        doing.destroy();
                    }
                });
            }
        });

        $("#copyDiv .popupClose").bind("click", function () {
            _this.hide();
        });

        $("#copyDiv .confirm").bind("click", function () {
            _this.copy();
        })

        $("#copyDiv .storeKeyword").keyup(function () {
            _this.filtStores();
        })

        $("#copyDiv .moreCustomerPriceArrow").click(function () {
            if ($(this).hasClass("down")) {
                $(this).parent().next(".moreCustomerPriceCopyDiv").hide();
                $(this).removeClass("down").addClass("up");
            }
            else {
                $(this).parent().next(".moreCustomerPriceCopyDiv").show();
                $(this).removeClass("up").addClass("down");
            }

            return false;
        })

        $("#copyNewProductOptionDiv .attributeCheckBoxAll").bind("click", function () {
            if ($(this).hasClass("on")) {
                $(this).removeClass("on").removeClass("indeterminate");
                $("#copyNewProductOptionDiv .attributeCheckBoxList div.checkBoxDiv").removeClass("on").removeClass("indeterminate");
            } else {
                $(this).addClass("on").removeClass("indeterminate");
                $("#copyNewProductOptionDiv .attributeCheckBoxList div.checkBoxDiv").addClass("on").removeClass("indeterminate");
            }

            _this.triggerIsWeighing();
        });

        $("#copyNewProductOptionDiv .attributeCheckBoxList div.checkBoxDiv").bind("click", function () {
            if ($(this).hasClass("on")) {
                $(this).removeClass("on").removeClass("indeterminate");
            } else {
                $(this).addClass("on").removeClass("indeterminate");
            }

            if ($(this).find("div").attr("data") == "isWeighing") {
                _this.triggerIsWeighing();
            }

            $("#copyNewProductOptionDiv .attributeCheckBoxAll").removeClass("indeterminate");
            if ($(this).parent().find("div.checkBoxDiv:not(.on)").length == 0) {
                $("#copyNewProductOptionDiv .attributeCheckBoxAll").addClass("on").removeClass("indeterminate");
            } else {
                $("#copyNewProductOptionDiv .attributeCheckBoxAll").removeClass("on").removeClass("indeterminate");
                if ($(this).parent().find("div.checkBoxDiv.on").length > 0) {
                    $("#copyNewProductOptionDiv .attributeCheckBoxAll").addClass("indeterminate");
                }
            }

            //多级会员价特殊处理
            if ($(this).find("div").attr("data") == "customerPrice") {
                if ($(this).hasClass("on")) {
                    $("#copyNewProductOptionDiv .moreCustomerPriceOption").addClass("on").removeClass("indeterminate");
                }
                else {
                    $("#copyNewProductOptionDiv .moreCustomerPriceOption").removeClass("on").removeClass("indeterminate");
                }
            }

            if ($(this).hasClass("moreCustomerPriceOption")) {
                if ($("#copyNewProductOptionDiv .moreCustomerPriceOption.on").length == 0) {
                    $("#copyNewProductOptionDiv .customerPriceOption").removeClass("on").removeClass("indeterminate");
                }
                else {
                    $("#copyNewProductOptionDiv .customerPriceOption").addClass("on").removeClass("indeterminate");
                    if ($("#copyNewProductOptionDiv .moreCustomerPriceOption:not(.on)").length > 0) {
                        $("#copyNewProductOptionDiv .customerPriceOption").addClass("indeterminate");
                    }
                }
            }
        });
        var checkAll = function (obj) {
            var group = $(obj).attr("data-group") || $(obj).attr("id");
            $("#" + group).removeClass("indeterminate");
            if ($("div.checkBoxDiv[data-group=" + group + "]:not(.on):not(.disable)").length == 0) {
                $("#" + group).addClass("on").removeClass("indeterminate");
            } else {
                $("#" + group).removeClass("on").removeClass("indeterminate");
                if ($("div.checkBoxDiv[data-group=" + group + "].on").length > 0) {
                    $("#" + group).addClass("indeterminate");
                }
            }
            if ($(obj).parents("#updateProductOptionDiv .attributeCheckBoxList").find("div.checkBoxDiv[data-group]:not(.on):not(.disable)").length == 0) {
                $("#updateProductOptionDiv .attributeCheckBoxAll").addClass("on").removeClass("indeterminate");
            } else {
                $("#updateProductOptionDiv .attributeCheckBoxAll").removeClass("on").removeClass("indeterminate");
                if ($(obj).parents("#updateProductOptionDiv .attributeCheckBoxList").find("div.checkBoxDiv[data-group].on").length > 0) {
                    $("#updateProductOptionDiv .attributeCheckBoxAll").addClass("indeterminate");
                }
            }
        };
        var groupIds = ["#basicProperty", "#stockProperty", "#priceProperty"];
        $("#updateProductOptionDiv .attributeCheckBoxAll").bind("click", function () {
            var $checkAllOptions = $("#updateProductOptionDiv .attributeCheckBoxList div.checkBoxDiv[data-group]:not(.disable):not(.checkAllExcluded)");
            if ($checkAllOptions.filter(":not(.on)").length == 0) {
                $checkAllOptions.removeClass("on").removeClass("indeterminate");
            } else {
                $checkAllOptions.addClass("on").removeClass("indeterminate");
            }

            _this.triggerIsWeighing();
            $.each(groupIds, function (index, groupId) {
                var $firstGroupOption = $("#updateProductOptionDiv div.checkBoxDiv[data-group=" + groupId.substring(1) + "]").first();
                if ($firstGroupOption.length > 0) checkAll($firstGroupOption);
            });
        });
        $(groupIds.join(",")).bind("click", function () {
            var $groupCheckAllOptions = $("#updateProductOptionDiv div.checkBoxDiv[data-group=" + $(this).attr("id") + "]:not(.disable):not(.checkAllExcluded)");
            if ($groupCheckAllOptions.filter(":not(.on)").length == 0) {
                $groupCheckAllOptions.removeClass("on").removeClass("indeterminate");
            } else {
                $groupCheckAllOptions.addClass("on").removeClass("indeterminate");
            }

            _this.triggerIsWeighing();


            checkAll(this);
        });
        $("#updateProductOptionDiv .attributeCheckBoxList div.checkBoxDiv:not(.disable)").bind("click", function () {
            var id = $(this).attr("id");
            var group = $.grep(groupIds, function (groupId, index) { return "#" + id == groupId });
            if (group.length > 0) return false;

            if ($(this).hasClass("on")) {
                $(this).removeClass("on").removeClass("indeterminate");
            } else {
                $(this).addClass("on").removeClass("indeterminate");
            }

            //多级会员价特殊处理
            if ($(this).find("div").attr("data") == "customerPrice") {
                if ($(this).hasClass("on")) {
                    $("#updateProductOptionDiv .moreCustomerPriceOption").addClass("on").removeClass("indeterminate");
                }
                else {
                    $("#updateProductOptionDiv .moreCustomerPriceOption").removeClass("on").removeClass("indeterminate");
                }
            }

            if ($(this).hasClass("moreCustomerPriceOption")) {
                if ($("#updateProductOptionDiv .moreCustomerPriceOption.on").length == 0) {
                    $("#updateProductOptionDiv .customerPriceOption").removeClass("on").removeClass("indeterminate");
                }
                else {
                    $("#updateProductOptionDiv .customerPriceOption").addClass("on").removeClass("indeterminate");
                    if ($("#updateProductOptionDiv .moreCustomerPriceOption:not(.on)").length > 0) {
                        $("#updateProductOptionDiv .customerPriceOption").addClass("indeterminate");
                    }
                }
            }
            if ($(this).find("div").attr("data") == "isWeighing") {
                _this.triggerIsWeighing();
            }

            checkAll(this);
        });

        $("#copyDiv .checkBoxDiv").addClass("checkBoxDivN");
    },

    triggerIsWeighing: function () {
        var $container = this.rg_copyType.getSelectedValue() == "1" ? $("#copyNewProductOptionDiv") : $("#updateProductOptionDiv");
        if ($container.find("[data='isWeighing']").length > 0 && $container.find("[data='isAllowUpdateSaleQuantity']").length > 0) {
            $checkBox = $container.find("[data='isWeighing']").parent();
            if ($checkBox.hasClass("on")) {
                $container.find("[data='isAllowUpdateSaleQuantity']").parent().removeClass("indeterminate").show();
            }
            else {
                $container.find("[data='isAllowUpdateSaleQuantity']").parent().removeClass("on").removeClass("indeterminate").hide();
            }
        }
    },

    show: function () {
        layout.showOrHideEditArea(false);
        $("#copyDiv .storeKeyword").val(this.defaultKeyword);
        $("#copyDiv .processDiv").html('');
        this.userCheckedDic = {};//初始化已选中


        var _this = this;
        var excludeStoreId = userSelector.getSelectedValue();
        var doing = new pospal.ui.loading($("#mainArea"));
        pospal.ajax({
            url: "/Account/LoadSubStoresByUserIdDDLJson",
            data: { userId: currentUserId, withSelf: true, withParent: true, withCreatedDatetime: pospal.getStoreCount(storeOptions) > 2000, simple: true },
            success: function (result) {
                if (result.successed) {
                    if (result.stores.length > 0) {
                        _this.stores = result.stores;
                        if (_this.toStoreSelector) _this.toStoreSelector.destroyItem();
                        var $checkAll = new pospal.ui.checkBox({
                            container: $("<div/>").appendTo($("#copyDiv .checkAllDiv").empty()),
                            text: lang.tryGet("全选", true),
                            clickCallBack: function () {
                                _this.toStoreSelector.checkAllClickCallBack();
                            }
                        });
                        $("#copyDiv .checkBoxDiv").addClass("checkBoxDivN");

                        _this.$checkAll = $checkAll;
                        _this.toStoreSelector = new pospal.storeSelectorV2({
                            title: "",
                            operTip: '',
                            width: 490,
                            mainUI: $("#copyDiv"),
                            mainArea: $("#copyDiv .mainArea.copyStore"),
                            bottomUI: $("#copyDiv .popupBottom"),
                            cb_checkAll: $checkAll,
                            selectedNumId: "copyToSeltStoreNum",
                            allStoreNumId: "copyToStoreNum",
                            withCreatedDatetime: pospal.getStoreCount(result.stores, 'subUsers') > 2000,
                            options: result.stores,
                            excludeStoreIds: [excludeStoreId],
                            showImport: true,
                            isValid: function () {
                                return true;
                            },
                            onConfirm: function () {

                            }
                        });

                        setTimeout(function () { $("#popupBg,#copyDiv").show(); }, 500);
                    } else {
                        new pospal.ui.msgBox(lang.tryGet("未找到子门店"));
                    }
                }
            },
            complete: function () { doing.destroy(); }
        });
        $("#copyToSeltStoreNum").html('0');
    },

    hide: function () {
        $("#popupBg,#copyDiv").hide();
    },

    bulidStoreList: function (stores) {
        var _this = this;
        $ul = $("#copyDiv ul").empty();
        $.each(stores, function (index, item) {
            var $li = $("<li/>").html("<div></div>").appendTo($ul);
            var checkBox = new pospal.ui.checkBox({
                container: $li.find("div"),
                text: item.company,
                value: item.id,
                checked: _this.userCheckedDic[item.id] || false,
                clickCallBack: function () {
                    checkBox.checked ? $li.find("em").addClass("on") : $li.find("em").removeClass("on");
                    _this.updateCheckStatus(checkBox.getValue(), checkBox.checked);
                    _this.checkAll();
                    $("#copyToSeltStoreNum").html(_this.getSelectedStoreIds().length);
                }
            });
            $("<em/>").bind("click", function () {
                var errorMsg = $(this).parent().data("error");
                if (errorMsg.length > 0) new pospal.ui.msgBox({ content: errorMsg, autoCloseSec: 0 });
            }).appendTo($li);
            $li.data("checkBox", checkBox);
        });
        var $checkAll = new pospal.ui.checkBox({
            container: $("<div/>").appendTo($("#copyDiv .checkAllDiv").empty()),
            text: lang.tryGet("全选", true),
            clickCallBack: function () {
                $ul.find("li").each(function (index, item) {
                    var checkBox = $(item).data("checkBox");
                    checkBox.checked = $checkAll.checked;
                    checkBox.reset();
                    checkBox.checked ? $(item).find("em").addClass("on") : $(item).find("em").removeClass("on");
                    _this.updateCheckStatus(checkBox.getValue(), $checkAll.checked);
                });
                $("#copyToSeltStoreNum").html($checkAll.checked ? $("#copyToStoreNum").html() : 0);
            }
        });
        $("#copyDiv .checkBoxDiv").addClass("checkBoxDivN");

        this.$checkAll = $checkAll;
        $("#copyToStoreNum").html(!stores ? 0 : stores.length);
    },

    filtStores: function () {
        var keyword = $("#copyDiv .storeKeyword").val().trim().toLowerCase();
        if (keyword == this.defaultKeyword) keyword == "";

        var filtedStores = this.stores;
        if (keyword.length > 0) {
            filtedStores = $.grep(this.stores, function (item, index) {
                return item.company.toLowerCase().indexOf(keyword) > -1
            });
        }
        this.bulidStoreList(filtedStores);
    },

    copy: function () {
        var _this = this;

        var copyType = this.rg_copyType.getSelectedValue();
        if (copyType == null) {
            new pospal.ui.msgBox(lang.tryGet("选择复制类型"));
        } else {
            _this.toStoreSelector.clearSyncInfo();
            var data = { fromUserId: userSelector.getSelectedValue(), categoryType: ((isMeiYe || isYiPei || isPetHospital || isMuYinSecondary) ? getCategoryType() : null) };

            if (copyType == 1) {
                var donnotCopyAttributeList = [];
                $("#copyNewProductOptionDiv .attributeCheckBoxList div.checkBoxDiv:not(.on)").each(function (index, item) {
                    donnotCopyAttributeList.push($(item).find("div").attr("data"));
                });
                if (pospal.isInArray(sysDonnotCopyAttributeList, "buyPrice")) donnotCopyAttributeList.push("buyPrice");
                if (pospal.isInArray(sysDonnotCopyAttributeList, "stockPosition")) donnotCopyAttributeList.push("stockPosition");
                if (pospal.isInArray(sysDonnotCopyAttributeList, "productTag")) donnotCopyAttributeList.push("productTag");
                if (pospal.isInArray(sysDonnotCopyAttributeList, "minStock")) donnotCopyAttributeList.push("minStock");
                if (pospal.isInArray(sysDonnotCopyAttributeList, "maxStock")) donnotCopyAttributeList.push("maxStock");
                data.donnotCopyAttributesJson = JSON.stringify(donnotCopyAttributeList);
                this.ajaxCopyToStores("/Product/CopyProducts", data, true);
            } else {
                var syncAttributeList = [];
                $("#updateProductOptionDiv .attributeCheckBoxList div.checkBoxDiv.on").each(function (index, item) {
                    if ($(item).find("div").attr("data")) {
                        syncAttributeList.push($(item).find("div").attr("data"));
                    }
                });
                if (hasProductAttribute9) syncAttributeList.push("attribute9");
                data.syncAttributesJson = JSON.stringify(syncAttributeList);

                if (syncAttributeList.length == 0) {
                    new pospal.ui.msgBox(lang.tryGet("选择同步属性"));
                } else {
                    if (pospal.isInArray(syncAttributeList, "spu")) {
                        new pospal.ui.msgBox({
                            boxType: "confirm",
                            content: "若所选门店已存在多规格商品，则将被覆盖现有的商品规格组及规格换算关系。覆盖后将无法恢复，请确认是否覆盖？",
                            confirmText: lang.tryGet("是"),
                            cancelText: lang.tryGet("否"),
                            onConfirm: function () {
                                if (this.confirmValue) {
                                    _this.ajaxCopyToStores("/Product/SyncProducts", data, true);
                                }
                            }
                        });
                    }
                    else {
                        this.ajaxCopyToStores("/Product/SyncProducts", data, true);
                    }
                }
            }
        }
    },

    ajaxCopyToStores: function (url, data, useJob) {
        var _this = this;
        var toStoreIds = this.getSelectedStoreIds();
        if (toStoreIds.length == 0) {
            new pospal.ui.msgBox(lang.tryGet("门店必选"));
            return false;
        }

        var copyLimit = $("#hf_userJobToCopyProductLimit").val();
        if (useJob && hasUserJobServiceAuth) {
            this.createdJob = false;
            var postData = {};
            postData.action = url.substring(url.lastIndexOf("\/") + 1, url.length);
            postData.toUserIds = toStoreIds;
            $.extend(postData, data);

            _this.saveUserJob(postData);
            if (this.createdJob) return;
        }

        var failedNum = 0;
        var doing = new pospal.ui.loading($("#copyDiv"), true);
        function ajaxPost(index) {
            if (index < toStoreIds.length) {
                var toStoreId = toStoreIds[index];
                data.toUserId = toStoreId;
                if (_this.toStoreSelector) _this.toStoreSelector.setSyncInfo(toStoreId, lang.tryGet("进行中"), '');
                pospal.ajax({
                    url: url,
                    data: data,
                    success: function (result) {
                        if (result.successed) {
                            if (_this.toStoreSelector) _this.toStoreSelector.setSyncInfo(toStoreId, lang.tryGet("已完成"), '');
                        } else {
                            failedNum++;
                            if (_this.toStoreSelector) _this.toStoreSelector.setSyncInfo(toStoreId, lang.tryGet("复制失败"), result.msg.replace("\\n", "\n"));
                        }
                        _this.buildProcessUI(index);
                        if (index == toStoreIds.length - 1) {
                            doing.destroy();
                            if (failedNum == 0) {
                                new pospal.ui.msgBox({ content: lang.tryGet("商品复制成功"), autoCloseSec: 0 });
                                //_this.hide();
                            } else {
                                new pospal.ui.msgBox({ content: lang.format("复制失败提示", [failedNum]), autoCloseSec: 0 });
                            }

                        } else {
                            ajaxPost(++index);
                        }
                    },
                    complete: function () { }
                });
            }
        }

        ajaxPost(0);
    },

    saveUserJob: function (postData) {
        var _this = this;
        var loading = new pospal.ui.loading($("#copyDiv"), true);
        pospal.ajax({
            url: "/Product/SaveCopyProductsUserJobCondition",
            data: postData,
            async: false,
            success: function (result) {
                if (result.successed) {
                    if (result.useJob) {
                        if (result.hasLimit) {
                            new pospal.ui.msgBox({ content: result.msg, autoCloseSec: 0 });
                        }
                        else if (result.hasUnCompleteJob) {
                            userJobApp.showGuideMsgBox("您已提交过相同任务，等待处理中，请勿重复提交。<br/>任务编号：" + result.orderNo);
                        } else {
                            userJobApp.showGuideMsgBox("系统已收到复制任务，任务编号：" + result.orderNo);
                        }

                        _this.hide();
                        _this.createdJob = true;
                    }
                } else {
                    _this.createdJob = false;
                }
            },
            complete: function () {
                loading.destroy();
            }
        });
    },

    getSelectedStoreIds: function () {
        var selectedStoreIds = [];
        if (this.toStoreSelector) selectedStoreIds = this.toStoreSelector.getSelectedUserIds(true);
        var excludeStoreId = userSelector.getSelectedValue();
        var index = pospal.findIndex(selectedStoreIds, function (n) { return n == excludeStoreId; });
        if (index > -1) selectedStoreIds.splice(index, 1);
        return selectedStoreIds;
    },
    checkAll: function ($li) {
        var _this = this;

        //重置全选按钮
        this.$checkAll.checked = true;
        this.$checkAll.reset();
        if ($("#copyDiv ul li").length == 0) {
            _this.$checkAll.checked = false;
            _this.$checkAll.reset();
        }
        else {
            $("#copyDiv ul li").each(function (index, item) {
                var checkBox = $(item).data("checkBox");
                if (!checkBox.checked) {
                    _this.$checkAll.checked = false;
                    _this.$checkAll.reset();
                    return false;
                }
            });
        }
    },
    updateCheckStatus: function (userId, isChecked) {
        this.userCheckedDic[userId] = isChecked;
    },

    buildProcessUI: function (index) {
        var allStoreNum = this.getSelectedStoreIds().length;
        var currentIndex = index + 1;
        var percent = currentIndex == 0 ? "0" : Math.ceil(currentIndex * 100 / allStoreNum).toString();

        $("#copyDiv .processDiv").html('进度：{0}/{1} = {2}%'.WrapPts().format(currentIndex, allStoreNum, percent));
    }
};

editStoreProductUnits = {
    show: function () {
        //layout.showOrHideEditArea(false);

        $("#popupBg").show();
        $("#editUnitDiv").show();

        this.buildUnitListUI();
    },

    hide: function () {
        $("#popupBg").hide();
        $("#editUnitDiv").hide();

        editProduct.refreshUnitSelector();
    },

    init: function () {
        var _this = this;

        $("#editUnitDiv .popupClose").bind("click", function () {
            _this.hide();
        });

        $(".btnEditUnits").bind("click", function () {
            _this.show();
        });

        $("#editUnitDiv .btnAddUnit").bind("click", function () {
            _this.addUnit();
        });
    },

    buildUnitListUI: function () {
        var _this = this;

        var ul = $("#editUnitDiv .unitDivUl");
        ul.html("");

        for (var i = 0; i < storeProductUnits.length; i++) {
            var unit = storeProductUnits[i];
            var li = $("<li/>").appendTo(ul);

            _this.buildUnitLi(unit, li);
        }

        $("#editUnitDiv .unitNum b").html(storeProductUnits.length);

        _this.buildBlankLi();
    },

    buildUnitLi: function (unit, e) {
        var _this = this;

        var li = $(e);
        li.html("");

        $("<span/>").html(unit.name).appendTo(li);
        $("<div/>").addClass("btnEditSmall").html("<b>" + lang.tryGet("编辑") + "</b>").appendTo(li);
        $("<div/>").addClass("btnDeleteSmall").html("<b>" + lang.tryGet("删除") + "</b>").appendTo(li);

        li.find(".btnEditSmall").bind("click", function () {
            _this.showEdit($(li));
        });

        li.find(".btnDeleteSmall").bind("click", function () {
            _this.delUnit($(li));
        });

        li.data("id", unit.id);
    },

    buildBlankLi: function () {
        var ul = $("#editUnitDiv .unitDivUl");

        var blankLiNum = 0;
        if (storeProductUnits.length < 24) {
            blankLiNum = 24 - storeProductUnits.length;
        } else {
            if (storeProductUnits.length % 4 > 0)
                blankLiNum = 4 - storeProductUnits.length % 4;
        }

        if (blankLiNum > 0) {
            for (var i = 0; i < blankLiNum; i++) {
                $("<li/>").addClass("blank").appendTo(ul);
            }
        }
    },

    showEdit: function (e) {
        var _this = this;

        var li = $(e);
        var unitName = li.find("span").html();

        li.html("");
        $("<input  maxlength='8' autocomplete='off' />").addClass("quantity").val(unitName).appendTo(li);
        $("<div />").addClass("btnSubmitSmall").html("<b>" + lang.tryGet("保存") + "</b>").appendTo(li);

        li.find(".btnSubmitSmall").bind("click", function () {
            _this.updateUnit($(this).parent());
        });

        li.find("input").select();
    },

    updateUnit: function (e) {
        var _this = this;
        var li = $(e);

        var id = li.data("id");
        var unitName = li.find("input").val().trim();
        if (unitName == "") {
            new pospal.ui.msgBox(lang.tryGet("请输入单位"));
            li.find("input").select();
            return false;
        }

        var arr = $.grep(storeProductUnits, function (unit, i) {
            return unit.name == unitName && unit.id != id;
        });
        if (arr.length > 0) {
            new pospal.ui.msgBox(lang.format("新单位已存在", [unitName]));
            li.find("input").select();
            return false;
        }

        var updating = new pospal.ui.loading($("#editUnitDiv"));
        pospal.ajax({
            url: "/Product/UpdateStoreProductUnit",
            data: { "unitId": id, "unitName": unitName },
            success: function (result) {
                if (result.successed) {
                    //new pospal.ui.msgBox("商品单位已成功修改");
                    if (unitName == "斤" || unitName == "市斤") {
                        new pospal.ui.msgBox({ content: "根据市场监督局要求，不得使用非法计量单位“斤”或“市斤”，建议您将商品单位修改为“公斤”或“千克”。", boxType: "toast", autoCloseSec: 5000 });
                    }
                    for (var i = 0; i < storeProductUnits.length; i++) {
                        var storeProductUnit = storeProductUnits[i];
                        if (storeProductUnit.id == id) {
                            storeProductUnit.name = unitName;
                            _this.buildUnitLi(storeProductUnit, li);
                            break;
                        }
                    }
                }
            },
            complete: function () { updating.destroy(); }
        });

    },

    delUnit: function (e) {
        var _this = this;
        var li = $(e);

        var id = li.data("id");

        var deleting = new pospal.ui.loading($("#editUnitDiv"));
        pospal.ajax({
            url: "/Product/DeleteStoreProductUnit",
            data: { "unitId": id },
            success: function (result) {
                if (result.successed) {
                    //new pospal.ui.msgBox("商品单位已成功删除");

                    for (var i = 0; i < storeProductUnits.length; i++) {
                        var storeProductUnit = storeProductUnits[i];
                        if (storeProductUnit.id == id) {
                            storeProductUnits.splice(i, 1);
                            _this.buildUnitListUI();
                            break;
                        }
                    }

                } else {
                    new pospal.ui.msgBox({
                        content: result.msg,
                        autoCloseSec: 0
                    });
                }
            },
            complete: function () { deleting.destroy(); }
        });
    },

    addUnit: function () {
        var _this = this;

        var unitName = $("#editUnitDiv input.newUnitName").val().trim();
        if (unitName == "" || unitName == lang.tryGet("输入新单位")) {
            new pospal.ui.msgBox(lang.tryGet("请输入单位名称"));
            $("#editUnitDiv input.newUnitName").select();
            return false;
        }

        var arr = $.grep(storeProductUnits, function (unit, i) {
            return unit.name == unitName;
        });

        if (arr.length > 0) {
            new pospal.ui.msgBox(lang.tryGet("新增单位已存在"));
            $("#editUnitDiv input.newUnitName").select();
            return false;
        }

        var adding = new pospal.ui.loading($("#editUnitDiv"));
        pospal.ajax({
            url: "/Product/AddStoreProductUnit",
            data: { "userId": userSelector.getSelectedValue(), "unitName": unitName },
            success: function (result) {
                if (result.successed) {
                    storeProductUnits.push(result.productUnit);

                    _this.buildUnitListUI();

                    if (unitName == "斤" || unitName == "市斤") {
                        new pospal.ui.msgBox({ content: "根据市场监督局要求，不得使用非法计量单位“斤”或“市斤”，建议您将商品单位修改为“公斤”或“千克”。", boxType: "toast", autoCloseSec: 5000 });
                    }
                    //new pospal.ui.msgBox("已成功新增单位：" + unitName);

                    $("#editUnitDiv input.newUnitName").val("");
                    $("#editUnitDiv input.newUnitName").focus();
                }
            },
            complete: function () { adding.destroy(); }
        });
    }
};

editStorePrinters = {
    orderTypeNames: [],
    orderTypeClass: [],
    init: function () {
        var _this = this;
        _this.orderTypeNames = '全选,饿了么,美团,百度,自营-堂食,自营-外卖,平台,自营-自取,POS,抖音小时达,京东秒送,POS-叫起小票'.split(',');
        _this.orderTypeClass = "all,eleme,meituan,elebe,ziying_ts,ziying_wm,platform_order,ziying_zq,pos,DOUYIN_HOUR,JDDJ_MIAOSONG".split(',');
        $(".btnShowEditPrinterDiv").bind("click", function () {
            //layout.showOrHideEditArea(false);
            _this.show();
        });

        $("#editPrinterDiv .popupClose,#editPrinterDiv .btnCancel").bind("click", function () {
            _this.hide();
        });

        $("#editPrinterDiv .btnSave").bind("click", function () {
            _this.save();
        });

        $("#editPrinterDiv .add").bind("click", function () {
            _this.addNewPrinterUI();
        });

        this.printerPrintSizeSelector = new pospal.ui.singleSelector({
            container: $("#ddl_printerPrintSize"),
            textWidth: { cn: 60, en: 60 },
            selectBoxWidth: { cn: 64, en: 130 },
            options: [{ text: "58mm", value: "0" }, { text: "80mm", value: "1" }, { text: "110mm", value: "2" }],
            selectedValue: 1,
            onChange: function () {
                var doing = new pospal.ui.loading($("#editPrinterDiv"));
                pospal.ajax({
                    url: "/Setting/UpdateUserConfig",
                    data: {
                        "userId": userSelector.getSelectedValue(),
                        "typeNumber": 1220,
                        "value": _this.printerPrintSizeSelector.getSelectedValue()
                    },
                    success: function (result) {
                        if (result.successed) {

                        }
                    },
                    complete: function () {
                        doing.destroy();
                    }
                });
            }
        });

        this.printerPrintSortSelector = new pospal.ui.singleSelector({
            container: $("#ddl_printerPrintSort"),
            textWidth: { cn: 60, en: 60 },
            selectBoxWidth: { cn: 64, en: 130 },
            options: [{ text: "按下单顺序", value: "0" }, { text: "按商品分类", value: "1" }],
            selectedValue: 0,
            onChange: function () {
                var doing = new pospal.ui.loading($("#editPrinterDiv"));
                pospal.ajax({
                    url: "/Setting/UpdateUserConfig",
                    data: {
                        "userId": userSelector.getSelectedValue(),
                        "typeNumber": 1228,
                        "value": _this.printerPrintSortSelector.getSelectedValue()
                    },
                    success: function (result) {
                        if (result.successed) {

                        }
                    },
                    complete: function () {
                        doing.destroy();
                    }
                });
            }
        });

    },

    show: function () {
        editProduct.hidePrinterList();

        this.buildPrinterListUI();

        $("#popupBg").show();
        $("#editPrinterDiv").show();
    },

    hide: function () {
        $("#popupBg").hide();
        $("#editPrinterDiv").hide();
    },

    addNewPrinterUI: function () {
        var _this = this;

        if (!this.checkPrinter()) {
            return false;
        }

        var printerDiv = $("<div/>").addClass("item recipeList detail").appendTo($("#editPrinterList"));
        var input = $("<input class='printName quantity' type='text' maxlength = 10 />").appendTo(printerDiv);
        var areaDiv = $("<div class='area mCustomScrollbar'/>").appendTo(printerDiv);
        var areaContainDiv = $("<div class='scrollBox'/>").appendTo(areaDiv);
        var orderTypeDiv = $("<div class='orderType'/>").appendTo(printerDiv);
        var selectorsContainDiv = $("<div class='printType'/>").appendTo(printerDiv);
        var otherPrintSizeContainDiv = $("<div class='otherPrintSize' style='border-right: 1px solid #ccc; height: 200px;' />").appendTo(printerDiv);
        var otherPrintSortContainDiv = $("<div class='otherPrintSort'/>").appendTo(printerDiv);
        if (restaurantAreas.length > 0) {
            var $cb_allrestaurantArea = $("<div class='restaurantArea all' />").appendTo(areaContainDiv);
            var cb_allrestaurantArea = new pospal.ui.checkBox({
                container: $cb_allrestaurantArea,
                text: "全选",
                value: 0,
                checked: true,
                clickCallBack: function () {
                    _this.clickRestaurantAreaAllCheck(this);
                }
            });
            $cb_allrestaurantArea.data(cb_allrestaurantArea);
        }
        $.each(restaurantAreas, function (i, item) {
            var $cb_restaurantArea = $("<div class='restaurantArea' />").appendTo(areaContainDiv);
            var cb_restaurantArea = new pospal.ui.checkBox({
                container: $cb_restaurantArea,
                text: item.name,
                value: item.txtUid,
                checked: true,
                clickCallBack: function () {
                    _this.clickRestaurantAreaItemCheck(this);
                }
            });
            $cb_restaurantArea.data(cb_restaurantArea);
        });

        $.each(_this.orderTypeClass, function (i, item) {
            var checked = true;

            var $orderTypeItem = $("<div class='" + item + "' />").appendTo(orderTypeDiv);
            var cb_orderType = new pospal.ui.checkBox({
                container: $orderTypeItem,
                text: _this.orderTypeNames[i],
                value: i,
                checked: checked,
                clickCallBack: function () {
                    if (this.getValue() == 0) {
                        _this.clickOrderTypeAllCheck(this);
                    }
                    else {
                        _this.clickOrderTypeItemCheck(this);
                    }
                }
            });
            $orderTypeItem.data(cb_orderType);

            if (i > 0) {
                var printTypeContainer = $("<div class='" + item + "PrintTypeContainer printTypeContainer'></div>").appendTo(selectorsContainDiv);
                $("<div class='" + item + " orderTypeName'>" + _this.orderTypeNames[i] + "</div>").appendTo(printTypeContainer);
                var selectorDiv = $("<div class='" + item + " printTypeSelector' data-orderType='" + i + "'/>").appendTo(printTypeContainer);
                var selector = new pospal.ui.singleSelector({
                    container: selectorDiv,
                    textWidth: { cn: 80, en: 154 },
                    selectBoxWidth: { cn: 66, en: 140 },
                    options: [{ text: lang.tryGet("一品一切"), value: "0" }, { text: lang.tryGet("一单一切"), value: "1" }, { text: "一份一切", value: "2" }, { text: "一类一切", value: "3" }],
                    selectedValue: 0
                });

                selectorDiv.data("selector", selector);
                if (!checked) printTypeContainer.hide();
            }
        });

        var otherPrintSizeSelector = new pospal.ui.singleSelector({
            container: otherPrintSizeContainDiv,
            textWidth: { cn: 108, en: 154 },
            selectBoxWidth: { cn: 95, en: 140 },
            options: [{ text: "58mm", value: "0" }, { text: "80mm", value: "1" }, { text: "110mm", value: "2" }],
            selectedValue: defaultPrintSize
        });
        otherPrintSizeContainDiv.data("selector", otherPrintSizeSelector);

        var otherPrintSortSelector = new pospal.ui.singleSelector({
            container: otherPrintSortContainDiv,
            textWidth: { cn: 108, en: 154 },
            selectBoxWidth: { cn: 95, en: 140 },
            options: [{ text: "按下单顺序", value: "0" }, { text: "按商品分类", value: "1" }],
            selectedValue: 0
        });
        otherPrintSortContainDiv.data("selector", otherPrintSortSelector);

        var clearBtn = $("<div/>").addClass("clearTextRed").appendTo(printerDiv);
        clearBtn.bind("click", function () {
            _this.removePrinter(this);
        });

        printerDiv.attr("uid", 0);

        input.focus();
    },

    removePrinter: function (e) {
        $(e).parent().remove();
    },

    checkPrinter: function () {
        var arr = $.grep($("#editPrinterList .item"), function (item, i) {
            return $(item).find("input").val().trim() == "";
        });

        if (arr.length > 0) {
            $(arr[0]).find("input").focus();
            new pospal.ui.msgBox(lang.tryGet("小票机名称缺失"));
            return false;
        }

        return true;
    },

    buildPrinterListUI: function () {
        var _this = this;

        $("#editPrinterList").html("");

        $.each(storePrinters, function (i, printer) {
            var orderPrintTypeRules = null;
            if (printer.orderPrintTypeRule) orderPrintTypeRules = JSON.parse(printer.orderPrintTypeRule);
            var restaurantAreaUids = null;
            if (printer.restaurantArea && printer.restaurantArea != '') {
                restaurantAreaUids = printer.restaurantArea.split(",");
            }
            var printerDiv = $("<div/>").addClass("item recipeList detail").appendTo($("#editPrinterList"));
            var input = $("<input class='printName quantity' type='text' maxlength = 10 />").val(printer.name).appendTo(printerDiv);

            var areaDiv = $("<div class='area mCustomScrollbar'/>").appendTo(printerDiv);

            var areaContainDiv = $("<div class='scrollBox'/>").appendTo(areaDiv);
            var orderTypeDiv = $("<div class='orderType'/>").appendTo(printerDiv);
            var selectorsContainDiv = $("<div class='printType'/>").appendTo(printerDiv);
            var otherPrintSizeContainDiv = $("<div class='otherPrintSize' style='border-right: 1px solid #ccc; height: 200px;' />").appendTo(printerDiv);
            var otherPrintSortContainDiv = $("<div class='otherPrintSort'/>").appendTo(printerDiv);

            if (restaurantAreas.length > 0) {
                var $cb_allrestaurantArea = $("<div class='restaurantArea all' />").appendTo(areaContainDiv);
                var cb_allrestaurantArea = new pospal.ui.checkBox({
                    container: $cb_allrestaurantArea,
                    text: "全选",
                    value: 0,
                    checked: restaurantAreaUids == null || restaurantAreaUids.length == restaurantAreas.length,
                    clickCallBack: function () {
                        _this.clickRestaurantAreaAllCheck(this);
                    }
                });
                $cb_allrestaurantArea.data(cb_allrestaurantArea);
            }
            $.each(restaurantAreas, function (i, item) {
                var $cb_restaurantArea = $("<div class='restaurantArea' />").appendTo(areaContainDiv);
                var cb_restaurantArea = new pospal.ui.checkBox({
                    container: $cb_restaurantArea,
                    text: item.name,
                    value: item.txtUid,
                    checked: restaurantAreaUids == null || $.grep(restaurantAreaUids, function (area) { return area == item.txtUid; }).length > 0,
                    clickCallBack: function () {
                        _this.clickRestaurantAreaItemCheck(this);
                    }
                });
                $cb_restaurantArea.data(cb_restaurantArea);
            });

            $.each(_this.orderTypeClass, function (i, item) {
                var checked = false;
                var orderPrintTypeRule = null;
                var printType = null;
                if (orderPrintTypeRules == null) {
                    checked = true;
                }
                else if (item == "pos") {
                    orderPrintTypeRule = $.grep(orderPrintTypeRules, function (x) { return x.orderType == i });
                    if (orderPrintTypeRule.length > 0 && orderPrintTypeRule[0].visible == false) {
                        checked = false;
                    }
                    else {
                        checked = true;
                    }
                    printType = printer.printType;
                }
                else {
                    orderPrintTypeRule = $.grep(orderPrintTypeRules, function (item) { return item.orderType == i });
                    if (orderPrintTypeRule.length > 0) {
                        checked = true;
                        printType = orderPrintTypeRule[0].printType;
                    }
                }
                if (i == 0 && orderPrintTypeRules != null) checked = orderPrintTypeRules.length == _this.orderTypeClass.length - 1;
                var $orderTypeItem = $("<div class='" + item + "' />").appendTo(orderTypeDiv);
                var cb_orderType = new pospal.ui.checkBox({
                    container: $orderTypeItem,
                    text: _this.orderTypeNames[i],
                    value: i,
                    checked: checked,
                    clickCallBack: function () {
                        if (this.getValue() == 0) {
                            _this.clickOrderTypeAllCheck(this);
                        }
                        else {
                            _this.clickOrderTypeItemCheck(this);
                        }
                    }
                });
                $orderTypeItem.data(cb_orderType);

                if (i > 0) {
                    var printTypeContainer = $("<div class='" + item + "PrintTypeContainer printTypeContainer'></div>").appendTo(selectorsContainDiv);
                    $("<div class='" + item + " orderTypeName'>" + _this.orderTypeNames[i] + "</div>").appendTo(printTypeContainer);
                    var selectorDiv = $("<div class='" + item + " printTypeSelector' data-orderType='" + i + "'/>").appendTo(printTypeContainer);
                    var selector = new pospal.ui.singleSelector({
                        container: selectorDiv,
                        textWidth: { cn: 80, en: 154 },
                        selectBoxWidth: { cn: 66, en: 140 },
                        options: [{ text: lang.tryGet("一品一切"), value: "0" }, { text: lang.tryGet("一单一切"), value: "1" }, { text: "一份一切", value: "2" }, { text: "一类一切", value: "3" }],
                        selectedValue: printer.printType
                    });
                    if (printType != null) {
                        selector.setSelectedValue(printType);
                    }

                    selectorDiv.data("selector", selector);
                    if (!checked) printTypeContainer.hide();
                }
            });

            var otherPrintSizeSelector = new pospal.ui.singleSelector({
                container: otherPrintSizeContainDiv,
                textWidth: { cn: 108, en: 154 },
                selectBoxWidth: { cn: 95, en: 140 },
                options: [{ text: "58mm", value: "0" }, { text: "80mm", value: "1" }, { text: "110mm", value: "2" }],
                selectedValue: printer.printSize == null ? defaultPrintSize : printer.printSize
            });
            otherPrintSizeContainDiv.data("selector", otherPrintSizeSelector);

            var otherPrintSortSelector = new pospal.ui.singleSelector({
                container: otherPrintSortContainDiv,
                textWidth: { cn: 108, en: 154 },
                selectBoxWidth: { cn: 95, en: 140 },
                options: [{ text: "按下单顺序", value: "0" }, { text: "按商品分类", value: "1" }],
                selectedValue: printer.printSort == null ? 0 : printer.printSort
            });
            otherPrintSortContainDiv.data("selector", otherPrintSortSelector);

            var clearBtn = $("<div/>").addClass("clearTextRed").appendTo(printerDiv);
            clearBtn.bind("click", function () {
                _this.removePrinter(this);
            });

            printerDiv.attr("uid", printer.txtUid);
        });
    },

    buildPrintersFromUI: function () {
        var printers = [];
        $.each($("#editPrinterList .item"), function (i, item) {
            var printer = {};
            printer.uid = $(item).attr("uid");
            printer.name = $(item).find("input").val().trim();
            //printer.printType = $(item).data("selector").getSelectedValue();
            printer.printSize = $(item).find(".otherPrintSize").data("selector").getSelectedValue();
            printer.printSort = $(item).find(".otherPrintSort").data("selector").getSelectedValue();
            var $areas = $(item).find(".area .checkBoxDiv.on");
            var orderPrintTypeRule = [];
            $(item).find(".printTypeSelector").each(function (i, printTypeSelector) {
                var orderType = $(printTypeSelector).attr("data-orderType");
                var printType = $(printTypeSelector).data("selector").getSelectedValue();
                if (orderType == "8") {
                    printer.printType = $(printTypeSelector).is(":visible") ? printType : 0;
                    orderPrintTypeRule.push({ "orderType": orderType, "printType": printer.printType, "visible": $(printTypeSelector).is(":visible") });
                }
                else if ($(printTypeSelector).is(":visible")) {
                    orderPrintTypeRule.push({ "orderType": orderType, "printType": printType });
                }
            });
            printer.orderPrintTypeRule = JSON.stringify(orderPrintTypeRule);
            if ($(item).find(".area .all.checkBoxDiv.on").length > 0) {
                printer.restaurantArea = null;
            }
            else {
                var restaurantAreaUids = [];
                $areas.each(function (i, restaurantArea) {
                    var restaurantAreaUid = $(restaurantArea).find(".checkBox14").attr('data');
                    restaurantAreaUids.push(restaurantAreaUid);
                });
                if (restaurantAreaUids.length > 0) {
                    printer.restaurantArea = restaurantAreaUids.join(',');
                }
                else {
                    printer.restaurantArea = "0";
                }
            }

            printers.push(printer);
        });

        return printers;
    },

    save: function () {
        var _this = this;

        if (!this.checkPrinter()) {
            return false;
        }

        var printers = this.buildPrintersFromUI();

        //判断打印机名称是否重复
        var hasPrinters = [];
        var hasPrinterFlag = false;
        $.each(printers,
            function (i, v) {
                var name = v.name;
                if ($.inArray(name, hasPrinters) > -1) {
                    hasPrinterFlag = true;
                } else {
                    hasPrinters.push(name);
                }
            });

        if (hasPrinterFlag) {
            new pospal.ui.msgBox("小票机名称不能重复");
            return false;
        }

        var saving = new pospal.ui.loading($("#editPrinterDiv"));
        pospal.ajax({
            url: "/Product/SaveStorePrinters",
            data: { "storeId": userSelector.getSelectedValue(), "printersJson": JSON.stringify(printers) },
            success: function (result) {
                if (result.successed) {
                    new pospal.ui.msgBox(lang.tryGet("小票机保存成功"));
                    storePrinters = result.storePrinters;
                    restaurantAreas = result.restaurantAreaList;
                    //重置编辑商品选定的小票机
                    var printerUids = [];
                    $("#printerList table tbody tr").each(function (i, item) {
                        if (!$(item).hasClass("blank") && $(item).data("switchBox").getSelectedValue() == "1") {
                            printerUids.push($(item).data("printerUid"));
                        }
                    });
                    editProduct.resetPrinterListUI(printerUids);
                } else {
                    new pospal.ui.msgBox({ content: result.msg, autoCloseSec: 0 });
                    _this.buildPrinterListUI();
                }
            },
            complete: function () { saving.destroy(); }
        });
    },

    clickOrderTypeAllCheck: function (obj) {
        var _this = this;
        _this.clickAll = true;
        var checked = obj.checked;
        if (!_this.clickItem) {
            obj.ui.parents('.recipeList').find(".orderType .checkBoxDiv").each(function () {
                if (checked) {
                    if (!$(this).hasClass("on")) $(this).click();
                }
                else {
                    if ($(this).hasClass("on")) $(this).click();
                }
            });
        }
        _this.clickAll = false;
    },

    clickOrderTypeItemCheck: function (obj) {
        var _this = this;
        _this.clickItem = true;
        if (!_this.clickAll) {
            if (obj.ui.parents('.recipeList').find(".orderType .checkBoxDiv:not(.all):not(.on)").length == 0) {
                obj.ui.parents('.recipeList').find(".orderType .checkBoxDiv.all:not(.on)").click();
            }
            else {
                obj.ui.parents('.recipeList').find(".orderType .checkBoxDiv.all.on").click();
            }
        }
        _this.clickItem = false;

        if (obj.checked) {
            obj.ui.parents(".recipeList").find("." + _this.orderTypeClass[obj.getValue()] + "PrintTypeContainer").show();
        }
        else {
            obj.ui.parents(".recipeList").find("." + _this.orderTypeClass[obj.getValue()] + "PrintTypeContainer").hide();
        }
    },

    clickRestaurantAreaAllCheck: function (obj) {
        var _this = this;
        _this.clickAll = true;
        var checked = obj.checked;
        if (!_this.clickItem) {
            obj.ui.parents('.recipeList').find(".area .checkBoxDiv").each(function () {
                if (checked) {
                    if (!$(this).hasClass("on")) $(this).click();
                }
                else {
                    if ($(this).hasClass("on")) $(this).click();
                }
            });
        }
        _this.clickAll = false;
    },

    clickRestaurantAreaItemCheck: function (obj) {
        var _this = this;
        _this.clickItem = true;
        if (!_this.clickAll) {
            if (obj.ui.parents('.recipeList').find(".area .checkBoxDiv:not(.all):not(.on)").length == 0) {
                obj.ui.parents('.recipeList').find(".area .checkBoxDiv.all:not(.on)").click();
            }
            else {
                obj.ui.parents('.recipeList').find(".area .checkBoxDiv.all.on").click();
            }
        }
        _this.clickItem = false;
    },
}

editLabelPrinters = {
    init: function () {
        var _this = this;

        $(".btnShowEditLabelPrinterDiv").bind("click", function () {
            //layout.showOrHideEditArea(false);
            _this.show();
        });

        $("#editLabelPrinterDiv .popupClose,#editLabelPrinterDiv .btnCancel").bind("click", function () {
            _this.hide();
        });

        $("#editLabelPrinterDiv .btnSave").bind("click", function () {
            _this.save();
        });

        $("#editLabelPrinterDiv .add").bind("click", function () {
            _this.addNewLabelPrinterUI();
        });
    },

    show: function () {
        editProduct.hideLabelPrinterList();

        this.buildLabelPrinterListUI();

        $("#popupBg").show();
        $("#editLabelPrinterDiv").show();
    },

    hide: function () {
        $("#popupBg").hide();
        $("#editLabelPrinterDiv").hide();
    },

    addNewLabelPrinterUI: function () {
        var _this = this;

        if (!this.checkLabelPrinter()) {
            return false;
        }

        var printerDiv = $("<div/>").addClass("item recipeList detail").appendTo($("#editLabelPrinterList"));
        var input = $("<input class='printName quantity' style='width:419px' type='text' maxlength = 10 />").appendTo(printerDiv);

        var clearBtn = $("<div/>").addClass("clearTextRed").appendTo(printerDiv);
        clearBtn.bind("click", function () {
            _this.removeLabelPrinter(this);
        });

        printerDiv.attr("uid", 0);

        input.focus();
    },

    removeLabelPrinter: function (e) {
        $(e).parent().remove();
    },

    checkLabelPrinter: function () {
        var arr = $.grep($("#editLabelPrinterList .item"), function (item, i) {
            return $(item).find("input").val().trim() == "";
        });

        if (arr.length > 0) {
            $(arr[0]).find("input").focus();
            new pospal.ui.msgBox("当前列表中有标签机名称未填写，请确认！");
            return false;
        }
        return true;
    },

    buildLabelPrinterListUI: function () {
        var _this = this;

        $("#editLabelPrinterList").html("");

        $.each(labelPrinters, function (i, printer) {
            var printerDiv = $("<div/>").addClass("item recipeList detail").appendTo($("#editLabelPrinterList"));
            var input = $("<input class='printName quantity' style='width:419px' type='text' maxlength = 10  />").val(printer.name).appendTo(printerDiv);

            var clearBtn = $("<div/>").addClass("clearTextRed").appendTo(printerDiv);
            clearBtn.bind("click", function () {
                _this.removeLabelPrinter(this);
            });

            printerDiv.attr("uid", printer.txtUid);
        });
    },

    buildLabelPrintersFromUI: function () {
        var printers = [];
        $.each($("#editLabelPrinterList .item"), function (i, item) {
            var printer = {};
            printer.uid = $(item).attr("uid");
            printer.name = $(item).find("input").val().trim();
            printers.push(printer);
        });

        return printers;
    },

    save: function () {
        var _this = this;

        if (!this.checkLabelPrinter()) {
            return false;
        }

        var printers = this.buildLabelPrintersFromUI();
        var saving = new pospal.ui.loading($("#editLabelPrinterDiv"));
        pospal.ajax({
            url: "/Product/SaveUserLabelPrinters",
            data: { "storeId": userSelector.getSelectedValue(), "printersJson": JSON.stringify(printers) },
            success: function (result) {
                if (result.successed) {
                    new pospal.ui.msgBox("标签机保存成功");
                    labelPrinters = result.labelPrinters;

                    //重新渲染ui，保证uid为最新
                    _this.buildLabelPrinterListUI();

                    //重置编辑商品选定的标签机
                    var printerUids = [];
                    $("#labelPrinterList table tbody tr").each(function (i, item) {
                        if (!$(item).hasClass("blank") && $(item).data("switchBox").getSelectedValue() == "1") {
                            printerUids.push($(item).data("printerUid"));
                        }
                    });
                    editProduct.resetLabelPrinterListUI(printerUids);
                } else {
                    new pospal.ui.msgBox({ content: result.msg, autoCloseSec: 0 });
                    _this.buildLabelPrinterListUI();
                }
            },
            complete: function () { saving.destroy(); }
        });
    }
}

editColorSizeBase = {
    groupType: 1,

    colorBase: [],

    sizeBase: [],

    init: function () {
        var _this = this;

        this.formValidator = new pospal.formValidator();

        if ($("#hf_enableColorSizeNumber").val() == "True") {
            $("#mulColorSizeBaseDiv .cb_enableColorSizeNumber").addClass("on");
            $("#mulColorSizeBaseDiv .btnShowEditColorSizeBaseDiv").show();
            $("#mulColorSizeBaseDiv .colorSizeBaseListDiv div").css({ "border-top": "1px solid #ddd", "margin-top": "0px" });
        } else {
            $("#mulColorSizeBaseDiv .cb_enableColorSizeNumber").removeClass("on");
            $("#mulColorSizeBaseDiv .btnShowEditColorSizeBaseDiv").hide();
            $("#mulColorSizeBaseDiv .colorSizeBaseListDiv div").css({ "border-top": "none", "margin-top": "-40px" });
        }

        $("#mulColorSizeGroupDiv .btnShowColorSizeBase").bind("click", function () {
            _this.groupType = editColorSizeGroup.groupType;
            $("#mulColorSizeBaseDiv").removeClass("nodis");
            _this.loadData();
        });

        $("#mulColorSizeBaseDiv .colorSizeBaseTitle div").bind("click", function () {
            _this.groupType = $(this).attr("data-type");
            _this.buildBaseView();
        });

        $("#mulColorSizeBaseDiv .btnClose").bind("click", function () {
            $("#mulColorSizeBaseDiv").addClass("nodis");
        });

        $("#mulColorSizeBaseDiv .btnShowEditColorSizeBaseDiv").bind("click", function () {
            _this.showEdit(null, null);
        });

        $("#mulColorSizeBaseDiv .cb_enableColorSizeNumber").bind("click", function () {
            if ($(this).hasClass("on")) {
                $(this).removeClass("on");
                _this.changeEnableColorSizeNumber(0);
            } else {
                $(this).addClass("on");
                _this.changeEnableColorSizeNumber(1);
            }
        });

        $("#colorSizeBaseEditDiv .popupClose").bind("click", function () {
            _this.hideEdit();
        });

        $("#colorSizeBaseEditDiv .btnSaveBase").bind("click", function () {
            _this.save();
        });

        $("#colorSizeBaseEditDiv .btnDelBase").bind("click", function () {
            var name = $("#colorSizeBaseEditDiv .txt_baseName").val();
            var confirmStr = lang.tryFormat("将同时删除X组中的", [(_this.groupType == 1 ? "颜色" : "尺码")]) + " '" + name + "'";
            new pospal.ui.msgBox({
                boxType: "confirm",
                width: 400,
                height: 250,
                content: confirmStr,
                confirmText: lang.tryGet("是"),
                cancelText: lang.tryGet("否"),
                onConfirm: function () {
                    if (this.confirmValue) {
                        _this.del(name);
                    }
                }
            });
        });

        $("#colorSizeBaseEditDiv .txt_baseNumber").keyup(function () {
            var number = $(this).val().trim();
            if (!_this.formValidator.isAlphabetNumberSlashMinusAsterisk(number)) {
                $(this).parent().addClass("error");
            } else {
                $(this).parent().removeClass("error");
            }
        });

        $("#colorSizeBaseEditDiv .txt_baseName").keyup(function () {
            var name = $(this).val().trim();
            if (name.length == 0) {
                $(this).parent().addClass("error");
            } else {
                $(this).parent().removeClass("error");
            }
        });

        $("#mulColorSizeBaseDiv .secondDiv").width($(document).width());
        $("#mulColorSizeBaseDiv .mainDiv").height($(document).height() - 50);
        $("#mulColorSizeBaseDiv .mainDiv").mCustomScrollbar();

        this.loadData();
    },

    loadData: function () {
        var _this = this;

        var doing = new pospal.ui.loading($("#mulColorSizeBaseDiv"));
        pospal.ajax({
            url: "/Product/LoadProductColorSizeBase",
            data: {},
            success: function (result) {
                if (result.successed) {
                    _this.colorBase = result.colorList;
                    _this.sizeBase = result.sizeList;
                    _this.buildBaseView();
                }
            },
            complete: function () {
                doing.destroy();
            }
        });
    },

    buildBaseView: function () {
        var _this = this;
        $("#mulColorSizeBaseDiv .btnShowEditColorSizeBaseDiv").html(this.groupType == 1 ? "新增颜色编码" : "新增尺码编码");
        $("#mulColorSizeBaseDiv .colorSizeBaseTitle div").removeClass("selected");
        $("#mulColorSizeBaseDiv .colorSizeBaseTitle div[data-type=" + this.groupType + "]").addClass("selected");

        var list = this.groupType == 1 ? this.colorBase : this.sizeBase;
        $ul = $("#mulColorSizeBaseDiv .colorSizeBaseListDiv ul").empty();
        $.each(list, function (index, item) {
            $("<li class='attrs-adorn withNum canEdit'><label>" + item.number + "</label>" + item.name + "</li>").bind("click", function () {
                if ($("#mulColorSizeBaseDiv .cb_enableColorSizeNumber").hasClass("on")) {
                    _this.showEdit(item.number, item.name);
                }
            }).appendTo($ul)
        });
    },

    showEdit: function (number, name) {
        $("#normalPopupBg").show();
        $("#colorSizeBaseEditDiv").removeClass("nodis");

        $("#colorSizeBaseEditDiv .baseNameTitle").html(this.groupType == 1 ? "颜色：" : "尺码：");

        $("#colorSizeBaseEditDiv .txt_baseNumber,#colorSizeBaseEditDiv .txt_baseName").val("");
        $("#colorSizeBaseEditDiv div.is-disabled").hide();
        $("#colorSizeBaseEditDiv .btnDelBase").hide();
        $("#colorSizeBaseEditDiv .edit-attr__input-wrapper").removeClass("error");

        var isNew = name == null && number == null;
        $("#colorSizeBaseEditDiv").data("isNew", isNew ? true : false);
        if (!isNew) {
            $("#colorSizeBaseEditDiv .txt_baseName").val(name);
            $("#colorSizeBaseEditDiv div.is-disabled").show();

            $("#colorSizeBaseEditDiv .txt_baseNumber").val(number);
            $("#colorSizeBaseEditDiv .btnDelBase").show();
        }
    },

    hideEdit: function () {
        $("#normalPopupBg").hide();
        $("#colorSizeBaseEditDiv").addClass("nodis");
    },

    del: function (name) {
        var _this = this;

        var doing = new pospal.ui.loading($("#colorSizeBaseEditDiv"));
        pospal.ajax({
            url: "/Product/DelProductColorSizeBase",
            data: { "name": name, "type": this.groupType },
            success: function (result) {
                if (result.successed) {
                    _this.resetAfterEdit(result.colorList, result.sizeList, result.productColorGroups, result.productSizeGroups, true);
                }
            },
            complete: function () {
                doing.destroy();
            }
        });
    },

    save: function () {
        var _this = this;
        var isNew = $("#colorSizeBaseEditDiv").data("isNew");
        var name = $("#colorSizeBaseEditDiv .txt_baseName").val().trim();
        var number = $("#colorSizeBaseEditDiv .txt_baseNumber").val().trim();
        var type = this.groupType;

        $("#colorSizeBaseEditDiv .txt_baseName").parent().removeClass("error");
        $("#colorSizeBaseEditDiv .txt_baseNumber").parent().removeClass("error");

        var isValid = true;
        if (name.length == 0) {
            $("#colorSizeBaseEditDiv .txt_baseName").parent().addClass("error");
            isValid = false;
        }
        if (number.length == 0 || !this.formValidator.isAlphabetNumberSlashMinusAsterisk(number)) {
            $("#colorSizeBaseEditDiv .txt_baseNumber").parent().addClass("error");
            isValid = false;
        }

        if (isValid) {
            var doing = new pospal.ui.loading($("#colorSizeBaseEditDiv"));
            pospal.ajax({
                url: "/Product/SaveProductColorSizeBase",
                data: { "isNew": isNew, "type": type, "name": name, "number": number },
                success: function (result) {
                    if (result.successed) {
                        if (isNew) {
                            _this.resetAfterEdit(result.colorList, result.sizeList, null, null, false);
                        } else {
                            if (result.notChangeNumber != null && result.notChangeNumber) {
                                _this.hideEdit();
                            } else {
                                _this.resetAfterEdit(result.colorList, result.sizeList, result.productColorGroups, result.productSizeGroups, true);
                            }
                        }
                    } else {
                        new pospal.ui.msgBox({
                            content: result.msg, autoCloseSec: 0,
                            width: 400,
                            height: 250,
                        })
                    }
                },
                complete: function () {
                    doing.destroy();
                }
            });
        }
    },

    resetAfterEdit: function (colorBase, sizeBase, productColorGroups, productSizeGroups, resetColorSizeGroup) {
        this.colorBase = colorBase;
        this.sizeBase = sizeBase;
        this.buildBaseView();
        this.hideEdit();

        if (resetColorSizeGroup) {
            editColorSizeGroup.resetColorSizeGroups(productColorGroups, productSizeGroups);
            editColorSizeGroup.buildGroupListView();

            editMulColorSizeProduct.buildColorSizeGroupSelector(1);
            editMulColorSizeProduct.buildColorSizeGroupSelector(2);
        }
    },

    changeEnableColorSizeNumber: function (configValue) {
        var _this = this;

        var doing = new pospal.ui.loading($("#mulColorSizeBaseDiv"));
        pospal.ajax({
            url: "/Setting/UpdateUserConfig",
            data: { "typeNumber": 177, "value": configValue },
            success: function (result) {
                if (result.successed) {
                    editColorSizeGroup.showColorSizeNumber = configValue == 1;
                    editColorSizeGroup.buildGroupListView();

                    editMulColorSizeProduct.showColorSizeNumber = configValue == 1;
                    editMulColorSizeProduct.buildSelectedColorSizeDiv(1);
                    editMulColorSizeProduct.buildSelectedColorSizeDiv(2);

                    if (configValue == 1) {
                        $("#mulColorSizeBaseDiv .btnShowEditColorSizeBaseDiv").show();
                        $("#mulColorSizeBaseDiv .colorSizeBaseListDiv div").css({ "border-top": "1px solid #ddd", "margin-top": "0px" });
                    } else {
                        $("#mulColorSizeBaseDiv .btnShowEditColorSizeBaseDiv").hide();
                        $("#mulColorSizeBaseDiv .colorSizeBaseListDiv div").css({ "border-top": "none", "margin-top": "-40px" });
                    }
                }
            },
            complete: function () {
                doing.destroy();
            }
        });
    },

    getBaseColorSize: function (type, name) {
        var baseColorSize = null;
        var items = type == 1 ? this.colorBase : this.sizeBase;
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.type == type && item.name.toLowerCase() == name.toLowerCase()) {
                baseColorSize = item;
                break;
            }
        }

        return baseColorSize;
    }
}

editColorSizeGroup = {
    groupType: 1,

    showColorSizeNumber: false,

    init: function () {
        var _this = this;

        this.showColorSizeNumber = $("#hf_enableColorSizeNumber").val() == "True";

        //颜色尺码组列表相关
        $(".btnShowColorSizeGroup").bind("click", function () {
            $("#mulColorSizeGroupDiv").removeClass("nodis");
            _this.buildGroupListView();
        });

        $("#mulColorSizeGroupDiv .colorSizeGroupTitle div").bind("click", function () {
            _this.groupType = $(this).attr("data-type");
            if (!_this.groupType) {
                return false;
            }
            _this.buildGroupListView();
        });

        $("#mulColorSizeGroupDiv .btnClose").bind("click", function () {
            $("#mulColorSizeGroupDiv").addClass("nodis");
        });

        //颜色尺码组以及颜色尺码编辑
        $("#mulColorSizeGroupDiv .btnShowEditGroupDiv").bind("click", function () {
            _this.showEditGroup();
        });

        $("#colorSizeGroupEditDiv .popupClose").bind("click", function () {
            $("#normalPopupBg").hide();
            $("#colorSizeGroupEditDiv").addClass("nodis");
        });

        $("#colorSizeGroupEditDiv .txt_colorSizeName").keyup(function (event) {
            if ($(this).val().trim().length == 0) {
                $("#colorSizeGroupEditDiv .btnAddColorSize").addClass("is-disabled");
            } else {
                $("#colorSizeGroupEditDiv .btnAddColorSize").removeClass("is-disabled");
                if (event.keyCode == 13) {
                    $("#colorSizeGroupEditDiv .btnAddColorSize")[0].click();
                }
            }
        });

        $("#colorSizeGroupEditDiv .btnAddColorSize").bind("click", function () {
            if (!$(this).hasClass("is-disabled")) {
                var colorSizeName = $("#colorSizeGroupEditDiv .txt_colorSizeName").val().trim().replace('\'', '’');
                if (colorSizeName.length > 0) {
                    var isExisting = false;
                    $("#colorSizeGroupEditDiv .colorSizeListUL li").each(function (index, item) {
                        if ($(item).attr("data-name").toLowerCase() == colorSizeName.toLowerCase()) {
                            new pospal.ui.msgBox(lang.tryFormat("要新增的X已存在", ["\'" + colorSizeName + "\'"]));
                            isExisting = true;
                            return false;
                        }
                    });

                    if (!isExisting) {
                        var baseColorSize = editColorSizeBase.getBaseColorSize(_this.groupType, colorSizeName);
                        if (_this.showColorSizeNumber && baseColorSize == null) {
                            if ($("#mulColorSizeGroupDiv .btnShowColorSizeBase").length > 0) {
                                new pospal.ui.msgBox({
                                    boxType: "confirm",
                                    content: "编码设置处于开启状态<br/> 需要先给 \'" + colorSizeName + "\' 设置编码，前往设置？",
                                    onConfirm: function () {
                                        if (this.confirmValue) {
                                            $("#colorSizeGroupEditDiv .popupClose")[0].click();
                                            $("#mulColorSizeGroupDiv .btnShowColorSizeBase")[0].click();
                                            $("#mulColorSizeBaseDiv .btnShowEditColorSizeBaseDiv")[0].click();
                                            $("#colorSizeBaseEditDiv .txt_baseName").val(colorSizeName);
                                            $("#colorSizeBaseEditDiv .txt_baseNumber").select();
                                        }
                                    }
                                });
                            } else {
                                new pospal.ui.msgBox(lang.tryFormat("编码未设置", ["\'" + colorSizeName + "\'"]));
                            }
                        } else {
                            var item = { name: colorSizeName };
                            if (baseColorSize != null) {
                                item.name = baseColorSize.name;
                                item.number = baseColorSize.number;
                            }

                            _this.buildColorSizeLi(item);
                            $("#colorSizeGroupEditDiv .txt_colorSizeName").val("");
                        }
                    }
                }
            }
        });

        $("#colorSizeGroupEditDiv .btnDelGroup").bind("click", function () {
            new pospal.ui.msgBox({
                boxType: "confirm",
                content: lang.tryFormat("确定删除该X组", [(_this.groupType == 1 ? "颜色" : "尺码")]) + "？",
                confirmText: lang.tryGet("是"),
                cancelText: lang.tryGet("否"),
                onConfirm: function () {
                    if (this.confirmValue) {
                        _this.delProductColorSizeGroup();
                    }
                }
            });
        });

        $("#colorSizeGroupEditDiv .btnSaveGroup").bind("click", function () {
            var group = _this.buildProductColorSizeGroup();

            var key = _this.groupType == 1 ? "颜色" : "尺码";
            if (group.groupName.length == 0) {
                new pospal.ui.msgBox(lang.tryFormat("请填写X组名称", [key]));
                $("#colorSizeGroupEditDiv .txt_groupName").select();
            } else if (group.productColorSizeList.length == 0) {
                new pospal.ui.msgBox("请至少添加一个" + key);
                $("#colorSizeGroupEditDiv .txt_colorSizeName").select();
            } else {
                new pospal.ui.msgBox({
                    boxType: "confirm",
                    content: lang.tryFormat("确定保存该X组", [(_this.groupType == 1 ? "颜色" : "尺码")]) + "？",
                    confirmText: lang.tryGet("是"),
                    cancelText: lang.tryGet("否"),
                    onConfirm: function () {
                        if (this.confirmValue) {
                            _this.saveProductColorSizeGroup(group);
                        }
                    }
                });
            }
        });

        //颜色尺码组排序
        $(".btnShowMulColorSizeGroupSort").bind("click", function () {
            _this.showSortGroups();
        });

        $("#mulColorSizeGroupSortDiv .popupClose").bind("click", function () {
            $("#normalPopupBg").hide();
            $("#mulColorSizeGroupSortDiv").addClass("nodis");
        });

        $("#mulColorSizeGroupSortDiv .btnSaveGroupsSort").bind("click", function () {
            var key = _this.groupType == 1 ? "颜色" : "尺码";
            new pospal.ui.msgBox({
                boxType: "confirm",
                content: lang.tryFormat("确定保存该X组排序", [(_this.groupType == 1 ? "颜色" : "尺码")]) + "？",
                confirmText: lang.tryGet("是"),
                cancelText: lang.tryGet("否"),
                onConfirm: function () {
                    if (this.confirmValue) {
                        _this.saveGroupsSort();
                    }
                }
            });
        });

        //初始化计算UI
        $("#mulColorSizeGroupDiv .secondDiv").width($(document).width());
        $("#mulColorSizeGroupDiv .mainDiv").height($(document).height() - 50);
        $("#mulColorSizeGroupDiv .mainDiv").mCustomScrollbar();

        this.loadStoreColorSizeGroups();
    },

    loadStoreColorSizeGroups: function () {
        var _this = this;
        pospal.ajax({
            url: "/Product/LoadStoreColorSizeGroups",
            data: {},
            success: function (result) {
                if (result.successed) {
                    _this.resetColorSizeGroups(result.productColorGroups, result.productSizeGroups);
                }
            },
            complete: function () {
            }
        });
    },

    resetColorSizeGroups: function (colorGroups, sizeGroups) {
        productColorGroups = colorGroups;
        productSizeGroups = sizeGroups;

        if (this.groupType != null) {
            editMulColorSizeProduct.buildColorSizeGroupSelector(this.groupType);
            editMulColorSizeProduct.refreshColorOrSizeOrderNumber(this.groupType);
            editMulColorSizeProduct.selectedColorSizeOnChange(this.groupType);
        }
    },

    buildGroupListView: function () {
        var _this = this;
        var groups = this.groupType == 1 ? productColorGroups : productSizeGroups;

        $("#mulColorSizeGroupDiv .colorSizeGroupTitle div").removeClass("selected");
        $("#mulColorSizeGroupDiv .colorSizeGroupTitle div[data-type=" + this.groupType + "]").addClass("selected");
        $("#mulColorSizeGroupDiv .btnShowEditGroupDiv").html(lang.tryFormat("新增X组", [this.groupType == 1 ? "颜色" : "尺码"]));
        $("#mulColorSizeGroupDiv .btnShowMulColorSizeGroupSort").html(lang.tryFormat("X组排序", [this.groupType == 1 ? "颜色" : "尺码"]));
        $(".colorSizeGroupListDiv").html("");
        if (groups.length == 0) {
            $(".btnShowMulColorSizeGroupSort").hide();
            //this.showEditGroup();
        } else {
            $(".btnShowMulColorSizeGroupSort").show();
            for (var i = 0; i < groups.length; i++) {
                var group = groups[i];
                var $group = $("<div class='group-pan' />").appendTo($("#mulColorSizeGroupDiv .colorSizeGroupListDiv"));
                var $header = $("<div class='group-pan__header' />").appendTo($group);
                var headerStr = "<div class='group-pan__header-inner'><div class='group-pan__title'>" + group.groupName + "</div><div style='float: right;width: 42px;margin-top: 8px;'><div data-groupUid=" + group.txtUid + " class='btnWhite12 btnShowEditGroup' style='width: 42px;'>编辑</div></div></div>";
                $(headerStr).appendTo($header);

                $header.find(".btnShowEditGroup").bind("click", function () {
                    var groupUid = $(this).attr("data-groupUid");
                    _this.showEditGroup(groupUid);
                });

                var $content = $("<div/>").appendTo($group);
                var $mainDiv = $("<div style='padding-top: 11px;padding-left: 11px;' />").appendTo($content);
                var $ul = $("<ul class='clearfix' />").appendTo($mainDiv);
                for (var j = 0; j < group.productColorSizeList.length; j++) {
                    var colorSize = group.productColorSizeList[j];
                    if (_this.showColorSizeNumber) {
                        $("<li class='attrs-adorn withNum'><label>" + colorSize.number + "</label>" + colorSize.name + "</li>").appendTo($ul);
                    } else {
                        $("<li class='attrs-adorn disable'/>").html(colorSize.name).appendTo($ul);
                    }
                }
            }
        }
    },

    showEditGroup: function (groupUid) {
        var _this = this;
        var group = null;
        if (groupUid != null) {
            var groups = this.groupType == 1 ? productColorGroups : productSizeGroups;
            var arrIndex = pospal.inArray(groups, "txtUid", groupUid);
            if (arrIndex > -1) group = groups[arrIndex];
        }

        $("#normalPopupBg").show();
        $("#colorSizeGroupEditDiv").removeClass("nodis");
        $("#colorSizeGroupEditDiv").data("groupUid", group == null ? 0 : group.txtUid);

        var key = this.groupType == 1 ? "颜色" : "尺码";
        var title = group == null ? "● " + lang.tryFormat("新增X组", [key]) : "● 编辑" + key + "组";
        $("#colorSizeGroupEditDiv .popupTitle h1").html(title);
        $("#colorSizeGroupEditDiv .groupNameTitle").html(key + "组名称：");
        $("#colorSizeGroupEditDiv .txt_groupName").attr("placeholder", "请输入" + key + "组名称").val(group != null ? group.groupName : "");
        $("#colorSizeGroupEditDiv .txt_colorSizeName").attr("placeholder", "输入要新增的" + key).val("");
        $("#colorSizeGroupEditDiv .btnAddColorSize").addClass("is-disabled");
        $("#colorSizeGroupEditDiv .btnAddColorSize").html("添加" + key);

        $("#colorSizeGroupEditDiv .colorSizeListUL").html("");
        if (group != null) {
            for (var i = 0; i < group.productColorSizeList.length; i++) {
                var item = group.productColorSizeList[i];
                _this.buildColorSizeLi(item);
            }
        }

        group == null ? $("#colorSizeGroupEditDiv .btnDelGroup").hide() : $("#colorSizeGroupEditDiv .btnDelGroup").show();
    },

    buildColorSizeLi: function (productColorSize) {
        var $ul = $("#colorSizeGroupEditDiv .colorSizeListUL");

        var $li = $("<li data-name='" + productColorSize.name + "' class='attrs-adorn is-drag'>" + (this.showColorSizeNumber ? ("<label>" + productColorSize.number + "</label>") : "") + productColorSize.name + "</li>").appendTo($ul);
        if (this.showColorSizeNumber) $li.addClass("withNum");

        $("<i class='attrs-adorn__del' />").bind("click", function () {
            $li.remove();
        }).appendTo($li);

        $ul.sortable();
    },

    delProductColorSizeGroup: function () {
        var _this = this;

        var doing = new pospal.ui.loading($("#colorSizeGroupEditDiv"));
        pospal.ajax({
            url: "/Product/DelProductColorSizeGroup",
            data: { "groupUid": $("#colorSizeGroupEditDiv").data("groupUid"), "returnGroups": true },
            success: function (result) {
                if (result.successed) {
                    $("#colorSizeGroupEditDiv .popupClose")[0].click();
                    _this.resetColorSizeGroups(result.productColorGroups, result.productSizeGroups);
                    _this.buildGroupListView();
                } else {
                    new pospal.ui.msgBox({ content: result.msg, autoCloseSec: 0 });
                }
            },
            complete: function () {
                doing.destroy();
            }
        });
    },

    saveProductColorSizeGroup: function (group) {
        var _this = this;

        var doing = new pospal.ui.loading($("#colorSizeGroupEditDiv"));
        pospal.ajax({
            url: "/Product/SaveProductColorSizeGroup",
            data: { "groupJson": JSON.stringify(group), "returnGroups": true },
            success: function (result) {
                if (result.successed) {
                    $("#colorSizeGroupEditDiv .popupClose")[0].click();
                    _this.resetColorSizeGroups(result.productColorGroups, result.productSizeGroups);
                    _this.buildGroupListView();
                } else {
                    new pospal.ui.msgBox({ content: result.msg, autoCloseSec: 0 });
                }
            },
            complete: function () {
                doing.destroy();
            }
        });
    },

    buildProductColorSizeGroup: function () {
        var group = {};
        group.uid = $("#colorSizeGroupEditDiv").data("groupUid");
        group.type = this.groupType;
        group.groupName = $("#colorSizeGroupEditDiv .txt_groupName").val().trim();
        group.pinyin = (makePy(group.groupName))[0];

        var productColorSizeList = [];
        $("#colorSizeGroupEditDiv .colorSizeListUL li").each(function (index, item) {
            var productColorSize = {};
            productColorSize.name = $(this).attr("data-name");
            productColorSize.pinyin = (makePy(productColorSize.name))[0];
            productColorSize.orderNumber = index;
            productColorSize.type = group.type;
            productColorSizeList.push(productColorSize);
        });
        group.productColorSizeList = productColorSizeList;

        return group;
    },

    showSortGroups: function () {
        var _this = this;

        $("#normalPopupBg").show();
        $("#mulColorSizeGroupSortDiv").removeClass("nodis");

        var key = this.groupType == 1 ? "颜色" : "尺码";
        $("#mulColorSizeGroupSortDiv .popupTitle h1").html("● " + lang.tryFormat("X组排序", [key]));

        var groups = this.groupType == 1 ? productColorGroups : productSizeGroups;
        var $ul = $("#mulColorSizeGroupSortDiv .groupListUL").html("");
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            $("<li data-uid=" + group.txtUid + " class='attrs-adorn is-drag' />").html(group.groupName).appendTo($ul);
        }

        $ul.sortable();
    },

    saveGroupsSort: function () {
        var _this = this;

        var groups = [];
        $("#mulColorSizeGroupSortDiv .groupListUL li").each(function (index, item) {
            var group = {};
            group.uid = $(this).attr("data-uid");
            group.orderNumber = index;
            groups.push(group);
        });


        var doing = new pospal.ui.loading($("#mulColorSizeGroupSortDiv"));
        pospal.ajax({
            url: "/Product/SaveGroupsSort",
            data: { "groupsJson": JSON.stringify(groups), "returnGroups": true },
            success: function (result) {
                if (result.successed) {
                    $("#mulColorSizeGroupSortDiv .popupClose")[0].click();
                    _this.resetColorSizeGroups(result.productColorGroups, result.productSizeGroups);
                    _this.buildGroupListView();
                } else {
                    new pospal.ui.msgBox({ content: result.msg, autoCloseSec: 0 });
                }
            },
            complete: function () {
                doing.destroy();
            }
        });
    }
}

editMulColorSizeProduct = {
    selectedColors: [], // name,number,groupUid,canEdit(当编辑商品时，之前用到的颜色不能编辑)

    selectedSizes: [],

    selectedProducts: [],

    productsViewType: 1, // 1- 颜色，2-尺码

    showColorSizeNumber: false,

    init: function () {
        var _this = this;

        this.showColorSizeNumber = $("#hf_enableColorSizeNumber").val() == "True";

        this.container = $("#mulColorSizeProductDiv");

        $("#edit_mulColorSize_div,#edit_mulColorSizeStock_div").bind("click", function () {
            var artNo = $("#edit_attribute4").val().trim();
            if (artNo.length == 0) {
                new pospal.ui.msgBox("请先填写货号");
            } else {
                var colors = $("#edit_mulColorSize_div").data("colors");
                var sizes = $("#edit_mulColorSize_div").data("sizes");
                var products = $("#edit_mulColorSize_div").data("products");

                _this.show(colors, sizes, products);
            }
        });

        this.container.find(".btnClose").bind("click", function () {
            _this.container.addClass("nodis");
        });

        //颜色选择器
        this.container.find(".txt_productColor").bind("click", function () {
            if ($(this).val().trim().length == 0 && productColorGroups.length > 0) {
                if (_this.container.find(".colorSelectorDiv").hasClass("nodis")) {
                    _this.showColorSizeGroupSelector(1);
                    setTimeout(function () {
                        $(document).one("click", function () {
                            _this.container.find(".colorSelectorDiv").addClass("nodis");
                        });
                    }, 10);
                } else {
                    return false;
                }
            }
        });

        this.container.find(".btnCloseColorSelector").bind("click", function () {
            _this.onCloseColorSizeGroupSelector(1);
        });

        $("#mulColorSizeProductDiv .colorSelectorDiv,#mulColorSizeProductDiv .sizeSelectorDiv").bind("click", function () {
            return false;
        });

        this.container.find(".txt_productColor").keyup(function (event) {
            if ($(this).val().trim().length == 0) {
                _this.container.find(".btnAddSelectedColor").addClass("is-disabled");
            } else {
                _this.container.find(".btnAddSelectedColor").removeClass("is-disabled");

                if (!_this.container.find(".colorSelectorDiv").hasClass("nodis")) {
                    $(document).click();
                }

                if (event.keyCode == 13) {
                    _this.container.find(".btnAddSelectedColor")[0].click();
                }
            }
        });

        this.container.find(".btnAddSelectedColor").bind("click", function () {
            if (!$(this).hasClass("is-disabled")) {
                var name = $(".txt_productColor").val().trim();
                if (name.length > 0) {
                    _this.addOrDelSelectedColorOrSize(1, 1, name);
                }
            }
        });

        //尺码选择器
        this.container.find(".txt_productSize").bind("click", function () {
            if ($(this).val().trim().length == 0 && productSizeGroups.length > 0) {
                if (_this.container.find(".sizeSelectorDiv").hasClass("nodis")) {
                    _this.showColorSizeGroupSelector(2);
                    setTimeout(function () {
                        $(document).one("click", function () {
                            _this.container.find(".sizeSelectorDiv").addClass("nodis");
                        });
                    }, 10);
                } else {
                    return false;
                }
            }
        });

        this.container.find(".btnCloseSizeSelector").bind("click", function () {
            _this.onCloseColorSizeGroupSelector(2);
        });

        this.container.find(".txt_productSize").keyup(function (event) {
            if ($(this).val().trim().length == 0) {
                _this.container.find(".btnAddSelectedSize").addClass("is-disabled");
            } else {
                _this.container.find(".btnAddSelectedSize").removeClass("is-disabled");

                if (!_this.container.find(".sizeSelectorDiv").hasClass("nodis")) {
                    $(document).click();
                }

                if (event.keyCode == 13) {
                    _this.container.find(".btnAddSelectedSize")[0].click();
                }
            }
        });

        this.container.find(".btnAddSelectedSize").bind("click", function () {
            if (!$(this).hasClass("is-disabled")) {
                var name = $(".txt_productSize").val().trim();
                if (name.length > 0) {
                    _this.addOrDelSelectedColorOrSize(1, 2, name);
                }
            }
        });

        //商品编辑区
        $("#tip_createMulColorSizeBarcodeRule").bind("click", function () {
            new pospal.ui.msgBox({ content: "条码默认按货号拼颜色尺码编号生成，保存前可修改（可通过修改条码前缀批量替换货号部分）", autoCloseSec: 0 });
        })

        this.container.find(".btnChangeViewType").bind("click", function () {
            if (_this.productsViewType == 1)
                _this.productsViewType = 2;
            else
                _this.productsViewType = 1;

            _this.buildProductTable();
        });

        this.ddl_batch_col01 = new pospal.ui.singleSelector({
            container: this.container.find(".ddl_batch_col01"),
            textWidth: hasMulColorSizeProductExtBarcode ? 109 : 114,
            selectBoxWidth: 128,
            arrow: "up",
            options: [{ text: this.productsViewType == 1 ? "所有颜色" : "所有尺码", value: "" }],
            onChange: function () { }
        });

        this.ddl_batch_col02 = new pospal.ui.singleSelector({
            container: this.container.find(".ddl_batch_col02"),
            textWidth: hasMulColorSizeProductExtBarcode ? 109 : 114,
            selectBoxWidth: 108,
            arrow: "up",
            options: [{ text: this.productsViewType == 1 ? "所有尺码" : "所有颜色", value: "" }],
            onChange: function () { }
        });

        this.container.find(".btnShowBatchUpdate").bind("click", function () {
            $(this).parent().hide();
            $(this).parent().parent().find("div.batchItem").removeClass("nodis");
        });

        this.container.find("input.txt_batch").keyup(function () {
            var batch_stock = _this.container.find("input.txt_batch_stock").val().trim();
            if (batch_stock.length > 0 && !_this.formValidator.isInteger(batch_stock)) {
                batch_stock = "";
                _this.container.find("input.txt_batch_stock").val("");
            }

            var batch_sellPrice = _this.container.find("input.txt_batch_sellPrice").val().trim();
            if (batch_sellPrice.length > 0 && !_this.formValidator.isNumeric(batch_sellPrice)) {
                batch_sellPrice = "";
                _this.container.find("input.txt_batch_sellPrice").val("");
            }

            var batch_buyPrice = _this.container.find("input.txt_batch_buyPrice").val().trim();
            if (batch_buyPrice.length > 0 && !_this.formValidator.isNumeric(batch_buyPrice)) {
                batch_buyPrice = "";
                _this.container.find("input.txt_batch_buyPrice").val("");
            }

            var batch_prefixCode = _this.container.find("input.txt_batch_prefixCode").val().trim();
            if (batch_prefixCode.length > 0 && !_this.formValidator.isValidBarcode(batch_prefixCode)) {
                batch_prefixCode = "";
                _this.container.find("input.txt_batch_prefixCode").val("");
            }
            var batch_extBarcode = "";
            if (_this.container.find("input.txt_batch_extBarcode").length > 0) {
                batch_extBarcode = _this.container.find("input.txt_batch_extBarcode").val().trim();
                if (batch_extBarcode.length > 0 && !_this.formValidator.isValidBarcode(batch_extBarcode)) {
                    batch_extBarcode = "";
                    _this.container.find("input.txt_batch_extBarcode").val("");
                }
            }

            if (batch_stock.length == 0 && batch_sellPrice.length == 0 && batch_buyPrice.length == 0 && batch_prefixCode.length == 0 && batch_extBarcode.length == 0) {
                _this.container.find(".btnBatchUpdate").addClass("is-disabled");
            } else {
                _this.container.find(".btnBatchUpdate").removeClass("is-disabled");
            }
        });

        this.container.find(".btnBatchUpdate").bind("click", function () {
            if (!$(this).hasClass("is-disabled")) {
                _this.batchUpdate();
            }
        });

        this.container.find(".btnConfrimColorSizeProduct").bind("click", function () {
            _this.confrimMulColorSizeProduct();
        });

        this.container.find(".secondDiv").width($(document).width());
        this.container.find(".secondDiv").css("min-height", ($(document).height() + 30) + "px");
        this.container.find(".mainDiv").height($(document).height() - 110);
        this.container.find(".mainDiv").mCustomScrollbar();

        this.formValidator = new pospal.formValidator();
    },

    refreshButtonSummary: function (colorNames, sizeNames, totalStock) {
        $("#edit_mulColorSize_div .selectedColors").html(colorNames.join("、"));
        $("#edit_mulColorSize_div .totalColorNum").html(colorNames.length > 0 ? lang.tryFormat("共{0}色", [colorNames.length]) : lang.tryGet("请选择"));
        $("#edit_mulColorSize_div .selectedSizes").html(sizeNames.join("、"));
        $("#edit_mulColorSize_div .totalSizeNum").html(sizeNames.length > 0 ? lang.tryFormat("共{0}码", [sizeNames.length]) : lang.tryGet("请选择"));
        $("#edit_mulColorSizeStock_div .totalStock").html(lang.tryFormat("总库存{0}", [totalStock]));
    },

    show: function (colors, sizes, products) {
        this.container.removeClass("nodis");
        this.container.find(".txt_productColor,.txt_productSize").val("");
        this.container.find(".btnAddSelectedColor,.btnAddSelectedSize").addClass("is-disabled");

        this.selectedColors = colors != null ? JSON.parse(JSON.stringify(colors)) : [];
        this.selectedSizes = sizes != null ? JSON.parse(JSON.stringify(sizes)) : [];
        this.selectedProducts = products != null ? JSON.parse(JSON.stringify(products)) : [];

        this.buildColorSizeGroupSelector(1);
        this.buildColorSizeGroupSelector(2);

        this.buildSelectedColorSizeDiv(1);
        this.buildSelectedColorSizeDiv(2);

        this.buildProductTable(false);

        var canEditStock = !editProduct.viewModel.hasProductArea;
        var $batch_stock = this.container.find("input.txt_batch_stock");
        if (canEditStock) {
            $batch_stock.removeAttr("disabled");
        } else {
            $batch_stock.attr("disabled", "disabled");
        }
    },

    buildColorSizeGroupSelector: function (groupType) {
        var _this = this;
        var groups = groupType == 1 ? productColorGroups : productSizeGroups;

        var $selectorDiv = groupType == 1 ? this.container.find(".colorSelectorDiv") : this.container.find(".sizeSelectorDiv");
        var $tbody = $selectorDiv.find(".attrs-group__tbody").html("");
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];

            var $tr = $("<div class='attrs-group__tr' />").appendTo($tbody);
            var $col1 = $("<div class='attrs-group__td is-col-1' />").appendTo($tr);
            var $col1_cell = $("<div class='attrs-group__cell-1 colorSizeGroupUL' />").appendTo($col1);
            _this.buildSelectorCheckBox($tr, group.txtUid, group.groupName, "").appendTo($col1_cell);

            var $col2 = $("<div class='attrs-group__td is-col-2' />").appendTo($tr);
            var $col2_cell = $("<div class='attrs-group__cell-2 clearfix colorSizeOpionsUL' />").appendTo($col2);
            for (var j = 0; j < group.productColorSizeList.length; j++) {
                var colorSize = group.productColorSizeList[j];
                $("<div class='attrs-group__checker'>").html(_this.buildSelectorCheckBox($tr, group.txtUid, colorSize.name, colorSize.number)).appendTo($col2_cell);
            }
        }
    },

    buildSelectorCheckBox: function ($tr, groupUid, name, number) {
        var $cbDiv = $("<div class='yb-checkbox' data-groupUid=" + groupUid + " data-name='" + name + "' data-number=" + number + "><div class='checkBoxDiv'><div class='checkBox14'><i></i></div><span>" + name + "</span></div></div>");
        var $cb = $cbDiv.bind("click", function () {
            if ($(this).find(".checkBoxDiv").hasClass("disabled")) return false;

            if ($(this).find(".checkBoxDiv").hasClass("on")) {
                $(this).find(".checkBoxDiv").removeClass("on");
            } else {
                if (number.length > 0 && $tr.parent().find("div.colorSizeOpionsUL .yb-checkbox[data-name=" + pospal.escapeJquery(name) + "] .checkBoxDiv.on").length > 0) {
                    new pospal.ui.msgBox({ content: "其它组已选择了 " + name, noClickCallBack: true });
                } else {
                    $(this).find(".checkBoxDiv").addClass("on");
                }
            }

            if (number.length == 0) {
                var duplicateNames = [];
                $tr.find("div.colorSizeOpionsUL .checkBoxDiv").each(function (index, item) {
                    if ($cbDiv.find(".checkBoxDiv").hasClass("on")) {
                        var isValid = true;
                        if (!$(item).hasClass("on")) {
                            var itemName = $(item).parent().attr("data-name");
                            if ($tr.parent().find("div.colorSizeOpionsUL .yb-checkbox[data-name=" + pospal.escapeJquery(itemName) + "] .checkBoxDiv.on").length > 0) {
                                duplicateNames.push(itemName);
                                isValid = false;
                            }
                        }
                        if (isValid) $(item).addClass("on");
                    } else {
                        if (!$(item).hasClass("disabled")) $(item).removeClass("on");
                    }
                });
                if (duplicateNames.length > 0) {
                    new pospal.ui.msgBox({ content: "其它组已选择了：" + duplicateNames.join("、"), noClickCallBack: true });
                    $cbDiv.find(".checkBoxDiv").removeClass("on");
                }
            } else {
                if ($tr.find("div.colorSizeOpionsUL .checkBoxDiv").not(".on").length == 0) {
                    $tr.find("div.colorSizeGroupUL .checkBoxDiv").addClass("on");
                } else {
                    $tr.find("div.colorSizeGroupUL .checkBoxDiv").removeClass("on");
                }
            }
        });

        return $cb;
    },

    showColorSizeGroupSelector: function (groupType) {
        var _this = this;

        var $selectorDiv = groupType == 1 ? this.container.find(".colorSelectorDiv") : this.container.find(".sizeSelectorDiv");
        $selectorDiv.removeClass("nodis");
        $selectorDiv.find(".checkBoxDiv").removeClass("on");
        $selectorDiv.find(".checkBoxDiv").removeClass("disabled");

        var selectedItems = groupType == 1 ? this.selectedColors : this.selectedSizes;
        for (var i = 0; i < selectedItems.length; i++) {
            var selectedItem = selectedItems[i];

            var $item_cb = $selectorDiv.find(".colorSizeOpionsUL .yb-checkbox[data-name=" + pospal.escapeJquery(selectedItem.name) + "][data-groupUid=" + selectedItem.groupUid + "] .checkBoxDiv");
            $item_cb.addClass("on");

            var editArr = $.grep(_this.selectedProducts, function (item, index) {
                return item.uid != "0" && (groupType == 1 ? item.attribute1 == selectedItem.name : item.attribute2 == selectedItem.name)
            });
            if (editArr.length > 0) $item_cb.addClass("disabled");
        }

        $selectorDiv.find(".attrs-group__tr").each(function (index, item) {
            if ($(item).find("div.colorSizeOpionsUL .checkBoxDiv").not(".on").length == 0) {
                $(item).find("div.colorSizeGroupUL .checkBoxDiv").addClass("on");
            }
        });
    },

    onCloseColorSizeGroupSelector: function (groupType) {
        $(document).click();

        var groupItems = [];
        var $selectorDiv = groupType == 1 ? this.container.find(".colorSelectorDiv") : this.container.find(".sizeSelectorDiv");
        $selectorDiv.find(".colorSizeOpionsUL .checkBoxDiv.on").each(function (index, item) {
            var groupItem = {};
            groupItem.name = $(item).parent().attr("data-name");
            groupItem.number = $(item).parent().attr("data-number");
            groupItem.groupUid = $(item).parent().attr("data-groupUid");
            groupItems.push(groupItem);
        });

        var selectedItems = groupType == 1 ? this.selectedColors : this.selectedSizes;
        for (var i = 0; i < selectedItems.length; i++) {
            var selectedItem = selectedItems[i];
            if (selectedItem.groupUid == 0) {
                groupItems.push(selectedItem);
            }
        }

        if (groupType == 1) {
            this.selectedColors = groupItems;
            this.container.find(".txt_productColor").select();
        } else {
            this.selectedSizes = groupItems;
            this.container.find(".txt_productSize").select();
        }

        this.selectedColorSizeOnChange(groupType);
    },

    buildSelectedColorSizeDiv: function (groupType) {
        var _this = this;

        var $mainDiv = groupType == 1 ? this.container.find(".selectedColorsDiv") : this.container.find(".selectedSizesDiv");
        $mainDiv.html("");

        var selectedItems = groupType == 1 ? this.selectedColors : this.selectedSizes;
        selectedItems = selectedItems.sort(compareColorSizeGroupOrder);
        if (selectedItems.length == 0) {
            $mainDiv.html("<div style='height:24px; line-height:24px;'>↑↑ " + lang.tryGet("请添加商品") + "" + lang.tryGet(groupType == 1 ? "颜色" : "尺码") + " ↑↑</div>");
        } else {
            for (var i = 0; i < selectedItems.length; i++) {
                var selectedItem = selectedItems[i];
                var $item = $("<div data-name='" + selectedItem.name + "' class='attrs-adorn big'>" + (this.showColorSizeNumber ? "<label>" + (selectedItem.number != null ? selectedItem.number : "-") + "</label>" : "") + "</div>").appendTo($mainDiv);
                if (groupType == 1) {
                    var imgSrc = "../../images/color_select.png";
                    if (editProduct.colorProductImages[selectedItem.name] && editProduct.colorProductImages[selectedItem.name].length > 0 && editProduct.colorProductImages[selectedItem.name][0].path) {
                        imgSrc = pospal.formatSmallImageUrl(imageDomain + editProduct.colorProductImages[selectedItem.name][0].path);
                    }
                    $('<img/>').addClass("attrs-adorn__image").attr("title", "添加商品图片").attr("src", imgSrc).bind("click", function () {
                        editMulColorSizeImages.show($(this).parent().attr("data-name"));
                    }).appendTo($item);
                }

                $("<font/>").html(selectedItem.name).appendTo($item);

                if (this.showColorSizeNumber) $item.addClass("withNum");
                if (selectedItem.number == null) {
                    $item.addClass("missNumber");
                    var tipStr = lang.tryFormat("编码已删除", ["\'" + selectedItem.name + "\'"]);
                    if ($("#mulColorSizeGroupDiv .btnShowColorSizeBase").length == 0) {
                        tipStr = lang.tryFormat("编码已删除联系总部", ["\'" + selectedItem.name + "\'"]);
                    }
                    $item.attr("title", tipStr);
                }

                var editArr = $.grep(_this.selectedProducts, function (item, index) {
                    return item.uid != "0" && (groupType == 1 ? item.attribute1 == selectedItem.name : item.attribute2 == selectedItem.name)
                });

                if (editArr == 0) {
                    $("<i class='attrs-adorn__del'></i>").css("right", "0").bind("click", function () {
                        _this.addOrDelSelectedColorOrSize(0, groupType, $(this).parent().attr("data-name"));
                    }).appendTo($item);
                }
            }
        }
    },

    refreshColorOrSizeOrderNumber: function (groupType) {
        var selectedItems = groupType == 1 ? this.selectedColors : this.selectedSizes;
        var groups = groupType == 1 ? productColorGroups : productSizeGroups;
        for (var j = 0; j < selectedItems.length; j++) {
            var itemName = selectedItems[j].name;
            if (selectedItems[j].sourceOrder == undefined || selectedItems[j].sourceOrder == null) {
                selectedItems[j].sourceOrder = j;
            }
            selectedItems[j].groupOrderNumber = null;
            for (var i = 0; i < groups.length; i++) {
                var itemIndex = pospal.inArray(groups[i].productColorSizeList, "name", itemName);
                if (itemIndex > -1) {
                    selectedItems[j].orderNumber = groups[i].productColorSizeList[itemIndex].orderNumber;
                    selectedItems[j].groupOrderNumber = groups[i].orderNumber;
                    selectedItems[j].groupUid = selectedItems[j].groupUid || groups[i].txtUid;
                    break;
                }
            }
        }
    },

    addOrDelSelectedColorOrSize: function (actionType, groupType, name) {
        var _this = this;
        name = name.replace('\'', '’');
        var selectedItems = groupType == 1 ? this.selectedColors : this.selectedSizes;

        if (actionType == 0) {
            var index = pospal.inArray(selectedItems, "name", name);
            if (index > -1) {
                selectedItems.splice(index, 1);
                this.selectedColorSizeOnChange(groupType);
            }
        } else {
            var index = pospal.inArray(selectedItems, "name", name);
            if (index > -1) {
                new pospal.ui.msgBox({ content: lang.tryFormat("X已存在", ["\"" + name + "\""]), noClickCallBack: true });
            } else {
                var inGroup = false;
                var groups = groupType == 1 ? productColorGroups : productSizeGroups;
                for (var i = 0; i < groups.length; i++) {
                    var group = groups[i];
                    index = pospal.inArray(group.productColorSizeList, "name", name);
                    if (index > -1) {
                        var groupItem = $.extend({}, group.productColorSizeList[index]);
                        groupItem.groupUid = group.txtUid;
                        groupItem.groupOrderNumber = group.orderNumber;
                        groupItem.sourceOrder = selectedItems.length;
                        selectedItems.push(groupItem);
                        this.selectedColorSizeOnChange(groupType);
                        inGroup = true;
                        break;
                    }
                }

                if (!inGroup) {
                    var productColorBase = editColorSizeBase.getBaseColorSize(groupType, name);
                    if (productColorBase != null) {
                        var newItem = {};
                        newItem.name = productColorBase.name;
                        newItem.number = productColorBase.number;
                        newItem.groupUid = 0;
                        newItem.sourceOrder = selectedItems.length;
                        selectedItems.push(newItem);
                        _this.selectedColorSizeOnChange(groupType);
                    } else {
                        if (_this.showColorSizeNumber) {
                            if ($("#mulColorSizeGroupDiv .btnShowColorSizeBase").length > 0) {
                                new pospal.ui.msgBox({
                                    boxType: "confirm",
                                    content: "编码设置处于开启状态<br/> 需要先给 \'" + name + "\' 设置编码，前往设置？",
                                    onConfirm: function () {
                                        if (this.confirmValue) {
                                            editColorSizeGroup.groupType = groupType;
                                            $("#mulColorSizeGroupDiv .btnShowColorSizeBase")[0].click();
                                            $("#mulColorSizeBaseDiv .btnShowEditColorSizeBaseDiv")[0].click();
                                            $("#colorSizeBaseEditDiv .txt_baseName").val(name);
                                            $("#colorSizeBaseEditDiv .txt_baseNumber").select();
                                        }
                                    }
                                });
                            } else {
                                new pospal.ui.msgBox("\'" + name + "\' 还未设置编码，请联系总部设置。");
                            }
                        } else {
                            var doing = new pospal.ui.loading(this.container.find("." + (groupType == 1 ? "colorSelectContainer" : "sizeSelectContainer")), true);
                            pospal.ajax({
                                url: "/Product/GetProductColorSizeBase",
                                data: { "type": groupType, "name": name },
                                success: function (result) {
                                    if (result.successed) {
                                        var newItem = {};
                                        newItem.name = result.productColorSizeBase.name;
                                        newItem.number = result.productColorSizeBase.number;
                                        newItem.groupUid = 0;
                                        newItem.sourceOrder = selectedItems.length;
                                        selectedItems.push(newItem);
                                        _this.selectedColorSizeOnChange(groupType);
                                    }
                                },
                                complete: function () {
                                    doing.destroy();
                                }
                            });
                        }
                    }
                }
            }

            groupType == 1 ? this.container.find(".txt_productColor").select() : this.container.find(".txt_productSize").select();
        }
    },

    selectedColorSizeOnChange: function (groupType) {
        this.buildSelectedColorSizeDiv(groupType);
        this.buildProductTable();
    },

    buildProductTable: function (saveDraft) {
        var _this = this;
        var col01Title = this.productsViewType == 1 ? lang.tryGet("商品颜色") : lang.tryGet("商品尺码");
        var col02Title = this.productsViewType == 1 ? lang.tryGet("商品尺码") : lang.tryGet("商品颜色");

        this.container.find(".mulColorSizeProductHeader .header_clo01_title span").html(col01Title);
        this.container.find(".mulColorSizeProductHeader .header_clo02_title span").html(col02Title);

        var ddl_batch_col01_options = [{ text: this.productsViewType == 1 ? lang.tryGet("所有颜色") : lang.tryGet("所有尺码"), value: "" }];
        var ddl_batch_col02_options = [{ text: this.productsViewType == 1 ? lang.tryGet("所有尺码") : lang.tryGet("所有颜色"), value: "" }];

        if (saveDraft == null || saveDraft) this.resetSelectedProducts();

        var $table = this.container.find(".mulColorSizeProductTable").html("");
        if (this.selectedColors == 0 || this.selectedSizes == 0) {
            var str = "";
            if (this.selectedColors == 0 && this.selectedSizes == 0)
                str = lang.tryGet("请先选择商品颜色和尺码");
            else if (this.selectedColors == 0)
                str = lang.tryGet("请先选择商品颜色");
            else if (this.selectedSizes == 0)
                str = lang.tryGet("请先选择商品尺码");
            $table.html("<div style='height:80px; line-height:80px;text-indent:14px; border-right:1px solid #ddd; width:" + (hasMulColorSizeProductExtBarcode ? "997" : "957") + "px;font-size:14px;'>" + str + "</div>");
        } else {
            var rowArr = this.productsViewType == 1 ? this.selectedColors : this.selectedSizes;
            var colArr = this.productsViewType == 1 ? this.selectedSizes : this.selectedColors;
            for (var i = 0; i < rowArr.length; i++) {
                var rowData = rowArr[i];
                ddl_batch_col01_options.push({ text: rowData.name, value: rowData.name });

                var $tbody = $("<div class='attrs-group__tbody'>").appendTo($table);
                for (var j = 0; j < colArr.length; j++) {
                    var colData = colArr[j];
                    if (i == 0) ddl_batch_col02_options.push({ text: colData.name, value: colData.name });

                    var color = this.productsViewType == 1 ? rowData : colData;
                    var size = this.productsViewType == 1 ? colData : rowData;

                    var product = null;
                    $.each(_this.selectedProducts, function (index, item) {
                        if (item.attribute1.toLowerCase() == color.name.toLowerCase() && item.attribute2.toLowerCase() == size.name.toLowerCase()) {
                            product = item;
                        }
                    });

                    var prefixCode = _this.container.find("input.txt_batch_prefixCode").val();
                    if (prefixCode.length == 0) prefixCode = $("#edit_attribute4").val().trim();

                    var generatedBarcode = color.number != null && size.number != null ? prefixCode + color.number + size.number : "";
                    if (generatedBarcode.length > 32) generatedBarcode = "";

                    var $tr = $("<div class='attrs-group__tr productRow' data-productId='" + (product != null && product.id != null ? product.id : "0") + "' data-productUid='" + (product != null && product.txtUid != null ? product.txtUid : "0") + "' />").appendTo($tbody);
                    $tr.data("data-color", color.name).data("data-size", size.name);
                    $tr.attr("data-color-group", color.groupUid).attr("data-size-group", size.groupUid);
                    var $col1 = $("<div class='attrs-group__td is-col01' />").appendTo($tr);
                    if (j != colArr.length - 1) $col1.addClass("no-border");
                    if (j == 0) $col1.html("<div class='attrs-group__headcell is-cell-left'>" + rowData.name + "</div>");

                    $("<div class='attrs-group__td is-col02'><div class='attrs-group__headcell is-cell-left'>" + colData.name + "</div></div>").appendTo($tr);

                    var stock = product != null ? product.stock : 0;
                    var originalStock = product != null && product.txtUid != 0 ? product.stock : 0;
                    var canEdit = !editProduct.viewModel.hasProductArea;
                    $("<div class='attrs-group__td is-col03'><div class='attrs-group__headcell is-cell-right'><input tab-index='" + (i * colArr.length + j) + "-1' class='attrs-group__input is-cell-right quantity stock' type='text' original-data='" + originalStock + "' value='" + stock + "' maxlength='8' " + (!eidtProductStock || !canEdit ? "disabled=disabled" : "") + " /></div></div>").appendTo($tr);

                    var sellPrice = product != null ? product.sellPrice : "";
                    var originalSellPrice = product != null && product.txtUid != 0 ? product.sellPrice : "";
                    $("<div class='attrs-group__td is-col04'><div class='attrs-group__headcell is-cell-right'><input tab-index='" + (i * colArr.length + j) + "-2' class='attrs-group__input is-cell-right quantity sellPrice' type='text' original-data='" + originalSellPrice + "' value='" + sellPrice + "' maxlength='8' /></div></div>").appendTo($tr);

                    var buyPrice = product != null ? product.buyPrice : "";
                    var originalBuyPrice = product != null && product.txtUid != 0 ? product.buyPrice : "";
                    var $tdBuyPrice = $("<div class='attrs-group__td is-col05'><div class='attrs-group__headcell is-cell-right'><input tab-index='" + (i * colArr.length + j) + "-3' class='attrs-group__input is-cell-right quantity buyPrice' type='text' original-data='" + originalBuyPrice + "' value='" + buyPrice + "' maxlength='8' /></div></div>").appendTo($tr);
                    if (!hasPriceAuth && product != null) {
                        $tdBuyPrice.find("input.buyPrice").attr("type", "password").attr('readonly', true);
                    }

                    var $col6 = $("<div class='attrs-group__td is-col06' />").appendTo($tr);
                    var $col6_div = $("<div class='attrs-group__headcell is-cell-left is-color6' />").appendTo($col6);
                    if (product != null && product.txtUid != null && product.txtUid != 0) {
                        $("<span class='barcode' data-barcode='" + product.barcode + "' />").html(product.barcode).appendTo($col6_div);
                    } else {
                        var barcode = product != null ? product.barcode : generatedBarcode;
                        var originalBarcode = product != null && product.txtUid != 0 ? product.barcode : generatedBarcode;
                        $("<input tab-index='" + (i * colArr.length + j) + "-4' data-colorNumber='" + color.number + "' data-sizeNumber='" + size.number + "' class='attrs-group__input is-cell-left quantity barcode' type='text' original-data='" + originalBarcode + "' value='" + barcode + "' maxlength='32' />").appendTo($col6_div);
                    }

                    if (hasMulColorSizeProductExtBarcode) {
                        var $col8 = $("<div class='attrs-group__td is-col08' />").appendTo($tr);
                        var $col8_div = $("<div class='attrs-group__headcell is-cell-left is-color8' />").appendTo($col8);
                        var extBarcode = product != null && product.extBarcode ? product.extBarcode : "";
                        var originalExtBarcode = product != null && product.txtUid != 0 && product.extBarcode ? product.extBarcode : "";
                        $("<input tab-index='" + (i * colArr.length + j) + "-5' data-colorNumber='" + color.number + "' data-sizeNumber='" + size.number + "' class='attrs-group__input is-cell-left quantity extBarcode' type='text' original-data='" + originalExtBarcode + "' value='" + extBarcode + "' maxlength='32' />").appendTo($col8_div);
                    }

                    var $col7 = $("<div class='attrs-group__td is-col07' ><div class='attrs-group__headcell'></div></div>").appendTo($tr);
                    $("<div class='is-disabled' style=display:none; />").appendTo($tr);

                    if (product == null || product.isDel != true) {
                        $col7.find(".attrs-group__headcell").append("<div class='productStatus'></div>");
                        if (product != null && product.enable == 0) {
                            $tr.find(".attrs-group__td:not(.is-col01,.is-col07)").addClass("disabled");
                            $col7.find(".productStatus").addClass("disabled").html(lang.tryGet("禁用"));
                        }
                        else {
                            $tr.find(".attrs-group__td").removeClass("disabled");
                            $col7.find(".productStatus").addClass("enable").html(lang.tryGet("启用"));
                        }
                    }

                    if (product == null || product.id == "0") {
                        if ($col7.find(".productStatus").length > 0) $col7.find(".attrs-group__headcell").append("<div class='split'>|</div>");
                        $col7.find(".attrs-group__headcell").append("<div class='productTrigger'></div>");

                        if (product != null && product.isDel == true) {
                            $tr.find(".attrs-group__input").hide();
                            $tr.find("input.sellPrice,input.buyPrice,input.barcode,input.extBarcode").val("");
                            $tr.find("input.stock").val("0");
                            $tr.find(".attrs-group__td:not(.is-col01,.is-col07)").addClass("disabled");
                            $col7.find(".productTrigger").removeClass("del").addClass("recover").html(lang.tryGet("恢复"));
                        }
                        else {
                            $tr.find(".attrs-group__input").show();
                            $tr.find("input.barcode").val(product != null ? product.barcode : generatedBarcode);
                            $tr.find(".attrs-group__td").removeClass("disabled");
                            $col7.find(".productTrigger").removeClass("recover").addClass("del").html(lang.tryGet("删除"));
                        }
                    }

                    $col7.find(".productStatus").bind("click", function () {
                        if ($(this).hasClass("enable")) {
                            $(this).parents(".productRow").find(".attrs-group__td:not(.is-col01,.is-col07)").addClass("disabled");
                            $(this).removeClass("enable").addClass("disabled").html(lang.tryGet("禁用"));
                            //$tr.find("div.is-disabled").show();
                        } else {
                            $(this).parents(".productRow").find(".attrs-group__td").removeClass("disabled");
                            $(this).removeClass("disabled").addClass("enable").html(lang.tryGet("启用"));
                            //$tr.find("div.is-disabled").hide();
                        }
                    });

                    $col7.find(".productTrigger").bind("click", function () {
                        var $button = $(this);
                        new pospal.ui.msgBox({
                            boxType: "confirm",
                            content: lang.tryGet("确认") + ($button.hasClass("del") ? lang.tryGet("删除") : lang.tryGet("恢复")) + lang.tryGet("此商品") + "？",
                            onConfirm: function () {
                                if (this.confirmValue) {
                                    _this.resetSelectedProducts();
                                    var productColor = $button.parents(".productRow").data("data-color");
                                    var productSize = $button.parents(".productRow").data("data-size");
                                    var productIndex = -1;
                                    $.each(_this.selectedProducts, function (index, item) {
                                        if (item.attribute1.toLowerCase() == productColor.toLowerCase() && item.attribute2.toLowerCase() == productSize.toLowerCase()) {
                                            productIndex = index;
                                        }
                                    });
                                    if (productIndex == -1) return;

                                    _this.selectedProducts[productIndex].isDel = $button.hasClass("del") ? true : false;
                                    _this.buildProductTable(false);
                                }
                            }
                        });
                    });

                    $tr.find("input").keyup(function (event) {
                        _this.checkInputValueChanged($(this));
                        var tabIndex = $(this).attr("tab-index").split('-');
                        var rowIdex = parseInt(tabIndex[0]);
                        var colIndex = parseInt(tabIndex[1]);

                        if (event.keyCode == 38) {
                            _this.container.find(".mulColorSizeProductTable input[tab-index=" + (rowIdex - 1) + "-" + colIndex + "]").select();
                        } else if (event.keyCode == 40) {
                            _this.container.find(".mulColorSizeProductTable input[tab-index=" + (rowIdex + 1) + "-" + colIndex + "]").select();
                        } else if (event.keyCode == 37) {
                            _this.container.find(".mulColorSizeProductTable input[tab-index=" + rowIdex + "-" + (colIndex - 1) + "]").select();
                        } else if (event.keyCode == 39) {
                            _this.container.find(".mulColorSizeProductTable input[tab-index=" + rowIdex + "-" + (colIndex + 1) + "]").select();
                        }
                    });

                    $tr.find("input").each(function () {
                        _this.checkInputValueChanged($(this));
                    });

                    $tr.find("input.stock").keyup(function () {
                        var stock = $(this).val().trim();
                        if (stock.length == 0 || !_this.formValidator.isInteger(stock)) {
                            $(this).val($(this).attr("original-data"));
                            _this.checkInputValueChanged($(this));
                        }
                        _this.reCountTotalStock();
                    });

                    $tr.find("input.sellPrice,input.buyPrice").keyup(function () {
                        var price = $(this).val().trim();
                        if (price.length == 0 || !_this.formValidator.isNumeric(price)) {
                            $(this).val($(this).attr("original-data"));
                            _this.checkInputValueChanged($(this));
                        }
                    });

                    $tr.find("input.extBarcode").keyup(function () {
                        var extBarcode = $(this).val().trim();
                        if (extBarcode.length == 0 || !_this.formValidator.isValidBarcode(extBarcode)) {
                            $(this).val('');
                            _this.checkInputValueChanged($(this));
                        }
                    });
                }
            }
        }

        this.ddl_batch_col01.update(ddl_batch_col01_options);
        this.ddl_batch_col02.update(ddl_batch_col02_options);
        this.container.find("input.txt_batch").val("");

        this.reCountTotalStock();
    },

    checkInputValueChanged: function (e) {
        if ($(e).val().trim() != $(e).attr("original-data")) {
            $(e).addClass("c-is-active");
        } else {
            $(e).removeClass("c-is-active");
        }
    },

    batchUpdate: function () {
        var _this = this;
        var batch_stock = _this.container.find("input.txt_batch_stock").val().trim();
        var batch_sellPrice = _this.container.find("input.txt_batch_sellPrice").val().trim();
        var batch_buyPrice = _this.container.find("input.txt_batch_buyPrice").val().trim();
        var batch_prefixCode = _this.container.find("input.txt_batch_prefixCode").val().trim();
        var batch_extBarcode = _this.container.find("input.txt_batch_extBarcode").length > 0 ? _this.container.find("input.txt_batch_extBarcode").val().trim() : "";

        var updateColor = this.productsViewType == 1 ? this.ddl_batch_col01.getSelectedValue() : this.ddl_batch_col02.getSelectedValue();
        var updateSize = this.productsViewType == 1 ? this.ddl_batch_col02.getSelectedValue() : this.ddl_batch_col01.getSelectedValue();

        this.container.find(".mulColorSizeProductTable .productRow").each(function (index, item) {
            var productColor = $(this).data("data-color");
            var productSize = $(this).data("data-size");

            if ($(this).find(".productTrigger.recover").length == 0 && (updateColor == "" || updateColor == productColor) && (updateSize == "" || updateSize == productSize)) {
                if (batch_stock.length > 0) {
                    $(this).find("input.stock").val(batch_stock);
                }

                if (batch_sellPrice.length > 0) {
                    $(this).find("input.sellPrice").val(batch_sellPrice);
                }

                if (batch_buyPrice.length > 0) {
                    $(this).find("input.buyPrice").val(batch_buyPrice);
                }

                if (batch_prefixCode.length > 0) {
                    var $barcodeInput = $(this).find("input.barcode");
                    var barcode = batch_prefixCode + $barcodeInput.attr("data-colorNumber") + $barcodeInput.attr("data-sizeNumber");
                    $barcodeInput.val(barcode);
                }

                if (batch_extBarcode.length > 0) {
                    $(this).find("input.extBarcode").val(batch_extBarcode);
                }
            }

            $(this).find("input").each(function () {
                _this.checkInputValueChanged($(this));
            });
        });

        this.reCountTotalStock();
        //_this.container.find("input.txt_batch").val("");
    },

    reCountTotalStock: function () {
        var totalStock = 0;
        this.container.find(".mulColorSizeProductTable input.stock").each(function (index, item) {
            totalStock += parseInt($(item).val().trim());
        })
        this.container.find(".mulColorSizeProductTotalStock").html("合计库存：<span>" + totalStock + "</span>");
    },

    resetSelectedProducts: function () {
        var products = [];
        this.container.find(".mulColorSizeProductTable .productRow").each(function (index, item) {
            var product = {};
            product.id = $(this).attr("data-productId");
            product.uid = $(this).attr("data-productuid");
            product.txtUid = product.uid;
            product.attribute1 = $(this).data("data-color");
            product.ColorGroupUid = $(this).attr("data-color-group");
            product.attribute2 = $(this).data("data-size");
            product.SizeGroupUid = $(this).attr("data-size-group");
            product.stock = $(this).find("input.stock").val().trim();
            product.sellPrice = $(this).find("input.sellPrice").val().trim();
            product.buyPrice = $(this).find("input.buyPrice").val().trim();
            product.barcode = product.uid != "0" ? $(this).find("span.barcode").attr("data-barcode") : $(this).find("input.barcode").val().trim();
            if (hasMulColorSizeProductExtBarcode) product.extBarcode = $(this).find("input.extBarcode").val().trim();
            product.enable = $(this).find(".productStatus").hasClass("disabled") ? 0 : 1;
            product.isDel = $(this).find(".productTrigger").hasClass("recover") ? true : false;
            products.push(product);
        });

        this.selectedProducts = products;
    },

    confrimMulColorSizeProduct: function () {
        var _this = this;
        var barcodes = [];
        var barcodesForCompare = [];
        var isValid = true;
        var extBarcodes = [];
        var extBarcodesForCompare = [];
        this.container.find(".mulColorSizeProductTable .productRow").each(function (index, item) {
            var product = {};
            if ($(this).find(".productTrigger.recover").length == 0) {
                if (!$(this).find("input.stock").val().trim()) {
                    new pospal.ui.msgBox("请输入商品库存");
                    $(this).find("input.stock").select();
                    isValid = false;
                    return false;
                }

                var sellPrice = $(this).find("input.sellPrice").val().trim();
                if (sellPrice.length == 0) {
                    new pospal.ui.msgBox("请输入商品销售价");
                    $(this).find("input.sellPrice").select();
                    isValid = false;
                    return false;
                }

                var buyPrice = $(this).find("input.buyPrice").val().trim();
                if (buyPrice.length == 0) {
                    new pospal.ui.msgBox("请输入商品进货价");
                    $(this).find("input.buyPrice").select();
                    isValid = false;
                    return false;
                }

                var $input_barcode = $(this).find("input.barcode");
                if ($input_barcode.length > 0) {
                    var barcode = $input_barcode.val().trim();
                    if (barcode.length == 0) {
                        new pospal.ui.msgBox("请输入商品条码");
                        $input_barcode.select();
                        isValid = false;
                        return false;
                    } else if (!_this.formValidator.isValidBarcode(barcode)) {
                        new pospal.ui.msgBox("商品条码格式不正确，条码由：数字、字母、'_'、'-'、'*'组成。");
                        $input_barcode.select();
                        isValid = false;
                        return false;
                    }
                }

                var productBarcode = $(this).attr("data-productuid") != "0" ? $(this).find("span.barcode").attr("data-barcode") : $(this).find("input.barcode").val().trim();
                if ($.inArray(pospal.escapeJquery(productBarcode), barcodesForCompare) > -1) {
                    new pospal.ui.msgBox(lang.tryFormat("重复商品条码X", [productBarcode]) + "，请确认。");
                    isValid = false;
                    return false;
                } else {
                    barcodes.push(productBarcode);
                    barcodesForCompare.push(pospal.escapeJquery(productBarcode));
                }

                var $input_extBarcode = $(this).find("input.extBarcode");
                if ($input_extBarcode.length > 0) {
                    var extBarcode = $input_extBarcode.val().trim();
                    if (extBarcode.length == 0) {

                    } else if (!_this.formValidator.isValidBarcode(extBarcode)) {
                        new pospal.ui.msgBox("扩展条码格式不正确，条码由：数字、字母、'_'、'-'、'*'组成。");
                        $input_extBarcode.select();
                        isValid = false;
                        return false;
                    }
                }
                if ($(this).find("input.extBarcode").length > 0) {
                    var productextBarcode = $(this).find("input.extBarcode").val().trim();
                    if (productextBarcode.length > 0) {
                        if ($.inArray(pospal.escapeJquery(productextBarcode), extBarcodesForCompare) > -1 && !canExtBarcodeRepeat) {
                            new pospal.ui.msgBox(lang.tryFormat("重复扩展条码X", [productextBarcode]) + "，请确认。");
                            isValid = false;
                            return false;
                        } else {
                            extBarcodes.push(productextBarcode);
                            extBarcodesForCompare.push(pospal.escapeJquery(productextBarcode));
                        }
                    }
                }
            }
        });
        var dtd = null;
        if (extBarcodes.length > 0 && !canExtBarcodeRepeat) {
            var doing = new pospal.ui.loading(_this.container);
            var dtd = pospal.ajax({
                url: "/Product/ValidExtBarcodes",
                data: {
                    "userId": userSelector.getSelectedValue(),
                    "extBarcodes": JSON.stringify(extBarcodes),
                    "productBarcodes": JSON.stringify(barcodes)
                },
                success: function (result) {
                    if (result.successed) {
                        if (result.extBarcodes.length > 0) {
                            new pospal.ui.msgBox(lang.tryFormat("重复扩展条码X", [result.extBarcodes.join(',')]) + "，请确认。");
                            isValid = false;
                            return false;
                        }
                    }
                },
                complete: function () {
                    doing.destroy();
                }
            });
        }
        $.when(dtd).then(function () {
            if (isValid) {
                _this.resetSelectedProducts();
                var index = pospal.findIndex(_this.selectedProducts, function (it) { return it.isDel != true; });
                if (index == -1) {
                    new pospal.ui.msgBox("请至少添加一个颜色尺码");
                } else {
                    var colorNames = [];
                    $.each(_this.selectedColors, function (index, item) {
                        colorNames.push(item.name);
                    })

                    var sizeNames = [];
                    $.each(_this.selectedSizes, function (index, item) {
                        sizeNames.push(item.name);
                    });

                    var totalStock = _this.container.find(".mulColorSizeProductTotalStock span").text();
                    _this.refreshButtonSummary(colorNames, sizeNames, totalStock);

                    $("#edit_mulColorSize_div").data("colors", JSON.parse(JSON.stringify(_this.selectedColors)));
                    $("#edit_mulColorSize_div").data("sizes", JSON.parse(JSON.stringify(_this.selectedSizes)));
                    $("#edit_mulColorSize_div").data("products", JSON.parse(JSON.stringify(_this.selectedProducts)));

                    _this.container.addClass("nodis");
                }
            }
        });
    }
};

editProduct = {
    colorProductImages: null,
    ctrls: {
        tagEdit: {
            val: function (tags) {
                var _this = this;
                _this.ul = $("#edit_productTagList ul");
                if (arguments.length == 0) {
                } else {
                    this.ul.empty();
                    if (tags && tags.length > 0) {
                        $.each(tags, function (i, tag) {
                            var $li = $("<li/>").appendTo(_this.ul);
                            $("<span data-tagUid='" + tag.uid + "'>" + tag.name + "</span>").appendTo($li);
                        });
                        $("#edit_productTagList").show();
                    } else {
                        $("#edit_productTagList").hide();
                    }

                    if (hasProductClothingExtAttribute) {
                        editProduct.buildClothingTagUI(tags);
                    }
                }
            }
        },
    },

    init: function () {
        this.hasMoreCustomerPrice = $("#hf_hasMoreCustomerPrice").val() == "True";
        this.hasProdctCustomerSpecialPrice = $("#hf_hasProdctCustomerSpecialPrice").val() == "True";
        this.hasMoreWholesalePrice = $("#hf_hasMoreWholesalePrice").val() == "True";
        this.isNewWholesale = industryNumber == "116";
        this.hasMoreWholesaleSellPrice2 = this.hasMoreWholesalePrice || this.isNewWholesale;
        this.cfg = {
            hasSN: $("#edit_enableSN_div").length > 0
        };

        this.initControls();
        this.bindEvent();
        this.hasPluCode = industryNumber == "101" || industryNumber == "110" || industryNumber == "116" || industryNumber == "111" || industryNumber == "107" || industryNumber == "102";
    },

    initControls: function () {
        var _this = this;
        var that = this;

        this.edit_sb_enable = new pospal.ui.switchBox({
            container: $('#edit_sb_enable'),
            options: [{ text: lang.tryGet("启用"), value: "1" }, { text: lang.tryGet("禁用"), value: "0" }]
        });

        if (hasNoStockPrepay) {
            this.edit_sb_noStock = new pospal.ui.switchBox({
                container: $('#edit_sb_noStock'),
                options: [{ text: lang.tryGet("是", true), value: 1 }, { text: lang.tryGet("否", true), value: 0 }],
                selectedValue: 0,
                clickCallBack: function () {
                    _this.changeHasNoStock();
                }
            });

            $("#edit_tip_noStock").bind("click", function () {
                new pospal.ui.tip({
                    target: $("#edit_tip_noStock"),
                    arrow: "down",
                    position: { key: "right", value: -10 },
                    content: lang.tryGet("不计库存说明"),
                    width: 220
                });
            })
        }

        this.edit_sb_canAppointed = new pospal.ui.switchBox({
            container: $('#edit_sb_canAppointed'),
            options: [{ text: lang.tryGet("是", true), value: 1 }, { text: lang.tryGet("否", true), value: 0 }],
            selectedValue: 0,
            clickCallBack: function () {
            }
        });

        if (that.cfg.hasSN) {
            this.edit_enableSN = new pospal.ui.switchBox({
                container: $('#edit_enableSN'),
                options: [{ text: lang.tryGet("是", true), value: 1 }, { text: lang.tryGet("否", true), value: 0 }],
                selectedValue: 0
            });
        }

        if (hasWeighingAttribute) {
            this.edit_sb_isWeighing = new pospal.ui.switchBox({
                container: $('#edit_sb_isWeighing'),
                options: [{ text: "是", value: "1" }, { text: "否", value: "0" }],
                selectedValue: 0,
                clickCallBack: function () {
                    if (hasNoStockPrepay && _this.edit_sb_noStock && _this.edit_sb_noStock.getSelectedValue() == 1) {
                        _this.edit_sb_noStock.opts.clickCallBack();
                    }
                }
            });

            this.edit_countingSelector = new pospal.ui.singleSelector({
                container: $('#edit_ddl_counting'),
                textWidth: 117,
                selectBoxWidth: 113,
                selectBoxMaxHeight: 220,
                options: [{ text: "计重", value: "0" }, { text: "计数", value: "1" }],
                onChange: function () {

                }
            });
        }

        if ($("#edit_sb_isAICountStick").length > 0) {
            this.edit_sb_isAICountStick = new pospal.ui.switchBox({
                container: $('#edit_sb_isAICountStick'),
                options: [{ text: "是", value: "1" }, { text: "否", value: "0" }],
                selectedValue: "0"
            });
        }

        if ($("#edit_weightUnit").length > 0) {
            this.edit_weightUnitSelector = new pospal.ui.singleSelector({
                container: $('#edit_weightUnit'),
                textWidth: 66,
                selectBoxWidth: 63,
                selectBoxMaxHeight: 220,
                options: [{ text: "kg", value: "1" }, { text: "斤", value: "2" }],
                onChange: function () {

                }
            });
        }

        if ($("#edit_preparationTimeUnit").length > 0) {
            this.edit_preparationTimeUnitSelector = new pospal.ui.singleSelector({
                container: $('#edit_preparationTimeUnit'),
                textWidth: 50,
                selectBoxWidth: 46,
                selectBoxMaxHeight: 120,
                selectedValue: preparationTimeUnitConst.minute,
                options: [{ text: lang.tryGet("分钟"), value: preparationTimeUnitConst.minute }, { text: lang.tryGet("天"), value: preparationTimeUnitConst.day }],
                onChange: function () {

                }
            });
        }

        this.edit_sb_isPacking = new pospal.ui.switchBox({
            container: $('#edit_sb_isPacking'),
            options: [{ text: "是", value: "1" }, { text: "否", value: "0" }],
            selectedValue: 0,
            clickCallBack: function () {

            }
        });

        if (hasBarcodeScale) {
            this.edit_sb_isBarcodeScale = new pospal.ui.switchBox({
                container: $('#edit_sb_isBarcodeScale'),
                options: [{ text: "是", value: "1" }, { text: "否", value: "0" }],
                selectedValue: 0,
                clickCallBack: function () {
                    _this.changeHasBarcodeScale();
                }
            });
        }

        this.editProductBrandUid = "";

        this.edit_sb_isTiming = new pospal.ui.switchBox({
            container: $('#edit_sb_isTiming'),
            options: [{ text: lang.tryGet("是", true), value: 1 }, { text: lang.tryGet("否", true), value: 0 }],
            selectedValue: 0,
            clickCallBack: function () {
                _this.changeIsTiming();
            }
        });

        this.edit_sb_extBarcode = new pospal.ui.switchBox({
            container: $('#edit_sb_extBarcode'),
            options: [{ text: "是", value: "1" }, { text: "否", value: "0" }],
            selectedValue: 0,
            clickCallBack: function () {
                _this.changeHasExtBarcode();
            }
        });

        $("#edit_tip_isTiming").bind("click", function () {
            new pospal.ui.tip({
                target: $("#edit_tip_isTiming"),
                arrow: "down",
                position: { key: "right", value: -10 },
                content: lang.tryGet("计时商品说明"),
                width: 220
            });
        })

        var editMulColorSizeShowExtension = (pospal.getCookie("editMulColorSizeShowExtension") == "1" && hasClothingAttribute) ? 1 : 0;
        this.edit_mulcolorsize_enable = new pospal.ui.switchBox({
            container: $('#edit_mulcolorsize_enable'),
            options: [{ text: lang.tryGet("是"), value: "1" }, { text: lang.tryGet("否"), value: "0" }],
            selectedValue: editMulColorSizeShowExtension,
            clickCallBack: function () {
                if ($("#edit_productExtBarcode").length > 0) $("#edit_productExtBarcode").val('');
                _this.changeHasMulcolorsize();
            }
        });

        $("#edit_tip_mulcolorsize").bind("click", function () {
            new pospal.ui.tip({
                target: $("#edit_tip_mulcolorsize"),
                arrow: "down",
                position: { key: "right", value: -10 },
                content: lang.tryGet("多颜色尺码说明"),
                width: 220
            });
        });

        this.edit_productStoreSelector = new pospal.ui.singleSelector({
            container: $('#edit_ddl_store'),
            textWidth: 336,
            selectBoxWidth: 332,
            options: storeOptions,
            onChange: function () {

            }
        });
        var storeOptionsLength = pospal.tool.getOptionsCount(storeOptions);
        if (storeOptionsLength == 1) {
            $("#productStoreOptions").hide();
        }

        this.edit_productStoreSelector.setDisabled(true);

        var bottomObj = {
            content: lang.tryGet("创建分类"),
            clickCallBack: function () {
                if (fromPage == "help") {
                    categoryManage.show();
                }
                else {
                    var forClientFrameStr = pospal.website.forClientFrame ? "&forClientFrame=true" : "";
                    if (isMeiYe && _this.edit_sb_noStock != null && _this.edit_sb_noStock.getSelectedValue() == 1) {
                        pospal.openPage('/Category/Manage?defaultCategoryTab=server&autoAdd=true' + forClientFrameStr, true);
                    }
                    else if (isPetHospital) {
                        pospal.openPage('/Category/Manage?defaultCategoryTab=' + getDefaultCategoryTab() + '&autoAdd=true' + forClientFrameStr, true);
                    }
                    else {
                        pospal.openPage('/Category/Manage?autoAdd=true' + forClientFrameStr, true);
                    }
                }

            }
        };
        if (!hasAddProductCategoryAuth) bottomObj = null;
        this.edit_productCategorySelector = new pospal.ui.singleSelector({
            container: $('#edit_ddl_productCategory'),
            textWidth: 214,
            selectBoxWidth: 212,
            selectBoxMaxHeight: 220,
            options: [{ text: lang.tryGet("请选择商品分类"), value: "" }],
            bottom: bottomObj,
            onChange: function () {
                _this.changeProductCategory();
                _this.chageCategoryBindPrinter();
                _this.changeCategoryDefaultSetting();
            }
        });

        var timingUnitOptions = [{ text: lang.tryGet("分钟"), value: 1 }, { text: lang.tryGet("小时"), value: 60 }, { text: lang.tryGet("天"), value: 1440 }];
        if ($("#industryNumber").val() == "106") timingUnitOptions = [{ text: lang.tryGet("天"), value: 1440 }, { text: lang.tryGet("小时"), value: 60 }, { text: lang.tryGet("分钟"), value: 1 }];
        this.edit_timingUnitSelector = new pospal.ui.singleSelector({
            container: $('#ddl_timingUnit'),
            textWidth: 40,
            selectBoxWidth: 36,
            options: timingUnitOptions,
            onChange: function () {
                _this.changeTimingUnit();
            }
        });
        this.changeTimingUnit();

        this.edit_timingAtLeastUnitSelector = new pospal.ui.singleSelector({
            container: $('#ddl_timingAtLeastUnit'),
            textWidth: 40,
            selectBoxWidth: 36,
            options: timingUnitOptions,
            onChange: function () {

            }
        });

        $("#moreWholesalePrices .recipeList.middle, #moreWholesalePrices .recipeList.bottom").each(function (index, item) {
            var salableSelector = new pospal.ui.singleSelector({
                container: $(item).find(".buyerSalable"),
                textWidth: 50,
                selectBoxWidth: 44,
                selectedValue: 1,
                options: [{ text: "允许", value: 1 }, { text: "禁止", value: 0 }],
                onChange: function () {
                    if (salableSelector.getSelectedValue() == 0) {
                        $(item).find(".buyerMinQuantity,.buyerBaseQuantity,.buyerPrice").attr("readonly", "readonly").addClass("disable").val("");
                    } else {
                        $(item).find(".buyerMinQuantity,.buyerBaseQuantity,.buyerPrice").removeAttr("readonly").removeClass("disable");
                    }
                }
            });
            $(item).data("salableSelector", salableSelector)
        });

        if (this.hasMoreWholesalePrice || this.hasProdctCustomerSpecialPrice) {
            this.customerSelector = new pospal.customerSelector({
                onConfirm: function () {
                    if (_this.hasMoreWholesalePrice)
                        _this.addWholesaleCustomer();
                    else if (_this.hasProdctCustomerSpecialPrice)
                        _this.addSpecialCustomer()
                }
            });
            $("#btnShowCustomerSelector").bind("click", function () {
                _this.customerSelector.show();
            });
            $("#btnShowSpecialCustomerSelector").bind("click", function () {
                _this.customerSelector.show();
            });
        }

        this.edit_productBrandSelector = new pospal.ui.singleSelector({
            container: $('#edit_ddl_brand'),
            textWidth: 336.5,
            selectBoxWidth: 334,
            selectBoxMaxHeight: 220,
            bottom: {
                content: lang.tryGet("编辑"),
                clickCallBack: function () { productBrand.show(); }
            },
            options: [{ text: lang.tryGet("请选择"), value: "" }]
        });

        var editProductShowExtension = pospal.getCookie("editProductShowExtension") == "1" ? 1 : 0;
        if (editProductShowExtension == 1) {
            $(".curtains").hide();
        } else {
            $(".curtains").show();
        }

        this.edit_minor = new pospal.ui.switchBox({
            container: $('#edit_sb_minor'),
            options: [{ text: lang.tryGet("打开"), value: "1" }, { text: lang.tryGet("关闭"), value: "0" }],
            selectedValue: editProductShowExtension,
            clickCallBack: function () {
                if (_this.edit_minor.getSelectedValue() == "0") {
                    $(".curtains").show();
                } else {
                    $(".curtains").hide();
                }

                pospal.setCookie("editProductShowExtension", _this.edit_minor.getSelectedValue(), 365 * 24);
            }
        });

        this.edit_sb_isCustomerDiscount = new pospal.ui.switchBox({
            container: $('#edit_sb_isCustomerDiscount'),
            options: [{ text: "○", value: "1" }, { text: "-", value: "0" }],
            clickCallBack: function () {
                if (_this.edit_sb_isCustomerDiscount.getSelectedValue() == "0") {
                    $(".customerPrice_row_div .inputCurtains").hide();
                    $("#edit_customerPrice").focus();
                    if (_this.hasMoreCustomerPrice) {
                        $("#moreCustomerPriceDiv").show();
                    }
                    $("#isCustomerDiscount_ps").html(lang.tryGet("商品使用会员价"));
                    if (!$.trim($("#edit_customerPrice").val())) {
                        $("#edit_customerPrice").val($("#edit_sellPrice").val());
                    }
                } else {
                    $(".customerPrice_row_div .inputCurtains").show();
                    $("#moreCustomerPriceDiv").hide();
                    $("#isCustomerDiscount_ps").html(lang.tryGet("商品使用会员折扣"));
                }
            }
        });

        if (propCfg.IfNeedMake) {
            this.edit_sb_ifNeedMake = new pospal.ui.switchBox({
                container: $('#edit_sb_ifNeedMake'),
                options: [{ text: "是", value: "1" }, { text: "否", value: "0" }],
                selectedValue: 0,
                clickCallBack: function () {
                    if (_this.edit_sb_ifNeedMake.getSelectedValue() == "0") {
                        $("#edit_sb_ifNeedMake_ps").hide();
                    } else {
                        $("#edit_sb_ifNeedMake_ps").show();
                    }
                }
            });
        }

        this.edit_baseUnitSelector = new pospal.ui.singleSelector({
            container: $('#edit_ddl_unit'),
            textWidth: 116.5,
            selectBoxWidth: 113,
            selectBoxMaxHeight: 220,
            minOptionNumShowInput: 9,
            options: [{ text: lang.tryGet("请选择"), value: "" }],
            onChange: function () {
                _this.resetBaseUnit();
                _this.changeSpecExchangeLabel();
            },
            bottom: {
                content: lang.tryGet("编辑"),
                clickCallBack: function () { editStoreProductUnits.show(); }
            }
        });

        this.edit_productionDate = new pospal.ui.dateTimePicker({ container: $('#edit_productionDate'), type: "single", showArrow: false, showBtnClean: true });

        $("#edit_tip_minStock").bind("click", function () {
            new pospal.ui.tip({
                target: $("#edit_tip_minStock"),
                arrow: "up",
                position: { key: "right", value: -10 },
                content: lang.tryGet("库存上下限说明"),
                width: 220
            });
        });

        $("#edit_tip_pluCode").bind("click", function () {
            new pospal.ui.tip({
                target: $("#edit_tip_pluCode"),
                arrow: "up",
                position: { key: "right", value: -10 },
                content: lang.tryGet("称编码说明"),
                width: 220
            });
        });

        $("#edit_tip_depositValidDays").click(function () {
            new pospal.ui.tip({
                target: $(this),
                arrow: "up",
                position: { key: "right", value: -10 },
                content: "寄存过期日期=寄存日期+有效期天数<br/>1、可以在推送通知设置中设置寄存过期提醒。<br/>2、可打开系统设置- 自动计算存酒过期时间的设置项，此商品在存酒时会默认以寄存有效期天数自动计算存酒过期时间。",
                width: 400
            });
        });

        $("#edit_tip_tagPrice").click(function () {
            new pospal.ui.tip({
                target: $(this),
                arrow: "up",
                position: { key: "right", value: -10 },
                content: "用于打印吊牌标签显示价格",
                width: 220
            });
        });

        if (industryNumber == "102" || industryNumber == "114" || industryNumber == "107" || industryNumber == "115") {
            this.edit_sb_printLabel = new pospal.ui.switchBox({
                container: $('#edit_sb_printLabel'),
                options: [{ text: lang.tryGet("开"), value: "1" }, { text: lang.tryGet("关"), value: "0" }],
                selectedValue: "0",
                clickCallBack: function () {
                    var value = _this.edit_sb_printLabel.getSelectedValue();
                    if (value == "1") {
                        $("#btnShowLabelPrinterList").show();
                    } else {
                        $("#btnShowLabelPrinterList").hide();
                    }

                }
            });
        }

        this.edit_sb_moreSpec = new pospal.ui.switchBox({
            container: $('#edit_sb_moreSpec'),
            options: [{ text: "是", value: "1" }, { text: "否", value: "0" }],
            selectedValue: 0,
            clickCallBack: function () {
                if (_this.edit_sb_moreSpec.getSelectedValue() == "0") {
                    $("#edit_moreSpec_div").hide();
                } else {
                    $("#edit_moreSpec_div").show();
                }
            }
        });

        this.edit_sb_hasExchange = new pospal.ui.switchBox({
            container: $('#edit_sb_hasExchange'),
            options: [{ text: "是", value: "1" }, { text: "否", value: "0" }],
            selectedValue: 0,
            clickCallBack: function () {
                if (_this.edit_sb_hasExchange.getSelectedValue() == "1") {
                    $("#specListDiv").addClass("hasExchange");
                    $("#specListDiv .barcode").hide();
                    $("#specListDiv .unit").show();
                    $("#specListDiv .forSpecExchange").show();
                    if (hasNewCaseProductForRetail) {
                        $("#specListDiv .productStock").attr("readonly", "readonly");
                    }
                } else {
                    $("#specListDiv").removeClass("hasExchange");
                    $("#specListDiv .barcode").show();
                    $("#specListDiv .unit").hide();
                    $("#specListDiv .forSpecExchange").hide();
                    $("#specListDiv .productStock").removeAttr("readonly");
                }
            }
        });

        var firstSpecUnitSelector = new pospal.ui.singleSelector({
            container: $('#edit_ddl_firstSpec_unit'),
            textWidth: _this.hasMoreWholesaleSellPrice2 ? 60 : 70,
            selectBoxWidth: 100,
            selectBoxMaxHeight: 180,
            showInput: false,
            options: [{ text: lang.tryGet("请选择"), value: "" }],
            onChange: function () {
            }
        });
        $("#edit_ddl_firstSpec_unit").data("unitSelector", firstSpecUnitSelector);

        $("#edit_stockPosition").click(function () {
            if (!_this.viewModel.hasStockPositionObj) return;
            var $input = $(this),
                data = _this.viewModel,
                comm = data.productCommonAttribute;
            var obj = comm && comm.stockPositionObj ? JSON.parse(comm.stockPositionObj) : {};
            editStockPositionObjApp.show(data.userId, obj).then(function (res) {
                var newStr = jQuery.isEmptyObject(res.newVal) ? null : JSON.stringify(res.newVal);
                if (data.productCommonAttribute != null) {
                    data.productCommonAttribute.stockPositionObj = newStr;
                } else if (newStr != null) {
                    data.productCommonAttribute = { stockPositionObj: newStr };
                }
                $input.val(res.newString);
            });
        });
        this.buildFormValidator();
    },

    bindEvent: function () {
        var _this = this;

        $(".btnAddProduct").bind("click", function () {
            if (hasNewProductInfoAuth) {
                if (hasNewCateringIndustryAuth) {
                    pospal.openPage("/ProductInfo/Catering?userId=" + userSelector.getSelectedValue(), false);
                }
                else {
                    pospal.openPage("/ProductInfo/Retail?userId=" + userSelector.getSelectedValue(), false);
                }
            }
            else {
                _this.show();
                _this.resetEditUI();
            }
        });

        $(".btnAddCombo").bind("click", function () {
            var userId = userSelector.getSelectedValue();
            pospal.formPost("/Promotion/EditCombo", {
                userId: userId,
                currOperateUserId: userId,
                editTitle: "创建"
            }, true);
        });

        $("#editArea .btn.enterNewVersion").bind("click", function () {
            new pospal.ui.msgBox({
                boxType: "confirm",
                content: "确认切换到新版商品资料？",
                confirmText: lang.tryGet("是"),
                cancelText: lang.tryGet("否"),
                onConfirm: function () {
                    if (this.confirmValue) {
                        _this.changeProductInfo();
                    }
                }
            });
        });

        $(".btnAddCombProduct").bind("click", function () {
            _this.show();
            _this.resetEditUI(true);
        });

        $("#edit_barcode").keyup(function () {
            if ($(this).val().trim().length > 0) {
                $("#btn_createBarcode").hide();
                if ($("#editArea").data("id") == 0) {
                    $("#btn_confirmBarcode").show();
                }
            } else {
                $("#btn_createBarcode").show();
                $("#btn_confirmBarcode").hide();
            }
        });

        if ($("#edit_artNo_div").length > 0) {
            $("#edit_artNo_div input").keyup(function () {
                if ($(this).val().trim().length == 0 && _this.edit_mulcolorsize_enable.getSelectedValue() == "1") {
                    $("#btn_createArtNo").show();
                } else {
                    $("#btn_createArtNo").hide();
                }
            });

            $("#btn_createArtNo").bind("click", function () {
                _this.createArtNo();
            });

            $("#edit_artNo_div input").blur(function () {
                var artNO = $(this).val().trim();
                if (artNO.length > 0 && _this.edit_mulcolorsize_enable.getSelectedValue() == "1" && $("#editArea").data("id") == 0) {
                    _this.checkMulColorSizeArtNo(artNO);
                }
            });
        }

        $("#btn_createBarcode").bind("click", function () {
            var isWeighing = _this.edit_sb_isWeighing && _this.edit_sb_isWeighing.getSelectedValue() == "1";
            var isBarcodeScale = _this.edit_sb_isBarcodeScale && _this.edit_sb_isBarcodeScale.getSelectedValue() == "1";
            var needAvoidPayPlatformCodePrefix = hasAvoidPayPlatformBarcodePrefix && (isWeighing || isBarcodeScale);
            if (hasAutoFreshBarcodeGenerationRule && (isWeighing || isBarcodeScale)) {
                _this.createBarcodeByGenerationRuleForFresh();
            }
            else if (hasBarcodeGenerationRule) {
                _this.createBarcodeByGenerationRule();
            }
            else {
                _this.createBarcode(needAvoidPayPlatformCodePrefix);
            }
        });

        $("#btn_confirmBarcode").bind("click", function () {
            _this.getSuggestProductName();
        });

        $("#edit_mulColorSizeStock_div .tip_edit_mulColorSize").bind("click", function () {
            return false;
        });

        $("#edit_productName").keyup(function () {
            var pinyin = makePy($(this).val());
            $("#edit_pinyin").val(pinyin);
        });

        $("#edit_sellPrice").blur(function () {
            var sellPrice = $(this).val().trim();
            if (!isNaN(sellPrice)) {
                //$("#edit_sellPrice2").val(sellPrice);
                //$("#edit_customerPrice").val(sellPrice);

                _this.setBaseUnitSellPrice();
                _this.setProfitPercent();
                _this.checkBuyAndSellPrice();
            }
        });

        $("#edit_buyPrice").blur(function () {
            _this.setProfitPercent();

            _this.checkBuyAndSellPrice();
        });
        $("#edit_sellPrice2").blur(function () {
            _this.setProfitPercent();
        });
        $("#btnAddUnitExchange").bind("click", function () {
            _this.addUnitExChange(true);
        });

        $("#edit_attribute6").keyup(function () {
            _this.changeSpecExchangeLabel();
        });

        $("#edit_pluCode").focus(function () {
            var barcode = $("#edit_barcode").val().trim();
            var pluLength = scalePluCodeLength == 4 ? 4 : 5;
            if ($(this).val() == "" && (barcode.length == 5 || barcode.length == 7) && barcode.length >= pluLength) {
                $(this).val(barcode.substr(barcode.length - pluLength, pluLength));
            }
        });

        $("#btnShowPrinterList").bind("click", function () {
            if (hasCatePrinterSetting) {
                editPrinterV2.show();
            }
            else {
                _this.showPrinterList();
            }
        });

        $("#btnShowLabelPrinterList").bind("click", function () {
            _this.showLabelPrinterList();
        });

        $("#printerList .popupClose, #printerList .confirm").bind("click", function () {
            _this.hidePrinterList();
        });

        //隐藏标签机
        $("#labelPrinterList .popupClose, #labelPrinterList .confirm").bind("click", function () {
            _this.hideLabelPrinterList();
        });

        $(".editBottom .save").bind("click", function () {
            _this.saveProduct();
        });

        $(".editBottom .del").bind("click", function () {
            _this.deleteProduct();
        });

        $("#showExtBarcodes").bind("click", function () {
            var extBarcodes = JSON.parse(JSON.stringify($("#editArea").data("productExtBarcodes")));
            var barcode = $("#edit_barcode").val().trim();
            var id = $("#editArea").data("id");
            editExtBarcode.show();
            editExtBarcode.bindData(barcode, extBarcodes, id == "0");
        });

        $(document).on("click", "#unitExChangeList .requestUnit", function () {
            if ($(this).hasClass("on")) {
                $(this).removeClass("on");
            } else {
                $("#unitExChangeList .requestUnit").removeClass("on");
                $(this).addClass("on");
            }
        });

        $("#edit_btnSelectTags").bind("click", function () {
            _this.showTagSelector();
        });

        $("#edit_btnSelectTaste").bind("click", function () {
            tasteApp.show();
        });

        $("#tagList .btnShowEditTagDiv").bind("click", function () {
            $("#tagList,#popupBg").hide();
            productTagApp.show();
        });

        $("#tagList .popupClose").bind("click", function () {
            $("#tagList,#popupBg").hide();
        });

        $(document).on("click", "#editArea input.buyerMinQuantity,#editArea input.buyerPrice", function () {
            $(this).select();
            $(this).parent().removeClass("focus");
        })

        $(document).on("click", ".btnShowBaseQuantityTip", function () {
            new pospal.ui.msgBox({ content: "设置了基数，商品数量只能按基数的倍数来销售。", autoCloseSec: 0 });
        });

        $("#btn_add_spec").bind("click", function () {
            _this.createNewSpecItemUI(null);
        });

        $("#btn_order_spec").bind("click", function () {
            if (!_this.checkMoreSpec()) return false;
            editMoreSpecOrder.show();
        });

        $("#btn_select_spec").bind("click", function () {
            var barcodes = [];
            barcodes.push($("#edit_barcode").val().trim());
            productSelectorApp.show(barcodes).then(function (selected) {
                var hasExchange = _this.edit_sb_hasExchange.getSelectedValue() == "1";
                for (var i = 0; i < selected.length; i++) {
                    var product = selected[i];
                    var $newItem = null;
                    $("#specListDiv .specItem").each(function (index, item) {
                        if (!$(item).is(":hidden") && $(item).attr("data-productid") == "0") {
                            var $optional = $(item).find(".item.optional");
                            var $required = $(item).find(".item.required");
                            var barcode = hasExchange ? $optional.find(".productBarcode").val().trim() : $required.find(".barcode").val().trim();
                            var attribute6 = $required.find(".productSpec").val().trim();
                            if (barcode == "" && attribute6 == "") {
                                $newItem = $(item);
                                return false;
                            }
                        }
                    });

                    if ($newItem == null) $newItem = _this.createNewSpecItemUI(null);

                    $newItem.find(".barcode").attr("readonly", "readonly").val(product.barcode);
                    $newItem.find(".productBarcode").attr("readonly", "readonly").val(product.barcode);
                    if (product.attribute6 == null || product.attribute6 == "") {
                        $newItem.find(".productSpec").removeAttr("readonly");
                    }
                    else {
                        $newItem.find(".productSpec").attr("readonly", "readonly").val(product.attribute6);
                    }
                    if (_this.hasMoreWholesaleSellPrice2) {
                        $newItem.find(".productSellPrice2").attr("readonly", "readonly").val(product.sellPrice2 == null ? "0" : product.sellPrice2);
                    }

                    if (hasExchange) {
                        var baseUnitSelector = $newItem.find(".unit.singleSelector").data("unitSelector");
                        baseUnitSelector.setSelectedValue(product.baseUnitUid);
                        baseUnitSelector.setDisabled(true);
                    }

                    $newItem.find(".productSellPrice").attr("readonly", "readonly").val(product.sellPrice == null ? "0" : product.sellPrice);
                    $newItem.find(".productBuyPrice").attr("readonly", "readonly").val(product.buyPrice == null ? "0" : product.buyPrice);
                    $newItem.find(".productStock").attr("readonly", "readonly").val(product.stock == null ? "0" : product.stock);
                }
            });
        });
    },

    show: function () {
        this.editProductBrandUid = "";
        layout.showOrHideEditArea(true);
        $("#editArea .editScrollWapper").mCustomScrollbar('scrollTo', 'top', {
            scrollInertia: 0
        });
    },

    changeHasNoStock: function () {
        var isNew = $("#editArea").data("id") == 0;

        if (this.edit_sb_noStock.getSelectedValue() == 1) {
            if (hasClothingAttribute) {
                this.edit_mulcolorsize_enable.set(0);
                this.edit_mulcolorsize_enable.opts.clickCallBack();
                $("#edit_mulcolorsize_item").hide();
            }
            if (hasTimingProduct) $("#sb_isTiming_div").show();

            if (hasProductCanAppointed) $("#edit_canAppointed_div").show();
            //服务时长显示条件为 开启服务商品且关闭计时商品
            if (hasServiceAtLeastMinutes) {
                if (this.edit_sb_isTiming.getSelectedValue() == 1) {
                    $("#edit_serviceAtLeastMinutes_div").hide();
                } else {
                    $("#edit_serviceAtLeastMinutes_div").show();
                }
            }

            var isPassPromotionProduct = $("#editArea").data("isPassPromotionProduct");
            this.updateEditProductCategorySelect(isPassPromotionProduct ? "card" : "server");
            this.chageCategoryBindPrinter();

            $(".notForNoStock").hide();
            this.formValidator.findFormItem("stock").needValidate = false;
            if (isValidateProductUnit) this.formValidator.findFormItem("unit").needValidate = false;
            this.edit_sb_hasExchange.set(0);
            this.edit_sb_hasExchange.opts.clickCallBack();
            $("#specListDiv").addClass("noStock");
            $("#specListDiv .productStock").hide();
            $("#hasSpecExchangeDiv").hide();
            if (pospal.tool.contains([111], pospal.website.industryNumber) && this.edit_sb_isWeighing && this.edit_sb_isWeighing.getSelectedValue() == "1") {
                $("#edit_ddl_unit").parent().show();
                $("#edit_attribute6").parent().addClass("twoPartRight");
            }
            else {
                $("#edit_attribute6").parent().removeClass("twoPartRight");
            }
            if ($("#edit_volume").length > 0) $("#edit_volume").val("");
            if ($("#edit_weight").length > 0) $("#edit_weight").val("");
        } else {
            this.edit_sb_canAppointed.set(0);
            $("#edit_canAppointed_div").hide();

            if (hasClothingAttribute && isNew) {
                $("#edit_mulcolorsize_item").show();
                this.changeHasMulcolorsize();
            }
            if (hasTimingProduct) {
                this.edit_sb_isTiming.set(0);
                this.edit_sb_isTiming.opts.clickCallBack();
                $("#sb_isTiming_div").hide();
            }
            $(".notForNoStock").show();
            $("#hasSpecExchangeDiv").show();
            $("#specListDiv").removeClass("noStock");
            $("#specListDiv .productStock").show();
            $("#edit_attribute6").parent().addClass("twoPartRight");
            this.updateEditProductCategorySelect(getFilterType());
            this.chageCategoryBindPrinter();

            $("#edit_serviceAtLeastMinutes_div").hide();
            this.formValidator.findFormItem("stock").needValidate = true;
            if (isValidateProductUnit) this.formValidator.findFormItem("unit").needValidate = true;
        }
    },

    changeHasExtBarcode: function () {
        var _this = this;
        if (this.edit_sb_extBarcode.getSelectedValue() == "1") {
            var extBarcodes = JSON.parse(JSON.stringify($("#editArea").data("productExtBarcodes")));
            var barcode = $("#edit_barcode").val().trim();
            if (barcode) extBarcodes.unshift(barcode);
            $("#edit_barcode_div").addClass("hasExtBarcode");
            $("#showExtBarcodes").show().html(extBarcodes.join(","));
            //一品多码和多颜色尺码互斥
            var productId = $("#editArea").data("id");
            if (_this.edit_mulcolorsize_enable && _this.edit_mulcolorsize_enable.getSelectedValue() == "1" && productId == 0) {
                _this.edit_mulcolorsize_enable.set("0");
                _this.changeHasMulcolorsize();
            }

        }
        else {
            $("#edit_barcode_div").removeClass("hasExtBarcode");
            $("#showExtBarcodes").hide().html('');
        }
    },

    changeHasMulcolorsize: function () {
        this.resetMulColorSizeUI(false);
        pospal.setCookie("editMulColorSizeShowExtension", this.edit_mulcolorsize_enable.getSelectedValue(), 365 * 24);
    },

    changeIsTiming: function () {
        if (this.edit_sb_isTiming.getSelectedValue() == 0) {
            $(".notForTiming").show();
            $(".forTiming").hide();
            this.formValidator.findFormItem("sellPrice").needValidate = true;
            this.formValidator.findFormItem("buyPrice").needValidate = true;
            this.formValidator.findFormItem("timingPrice").needValidate = false;
            this.formValidator.findFormItem("minutesForSalePrice").needValidate = false;
            this.formValidator.findFormItem("atLeastMinutes").needValidate = false;
            this.formValidator.findFormItem("atLeastAmount").needValidate = false;
            this.formValidator.findFormItem("minutesForFree").needValidate = false;

            //服务时长显示条件为 开启服务商品且关闭计时商品
            if (hasServiceAtLeastMinutes) {
                if (this.edit_sb_noStock.getSelectedValue() == 1) {
                    $("#edit_serviceAtLeastMinutes_div").show();
                } else {
                    $("#edit_serviceAtLeastMinutes_div").hide();
                }
            }
        } else {
            $(".notForTiming").hide();
            $(".forTiming").show();
            $("#edit_serviceAtLeastMinutes_div").hide();
            this.formValidator.findFormItem("sellPrice").needValidate = false;
            this.formValidator.findFormItem("buyPrice").needValidate = false;
            this.formValidator.findFormItem("timingPrice").needValidate = true;
            this.formValidator.findFormItem("minutesForSalePrice").needValidate = true;
            this.formValidator.findFormItem("atLeastMinutes").needValidate = true;
            this.formValidator.findFormItem("atLeastAmount").needValidate = true;
            this.formValidator.findFormItem("minutesForFree").needValidate = true;
        }
    },

    changeProductCategory: function () {
        var _this = this;
        var categoryUid = this.edit_productCategorySelector.getSelectedValue();
        var subOptionValues = this.edit_productCategorySelector.getSelectedSubOptionValues();
        if (categoryUid == "0") {
            $("#editArea .categoryTips").show().html(lang.tryGet("无分类商品无法网店显示"));
        }
        else if (subOptionValues && subOptionValues.length > 1) {
            $("#editArea .categoryTips").show().html(lang.tryGet("分类含子分类无法网店显示"));
        }
        else {
            $("#editArea .categoryTips").hide().html("");
        }
    },
    chageCategoryBindPrinter: function () {
        var _this = this;
        var categoryUid = this.edit_productCategorySelector.getSelectedValue();
        if (hasCategoryPrinter && $("#editArea").data("id") == 0 && hasUserConfig1367) {
            var category = pospal.find(categoryList, function (v) { return v.txtUid == categoryUid; });
            if (category) {
                var printerUids = [];
                if (category.CategoryPrinter && category.CategoryPrinter.printerUids) {
                    printerUids = category.CategoryPrinter.printerUids.split(",");
                }
                _this.resetPrinterListUI(printerUids);
                if (hasCatePrinterSetting) {
                    var printerSettings = [];
                    if (category.CategoryPrinter && category.CategoryPrinter.printerSetting) {
                        printerSettings = JSON.parse(category.CategoryPrinter.printerSetting);
                    }
                    editPrinterV2.render(printerUids, printerSettings);
                    _this.reCountSeletedPrinterNum();
                }
            }
        }
    },
    changeCategoryDefaultSetting: function () {
        var categoryDefaultSetting = this.getCategoryDefaultSetting();
        if (categoryDefaultSetting) {//这些分类默认设置项在界面上存在，所以只改控件值即可
            if (this.edit_sb_isWeighing) {
                this.edit_sb_isWeighing.set(categoryDefaultSetting.isNeedWeighing.toString());
            }
            if (hasNoStockPrepay) {
                this.edit_sb_noStock.set(categoryDefaultSetting.isNoStock.toString());
                this.edit_sb_noStock.opts.clickCallBack();
            }
        }
    },

    changeTimingUnit: function () {
        //$("#label_atLeastUnitName").html(this.edit_timingUnitSelector.getSelectedText());
    },

    changeHasBarcodeScale: function () {
        if (this.edit_sb_isBarcodeScale.getSelectedValue() == "1") {
            $(".barcodeScaleDiv").show();
        }
        else {
            $(".barcodeScaleDiv").hide();
            $("#edit_pluCode").val("");
            this.edit_countingSelector.setSelectedValue("0");
        }
    },

    //编辑商品时,动态更新分类下拉框数据源,filterType:过滤后保留的类型
    updateEditProductCategorySelect: function (filterType) {
        var categoryOptions = JSON.parse(JSON.stringify(categoryList));
        if (isMeiYe) {
            if (filterType == "server") {
                categoryOptions = $.grep(categoryOptions,
                    function (v, i) {
                        return v.categoryType && v.categoryType == 1;
                    });
            } else if (filterType == "product") {
                categoryOptions = $.grep(categoryOptions,
                    function (v, i) {
                        return v.categoryType == null || v.categoryType == 0 || v.categoryType == 2;
                    });
            }
            else if (filterType == "card") {
                categoryOptions = $.grep(categoryOptions,
                    function (v, i) {
                        return v.categoryType && v.categoryType == 3;
                    });
            }
        }
        else if (isYiPei || isMuYinSecondary) {
            categoryOptions = $.grep(categoryOptions,
                function (v, i) {
                    return v.categoryType == null || v.categoryType == 0 || v.categoryType == 2;
                });
        }
        else if (isPetHospital) {
            filterType = getFilterType();
            if (filterType == "product") {
                categoryOptions = $.grep(categoryOptions,
                    function (v, i) {
                        return v.categoryType == null || v.categoryType == 0 || v.categoryType == 2;
                    });
            }
            else if (filterType == "examination") {//检查化验
                categoryOptions = $.grep(categoryOptions,
                    function (v, i) {
                        return v.categoryType && v.categoryType == 5;
                    });
            }
            else if (filterType == "operation") {//处方手术
                categoryOptions = $.grep(categoryOptions,
                    function (v, i) {
                        return v.categoryType && v.categoryType == 6;
                    });
            }
            else if (filterType == "registration") {//处方手术
                categoryOptions = $.grep(categoryOptions,
                    function (v, i) {
                        return v.categoryType && v.categoryType == 7;
                    });
            }
        }

        var optionsTemp = pospal.buildCategoryOptions(categoryOptions);
        optionsTemp.unshift({ text: lang.tryGet("请选择商品分类"), value: "" });
        var filterType = getFilterType();
        if (filterType == "" || filterType == "product") {
            optionsTemp.push({ text: "无（网店不显示）", value: "0" });
        }
        var originValue = this.edit_productCategorySelector.getSelectedValue();
        this.edit_productCategorySelector.update(optionsTemp);
        this.edit_productCategorySelector.setSelectedValue(originValue);
        this.changeProductCategory();
    },

    findProduct: function (productId, callbackFunc) {
        this.resetEditUI();
        this.show();

        var _this = this;

        var finding = new pospal.ui.loading($("#editArea"));
        pospal.ajax({
            url: "/Product/FindProduct",
            data: { "productId": productId },
            success: function (result) {
                var product = result.product;
                if (product.productCommonAttribute != null && product.productCommonAttribute.isTiming == 1) {
                    product.noStock = 1;
                }
                if (result.colorProductImages) _this.colorProductImages = result.colorProductImages;
                if (result.specProductOrders) $("#btn_order_spec").data("saveData", result.specProductOrders);
                _this.bindProduct(product, result.showType, result.moreSpecProducts, result.caseproductItems, result.mulColorSizeProducts, result.baseColors, result.baseSizes);
                //执行加载商品后回调
                if (callbackFunc && typeof callbackFunc == "function") {
                    callbackFunc.call(this);
                }
            },
            complete: function () {
                finding.destroy();
            }
        });
    },

    resetMulColorSizeUI: function (disable) {
        var _this = this;
        if (disable) {
            $("#edit_mulcolorsize_item").hide();
        } else {
            $("#edit_mulcolorsize_item").show();
        }
        $(".artNoRuleTips").hide();

        if (_this.edit_mulcolorsize_enable.getSelectedValue() == "1") {
            $(".mulColorSize4Open").show();
            $(".mulColorSize4Close,.notForMulColorSize").hide();
            $("#btnShowEditImages h1").html(lang.tryGet("编辑主图"));
            if ($("#edit_artNo_div").length > 0) {
                $("#edit_artNo_div").insertBefore($("#edit_barcode_div"));
                $(".artNoRuleTips").insertBefore($("#edit_barcode_div"));
                $("#edit_artNo_div input").val().trim().length > 0 ? $("#btn_createArtNo").hide() : $("#btn_createArtNo").show();
            }
            $("#edit_productExtBarcode_div").hide();

            //一品多码和多颜色尺码互斥
            var productId = $("#editArea").data("id");
            if (productId == 0) {//新增商品
                $(".artNoRuleTips").show();
            }
            else {//编辑多颜色尺码，隐藏一品多码开关
                $("#edit_extBarcode_item").hide();
            }

            if (_this.edit_sb_extBarcode && _this.edit_sb_extBarcode.getSelectedValue() == "1") {
                _this.edit_sb_extBarcode.set("0");
                _this.changeHasExtBarcode();
            }
        } else {
            $(".mulColorSize4Open,#edit_mulColorSizeStock_div").hide();
            $(".mulColorSize4Close,.notForMulColorSize").show();
            $("#btnShowEditImages h1").html(lang.tryGet("编辑图片"));
            $("#edit_productExtBarcode_div").show();
            if (hasNoStockPrepay && this.edit_sb_noStock.getSelectedValue() == "1") {
                $("#edit_stock_div").hide();
            }

            if ($("#edit_artNo_div").length > 0) {
                $("#edit_artNo_div").insertBefore($(".mulColorSize4Close")[0]);
                $("#btn_createArtNo").hide();
            }
        }

        if ((!$("#edit_mulcolorsize_item").is(":hidden") || $("#editArea").data("id") != 0) && this.edit_mulcolorsize_enable.getSelectedValue() == "1") {
            $("#em_required_artNo").show();
            this.formValidator.findFormItem("attribute4").needValidate = true;
            this.formValidator.findFormItem("barcode").needValidate = false;
            this.formValidator.findFormItem("sellPrice").needValidate = false;
            this.formValidator.findFormItem("buyPrice").needValidate = false;
            this.formValidator.findFormItem("stock").needValidate = false;
        } else {
            $("#em_required_artNo").hide();
            this.formValidator.delErrorMsg($("#edit_attribute4").parent());
            this.formValidator.findFormItem("attribute4").needValidate = false;
            this.formValidator.findFormItem("barcode").needValidate = true;
            this.formValidator.findFormItem("sellPrice").needValidate = true;
            this.formValidator.findFormItem("buyPrice").needValidate = true;
            if (!(hasNoStockPrepay && this.edit_sb_noStock.getSelectedValue() == "1")) {
                this.formValidator.findFormItem("stock").needValidate = true;
            }
        }
    },
    //isCombProduct--是否新增混售商品
    resetEditUI: function (isCombProduct) {
        var _this = this;
        _this.viewModel = { userId: userSelector.getSelectedValue() };
        var hasStockPositionObj = _this.viewModel.hasStockPositionObj = pospal.tool.contains(hasStockPositionObjUserIds, _this.viewModel.userId);
        var hasProductArea = _this.viewModel.hasProductArea = pospal.tool.contains(hasProductAreaUserIds, _this.viewModel.userId);

        this.formValidator.cleanMsg();
        $("#editArea").data("id", 0);
        $("#editArea").data("spu", "");
        $("#editArea").data("isDefaultSpecProduct", "0");
        $("#editArea").data("isPassPromotionProduct", false);
        $("#editArea").data("bindPassProducts", []);
        $("#editArea").data("productExtBarcodes", []);
        $("#editArea").data("attribute9", isCombProduct ? 1 : null);
        $("#editArea").data("isCaseProduct", "0");

        this.edit_sb_enable.set("1");
        //美业，隐藏是否服务商品开关，新建商品不能设置
        if (isMeiYe || isMuYinSecondary)
            $("#edit_isNoStock_div").hide();
        else
            $("#edit_isNoStock_div").show();

        this.edit_productStoreSelector.setSelectedValue(userSelector.getSelectedValue());

        $("#editArea .btn.cancel").text("取消");
        $("#edit_barcode").removeAttr("readonly");
        $("#btn_createBarcode").show();
        $("#btn_createArtNo").show();
        $("#btn_confirmBarcode").hide();
        $("#edit_attribute4").removeAttr("readonly");

        $("#editArea .edit_txt").val("");
        $("#edit_buyPrice").parent().show();
        $("#edit_buyPrice").attr("type", "text").attr('readonly', false);
        $("#edit_minutesForSalePrice,#edit_timingPrice,#edit_atLeastMinutes,#edit_atLeastAmount,#edit_minutesForFree").val("");
        $("#edit_stock").val("0");
        $("#edit_stockUnit").html("");
        $("#editArea .defaultImage img").remove();
        $("#edit_minSellQuantity").val("1");

        if (hasStockPositionObj) {
            $("#edit_stockPosition").attr("readonly", "readonly");
        } else {
            $("#edit_stockPosition").removeAttr("readonly");
        }

        this.edit_sb_isTiming.set(0);
        this.changeIsTiming();

        $("#moreWholesalePrices .recipeList.middle, #moreWholesalePrices .recipeList.bottom").each(function (index, item) {
            var salableSelector = $(item).data("salableSelector");
            salableSelector.setSelectedValue(1);
            salableSelector.opts.onChange();
            $(item).find("input").val("");
        });

        $("#moreWholesaleCustomerPrices .recipeList.middle").remove();

        $("#customerSpecialPrices").empty();

        this.edit_sb_isCustomerDiscount.set("1");
        this.edit_sb_isCustomerDiscount.setDisabled(!hasEditIsCustomerDiscount);
        $(".inputCurtains").show();
        if (pospal.website.industryNumber == "118" && !isSupplierCanEditPrice) {
            $(".sellPrice2_row_div .inputCurtains").show();
        }
        else {
            $(".sellPrice2_row_div .inputCurtains").hide();
        }
        $("#moreCustomerPriceDiv").hide();
        $("#isCustomerDiscount_ps").html(lang.tryGet("商品使用会员折扣"));

        var unitOptions = pospal.buildStoreUnitOptions(storeProductUnits);
        unitOptions.unshift({ text: lang.tryGet("请选择"), value: "" });
        this.edit_baseUnitSelector.update(unitOptions);
        this.edit_baseUnitSelector.setSelectedValue("");
        this.edit_baseUnitSelector.setDisabled(false);
        $("#unitExChangeList .exchange").remove();
        _this.setBaseUnitSellPrice();
        $("#unitExChangeList .requestUnit").removeClass("on");

        $("#btnAddUnitExchange").hide();

        $("#btnSupplierRanges").data("selectedSuppliers", []);
        $("#btnSupplierRanges span").html("0");

        var brandOptions = JSON.parse(JSON.stringify(brandSelector.opts.options));
        brandOptions[0].text = lang.tryGet("请选择");
        this.edit_productBrandSelector.update(brandOptions);

        if (industryNumber == "102" || industryNumber == "114" || industryNumber == "107" || industryNumber == "115") {
            //$("#baseUnitSuggestDiv").show();
            this.edit_sb_printLabel.set("0");
            editPrinterV2.render(null);
            this.resetPrinterListUI(null, null);
            this.resetLabelPrinterListUI(null);
        }

        if (!(industryNumber == "102" || industryNumber == "114" || industryNumber == "107" || industryNumber == "115")) {
            $("#baseUnitSuggestDiv").hide();
            $("#unitExChangeList .requestUnit").hide();
        } else {
            $("#unitExChangeList .requestUnit").hide();
        }
        this.updateEditProductCategorySelect(getFilterType());
        this.chageCategoryBindPrinter();

        if (this.edit_weightUnitSelector) this.edit_weightUnitSelector.setSelectedValue(1);
        if (this.edit_preparationTimeUnitSelector) this.edit_preparationTimeUnitSelector.setSelectedValue(preparationTimeUnitConst.minute);
        if (this.hasPluCode) $("#edit_pluCode").val("");

        if (attrCfg.depositValidDays) $("#edit_depositValidDays").val("");

        $("#edit_productTagList ul").empty();
        $("#edit_productTagList").hide();

        $("#edit_clothingTagList").empty();
        $("#edit_clothingTagList").hide();

        $("#edit_productTasteList ul").empty();
        $("#edit_productTasteList").hide();

        editImages.resetUI();

        $("#editArea .btn.save").show();
        $("#editArea .btn.del").hide();

        if (hasNoStockPrepay) {
            this.edit_sb_noStock.set(0);
            this.edit_sb_noStock.opts.clickCallBack();
        }

        this.edit_sb_canAppointed.set(0);

        if (this.cfg.hasSN) {
            this.edit_enableSN.set(0);
        }

        if (propCfg.IfNeedMake) {
            this.edit_sb_ifNeedMake.set(0);
            this.edit_sb_ifNeedMake.opts.clickCallBack();
        }

        $("#hasMoreSpecDiv,#hasSpecExchangeDiv").show();
        $("#specListDiv .specItem.default").show();
        $("#specListDiv .specItem.additional,#specListDiv .psExt").remove();
        $("#specListDiv .specItem .item.middle input").val("");
        $("#specListDiv .specItem .item.middle input.productStock").val("0");
        var ddl_firstSpec_unit = $("#edit_ddl_firstSpec_unit").data("unitSelector");
        ddl_firstSpec_unit.update(unitOptions);
        ddl_firstSpec_unit.setSelectedValue("");
        this.changeSpecExchangeLabel();
        this.edit_sb_hasExchange.set(0);
        this.edit_sb_hasExchange.opts.clickCallBack();
        this.edit_sb_moreSpec.set(0);
        this.edit_sb_moreSpec.opts.clickCallBack();
        $("#btn_add_spec,#btn_select_spec,#btn_order_spec").show();

        this.resetMulColorSizeUI(false);
        editMulColorSizeProduct.refreshButtonSummary([], [], 0);
        $("#edit_mulColorSize_div").data("colors", []);
        $("#edit_mulColorSize_div").data("sizes", []);
        $("#edit_mulColorSize_div").data("products", []);
        $("#edit_mulColorSize_div").data("oldProducts", []);

        $("#btnShowLabelPrinterList").hide();//隐藏标签机按钮

        if (hasWeighingAttribute) {
            this.edit_sb_isWeighing.set("0");
            this.edit_countingSelector.setSelectedValue("0");
        }
        if (this.edit_sb_isAICountStick) {
            this.edit_sb_isAICountStick.set("0");
        }
        if (hasBarcodeScale) {
            this.edit_sb_isBarcodeScale.set("0");
            this.edit_sb_isBarcodeScale.opts.clickCallBack();
        }
        this.edit_sb_isPacking.set("0");

        this.edit_sb_extBarcode.set("0");
        this.edit_sb_extBarcode.opts.clickCallBack();
        if (hasProductExtBarcodes && !hasSingleProductExtBarcode) {
            $("#edit_extBarcode_item").show();
        }
        else {
            $("#edit_extBarcode_item").hide();
        }

        var filterType = pospal.getLocationParamsWithDecode("filterType").toLowerCase();
        if (filterType == "registration") {//挂号项目隐藏一品多码，默认开启服务类商品
            this.edit_sb_noStock.set("1");
            this.edit_sb_noStock.opts.clickCallBack();
            $("#edit_extBarcode_item,#edit_isNoStock_div,#edit_productExtBarcode_div").hide();
        }
        this.colorProductImages = {};

        this.resetCombProductUI();

        this.resetBasicAttributeUI();

        $("#edit_profitPercent").hide();
        $(".productSyncInfo").hide();

        $("#btn_order_spec").data("saveData", []);
    },

    bindProduct: function (product, showType, moreSpecProducts, caseproductItems, mulColorSizeProducts, baseColors, baseSizes) {
        var _this = this;
        _this.viewModel = product;
        var hasStockPositionObj = _this.viewModel.hasStockPositionObj = pospal.tool.contains(hasStockPositionObjUserIds, _this.viewModel.userId);
        var hasProductArea = _this.viewModel.hasProductArea = pospal.tool.contains(hasProductAreaUserIds, _this.viewModel.userId);

        $("#editArea").data("id", product.id);
        $("#editArea").data("spu", product.attribute5);
        $("#editArea").data("isDefaultSpecProduct", product.attribute7);
        $("#editArea").data("showType", showType);
        $("#editArea").data("isMulColorSize", showType == 2);
        $("#editArea").data("isPassPromotionProduct", product.isPassPromotionProduct == true);
        $("#editArea").data("bindPassProducts", product.BindPassProductNames);
        $("#editArea").data("attribute9", product.attribute9);
        $("#editArea").data("isCaseProduct", product.isCaseProduct == 1 ? "1" : "0");

        var productExtBarcodes = $.map(product.productExtBarcodes || [], function (item) {
            return item.extBarcode;
        });
        $("#editArea").data("productExtBarcodes", productExtBarcodes);
        this.edit_sb_enable.set(product.enable == "0" ? "0" : "1");
        this.edit_productStoreSelector.setSelectedValue(product.userId);
        $("#edit_barcode").val(product.barcode);
        $("#edit_barcode").attr("readonly", "readonly");
        $("#btn_createBarcode").hide();
        $("#btn_createArtNo").hide();
        $("#edit_productName").val(product.name);

        this.resetCombProductUI();

        this.resetBasicAttributeUI();

        if (hasCategoryPrinter) {
            this.resetPrinterListUI(null, null);
            editPrinterV2.render(null);
            this.reCountSeletedPrinterNum();
        }

        this.updateEditProductCategorySelect(getFilterType());

        if (product.productimages != null && product.productimages.length > 0) {
            var arr = $.grep(product.productimages, function (pi, i) {
                return pi.isCover == 1;
            });

            if (arr.length > 0) {
                var imgPath = pospal.formatSmallImageUrl(imageDomain + arr[0].path);
                $("<img/>").attr("src", imgPath).appendTo($("#btnShowEditImages"));
            }
        }

        $("#edit_sellPrice").val(product.sellPrice);
        $("#edit_buyPrice").val(product.buyPrice);
        if (!hasPriceAuth) {
            $("#edit_buyPrice").parent().hide();
            $("#edit_buyPrice").attr("type", "password").attr('readonly', true);
        }

        $("#edit_stock").val(product.FromMinUnitProductStock != null ? product.FromMinUnitProductStock : product.stock);
        if (product.isCaseProduct == 1) {

        }
        $("#edit_minSellQuantity").val(product.productCommonAttribute && product.productCommonAttribute.minSellQuantity);
        $("#edit_rShopDisplayName").val(product.productCommonAttribute && product.productCommonAttribute.rShopDisplayName);
        $("#edit_mnemonicCode").val(product.productCommonAttribute && product.productCommonAttribute.mnemonicCode);

        if (hasSingleProductExtBarcode && showType != 2 && productExtBarcodes.length > 0) {
            $("#edit_productExtBarcode").val(productExtBarcodes[0]);
        }

        if (product.productCommonAttribute != null && product.productCommonAttribute.isTiming == 1) {
            var unitExchange = 1;
            var unitQuantity = product.productCommonAttribute.minutesForSalePrice;
            if (unitQuantity % 1440 == 0) {
                unitQuantity = unitQuantity / 1440;
                unitExchange = 1440;
            } else if (unitQuantity % 60 == 0) {
                unitQuantity = unitQuantity / 60;
                unitExchange = 60;
            }

            $("#edit_minutesForSalePrice").val(unitQuantity);
            this.edit_timingUnitSelector.setSelectedValue(unitExchange);

            unitExchange = 1;
            unitQuantity = product.productCommonAttribute.atLeastMinutes;
            if (unitQuantity % 1440 == 0) {
                unitQuantity = unitQuantity / 1440;
                unitExchange = 1440;
            } else if (unitQuantity % 60 == 0) {
                unitQuantity = unitQuantity / 60;
                unitExchange = 60;
            }
            $("#edit_atLeastMinutes").val(unitQuantity);
            this.edit_timingAtLeastUnitSelector.setSelectedValue(unitExchange);

            var atLeastAmount = product.productCommonAttribute.atLeastAmount;
            if (atLeastAmount == null && product.productCommonAttribute.minutesForSalePrice != 0) {
                atLeastAmount = (product.productCommonAttribute.atLeastMinutes * (product.sellPrice / product.productCommonAttribute.minutesForSalePrice)).toFixed(2).toG0();
            }
            $("#edit_atLeastAmount").val(atLeastAmount || '');
            $("#edit_timingPrice").val(product.sellPrice);
            $("#edit_minutesForFree").val(product.productCommonAttribute.minutesForFree || '');

            this.changeTimingUnit();
            this.edit_sb_isTiming.set(1);
            this.changeIsTiming();
        }

        //服务时长,当商品为服务商品且不开启计时，则显示
        $("#edit_serviceAtLeastMinutes_div").hide();
        $("#edit_serviceAtLeastMinutes").val("");
        if (hasServiceAtLeastMinutes &&
            product.noStock == 1 &&
            product.productCommonAttribute != null &&
            (product.productCommonAttribute.isTiming == 0 || product.productCommonAttribute.isTiming == null)) {

            $("#edit_serviceAtLeastMinutes_div").show();
            $("#edit_serviceAtLeastMinutes").val(product.productCommonAttribute.atLeastMinutes);
        }
        //服务时长结束

        if (hasStockPositionObj) {
            $("#edit_stockPosition").attr("readonly", "readonly");
        } else {
            $("#edit_stockPosition").removeAttr("readonly");
        }
        if ($("#edit_stockPosition").length > 0 && product.productCommonAttribute != null) {
            $("#edit_stockPosition").val(product.productCommonAttribute.stockPosition);
        }

        if ($("#edit_volume").length > 0 && product.productCommonAttribute != null) {
            $("#edit_volume").val(product.productCommonAttribute.volume);
        }

        if ($("#edit_weight").length > 0 && product.productCommonAttribute != null) {
            $("#edit_weight").val(product.productCommonAttribute.weight);
        }

        if (this.edit_weightUnitSelector && product.productCommonAttribute != null) {
            this.edit_weightUnitSelector.setSelectedValue(product.productCommonAttribute.weightUnit || 1);
        }

        if (hasProductClothingExtAttribute && product.clothingAttribute) {
            $("#edit_tagPrice").val(product.clothingAttribute.tagPrice);
            $("#edit_material").val(product.clothingAttribute.material);
            $("#edit_originalPlace").val(product.clothingAttribute.originalPlace);
            $("#edit_STC").val(product.clothingAttribute.STC);
            $("#edit_performStandard").val(product.clothingAttribute.performStandard);
        }

        this.edit_sb_isCustomerDiscount.set(product.isCustomerDiscount == "1" ? "1" : "0");
        if (this.edit_sb_isCustomerDiscount.getSelectedValue() == "1") {
            $(".customerPrice_row_div .inputCurtains").show();
            $("#moreCustomerPriceDiv").hide();
            $("#isCustomerDiscount_ps").html(lang.tryGet("商品使用会员折扣"));
        } else {
            $(".customerPrice_row_div .inputCurtains").hide();
            if (this.hasMoreCustomerPrice && !this.hasMoreWholesalePrice) $("#moreCustomerPriceDiv").show();
            $("#isCustomerDiscount_ps").html(lang.tryGet("商品使用会员价"));
        }
        this.edit_sb_isCustomerDiscount.setDisabled(!hasEditIsCustomerDiscount);

        if (this.hasMoreWholesalePrice) {
            $("#moreWholesalePrices .recipeList.middle, #moreWholesalePrices .recipeList.bottom").each(function (index, item) {
                var categoryUid = $(item).attr("data-categoryuid");
                var index = pospal.inArray(product.customerPrices, "categoryTxtUid", categoryUid);
                if (index > -1) {
                    var customerPrice = product.customerPrices[index];
                    var salableSelector = $(item).data("salableSelector");
                    salableSelector.setSelectedValue(customerPrice.salable);
                    salableSelector.opts.onChange();

                    $(item).find("input.buyerMinQuantity").val(customerPrice.minQuantity);
                    $(item).find("input.buyerBaseQuantity").val(customerPrice.baseQuantity);
                    $(item).find("input.buyerPrice").val(customerPrice.price);
                }
            });

            $.each(product.customerPrices, function (index, item) {
                if (item.categoryUid == 0) {
                    item.customerUid = item.customerTxtUid;
                    _this.buildWholesaleCustomerPriceUI(item);
                }
            })

        } else if (this.hasMoreCustomerPrice) {
            $("#customerCategoryPrices .item.customerCategoryPrice").each(function (index, item) {
                var categoryUid = $(item).attr("data-categoryUid");
                var index = pospal.inArray(product.customerPrices, "categoryTxtUid", categoryUid);
                if (index > -1)
                    $(item).find("input").val(product.customerPrices[index].price);
                else if (product.customerPrice != null)
                    $(item).find("input").val(product.customerPrice);
            });

            var $customerSpecialPrices = $("#customerSpecialPrices").empty();
            $.each(product.customerPrices, function (index, item) {
                if (item.categoryUid == 0) {
                    item.customerUid = item.customerTxtUid;
                    _this.buildSpecialCustomerPriceUI(item);
                }
            })
        }

        $("#edit_customerPrice").val(product.customerPrice);
        $("#edit_sellPrice2").val(product.sellPrice2);
        if (pospal.website.industryNumber == "118" && !isSupplierCanEditPrice) {
            $(".sellPrice2_row_div .inputCurtains").show();
        }
        else {
            $(".sellPrice2_row_div .inputCurtains").hide();
        }
        this.setProfitPercent();
        if (product.productUnitExchangeList != null && product.productUnitExchangeList.length > 0) {
            for (var i = 0; i < product.productUnitExchangeList.length; i++) {
                var ue = product.productUnitExchangeList[i];
                if (ue.isBase == 1) {
                    this.edit_baseUnitSelector.setSelectedValue(ue.productUnitTxtUid);
                    this.setBaseUnitSellPrice();
                    //this.setStockUnit(ue.productUnitName);
                    if (ue.isRequest == 1) $("#unitExChangeList .isBase .requestUnit").addClass("on");
                } else {
                    var item = _this.addUnitExChange();
                    var unitSelector = $(item).data("unitSelector");
                    unitSelector.setSelectedValue(ue.productUnitTxtUid);
                    unitSelector.opts.onChange();

                    $(item).find(".conversion input.unitQuantity").val(ue.unitQuantity).blur();
                    $(item).find(".conversion input.baseUnitQuantity").val(ue.baseUnitQuantity).blur();

                    if (ue.isRequest == 1) item.find(".requestUnit").addClass("on");
                }
            }
        }

        if (this.edit_baseUnitSelector.getSelectedValue() != "") {
            if (product.productUnitExchangeList.length > 1) this.edit_baseUnitSelector.setDisabled(true);
            //if (industryNumber == "102" || industryNumber == "107") $("#btnAddUnitExchange").show();
        }

        $("#edit_attribute6").val(product.attribute6);

        $("#edit_pinyin").val(product.pinyin);

        $(product.supplierRangeList).each(function (index, item) { item.supplierUid = item.supplierTxtUid; })
        $("#btnSupplierRanges").data("selectedSuppliers", product.supplierRangeList);
        _this.changeSupplierRangeLabel();

        var brandOptions = JSON.parse(JSON.stringify(brandSelector.opts.options));
        brandOptions[0].text = lang.tryGet("请选择");
        this.edit_productBrandSelector.update(brandOptions);
        if (product.productCommonAttribute != null) {
            this.edit_productBrandSelector.setSelectedValue(product.productCommonAttribute.brandTxtUid);
            this.editProductBrandUid = product.productCommonAttribute.brandTxtUid;
        }
        else {
            this.edit_productBrandSelector.setSelectedValue("");
            this.editProductBrandUid = "";
        }

        if (product.productionDate != null && product.productionDate != "") $("#edit_productionDate").val(product.productionDate);
        if (product.shelfLife != null && product.shelfLife != "") $("#edit_shelfLife").val(product.shelfLife);
        if (product.maxStock != null) $("#edit_maxStock").val(product.maxStock);
        if (product.minStock != null) $("#edit_minStock").val(product.minStock);
        $("#edit_remarks").val(product.description);

        if (hasClothingAttribute) {
            $("#edit_attribute1").val(product.attribute1);
            $("#edit_attribute2").val(product.attribute2);
            $("#edit_attribute4").val(product.attribute4);
            if (pospal.contains([105, 106, 112], industryNumber)) $("#edit_attribute3").val(product.attribute3);
        } else if (industryNumber == "102" || industryNumber == "114" || industryNumber == "107" || industryNumber == "115") {
            this.edit_sb_printLabel.set(product.attribute1 == "y" ? "1" : "0");

            //厨房票打
            if (product.cateAttribute != null && product.cateAttribute != ""
                && product.cateAttribute.printerUids != null && product.cateAttribute.printerUids != "") {
                var printerUids = product.cateAttribute.printerUids.split(",");
                _this.resetPrinterListUI(printerUids);

                if (hasCatePrinterSetting) {
                    var printerSettings = [];
                    if (product.cateAttribute.printerSetting) {
                        printerSettings = JSON.parse(product.cateAttribute.printerSetting);
                    }
                    editPrinterV2.render(printerUids, printerSettings);
                    _this.reCountSeletedPrinterNum();
                }
            }

            //标签机
            if (product.cateAttribute != null && product.cateAttribute != ""
                && product.cateAttribute.labelPrinterUids != null && product.cateAttribute.labelPrinterUids != "") {
                var printerUids = product.cateAttribute.labelPrinterUids.split(",");
                _this.resetLabelPrinterListUI(printerUids);
            }
            if (industryNumber == "107") $("#edit_attribute4").val(product.attribute4);
            $("#edit_attribute2").val(product.attribute2);
            $("#edit_attribute3").val(product.attribute3);

        } else {
            $("#edit_attribute1").val(product.attribute1);
            $("#edit_attribute2").val(product.attribute2);
            $("#edit_attribute3").val(product.attribute3);
            $("#edit_attribute4").val(product.attribute4);
        }

        if (hasWeighingAttribute && product.cateAttribute != null) {
            this.edit_sb_isWeighing.set(product.cateAttribute.isWeighing);
            this.edit_countingSelector.setSelectedValue(product.cateAttribute.isCounting);
        }
        if (this.edit_sb_isAICountStick) {
            var isAICountStick = product.cateAttribute != null && product.cateAttribute.isAICountStick == "1" ? "1" : "0";
            this.edit_sb_isAICountStick.set(isAICountStick);
        }

        if (hasBarcodeScale && product.productCommonAttribute != null) {
            this.edit_sb_isBarcodeScale.set(product.productCommonAttribute.isBarcodeScale);
            this.edit_sb_isBarcodeScale.opts.clickCallBack();
        }

        if (hasProductPackageFee && product.productCommonAttribute != null) {
            this.edit_sb_isPacking.set(product.productCommonAttribute.isPacking);
        }

        this.edit_sb_extBarcode.set(product.hasExtBarcode && !hasSingleProductExtBarcode ? "1" : "0");
        this.edit_sb_extBarcode.opts.clickCallBack();

        $.each(product.productTags, function (index, tag) {
            _this.buildTagUI(tag);
        });

        if (hasProductClothingExtAttribute) {
            _this.buildClothingTagUI(product.productTags);
        }

        if (industryNumber == "102" || industryNumber == "114" || industryNumber == "115" || industryNumber == "112") {
            _this.buildTasteUI();
        }

        if (this.hasPluCode) $("#edit_pluCode").val(product.productCommonAttribute != null ? product.productCommonAttribute.pluCode : "");

        if (attrCfg.depositValidDays) $("#edit_depositValidDays").val(product.productCommonAttribute != null ? product.productCommonAttribute.depositValidDays : "");

        //图片
        editImages.buildImgsUI(product.productimages);

        $("#editArea .btn.del").show();

        //判断门店是否有编辑商品的权限
        if ($("#hasEditProductAuth").val() == "False" || product.forbidEdit || (!hasEditParentExistProductAuth && !product.ownedProduct)) {
            $("#editArea .btn.save, #editArea .btn.del").hide();
            $("#editArea .btn.cancel").text(lang.tryGet("关闭"));
            $("#btnAddUnitExchange").hide();
        }

        //判断删除权限
        if ($("#hasDeleteProductAuth").val() == "False") {
            $("#editArea .btn.del").hide();
        }

        if (hasNoStockPrepay) {
            this.edit_sb_noStock.set(product.noStock != null && product.noStock == 1 ? 1 : 0);
            this.edit_sb_noStock.opts.clickCallBack();
        }

        this.edit_sb_canAppointed.set(product.productCommonAttribute && product.productCommonAttribute.canAppointed == 1 ? 1 : 0);

        if (this.cfg.hasSN) {
            this.edit_enableSN.set(product.productCommonAttribute && product.productCommonAttribute.enableSN == 1 ? 1 : 0);
        }

        if (propCfg.IfNeedMake) {
            this.edit_sb_ifNeedMake.set(product.productCommonAttribute && product.productCommonAttribute.ifNeedMake == 1 ? 1 : 0);
            this.edit_sb_ifNeedMake.opts.clickCallBack();
        }

        //颜色尺码选择模块
        if (showType == 2) {
            var selectedColors = [];
            var selectedSizes = [];
            var colorNames = [];
            var sizeNames = [];
            var totalStock = 0;

            $(mulColorSizeProducts).each(function (index, item) {
                var productColorName = item.attribute1.toUpperCase();
                var productSizeName = item.attribute2.toUpperCase();

                if (productColorName.length > 0 && !pospal.isInArray(colorNames, pospal.escapeJquery(productColorName))) {
                    colorNames.push(productColorName);

                    var colorItem = null;
                    if (productColorGroups) {
                        var colorGroupIndex = pospal.findIndex(productColorGroups, function (it) { return it.uid == item.ColorGroupUid });
                        if (colorGroupIndex > -1) {
                            var colorIndex = pospal.inArray(productColorGroups[colorGroupIndex].productColorSizeList, "name", productColorName);
                            if (colorIndex > -1) {
                                colorItem = $.extend({}, productColorGroups[colorGroupIndex].productColorSizeList[colorIndex]);
                                colorItem.groupUid = productColorGroups[colorGroupIndex].txtUid;
                                colorItem.groupOrderNumber = productColorGroups[colorGroupIndex].orderNumber;
                            }
                        }
                        else {
                            for (var i = 0; i < productColorGroups.length; i++) {
                                var colorIndex = pospal.inArray(productColorGroups[i].productColorSizeList, "name", productColorName);
                                if (colorIndex > -1) {
                                    colorItem = $.extend({}, productColorGroups[i].productColorSizeList[colorIndex]);
                                    colorItem.groupUid = productColorGroups[i].txtUid;
                                    colorItem.groupOrderNumber = productColorGroups[i].orderNumber;
                                    break;
                                }
                            }
                        }
                    }
                    if (colorItem == null) {
                        colorItem = {};
                        colorItem.name = productColorName;
                        colorItem.groupUid = 0;
                        var baseColorIndex = pospal.inArray(baseColors, "name", productColorName);
                        if (baseColorIndex > -1) colorItem.number = baseColors[baseColorIndex].number;
                    }
                    colorItem.sourceOrder = selectedColors.length;
                    selectedColors.push(colorItem);
                }

                if (productSizeName.length > 0 && !pospal.isInArray(sizeNames, pospal.escapeJquery(productSizeName))) {
                    sizeNames.push(productSizeName);

                    var sizeItem = null;
                    var sizeGroupIndex = pospal.findIndex(productSizeGroups, function (it) { return it.uid == item.SizeGroupUid });
                    if (sizeGroupIndex > -1) {
                        var sizeIndex = pospal.inArray(productSizeGroups[sizeGroupIndex].productColorSizeList, "name", productSizeName);
                        if (sizeIndex > -1) {
                            sizeItem = $.extend({}, productSizeGroups[sizeGroupIndex].productColorSizeList[sizeIndex]);
                            sizeItem.groupUid = productSizeGroups[sizeGroupIndex].txtUid;
                            sizeItem.groupOrderNumber = productSizeGroups[sizeGroupIndex].orderNumber;
                        }
                    }
                    else {
                        for (var i = 0; i < productSizeGroups.length; i++) {
                            var sizeIndex = pospal.inArray(productSizeGroups[i].productColorSizeList, "name", productSizeName);
                            if (sizeIndex > -1) {
                                sizeItem = $.extend({}, productSizeGroups[i].productColorSizeList[sizeIndex]);
                                sizeItem.groupUid = productSizeGroups[i].txtUid;
                                sizeItem.groupOrderNumber = productSizeGroups[i].orderNumber;
                                break;
                            }
                        }
                    }

                    if (sizeItem == null) {
                        sizeItem = {};
                        sizeItem.name = productSizeName;
                        sizeItem.groupUid = 0;
                        var baseSizeIndex = pospal.inArray(baseSizes, "name", productSizeName);
                        if (baseSizeIndex > -1) sizeItem.number = baseSizes[baseSizeIndex].number;
                    }
                    sizeItem.sourceOrder = selectedSizes.length;
                    selectedSizes.push(sizeItem);
                }

                totalStock += item.stock;
            });

            //标记已删除多颜色尺码
            for (var i = 0; i < colorNames.length; i++) {
                var colorName = colorNames[i];
                for (var j = 0; j < sizeNames.length; j++) {
                    var sizeName = sizeNames[j];
                    var productIndex = -1;
                    $.each(mulColorSizeProducts, function (index, item) {
                        if (item.attribute1.toLowerCase() == colorName.toLowerCase() && item.attribute2.toLowerCase() == sizeName.toLowerCase()) {
                            productIndex = index;
                        }
                    });

                    if (productIndex == -1) {
                        mulColorSizeProducts.push({
                            attribute1: colorName,
                            attribute2: sizeName,
                            barcode: "",
                            buyPrice: "",
                            enable: 1,
                            id: "0",
                            isDel: true,
                            sellPrice: "",
                            stock: "0",
                            txtUid: "0",
                            uid: "0"
                        });
                    }
                }
            }

            selectedColors = selectedColors.sort(compareColorSizeGroupOrder);
            selectedSizes = selectedSizes.sort(compareColorSizeGroupOrder);

            colorNames = [];
            $.each(selectedColors, function (index, item) {
                colorNames.push(item.name);
            });
            sizeNames = [];
            $.each(selectedSizes, function (index, item) {
                sizeNames.push(item.name);
            });

            editMulColorSizeProduct.refreshButtonSummary(colorNames, sizeNames, totalStock);
            $("#edit_mulColorSize_div").data("colors", selectedColors);
            $("#edit_mulColorSize_div").data("sizes", selectedSizes);
            $("#edit_mulColorSize_div").data("products", mulColorSizeProducts);
            $("#edit_mulColorSize_div").data("oldProducts", mulColorSizeProducts);
            $("#edit_attribute4").attr("readonly", "readonly");
            $("#edit_isNoStock_div").hide();
        }

        _this.edit_mulcolorsize_enable.set(product.attribute8 == "1" ? "1" : "0");
        _this.resetMulColorSizeUI(true);

        //if (product.noStock != null && product.noStock == 1) $(".notForNoStock").hide();

        //标签机设置是否显示
        var labelPrinterValue = product.attribute1 == "y" ? "1" : "0";
        if (labelPrinterValue == "1") {
            $("#btnShowLabelPrinterList").show();
        } else {
            $("#btnShowLabelPrinterList").hide();
        }

        //多规格商品绑定
        if (moreSpecProducts != null && moreSpecProducts.length > 0) {
            this.edit_sb_moreSpec.set("1");
            this.edit_sb_moreSpec.opts.clickCallBack();

            if (caseproductItems != null && caseproductItems.length > 0) {
                this.edit_sb_hasExchange.set("1");
                this.edit_sb_hasExchange.opts.clickCallBack();
            }
            $("#hasMoreSpecDiv,#hasSpecExchangeDiv").hide();
            $("#specListDiv .specItem.default").hide();
            $("<div class='PS psExt'>&nbsp;商品其它规格</div>").appendTo($("#specListDiv"));
            var noStock = this.edit_sb_noStock && this.edit_sb_noStock.getSelectedValue() == "1";
            if (caseproductItems == null || caseproductItems.length == 0) {
                var $item = $("<div class='psExt " + (this.hasMoreWholesaleSellPrice2 ? "forWholesale" : "") + "' />").appendTo($("#specListDiv"));
                var $title = $("<div class='item recipeList top th' style='border-right:none;' />").appendTo($item);
                $("<div class='col productSpec'/>").html("规格").appendTo($title);
                if (this.hasMoreWholesaleSellPrice2) $("<div class='col productSellPrice2'/>").html("批发价").appendTo($title);
                $("<div class='col productSellPrice'/>").html("售价").appendTo($title);
                $("<div class='col productBuyPrice'/>").html("进价").appendTo($title);
                $("<div class='col productStock' " + (noStock ? "style='display:none;'" : "") + "/>").html("库存").appendTo($title);
                $("<div class='col unit' style='display:none;' />").html("单位").appendTo($title);
                $("<div class='col barcode'/>").html("条码").appendTo($title);
            }

            for (var i = 0; i < moreSpecProducts.length; i++) {
                var moreSpecProduct = moreSpecProducts[i];
                var caseproductItem = null;
                var index = pospal.inArray(caseproductItems, "caseProductTxtUid", moreSpecProduct.productTxtUid);
                if (index != -1) caseproductItem = caseproductItems[index];

                var baseSpecProduct = product.attribute7 == "1" ? product : null;
                if (baseSpecProduct == null) {
                    index = pospal.inArray(moreSpecProducts, "attribute7", "1");
                    if (index != -1) baseSpecProduct = moreSpecProducts[index];
                }

                var baseSpecUnit = "";
                if (caseproductItem != null && baseSpecProduct != null) {
                    baseSpecUnit = (baseSpecProduct.baseUnitName != null ? baseSpecProduct.baseUnitName : "") + (baseSpecProduct.attribute6 != "" ? "(" + baseSpecProduct.attribute6 + ")" : "");
                }
                this.createNewSpecItemUI(moreSpecProduct, caseproductItem, baseSpecUnit);
            }

            if (product.attribute7 != "1") $("#btn_add_spec,#btn_select_spec,#btn_order_spec").hide();
        }

        if (showType == 1 || showType == 2) $("#hasMoreSpecDiv").hide();

        //商品准备时间
        if (hasPreparationTime && product.productCommonAttribute) {
            $("#edit_preparationTime").val(product.productCommonAttribute.preparationTime);
            if (this.edit_preparationTimeUnitSelector) this.edit_preparationTimeUnitSelector.setSelectedValue(product.productCommonAttribute.preparationTimeUnit || preparationTimeUnitConst.minute);
        }

        //设置商品种类
        if (product.category != null) {
            this.edit_productCategorySelector.setSelectedValue(product.category.txtUid);
        } else {
            this.edit_productCategorySelector.setSelectedValue("");
        }
        this.changeProductCategory();

        if (product.IsBindTakeAway) {
            $(".productSyncInfo").show();
        }

        if (product.StockProductUid != "0" && product.uid != product.StockProductUid) {
            $("#edit_stock").attr('disabled', 'disabled');
        }
    },

    setStockUnit: function (baseUnitName) {
        $("#edit_stockUnit").html(baseUnitName);
    },

    createBarcodeByGenerationRule: function () {
        var _this = this;
        var data = { userId: userSelector.getSelectedValue(), categoryUid: this.edit_productCategorySelector.getSelectedValue() };
        if (data.categoryUid == "" || data.categoryUid == "0") {
            new pospal.ui.msgBox({ content: "缺失分类属性，无法自动生成条码，请先选择分类", autoCloseSec: 0 });
            return;
        }
        var doing = new pospal.ui.loading($("#mainArea"));
        pospal.ajax({
            url: "/Product/CreateBarcodeByGenerationRule",
            data: data,
            success: function (result) {
                if (result.successed) {
                    var barcode = result.data.barcode;
                    $("#edit_barcode").val(barcode);
                    $("#btn_createBarcode").hide();
                    $("#btn_confirmBarcode").hide();
                    //如果开启了多规格，根据moreSpecPrefix和specSuffixLength 按顺序生成多规格条码
                    if (!$("#moreSpecSettingDiv").is(":hidden") && _this.edit_sb_moreSpec.getSelectedValue() == "1") {
                        var $specItems = $("#specListDiv .specItem");
                        if ($specItems.length > 0) {
                            var moreSpecPrefix = result.data.moreSpecPrefix;
                            var specSuffixLength = result.data.specSuffixLength;
                            var seed = 1;
                            $specItems.each(function (index, item) {
                                var $item = $(item);
                                var $inputBarcode = $item.find("input.barcode");
                                if ($inputBarcode.length == 0) return true; //没有条码输入框的跳过

                                var specBarcode = $inputBarcode.val().trim();
                                if (specBarcode.length == 0) {
                                    var suffix = (++seed).toString();
                                    while (suffix.length < specSuffixLength) {
                                        suffix = "0" + suffix;
                                    }
                                    var specBarcode = moreSpecPrefix + suffix;
                                    $inputBarcode.val(specBarcode);
                                }
                            });
                        }
                    }
                }
                else {
                    new pospal.ui.msgBox({ content: result.msg, autoCloseSec: 0 });
                }
            },
            complete: function () {
                doing.destroy();
            }
        });
    },

    createBarcodeByGenerationRuleForFresh: function () {
        var _this = this;
        var data = { userId: userSelector.getSelectedValue() };
        var categoryUid = this.edit_productCategorySelector.getSelectedValue();
        if (hasFreshBarcodeCategoryCode && (categoryUid == "" || categoryUid == "0")) {
            new pospal.ui.msgBox({ content: "缺失分类属性，无法自动生成条码，请先选择分类", autoCloseSec: 0 });
            return;
        }
        data.rootCategoryUid = categoryUid;
        var $categorySelectedLi = $(this.edit_productCategorySelector.opts.container).find("li.selected");
        if ($categorySelectedLi.length > 0 && $categorySelectedLi.attr("parentoptions")) {
            var parentOptions = $categorySelectedLi.attr("parentoptions").split("_");
            if (parentOptions.length > 0) {
                var rootCategoryUid = parentOptions[parentOptions.length - 1];
                if (rootCategoryUid && rootCategoryUid != "0") {
                    data.rootCategoryUid = rootCategoryUid;
                }
            }
        }
        var doing = new pospal.ui.loading($("#mainArea"));
        pospal.ajax({
            url: "/Product/CreateBarcodeByGenerationRuleForFresh",
            data: data,
            success: function (result) {
                if (result.successed) {
                    var barcode = result.data.barcode;
                    $("#edit_barcode").val(barcode);
                    $("#btn_createBarcode").hide();
                    $("#btn_confirmBarcode").hide();
                }
                else {
                    new pospal.ui.msgBox({ content: result.msg, autoCloseSec: 0 });
                }
            },
            complete: function () {
                doing.destroy();
            }
        });
    },

    createBarcode: function (needAvoidPayPlatformCodePrefix) {
        var _this = this;

        var useMilliSecond = secondIndustryNumber == "10104" ? true : false;
        pospal.ajax({
            url: "/Product/CreateBarcode",
            data: { "useMilliSecond": useMilliSecond, "avoidPayPlatformCodePrefix": !!needAvoidPayPlatformCodePrefix },
            success: function (result) {
                if (result.successed) {
                    var barcode = result.barcode;
                    //生鲜行业，创建自动条码 根据门店秤重识别码 自动截取5位或7位
                    if (hasBarcodeScale && _this.edit_sb_isBarcodeScale.getSelectedValue() == "1") {
                        if (hasWeightingCodeAuth) {
                            barcode = barcode.substr(barcode.length - 5, 5);
                        }
                        else {
                            barcode = barcode.substr(barcode.length - 7, 7);
                        }
                    }

                    if (secondIndustryNumber == "10104") {
                        barcode = barcode.substr(barcode.length - 8, 8);
                    }

                    $("#edit_barcode").val(barcode);
                    $("#btn_createBarcode").hide();
                    $("#btn_confirmBarcode").hide();
                }
            },
            complete: function () { }
        });
    },

    createArtNo: function () {
        var _this = this;

        if (!openSpuGenerationRule) {
            //年月日+4位随机数 
            var artNo = new Date().format("yyMMdd") + pospal.getRandomNum(1000, 9999);
            $("#edit_artNo_div input").val(artNo);
            $("#btn_createArtNo").hide();
            return;
        }
        var doing = new pospal.ui.loading($("#mainArea"));
        var data = this.buildGenerationArtNoCriterias();
        pospal.ajax({
            url: "/Product/CreateArtNo",
            data: data,
            success: function (result) {
                if (result.successed) {
                    $("#edit_artNo_div input").val(result.artNo);
                    $("#btn_createArtNo").hide();
                    $("#edit_artNo_div input").keyup();
                }
                else {
                    new pospal.ui.msgBox({ content: result.msg, autoCloseSec: 0 });
                    $("#edit_artNo_div input").val("");
                }
            },
            complete: function () {
                doing.destroy();
            }
        });


    },

    buildGenerationArtNoCriterias: function () {
        var data = {};
        data.userId = userSelector.getSelectedValue();
        //分类生成规则取一级分类
        data.categoryUid = this.edit_productCategorySelector.getSelectedValue();
        var $categorySelectedLi = $(this.edit_productCategorySelector.opts.container).find("li.selected");
        if ($categorySelectedLi.length > 0 && $categorySelectedLi.attr("parentoptions")) {
            var parentOptions = $categorySelectedLi.attr("parentoptions").split("_");
            if (parentOptions.length > 0) {
                var rootCategoryUid = parentOptions[parentOptions.length - 1];
                if (rootCategoryUid && rootCategoryUid != "0") {
                    data.categoryUid = rootCategoryUid;
                }
            }
        }
        data.brandUid = this.edit_productBrandSelector.getSelectedValue();
        //供货商取默认供货商
        var selectedSuppliers = $("#btnSupplierRanges").data("selectedSuppliers");
        data.supplierUid = null;
        $(selectedSuppliers).each(function (index, item) {
            if (item.isDefault == 1) {
                data.supplierUid = item.supplierUid;
                return false;
            }
        });
        //当前选中标签
        var productTagUids = [];
        $("#edit_productTagList ul span").each(function (index, item) {
            productTagUids.push($(item).attr("data-tagUid"));
        });
        for (var w = 0; w < taggroupsWithtags.length; w++) {
            var tagGroupUid = taggroupsWithtags[w].uid;
            if (pospal.isInArray(["10005", "10008", "10009"], tagGroupUid)) {
                var tags = taggroupsWithtags[w].tags;
                for (var i = 0; i < tags.length; i++) {
                    var tag = tags[i];
                    var index = pospal.findIndex(productTagUids, function (it) { return it == tag.uid });
                    if (index > -1) {
                        if (tagGroupUid == "10005") data.seasonTagUid = tag.uid;
                        if (tagGroupUid == "10008") data.yearTagUid = tag.uid;
                        if (tagGroupUid == "10009") data.sexTagUid = tag.uid;
                        break;
                    }

                }
            }
        }

        return data;
    },

    checkMulColorSizeArtNo: function (artNO) {
        var _this = this;
        //var doing = new pospal.ui.loading($("#editArea"));
        pospal.ajax({
            url: "/Product/CheckMulColorSizeArtNo",
            data: { userId: userSelector.getSelectedValue(), artNO: artNO },
            success: function (result) {
                if (result.successed) {
                    if (!result.isValidMulColorSizeArtNo) {
                        new pospal.ui.msgBox({
                            boxType: "confirm",
                            showCloseBtn: false,
                            content: "该货号商品已存在，前往添加新的颜色尺码？",
                            onConfirm: function () {
                                if (this.confirmValue) {
                                    _this.findProduct(result.productId);
                                } else {
                                    $("#edit_artNo_div input").val("");
                                    $("#btn_createArtNo").show();
                                }
                            }
                        });
                    }
                }
            },
            complete: function () {
                //doing.destroy();
            }
        });
    },

    getSuggestProductName: function () {
        var _this = this;
        var barcode = $("#edit_barcode").val().trim();
        if (barcode.length > 0) {
            pospal.ajax({
                url: "/Product/GetSuggestProductName",
                data: { barcode: barcode },
                success: function (result) {
                    if (result.successed) {
                        $("#edit_productName").val(result.productName);
                        $("#edit_productName").keyup();
                        if (result.imgUrl) {
                            var productImages = [{ "isCover": true, "path": result.imgUrl }];

                            var imgPath = pospal.formatSmallImageUrl(imageDomain + productImages[0].path);
                            if ($(".defaultImage img").length > 0) {
                                $(".defaultImage img").attr("src", imgPath);
                            } else {
                                $("<img/>").attr("src", imgPath).appendTo($(".defaultImage"));
                            }
                            editImages.resetUI();
                            editImages.buildImgsUI(productImages);
                        }
                    }
                },
                complete: function () { }
            });
        }
    },

    getCategoryDefaultSetting: function () {
        if ($("#editArea").data("id") == "0" && hasCategoryDefaultSettingAuth) {
            //根据选中的分类，获取默认设置（category.CategoryDefaultSetting），没有则取上级分类的，直到根分类
            var category = null;
            var categoryUid = this.edit_productCategorySelector.getSelectedValue();
            var categoryDefaultSetting = null;
            var loopCount = 0; // 添加循环计数器
            while (categoryUid && categoryUid != "0" && loopCount < 10) { // 限制最多循环10次
                category = pospal.find(categoryList, function (it) { return it.uid == categoryUid; });
                if (category && category.CategoryDefaultSetting) {
                    categoryDefaultSetting = category.CategoryDefaultSetting;
                    break;
                }
                categoryUid = category ? category.parentUid : null;
                loopCount++; // 增加计数器
            }
            return categoryDefaultSetting;
        }
        return null;
    },

    resetBaseUnit: function () {
        this.setBaseUnitSellPrice();

        if (industryNumber == "102" || industryNumber == "114" || industryNumber == "107" || industryNumber == "115") {
            if (this.edit_baseUnitSelector.getSelectedValue() != "") {
                //$("#btnAddUnitExchange").show();
                $("#unitExChangeList .isBase .requestUnit").addClass("on");
            } else {
                $("#btnAddUnitExchange").hide();
                $("#unitExChangeList .isBase .requestUnit").removeClass("on");
            }

            $("#unitExChangeList .exchange").remove();
        }
    },

    setBaseUnitSellPrice: function () {
        //var sellPrice = $("#edit_sellPrice").val().trim();
        //var baseUnit = this.edit_baseUnitSelector.getSelectedText();

        //if (sellPrice.length > 0 && !isNaN(sellPrice) && this.edit_baseUnitSelector.getSelectedValue() != "") {
        //    $("#editArea .baseUnitSellprice").html(sellPrice + lang.tryGet("元") + "/" + baseUnit);
        //} else {
        //    $("#editArea .baseUnitSellprice").html("");
        //}
    },

    setProfitPercent: function () {
        var sellPrice = $("#edit_sellPrice").val().trim();
        var buyPrice = $("#edit_buyPrice").val().trim();

        var sellPrice2 = $("#edit_sellPrice2").val().trim();
        var profitPercentText = '';
        if (hasPriceAuth && sellPrice.length > 0 && !isNaN(sellPrice) && sellPrice > 0 && buyPrice.length > 0 && !isNaN(buyPrice) && buyPrice > 0) {
            var profitPercentTextFormat = industryNumber == "110" || industryNumber == "116" ? "零售毛利率值" : "毛利率值";
            profitPercentText = lang.format("毛利率值", [((sellPrice - buyPrice) * 100 / sellPrice).toFixed(2)]);
        }

        if (hasPriceAuth && sellPrice2.length > 0 && !isNaN(sellPrice2) && sellPrice2 > 0 && buyPrice.length > 0 && !isNaN(buyPrice) && buyPrice > 0) {
            if (industryNumber == "110" || industryNumber == "116") {
                profitPercentText += "  ";
                profitPercentText += lang.tryFormat("批发毛利率X", [((sellPrice2 - buyPrice) * 100 / sellPrice2).toFixed(2)]);
            }
        }
        $("#edit_profitPercent").html(profitPercentText);

        profitPercentText == '' ? $("#edit_profitPercent").hide() : $("#edit_profitPercent").show();
    },

    checkBuyAndSellPrice: function () {
        var buyPrice = $("#edit_buyPrice").val().trim();
        var sellPrice = $("#edit_sellPrice").val().trim();
        if ($.isNumeric(buyPrice) && $.isNumeric(sellPrice)) {
            if (Number(buyPrice) > Number(sellPrice)) {
                if (industryNumber == "111") {
                    new pospal.ui.msgBox({ content: "商品销售价建议大于进货价", boxType: "confirm", showCancelBtn: false, showCloseBtn: false });
                }
                else {
                    new pospal.ui.msgBox({ content: "商品销售价建议大于进货价", boxType: "toast", autoCloseSec: 1500 });
                }
            }
        }
    },

    addUnitExChange: function (isNew) {
        var _this = this;

        var hasUnsetItem = false;
        var exchangeList = $("#unitExChangeList .exchange");
        $.each(exchangeList, function (i, item) {
            if ($(item).data("unitSelector").getSelectedValue() == "") {
                new pospal.ui.msgBox(lang.tryGet("单位换算未完整"));
                hasUnsetItem = true;
            }
        });

        if (!hasUnsetItem) {
            var item = $("<div style='display:none;' />").addClass("item unit li exchange").appendTo($("#unitExChangeList"));

            $("<label/>").html(lang.tryGet("副单位")).appendTo(item);
            $("<div/>").addClass("singleSelector").appendTo(item);
            $("<div/>").addClass("radioBox requestUnit").html("<i></i><span>" + lang.tryGet("订货单位") + "</span>").appendTo(item);
            $("<div/>").addClass("conversion").appendTo(item);
            $("<div/>").addClass("clearTextRed").html("<b></b>").appendTo(item);

            var storeUnitsExceptBase = $.grep(storeProductUnits, function (unit, i) {
                return unit.txtUid != _this.edit_baseUnitSelector.getSelectedValue();
            })
            var unitOptions = pospal.buildStoreUnitOptions(storeUnitsExceptBase);
            unitOptions.unshift({ text: lang.tryGet("请选择"), value: "" });

            var unitSelector = new pospal.ui.singleSelector({
                container: item.find(".singleSelector"),
                textWidth: 70,
                selectBoxWidth: 54,
                selectBoxMaxHeight: 180,
                showInput: false,
                options: unitOptions,
                onChange: function () {
                    var exchangeDiv = item.find(".conversion");
                    exchangeDiv.html("");

                    var currentItemSelectedValue = unitSelector.getSelectedValue();
                    if (currentItemSelectedValue != "") {
                        //判断单位是否已经存在
                        var arr = $.grep($("#unitExChangeList div.item.exchange"), function (item, i) {
                            var itemSelectedValue = $(item).data("unitSelector").getSelectedValue();
                            return itemSelectedValue == unitSelector.getSelectedValue();
                        })

                        if (arr.length > 1) {
                            new pospal.ui.msgBox(lang.tryGet("选择单位已存在"));
                            unitSelector.setSelectedValue("");
                        } else {
                            $("<input type='text' maxlength='10' class='quantity unitQuantity' value = '1' />").appendTo(exchangeDiv);
                            $("<label/>").addClass("uT").html(unitSelector.getSelectedText() + " = ").appendTo(exchangeDiv);
                            $("<input type='text' maxlength='10' class='quantity baseUnitQuantity' value = '1' />").appendTo(exchangeDiv);
                            $("<label/>").addClass("uT").html(_this.edit_baseUnitSelector.getSelectedText()).appendTo(exchangeDiv);
                            if (isNew) exchangeDiv.find("input.unitQuantity").focus();
                        }
                    }
                },
                bottom: {
                    content: lang.tryGet("编辑"),
                    clickCallBack: function () { editStoreProductUnits.show(); }
                }
            });

            item.data("unitSelector", unitSelector);

            item.find(".clearTextRed").bind("click", function () {
                $(this).parent().remove();
            });

            return item;
        }
    },

    refreshUnitSelector: function () {
        var unitOptions = pospal.buildStoreUnitOptions(storeProductUnits);
        unitOptions.unshift({ text: lang.tryGet("请选择"), value: "" });
        var baseUnitSelectedValue = this.edit_baseUnitSelector.getSelectedValue();
        this.edit_baseUnitSelector.update(unitOptions);
        this.edit_baseUnitSelector.setSelectedValue(baseUnitSelectedValue);

        $.each($("#unitExChangeList .exchange, #specListDiv .specItem .required .unit"), function (i, item) {
            var unitSelector = $(item).data("unitSelector");

            var unitSelectedValue = unitSelector.getSelectedValue();
            unitSelector.update(unitOptions);
            unitSelector.setSelectedValue(unitSelectedValue);
        });
    },

    showPrinterList: function () {
        $("#popupBg,#printerList").show();
    },

    //打开标签机打印
    showLabelPrinterList: function () {
        $("#popupBg,#labelPrinterList").show();
    },

    hidePrinterList: function () {
        $("#popupBg").hide();
        $("#printerList").hide();
    },

    hideLabelPrinterList: function () {
        $("#popupBg").hide();
        $("#labelPrinterList").hide();
    },

    resetPrinterListUI: function (printerUids) {
        var _this = this;

        $("#printerList table tbody").html("");

        if (storePrinters != null && storePrinters.length > 0) {
            for (var i = 0; i < storePrinters.length; i++) {
                var printer = storePrinters[i];
                var areaNames = [];
                if (!printer.restaurantArea || printer.restaurantArea == '') {
                    areaNames.push('全部区域');
                }
                else {
                    var restaurantAreaUis = printer.restaurantArea.split(',');
                    $.each(restaurantAreaUis, function (rIndex, txtUid) {
                        var restaurantArea = $.grep(restaurantAreas, function (area) { return area.txtUid == txtUid; });
                        if (restaurantArea.length > 0) areaNames.push(restaurantArea[0].name);
                    });
                }
                var orderPrintTypeRules = [];
                var orderPrintTypeRuleNames = [];
                if (printer.orderPrintTypeRule && printer.orderPrintTypeRule != '') {
                    orderPrintTypeRules = JSON.parse(printer.orderPrintTypeRule);
                    $.each(orderPrintTypeRules, function (rIndex, rule) {
                        var orderTypeName = editStorePrinters.orderTypeNames[rule.orderType];
                        var printTypeName = "";
                        if (rule.printType == 3) {
                            printTypeName = "一类一切";
                        }
                        else if (rule.printType == 2) {
                            printTypeName = "一份一切";
                        }
                        else if (rule.printType == 0) {
                            printTypeName = lang.tryGet("一品一切");
                        }
                        else {
                            printTypeName = lang.tryGet("一单一切");
                        }
                        if (rule.orderType == "8" && rule.visible == false) {
                            return true;
                        }
                        orderPrintTypeRuleNames.push(orderTypeName + ":" + printTypeName);
                    });
                    var posPrintTypeRule = $.grep(orderPrintTypeRules, function (x) { return x.orderType == 8 });
                    if (posPrintTypeRule.length == 0) {
                        orderPrintTypeRuleNames.push({ name: editStorePrinters.orderTypeNames[8], typeName: printer.printType == 0 ? lang.tryGet("一品一切") : (printer.printType == 2 ? "一份一切" : (printer.printType == 3 ? "一类一切" : lang.tryGet("一单一切"))) });
                    }
                }
                else {
                    orderPrintTypeRuleNames.push("全部订单类型:" + (printer.printType == 0 ? lang.tryGet("一品一切") : (printer.printType == 2 ? "一份一切" : (printer.printType == 3 ? "一类一切" : lang.tryGet("一单一切")))));
                }

                var tr = $("<tr>").appendTo($("#printerList table tbody"));
                $("<td/>").addClass("tdAlignCenter").html((i + 1)).appendTo(tr);
                $("<td/>").html(printer.name).appendTo(tr);
                $("<td/>").html(areaNames.join(',')).appendTo(tr);
                $("<td style='text-indent:0;padding-left:12px;'/>").addClass("tdAlignLeft").html(orderPrintTypeRuleNames.join('<br/>')).appendTo(tr);
                var printSize = printer.printSize == null ? defaultPrintSize : printer.printSize;
                var printSizeStr = "58mm";
                if (printSize == 1) printSizeStr = "80mm";
                else if (printSize == 2) printSizeStr = "110mm";
                $("<td/>").html(printSizeStr).appendTo(tr);
                $("<td/>").html(printer.printSort == null ? 0 : printer.printSort).appendTo(tr);
                $("<td/>").addClass("tdAlignCenter").html("<div class='swicth'>").appendTo(tr);

                var switchBox = new pospal.ui.switchBox({
                    container: tr.find(".swicth"),
                    options: [{ text: "○", value: "1" }, { text: "-", value: "0" }],
                    selectedValue: "0",
                    clickCallBack: function () {
                        _this.reCountSeletedPrinterNum();
                    }
                });

                tr.data("switchBox", switchBox);
                tr.data("printerUid", printer.txtUid);
            }

            layout.fixedTableHeader($("#printerList table"));
        }

        if (printerUids != null) {
            $("#printerList table tbody tr").each(function (i, item) {
                if (!$(item).hasClass("blank")) {
                    if ($.inArray($(item).data("printerUid"), printerUids) > -1) {
                        $(item).data("switchBox").set("1");
                    }
                }
            });
        }

        this.reCountSeletedPrinterNum();

        new pospal.ui.buildBlankRows({ tableContainer: $("#printerList .contentArea"), colNum: 8, rowClass: "blank" });
    },

    resetLabelPrinterListUI: function (printerUids) {
        var _this = this;

        $("#labelPrinterList table tbody").html("");

        if (labelPrinters != null && labelPrinters.length > 0) {
            for (var i = 0; i < labelPrinters.length; i++) {
                var printer = labelPrinters[i];

                var tr = $("<tr>").appendTo($("#labelPrinterList table tbody"));
                $("<td/>").addClass("tdAlignCenter").html((i + 1)).appendTo(tr);
                $("<td/>").html(printer.name).appendTo(tr);
                $("<td/>").addClass("tdAlignCenter").html("<div class='swicth'>").appendTo(tr);

                var switchBox = new pospal.ui.switchBox({
                    container: tr.find(".swicth"),
                    options: [{ text: "○", value: "1" }, { text: "-", value: "0" }],
                    selectedValue: "0",
                    clickCallBack: function () {
                        _this.reCountSeletedLabelPrinterNum();
                    }
                });

                tr.data("switchBox", switchBox);
                tr.data("printerUid", printer.txtUid);
            }

            layout.fixedTableHeader($("#labelPrinterList table"));
        }

        if (printerUids != null) {
            $("#labelPrinterList table tbody tr").each(function (i, item) {
                if (!$(item).hasClass("blank")) {
                    if ($.inArray($(item).data("printerUid"), printerUids) > -1) {
                        $(item).data("switchBox").set("1");
                    }
                }
            });
        }

        this.reCountSeletedLabelPrinterNum();

        new pospal.ui.buildBlankRows({ tableContainer: $("#labelPrinterList .contentArea"), colNum: 3, rowClass: "blank" });
    },

    resetBasicAttributeUI: function () {
        var disableAttr = false;
        var id = $("#editArea").data("id");
        //好利来定制设置基础属性只读
        if (!hasEditProductBasicAttributeAuth) {
            if (id != 0) disableAttr = true;

            $("#edit_productName,#edit_sellPrice,#edit_attribute6").attr("readonly", disableAttr);
            this.edit_productCategorySelector.setDisabled(disableAttr);
            this.edit_baseUnitSelector.setDisabled(disableAttr);
            if (disableAttr) {
                $("#btn_add_spec,#btn_select_spec,#btn_order_spec").hide();
                $("#hasMoreSpecDiv").hide();
            }
            else {
                $("#btn_add_spec,#btn_select_spec,#btn_order_spec").show();
            }
        }
    },

    resetCombProductUI: function () {
        var isCombProduct = $("#editArea").data("attribute9");
        var isCaseProduct = $("#editArea").data("isCaseProduct");
        if (isCombProduct == "1" || isCombProduct == "3" || isCaseProduct == "1") {
            $("#hasMoreSpecDiv").hide();
            $("#edit_stock").attr("disabled", "disabled");
        }
        else {
            if (eidtProductStock && !editProduct.viewModel.hasProductArea && isCombProduct != "5"
                && !editProduct.viewModel.IsBigProduct) {
                $("#edit_stock").removeAttr("disabled");
            } else {
                $("#edit_stock").attr("disabled", "disabled");
            }
        }
    },

    reCountSeletedPrinterNum: function () {
        var num = 0;
        if (hasCatePrinterSetting) {
            var printerUids = editPrinterV2.getData().printerUids;
            $("#btnShowPrinterList span").html(printerUids.length);
        }
        else {
            $("#printerList table tbody tr").each(function (i, tr) {
                if (!$(tr).hasClass("blank")) {
                    var switchBox = $(tr).data("switchBox");
                    if (switchBox.getSelectedValue() == "1") num++;
                }
            });

            $("#btnShowPrinterList span").html(num);
        }
    },

    reCountSeletedLabelPrinterNum: function () {
        var num = 0;
        $("#labelPrinterList table tbody tr").each(function (i, tr) {
            if (!$(tr).hasClass("blank")) {
                var switchBox = $(tr).data("switchBox");
                if (switchBox.getSelectedValue() == "1") num++;
            }
        });

        $("#btnShowLabelPrinterList span").html(num);
    },

    buildTagUI: function (tag) {
        var $li = $("<li/>").appendTo($("#edit_productTagList ul"));
        $("<span data-tagUid='" + tag.txtUid + "'>" + tag.name + "</span>").appendTo($li);
        $("#edit_productTagList").show();
    },

    buildClothingTagUI: function (productTags) {
        var $div = $("#edit_clothingTagList").empty();
        var groupDic = {};
        for (var i = 0; i < productTags.length; i++) {
            var productTag = productTags[i];
            if (!groupDic[productTag.txtGroupUid]) {
                var productTagGroups = $.grep(taggroupsWithtags, function (item) { return item.uid == productTag.txtGroupUid });
                if (productTagGroups.length > 0) {
                    var $item = $("<div/>").addClass("tagItem").attr("group-uid", productTagGroups[0].uid).appendTo($div);
                    $("<label/>").addClass("itemLabel").html(productTagGroups[0].name + ":").appendTo($item);
                    $("<text/>").addClass("itemValue").html('').appendTo($item);
                    groupDic[productTagGroups[0].uid] = [];
                }
            }

            if (groupDic[productTag.txtGroupUid])
                groupDic[productTag.txtGroupUid].push(productTag.name);
        }

        for (var key in groupDic) {
            $(".tagItem[group-uid='" + key + "']").find(".itemValue").html(groupDic[key].join("、"));
        }

        $div.show();
        $("#edit_productTagList").hide();
    },

    showTagSelector: function () {
        var _this = this;
        $("#tagList,#popupBg").show();

        var tagUids = [];
        $("#edit_productTagList ul span").each(function (index, item) {
            tagUids.push($(item).attr("data-tagUid"));
        });

        var $ul = $("#tagList ul.tagDivUl").empty();
        var $seachBar = $("#tagList").find('.mainAreaTop');
        $seachBar.find(".clearText").hide();
        $seachBar.find('input').val('');

        var taggroups = $.grep(taggroupsWithtags, function (e) { return e.tags && e.tags.length > 0 });
        $.each(taggroups, function (gindex, group) {
            $("<li/>").addClass("taggroup").html("<i class='tag-group__header-icon'></i><span>" + group.name + "</span>").attr('data-uid', group.uid).appendTo($ul);
            if (group.groupType == 1) {
                new _this.tagSelectApp.radioGroupCtrl($ul, group, tagUids);
            } else {
                $.each(group.tags, function (index, tag) {
                    var $li = $("<li style='white-space: nowrap; overflow: hidden;'/>").attr("data-group-uid", group.uid).appendTo($ul);
                    var cb_tag = new pospal.ui.checkBox({
                        container: $("<div/>").appendTo($li),
                        value: tag.uid,
                        text: tag.name,
                        checked: pospal.isInArray(tagUids, tag.txtUid),
                        clickCallBack: function () {
                            editProduct.ctrls.tagEdit.val(editProduct.tagSelectApp.val());
                        }
                    });
                });
            }
            if (group.tags.length % 2 > 0) {
                $("<li/>").addClass("blank").appendTo($ul);
            }
            else {
                $("<li/>").addClass("blank nodis").attr("data-group-uid", group.value).appendTo($ul);
            }
        });
        var filtOptions = function (input) {
            var $widget = $("#tagList");
            var keyword = $widget.find('.textInput').val();
            if (keyword != input) return;
            var items = $widget.find('.contentArea ul li .checkBoxDiv span,.contentArea ul li.taggroup span,.contentArea ul li .radioBoxDiv span');
            $widget.find('.contentArea ul li.blank').addClass('nodis').hide();
            var taggroups = [];
            items.each(function (i) {
                var $li = $(this).parents('li');
                if ($(this).attr('origin-text') == undefined) {
                    $(this).attr('origin-text', $(this).html());
                }
                if ($(this).attr('origin-text').indexOf(keyword) >= 0) {
                    $(this).html($(this).attr('origin-text').replace(keyword, '<p class="match">' + keyword + '</p>'));
                    $li.show();
                    $li.hasClass('taggroup') ? taggroups.push($li.attr('data-uid')) : taggroups.push($li.attr('data-group-uid'));
                }
                else {
                    $(this).html($(this).attr('origin-text'));
                    $li.hide();
                }
            });
            taggroups = pospal.tool.distinct(taggroups);
            $.each(taggroups, function (i, t) {
                $widget.find('li.taggroup[data-uid=' + t + ']').show();
                $widget.find('li[data-group-uid=' + t + ']:not(.blank)').show();
                if ($widget.find('li[data-group-uid=' + t + ']:not(.blank)').length % 2 > 0) {
                    $widget.find('.contentArea ul li.blank[data-group-uid=' + t + ']').removeClass('nodis').show();
                }
            });
        };

        $seachBar.find('input').keyup(function (event) {
            if ($(event.target).val() != '') {
                $seachBar.find(".clearText").show();
            }
            else {
                $seachBar.find(".clearText").hide();
            }
            if (event.keyCode != 13 && event.keyCode != 38 && event.keyCode != 40) {
                var input = $seachBar.find('input').val();
                filtOptions($(this).val());
            }
            if (event.keyCode == 13) {
                filtOptions($(this).val());
            }
        });
        $seachBar.find('.clearText').click(function () {
            $seachBar.find(".clearText").hide();
            $seachBar.find('input').val('');
            filtOptions('');
        });
    },

    // 选择口味弹出框 相关的代码放这边
    tagSelectApp: {
        val: function () {
            if (arguments.length == 0) {
                var tags = [];
                $("#tagList").find(".radioBoxDiv.on, .checkBoxDiv.on").each(function (i, el) {
                    tags.push({ uid: $(el).find("div[data]").attr("data"), name: $(el).find("span").text(), txtGroupUid: $(el).parents("li").attr("data-group-uid") });
                });
                return tags;
            }
        },
        radioTemplateSource: ''
            + '  {{each group.tags tag}}'
            + '  <li data-group-uid="{{group.uid}}">'
            + '      <div class="radioBoxDiv {{value == tag.uid ? "on" : ""}}">'
            + '          <div class="radioBox14" data="{{tag.uid}}"><i></i></div><span>{{tag.name}}</span>'
            + '      </div>'
            + '  </li>'
            + '  {{/each}}',
        radioGroupCtrl: function ($ul, group, tagUids) {
            var _this = this;

            var value = null;
            var r = $.grep(group.tags, function (tag) { return pospal.isInArray(tagUids, tag.uid); });
            if (r.length > 0) value = r[r.length - 1].uid;

            var html = template.render(editProduct.tagSelectApp.radioTemplateSource, { group: group, value: value });
            $ul.append($(html));

            var $items = $ul.find("li[data-group-uid=" + group.uid + "] .radioBoxDiv");

            var rb_tag = new pospal.ui.radioGroup($items);
            _this.value = value;
            rb_tag.observeValue = function () {
                var selectedValue = $($.grep($items, function (el) { return $(el).hasClass("on"); })).find("div[data]").attr("data");
                if (selectedValue == _this.value) {
                    _this.value = null;
                    $items.removeClass("on");
                } else {
                    _this.value = selectedValue;
                }
                editProduct.ctrls.tagEdit.val(editProduct.tagSelectApp.val());
            }
        }
    },

    buildTasteUI: function () {
        var mappings = this.viewModel.TasteMappingList || [];
        var names = pospal.tool.distinct(mappings.map(function (it) { return it.PackageName; }));
        var $ui = $("#edit_productTasteList ul");
        $ui.empty();
        names.forEach(function (it) {
            var $li = $("<li/>").appendTo($ui);
            $("<span>" + it + "</span>").appendTo($li);
        });
        $("#edit_productTasteList").show();
    },

    addWholesaleCustomer: function () {
        var _this = this;
        $.each(this.customerSelector.selectedCustomers, function (index, item) {
            if ($("#moreWholesaleCustomerPrices .recipeList.middle[data-customerUid=" + item.uid + "]").length == 0) {
                var customerPrice = {};
                customerPrice.customerUid = item.uid;
                customerPrice.customerName = item.name;
                customerPrice.salable = 1;
                _this.buildWholesaleCustomerPriceUI(customerPrice);
            }
        })
    },

    buildWholesaleCustomerPriceUI: function (customerPrice) {
        var itemUI = $("<div class='item recipeList middle' data-customerUid=" + customerPrice.customerUid + " />");
        $("<div class='storeName' />").html(customerPrice.customerName).appendTo(itemUI);
        $("<div class='buyerSalable' />").appendTo(itemUI);
        $("<input class='buyerMinQuantity' maxlength = '5' type='text' />").val(customerPrice.minQuantity).appendTo(itemUI);
        $("<input class='buyerBaseQuantity' maxlength = '5' type='text' />").val(customerPrice.baseQuantity).appendTo(itemUI);
        $("<input class='buyerPrice' maxlength ='6' type='text' />").val(customerPrice.price).appendTo(itemUI);
        $("<div class='clearTextRed' />").bind("click", function () {
            $(this).parent().remove();
        }).appendTo(itemUI);

        //设置下拉，选择单位
        var salableSelector = new pospal.ui.singleSelector({
            container: itemUI.find(".buyerSalable"),
            textWidth: 50,
            selectBoxWidth: 44,
            options: [{ text: "允许", value: 1 }, { text: "禁止", value: 0 }],
            onChange: function () {
                if (salableSelector.getSelectedValue() == 0) {
                    itemUI.find(".buyerMinQuantity,.buyerBaseQuantity,.buyerPrice").attr("readonly", "readonly").addClass("disable").val("");
                } else {
                    itemUI.find(".buyerMinQuantity,.buyerBaseQuantity,.buyerPrice").removeAttr("readonly").removeClass("disable");
                }
            }
        });
        salableSelector.setSelectedValue(customerPrice.salable);

        itemUI.appendTo($("#moreWholesaleCustomerPrices"));
        itemUI.data("salableSelector", salableSelector);
    },

    addSpecialCustomer: function () {
        var _this = this;
        $.each(this.customerSelector.selectedCustomers, function (index, item) {
            if ($("#customerSpecialPrices .customerSpecialPrice[data-customerUid=" + item.uid + "]").length == 0) {
                var customerPrice = {};
                customerPrice.customerUid = item.uid;
                customerPrice.customerName = item.name;
                customerPrice.salable = 1;
                _this.buildSpecialCustomerPriceUI(customerPrice);
            }
        })
    },

    buildSpecialCustomerPriceUI: function (customerPrice) {
        var itemUI = $("<div/>").attr("data-customerUid", customerPrice.customerUid).addClass("item editInput customerSpecialPrice merge");
        $("<label/>").html(customerPrice.customerName).appendTo(itemUI);
        $("<input class='edit_txt quantity customerPrice' maxlength = '8' type='text' />").val(customerPrice.price).appendTo(itemUI);
        $("<div class='clearTextRed' />").bind("click", function () {
            $(this).parent().remove();
        }).appendTo(itemUI);

        itemUI.appendTo($("#customerSpecialPrices"));
    },

    createNewSpecItemUI: function (item, caseproductItem, baseSpecUnit) {
        var _this = this;
        var hasExchange = this.edit_sb_hasExchange.getSelectedValue() == "1";
        var noStock = this.edit_sb_noStock && this.edit_sb_noStock.getSelectedValue() == "1";
        var readonlyProductStock = hasNewCaseProductForRetail && hasExchange;

        var $item = $("<div data-productId='" + (item != null ? item.productId : 0) + "' />").addClass("specItem " + (this.hasMoreWholesaleSellPrice2 ? "forWholesale" : "") + " additional").appendTo($("#specListDiv"));

        var $title = $("<div class='item recipeList top th forSpecExchange' " + (hasExchange ? "" : "style='display:none;'") + ">").appendTo($item);
        $("<div class='col productSpec'/>").html(lang.tryGet("规格")).appendTo($title);
        if (this.hasMoreWholesaleSellPrice2) $("<div class='col productSellPrice2'/>").html(lang.tryGet("批发价")).appendTo($title);
        $("<div class='col productSellPrice'/>").html(lang.tryGet("售价")).appendTo($title);
        $("<div class='col productBuyPrice'/>").html(lang.tryGet("进价")).appendTo($title);
        $("<div class='col productStock' " + (noStock ? "style='display:none;'" : "") + "/>").html(lang.tryGet("库存")).appendTo($title);
        $("<div class='col unit' " + (hasExchange ? "" : "style='display:none;'") + " />").html(lang.tryGet("单位")).appendTo($title);
        $("<div class='col barcode' " + (hasExchange ? "style='display:none;'" : "") + " />").html(lang.tryGet("条码")).appendTo($title);

        if (item != null) {
            var $required = $("<div class='item recipeList middle' />").appendTo($item);
            $("<div class='col productSpec' style='overflow:hidden; white-space:nowrap;' />").html(item.attribute6).appendTo($required);
            if (this.hasMoreWholesaleSellPrice2) $("<div class='col productSellPrice2' />").html(item.sellPrice2).appendTo($required);
            $("<div class='col productSellPrice' />").html(item.sellPrice).appendTo($required);
            $("<div class='col productBuyPrice' />").html(item.buyPrice).appendTo($required);
            $("<div class='col productStock' " + (noStock ? "style='display:none;'" : "") + "/>").html(item.stock).appendTo($required);
            $("<div class='col unit' " + (hasExchange ? "" : "style='display:none;'") + "/>").html(item.baseUnitName).appendTo($required);
            $("<div class='col barcode' " + (hasExchange ? "style='display:none;'" : "") + "/>").html(item.barcode).appendTo($required);
            $("<div class='btnEditSmall' style='position:absolute; top:10px; right:-22px;' />").html("<b>&nbsp;&nbsp;&nbsp;&nbsp;</b>").bind("click", function () {
                _this.findProduct(item.productId);
            }).appendTo($required);
        } else {
            var $required = $("<div class='item recipeList middle required' />").appendTo($item);
            $("<input class='quantity col productSpec' type='text' maxlength='64' />").appendTo($required);
            if (this.hasMoreWholesaleSellPrice2) $("<input class='quantity col productSellPrice2' type='text' maxlength='8' />").appendTo($required);
            $("<input class='quantity col productSellPrice' type='text' maxlength='8' />").appendTo($required);
            $("<input class='quantity col productBuyPrice' type='text' maxlength='10' />").appendTo($required);
            $("<input class='quantity col productStock' " + (noStock ? "style='display:none;'" : "") + " type='text' maxlength='8' value='0' " + (!eidtProductStock || readonlyProductStock ? "readonly='readonly'" : "") + " />").appendTo($required);
            var $unit = $("<div class='unit' " + (hasExchange ? "" : "style='display:none;'") + "></div>").appendTo($required);
            var unitOptions = pospal.buildStoreUnitOptions(storeProductUnits);
            unitOptions.unshift({ text: lang.tryGet("请选择"), value: "" });
            var unitSelector = new pospal.ui.singleSelector({
                container: $unit,
                textWidth: _this.hasMoreWholesaleSellPrice2 ? 60 : 70,
                selectBoxWidth: 100,
                selectBoxMaxHeight: 180,
                showInput: false,
                options: unitOptions,
                onChange: function () {
                }
            });
            $unit.data("unitSelector", unitSelector);
            $("<input class='quantity col barcode' type='text' maxlength='32' " + (hasExchange ? "style='display:none;'" : "") + " />").appendTo($required);
            $("<div class='clearTextRed'>").bind("click", function () {
                $item.remove();
            }).appendTo($required);
        }

        var $optionalTitle = $("<div class='item recipeList top th forSpecExchange' style='margin-top:0px;" + (hasExchange ? "" : "display:none;") + "' />").appendTo($item);
        $("<div class='col productBarcode' />").html(lang.tryGet("条码")).appendTo($optionalTitle);
        $("<div class='col productExchange' />").html(lang.tryGet("换算关系") + "&nbsp;&nbsp;&nbsp;&nbsp;").appendTo($optionalTitle)

        if (item != null) {
            var $optional = $("<div class='item recipeList middle forSpecExchange' " + (hasExchange ? "" : "style='display:none;'") + ">").appendTo($item);
            $("<div class='col productBarcode' />").html(item.barcode).appendTo($optional);
            var exchangeStr = "";
            if (caseproductItem != null) {
                exchangeStr = caseproductItem.caseItemProductQuantity + " x  ";
            }
            $("<div class='col productExchange'/>").html("<span style='margin-right:10px;'>" + exchangeStr + baseSpecUnit + "</span>").appendTo($optional);
        } else {
            var $optional = $("<div class='item recipeList middle forSpecExchange optional' " + (hasExchange ? "" : "style='display:none;'") + ">").appendTo($item);
            $("<input class='quantity col productBarcode' type='text' maxlength='32' />").appendTo($optional);
            var str = "<div class='col productExchange conversion'>";
            str += "<label style='width:auto; margin:-8px 6px 0 0; float:right;'></label>";
            str += "<input type='text' maxlength='5' class='quantity' value='' style='float:right; margin:0px 10px 0 0;' />";
            str += "</div>";
            $(str).appendTo($optional);
            this.changeSpecExchangeLabel();
        }

        return $item;
    },

    changeSpecExchangeLabel: function () {
        var specName = $("#edit_attribute6").val().trim();
        if (specName != "") specName = "(" + specName + ")";

        var unitName = lang.tryGet("单位");
        if (this.edit_baseUnitSelector.getSelectedValue() != "") unitName = this.edit_baseUnitSelector.getSelectedText();

        $("#edit_moreSpec_div .specItem .item.optional .col.productExchange label").each(function (index, item) {
            $(item).html("x  " + unitName + specName);
        });
    },

    changeSupplierRangeLabel: function () {
        var selectedSuppliers = $("#btnSupplierRanges").data("selectedSuppliers") || [];
        var defaultSupplier = null;
        $(selectedSuppliers).each(function (index, item) {
            if (item.isDefault == 1) {
                defaultSupplier = item;
                return false;
            }
        });

        var supllierLabel = "已设置 " + selectedSuppliers.length;
        if (defaultSupplier) {
            supllierLabel += "(" + defaultSupplier.supplierName + ")";
        }
        $("#btnSupplierRanges span").html(supllierLabel);
    },

    isMulColorSize: function () {
        return (!$("#edit_mulcolorsize_item").is(":hidden") || $("#editArea").data("id") != 0) && this.edit_mulcolorsize_enable.getSelectedValue() == "1";
    },

    buildFormValidator: function () {
        var formItems = [];
        formItems.push({ key: "barcode", ele: $("#edit_barcode"), rules: [{ type: "required", msg: lang.tryGet("条码必填") }, { type: "isValidBarcode", msg: industryNumber == "103" ? "条码由：数字、字母、'_'、'-'、'*'、'/'组成" : "条码由：数字、字母、'_'、'-'组成" }] });
        formItems.push({ ele: $("#edit_productName"), rules: [{ type: "required", msg: lang.tryGet("名称必填") }, { type: "keyChart", msg: "由于<>符号异常，建议使用括号代替" }] });
        formItems.push({ key: "sellPrice", ele: $("#edit_sellPrice"), rules: [{ type: "required", msg: lang.tryGet("销售价必填") }, { type: "isNumeric", msg: lang.tryGet("请填写数字") }] });
        formItems.push({ key: "buyPrice", ele: $("#edit_buyPrice"), rules: [{ type: "required", msg: lang.tryGet("进货价必填") }, { type: "isNumeric", msg: lang.tryGet("请填写数字") }] });
        formItems.push({ key: "stock", ele: $("#edit_stock"), rules: [{ type: "required", msg: lang.tryGet("库存必填") }, { type: "isNumeric", msg: lang.tryGet("请填写数字") }] });
        formItems.push({ key: "timingPrice", ele: $("#edit_timingPrice"), rules: [{ type: "required", msg: lang.tryGet("价格必填") }, { type: "isPositiveNumber", msg: lang.tryGet("请填写正数") }] });
        formItems.push({ key: "minutesForSalePrice", ele: $("#edit_minutesForSalePrice"), rules: [{ type: "required", msg: lang.tryGet("最小计时数必填") }, { type: "isPositiveInteger", msg: lang.tryGet("请输入正整数") }] });
        formItems.push({ key: "minutesForFree", ele: $("#edit_minutesForFree"), rules: [{ type: "isPositiveInteger", msg: lang.tryGet("请输入正整数") }] });
        formItems.push({ key: "atLeastAmount", ele: $("#edit_atLeastAmount"), rules: [{ type: "required", msg: "* 最少消费金额必填" }, { type: "isPositiveNumber", msg: lang.tryGet("请填写正数") }] });
        formItems.push({ key: "atLeastMinutes", ele: $("#edit_atLeastMinutes"), rules: [{ type: "required", msg: lang.tryGet("最少消费时长必填") }, { type: "isPositiveInteger", msg: lang.tryGet("请输入正整数") }] });
        formItems.push({ ele: $("#edit_customerPrice"), rules: [{ type: "isNumeric", msg: lang.tryGet("请填写数字") }] });
        if (needValidateSellPrice2)
            formItems.push({ key: "sellPrice2", ele: $("#edit_sellPrice2"), rules: [{ type: "required", msg: "批发价必填" }, { type: "isNumeric", msg: lang.tryGet("请填写数字") }] });
        else
            formItems.push({ key: "sellPrice2", ele: $("#edit_sellPrice2"), rules: [{ type: "isNumeric", msg: lang.tryGet("请填写数字") }] });

        formItems.push({ ele: $("#edit_shelfLife"), rules: [{ type: "isPositiveInteger", msg: lang.tryGet("请输入正整数") }] });
        formItems.push({ ele: $("#edit_maxStock"), rules: [{ type: "isNonnegativeNumber", msg: lang.tryGet("请填写非负数") }] });
        formItems.push({ ele: $("#edit_minStock"), rules: [{ type: "isNonnegativeNumber", msg: lang.tryGet("请填写非负数") }] });
        formItems.push({ ele: $("#edit_ddl_productCategory"), rule: { msg: lang.tryGet("请选择分类") }, isSelector: true, selectorObj: this.edit_productCategorySelector });
        formItems.push({ key: "attribute4", ele: $("#edit_attribute4"), rules: [{ type: "required", msg: lang.tryGet("货号必填") }, { type: "isValidBarcode", msg: "货号由：数字、字母、'_'、'-'、'/'组成" }] });

        if (hasPreparationTime) formItems.push({ ele: $("#edit_preparationTime"), rules: [{ type: "isPositiveInteger", msg: lang.tryGet("请输入正整数") }] });
        if (hasProductWeightAttribute) formItems.push({ ele: $("#edit_weight"), rules: [{ type: "isPositiveNumber", msg: lang.tryGet("请填写正数") }] });
        if (hasProductVolumeAttribute) formItems.push({ ele: $("#edit_volume"), rules: [{ type: "isPositiveNumber", msg: lang.tryGet("请填写正数") }] });
        if (propCfg.MinSellQuantity) formItems.push({ ele: $("#edit_minSellQuantity"), rules: [{ type: "isPositiveNumber", msg: lang.tryGet("请填写正数") }] });
        if (hasSingleProductExtBarcode) formItems.push({ ele: $("#edit_productExtBarcode"), rules: [{ type: "isValidBarcode", msg: "* 扩展条码由：数字、字母、'_'、'-'、'*'组成" }] });
        if (hasProductClothingExtAttribute) formItems.push({ ele: $("#edit_tagPrice"), rules: [{ type: "isNumeric", msg: lang.tryGet("请填写数字") }] });
        $("#customerCategoryPrices .item.customerCategoryPrice").each(function (index, item) {
            formItems.push({ ele: $(item).find("input"), rules: [{ type: "isNumeric", msg: lang.tryGet("请填写数字") }] });
        });
        if (attrCfg.depositValidDays) {
            formItems.push({ ele: $("#edit_depositValidDays"), rules: [{ type: "isPositiveInteger", msg: lang.tryGet("请输入正整数") }] });
        }
        if (isValidateProductUnit) {
            formItems.push({ ele: $("#edit_ddl_unit"), key: "unit", rule: { msg: "请选择主单位" }, isSelector: true, selectorObj: this.edit_baseUnitSelector });
        }

        var opts = {};
        opts.formItems = formItems;
        this.formValidator = new pospal.formValidator(opts);
        this.formValidator.keyChart = function (v) { return !/<|>/.test(v); }
    },

    buildProduct: function () {
        var _this = this;
        var viewModel = this.viewModel;
        var product = {};
        product.id = $("#editArea").data("id");
        product.enable = this.edit_sb_enable.getSelectedValue();
        product.userId = this.edit_productStoreSelector.getSelectedValue();
        product.barcode = $("#edit_barcode").val().trim();
        product.name = $("#edit_productName").val().trim();
        product.categoryUid = this.edit_productCategorySelector.getSelectedValue();
        product.categoryName = product.categoryUid == "" ? lang.tryGet("无") : this.edit_productCategorySelector.getSelectedText();
        //如果开启了助记码，去掉助记码信息
        var category = pospal.find(categoryList, function (v) { return v.txtUid == product.categoryUid; });
        if (category && category.mnemonicCode) {
            product.categoryName = product.categoryName.replace("（" + category.mnemonicCode + "）", "");
        }
        product.sellPrice = pospal.fomatFloat($("#edit_sellPrice").val().trim(), 2).toString();
        product.buyPrice = $("#edit_buyPrice").val().trim();
        product.isCustomerDiscount = this.edit_sb_isCustomerDiscount.getSelectedValue();
        product.customerPrice = pospal.fomatFloat($("#edit_customerPrice").val().trim(), 2).toString();
        if (product.isCustomerDiscount == "0" && product.customerPrice.length == 0) {
            product.customerPrice = product.sellPrice;
        }
        product.sellPrice2 = pospal.fomatFloat($("#edit_sellPrice2").val().trim(), 2).toString();
        product.pinyin = $("#edit_pinyin").val().trim();
        //售价等

        var selectedSuppliers = $("#btnSupplierRanges").data("selectedSuppliers");
        var defaultSupplier = null;
        $(selectedSuppliers).each(function (index, item) {
            if (item.isDefault == 1) {
                defaultSupplier = item;
                return false;
            }
        });

        product.supplierUid = defaultSupplier != null ? defaultSupplier.supplierUid : null;
        product.supplierName = defaultSupplier != null ? defaultSupplier.supplierName : "无";
        //如果只设置了一个关联供应商，且来自product.supplierUid,range表不存记录
        if (selectedSuppliers.length == 1 && selectedSuppliers[0].fromProductDefault) {
            selectedSuppliers = [];
        }
        product.supplierRangeList = selectedSuppliers;

        product.productionDate = $("#edit_productionDate").val().trim();
        product.shelfLife = $("#edit_shelfLife").val().trim();
        product.maxStock = $("#edit_maxStock").val().trim();
        product.minStock = $("#edit_minStock").val().trim();
        product.description = $("#edit_remarks").val();
        product.noStock = hasNoStockPrepay ? this.edit_sb_noStock.getSelectedValue() : 0;
        product.stock = product.noStock != 1 && !editProduct.viewModel.IsBigProduct ? $("#edit_stock").val().trim() : 0;
        product.attribute6 = $("#edit_attribute6").val().trim();;
        product.attribute9 = $("#editArea").data("attribute9");

        product.productCommonAttribute = null;
        if (this.edit_sb_isTiming.getSelectedValue() == 1) {
            var unitExchangeQuantity = this.edit_timingUnitSelector.getSelectedValue();
            var atLeastUnitExchangeQuantity = this.edit_timingAtLeastUnitSelector.getSelectedValue();
            product.productCommonAttribute = {
                isTiming: 1,
                minutesForSalePrice: $("#edit_minutesForSalePrice").val().trim() * unitExchangeQuantity,
                atLeastMinutes: $("#edit_atLeastMinutes").val().trim() * atLeastUnitExchangeQuantity,
                atLeastAmount: $("#edit_atLeastAmount").val().trim(),
                minutesForFree: $("#edit_minutesForFree").val().trim()
            };
            product.sellPrice = $("#edit_timingPrice").val().trim();
            product.buyPrice = 0;
            product.stock = 0;
        }
        if (hasStockPosition) {
            var viewModelComm = viewModel.productCommonAttribute;
            var stockPositionObj = viewModelComm ? viewModelComm.stockPositionObj : null;
            if (product.productCommonAttribute != null) {
                product.productCommonAttribute.stockPositionObj = stockPositionObj;
            }
            else if (stockPositionObj) {
                product.productCommonAttribute = {
                    stockPositionObj: stockPositionObj
                };
            }

            var stockPosition = $("#edit_stockPosition").val().trim();
            if (product.productCommonAttribute != null)
                product.productCommonAttribute.stockPosition = stockPosition;
            else if (stockPosition != "") {
                product.productCommonAttribute = {
                    stockPosition: stockPosition
                };
            }
        }
        if (this.cfg.hasSN) {
            var enableSN = this.edit_enableSN.getSelectedValue();
            if (product.productCommonAttribute != null)
                product.productCommonAttribute.enableSN = enableSN;
            else if (enableSN == 1) {
                product.productCommonAttribute = {
                    enableSN: enableSN
                };
            }
        }

        if (hasNewlyProductSetting && product.id == "0") {//开启新品管理的新商品，默认设置为新品
            product.productCommonAttribute = product.productCommonAttribute || {};
            product.productCommonAttribute.isNewly = 1;
        }

        if (propCfg.IfNeedMake) {
            product.productCommonAttribute = product.productCommonAttribute || {};
            product.productCommonAttribute.ifNeedMake = this.edit_sb_ifNeedMake.getSelectedValue();
        }

        product.baseUnitName = this.edit_baseUnitSelector.getSelectedValue() == "" ? lang.tryGet("无") : this.edit_baseUnitSelector.getSelectedText();

        var minSellQuantity = $("#edit_minSellQuantity").val();
        if (minSellQuantity) {
            product.productCommonAttribute = product.productCommonAttribute || {};
            product.productCommonAttribute.minSellQuantity = minSellQuantity;
        }
        var rShopDisplayName = $("#edit_rShopDisplayName").val().trim();
        if (rShopDisplayName) {
            product.productCommonAttribute = product.productCommonAttribute || {};
            product.productCommonAttribute.rShopDisplayName = rShopDisplayName;
        }
        var mnemonicCode = $("#edit_mnemonicCode").val().trim();
        if (mnemonicCode) {
            product.productCommonAttribute = product.productCommonAttribute || {};
            product.productCommonAttribute.mnemonicCode = mnemonicCode;
        }

        //多会员价
        var customerPrices = [];
        if (this.hasMoreWholesalePrice) {
            $("#moreWholesalePrices .recipeList.middle, #moreWholesalePrices .recipeList.bottom").each(function (i, row) {
                var item = {};
                item.categoryUid = $(row).attr("data-categoryuid");
                item.minQuantity = $(row).find("input.buyerMinQuantity").val().trim();
                item.baseQuantity = $(row).find("input.buyerBaseQuantity").val().trim();
                item.price = $(row).find("input.buyerPrice").val().trim();
                item.salable = $(row).data("salableSelector").getSelectedValue();
                if (!(item.salable == 1 && item.minQuantity.length == 0 && item.price.length == 0 && item.baseQuantity.length == 0))
                    customerPrices.push(item);
            });

            $("#moreWholesaleCustomerPrices .recipeList.middle").each(function (i, row) {
                var item = {};
                item.customerUid = $(row).attr("data-customeruid");
                item.minQuantity = $(row).find("input.buyerMinQuantity").val().trim();
                item.baseQuantity = $(row).find("input.buyerBaseQuantity").val().trim();
                item.price = $(row).find("input.buyerPrice").val().trim();
                item.salable = $(row).data("salableSelector").getSelectedValue();
                customerPrices.push(item);
            });

        } else if (this.hasMoreCustomerPrice) {
            $("#customerCategoryPrices .customerCategoryPrice").each(function (index, item) {
                var categoryUid = $(item).attr("data-categoryUid");
                var categoryPrice = $(item).find("input.categoryPrice").val().trim();
                if (categoryPrice.length > 0) customerPrices.push({ categoryUid: categoryUid, price: categoryPrice, salable: 1 });
            })

            $("#customerSpecialPrices .customerSpecialPrice").each(function (index, item) {
                var customerUid = $(item).attr("data-customerUid");
                var customerPrice = $(item).find("input.customerPrice").val().trim();
                if (customerPrice.length > 0) customerPrices.push({ customerUid: customerUid, price: customerPrice, salable: 1 });
            })
        }

        product.customerPrices = customerPrices;
        if (this.hasMoreCustomerPrice && industryNumber != "110") {
            product.customerPrice = product.sellPrice;
        }

        product.productUnitExchangeList = [];
        var baseUnit = this.edit_baseUnitSelector.getSelectedValue();
        if (baseUnit != "") {
            var productUnitExchange = {};
            productUnitExchange.productUnitUid = baseUnit;
            productUnitExchange.unitQuantity = 1;
            productUnitExchange.baseUnitQuantity = 1;
            productUnitExchange.isBase = 1;
            productUnitExchange.isRequest = $("#unitExChangeList .isBase .requestUnit").hasClass("on") ? 1 : 0;
            productUnitExchange.isTicket = -1;
            productUnitExchange.isDiscard = -1;
            productUnitExchange.productUnitName = product.baseUnitName;

            product.productUnitExchangeList.push(productUnitExchange);
        }

        //单位换算
        $("#unitExChangeList div.exchange").each(function (i, item) {
            var $unitSelector = $(item).data("unitSelector");
            var exChangeUnitUid = $unitSelector.getSelectedValue();

            if (exChangeUnitUid != "") {
                var productUnitExchange = {};
                productUnitExchange.productUnitUid = exChangeUnitUid;
                productUnitExchange.unitQuantity = $(item).find(".conversion input.unitQuantity").val().trim();
                productUnitExchange.baseUnitQuantity = $(item).find(".conversion input.baseUnitQuantity").val().trim();
                productUnitExchange.isBase = 0;
                productUnitExchange.isRequest = $(item).find(".requestUnit").hasClass("on") ? 1 : 0;
                productUnitExchange.isTicket = -1;
                productUnitExchange.isDiscard = -1;
                productUnitExchange.productUnitName = $unitSelector.getSelectedText();

                product.productUnitExchangeList.push(productUnitExchange);
            }
        });

        if (hasClothingAttribute) {
            product.attribute1 = $("#edit_attribute1").val().trim();
            product.attribute2 = $("#edit_attribute2").val().trim();
            product.attribute4 = $("#edit_attribute4").val().trim();
            if (pospal.contains([105, 106, 112], industryNumber)) {
                product.attribute3 = $("#edit_attribute3").val().trim();
            }
        } else if (industryNumber == "102" || industryNumber == "114" || industryNumber == "107" || industryNumber == "115") {
            product.attribute1 = this.edit_sb_printLabel.getSelectedValue() == "1" ? "y" : "n";
            //厨房票打
            var printerUids = [];
            var printerSetting = [];
            if (hasCatePrinterSetting) {
                var printerData = editPrinterV2.getData();
                printerUids = printerData.printerUids;
                printerSetting = printerData.printerSetting;
            }
            else {
                $("#printerList table tbody tr").each(function (i, item) {
                    if (!$(item).hasClass("blank") && $(item).data("switchBox").getSelectedValue() == "1") {
                        printerUids.push($(item).data("printerUid"));
                    }
                });
            }
            //小票机
            var labelPrinterUids = [];
            $("#labelPrinterList table tbody tr").each(function (i, item) {
                if (!$(item).hasClass("blank") && $(item).data("switchBox").getSelectedValue() == "1") {
                    labelPrinterUids.push($(item).data("printerUid"));
                }
            });
            var cateAttribute = {};
            cateAttribute.printerUids = printerUids.join();
            cateAttribute.printerSetting = JSON.stringify(printerSetting);
            cateAttribute.labelPrinterUids = labelPrinterUids.join();
            product.cateAttribute = cateAttribute;
            if (industryNumber == "107") product.attribute4 = $("#edit_attribute4").val().trim();
            product.attribute2 = $("#edit_attribute2").val().trim();
            product.attribute3 = $("#edit_attribute3").val().trim();

        } else {
            product.attribute1 = $("#edit_attribute1").val().trim();
            product.attribute2 = $("#edit_attribute2").val().trim();
            product.attribute3 = $("#edit_attribute3").val().trim();
            product.attribute4 = $("#edit_attribute4").val().trim();
        }

        //图片
        product.productimages = [];
        $("#editImageDiv .imgUl li[fileId='']").each(function (i, item) {
            var productImage = {};
            productImage.path = $(item).data("imagePath");
            productImage.isCover = $(item).find(".imgCover").length > 0 ? true : false;
            product.productimages.push(productImage);
        });

        product.productTags = [];
        $("#edit_productTagList ul span").each(function (index, item) {
            product.productTags.push({ uid: $(item).attr("data-tagUid"), name: $(item).text() });
        });

        if (industryNumber == "102" || industryNumber == "114" || industryNumber == "115" || industryNumber == "112") {
            product.TasteMappingList = viewModel.TasteMappingList || [];
        }

        if (this.hasPluCode) {
            var pluCode = $("#edit_pluCode").length > 0 ? $("#edit_pluCode").val().trim() : "";
            if (pluCode.length > 0) {
                if (product.productCommonAttribute == null) product.productCommonAttribute = {};
                product.productCommonAttribute.pluCode = pluCode;
            }
        }

        if (attrCfg.depositValidDays) {
            var depositValidDays = $("#edit_depositValidDays").val();
            if (depositValidDays) {
                if (product.productCommonAttribute == null) product.productCommonAttribute = {};
                product.productCommonAttribute.depositValidDays = depositValidDays;
            }
        }

        var brandUid = this.edit_productBrandSelector.getSelectedValue();
        if (brandUid != "") {
            if (product.productCommonAttribute == null) product.productCommonAttribute = {};
            product.productCommonAttribute.brandUid = brandUid;
        }

        if (hasProductClothingExtAttribute) {
            product.clothingAttribute = {};
            product.clothingAttribute.tagPrice = $("#edit_tagPrice").val().trim();
            product.clothingAttribute.material = $("#edit_material").val().trim();
            product.clothingAttribute.originalPlace = $("#edit_originalPlace").val().trim();
            product.clothingAttribute.STC = $("#edit_STC").val().trim();
            product.clothingAttribute.performStandard = $("#edit_performStandard").val().trim();
        }

        if (hasWeighingAttribute) {
            if (!product.cateAttribute) product.cateAttribute = {};
            product.cateAttribute.isWeighing = this.edit_sb_isWeighing.getSelectedValue();
            product.cateAttribute.isCounting = this.edit_countingSelector.getSelectedValue();
        }
        if (this.edit_sb_isAICountStick) {
            if (!product.cateAttribute) product.cateAttribute = {};
            product.cateAttribute.isAICountStick = this.edit_sb_isAICountStick.getSelectedValue();
        }

        if (hasBarcodeScale) {
            if (product.productCommonAttribute == null) product.productCommonAttribute = {};
            product.productCommonAttribute.isBarcodeScale = this.edit_sb_isBarcodeScale.getSelectedValue();
        }

        if (hasProductPackageFee) {
            if (product.productCommonAttribute == null) product.productCommonAttribute = {};
            product.productCommonAttribute.isPacking = this.edit_sb_isPacking.getSelectedValue();
        }

        //服务时长
        if (hasServiceAtLeastMinutes) {
            var atLeastMinutesValIsValid = this.formValidator.isInteger($("#edit_serviceAtLeastMinutes").val()) &&
                this.formValidator.isPositiveNumber($("#edit_serviceAtLeastMinutes").val());
            if (this.edit_sb_noStock.getSelectedValue() == 1 &&
                this.edit_sb_isTiming.getSelectedValue() == 0 &&
                atLeastMinutesValIsValid) {
                if (product.productCommonAttribute == null) product.productCommonAttribute = {};
                product.productCommonAttribute.atLeastMinutes = $("#edit_serviceAtLeastMinutes").val();
            }
        }

        if (product.productCommonAttribute == null) product.productCommonAttribute = {};
        product.productCommonAttribute.canAppointed = this.edit_sb_canAppointed.getSelectedValue();

        //商品准备时间
        if (hasPreparationTime) {
            var preparationTime = $("#edit_preparationTime").val();
            product.productCommonAttribute.preparationTimeUnit = this.edit_preparationTimeUnitSelector ? this.edit_preparationTimeUnitSelector.getSelectedValue() : preparationTimeUnitConst.minute;
            if (preparationTime.trim() != "") {
                if (product.productCommonAttribute == null) product.productCommonAttribute = {};
                product.productCommonAttribute.preparationTime = preparationTime;
            }
        }
        //商品体积
        if (hasProductVolumeAttribute) {
            var volume = $("#edit_volume").val();
            if (volume.trim() != "") {
                if (product.productCommonAttribute == null) product.productCommonAttribute = {};
                product.productCommonAttribute.volume = volume;
            }
        }
        //商品重量
        if (hasProductWeightAttribute) {
            var weight = $("#edit_weight").val();
            if (weight.trim() != "") {
                if (product.productCommonAttribute == null) product.productCommonAttribute = {};
                product.productCommonAttribute.weight = weight;
            }

            if (this.edit_weightUnitSelector) {
                if (product.productCommonAttribute == null) product.productCommonAttribute = {};
                product.productCommonAttribute.weightUnit = this.edit_weightUnitSelector.getSelectedValue();
            }
        }

        //报损默认销售价
        if (hasDefaultDiscardPriceType) {
            if (product.productCommonAttribute == null) product.productCommonAttribute = {};
            product.productCommonAttribute.discardPriceType = 1;
        }

        //一品多码
        product.productExtBarcodes = [];
        if (this.edit_sb_extBarcode.getSelectedValue() == "1") {
            var extBarcodes = $("#editArea").data("productExtBarcodes") || [];
            product.productExtBarcodes = $.map(extBarcodes, function (item) {
                return { "extBarcode": item };
            })
        }
        else if ($("#edit_productExtBarcode").length > 0 && $("#edit_productExtBarcode").val().trim() != "") {
            product.productExtBarcodes.push({ "extBarcode": $("#edit_productExtBarcode").val().trim() });
        }
        else {

        }

        //新增商品，如果分类设置默认配置(这些项界面上没有，buildproduct时才带入)
        var categoryDefaultSetting = this.getCategoryDefaultSetting();
        if (categoryDefaultSetting) {
            product.isCurrentPrice = categoryDefaultSetting.isPriceNow == 1;//是否时价
            product.disableEntireDiscount = categoryDefaultSetting.isFixedProduct == 1;//是否固价
            product.isGift = categoryDefaultSetting.isGiftProduct;//是否允许赠送 
            if (product.productoption == null) product.productoption = {};
            product.productoption.hideFromEShop = categoryDefaultSetting.isHideInPos == 1;//是否在收银端隐藏
            product.productoption.hideFromSelfService = categoryDefaultSetting.isHideInSelfServiceKiosk;//是否在自助点餐机隐藏
        }

        return product;
    },

    buildMulColorSizeProducts: function () {
        var _this = this;
        var products = [];

        var productId = $("#editArea").data("id");
        var groupBySpu = groupRadioBox.checked;
        var orignalProducts = $("#edit_mulColorSize_div").data("oldProducts") || [];
        var mulColorSizeProducts = $("#edit_mulColorSize_div").data("products");
        $(mulColorSizeProducts).each(function (index, item) {
            var product = _this.buildProduct();

            product.id = item.id;
            product.uid = item.uid;
            product.attribute1 = item.attribute1;
            product.attribute2 = item.attribute2;
            product.stock = item.stock;
            product.sellPrice = item.sellPrice;
            product.buyPrice = item.buyPrice;
            product.barcode = item.barcode;
            product.enable = item.enable
            product.attribute5 = product.attribute4;
            //product.attribute7 = index == 0 ? "1" : "0";
            product.attribute8 = "1";

            if (_this.colorProductImages && _this.colorProductImages[product.attribute1]) {
                product.productimages = _this.colorProductImages[product.attribute1];
            }
            else {
                product.productimages = [];
            }

            product.productExtBarcodes = [];
            if (item.extBarcode && item.extBarcode.length > 0) {
                product.productExtBarcodes.push({ "extBarcode": item.extBarcode });
            }
            if (!product.clothingAttribute) product.clothingAttribute = {};
            product.clothingAttribute.colorGroupUid = item.ColorGroupUid;
            product.clothingAttribute.sizeGroupUid = item.SizeGroupUid;

            //ref XQ240125002，特殊处理执行标准和安全技术类别
            if (product.id != "0" && product.id != productId) {
                var index = pospal.findIndex(orignalProducts, function (it) { return it.id == product.id });
                var mainIndex = pospal.findIndex(orignalProducts, function (it) { return it.id == productId });
                if (index > -1 && mainIndex > -1) {
                    var orignalProduct = orignalProducts[index];
                    var mainProduct = orignalProducts[mainIndex];
                    if (!groupBySpu || product.sellPrice2 == mainProduct.sellPrice2) product.sellPrice2 = orignalProduct.sellPrice2;
                    if (!groupBySpu || product.isCustomerDiscount == mainProduct.isCustomerDiscount) product.isCustomerDiscount = orignalProduct.isCustomerDiscount;
                    if (!groupBySpu || product.customerPrice == mainProduct.customerPrice) product.customerPrice = orignalProduct.customerPrice;
                    if (!groupBySpu || product.maxStock == mainProduct.maxStock) product.maxStock = orignalProduct.maxStock;
                    if (!groupBySpu || product.minStock == mainProduct.minStock) product.minStock = orignalProduct.minStock;
                    if (product.productCommonAttribute) {
                        if (!groupBySpu || product.productCommonAttribute.stockPosition == (mainProduct.productCommonAttribute ? mainProduct.productCommonAttribute.stockPosition : null)) product.productCommonAttribute.stockPosition = orignalProduct.productCommonAttribute ? orignalProduct.productCommonAttribute.stockPosition : null;
                        if (!groupBySpu || product.productCommonAttribute.stockPositionObj == (mainProduct.productCommonAttribute ? mainProduct.productCommonAttribute.stockPositionObj : null)) product.productCommonAttribute.stockPositionObj = orignalProduct.productCommonAttribute ? orignalProduct.productCommonAttribute.stockPositionObj : null;

                    }
                    if (product.clothingAttribute) {
                        if (!groupBySpu || product.clothingAttribute.STC == (mainProduct.clothingAttribute ? mainProduct.clothingAttribute.STC : null)) product.clothingAttribute.STC = orignalProduct.clothingAttribute ? orignalProduct.clothingAttribute.STC : null;
                        if (!groupBySpu || product.clothingAttribute.performStandard == (mainProduct.clothingAttribute ? mainProduct.clothingAttribute.performStandard : null)) product.clothingAttribute.performStandard = orignalProduct.clothingAttribute ? orignalProduct.clothingAttribute.performStandard : null;
                    }
                    if (product.customerPrices) {
                        var orignalCustomerPrices = orignalProduct.customerPrices ? orignalProduct.customerPrices : [];
                        if (!groupBySpu) {
                            product.customerPrices = orignalCustomerPrices;
                        }
                        else {
                            var mainCustomerPrices = mainProduct.customerPrices ? mainProduct.customerPrices : [];
                            $.each(product.customerPrices, function (i, customerPrice) {
                                var mainPriceIndex = pospal.findIndex(mainCustomerPrices, function (it) { return it.categoryUid == customerPrice.categoryUid });
                                var orignalPriceIndex = pospal.findIndex(orignalCustomerPrices, function (it) { return it.categoryUid == customerPrice.categoryUid });
                                if (mainPriceIndex > -1 && orignalPriceIndex > -1 && mainCustomerPrices[mainPriceIndex].price == customerPrice.price) {
                                    customerPrice.price = orignalCustomerPrices[orignalPriceIndex].price;
                                }
                            });
                        }
                    }
                }
            }

            if (index == 0)//第一个商品设置货号主商品
            {
                product.hasSpuImages = true;
                product.productSpuImages = [];
                $("#editImageDiv .imgUl li[fileId='']").each(function (i, item) {
                    var productSpuImage = {};
                    productSpuImage.path = $(item).data("imagePath");
                    productSpuImage.isCover = $(item).find(".imgCover").length > 0 ? 1 : 0;
                    product.productSpuImages.push(productSpuImage);
                });
            }

            if (_this.hasMoreCustomerPrice && industryNumber != "110") {
                product.customerPrice = product.sellPrice;
            }
            if (item.isDel != true) {
                products.push(product);
            }
        });

        return products;
    },

    buildMoreSpecProducts: function () {
        var _this = this;
        var products = [];
        var caseproducts = [];
        var specProductOrders = $("#btn_order_spec").data("saveData") || [];
        var hasExchange = this.edit_sb_hasExchange.getSelectedValue() == "1";
        var isNew = $("#editArea").data("id") == 0;
        var defaultProduct = this.buildProduct();

        var spuCode = $("#editArea").data("spu");
        if (spuCode == "") {
            spuCode = new Date().format("yyMMddhhmmss") + pospal.getRandomNum(0, 9);
        }

        defaultProduct.attribute5 = spuCode;
        products.push(defaultProduct);

        $("#specListDiv .specItem").each(function (index, item) {
            if (!$(item).is(":hidden") && $(item).attr("data-productid") == "0") {
                var product = _this.buildProduct();

                var $required = $(item).find(".item.required");
                product.id = 0;
                product.attribute5 = spuCode;
                product.attribute6 = $required.find(".productSpec").val().trim();
                product.attribute9 = hasNewCaseProductForRetail && hasExchange ? '5' : null;
                product.sellPrice = $required.find(".productSellPrice").val().trim();
                product.buyPrice = $required.find(".productBuyPrice").val().trim();
                product.stock = $required.find(".productStock").val().trim();
                product.customerPrice = product.sellPrice;
                if (_this.hasMoreWholesaleSellPrice2) {
                    product.sellPrice2 = $required.find(".productSellPrice2").val().trim();
                }
                else {
                    product.sellPrice2 = product.sellPrice;
                }
                product.maxStock = null;
                product.minStock = null;
                product.customerPrices = [];
                product.productExtBarcodes = [];//其他规格商品扩展条码清空

                var $optional = $(item).find(".item.optional");
                product.barcode = hasExchange ? $optional.find(".productBarcode").val().trim() : $required.find(".barcode").val().trim();
                if (product.barcode.length == 0) {
                    product.barcode = defaultProduct.barcode + "-" + (index + 1);
                    //回写到界面，避免用户保存后看不到条码
                    if (hasExchange) {
                        $optional.find(".productBarcode").val(product.barcode);
                    }
                    else {
                        $required.find(".barcode").val(product.barcode);
                    }
                }

                if (hasExchange) {
                    product.productUnitExchangeList = [];
                    var baseUnitSelector = $required.find(".unit").data("unitSelector");
                    if (baseUnitSelector.getSelectedValue() != "") {
                        var productUnitExchange = {};
                        productUnitExchange.productUnitUid = baseUnitSelector.getSelectedValue();
                        productUnitExchange.unitQuantity = 1;
                        productUnitExchange.baseUnitQuantity = 1;
                        productUnitExchange.isBase = 1;
                        productUnitExchange.isRequest = 1;
                        productUnitExchange.productUnitName = baseUnitSelector.getSelectedText();
                        product.productUnitExchangeList.push(productUnitExchange);
                    }
                }

                if (hasExchange) {
                    var caseproduct = {};
                    caseproduct.caseProductBarcode = product.barcode;
                    caseproduct.caseProductUnitUid = baseUnitSelector.getSelectedValue();
                    caseproduct.itemProductBarcode = defaultProduct.barcode;
                    caseproduct.caseItemProductUnitUid = defaultProduct.productUnitExchangeList.length > 0 ? defaultProduct.productUnitExchangeList[0].productUnitUid : "";
                    caseproduct.caseItemProductQuantity = $optional.find(".productExchange input").val().trim();
                    caseproducts.push(caseproduct);
                }

                products.push(product);
            }
        });

        if (products.length > 1 && $("#editArea").data("spu") == "") {
            defaultProduct.attribute7 = "1";
        } else {
            defaultProduct.attribute7 = $("#editArea").data("isDefaultSpecProduct");
        }

        return { products: products, caseproducts: caseproducts, specProductOrders: specProductOrders };
    },

    checkProductUnitExchange: function () {
        var isValid = true;
        $("#unitExChangeList div.exchange").each(function (i, item) {
            var $unitSelector = $(item).data("unitSelector");
            var exChangeUnitUid = $unitSelector.getSelectedValue();

            if (exChangeUnitUid != "") {
                var unitQuantity = $(item).find(".conversion input.unitQuantity").val().trim();
                var baseUnitQuantity = $(item).find(".conversion input.baseUnitQuantity").val().trim();

                if (unitQuantity.length == 0 || baseUnitQuantity.length == 0) {
                    new pospal.ui.msgBox(lang.format("副单位换算未填写", [$unitSelector.getSelectedText()]));
                    isValid = false;
                    return;
                }

                if (isNaN(unitQuantity) || unitQuantity <= 0 || isNaN(baseUnitQuantity) || baseUnitQuantity <= 0) {
                    new pospal.ui.msgBox(lang.format("副单位数量格式有误", [$unitSelector.getSelectedText()]));
                    isValid = false;
                    return;
                }
            }
        });

        return isValid;
    },

    checkMoreWholesalePrice: function () {
        var isValid = true;

        $("#moreWholesalePrices .recipeList.middle, #moreWholesalePrices .recipeList.bottom, #moreWholesaleCustomerPrices .recipeList.middle").each(function (index, row) {
            var $minQuantityInput = $(row).find("input.buyerMinQuantity");
            var minQuantity = $minQuantityInput.val().trim();
            if (minQuantity.length > 0 && isNaN(minQuantity)) {
                isValid = false;
                new pospal.ui.msgBox("起售量格式有误");
                $minQuantityInput.select();
                return false;
            }

            var $baseQuantityInput = $(row).find("input.buyerBaseQuantity");
            var baseQuantity = $baseQuantityInput.val().trim();
            if (baseQuantity.length > 0 && isNaN(baseQuantity)) {
                isValid = false;
                new pospal.ui.msgBox("基数格式有误");
                $baseQuantityInput.select();
                return false;
            }

            var $priceInput = $(row).find("input.buyerPrice");
            var buyerPrice = $priceInput.val().trim();
            if (buyerPrice.length > 0 && isNaN(buyerPrice)) {
                isValid = false;
                new pospal.ui.msgBox("销售价格式有误");
                $priceInput.select();
                return false;
            }
        });

        $("#moreWholesaleCustomerPrices .recipeList.middle").each(function (index, row) {
            var salableSelector = $(row).data("salableSelector");
            if (salableSelector.getSelectedValue() == 1) {
                var minQuantity = $(row).find("input.buyerMinQuantity").val().trim();
                var baseQuantity = $(row).find("input.buyerBaseQuantity").val().trim();
                var $priceInput = $(row).find("input.buyerPrice");
                var buyerPrice = $priceInput.val().trim();
                if (buyerPrice.length == 0 && minQuantity.length == 0 && baseQuantity.length == 0) {
                    isValid = false;
                    new pospal.ui.msgBox("按会员设置未填写完整");
                    $priceInput.select();
                    return false;
                }
            }
        });

        return isValid;
    },

    checkMoreSpec: function () {
        var _this = this;
        var isValid = true;
        var barcodes = [];
        barcodes.push($("#edit_barcode").val().trim());
        if (!$("#moreSpecSettingDiv").is(":hidden") && this.edit_sb_moreSpec.getSelectedValue() == "1") {
            var hasExchange = this.edit_sb_hasExchange.getSelectedValue() == "1";
            var noStock = this.edit_sb_noStock && this.edit_sb_noStock.getSelectedValue() == "1";
            $("#specListDiv .specItem").each(function (index, item) {
                if (!$(item).is(":hidden") && $(item).attr("data-productid") == "0") {
                    var $required = $(item).find(".item.required");
                    var productSpec = $required.find(".productSpec").val().trim();
                    if (productSpec.length == 0) {
                        new pospal.ui.msgBox("其它规格未填写完整，请确认！");
                        $required.find(".productSpec").select();
                        isValid = false;
                        return;
                    }

                    if (_this.hasMoreWholesaleSellPrice2) {
                        var productSellPrice2 = $required.find(".productSellPrice2").val().trim();
                        if (productSellPrice2.length == 0 || isNaN(productSellPrice2)) {
                            new pospal.ui.msgBox("其它规格的批发价填写有误！");
                            $required.find(".productSellPrice2").select();
                            isValid = false;
                            return;
                        }
                    }

                    var productSellPrice = $required.find(".productSellPrice").val().trim();
                    if (productSellPrice.length == 0 || isNaN(productSellPrice)) {
                        new pospal.ui.msgBox("其它规格的销售价填写有误！");
                        $required.find(".productSellPrice").select();
                        isValid = false;
                        return;
                    }
                    var productBuyPrice = $required.find(".productBuyPrice").val().trim();
                    if (productBuyPrice.length == 0 || isNaN(productBuyPrice)) {
                        new pospal.ui.msgBox("其它规格的进货价填写有误！");
                        $required.find(".productBuyPrice").select();
                        isValid = false;
                        return;
                    }
                    var productStock = $required.find(".productStock").val().trim();
                    if (productStock.length == 0 || isNaN(productStock)) {
                        new pospal.ui.msgBox("其它规格的库存填写有误！");
                        $required.find(".productStock").select();
                        isValid = false;
                        return;
                    }

                    var productBarcode = null;
                    if (hasExchange) {
                        var $optional = $(item).find(".item.optional");
                        productBarcode = $optional.find(".productBarcode").val().trim();
                        if (productBarcode.length == 0) {
                            new pospal.ui.msgBox("请填写其它规格的条码");
                            $optional.find(".productBarcode").select();
                            isValid = false;
                            return;
                        }
                    } else {
                        productBarcode = $required.find(".barcode").val().trim();
                    }

                    if (productBarcode.length > 0) {
                        var isValidBarcode = true;
                        if (!new pospal.formValidator().isValidBarcode(productBarcode)) {
                            new pospal.ui.msgBox("商品条码格式错误，请确认！");
                            isValidBarcode = false;
                        } else if (pospal.isInArray(barcodes, productBarcode)) {
                            new pospal.ui.msgBox("规格条码重复，请确认！");
                            isValidBarcode = false;
                        }

                        if (isValidBarcode) {
                            barcodes.push(productBarcode);
                        } else {
                            hasExchange ? $optional.find(".productBarcode").select() : $required.find(".barcode").select();
                            isValid = false;
                            return;
                        }
                    }

                    if (hasExchange) {
                        var $optional = $(item).find(".item.optional");
                        var exchangeQuantity = $optional.find(".productExchange input").val().trim();
                        if (exchangeQuantity.length == 0 || isNaN(exchangeQuantity)) {
                            new pospal.ui.msgBox("请填写其它规格的换算关系");
                            $optional.find(".productExchange input").select();
                            isValid = false;
                            return;
                        }

                        if (!noStock && isValidateProductUnit) {
                            var baseUnitSelector = $required.find(".unit").data("unitSelector");
                            if (baseUnitSelector && baseUnitSelector.getSelectedValue() == "") {
                                new pospal.ui.msgBox("请填写其他规格单位");
                                isValid = false;
                                return;
                            }
                        }
                    }
                }
            });
        }

        return isValid;
    },

    checkMulColorSize: function () {
        var isValid = true;
        if ((!$("#edit_mulcolorsize_item").is(":hidden") || $("#editArea").data("id") != 0) && this.edit_mulcolorsize_enable.getSelectedValue() == "1") {
            var products = $("#edit_mulColorSize_div").data("products");
            if (products == null || pospal.findIndex(products, function (it) { return it.isDel != true; }) == -1) {
                new pospal.ui.msgBox("请先选择颜色尺码!");
                isValid = false;
            }
        }


        if ($("#editArea").data("id") == 0) {
            var artNo = $("#edit_attribute4").length > 0 ? $("#edit_attribute4").val().trim() : "";
            if (artNo.indexOf("*") > -1 && this.edit_mulcolorsize_enable.getSelectedValue() == "1") {
                new pospal.ui.msgBox("货号格式错误，不能包含*号");
                isValid = false;
            }
        }

        return isValid;
    },

    checkIsBindPassProduct: function () {
        var isValid = true;
        var bindPassProducts = $("#editArea").data("bindPassProducts");
        var isPassPromotionProduct = $("#editArea").data("isPassPromotionProduct");
        var productEnable = this.edit_sb_enable.getSelectedValue();
        if (bindPassProducts.length > 0 && productEnable == "0") {
            new pospal.ui.msgBox({ content: lang.tryFormat("次卡禁用提示", [bindPassProducts.join("、")]), autoCloseSec: 0 });
            isValid = false;
        }
        if (isPassPromotionProduct && productEnable == "0") {
            new pospal.ui.msgBox("当前商品是次卡商品，如需禁用请先删除对应次卡");
            isValid = false;
        }

        return isValid;
    },

    checkDisableHasAvailablePromotionCombo: function () {
        var _this = this;
        var isValid = true;
        var dtd = $.Deferred();
        var productId = $("#editArea").data("id");
        var productEnable = this.edit_sb_enable.getSelectedValue();
        if (productId == 0 || productEnable == '1') {
            dtd.resolve(true);
            return dtd;
        }

        var doing = new pospal.ui.loading($("#editArea"));
        pospal.ajax({
            url: "/Promotion/CheckHasAvailablePromotionCombo",
            data: {
                "productId": productId
            },
            success: function (result) {
                if (result.successed && result.hasAvailablePromotionCombo) {
                    new pospal.ui.msgBox({
                        boxType: "confirm",
                        confirmText: "确认禁用",
                        cancelText: "查看套餐",
                        content: "此商品被设置为" + result.ruleName + (result.totalRecord > 1 ? ("等" + result.totalRecord + "个") : "") + "的套餐子商品，如果禁用此商品，POS点单此套餐时将不生效套餐价格，建议先调整套餐子商品或者删除套餐",
                        onConfirm: function () {
                            if (this.confirmValue) {
                                dtd.resolve(true);
                            }
                            else {
                                var url = "/Promotion/Combo?userId=" + userSelector.getSelectedValue();
                                url += "&keyword=" + result.ruleName;
                                pospal.openPage(url, true);
                                isValid = false;
                                dtd.reject(false);
                            }
                        }
                    });
                }
                else {
                    dtd.resolve(true);
                }
            },
            complete: function () {
                doing.destroy();
            }
        });
        return dtd;
    },

    checkDataForDisableProductAuth: function () {
        var _this = this;
        var isValid = true;
        var dtd = $.Deferred();
        var productId = $("#editArea").data("id");
        var productEnable = this.edit_sb_enable.getSelectedValue();
        if (productId == 0 || productEnable == '1') {
            dtd.resolve(true);
            return dtd;
        }

        var doing = new pospal.ui.loading($("#editArea"));
        pospal.ajax({
            url: "/Product/CheckDataForDisableProductAuth",
            data: { "productId": productId },
            success: function (result) {
                if (result.successed) {
                    dtd.resolve(true);
                }
                else {
                    var msgBox = new pospal.ui.msgBox({ boxType: "html", content: result.msg, autoCloseSec: 0 });
                    msgBox.mainWrap.find(".popupAreaCenter").css("padding-top", "20px");
                    msgBox.mainWrap.find(".popupArea").height(180);
                    msgBox.mainWrap.find(".popupArea").mCustomScrollbar();

                    dtd.reject(false);
                }
            },
            complete: function () {
                doing.destroy();
            }
        });
        return dtd;
    },

    //计时商品时长检查
    checkAtLeastMinutes: function () {
        var isValid = true;

        //服务时长 
        if (hasServiceAtLeastMinutes && $("#edit_serviceAtLeastMinutes").val() != "") {
            var atLeastMinutesValIsValid = this.formValidator.isInteger($("#edit_serviceAtLeastMinutes").val()) &&
                this.formValidator.isPositiveNumber($("#edit_serviceAtLeastMinutes").val());
            if (!atLeastMinutesValIsValid) {
                new pospal.ui.msgBox("服务时长请输入正整数");
                isValid = false;
                return isValid;
            }
        }

        //计时商品 控制最少消费时间 >= 单位时间
        //if (hasNoStockPrepay && this.edit_sb_noStock.getSelectedValue() == 1 &&
        //    this.edit_sb_isTiming.getSelectedValue() == 1 &&
        //    Number($("#edit_minutesForSalePrice").val()) > Number($("#edit_atLeastMinutes").val())) {
        //    new pospal.ui.msgBox({ autoCloseSec: 0, content: "最少消费时间必须大于或者等于单位时间" + $("#edit_minutesForSalePrice").val() });
        //    isValid = false;
        //    return isValid;
        //}

        return isValid;
    },

    //检查称重商品条码长度
    checkIsWeighingBardoe: function () {
        var isValid = true;

        if (hasBarcodeScale && this.edit_sb_isBarcodeScale.getSelectedValue() == "1") {
            var barcode = $("#edit_barcode").val().trim();
            var pluCode = $("#edit_pluCode").val().trim();
            if (pluCode.length == 0) {
                new pospal.ui.msgBox({ autoCloseSec: 0, content: "称编码(PLU)不能为空" });
                isValid = false;
                return isValid;
            }

            if (hasWeightingCodeAuth && barcode.length != 5) {
                new pospal.ui.msgBox({ autoCloseSec: 0, content: "条码长度不正确，请先将条码改为五位" });
                isValid = false;
                return isValid;
            }

            if (!hasWeightingCodeAuth && barcode.length != 7) {
                new pospal.ui.msgBox({ autoCloseSec: 0, content: "条码长度不正确，请先将条码改为七位" });
                isValid = false;
                return isValid;
            }
        }

        return isValid;
    },

    //检查一品多码
    checkProductExtBarcodes: function () {
        var isValid = true;
        var extBarcodes = $("#editArea").data("productExtBarcodes") || [];
        if (this.edit_sb_extBarcode.getSelectedValue() == "1" && extBarcodes.length == 0) {
            new pospal.ui.msgBox({ autoCloseSec: 0, content: "一品多码商品请添加扩展条码" });
            isValid = false;
        }

        return isValid;
    },
    //检查多会员会员设置
    checkCustomerSpecialPrice: function () {
        var isValid = true;
        var _this = this;

        if (!this.hasProdctCustomerSpecialPrice) return isValid;

        $("#customerSpecialPrices .customerSpecialPrice").each(function (index, item) {
            var customerPrice = $(item).find("input.customerPrice").val().trim();
            if (!_this.formValidator.isNumeric(customerPrice)) {
                isValid = false;
                _this.formValidator.buildErrorMsg($(item), "按会员设置价格格式有误，请填写数字");
                $(item).focus();
                return false;
            }
            else {
                _this.formValidator.delErrorMsg($(item));
            }
        })

        return isValid;
    },

    checkUnitStandard: function () {
        var isValid = true;

        if (!hasNeedUnitStandard) return isValid;

        var isWeighing = this.edit_sb_isWeighing && this.edit_sb_isWeighing.getSelectedValue() == "1";
        var isBarcodeScale = this.edit_sb_isBarcodeScale && this.edit_sb_isBarcodeScale.getSelectedValue() == "1" && this.edit_countingSelector && this.edit_countingSelector.getSelectedValue() == "0";

        if (isWeighing || isBarcodeScale) {
            var baseUnitText = this.edit_baseUnitSelector.getSelectedText();
            //baseUnitText转小写
            baseUnitText = (baseUnitText || '').toLowerCase();
            if (baseUnitText != "kg" && baseUnitText != "KG" && baseUnitText != "Kg" && baseUnitText != "kG"
                && baseUnitText != "g" && baseUnitText != "G"
                && baseUnitText != "mg" && baseUnitText != "Mg" && baseUnitText != "mG" && baseUnitText != "MG"
                && baseUnitText != "t" && baseUnitText != "T"
                && baseUnitText != "市斤" && baseUnitText != "公斤" && baseUnitText != "斤"
                && baseUnitText != "千克" && baseUnitText != "克" && baseUnitText != "毫克"
                && baseUnitText != "两" && baseUnitText != "吨"
                && baseUnitText != "磅" && baseUnitText != "500g" && baseUnitText != "1000g"
                && baseUnitText != "lb"
            ) {
                isValid = false;
                var baseUnitUid = this.edit_baseUnitSelector.getSelectedValue();
                if (baseUnitUid == "") {
                    new pospal.ui.msgBox({ autoCloseSec: 0, content: "当前商品已设置称重商品，单位必填，请选择对应的重量单位" });
                } else {
                    new pospal.ui.msgBox({ autoCloseSec: 0, content: "当前商品已设置称重商品，单位必须为重量单位，请修改" });
                }
            }
        }

        return isValid;
    },

    saveProduct: function () {
        var _this = this;

        if (this.formValidator.isValid() && this.checkProductUnitExchange() && this.checkMoreWholesalePrice() && this.checkMoreSpec() && this.checkMulColorSize() && this.checkAtLeastMinutes() && this.checkIsBindPassProduct() && this.checkIsWeighingBardoe() && this.checkProductExtBarcodes() && this.checkCustomerSpecialPrice() && this.checkUnitStandard()) {
            var url;
            var data;
            var product;
            var products;
            var caseproducts = null;
            var specProductOrders = null;
            var validproduct = this.buildProduct();
            var profit = validproduct.sellPrice - validproduct.buyPrice;
            if (profit < -900000 || profit > 99999999.99) {
                new pospal.ui.msgBox({
                    autoCloseSec: 0, content: "利润异常，请检查所填商品售价或进价"
                });
                return;
            }

            if ((!$("#edit_mulcolorsize_item").is(":hidden") || $("#editArea").data("id") != 0) && this.edit_mulcolorsize_enable.getSelectedValue() == "1") {
                products = this.buildMulColorSizeProducts();
                url = "/Product/SaveProducts";
                data = {
                    "productsJson": JSON.stringify(products), "caseproductsJson": "", "isMulColorSize": true
                };
            } else if (!$("#moreSpecSettingDiv").is(":hidden") && _this.edit_sb_moreSpec.getSelectedValue() == "1") {
                var moreSpecProducts = this.buildMoreSpecProducts();
                products = moreSpecProducts.products;
                caseproducts = moreSpecProducts.caseproducts;
                specProductOrders = moreSpecProducts.specProductOrders;
                url = "/Product/SaveProducts";
                data = {
                    "productsJson": JSON.stringify(products), "caseproductsJson": JSON.stringify(caseproducts), "specProductOrders": JSON.stringify(specProductOrders), "isMulColorSize": false
                };
            } else {
                product = this.buildProduct();
                if (product.buyPrice && (product.buyPrice + '').indexOf('e') > -1) {
                    //处理bug Could not convert string to decimal: 6.7e-7. Path 'buyPrice', line 1, position 183.
                    product.buyPrice = (parseFloat(product.buyPrice) || 0).toFixed(8).toG0();
                }
                url = "/Product/SaveProduct";
                data = {
                    "productJson": JSON.stringify(product)
                };
            }
            var dtds = [];
            if (hasCheckDataForDisableProductAuth) {
                dtds.push(this.checkDataForDisableProductAuth());
            }
            else {
                dtds.push(this.checkDisableHasAvailablePromotionCombo());
            }
            $.when.apply($, dtds).done(function () {
                var doing = new pospal.ui.loading($("#editArea"));
                pospal.ajax({
                    url: url,
                    data: data,
                    success: function (result) {
                        if (!result.successed) {
                            new pospal.ui.msgBox({
                                content: result.msg,
                                autoCloseSec: 0
                            });
                        } else {
                            var isEditMulColorSizeProducts = (!$("#edit_mulcolorsize_item").is(":hidden") || $("#editArea").data("id") != 0) && _this.edit_mulcolorsize_enable.getSelectedValue() == "1";
                            var isEditMoreSpecProducts = !$("#moreSpecSettingDiv").is(":hidden") && _this.edit_sb_moreSpec.getSelectedValue() == "1";
                            if (isEditMulColorSizeProducts || isEditMoreSpecProducts) {
                                var modifiedMoreSpecProdcuts = result.modifiedMoreSpecProdcuts;
                                //多规格标记添加的已存在商品
                                if (isEditMoreSpecProducts && modifiedMoreSpecProdcuts.length > 0) {
                                    for (var i = products.length - 1; i >= 0; i--) {
                                        var item = products[i];
                                        var modifiedProduct = $.grep(modifiedMoreSpecProdcuts, function (item2) {
                                            return item2.barcode.toLowerCase() == item.barcode.toLowerCase();
                                        })
                                        if (modifiedProduct.length > 0) {
                                            products.splice(i, 1);
                                            products.push(JSON.parse(JSON.stringify(modifiedProduct[0])));
                                        }
                                    }
                                }
                                if (result.isNewProducts) {
                                    if (hasNewProductInfoAuth) _this.saveNewProductClickCount();
                                    $("#txt_keyword").val(products[0].attribute5);
                                    if (result.syncStores.length > 0) {
                                        if (result.isOldArtNo) {
                                            $.each(products, function (index, item) {
                                                item.attribute5 = null;
                                                item.attribute8 = null;
                                            });
                                        }
                                        sync.confirmAddProductsToStores(result.syncStores, products, products[0].userId, caseproducts, specProductOrders);
                                    }
                                } else {
                                    layout.showOrHideEditArea(false);
                                    if (result.syncStores.length > 0) {
                                        sync.confirmUpdateProductsToStores(result.syncStores, products, products[0].userId, caseproducts, specProductOrders);
                                    } else {
                                        new pospal.ui.msgBox(lang.tryGet("商品修改成功"));
                                    }
                                }
                            } else {
                                if (product.id == 0) {
                                    if (hasNewProductInfoAuth) _this.saveNewProductClickCount();
                                    $("#txt_keyword").val(product.barcode);
                                    if (result.syncStores.length > 0) {
                                        if (result.hasEditProductAuth) {
                                            sync.confirmAddProductToStores(result.syncStores, product, product.userId);
                                        }
                                    }
                                } else {
                                    layout.showOrHideEditArea(false);
                                    if (result.syncStores.length > 0) {
                                        sync.confirmUpdateProductToStores(result.syncStores, product, product.userId);
                                    } else {
                                        new pospal.ui.msgBox(lang.tryGet("商品修改成功"));
                                    }
                                }
                            }

                            loadCurrentQueryProducts(true);
                        }
                    },
                    complete: function () {
                        doing.destroy();
                    }
                });
            });
        }
    },

    saveNewProductClickCount: function () {
        var now = new Date();
        if (startNewProductTime) {
            clickCount.save("4000014", Math.floor((now.getTime() - startNewProductTime.getTime()) / 1000).toString());
            startNewProductTime = null;
        }
        else {
            clickCount.save("4000015", "2");
        }
        clickCount.save("4000013", "4");
    },

    deleteProduct: function () {
        var _this = this;
        var productId = $("#editArea").data("id");
        var isDefaultSpecProduct = $("#editArea").data("isDefaultSpecProduct") == "1";
        var isMulColorSizeProduct = $("#editArea").data("isMulColorSize");
        var bindPassProducts = $("#editArea").data("bindPassProducts");
        var isPassPromotionProduct = $("#editArea").data("isPassPromotionProduct");
        var spu = $("#editArea").data("spu");

        if (bindPassProducts.length > 0) {
            new pospal.ui.msgBox({ content: lang.tryFormat("次卡删除提示", [bindPassProducts.join("、")]), autoCloseSec: 0 });
            return;
        }
        if (isPassPromotionProduct) {
            new pospal.ui.msgBox({
                content: "<div style='height:130px;line-height:130px;text-align: center;'>当前商品是次卡商品，请先删除对应次卡<a class='operation2' target='_blank' href='" + (isMeiYe ? "/PassProduct/ManageForBeauty" : "/PassProduct/Manage") + "' >前往设置</a></div>", boxType: "html"
            });
            return;
        }

        var dtd = $.Deferred();
        this.checkHasAvailablePromotionCombo(dtd, isDefaultSpecProduct, isMulColorSizeProduct);
        $.when(dtd).done(function () {
            var deleting = new pospal.ui.loading($("#editArea"));
            pospal.ajax({
                url: "/Product/DeleteProduct",
                data: {
                    "productId": productId, "getSyncStores": true
                },
                success: function (result) {
                    layout.showOrHideEditArea(false);
                    _this.removeRow(productId, (isDefaultSpecProduct || isMulColorSizeProduct) && spu.length > 0 ? spu : "");

                    if (result.syncStores.length > 0) {
                        sync.confirmDelProductToStores(result.syncStores, result.barcode);
                    } else {
                        new pospal.ui.msgBox(lang.tryGet("商品删除成功"));
                    }
                },
                complete: function () {
                    deleting.destroy();
                }
            });
        });
    },

    checkHasAvailablePromotionCombo: function (dtd, isDefaultSpecProduct, isMulColorSizeProduct) {
        var doing = new pospal.ui.loading($("#editArea"));
        pospal.ajax({
            url: "/Promotion/CheckHasAvailablePromotionCombo",
            data: {
                "productId": $("#editArea").data("id")
            },
            success: function (result) {
                if (result.successed) {
                    if (result.hasAvailablePromotionCombo) {
                        new pospal.ui.msgBox({
                            boxType: "confirm",
                            confirmText: "确认删除",
                            cancelText: "查看套餐",
                            content: "此商品被设置为" + result.ruleName + (result.totalRecord > 1 ? ("等" + result.totalRecord + "个") : "") + "的套餐子商品，如果删除此商品，POS点单此套餐时将不生效套餐价格，建议先调整套餐子商品或者删除套餐",
                            onConfirm: function () {
                                if (this.confirmValue) {
                                    dtd.resolve(true);
                                }
                                else {
                                    var url = "/Promotion/Combo?userId=" + userSelector.getSelectedValue();
                                    url += "&keyword=" + result.ruleName;
                                    pospal.openPage(url, true);
                                    dtd.reject(false);
                                }
                            }
                        });
                    }
                    else {
                        var confirmStr = "确认要删除该商品？";
                        if (isDefaultSpecProduct) {
                            confirmStr = "将同时删除其它规格的商品，确认删除？";
                        } else if (isMulColorSizeProduct) {
                            confirmStr = "确认删除此商品吗？<br />"
                                + '<font class="red">将会删除此商品货号下所有颜色尺码商品，无法恢复！';
                        }
                        new pospal.ui.msgBox({
                            title: "删除提示",
                            boxType: "confirm_del",
                            content: confirmStr,
                            onConfirm: function () {
                                if (this.confirmValue) {
                                    dtd.resolve(true);
                                }
                                else {
                                    dtd.reject(false);
                                }
                            }
                        });
                    }
                }
                else {
                    dtd.resolve(true);
                }
            },
            complete: function () {
                doing.destroy();
            }
        });
    },

    removeRow: function (productId, spu) {
        $("#mainTable tbody tr[data=" + productId + "]").remove();
        if (spu.length > 0) {
            $("#mainTable tbody tr[data-spu=" + spu + "]").remove();
        }
    },

    changeProductInfo: function () {
        var doing = new pospal.ui.loading($("#mainArea"));
        pospal.ajax({
            url: "/Setting/UpdateUserConfig",
            data: { "typeNumber": hasNewCateringIndustryAuth ? 1432 : 1197, "value": hasNewProductInfoAuth ? "0" : "1" },
            success: function (result) {
                if (result.successed) {
                    new pospal.ui.msgBox("切换商品资料成功");
                    setTimeout(function () {
                        location.reload();
                    }, 500);
                }
            },
            complete: function () { doing.destroy(); }
        });
    }
};

editImages = {
    init: function () {
        var _this = this;

        $("#btnShowEditImages").bind("click", function () {
            _this.show();
        });

        $("#btnAIGeneratedImages").bind("click", function () {
            pospal.openPage("/Product/AIGeneratedImages", true);
        });

        $("#btnProductAIGeneratedImages").bind("click", function () {
            var productId = parseInt($("#editArea").data("id"), 10);
            if (productId > 0) {
                pospal.openPage("/Product/AIGeneratedImages?productId=" + productId, true);
            }
        });

        $("#editImageDiv .popupClose").bind("click", function () {
            _this.hide();
        });

        $("#editImageDiv .contentArea").sortable({
            cursor: 'grabbing',
            items: 'li',
            axis: 'x',
        });
    },

    show: function () {
        var productId = parseInt($("#editArea").data("id"), 10);
        $("#btnProductAIGeneratedImages").toggle(productId > 0);

        $("#popupBg").show();
        $("#editImageDiv").show();

        if (this.uploader == null) this.buildUploader();
    },

    hide: function () {
        $("#popupBg").hide();
        $("#editImageDiv").hide();
    },

    resetUI: function () {
        $("#editImageDiv .imgUl").html("");
        $("#editImageDiv .imgUl").width(0);

        $("#uploadImageNames").val(lang.tryGet("选择上传图片"));
        $("#uploadMsg").html("<i>导入图片文件格式为.jpg/.jpeg/.png，图片文件大小不超过3M，最佳上传尺寸为 750×750正方形</i>");
        $("#uploadImagesPercent").css("width", "0%");
    },

    buildUploader: function () {
        var _this = this;

        var opts = {
        };
        opts.browse_button = "btnPickImages";
        opts.url = "/Product/UploadProductImage";
        opts.multi_selection = true;
        opts.max_file_size = $("#maxExcelExt").val() + 'mb';
        opts.extensions = "jpg,jpeg,png";
        opts.PostInit = function (up) {
            $("#btnUploadImages").bind("click", function () {
                if (up.files.length == 0) {
                    $("#uploadMsg").html("<b>" + lang.tryGet("提示选择图片") + "</b>");
                    $("#uploadImageNames").val(lang.tryGet("选择上传图片"));
                } else {
                    up.settings.url = "/Product/UploadProductImage?userId=" + userSelector.getSelectedValue() + "&productId=" + $("#editArea").data("id") + "&forMulColorSize=" + $("#editArea").data("isMulColorSize");
                    up.start();
                    up.disableBrowse(true);
                }
                return false;
            });
        }

        opts.FilesAdded = function (up, files) {
            var isValid = true;

            var liNum = $("#editImageDiv .imgUl li").length;
            if (liNum + files.length > 5) {
                isValid = false;
                new pospal.ui.msgBox({ content: "商品图片不能超过5张，请确认！", autoCloseSec: 0 });
                $.each(files, function (i, file) {
                    up.removeFile(file.id);
                })
            }

            if (isValid) {
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];

                    var li = $("<li/>").attr("fileId", files[i].id).appendTo($("#editImageDiv .imgUl"));
                    var imgBox = $("<div/>").addClass("imgBox").appendTo(li);
                    var img = $("<img style='width:140px; height:140px;' src='/images/thempty.png' />").appendTo(imgBox);
                    var imgUpload = $("<div/>").addClass("imgUpload").appendTo(imgBox);
                    $("<h1/>").html(file.name).appendTo(imgUpload);
                    $("<div/>").addClass("blackBg").appendTo(imgUpload);
                    $("<div/>").addClass("progress").html("<div style='width:0%'><div>").appendTo(imgUpload);

                    var btnDel = $("<div/>").addClass("delete").html("<b>" + lang.tryGet("取消上传") + "</b>").appendTo(imgUpload);
                    btnDel.bind("click", function () {
                        _this.removeFile($(this).parent().parent().parent());
                    });

                    !function (i) {
                        pospal.previewImage(files[i], function (imgsrc) {
                            $("#editImageDiv .imgUl li[fileId=" + files[i].id + "]").find("img").attr("src", imgsrc);
                            $("#editImageDiv .imgUl li[fileId=" + files[i].id + "]").find("h1").remove();
                        })
                    }(i);
                }

                _this.countTotal();
            }
        }

        opts.UploadProgress = function (up, file) {
            $("#editImageDiv .imgUl li[fileId=" + file.id + "]").find(".progress div").css("width", file.percent + "%");
            $("#uploadImagesPercent").css("width", up.total.percent + "%");
        }

        opts.FileUploaded = function (up, file, response) {
            if (response != null && response.response != null && response.response != "") {
                var result = JSON.parse(response.response);

                if (result.successed) {
                    $("#uploadMsg").html(lang.tryGet("上传完成") + "：" + file.name + "<br/>" + $("#uploadMsg").html());
                    var imagePath = pospal.formatSmallImageUrl(imageDomain + result.msg);

                    //根据返回的Url，充值Li
                    var li = $("#editImageDiv .imgUl li[fileId=" + file.id + "]");
                    li.attr("fileId", "");
                    li.data("imagePath", result.msg);
                    li.find("img").attr("src", imagePath);
                    if ($("#editArea").data("id") > 0) {
                        li.data("imgId", result.imageId);
                    }

                    var div = li.find(".imgUpload");
                    div.removeClass("imgUpload").addClass("imgOperation");
                    div.html("");
                    $("<div/>").addClass("blackBg").appendTo(div);
                    var btnDel = $("<div/>").addClass("delete").html("<b>" + lang.tryGet("删除图片") + "</b>").appendTo(div);
                    var btnSetCover = $("<div/>").addClass("textCover").html(lang.tryGet("设为封面")).appendTo(div);

                    btnDel.bind("click", function () {
                        _this.delImg($(this).parent().parent().parent());
                    })

                    btnSetCover.bind("click", function () {
                        _this.setCoverImg($(this).parent().parent().parent());
                    })

                } else {
                    $("#uploadMsg").html("<i>" + lang.tryGet("上传失败") + "：" + file.name + "<i><br/>" + $("#uploadMsg").html());
                }
            }
        }

        opts.UploadComplete = function (up, file) {
            $("#uploadMsg").html("<b>" + lang.tryGet("图片上传成功") + "</b><br/>" + $("#uploadMsg").html());
            $("#uploadImagesPercent").css("width", "100%");

            if ($("#editArea").data("id") == 0 || !_this.hasCoverImg()) {
                var firstLi = $("#editImageDiv .imgUl li[fileId='']").eq(0);
                _this.setCoverImgUI(firstLi);
            }
            up.disableBrowse(false);
            up.splice(0, up.files.length);
        }

        opts.Error = function (up, err) {
            var err = err.file.name + "：" + err.message;
            $("#uploadMsg").html("<b>" + err + "</b>");

            up.disableBrowse(false);
        }

        _this.uploader = pospal.buildUploader(opts);

        this.countTotal = function () {
            var liNum = $("#editImageDiv .imgUl li").length;
            $("#editImageDiv .imgUl").width(liNum * 160);

            if (_this.uploader.files.length == 0) {
                $("#uploadImageNames").val(lang.tryGet("选择上传图片"));
            } else {
                $("#uploadImageNames").val(lang.format("添加图片统计", [_this.uploader.files.length, (_this.uploader.total.size / 1024).toFixed(2)]));
            }
        }

        this.removeFile = function (li) {
            var fileId = $(li).attr("fileId");
            _this.uploader.removeFile(fileId);
            $(li).remove();

            _this.countTotal();
        }
    },

    setCoverImgUI: function (li) {
        $("#editImageDiv .imgUl li .imgCover").remove();
        $("<div/>").addClass("imgCover").html(lang.tryGet("封面")).appendTo(li.find(".imgBox"));

        var newCoverImgPath = li.find("img").attr("src");
        if ($(".defaultImage img").length > 0) {
            $(".defaultImage img").attr("src", newCoverImgPath);
        } else {
            $("<img/>").attr("src", newCoverImgPath).appendTo($(".defaultImage"));
        }
    },

    setCoverImg: function (li) {
        this.setCoverImgUI(li);

        if ($("#editArea").data("id") > 0) {
            pospal.ajax({
                url: "/Product/ResetCoverImage",
                data: {
                    "productImageId": $(li).data("imgId"), "forMulColorSize": $("#editArea").data("isMulColorSize")
                },
                success: function (result) { },
                complete: function () { }
            });
        }

        $("#uploadMsg").html("<i>" + lang.tryGet("已设置封面") + "</i><br/>" + $("#uploadMsg").html());
    },

    hasCoverImg: function () {
        var coverImg = $("#editImageDiv .imgUl li .imgCover");
        if (coverImg.length > 0)
            return true;
        else
            return false;
    },

    delImg: function (li) {
        var _this = this;

        if ($("#editArea").data("id") == 0) {
            li.remove();

            if (li.find(".imgCover").length > 0) {
                //删除的是封面，寻找下一张作为新封面
                var firstLi = $("#editImageDiv .imgUl li[fileId='']").eq(0);
                if (firstLi.length > 0) {
                    _this.setCoverImgUI(firstLi);
                } else {
                    $("#editArea .defaultImage img").remove();
                }
            }
        } else {
            var productImageId = $(li).data("imgId");
            new pospal.ui.msgBox({
                boxType: "confirm",
                content: lang.tryGet("确认删除图片"),
                onConfirm: function () {
                    if (this.confirmValue) {
                        li.remove();
                        if (li.find(".imgCover").length > 0) {
                            //删除的是封面，寻找下一张作为新封面
                            var firstLi = $("#editImageDiv .imgUl li[fileId='']").eq(0);
                            if (firstLi.length > 0) {
                                _this.setCoverImgUI(firstLi);
                            } else {
                                $("#editArea .defaultImage img").remove();
                            }
                        }

                        pospal.ajax({
                            url: "/Product/DeleteProductImage",
                            data: {
                                "productImageId": productImageId, "forMulColorSize": $("#editArea").data("isMulColorSize")
                            },
                            success: function (result) {
                                $("#uploadMsg").html("<i>" + lang.tryGet("图片已删除") + "</i><br/>" + $("#uploadMsg").html());
                            },
                            complete: function () { }
                        });
                    }
                }
            });
        }

        var liNum = $("#editImageDiv .imgUl li").length;
        $("#editImageDiv .imgUl").width(liNum * 160);
    },

    buildImgsUI: function (productImages) {
        var _this = this;

        if (productImages != null && productImages.length > 0) {
            for (var i = 0; i < productImages.length; i++) {
                var pi = productImages[i];

                var li = $("<li/>").attr("fileId", "").data("imagePath", pi.path).appendTo($("#editImageDiv .imgUl"));
                var imgBox = $("<div/>").addClass("imgBox").appendTo(li);
                var img = $("<img style='width:140px; height:140px;' />").attr("src", pospal.formatSmallImageUrl(imageDomain + pi.path)).appendTo(imgBox);
                var imgOperation = $("<div/>").addClass("imgOperation").appendTo(imgBox);

                $("<div/>").addClass("blackBg").appendTo(imgOperation);
                var btnDel = $("<div/>").addClass("delete").html("<b>" + lang.tryGet("删除图片") + "</b>").appendTo(imgOperation);
                var btnSetCover = $("<div/>").addClass("textCover").html(lang.tryGet("设为封面")).appendTo(imgOperation);

                btnDel.bind("click", function () {
                    _this.delImg($(this).parent().parent().parent());
                })

                btnSetCover.bind("click", function () {
                    _this.setCoverImg($(this).parent().parent().parent());
                })

                if (pi.isCover) {
                    $("<div/>").addClass("imgCover").html(lang.tryGet("封面")).appendTo(imgBox);
                }

                li.data("imgId", pi.id);
            }

            $("#editImageDiv .imgUl").width(productImages.length * 160);
        }
    }
};

var imageSegmentation = {
    init: function () {
        var _this = this;
        this.$container = $("#imageSegmentationDiv");
        this.bindEvent();
    },
    bindEvent: function () {
        var _this = this;
        $("#btnSegmentation").bind("click", function () {
            var length = $("#editImageDiv .imgUl li[fileId='']").length;
            if (length == 0) {
                new pospal.ui.msgBox({ content: "请先上传图片", boxType: "toast", autoCloseSec: 1500 });
                return false;
            }
            _this.show();
        });
        this.$container.on("click", ".colorItem", function () {
            $(this).addClass("on").siblings(".colorItem").removeClass("on");
            _this.loadSegmentationImages();
        });

        this.$container.on("click", ".segmentationItem", function () {
            if ($(this).hasClass("on")) {
                $(this).removeClass("on");
            } else {
                $(this).addClass("on");
            }
        });
        this.$container.find(".btnDownload").bind("click", function () {
            _this.downloadSegmentationImages();
        });
        this.$container.find(".popupClose, .btnCancel").bind("click", function () {
            _this.hide();
        });
        this.$container.find(".btnSave").bind("click", function () {
            _this.saveData();
        });
    },
    show: function () {
        this.bindData();
        this.$container.show();
    },
    hide: function () {
        this.$container.hide();
    },
    downloadSegmentationImages: function () {
        var _this = this;
        var itemLength = this.$container.find(".segmentationItem.on").length;
        if (itemLength == 0) {
            new pospal.ui.msgBox({ content: "请先勾选图片", boxType: "toast", autoCloseSec: 1500 });
            return false;
        }
        var posalGuid = new pospal.guid();
        this.$container.find(".segmentationItem.on").each(function (i, item) {
            var $item = $(item);
            var base64Img = $item.find("img").attr("src");
            var a = $("<a/>")
                .attr("href", base64Img)
                .attr("download", posalGuid.newGUID() + '.jpg')
                .appendTo("body");
            a[0].click();
            a.remove();
        });
    },
    loadSegmentationImages: function () {
        var _this = this;
        var returnFormat = this.$container.find(".colorItem.on").attr("data");
        var doing = new pospal.ui.loading(this.$container);
        var dtds = [];
        var errorMsgs = [];
        this.$container.find(".segmentationItem").each(function (i, item) {
            var $item = $(item);
            var $image = $item.find("img");
            var b64 = $item.data("base64");
            b64 = b64.replace(/^data:image\/?[A-z]*;base64,/, '');
            dtds.push(pospal.ajax({
                url: "/Product/LoadImageWithSegmentation",
                data: { "userId": userSelector.getSelectedValue(), "imageBase64": b64, "returnFormat": returnFormat },
                success: function (result) {
                    if (result.successed) {
                        $image.attr("src", 'data:image/jpg;base64,' + result.data);
                    }
                    else {
                        $image.attr("src", 'data:image/jpg;base64,' + b64);
                        errorMsgs.push('第' + (i + 1) + '张图片智能抠图失败，原因：' + result.msg);
                    }
                }
            }));
        });
        $.when.apply($, dtds).then(function () {
            if (errorMsgs.length > 0) {
                var msgBox = new pospal.ui.msgBox({ boxType: "html", content: errorMsgs.join('<br />'), autoCloseSec: 0 });
                msgBox.mainWrap.find(".popupAreaCenter").css("padding-top", "20px");
                msgBox.mainWrap.find(".popupArea").height(180);
                msgBox.mainWrap.find(".popupArea").mCustomScrollbar();
            }
        }).always(function () {
            doing.destroy();
        });
    },
    bindData: function () {
        var _this = this;
        var $widget = this.$container.find(".segmentationItemWidget").empty();
        var dtd = $.Deferred();
        var length = $("#editImageDiv .imgUl li[fileId='']").length;
        $("#editImageDiv .imgUl li[fileId='']").each(function (i, item) {
            var productImage = {};
            productImage.path = $(item).data("imagePath");
            productImage.isCover = $(item).find(".imgCover").length > 0 ? true : false;
            productImage.imageSrc = pospal.formatSmallImageUrl(imageDomain + productImage.path);
            var $item = $(template("segmentationItem_Template", productImage)).appendTo($widget);

            var img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = function () {
                try {
                    var canvas = document.createElement('canvas'),
                        ctx = canvas.getContext('2d');
                    canvas.height = img.naturalHeight;
                    canvas.width = img.naturalWidth;
                    ctx.drawImage(img, 0, 0);
                    var b64 = canvas.toDataURL('image/jpg');
                    if (b64) {
                        $item.data("base64", b64);
                    }
                    else {
                        $item.remove();
                    }
                }
                catch (ex) {
                    console.log(ex);
                    $item.remove();
                }
                if (i == length - 1) dtd.resolve();
            };
            img.onerror = function () {
                $item.remove();
                if (i == length - 1) dtd.resolve();
            };
            img.src = imageDomain + $item.attr("orignal-data") + "!/max/1280?not-from-cache-please";
        });
        $.when(dtd).then(function () {
            setTimeout(function () {
                _this.loadSegmentationImages();
            }, 100);
        });
    },
    saveData: function () {
        var _this = this;
        var itemLength = this.$container.find(".segmentationItem.on").length;
        if (itemLength == 0) {
            new pospal.ui.msgBox({ content: "请先勾选图片", boxType: "toast", autoCloseSec: 1500 });
            return false;
        }
        var doing = new pospal.ui.loading(this.$container);
        var dtds = [];
        var errorMsgs = [];
        this.$container.find(".segmentationItem.on").each(function (i, item) {
            var $item = $(item);
            var $image = $item.find("img");
            var b64 = $image.attr("src");
            b64 = b64.replace(/^data:image\/?[A-z]*;base64,/, '');
            var orignalPath = $item.attr("orignal-data");
            var $li = null;
            $("#editImageDiv .imgUl li[fileId='']").each(function (j, li) {
                if ($(li).data("imagePath") == orignalPath) {
                    $li = $(li);
                }
            });
            dtds.push(pospal.ajax({
                url: "/Product/SaveImageWithSegmentation",
                data: { "userId": userSelector.getSelectedValue(), "imageBase64": b64, "productImageId": $li.data("imgId"), "forMulColorSize": $("#editArea").data("isMulColorSize") },
                success: function (result) {
                    if (result.successed) {
                        if ($li) {
                            $li.data("imagePath", result.imagePath);
                            $li.find("img").attr("src", pospal.formatSmallImageUrl(imageDomain + result.imagePath));
                            if ($li.find(".imgCover").length > 0) {
                                editImages.setCoverImgUI($li);
                            }
                        }
                    }
                    else {
                        errorMsgs.push('第' + (i + 1) + '张图片上传失败，原因：' + result.msg);
                    }
                }
            }));
        });
        $.when.apply($, dtds).then(function () {
            if (errorMsgs.length > 0) {
                var msgBox = new pospal.ui.msgBox({ boxType: "html", content: errorMsgs.join('<br />'), autoCloseSec: 0 });
                msgBox.mainWrap.find(".popupAreaCenter").css("padding-top", "20px");
                msgBox.mainWrap.find(".popupArea").height(180);
                msgBox.mainWrap.find(".popupArea").mCustomScrollbar();
            }
            else {
                new pospal.ui.msgBox({ content: "应用图片成功", autoCloseSec: 1500 });
                _this.hide();
            }
        }).always(function () {
            doing.destroy();
        });
    }
};


sync = {
    init: function () {
        var _this = this;

        $("#syncDiv .popupClose").bind("click", function () {
            _this.hide();
        });

        $(document).on("click", "#syncDiv .confirm[data=del]", function () {
            _this.syncDelProductToStores();
        });

        $(document).on("click", "#syncDiv .confirm[data=add]", function () {
            _this.syncAddProductToStores();
        });

        $(document).on("click", "#syncDiv .confirm[data=add_mul]", function () {
            _this.syncAddProductsToStores();
        });

        $(document).on("click", "#syncDiv .confirm[data=add_morespec]", function () {
            _this.syncAddMoreSpecProductsToStores();
        });

        $(document).on("click", "#syncDiv .confirm[data=update]", function () {
            _this.syncUpdateProductToStores();
        });

        $(document).on("click", "#syncDiv .confirm[data=update_mul]", function () {
            _this.syncUpdateProductsToStores();
        });

        $(document).on("click", "#syncDiv .confirm[data=update_morespec]", function () {
            _this.syncUpdateMoreSpecProductsToStores();
        });

        $("#syncDiv .attributeCheckBoxAll").bind("click", function () {
            $(this).removeClass('indeterminate');
            if ($(this).hasClass("on")) {
                $(this).removeClass("on");
                $("#syncDiv .attributeCheckBoxList div.checkBoxDiv:not(.disable)").removeClass("on");
            } else {
                $(this).addClass("on");
                $("#syncDiv .attributeCheckBoxList div.checkBoxDiv:not(.disable)").addClass("on");
            }
        });

        $("#syncDiv .attributeCheckBoxList div.checkBoxDiv:not(.disable)").bind("click", function () {
            if ($(this).hasClass("on")) {
                $(this).removeClass("on");
            } else {
                $(this).addClass("on");
            }
            $("#syncDiv .attributeCheckBoxAll").removeClass('indeterminate');
            if ($(this).parent().find("div.checkBoxDiv:not(.on):not(.disable)").length == 0) {
                $("#syncDiv .attributeCheckBoxAll").addClass("on");
            } else {
                if ($(this).parent().find("div.checkBoxDiv:visible.on").length > 0) {
                    $("#syncDiv .attributeCheckBoxAll").addClass('indeterminate');
                }
                $("#syncDiv .attributeCheckBoxAll").removeClass("on");
            }
        });
        this.defaultKeyword = lang.tryGet("搜索门店关键字", true);
        $("#syncDiv .storeKeyword").keyup(function () {
            _this.filtStores();
        }).blur(function () {
            if ($(this).val().trim().length == 0) {
                $(this).val(_this.defaultKeyword);
            }
        }).click(function () {
            if ($(this).val().trim() == _this.defaultKeyword) {
                $(this).val("");
            }
        });

        $("#syncDiv .checkBoxDiv").addClass("checkBoxDivN");
    },

    show: function (withAttribute) {
        if (withAttribute) {
            $("#syncDiv").css({ "width": "832px", "margin-left": "-415px" }).find(".copyData").show();
            $("#syncDiv .popupBottom .split").show();
        } else {
            $("#syncDiv").css({ "width": "480px", "margin-left": "-240px" }).find(".copyData").hide();
            $("#syncDiv .popupBottom .split").hide();
        }
        $("#syncDiv .processDiv").html('');
        $("#syncDivBg,#syncDiv").show();
        $("#syncDiv .confirm").show();
        this.toUserInit = false;
    },

    hide: function () {
        $("#syncDivBg").hide();
        $("#syncDiv").hide();
    },

    bulidStoreList: function (stores, action, noReset) {
        var _this = this;
        if (!noReset) {
            _this.stores = stores;
            _this.action = action;
            $("#syncDiv .storeKeyword").val(_this.defaultKeyword);
        }
        _this.storeIdRange = $.map(stores, function (n) { return n.value; });
        var $checkAll = new pospal.ui.checkBox({
            container: $("<div/>").appendTo($("#syncDiv .checkAllSyncDiv").empty()),
            text: lang.tryGet("全选"),
            clickCallBack: function () {
                _this.toStoreSelector.checkAllClickCallBack();
            }
        });
        $("#syncDiv .checkAllSyncDiv .checkBoxDiv").addClass("checkBoxDivN");
        this.$checkAll = $checkAll;

        $("#syncDiv .confirm").attr("data", action);
        if (!_this.toStoreSelector) {
            _this.toStoreSelector = new pospal.storeSelectorV2({
                title: "",
                operTip: '',
                mainUI: $("#syncDiv"),
                mainArea: $("#syncDiv .mainArea.copyStore"),
                bottomUI: $("#syncDiv .popupBottom"),
                cb_checkAll: _this.$checkAll,
                selectedNumId: "syncToSeltStoreNum",
                allStoreNumId: "syncToStoreNum",
                withCreatedDatetime: pospal.getStoreCount(storeOptions, 'subUsers') > 2000,
                options: [],
                excludeStoreIds: [],
                showImport: true,
                storeIdRange: _this.storeIdRange,
                isValid: function () {
                    return true;
                },
                onConfirm: function () {

                },
                isInint: function () { return sync.toUserInit; },
                loadDataFunc: sync.loadSyncStore
            });
        }
        sync.loadSyncStore();
    },

    confirmDelProductToStores: function (stores, barcode) {
        var _this = this;
        new pospal.ui.msgBox({
            boxType: "confirm",
            content: lang.tryGet("确认同步商品"),
            confirmText: lang.tryGet("是"),
            cancelText: lang.tryGet("否"),
            onConfirm: function () {
                if (this.confirmValue) {
                    _this.bulidStoreList(stores, "del");
                    _this.show(false);
                    _this.barcode = barcode;
                }
                else if (fromActionPage) {
                    actionPage.clearFormParams();
                }
            }
        });
    },

    syncDelProductToStores: function () {
        var data = {
        };
        data.barcode = this.barcode;

        this.ajaxSyncToStores("/Product/DeleteStoreProduct", data, false);
    },

    confirmAddProductToStores: function (stores, product, fromUserId) {
        var _this = this;
        new pospal.ui.msgBox({
            boxType: "confirm",
            content: lang.tryGet("确认同步商品"),
            confirmText: lang.tryGet("是"),
            cancelText: lang.tryGet("否"),
            onConfirm: function () {
                if (this.confirmValue) {
                    _this.bulidStoreList(stores, "add");
                    _this.show(false);
                    _this.product = product;
                    _this.fromUserId = fromUserId;
                }
                else if (fromActionPage) {
                    actionPage.clearFormParams();
                }
            }
        });
    },

    syncAddProductToStores: function () {
        var data = {
        };
        data.productJson = JSON.stringify(this.product);
        data.fromUserId = this.fromUserId;

        this.ajaxSyncToStores("/Product/CopyNewProductToStores", data, true);
    },

    confirmAddProductsToStores: function (stores, products, fromUserId, caseproducts, specProductOrders) {
        var _this = this;
        new pospal.ui.msgBox({
            boxType: "confirm",
            content: lang.tryGet("确认同步商品"),
            confirmText: lang.tryGet("是"),
            cancelText: lang.tryGet("否"),
            onConfirm: function () {
                if (this.confirmValue) {
                    _this.bulidStoreList(stores, "add_mul");
                    _this.show(false);
                    _this.products = products;
                    _this.fromUserId = fromUserId;
                    _this.caseproducts = caseproducts;
                    _this.specProductOrders = specProductOrders;
                }
            }
        });
    },

    syncAddProductsToStores: function () {
        var data = {
        };
        data.productsJson = JSON.stringify(this.products);
        data.fromUserId = this.fromUserId;
        data.caseproductsJson = this.caseproducts != null ? JSON.stringify(this.caseproducts) : "";
        data.specProductOrders = this.specProductOrders != null ? JSON.stringify(this.specProductOrders) : "";
        this.ajaxSyncToStores("/Product/CopyNewProductsToStores", data, true);
    },

    confirmAddMoreSpecProductsToStores: function (stores, products, fromUserId, caseproducts) {
        var _this = this;
        new pospal.ui.msgBox({
            boxType: "confirm",
            content: lang.tryGet("确认同步商品"),
            confirmText: lang.tryGet("是"),
            cancelText: lang.tryGet("否"),
            onConfirm: function () {
                if (this.confirmValue) {
                    _this.bulidStoreList(stores, "add_morespec");
                    _this.show(false);
                    _this.products = products;
                    _this.fromUserId = fromUserId;
                    _this.caseproducts = caseproducts;
                } else if (fromActionPage) {
                    actionPage.clearFormParams();
                }
            }
        });
    },

    syncAddMoreSpecProductsToStores: function () {
        var data = {
        };
        data.productsJson = JSON.stringify(this.products);
        data.fromUserId = this.fromUserId;
        data.caseproductsJson = this.caseproducts != null ? JSON.stringify(this.caseproducts) : "";

        this.ajaxSyncToStores("/Product/CopyNewMoreSpecProductsToStores", data, true);
    },

    confirmUpdateProductsToStores: function (stores, products, fromUserId, caseproducts, specProductOrders) {
        var _this = this;
        new pospal.ui.msgBox({
            boxType: "confirm",
            content: lang.tryGet("确认同步商品"),
            confirmText: lang.tryGet("是"),
            cancelText: lang.tryGet("否"),
            onConfirm: function () {
                if (this.confirmValue) {
                    _this.bulidStoreList(stores, "update_mul");
                    _this.show(true);
                    _this.products = products;
                    _this.fromUserId = fromUserId;
                    _this.caseproducts = caseproducts;
                    _this.specProductOrders = specProductOrders;
                }
            }
        });
    },

    syncUpdateProductsToStores: function () {
        var data = {
        };
        data.productsJson = JSON.stringify(this.products);
        data.fromUserId = this.fromUserId;

        var attributeList = [];
        $("#syncDiv .attributeCheckBoxList div.checkBoxDiv.on").each(function (index, item) {
            attributeList.push($(item).find("div").attr("data"));
        });

        if (attributeList.length == 0) {
            new pospal.ui.msgBox(lang.tryGet("同步字段必选"));
            return false;
        }

        attributeList.push("attribute5");
        attributeList.push("attribute7");
        if (hasProductAttribute9) attributeList.push("attribute9");
        data.attributesJson = JSON.stringify(attributeList);
        data.caseproductsJson = this.caseproducts != null ? JSON.stringify(this.caseproducts) : "";
        data.specProductOrders = this.specProductOrders != null ? JSON.stringify(this.specProductOrders) : "";
        pospal.setCookie("syncUpdateProductAttributes", JSON.stringify(attributeList), 365 * 24);
        this.ajaxSyncToStores("/Product/SyncUpdateProductsToStores", data, true);
    },

    confirmUpdateMoreSpecProductsToStores: function (stores, products, fromUserId, caseproducts, deleteProductBarcodes) {
        var _this = this;
        new pospal.ui.msgBox({
            boxType: "confirm",
            content: lang.tryGet("确认同步商品"),
            confirmText: lang.tryGet("是"),
            cancelText: lang.tryGet("否"),
            onConfirm: function () {
                if (this.confirmValue) {
                    _this.bulidStoreList(stores, "update_morespec");
                    _this.show(true);
                    _this.products = products;
                    _this.fromUserId = fromUserId;
                    _this.caseproducts = caseproducts;
                    _this.deleteProductBarcodes = deleteProductBarcodes;
                } else if (fromActionPage) {
                    actionPage.clearFormParams();
                }
            }
        });
    },

    syncUpdateMoreSpecProductsToStores: function () {
        var data = {
        };
        data.productsJson = JSON.stringify(this.products);
        data.fromUserId = this.fromUserId;

        var attributeList = [];
        $("#syncDiv .attributeCheckBoxList div.checkBoxDiv.on").each(function (index, item) {
            attributeList.push($(item).find("div").attr("data"));
        });

        if (attributeList.length == 0) {
            new pospal.ui.msgBox(lang.tryGet("同步字段必选"));
            return false;
        }

        attributeList.push("attribute5");
        attributeList.push("attribute7");
        if (hasProductAttribute9) attributeList.push("attribute9");
        data.attributesJson = JSON.stringify(attributeList);
        data.caseproductsJson = this.caseproducts != null ? JSON.stringify(this.caseproducts) : "";
        data.deleteProductBarcodesJson = this.deleteProductBarcodes != null ? JSON.stringify(this.deleteProductBarcodes) : "";

        pospal.setCookie("syncUpdateProductAttributes", JSON.stringify(attributeList), 365 * 24);
        this.ajaxSyncToStores("/Product/SyncUpdateMoreSpecProductsToStores", data, true);
    },

    confirmUpdateProductToStores: function (stores, product, fromUserId) {
        var _this = this;
        new pospal.ui.msgBox({
            boxType: "confirm",
            content: lang.tryGet("确认同步商品"),
            confirmText: lang.tryGet("是"),
            cancelText: lang.tryGet("否"),
            onConfirm: function () {
                if (this.confirmValue) {
                    _this.bulidStoreList(stores, "update");
                    _this.show(true);
                    _this.product = product;
                    _this.fromUserId = fromUserId;
                }
                else if (fromActionPage) {
                    actionPage.clearFormParams();
                }
            }
        });
    },

    syncUpdateProductToStores: function () {
        var data = {
        };
        data.productJson = JSON.stringify(this.product);
        data.fromUserId = this.fromUserId;

        var attributeList = [];
        $("#syncDiv .attributeCheckBoxList div.checkBoxDiv.on").each(function (index, item) {
            attributeList.push($(item).find("div").attr("data"));
        });

        if (attributeList.length == 0) {
            new pospal.ui.msgBox(lang.tryGet("同步字段必选"));
            return false;
        }

        attributeList.push("attribute5");
        attributeList.push("attribute7");
        if (hasProductAttribute9) attributeList.push("attribute9");
        if (actionParams && actionParams.product && actionParams.product.barcode.toLowerCase() == this.product.barcode.toLowerCase()) attributeList.push("extAttribute");
        data.attributesJson = JSON.stringify(attributeList);

        pospal.setCookie("syncUpdateProductAttributes", JSON.stringify(attributeList), 365 * 24);
        this.ajaxSyncToStores("/Product/SyncUpdateProductToStores", data, true);
    },

    ajaxSyncToStores: function (url, data, useJob) {
        var toStoreIds = this.getSelectedStoreIds();
        if (toStoreIds.length == 0) {
            new pospal.ui.msgBox(lang.tryGet("同步门店必选"));
            return false;
        }

        var _this = this;
        _this.SyncedNum = 0;
        var syncLimit = $("#hf_userJobToSyncProductLimit").val();
        if (useJob && hasUserJobServiceAuth && toStoreIds.length >= syncLimit) {
            var postData = {};
            postData.action = url.substring(url.lastIndexOf("\/") + 1, url.length);
            postData.toUserIds = toStoreIds;
            $.extend(postData, data);

            _this.saveUserJob(postData);
            return;
        }

        var limit = _this.getLimit(toStoreIds);
        var batch = pospal.find(_this.batchUrl, function (it) {
            return it.url == url
        })
        if (limit > 1 && batch) {
            _this.ajaxSyncToStoresV2(batch.batchUrl, data, limit);
            return;
        }

        var failedNum = 0;
        function ajaxPost(toStoreId) {
            data.userId = toStoreId;
            var $li = $("#syncDiv .copyStore ul div[data=" + toStoreId + "]").parent().parent().parent();
            if (_this.toStoreSelector) _this.toStoreSelector.setSyncInfo(toStoreId, lang.tryGet("进行中"), '');
            $("#syncDiv .mCustomScrollbar").mCustomScrollbar('scrollTo', $li, {
                scrollInertia: 600
            });
            return pospal.ajax({
                url: url,
                data: data,
                success: function (result) {
                    _this.SyncedNum++;
                    if (result.successed) {
                        if (_this.toStoreSelector) _this.toStoreSelector.setSyncInfo(toStoreId, lang.tryGet("已完成"), '');
                    } else {
                        failedNum++;
                        if (_this.toStoreSelector) _this.toStoreSelector.setSyncInfo(toStoreId, lang.tryGet("复制失败"), result.msg.replace("\\n", "\n"));
                    }
                    _this.buildProcessUI();
                }
            });
        }

        var doing = new pospal.ui.loading($("#syncDiv"), true);
        pospal.concurrentAjax(toStoreIds, ajaxPost, limit).then(function () {
            doing.destroy();
            if (failedNum > 0) {
                new pospal.ui.msgBox({
                    content: lang.tryFormat("共X门店同步商品失败", [failedNum]) + "，请确认。",
                    autoCloseSec: 0
                });
                $("#syncDiv .confirm").hide();
                return false;
            }

            _this.hide();
            if (fromActionPage) {
                new pospal.ui.msgBox({
                    content: lang.tryGet("同步完成"), autoCloseSec: 0, onClose: function () {
                        actionPage.clearFormParams();
                    }
                });
            }
            else {
                new pospal.ui.msgBox({ content: lang.tryGet("同步完成"), autoCloseSec: 0 });
            }
        });
    },

    batchUrl: [
        {
            url: "/Product/CopyNewProductToStores", batchUrl: "/Product/BatchCopyNewProductToStores"
        },
        {
            url: "/Product/SyncUpdateProductToStores", batchUrl: "/Product/BatchSyncUpdateProductToStores"
        },
        {
            url: "/Product/DeleteStoreProduct", batchUrl: "/Product/BatchDeleteStoreProduct"
        },
        {
            url: "/Product/CopyNewProductsToStores", batchUrl: "/Product/BatchCopyNewProductsToStores"
        },
        {
            url: "/Product/SyncUpdateProductsToStores", batchUrl: "/Product/BatchSyncUpdateProductsToStores"
        }
    ],

    ajaxSyncToStoresV2: function (url, data, limit) {
        var that = this;
        that.SyncedNum = 0;
        var toStoreIds = this.getSelectedStoreIds();

        var toStoreIdGroups = [];
        pospal.forEachInBatches(toStoreIds, function (tmp) {
            toStoreIdGroups.push(tmp);
        }, limit);

        var okNum = 0;
        var doing = new pospal.ui.loading($("#syncDiv"), true);
        pospal.concurrentAjax(toStoreIdGroups, function ajaxPost(gUserIds) {
            data.userIds = gUserIds;
            var $lis = $("#syncDiv .copyStore ul li").filter(function () {
                var liStoreId = $(this).find("div[data]").attr("data");
                return !!pospal.find(gUserIds, function (it) {
                    return it == liStoreId
                })
            });

            $lis.find("em.info").html(lang.tryGet("进行中"));
            $("#syncDiv .mCustomScrollbar").mCustomScrollbar('scrollTo', $lis.eq(0), {
                scrollInertia: 600
            });
            return pospal.ajax({
                url: url,
                data: data,
                success: function (result) {
                    that.SyncedNum++;
                    if (result.successed) {
                        $.each(result.results, function (i, item) {
                            var $li = $("#syncDiv ul div[data=" + item.userId + "]").parent().parent().parent();
                            var innerResult = item.result.Data;
                            if (innerResult.successed) {
                                $li.find("em.info").html(lang.tryGet("已完成"));
                                okNum++;
                            } else {
                                $li.find("em.info").html("同步失败");
                                $li.addClass("error").data("error", innerResult.msg.replace("\\n", "\n"));
                            }
                        });
                    } else {
                        $lis.find("em.info").html("同步失败");
                        $lis.addClass("error").data("error", result.msg.replace("\\n", "\n"));
                    }
                    that.buildProcessUI();
                }
            });
        }, 1).then(function () {
            doing.destroy();
            var failedNum = toStoreIds.length - okNum;
            if (failedNum == 0) {
                new pospal.ui.msgBox({ content: lang.tryGet("同步完成"), autoCloseSec: 0 });
                that.hide();
            } else {
                new pospal.ui.msgBox({ content: "同步失败", autoCloseSec: 0 });
            }
        });
    },

    getLimit: function (toStoreIds) {
        if (toStoreIds.length > 3000) return 20;
        return 1;
    },

    getSelectedStoreIds: function () {
        var selectedStoreIds = [];
        if (this.toStoreSelector) selectedStoreIds = this.toStoreSelector.getSelectedUserIds(true);
        var excludeStoreId = userSelector.getSelectedValue();
        var index = pospal.findIndex(selectedStoreIds, function (n) { return n == excludeStoreId; });
        if (index > -1) selectedStoreIds.splice(index, 1);
        return selectedStoreIds;
    },

    buildProcessUI: function () {
        var allStoreNum = this.getSelectedStoreIds().length;
        var currentIndex = this.SyncedNum;

        var percent = currentIndex == 0 ? "0" : Math.ceil(currentIndex * 100 / allStoreNum).toString();

        $("#syncDiv .processDiv").html('进度：{0}/{1} = {2}%'.WrapPts().format(currentIndex, allStoreNum, percent));
    },

    saveUserJob: function (postData) {
        var _this = this;
        var loading = new pospal.ui.loading($("#syncDiv"), true);
        pospal.ajax({
            url: "/Product/SaveUserJobCondition",
            data: postData,
            success: function (result) {
                if (result.successed) {
                    _this.hide();
                    userJobApp.showGuideMsgBox("已提交任务同步商品到选中门店，请等待系统处理。");
                } else {
                    new pospal.ui.msgBox(result.message || result.msg);
                }
            },
            complete: function () {
                loading.destroy();
            }
        });
    },

    filtStores: function () {
        var keyword = $("#syncDiv .storeKeyword").val().trim().toLowerCase();
        if (keyword == this.defaultKeyword) keyword == "";

        var filtedStores = this.stores;
        if (keyword.length > 0) {
            filtedStores = $.grep(this.stores, function (item, index) {
                return item.text.toLowerCase().indexOf(keyword) > -1
            });
        }
        this.bulidStoreList(filtedStores, this.action, true);
    },

    loadSyncStore: function () {
        var _this = this;
        if (_this.allSyncStores) {
            _this.updateSyncStoreSelector();
        }
        else {
            $(".loading").hide();
            var doing = new pospal.ui.loading($("#syncDiv"));
            pospal.ajax({
                url: "/Account/LoadSubStoresByUserIdDDLJson",
                data: { userId: currentUserId, withSelf: true, withParent: true, withCreatedDatetime: pospal.getStoreCount(storeOptions) > 2000, simple: true },
                success: function (result) {
                    if (result.successed) {
                        _this.allSyncStores = result.stores;
                        _this.updateSyncStoreSelector();
                    }
                },
                complete: function () {
                    doing.destroy();
                    sync.toUserInit = true;
                }
            });
        }
    },

    updateSyncStoreSelector: function () {
        var _this = this;
        if (_this.toStoreSelector) {
            if (_this.toStoreSelector) _this.toStoreSelector.destroyItem();
        }
        var $checkAllSyncDiv = $("<div/>").appendTo($("#syncDiv .checkAllSyncDiv").empty());
        var $checkAll = new pospal.ui.checkBox({
            container: $checkAllSyncDiv,
            text: lang.tryGet("全选"),
            clickCallBack: function () {
                _this.toStoreSelector.checkAllClickCallBack();
            }
        });
        $checkAllSyncDiv.addClass("checkBoxDivN");
        this.$checkAll = $checkAll;

        _this.toStoreSelector = new pospal.storeSelectorV2({
            title: "",
            operTip: '',
            mainUI: $("#syncDiv"),
            mainArea: $("#syncDiv .mainArea.copyStore"),
            bottomUI: $("#syncDiv .popupBottom"),
            cb_checkAll: _this.$checkAll,
            selectedNumId: "syncToSeltStoreNum",
            allStoreNumId: "syncToStoreNum",
            withCreatedDatetime: pospal.getStoreCount(storeOptions, 'subUsers') > 2000,
            options: $.extend(true, [], _this.allSyncStores),
            excludeStoreIds: [],
            showImport: true,
            storeIdRange: _this.storeIdRange,
            isValid: function () {
                return true;
            },
            onConfirm: function () {

            },
            isInint: function () { return sync.toUserInit; },
            loadDataFunc: sync.loadSyncStore
        });
    }
};

customAttribute = {
    init: function () {
        var _this = this;
        $("#editArea .item label.custom").bind("click", function () {
            _this.show();
        });

        $("#editCustomAttrDiv .popupClose").bind("click", function () {
            _this.hide();
        });

        $("#btnSaveCustomAttr").bind("click", function () {
            _this.save();
        });
    },

    show: function () {
        $("#editCustomAttrDiv,#popupBg").show();
    },

    hide: function () {
        $("#editCustomAttrDiv,#popupBg").hide();
    },

    checkData: function (data) {
        if (data.attribute1.length == 0 || data.attribute2.length == 0 || data.attribute3.length == 0 || data.attribute4.length == 0) {
            new pospal.ui.msgBox(lang.tryGet("请填写自定义名称"));
            return false;
        }

        var systemKeepWords = "名称,分类,条码,主单位,库存量,进货价,销售价,批发价,会员价,会员折扣,库存上限,库存下限,供货商,生产日期,保质期,拼音码,商品状态,商品,描述,积分商品";
        if (industryNumber == "103" || industryNumber == "101" || pospal.contains([105, 106, 112], industryNumber) || industryNumber == "108" || industryNumber == "104" || industryNumber == "110" || industryNumber == "116") systemKeepWords += ",货号";
        var arr = systemKeepWords.split(",");

        if (pospal.isInArray(arr, data.attribute1)) {
            new pospal.ui.msgBox(lang.format("系统保留属性", [data.attribute1]));
            return false;
        }

        if (pospal.isInArray(arr, data.attribute2)) {
            new pospal.ui.msgBox(lang.format("系统保留属性", [data.attribute2]));
            return false;
        }

        if (pospal.isInArray(arr, data.attribute3)) {
            new pospal.ui.msgBox(lang.format("系统保留属性", [data.attribute3]));
            return false;
        }

        if (pospal.isInArray(arr, data.attribute4)) {
            new pospal.ui.msgBox(lang.format("系统保留属性", [data.attribute4]));
            return false;
        }

        var isValid = true;
        var str = data.attribute1 + "," + data.attribute2 + "," + data.attribute3 + "," + data.attribute4;
        arr = str.split(",");
        for (var i = 0; i < arr.length; i++) {
            var item = arr[i];
            var cItemI = pospal.findIndex(arr, function (it, ii) {
                return it == item && ii != i
            });
            if (cItemI > -1 && item != "自定义4") {
                new pospal.ui.msgBox(lang.format("自定义属性重复", [item]));
                isValid = false;
                break;
            }
        }

        return isValid;
    },

    save: function () {
        var _this = this;

        var data = {
        };
        data.attribute1 = $("#customAttr1").val().trim();
        data.attribute2 = $("#customAttr2").val().trim();
        data.attribute3 = $("#customAttr3").val().trim();
        data.attribute4 = $("#customAttr4").val().trim();

        if (this.checkData(data)) {
            var doing = new pospal.ui.loading($("#editCustomAttrDiv"));
            pospal.ajax({
                url: "/Product/SaveCustomAttribute",
                data: {
                    "customJson": JSON.stringify(data)
                },
                success: function (result) {
                    if (result.successed) {
                        new pospal.ui.msgBox(lang.tryGet("自定义属性保存成功"));
                        _this.refreshCustom(data);
                    }
                    else {
                        new pospal.ui.msgBox({ content: result.msg, autoCloseSec: 0 });
                    }
                },
                complete: function () {
                    doing.destroy();
                }
            });
        }
    },

    refreshCustom: function (data) {
        $("#edit_attribute1").parent().find("label.custom").html(data.attribute1 + ":");
        $("#edit_attribute2").parent().find("label.custom").html(data.attribute2 + ":");
        $("#edit_attribute3").parent().find("label.custom").html(data.attribute3 + ":");
        $("#edit_attribute4").parent().find("label.custom").html(data.attribute4 + ":");
    }
};

var productTagApp = {
    container: null,
    ctrls: {
        GroupSelect: null
    },

    init: function () {
        var _this = this;
        this.treeTool = pospal.tool.getTreeTool("tags");

        this.container = $("#editTagDiv");

        this.ctrls.GroupSelect = new pospal.ui.singleSelector({
            container: $('#GroupSelect'),
            textWidth: 130,
            selectBoxWidth: 135,
            options: [{
                text: '', value: ''
            }]
        });

        this.container.find(".popupClose").bind("click", function () {
            _this.hide();
        });

        this.container.on("click", ".btnEditTagGroup", function () {
            $(this).parent().hide();
            $(this).parent().next('div').show().find("input").select();
        });
        this.container.on("click", ".btnDelTagGroup", function () {
            _this.delTagGroup(this);
        });
        this.container.on("click", ".btnSaveTagGroup", function () {
            _this.saveTagGroup(this);
        });
        this.container.find(".btnAddview").click(function () { _this.container.find(".addview").show().find('input').select(); });
        this.container.on("click", ".btnAddTagGroup", function () {
            _this.addTagGroup(this);
        });

        this.container.on("click", ".btnCopyTag", function () {
            var id = $(this).parent().attr('data-tagid');
            var tag, tagG;
            _this.treeTool.forEachNodes(_this.viewList, function (node, pNode) {
                if (pNode && node.id == id) {
                    tag = $.extend({}, node);
                    tagG = $.extend({}, pNode);
                    delete tagG.tags;
                }
            });
            var data = {
                tag: tag,
                tagG: tagG,
                fromUserId: userSelector.getSelectedValue()
            };

            if (_this.assignStoreSelector) {
                _this.assignStoreSelector.destroy();
                _this.assignStoreSelector = null;
            }
            var userOptions = [];
            ddlTool.forEachNodes(storeOptions, function (node) {
                if (node.value != data.fromUserId) {
                    userOptions.push({ id: node.value, company: node.text });
                }
            });
            _this.assignStoreSelector = new pospal.storeSelectorV2({
                options: userOptions,
                onConfirm: function () {
                    data.toUserIds = _this.assignStoreSelector.getSelectedUserIds()
                    _this.copyTag(data);
                }
            });
            _this.assignStoreSelector.show();
        });
        this.container.on("click", ".btnEditTag", function () {
            $(this).parent().hide();
            $(this).parent().next('li').show().find("input").select();
        });
        this.container.on("click", ".btnDelTag", function () {
            _this.delTag(this);
        });
        this.container.on("click", ".btnSaveTag", function () {
            _this.saveTag(this);
        });
        this.container.on("click", ".btnAddTag", function () {
            _this.addTag(this);
        });

        this.container.on("click", ".ctrl_radio_item", function () {
            $(this).siblings().removeClass("active");
            $(this).addClass("active");
        });

    },

    show: function () { $("#popupBg").show(); this.render(); this.container.show(); },

    hide: function () { $("#popupBg").hide(); this.container.hide(); },

    render: function () {
        for (var i = 0; i < taggroupsWithtags.length; i++) {
            if (taggroupsWithtags[i].tags.length == 0) {
                taggroupsWithtags[i].blankArr = [];
                continue;
            }
            var r = taggroupsWithtags[i].tags.length % 3;
            if (r > 0) {
                taggroupsWithtags[i].blankArr = new Array(3 - r);
            } else {
                taggroupsWithtags[i].blankArr = [];
            }
        }
        this.viewList = taggroupsWithtags;
        var html = template('TagGroupTemplate', {
            taggroupsWithtags: taggroupsWithtags
        });
        this.container.find(".groupcontainer").html(html);
    },

    delTagGroup: function (el) {
        var _this = this;
        var id = $(el).attr('data-groupid');

        new pospal.ui.msgBox({
            boxType: "confirm",
            content: "确认删除标签分组，分组下的标签会一起删除",
            onConfirm: function () {
                if (this.confirmValue) {
                    var doing = new pospal.ui.loading(_this.container);
                    pospal.ajax({
                        url: "/Product/DelProductTagGroup",
                        data: {
                            "groupId": id
                        },
                        success: function (result) {
                            if (result.successed) {
                                for (var w = 0; w < taggroupsWithtags.length; w++) {
                                    if (taggroupsWithtags[w].id == id) {
                                        taggroupsWithtags.splice(w, 1);
                                        _this.render();
                                        _this.onChangedProductTagGroup();
                                        onChangedProductTag();
                                        break;
                                    }
                                }
                                var toSyncUserIds = result.toSyncUserIds;
                                var tagGroupName = result.tagGroupName;
                                if (toSyncUserIds && toSyncUserIds.length > 0) {
                                    new pospal.ui.msgBox({
                                        boxType: "confirm",
                                        content: "是否同步删除下属子门店的同名标签组",
                                        confirmText: "是",
                                        cancelText: "否",
                                        onConfirm: function () {
                                            if (this.confirmValue) {
                                                _this.showToSyncStore(toSyncUserIds, "删除同步到").then(function (valList) {
                                                    var doing = new pospal.ui.loading(_this.container);
                                                    pospal.ajax({
                                                        url: "/Product/DelProductTagGroupByName",
                                                        data: {
                                                            "toUserIds": valList,
                                                            tagGroupName: tagGroupName,
                                                        },
                                                        success: function (result) {
                                                            if (result.successed) {
                                                                new pospal.ui.msgBox("删除成功")
                                                            }
                                                        },
                                                        complete: function () { doing.destroy(); }
                                                    });
                                                });
                                            }
                                        }
                                    });

                                }
                            }
                        },
                        complete: function () { doing.destroy(); }
                    });
                }
            }
        });
    },
    saveTagGroup: function (el) {
        var _this = this;
        var groupType = $(el).parent().find(".ctrl_radio_item.active").attr("data-value");
        var $name = $(el).parent().find("input")
        var id = $(el).attr('data-groupid');

        var name = $name.val().trim();
        if (name == "") {
            new pospal.ui.msgBox("请输入标签分组名称");
            $name.select();
            return false;
        }

        var arr = $.grep(taggroupsWithtags, function (tag, i) {
            return tag.name == name && tag.id != id;
        });
        if (arr.length > 0) {
            new pospal.ui.msgBox("修改标签分组名称'" + name + "'已存在");
            $name.select();
            return false;
        }

        var doing = new pospal.ui.loading(_this.container);
        pospal.ajax({
            url: "/Product/UpdateProductTagGroup",
            data: {
                "groupId": id, "groupName": name, groupType: groupType
            },
            success: function (result) {
                if (result.successed) {
                    for (var w = 0; w < taggroupsWithtags.length; w++) {
                        if (taggroupsWithtags[w].id == id) {
                            taggroupsWithtags[w].name = name;
                            taggroupsWithtags[w].groupType = groupType;
                            _this.render();
                            _this.onChangedProductTagGroup();
                            break;
                        }
                    }
                } else {
                    new pospal.ui.msgBox(result.msg);
                }
            },
            complete: function () { doing.destroy(); }
        });
    },
    addTagGroup: function (el) {
        var _this = this;
        var groupType = _this.container.find(".addview .ctrl_radio_item.active").attr("data-value");
        var $name = _this.container.find(".addview input");

        var name = $name.val().trim();
        if (name == "" || name == "输入新标签分组名称") {
            new pospal.ui.msgBox("输入新标签分组名称");
            $name.select();
            return false;
        }

        var arr = $.grep(taggroupsWithtags, function (tag, i) {
            return tag.name == name;
        });

        if (arr.length > 0) {
            new pospal.ui.msgBox("新标签分组已存在");
            $name.select();
            return false;
        }

        var doing = new pospal.ui.loading(_this.container);
        pospal.ajax({
            url: "/Product/AddProductTagGroup",
            data: {
                "userId": userSelector.getSelectedValue(), "groupName": name, groupType: groupType
            },
            success: function (result) {
                if (result.successed) {
                    result.newGroup.tags = [];
                    taggroupsWithtags.push(result.newGroup);
                    _this.container.find(".addview .ctrl_radio_item.active").removeClass("active");
                    _this.container.find(".addview .ctrl_radio_item[data-value=0]").addClass("active");
                    $name.val('');
                    _this.container.find(".addview").hide();
                    _this.render();
                    _this.onChangedProductTagGroup();
                } else {
                    new pospal.ui.msgBox(result.msg);
                }
            },
            complete: function () { doing.destroy(); }
        });
    },
    delTag: function (el) {
        var _this = this;
        var id = $(el).attr('data-tagid');

        new pospal.ui.msgBox({
            boxType: "confirm",
            content: lang.tryGet("确认删除标签"),
            onConfirm: function () {
                if (this.confirmValue) {
                    var doing = new pospal.ui.loading(_this.container);
                    pospal.ajax({
                        url: "/Product/DelProductTag",
                        data: {
                            "tagId": id
                        },
                        success: function (result) {
                            if (result.successed) {
                                for (var w = 0; w < taggroupsWithtags.length; w++) {
                                    var tags = taggroupsWithtags[w].tags;
                                    var l = tags.length;
                                    for (var i = 0; i < tags.length; i++) {
                                        var tag = tags[i];
                                        if (tag.id == id) {
                                            tags.splice(i, 1);
                                            break;
                                        }
                                    }
                                    if (l != tags.length) {
                                        onChangedProductTag();
                                        _this.render();
                                        break;
                                    }
                                }
                                var toSyncUserIds = result.toSyncUserIds;
                                var tagName = result.tagName;
                                if (toSyncUserIds && toSyncUserIds.length > 0) {
                                    new pospal.ui.msgBox({
                                        boxType: "confirm",
                                        content: "是否同步删除下属子门店的同名标签",
                                        confirmText: "是",
                                        cancelText: "否",
                                        onConfirm: function () {
                                            if (this.confirmValue) {
                                                _this.showToSyncStore(toSyncUserIds, "删除同步到").then(function (valList) {
                                                    var doing = new pospal.ui.loading(_this.container);
                                                    pospal.ajax({
                                                        url: "/Product/DelProductTagByName",
                                                        data: {
                                                            "toUserIds": valList,
                                                            tagName: tagName,
                                                        },
                                                        success: function (result) {
                                                            if (result.successed) {
                                                                new pospal.ui.msgBox("删除成功")
                                                            }
                                                        },
                                                        complete: function () { doing.destroy(); }
                                                    });
                                                });
                                            }
                                        }
                                    });

                                }
                            }
                        },
                        complete: function () { doing.destroy(); }
                    });
                }
            }
        });
    },
    showToSyncStore: function (toSyncUserIds, title) {
        var dtd = $.Deferred();
        var userOptions = $.extend(true, [], storeOptions);
        ddlTool.forEachNodes(userOptions, function (node) {
            node.id = node.value;
            node.company = node.text;
            node.subUsers = node.subOptions;
            delete node.value;
            delete node.text;
        });
        ddlTool.removeAll(userOptions, function (node) { return !pospal.tool.contains(toSyncUserIds, node.id); });

        var ctrl = new pospal.storeSelectorV2({
            title: title,
            options: userOptions,
            onConfirm: function () {
                var valList = ctrl.getSelectedUserIds()
                dtd.resolve(valList);
            }
        });
        ctrl.show();
        return dtd;
    },
    saveTag: function (el) {
        var _this = this;
        var $name = $(el).parent().find("input");
        var id = $(el).attr('data-tagid');

        var tagName = $name.val().trim();
        if (tagName == "") {
            new pospal.ui.msgBox(lang.tryGet("请输入标签"));
            $name.select();
            return false;
        }

        var tags = getProductTags();
        var arr = $.grep(tags, function (tag, i) {
            return tag.name == tagName && tag.id != id;
        });
        if (arr.length > 0) {
            new pospal.ui.msgBox(lang.format("修改标签已存在", [tagName]));
            $name.select();
            return false;
        }

        var doing = new pospal.ui.loading(_this.container);
        pospal.ajax({
            url: "/Product/UpdateProductTag",
            data: {
                "tagId": id, "tagName": tagName
            },
            success: function (result) {
                if (result.successed) {
                    for (var w = 0; w < taggroupsWithtags.length; w++) {
                        var tags = taggroupsWithtags[w].tags;
                        for (var i = 0; i < tags.length; i++) {
                            var tag = tags[i];
                            if (tag.id == id) {
                                tag.name = tagName;
                                _this.render();
                                onChangedProductTag();
                                break;
                            }
                        }
                    }
                }
            },
            complete: function () { doing.destroy(); }
        });
    },

    addTag: function (el) {
        var _this = this;

        var groupUid = this.ctrls.GroupSelect.getSelectedValue();



        var $name = _this.container.find("input.newTagName");
        var tagName = $name.val().trim();
        if (tagName == "" || tagName == $name.attr('original-value')) {
            new pospal.ui.msgBox(lang.tryGet("输入新标签"));
            $name.select();
            return false;
        }

        var productTags = getProductTags();
        var arr = $.grep(productTags, function (tag, i) {
            return tag.name == tagName;
        });

        if (arr.length > 0) {
            new pospal.ui.msgBox(lang.tryGet("新标签已存在"));
            $name.select();
            return false;
        }

        var doing = new pospal.ui.loading(_this.container);
        pospal.ajax({
            url: "/Product/AddProductTag",
            data: {
                "userId": userSelector.getSelectedValue(), "tagName": tagName, groupUid: groupUid
            },
            success: function (result) {
                if (result.successed) {
                    for (var w = 0; w < taggroupsWithtags.length; w++) {
                        if (taggroupsWithtags[w].uid == groupUid) {
                            taggroupsWithtags[w].tags.push(result.productTag);
                            _this.render();
                            $name.val("").focus();
                            onChangedProductTag();
                            break;
                        }
                    }

                } else {
                    new pospal.ui.msgBox(result.msg);
                }
            },
            complete: function () { doing.destroy(); }
        });
    },
    copyTag: function (data) {
        var _this = this;

        if (data.toUserIds.length == 0) {
            new pospal.ui.msgBox("复制 0 家门店的数据");
            return;
        }

        var doing = new pospal.ui.loading(_this.container);
        pospal.ajax({
            url: "/Product/CopyProductTag",
            data: {
                fromUserId: data.fromUserId,
                toUserIds: data.toUserIds,
                tagName: data.tag.name,
                tagGroupName: data.tagG.name
            },
            success: function (result) {
                if (result.successed) {
                    new pospal.ui.msgBox("同步成功");

                } else {
                    new pospal.ui.msgBox(result.msg);
                }
            },
            complete: function () { doing.destroy(); }
        });
    },
    onChangedProductTagGroup: function () {
        var tagOptions = [];

        for (var i = 0; i < taggroupsWithtags.length; i++) {
            var item = taggroupsWithtags[i];
            tagOptions.push({
                text: item.name, value: item.uid
            });
        }
        this.ctrls.GroupSelect.update(tagOptions)

    }
};

var categoryManage = {
    container: null,
    newCategoryUid: null,

    init: function () {
        var _this = this;

        this.container = $("#editCategoryDiv");

        this.container.find(".popupClose").bind("click", function () {
            _this.hide();
        });
        this.container.find(".btnAddCategory").bind("click", function () {
            var uid = _this.newCategoryUid;
            _this.addCategory(uid);
        });
    },

    show: function () {
        var _this = this;
        pospal.ajax({
            url: "/Category/CreateCategoryUid",
            data: {
            },
            success: function (result) {
                if (result.successed) {
                    _this.newCategoryUid = result.uid;
                    $("#txt_categoryName").val('');
                    $("#popupBg").show();
                    _this.container.show();
                }
            },
            complete: function () { }
        });
    },

    hide: function () { $("#popupBg").hide(); this.container.hide(); },

    isValidCategoryName: function (uid) {
        var isValid = true;

        var input = $("#txt_categoryName");
        var newName = input.val().trim();
        if (newName.length == 0) {
            new pospal.ui.msgBox("分类名称不能为空");
            isValid = false;
        }
        var options = editProduct.edit_productCategorySelector.getSubOptionList();
        for (var i = 0; i < options.length; i++) {
            var category = options[i];
            if (category.value != uid && category.text == newName) {
                new pospal.ui.msgBox("分类名称已存在");
                isValid = false;
            }
        }

        if (!isValid) input.select();

        return isValid;
    },

    addCategory: function (uid) {
        if (this.isValidCategoryName(uid)) {
            var _this = this;
            var categoryName = $("#txt_categoryName").val().trim();
            var doing = new pospal.ui.loading($("#editCategoryDiv"));
            pospal.ajax({
                url: "/Category/AddNewCategory",
                data: {
                    "userId": userSelector.getSelectedValue(), "uid": uid, "parentCategoryName": "", "categoryName": categoryName, categoryType: 2, "getSyncStores": false
                },
                success: function (result) {
                    if (result.successed) {
                        _this.hide();
                        pospal.ajax({
                            url: "/Category/LoadCategoryDDLJson",
                            data: {
                                "userId": userSelector.getSelectedValue(),
                                "withMnemonicCode": true,
                                "withCashierCategoryDisable": true,
                                "withCategoryPrinter": hasCategoryPrinter,
                                "withCategoryDefaultSetting": hasCategoryDefaultSettingAuth,
                            },
                            success: function (result) {
                                if (result.successed) {
                                    categoryList = result.categorys;
                                    //更新分类
                                    var options = pospal.buildCategoryOptions(result.categorys);
                                    options.unshift({ text: lang.tryGet("全部分类"), value: "" });
                                    options.push({
                                        text: lang.tryGet("无", true), value: "0"
                                    });
                                    categorySelector.update(options);

                                    options = pospal.buildCategoryOptions(result.categorys);
                                    options.unshift({ text: lang.tryGet("请选择商品分类"), value: "" });
                                    var filterType = getFilterType();
                                    if (filterType == "" || filterType == "product") {
                                        options.push({ text: "无（网店不显示）", value: "0" });
                                    }
                                    editProduct.edit_productCategorySelector.update(options);
                                    editProduct.changeProductCategory();
                                    editProduct.chageCategoryBindPrinter();
                                    editProduct.changeCategoryDefaultSetting();
                                    if (!$("#edit_ddl_productCategory .selectBox").is(":visible")) {
                                        $("#edit_ddl_productCategory").trigger("click");
                                    }

                                    options = pospal.buildCategoryOptions(result.categorys);
                                    options.push({
                                        text: lang.tryGet("无", true), value: "0"
                                    });
                                    categorysAddvancedSelector.opts.options = options;
                                    categorysAddvancedSelector.buildUI();

                                    var disableCategoryUids = result.disableCategoryUids;
                                    categorysAddvancedSelector.opts.disabledOptionIds = disableCategoryUids;
                                }
                            },
                            complete: function () {

                            }
                        });

                    }
                },
                complete: function () {
                    doing.destroy();
                }
            });
        }
    }
};

var productBrand = {
    init: function () {
        var _this = this;
        $(".btnShowEditProductBrandDiv").bind("click", function () {
            _this.show();
        });

        $("#editBrandDiv .popupClose").bind("click", function () {
            _this.hide();
        });

        $("#editBrandDiv .btnAddBrand").bind("click", function () {
            _this.addBrand();
        });
    },

    show: function () {
        $("#popupBg,#editBrandDiv").show();
        //if (storeOptions.length == 1) {
        //    $("#btnBrandCopy").hide();
        //} else {
        //    $("#btnBrandCopy").show();
        //}
        this.buildBrandListUI();
    },

    hide: function () {
        $("#popupBg,#editBrandDiv").hide();
    },

    buildBrandListUI: function () {
        var _this = this;

        var $ul = $("#editBrandDiv .BrandDivUl").html("");
        for (var i = 0; i < productBrands.length; i++) {
            var Brand = productBrands[i];
            var $li = $("<li/>").appendTo($ul);
            _this.buildBrandLi(Brand, $li);
        }

        $("#editBrandDiv .BrandNum b").html(productBrands.length);

        _this.buildBlankLi();
    },

    buildBrandLi: function (Brand, e) {
        var _this = this;

        var $li = $(e).html("");
        $("<span/>").html(Brand.name).appendTo($li);
        $("<div/>").addClass("btnEditSmall").html("<b>" + lang.tryGet("编辑") + "</b>").appendTo($li);
        $("<div/>").addClass("btnDeleteSmall").html("<b>" + lang.tryGet("删除") + "</b>").appendTo($li);

        $li.find(".btnEditSmall").bind("click", function () {
            _this.showEdit($li);
        });

        $li.find(".btnDeleteSmall").bind("click", function () {
            _this.delBrand($li);
        });

        $li.data("id", Brand.id);
    },

    buildBlankLi: function () {
        var ul = $("#editBrandDiv .BrandDivUl");

        var blankLiNum = 0;
        if (productBrands.length < 12) {
            blankLiNum = 12 - productBrands.length;
        } else {
            if (productBrands.length % 2 > 0)
                blankLiNum = 2 - productBrands.length % 2;
        }

        if (blankLiNum > 0) {
            for (var i = 0; i < blankLiNum; i++) {
                $("<li/>").addClass("blank").appendTo(ul);
            }
        }
    },

    showEdit: function (e) {
        var _this = this;

        var li = $(e);
        var BrandName = li.find("span").html();
        li.html("");

        $("<input maxlength='30' autocomplete='off' />").addClass("quantity").val(BrandName).appendTo(li);
        $("<div />").addClass("btnSubmitSmall").html("<b>" + lang.tryGet("保存") + "</b>").appendTo(li);

        li.find(".btnSubmitSmall").bind("click", function () {
            _this.updateBrand($(this).parent());
        });

        li.find("input").select();
    },

    updateBrand: function (e) {
        var _this = this;
        var li = $(e);

        var id = li.data("id");
        var BrandName = li.find("input").val().trim();
        if (BrandName == "") {
            new pospal.ui.msgBox(lang.tryGet("请先输入品牌"));
            li.find("input").select();
            return false;
        }

        var arr = $.grep(productBrands, function (Brand, i) {
            return Brand.name == BrandName && Brand.id != id;
        });
        if (arr.length > 0) {
            new pospal.ui.msgBox(lang.format("修改品牌已存在", [BrandName]));
            li.find("input").select();
            return false;
        }

        var doing = new pospal.ui.loading($("#editBrandDiv"));
        pospal.ajax({
            url: "/ProductBrand/UpdateProductBrand",
            data: {
                "BrandId": id, "BrandName": BrandName
            },
            success: function (result) {
                if (result.successed) {
                    for (var i = 0; i < productBrands.length; i++) {
                        var productBrand = productBrands[i];
                        if (productBrand.id == id) {
                            productBrand.name = BrandName;
                            _this.buildBrandLi(productBrand, li);
                            break;
                        }
                    }
                    onChangedProductBrand();
                }
            },
            complete: function () { doing.destroy(); }
        });

    },

    delBrand: function (e) {
        var _this = this;
        var li = $(e);
        var id = li.data("id");

        new pospal.ui.msgBox({
            boxType: "confirm",
            content: lang.tryGet("确认删除品牌"),
            onConfirm: function () {
                if (this.confirmValue) {
                    var doing = new pospal.ui.loading($("#editBrandDiv"));
                    pospal.ajax({
                        url: "/ProductBrand/DelProductBrand",
                        data: {
                            "BrandId": id
                        },
                        success: function (result) {
                            if (result.successed) {
                                for (var i = 0; i < productBrands.length; i++) {
                                    var productBrand = productBrands[i];
                                    if (productBrand.id == id) {
                                        productBrands.splice(i, 1);
                                        _this.buildBrandListUI();
                                        break;
                                    }
                                }
                            }
                            onChangedProductBrand();
                        },
                        complete: function () { doing.destroy(); }
                    });
                }
            }
        });
    },

    addBrand: function () {
        var _this = this;

        var BrandName = $("#editBrandDiv input.newBrandName").val().trim();
        if (BrandName == "" || BrandName == lang.tryGet("输入新品牌名称")) {
            new pospal.ui.msgBox(lang.tryGet("输入新品牌名称"));
            $("#editBrandDiv input.newBrandName").select();
            return false;
        }

        var arr = $.grep(productBrands, function (Brand, i) {
            return Brand.name.toLowerCase() == BrandName.toLowerCase();
        });

        if (arr.length > 0) {
            new pospal.ui.msgBox(lang.tryGet("新增品牌已存在"));
            $("#editBrandDiv input.newBrandName").select();
            return false;
        }

        var doing = new pospal.ui.loading($("#editBrandDiv"));
        pospal.ajax({
            url: "/ProductBrand/AddProductBrand",
            data: {
                "userId": userSelector.getSelectedValue(), "brandName": BrandName
            },
            success: function (result) {
                if (result.successed) {
                    var insI = 0;
                    productBrands.forEach(function (it, i) {
                        if (firstCodeCompare(BrandName, it.name) >= 0) {
                            insI = i + 1;
                        }
                    });
                    productBrands.splice(insI, 0, result.productBrand);
                    _this.buildBrandListUI();
                    $("#editBrandDiv input.newBrandName").val("").focus();
                    onChangedProductBrand();
                } else {
                    new pospal.ui.msgBox({ content: result.msg, autoCloseSec: 0 });
                }
            },
            complete: function () { doing.destroy(); }
        });
    }
};

function firstCodeCompare(a, b) {
    var attr_a = makePy(a)[0],
        attr_b = makePy(b)[0];
    var r = 1;
    if (attr_a < attr_b) r = -1;
    else if (attr_a == attr_b) r = 0;
    else r = 1;
    return r;
}

var brandCopy = {
    init: function () {
        var _this = this;

        this.defaultKeyword = lang.tryGet("搜索门店关键字", true);

        $("#btnBrandCopy").bind("click", function () {
            $("#syncBrandDiv .storeKeyword").val(_this.defaultKeyword);
            _this.loadSyncStores();
        });

        $("#syncBrandDiv .storeKeyword").keyup(function () {
            _this.filtStores();
        }).blur(function () {
            if ($(this).val().trim().length == 0) {
                $(this).val(_this.defaultKeyword);
            }
        }).click(function () {
            if ($(this).val().trim() == _this.defaultKeyword) {
                $(this).val("");
            }
        });

        $("#syncBrandDiv .popupClose").bind("click", function () {
            _this.hide();
        });

        $(document).on("click", "#syncBrandDiv .confirm", function () {
            _this.syncBrandToStores();
        });
    },

    filtStores: function () {
        var keyword = $("#syncBrandDiv .storeKeyword").val().trim().toLowerCase();
        if (keyword == this.defaultKeyword) keyword == "";

        var filtedStores = this.stores;
        if (keyword.length > 0) {
            filtedStores = $.grep(this.stores, function (item, index) {
                return item.company.toLowerCase().indexOf(keyword) > -1
            });
        }
        this.bulidStoreList(filtedStores);
    },

    show: function () {
        layout.showOrHideEditArea(false);
        $("#popupBg,#syncBrandDiv").show();
        this.filtStores();
    },

    hide: function () {
        $("#popupBg,#syncBrandDiv").hide();
    },

    loadSyncStores: function () {
        var excludeStoreId = userSelector.getSelectedValue();
        var _this = this;
        var doing = new pospal.ui.loading($("#mainArea"));
        pospal.ajax({
            url: "/Account/LoadSyncStores",
            data: {
                excludeStoreId: excludeStoreId
            },
            success: function (result) {
                if (result.successed) {
                    if (result.stores.length > 0) {
                        _this.stores = result.stores;
                        _this.bulidStoreList(result.stores);
                        setTimeout(function () {
                            _this.show()
                        }, 500);
                    } else {
                        new pospal.ui.msgBox(lang.tryGet("未找到子门店"));
                    }
                }
            },
            complete: function () { doing.destroy(); }
        });
    },

    bulidStoreList: function (stores) {
        var _this = this;
        $ul = $("#syncBrandDiv ul").empty();
        $.each(stores, function (index, item) {
            var $li = $("<li/>").html("<div></div>").appendTo($ul);
            var checkBox = new pospal.ui.checkBox({
                container: $li.find("div"),
                text: item.company,
                value: item.id,
                clickCallBack: function () {
                    checkBox.checked ? $li.find("em").addClass("on") : $li.find("em").removeClass("on");
                    var selectedStoreCount = 0;
                    $("#syncBrandDiv ul li").each(function (index, item) {
                        if ($(item).data("checkBox").checked) {
                            selectedStoreCount++;
                            _this.$checkAll.checked = selectedStoreCount == stores.length ? true : false;
                            _this.$checkAll.reset();
                        }
                    });
                }
            });
            $("<em/>").appendTo($li);
            $li.data("checkBox", checkBox);
        });

        var $checkAll = new pospal.ui.checkBox({
            container: $("<div/>").appendTo($("#syncBrandDiv .checkAllDiv").empty()),
            text: lang.tryGet("全选"),
            clickCallBack: function () {
                $ul.find("li").each(function (index, item) {
                    var checkBox = $(item).data("checkBox");
                    checkBox.checked = $checkAll.checked;
                    checkBox.reset();
                    checkBox.checked ? $(item).find("em").addClass("on") : $(item).find("em").removeClass("on")
                })
            }
        });

        this.$checkAll = $checkAll;
    },

    syncBrandToStores: function () {
        var data = {
            fromUserId: userSelector.getSelectedValue()
        };
        this.ajaxSyncToStores("/ProductBrand/SyncBrandToStore", data);
    },

    ajaxSyncToStores: function (url, data) {
        var toStoreIds = this.getSelectedStoreIds();
        if (toStoreIds.length == 0) {
            new pospal.ui.msgBox(lang.tryGet("门店必选"));
            return false;
        }

        var _this = this;
        var doing = new pospal.ui.loading($("#syncBrandDiv"), true);
        function ajaxPost(index) {
            if (index < toStoreIds.length) {
                var toStoreId = toStoreIds[index];
                data.toUserId = toStoreId;
                var $li = $("#syncBrandDiv ul div[data=" + toStoreId + "]").parent().parent();
                $li.find("em").html(lang.tryGet("进行中"));
                pospal.ajax({
                    url: url,
                    data: data,
                    success: function (result) {
                        if (result.successed) {
                            $li.find("em").html(lang.tryGet("已完成"));
                            if (index == toStoreIds.length - 1) {
                                doing.destroy();
                                _this.hide();
                                new pospal.ui.msgBox({ content: lang.tryGet("同步完成"), autoCloseSec: 0 });
                            } else {
                                ajaxPost(++index);
                            }
                        }
                    },
                    complete: function () { }
                });
            }
        }

        ajaxPost(0);
    },

    getSelectedStoreIds: function () {
        var selectedStoreIds = [];
        $("#syncBrandDiv ul li").each(function (index, item) {
            var checkBox = $(item).data("checkBox");
            if (checkBox.checked) {
                selectedStoreIds.push(checkBox.getValue());
            }
        });

        return selectedStoreIds;
    }
};

var toStandardProduct = {
    init: function () {
        var _this = this;

        this.chk_agreePact = new pospal.ui.checkBox({
            container: $("#chk_agreePact"),
            text: "",
            value: false,
            clickCallBack: function () {

            }
        });

        $("#toStadardProductDiv .btnSave").click(function () {
            if (_this.chk_agreePact.checked) {
                var action = $("#toStadardProductDiv").data("action");
                if (action == "1") {
                    _this.hide();
                    standardProductSelector.show();
                }
                else {
                    _this.toStandardProduct();
                }
                localStorage.setItem("standardProductNotifed", "1");
            }
            else {
                new pospal.ui.msgBox({
                    content: "请阅读《标准库使用声明》并勾选我已阅读"
                });
            }
        })

        $("#toStadardProductDiv .btnCancel,#toStadardProductDiv .popupClose").click(function () {
            _this.hide();
        })
    },

    show: function () {
        var notified = localStorage.getItem("standardProductNotifed");
        if (notified && notified == "1") {
            this.toStandardProduct();
        }
        else {
            $("#toStadardProductDiv").data("action", "0");
            $("#popupBg,#toStadardProductDiv").show();
        }
    },

    hide: function (delay) {
        $("#popupBg,#toStadardProductDiv").hide();
        editUIConfig.hide();
    },

    toStandardProduct: function () {
        var url = $(".btnShowStandardProductDiv").data("selected-url") || $(".btnShowStandardProductDiv").attr("orign-url");
        pospal.openPage(url, false);
    }
}

//自定义表头UI
var editUIConfig = {
    init: function () {
        var _this = this;

        $("#customHeadDiv .cancel").click(function () {
            _this.hide();
        })

        $("#customHeadDiv .save").click(function () {

            _this.save();
        })
        _this.loadUI();
    },
    loadUI: function () {
        pospal.ajax({
            url: "/Account/LoadUserUIConfigCustomJson",
            data: {
                "typeNumber": 1004
            },
            success: function (result) {
                if (result.successed) {
                    if (result.data) {
                        userUIConfig = JSON.parse(result.data);
                    }
                    else {
                        userUIConfig = null;
                    }
                }
            },
            complete: function () {
            }
        });
    },
    getTableTargets: function () {
        var targets = [$("#mainTable")];
        var $fixedTable = $("#mainTable").prev(".rc-fixedHeader-container").find("table:first");
        if ($fixedTable.length > 0) targets.push($fixedTable);
        return targets;
    },
    getColumns: function () {
        var columns = [];
        $("#mainTable thead tr:last th").each(function (index, th) {
            var $th = $(th);
            var value = $th.attr("data");
            if (value) {
                columns.push({ index: index, value: value });
            }
        });
        return columns;
    },
    getSortArr: function (columns) {
        columns = columns || this.getColumns();
        var sortArr = userUIConfig && userUIConfig.sortArr ? userUIConfig.sortArr : [];
        var currentSortArr = [];

        $.each(sortArr, function (index, value) {
            if (!value) return;
            if (!pospal.contains(currentSortArr, value) && pospal.find(columns, function (col) { return col.value == value; })) {
                currentSortArr.push(value);
            }
        });

        $.each(columns, function (index, col) {
            if (!pospal.contains(currentSortArr, col.value)) {
                currentSortArr.push(col.value);
            }
        });

        return currentSortArr;
    },
    sortTableColumns: function (columns) {
        columns = columns || this.getColumns();
        var sortArr = this.getSortArr(columns);
        if (sortArr.length == 0 || columns.length == 0) return;

        var columnIndexDic = {};
        $.each(columns, function (index, col) {
            columnIndexDic[col.value] = col.index;
        });

        var firstSortIndex = columns[0].index;
        var orderedIndexes = [];
        var movedIndexDic = {};
        $.each(sortArr, function (index, value) {
            var columnIndex = columnIndexDic[value];
            if (columnIndex == null || movedIndexDic[columnIndex]) return;
            orderedIndexes.push(columnIndex);
            movedIndexDic[columnIndex] = true;
        });

        if (orderedIndexes.length == 0) return;

        $.each(this.getTableTargets(), function (index, $table) {
            $table.find("tr").each(function (rowIndex, tr) {
                var cells = $(tr).children("th,td").toArray();
                if (cells.length <= firstSortIndex) return;

                var nextCells = cells.slice(0, firstSortIndex);
                $.each(orderedIndexes, function (i, cellIndex) {
                    if (cells[cellIndex]) nextCells.push(cells[cellIndex]);
                });
                $.each(cells.slice(firstSortIndex), function (i, cell) {
                    var cellIndex = firstSortIndex + i;
                    if (!movedIndexDic[cellIndex]) nextCells.push(cell);
                });
                $(tr).append(nextCells);
            });
        });
    },
    applyColumnWidths: function () {
        var widths = userUIConfig && userUIConfig.widths ? userUIConfig.widths : {};
        if (!widths) return;

        $.each(this.getTableTargets(), function (index, $table) {
            $table.find("th[data]").each(function (i, th) {
                var key = $(th).attr("data");
                var width = parseInt(widths[key], 10);
                if (!isNaN(width) && width >= 36) {
                    $(th).attr("width", width).css("width", width + "px");
                }
            });
        });
        this.resizeMainTableByColumns();
    },
    resizeMainTableByColumns: function () {
        var totalWidth = 0;
        $("#mainTable thead tr:last th").each(function (index, th) {
            if ($(th).hasClass("nodis")) return;
            totalWidth += $(th).outerWidth();
        });
        if (totalWidth > 0) {
            $("#mainTable").width(totalWidth);
            $("#mainTable").prev(".rc-fixedHeader-container").find("table:first").width(totalWidth);
        }
    },
    updateProductImageSize: function () {
        var $th = $("#mainTable th[data='productImage']");
        if ($th.length == 0 || $th.hasClass("nodis")) return;

        var size = $th.outerWidth() - 16;
        if (size < 24) size = 24;
        if (size > 120) size = 120;
        $("#mainTable td.productImage img").css({
            "max-width": size + "px",
            "max-height": size + "px"
        });
    },
    clearHeaderState: function () {
        $.each(this.getTableTargets(), function (index, $table) {
            $table.find("th,td").removeClass("nodis");
            $table.find(".product-column-resize-handle").remove();
        });
    },
    filterHeader: function () {
        this.clearHeaderState();
        var columns = this.getColumns();
        this.sortTableColumns(columns);
        this.applyColumnWidths();

        var hideArray = [];
        $(".rc-fixedHeader-container th").each(function (index, item) {
            var value = $(item).attr("data");
            var defaultValue = $(item).attr("data-default") == "0" ? 0 : 1;
            if (value) {
                var showOrHide = userUIConfig == null || userUIConfig[value] == null ? defaultValue : userUIConfig[value];
                if (showOrHide == 0) {
                    hideArray.push(index);
                }
            }
            $(item).addClass("nodis");
        })

        var l = $("#mainTable tr").length;
        for (var i = 0; i < l; i++) {
            for (var j = 0; j < hideArray.length; j++) {
                $("#mainTable tr").eq(i).find("td,th").eq(hideArray[j]).addClass("nodis");
            }

        }
        this.resizeMainTableByColumns();
        this.updateProductImageSize();
        layout.resizeMainTable();
        setTimeout(function () {
            editUIConfig.bindColumnResize();
        }, 1);
    },
    buildUI: function () {
        var $ui = $("#customHeadDiv .c-customize-popup__content");
        $ui.empty();
        var totalRecord = 0;
        var columns = this.getColumns();
        var sortArr = this.getSortArr(columns);
        var sortedColumns = [];
        $.each(sortArr, function (index, value) {
            var column = pospal.find(columns, function (col) { return col.value == value; });
            if (column) sortedColumns.push(column);
        });

        $.each(sortedColumns, function (index, column) {
            var th = $("#mainTable thead tr:last th").eq(column.index)[0];
            var text = $(th).text().trim();
            var value = $(th).attr("data");
            if (value == 'stock') text = lang.tryGet("库存");
            var defaultValue = $(th).attr("data-default") == "0" ? 0 : 1;
            var required = $(th).attr("data-required") == "true" || $(th).attr("data-required") == "1";

            var div = $("<div/>").appendTo($ui);
            if (index % 2 == 0) {
                totalRecord++;
                div.addClass("c-customize-popup__item");
            }
            else
                div.addClass(" c-customize-popup__item is-right");

            var item = $("<div/>").appendTo(div);

            var cbk = new pospal.ui.checkBox({
                container: $(item),
                text: text,
                checked: ((userUIConfig == null || userUIConfig[value] == null ? defaultValue : userUIConfig[value]) == 1) ? true : false,
                clickCallBack: function () {
                }
            });
            if (required && cbk.setDisabled) {
                cbk.setDisabled(true);
            }
            $(item).data("checkBox", cbk);
            $(item).data("value", value);
            $(item).data("required", required);
        })

        $ui.sortable({
            items: ".c-customize-popup__item",
            placeholder: "sortable-placeholder",
            stop: function () {
                $ui.find(".c-customize-popup__item").removeClass("is-right").each(function (index, item) {
                    if (index % 2 == 1) $(item).addClass("is-right");
                });
            }
        }).disableSelection();

        var height = totalRecord * 41 + 5;
        var maxHeight = 380;
        var scrollDiv = $("#customHeadDiv .mCustomScrollbar");
        if (height >= maxHeight) {
            scrollDiv.height(maxHeight);
        }
        else {
            scrollDiv.height(height);
        }
        scrollDiv.mCustomScrollbar("update");
    },
    show: function () {
        addvancedProduct.close();
        $("#customHeadDiv,.c-customize-popup__parent").show();
    },
    hide: function () {
        $("#customHeadDiv,.c-customize-popup__parent").hide();
    },
    buildUIConfigs: function () {
        var userUIConfig = {};
        var sortArr = [];

        $(".c-customize-popup__item .checkBoxDiv").each(function (index, item) {
            var value = $(item).data("value");
            var checkBox = $(item).data("checkBox");
            var required = $(item).data("required");
            if (value) sortArr.push(value);
            if (required || checkBox.checked) {
                userUIConfig[value] = 1;
            }
            else {
                userUIConfig[value] = 0;
            }
        })

        userUIConfig.sortArr = sortArr;
        userUIConfig.widths = this.buildColumnWidths();

        return userUIConfig;
    },
    buildColumnWidths: function () {
        var widths = {};
        $("#mainTable thead tr:last th[data]").each(function (index, th) {
            var value = $(th).attr("data");
            if (value) widths[value] = Math.round($(th).outerWidth());
        });
        return widths;
    },
    resizeColumn: function (key, width) {
        if (!key) return;
        if (width < 36) width = 36;

        $.each(this.getTableTargets(), function (index, $table) {
            $table.find("th[data='" + key + "']").attr("width", width).css("width", width + "px");
        });
        this.resizeMainTableByColumns();
        this.updateProductImageSize();
    },
    saveColumnWidths: function () {
        var _this = this;
        userUIConfig = userUIConfig || {};
        userUIConfig.widths = _this.buildColumnWidths();

        pospal.ajax({
            url: "/Account/SaveUserUIConfig",
            data: {
                "customJson": JSON.stringify(userUIConfig), typeNumber: 1004
            }
        });
    },
    bindColumnResize: function () {
        var _this = this;
        var $fixedTable = $("#mainTable").prev(".rc-fixedHeader-container").find("table:first");
        var $resizeTable = $fixedTable.length > 0 ? $fixedTable : $("#mainTable");

        $resizeTable.find(".product-column-resize-handle").remove();
        $resizeTable.find("th[data]").each(function (index, th) {
            var $th = $(th);
            if ($th.hasClass("nodis")) return;
            $th.addClass("product-column-resizable");
            $("<span class='product-column-resize-handle'></span>").appendTo($th);
        });

        $resizeTable.find(".product-column-resize-handle").off("mousedown").on("mousedown", function (e) {
            e.preventDefault();
            e.stopPropagation();

            var $th = $(this).parent();
            var key = $th.attr("data");
            var startX = e.pageX;
            var startWidth = $th.outerWidth();

            $(document).on("mousemove.productColumnResize", function (moveEvent) {
                _this.resizeColumn(key, startWidth + moveEvent.pageX - startX);
            });
            $(document).one("mouseup", function () {
                $(document).off("mousemove.productColumnResize");
                _this.saveColumnWidths();
            });
        });
    },
    save: function () {
        var _this = this;
        var uiConfigs = _this.buildUIConfigs();

        var doing = new pospal.ui.loading($("#mainArea"));
        pospal.ajax({
            url: "/Account/SaveUserUIConfig",
            data: {
                "customJson": JSON.stringify(uiConfigs), typeNumber: 1004
            },
            success: function (result) {
                if (result.successed) {
                    _this.hide();
                    new pospal.ui.msgBox("保存自定义表头成功");
                    setTimeout(function () { editUIConfig.loadUI(); loadProducts(); }, 1);
                }
            },
            complete: function () {
                doing.destroy();
            }
        });
    }
}

var batchEditImages = {
    importType: null,
    singleImageMaxSize: 3 * 1024 * 1024,
    largeBatchImageMaxCount: 200,
    isLargeBatchProductImageImport: function () {
        return typeof enableLargeBatchProductImageImport != "undefined" && enableLargeBatchProductImageImport;
    },
    init: function () {
        var _this = this;

        this.importStoreSelector = new pospal.ui.singleSelector({
            container: $('#ddl_importImageStore'),
            textWidth: 214,
            selectBoxWidth: 246,
            options: storeOptions
        });

        this.rg_aboutExistingProduct = new pospal.ui.radioGroup($("#rg_aboutExistingProductImageDiv .radioBox14"));
        $("#rg_aboutExistingProductImageDiv .radioBox14").bind("click", function () {
            $("#rg_aboutExistingProductImageDiv .radioGroup .option").removeClass("on");
            $(this).parent().addClass("on");
        });

        $("#batchEditImageDiv .popupClose").bind("click", function () {
            _this.hide();
        });
    },

    show: function (configVaule) {
        if (configVaule == "2" || configVaule == "4") {
            this.importType = configVaule == "2" ? 1 : 3;
            $("#batchEditImageDiv .popupTitle h1").html("● 图片批量导入");
            $("#batchEditImageDiv .infoDiv .mulColor").hide();
            $("#batchEditImageDiv .infoDiv .common").show();
            $("#batchEditImageDiv .infoDiv .common font").html(configVaule == "2" ? "条码" : "商品名称");
        }
        else {
            this.importType = 2;
            $("#batchEditImageDiv .popupTitle h1").html("● 多颜色尺码图片批量导入");
            $("#batchEditImageDiv .infoDiv .mulColor").show();
            $("#batchEditImageDiv .infoDiv .common").hide();
        }
        $("#batchEditImageDiv").css("margin-top", -$("#batchEditImageDiv").height() / 2);
        this.resetUI();
        $("#popupBg").show();
        $("#batchEditImageDiv").show();

        if (this.uploader == null) this.buildUploader();
    },

    hide: function () {
        $("#popupBg").hide();
        $("#batchEditImageDiv").hide();
    },

    resetUI: function () {
        this.importStoreSelector.setSelectedValue(userSelector.getSelectedValue());
        $("#batchEditImageDiv .imgUl").html("");
        $("#batchEditImageDiv .imgUl").width(0);
        this.rg_aboutExistingProduct.setSelectedValue(0);
        $("#batchUploadImageNames").val(lang.tryGet("选择上传图片"));
        $("#batchUploadMsg").html("");
        $("#batchUploadImagesPercent").css("width", "0%");
    },

    buildUploader: function () {
        var _this = this;

        var updateExistingProduct = _this.rg_aboutExistingProduct.getSelectedValue();
        var opts = {
        };
        opts.browse_button = "btnBatchPickImages";
        opts.url = "/Product/UploadProductImage";
        opts.multi_selection = true;
        opts.max_file_size = "3mb";
        opts.extensions = "jpg,jpeg,png";
        opts.PostInit = function (up) {
            $("#btnBatchUploadImages").bind("click", function () {
                if (up.files.length == 0) {
                    $("#batchUploadMsg").html("<b>" + lang.tryGet("提示选择图片") + "</b>");
                    $("#uploadImageNames").val(lang.tryGet("选择上传图片"));
                } else {
                    var updateExistingProduct = _this.rg_aboutExistingProduct.getSelectedValue();
                    up.settings.url = "/Product/UploadProductImageForBatchImport?storeId=" + _this.importStoreSelector.getSelectedValue() + "&updateExistingProduct=" + (updateExistingProduct == "1") + "&importType=" + _this.importType;
                    up.start();
                    up.disableBrowse(true);
                }
                return false;
            });
        }

        opts.FilesAdded = function (up, files) {
            var isValid = true;
            var isLargeBatchProductImageImport = _this.isLargeBatchProductImageImport();

            var liNum = $("#batchEditImageDiv .imgUl li").length;
            if (!isLargeBatchProductImageImport && liNum + files.length > 50) {
                isValid = false;
                new pospal.ui.msgBox({ content: "批量上传图片数量不能超过50张", autoCloseSec: 0 });
                $.each(files, function (i, file) {
                    up.removeFile(file.id);
                })
            }
            if (isLargeBatchProductImageImport && liNum + files.length > _this.largeBatchImageMaxCount) {
                isValid = false;
                new pospal.ui.msgBox({ content: "批量上传图片数量不能超过200张", autoCloseSec: 0 });
                $.each(files, function (i, file) {
                    up.removeFile(file.id);
                });
            }

            if (isValid) {
                var hasOverSingleSizeFile = false;
                $.each(files, function (i, file) {
                    if (file.size >= _this.singleImageMaxSize) {
                        hasOverSingleSizeFile = true;
                        return false;
                    }
                });
                if (hasOverSingleSizeFile) {
                    isValid = false;
                    new pospal.ui.msgBox({ content: "图片大小不能超过3M", autoCloseSec: 0 });
                    $.each(files, function (i, file) {
                        up.removeFile(file.id);
                    });
                }
            }

            if (isValid) {
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];

                    var li = $("<li/>").attr("fileId", file.id).appendTo($("#batchEditImageDiv .imgUl"));
                    var imgBox = $("<div/>").addClass("imgBox").appendTo(li);
                    $("<img style='width:140px; height:140px;' src='/images/thempty.png' />").appendTo(imgBox);
                    var imgUpload = $("<div/>").addClass("imgUpload").appendTo(imgBox);
                    $("<h1/>").html(file.name).appendTo(imgUpload);
                    $("<div/>").addClass("blackBg").appendTo(imgUpload);
                    $("<div/>").addClass("progress").html("<div style='width:0%'><div>").appendTo(imgUpload);

                    var btnDel = $("<div/>").addClass("delete").html("<b>" + lang.tryGet("取消上传") + "</b>").appendTo(imgUpload);
                    btnDel.bind("click", function () {
                        _this.removeFile($(this).parent().parent().parent());
                    });

                    !function (file) {
                        pospal.previewImage(file, function (imgsrc) {
                            $("#batchEditImageDiv .imgUl li[fileId=" + file.id + "]").find("img").attr("src", imgsrc);
                            $("#batchEditImageDiv .imgUl li[fileId=" + file.id + "]").find("h1").remove();
                        })
                    }(file);
                }

                _this.countTotal();
            }
        }

        opts.UploadProgress = function (up, file) {
            $("#batchEditImageDiv .imgUl li[fileId=" + file.id + "]").find(".progress div").css("width", file.percent + "%");
            $("#batchUploadImagesPercent").css("width", up.total.percent + "%");
        }

        opts.FileUploaded = function (up, file, response) {
            if (response != null && response.response != null && response.response != "") {
                var result = JSON.parse(response.response);

                if (result.successed) {
                    $("#batchUploadMsg").html("上传成功：" + file.name + "<br/>" + $("#batchUploadMsg").html());
                    var imagePath = pospal.formatSmallImageUrl(imageDomain + result.msg);

                    //根据返回的Url，充值Li
                    var li = $("#batchEditImageDiv .imgUl li[fileId=" + file.id + "]");
                    li.attr("fileId", "");
                    li.data("imagePath", result.msg);
                    li.find("img").attr("src", imagePath);
                    if ($("#editArea").data("id") > 0) {
                        li.data("imgId", result.imageId);
                    }

                    var div = li.find(".imgUpload");
                    div.removeClass("imgUpload");
                    div.html("");
                } else {
                    $("#batchUploadMsg").html(lang.tryGet("上传失败") + "：" + file.name + "，原因：" + result.msg + "<br/>" + $("#batchUploadMsg").html());
                }
            }
        }

        opts.UploadComplete = function (up, file) {
            $("#batchUploadMsg").html("<b>图片已全部上传完成!</b><br/>" + $("#batchUploadMsg").html());
            $("#batchUploadImagesPercent").css("width", "100%");

            up.disableBrowse(false);
            up.splice(0, up.files.length);
        }

        opts.Error = function (up, err) {
            var err = err.file.name + "：" + err.message;
            $("#batchUploadMsg").html("<b>" + err + "</b>");

            up.disableBrowse(false);
        }

        _this.uploader = pospal.buildUploader(opts);

        this.countTotal = function () {
            var liNum = $("#batchEditImageDiv .imgUl li").length;
            $("#batchEditImageDiv .imgUl").width(liNum * 160);

            if (_this.uploader.files.length == 0) {
                $("#uploadImageNames").val(lang.tryGet("选择上传图片"));
            } else {
                $("#uploadImageNames").val(lang.format("添加图片统计", [_this.uploader.files.length, (_this.uploader.total.size / 1024).toFixed(2)]));
            }
        }

        this.removeFile = function (li) {
            var fileId = $(li).attr("fileId");
            _this.uploader.removeFile(fileId);
            $(li).remove();

            _this.countTotal();
        }
    },

    delImg: function (li) {
        var _this = this;

        if ($("#editArea").data("id") == 0) {
            li.remove();
        }

        var liNum = $("#batchEditImageDiv .imgUl li").length;
        $("#batchEditImageDiv .imgUl").width(liNum * 160);
    }
};

var editMulColorSizeImages = {
    init: function () {
        var _this = this;

        $("#editMulColorImageDiv .popupClose").bind("click", function () {
            _this.save();
        });

    },

    show: function (colorName) {
        this.resetUI();
        $("#editMulColorImageDiv").data("colorName", colorName);
        $("#normalPopupBg").show();
        $("#editMulColorImageDiv").show();
        if (this.uploader == null) this.buildUploader();

        var productImages = [];
        if (editProduct.colorProductImages && editProduct.colorProductImages[colorName]) {
            productImages = editProduct.colorProductImages[colorName];
        }
        this.buildImgsUI(productImages);
    },

    hide: function () {
        $("#normalPopupBg").hide();
        $("#editMulColorImageDiv").hide();
    },

    resetUI: function () {
        $("#editMulColorImageDiv .imgUl").html("");
        $("#editMulColorImageDiv .imgUl").width(0);
    },

    buildUploader: function () {
        var _this = this;

        var opts = {
        };
        opts.browse_button = "btnPickMulColorImages";
        opts.url = "/Product/UploadProductImage";
        opts.multi_selection = true;
        opts.max_file_size = $("#maxExcelExt").val() + 'mb';
        opts.extensions = "jpg,jpeg,png";
        opts.PostInit = function (up) {
            $("#btnMulColorImages").bind("click", function () {
                if (up.files.length == 0) {
                    new pospal.ui.msgBox({ content: lang.tryGet("提示选择图片"), boxType: "toast", autoCloseSec: 2000 });
                } else {
                    up.settings.url = "/Product/UploadProductImage?userId=" + userSelector.getSelectedValue() + "&productId=0";
                    up.start();
                    up.disableBrowse(true);
                }
                return false;
            });
        }

        opts.FilesAdded = function (up, files) {
            var isValid = true;

            var liNum = $("#editMulColorImageDiv .imgUl li").length;
            if (liNum + files.length > 5) {
                isValid = false;
                new pospal.ui.msgBox({ content: "商品图片不能超过5张，请确认！", boxType: "toast", autoCloseSec: 2000 });
                $.each(files, function (i, file) {
                    up.removeFile(file.id);
                })
            }

            if (isValid) {
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];

                    var li = $("<li/>").attr("fileId", files[i].id).appendTo($("#editMulColorImageDiv .imgUl"));
                    var imgBox = $("<div/>").addClass("imgBox").appendTo(li);
                    var img = $("<img style='width:140px; height:140px;' src='/images/thempty.png' />").appendTo(imgBox);
                    var imgUpload = $("<div/>").addClass("imgUpload").appendTo(imgBox);
                    $("<h1/>").html(file.name).appendTo(imgUpload);
                    $("<div/>").addClass("blackBg").appendTo(imgUpload);
                    $("<div/>").addClass("progress").html("<div style='width:0%'><div>").appendTo(imgUpload);

                    var btnDel = $("<div/>").addClass("delete").html("<b>" + lang.tryGet("取消上传") + "</b>").appendTo(imgUpload);
                    btnDel.bind("click", function () {
                        _this.removeFile($(this).parent().parent().parent());
                    });

                    !function (i) {
                        pospal.previewImage(files[i], function (imgsrc) {
                            $("#editMulColorImageDiv .imgUl li[fileId=" + files[i].id + "]").find("img").attr("src", imgsrc);
                            $("#editMulColorImageDiv .imgUl li[fileId=" + files[i].id + "]").find("h1").remove();
                        })
                    }(i);
                }

                _this.countTotal();
            }
        }

        opts.UploadProgress = function (up, file) {
            $("#editMulColorImageDiv .imgUl li[fileId=" + file.id + "]").find(".progress div").css("width", file.percent + "%");
        }

        opts.FileUploaded = function (up, file, response) {
            if (response != null && response.response != null && response.response != "") {
                var result = JSON.parse(response.response);

                if (result.successed) {
                    var colorName = $("#editMulColorImageDiv").data("colorName");
                    var imagePath = pospal.formatSmallImageUrl(imageDomain + result.msg);

                    //根据返回的Url，充值Li
                    var li = $("#editMulColorImageDiv .imgUl li[fileId=" + file.id + "]");
                    li.attr("fileId", "");
                    li.data("imagePath", result.msg);
                    li.find("img").attr("src", imagePath).attr("data-caption", "").attr("data-group", "group_" + colorName).attr("data-src", imagePath.replace("_200x200", ""));;
                    var div = li.find(".imgUpload");
                    div.removeClass("imgUpload").addClass("imgOperation");
                    div.html("");
                    $("<div/>").addClass("blackBg").appendTo(div);
                    var btnDel = $("<div/>").addClass("delete").html("<b>" + lang.tryGet("删除图片") + "</b>").appendTo(div);
                    var btnSetCover = $("<div/>").addClass("textCover").html(lang.tryGet("设为封面")).appendTo(div);

                    btnDel.bind("click", function () {
                        _this.delImg($(this).parent().parent().parent());
                    })

                    btnSetCover.bind("click", function () {
                        _this.setCoverImg($(this).parent().parent().parent());
                    })

                    _this.bindPreivewEvent(li.find("img"));

                } else {
                    new pospal.ui.msgBox({ content: lang.tryGet("上传失败") + "：" + file.name, boxType: "toast", autoCloseSec: 2000 });
                }
            }
        }

        opts.UploadComplete = function (up, file) {
            new pospal.ui.msgBox({ content: lang.tryGet("图片上传成功"), boxType: "toast", autoCloseSec: 2000 });

            if (!_this.hasCoverImg()) {
                var firstLi = $("#editMulColorImageDiv .imgUl li[fileId='']").eq(0);
                _this.setCoverImgUI(firstLi);
            }
            up.disableBrowse(false);
            up.splice(0, up.files.length);
        }

        opts.Error = function (up, err) {
            var err = err.file.name + "：" + err.message;
            new pospal.ui.msgBox({ content: err, boxType: "toast", autoCloseSec: 2000 });
            up.disableBrowse(false);
        }

        _this.uploader = pospal.buildUploader(opts);

        this.countTotal = function () {
            var liNum = $("#editMulColorImageDiv .imgUl li").length;
            $("#editMulColorImageDiv .imgUl").width(liNum * 160);

            if (liNum == 0)
                $("#editMulColorImageDiv .empty").show();
            else
                $("#editMulColorImageDiv .empty").hide();
        }

        this.removeFile = function (li) {
            var fileId = $(li).attr("fileId");
            _this.uploader.removeFile(fileId);
            $(li).remove();

            _this.countTotal();
        }
    },

    setCoverImgUI: function (li) {
        $("#editMulColorImageDiv .imgUl li .imgCover").remove();
        $("<div/>").addClass("imgCover").html(lang.tryGet("封面")).appendTo(li.find(".imgBox"));
    },

    setCoverImg: function (li) {
        this.setCoverImgUI(li);
    },

    hasCoverImg: function () {
        var coverImg = $("#editMulColorImageDiv .imgUl li .imgCover");
        if (coverImg.length > 0)
            return true;
        else
            return false;
    },

    delImg: function (li) {
        var _this = this;

        li.remove();
        if (li.find(".imgCover").length > 0) {
            //删除的是封面，寻找下一张作为新封面
            var firstLi = $("#editMulColorImageDiv .imgUl li[fileId='']").eq(0);
            if (firstLi.length > 0) {
                _this.setCoverImgUI(firstLi);
            }
        }
        this.countTotal();
    },

    buildImgsUI: function (productImages) {
        var _this = this;
        var colorName = $("#editMulColorImageDiv").data("colorName");
        if (productImages != null && productImages.length > 0) {
            for (var i = 0; i < productImages.length; i++) {
                var pi = productImages[i];

                var li = $("<li/>").attr("fileId", "").appendTo($("#editMulColorImageDiv .imgUl"));
                var imgBox = $("<div/>").addClass("imgBox").appendTo(li);
                var img = $("<img style='width:140px; height:140px;' />").attr("src", pospal.formatSmallImageUrl(imageDomain + pi.path)).appendTo(imgBox).attr("data-caption", "").attr("data-group", "group_" + colorName).attr("data-src", pospal.formatSmallImageUrl(imageDomain + pi.path).replace("_200x200", ""));
                var imgOperation = $("<div/>").addClass("imgOperation").appendTo(imgBox);

                $("<div/>").addClass("blackBg").appendTo(imgOperation);
                var btnDel = $("<div/>").addClass("delete").html("<b>" + lang.tryGet("删除图片") + "</b>").appendTo(imgOperation);
                var btnSetCover = $("<div/>").addClass("textCover").html(lang.tryGet("设为封面")).appendTo(imgOperation);

                btnDel.bind("click", function () {
                    _this.delImg($(this).parent().parent().parent());
                })

                btnSetCover.bind("click", function () {
                    _this.setCoverImg($(this).parent().parent().parent());
                })

                if (pi.isCover) {
                    $("<div/>").addClass("imgCover").html(lang.tryGet("封面")).appendTo(imgBox);
                }
                _this.bindPreivewEvent(img);
                li.data("imagePath", pi.path);
            }
        }
        this.countTotal();
    },

    bindPreivewEvent: function (img) {
        $(img).Magnify({
            Toolbar: [
                'prev',
                'next',
                'actualSize'
            ],
            keyboard: true,
            draggable: false,
            movable: true,
            modalSize: [800, 600],
            beforeOpen: function (obj, data) {

            },
            opened: function (obj, data) {
                console.log('opened')
            },
            beforeClose: function (obj, data) {
                console.log('beforeClose')
            },
            closed: function (obj, data) {

            },
            beforeChange: function (obj, data) {
                console.log('beforeChange')
            },
            changed: function (obj, data) {
                console.log('changed')
            }
        });
    },

    buildImages: function () {
        var productimages = [];
        $("#editMulColorImageDiv .imgUl li[fileId='']").each(function (i, item) {
            var productImage = {};
            productImage.path = $(item).data("imagePath");
            productImage.isCover = $(item).find(".imgCover").length > 0 ? true : false;
            productimages.push(productImage);
        });
        return productimages;
    },

    save: function () {
        var colorName = $("#editMulColorImageDiv").data("colorName");
        editProduct.colorProductImages[colorName] = this.buildImages();
        editMulColorSizeProduct.buildSelectedColorSizeDiv(1);
        this.hide();
    }
}

var actionPage = {
    init: function () {
        if (!actionParams) return;

        console.info('其他页面返回操作---', actionParams);
        fromActionPage = true;
        if (actionParams.action == "confirmDelProductToStores") {
            if (actionParams.syncStores.length > 0) {
                sync.confirmDelProductToStores(actionParams.syncStores, actionParams.barcode);
            } else {
                new pospal.ui.msgBox(lang.tryGet("商品删除成功"));
            }
        }

        if (actionParams.showType == 3)//多规格
        {
            if (actionParams.action == "confirmAddMoreSpecProductsToStores") {
                if (actionParams.syncStores.length > 0) {
                    sync.confirmAddMoreSpecProductsToStores(actionParams.syncStores, actionParams.products, actionParams.fromUserId, actionParams.caseproducts);
                }
            }
            else if (actionParams.action == "confirmUpdateMoreSpecProductsToStores") {
                if (actionParams.syncStores.length > 0) {
                    this.buildSyncUpdateAttributeUI();
                    sync.confirmUpdateMoreSpecProductsToStores(actionParams.syncStores, actionParams.products, actionParams.fromUserId, actionParams.caseproducts, actionParams.deleteProductBarcodes);
                }
                else {
                    new pospal.ui.msgBox(lang.tryGet("商品修改成功"));
                }
            }
        }
        else {//普通商品
            if (actionParams.action == "confirmAddProductToStores") {
                if (actionParams.syncStores.length > 0) {
                    sync.confirmAddProductToStores(actionParams.syncStores, actionParams.product, actionParams.product.userId);
                }
            }
            else if (actionParams.action == "confirmUpdateProductToStores") {
                if (actionParams.syncStores.length > 0) {
                    this.buildSyncUpdateAttributeUI();
                    sync.confirmUpdateProductToStores(actionParams.syncStores, actionParams.product, actionParams.product.userId);
                }
                else {
                    new pospal.ui.msgBox(lang.tryGet("商品修改成功"));
                }
            }
        }
    },

    clearFormParams: function () {
        pospal.openPage(location.href, false);
    },

    buildSyncUpdateAttributeUI: function () {
        var attributesJson = pospal.getCookie("syncUpdateProductAttributes");
        if (attributesJson) {
            var attributeList = [];
            $("#syncDiv .attributeCheckBoxList div.checkBoxDiv").each(function (index, item) {
                if (pospal.isInArray(attributeList, $(item).find("div").attr("data"))) {
                    $(item).addClass("on");
                }
                else {
                    $(item).removeClass("on");
                }
            });

            $("#syncDiv .attributeCheckBoxAll").removeClass('indeterminate');
            if ($("#syncDiv").find("div.checkBoxDiv:not(.on)").length == 0) {
                $("#syncDiv .attributeCheckBoxAll").addClass("on");
            } else {
                if ($("#syncDiv").find("div.checkBoxDiv:visible.on").length > 0) {
                    $("#syncDiv .attributeCheckBoxAll").addClass('indeterminate');
                }
                $("#syncDiv .attributeCheckBoxAll").removeClass("on");
            }
        }
    }
}

function getProductTags() {
    var tags = [];
    for (var w = 0; w < taggroupsWithtags.length; w++) {
        var parttags = taggroupsWithtags[w].tags;
        tags = tags.concat(parttags);
    }
    return tags;
}

function onChangedProductTag() {
    var tagOptions = pospal.buildProductTagOptions(taggroupsWithtags);
    var tagSelectorOptions = JSON.parse(JSON.stringify(tagOptions));
    tagSelectorOptions.unshift({ text: lang.tryGet("全部标签"), value: "" });
    productTagSelector.update(tagSelectorOptions);

    addvancedProduct.productTagAddvancedSelector.updateWithLabel(pospal.buildProductTagOptions(taggroupsWithtags), null);
}

function onChangedProductBrand() {
    var brandOptions = [];
    for (var i = 0; i < productBrands.length; i++) {
        var brand = productBrands[i];
        brandOptions.push({
            text: brand.name, value: brand.txtUid
        });
    }

    var brandSelectorOptions = JSON.parse(JSON.stringify(brandOptions));
    brandSelectorOptions.unshift({ text: lang.tryGet("全部商品品牌"), value: "" });
    brandSelector.update(brandSelectorOptions);

    var brandSelectorOptions2 = JSON.parse(JSON.stringify(brandOptions));
    brandSelectorOptions2.unshift({ text: lang.tryGet("请选择"), value: "" });
    editProduct.edit_productBrandSelector.update(brandSelectorOptions2);
    editProduct.edit_productBrandSelector.setSelectedValue(editProduct.editProductBrandUid);

    if (brandOptions.length >= 10) {
        brandAddvancedSelector.rebind(brandOptions);
        $("#brandQueryDiv").show();
        $("#brandQueryDiv .pop").show();
        $("#brandQueryDiv .unpop").hide();
    }
    else if (brandOptions.length > 0) {
        $("#brandQueryDiv").show();
        $("#brandQueryDiv .pop").hide();
        $("#brandQueryDiv .unpop").show();
        var html = '';
        $.each(brandOptions, function () {
            html += "<li data='" + this.value + "'><div class='checkBox14'><i></i></div>" + this.text + "</li>";
        })
        if (html == '')
            $("#brandAddvancedDiv").html('').parent().hide();
        else
            $("#brandAddvancedDiv").html(html).parent().show();
    }
    else {
        $("#brandQueryDiv").hide();
    }

}

function onChangedProductColorSize() {
    var colorOptions = [];
    for (var i = 0; i < productColors.length; i++) {
        var productColor = productColors[i];
        colorOptions.push({
            text: productColor.name, value: productColor.name
        });
    }
    colorAddvancedSelector.rebind(colorOptions);

    var sizeOptions = [];
    for (var i = 0; i < productSizes.length; i++) {
        var productSize = productSizes[i];
        sizeOptions.push({
            text: productSize.name, value: productSize.name
        });
    }
    sizeAddvancedSelector.rebind(sizeOptions);
}

pospal.categorysSelector = function (opts) {
    opts.title = opts.title || "选择分类";
    opts.container = opts.container || ($("#mainArea").length > 0 ? $("#mainArea") : null);
    opts.onCancel = opts.onCancel || function () {
        return true
    };
    opts.onConfirm = opts.onConfirm || function () {
        return true
    };
    this.opts = opts;

    this.buildUI();
}

pospal.categorysSelector.prototype = {
    buildUI: function () {
        var _this = this;

        this.bg = $(".popupBg");
        this.ui = $("<div class='popup copyPopup' style='width:400px; height: 540px; margin: -270px 0 0 -200px; display:none; z-index:9999;' />").appendTo(this.opts.container);

        var $title = $("<div class='popupTitle' />").appendTo(this.ui);
        $("<h1>● " + this.opts.title + "</h1>").appendTo($title);

        var $mainArea = $("<div class='mainArea copyStore' style='max-height:440px;' />").appendTo(this.ui);
        var $checkAll = $("<div class='mainAreaTop' />").appendTo($mainArea);
        var $contentArea = $("<div class='contentArea mCustomScrollbar' style='height:400px;' />").appendTo($mainArea);
        var $optionList = $("<div class='scrollBox' />").appendTo($contentArea);

        var $bottom = $("<div class='popupBottom' />").appendTo(this.ui);
        var $confirm = $("<div class='btnBlue14 confirm' />").html(lang.tryGet("确定", true)).bind("click", function () {
            _this.confirm();
        }).appendTo($bottom);
        var $cancel = $("<div class='btnGrey14 popupClose'>").html(lang.tryGet("取消", true)).bind("click", function () {
            _this.cancel();
        }).appendTo($bottom);

        var $ul = $("<ul/>").appendTo($optionList);

        function buildOptions(item, storeChain) {
            storeChain += item.value;
            _this.buildOption($ul, item, storeChain);
            if (item.subOptions != null) {
                for (var i = 0; i < item.subOptions.length; i++) {
                    buildOptions(item.subOptions[i], storeChain + "_");
                }
            }
        }

        for (var i = 0; i < this.opts.options.length; i++) {
            var item = this.opts.options[i];
            buildOptions(item, "");
        }

        $ul.find("li").each(function (index, item) {
            if ($(item).find("em").length > 0) {
                var userId = $(item).data("checkBox").getValue();
                var subUserNum = $ul.find("li[chain*=" + userId + "_]").length;
                $(item).find("font").html(subUserNum);
            }
        })

        this.cb_checkAll = new pospal.ui.checkBox({
            container: $("<div/>").appendTo($checkAll),
            text: lang.tryGet("全选", true),
            clickCallBack: function () {
                $ul.find("li").each(function (index, item) {
                    var checkBox = $(item).data("checkBox");
                    checkBox.checked = _this.cb_checkAll.checked;
                    checkBox.reset();
                });
            }
        });

        $contentArea.mCustomScrollbar();
    },

    buildOption: function ($ul, item, storeChain) {
        var _this = this;

        var storeGrade = storeChain.split('_').length - 1;

        var $li = $("<li chain='" + storeChain + "' />").html("<div style=padding-left:" + (storeGrade * 22) + "px;></div>").appendTo($ul);
        var checkBox = new pospal.ui.checkBox({
            container: $li.find("div"),
            text: item.text,
            value: item.value,
            clickCallBack: function () {
                _this.ui.find("li[chain*=" + item.value + "_]").each(function (index, subItem) {
                    var subCheckBox = $(subItem).data("checkBox");
                    subCheckBox.checked = checkBox.checked;
                    subCheckBox.reset();
                })

                _this.checkAll($li);
            }
        });

        if (item.subOptions != null) {
            $("<em class='on' style='cursor:pointer; display:block; position:absolute; right:0px;' />").html(lang.tryGet("展开", true) + "(<font>-</font>)").bind("click", function () {
                _this.toogle(this, item);
            }).appendTo($li);
        }
        if (storeGrade > 0) $li.hide();

        $li.data("checkBox", checkBox);
    },

    show: function () {
        this.bg.show();
        this.ui.show();
    },

    close: function () {
        this.bg.hide();
        this.ui.hide();
    },

    toogle: function (e, item) {
        var _this = this;
        var subUserNum = $(e).find("font").text();
        if ($(e).text().indexOf(lang.tryGet("展开", true)) > -1) {
            $(e).html(lang.tryGet("关闭", true) + "(<font>" + subUserNum + "</font>)");
            $(e).parent().addClass("expansion");

            this.ui.find("li[chain*=" + item.value + "_]").each(function (index, li) {
                var parentStoreChain = $(li).attr("chain").replace("_" + $(li).data("checkBox").getValue(), "");
                var $parentLi = _this.ui.find("li[chain=" + parentStoreChain + "]");
                if ($parentLi.length > 0 && $parentLi.hasClass("expansion"))
                    $(li).show();
                else
                    $(li).hide();
            });
        } else {
            $(e).html(lang.tryGet("展开", true) + "(<font>" + subUserNum + "</font>)");
            $(e).parent().removeClass("expansion");
            this.ui.find("li[chain*=" + item.value + "_]").hide();
        }
    },

    confirm: function () {
        this.close();
        this.opts.onConfirm.call(this);
    },

    cancel: function () {
        this.close();
        this.opts.onCancel.call(this);
    },

    getSelectedUserIds: function () {
        var selectedUserIds = [];
        this.ui.find("ul li").each(function (index, item) {
            var checkBox = $(item).data("checkBox");
            if (checkBox.checked) {
                selectedUserIds.push(checkBox.getValue());
            }
        });

        return selectedUserIds;
    },

    getSelectedCategorys: function () {
        var selectedStores = [];
        this.ui.find("ul li").each(function (index, item) {
            var checkBox = $(item).data("checkBox");
            if (checkBox.checked) {
                selectedStores.push({ "text": checkBox.getText(), "value": checkBox.getValue() });
            }
        });

        return selectedStores;
    },

    reset: function (userIds) {
        this.ui.find(".contentArea ul li").each(function (index, item) {
            var checkBox = $(item).data("checkBox");
            checkBox.checked = false;
            if ($.inArray(checkBox.getValue(), userIds) > -1) {
                checkBox.checked = true;
            }
            checkBox.reset();
        });

        this.checkAll();
    },

    checkAll: function ($li) {
        var _this = this;

        //向上寻找父节点
        function parentCheckAll(e) {
            var storeChain = $(e).attr("chain");
            if (storeChain.split("_").length > 1) {
                var parentChain = storeChain.replace("_" + $(e).data("checkBox").getValue(), "");
                var checked = true;
                _this.ui.find("li[chain*=" + parentChain + "_]").each(function (i, item) {
                    if (!$(item).data("checkBox").checked) {
                        checked = false;
                        return;
                    }
                })
                var $parentLi = _this.ui.find("li[chain=" + parentChain + "]");
                var parentCheckBox = $parentLi.data("checkBox");
                parentCheckBox.checked = checked;
                parentCheckBox.reset();

                parentCheckAll($parentLi);
            }
        }

        if ($li != null) parentCheckAll($li);

        //重置全选按钮
        this.cb_checkAll.checked = true;
        this.cb_checkAll.reset();
        this.ui.find(".contentArea ul li").each(function (index, item) {
            if (!$(item).data("checkBox").checked) {
                _this.cb_checkAll.checked = false;
                _this.cb_checkAll.reset();
            }
        });
    },

    destroy: function () {
        this.ui.remove();
        this.bg.remove();
    }
}

var editExtBarcode = {
    init: function () {
        var _this = this;

        this.buildFormValidator();

        $("#edit_ext_mainCode_tip").bind("click", function () {
            new pospal.ui.tip({
                target: $("#edit_ext_mainCode_tip"),
                arrow: "down",
                position: {
                    key: "right", value: -10
                },
                content: "主条码用于各种操作界面及报表展示",
                width: 230
            });
        })

        var exBarcodeCountLimit = 20;
        if (secondIndustryNumber == "10101" || pospal.tool.contains([106, 110, 116, 101, 111], pospal.website.industryNumber)) {
            exBarcodeCountLimit = 50;
        }
        $("#productExtBarcodesDiv .add").bind("click", function () {
            if (_this.buildExtBarcodes().length >= exBarcodeCountLimit) {
                new pospal.ui.msgBox({ content: lang.tryFormat("最多支持X个扩展条码", [exBarcodeCountLimit]) });
                return false;
            }
            _this.createOptionUI(null, true);
        });

        $("#productExtBarcodesDiv .popupClose,#productExtBarcodesDiv .btnCancel").bind("click", function () {
            _this.hide();
        });

        $("#productExtBarcodesDiv .btnSave").bind("click", function () {
            _this.save();
        });
    },

    hide: function () {
        $("#popupBg,#productExtBarcodesDiv").hide();
    },

    show: function () {
        this.resetUI();
        $("#popupBg,#productExtBarcodesDiv").show();
    },

    buildFormValidator: function () {
        var formItems = [];
        formItems.push({
            key: "barcode", ele: $("#edit_ext_mainCode"), rules: [{
                type: "required", msg: "主条码必填"
            }, {
                type: "isValidBarcode", msg: "条码规则错误"
            }]
        });

        var opts = {
        };
        opts.formItems = formItems;
        this.formValidator = new pospal.formValidator(opts);
        this.formValidator.keyChart = function (v) { return !/<|>/.test(v); }
    },

    resetUI: function () {
        this.formValidator.cleanMsg();
        $("#productExtBarcodesDiv input").val("");
        $("#productExtBarcodesDiv .extBarcodeList").empty();
    },

    bindData: function (mainBarcode, extBarcodes, isNew) {
        var _this = this;
        $("#edit_ext_mainCode").val(mainBarcode);
        if (isNew)
            $("#edit_ext_mainCode").removeAttr("readonly");
        else
            $("#edit_ext_mainCode").attr("readonly", "readonly");

        if (extBarcodes.length == 0) {
            _this.createOptionUI("", false, true);
        }
        for (var i = 0; i < extBarcodes.length; i++) {
            _this.createOptionUI(extBarcodes[i], false);
        }
    },

    createOptionUI: function (extBarcode, needFocus, isDefault) {
        var _this = this;
        var $list = $("#productExtBarcodesDiv .extBarcodeList");
        var $div = $('<div/>').addClass("item editInput").appendTo($list);
        $("<label/>").html("扩展条码:").appendTo($div);
        var $input = $('<input class="edit_txt ext_barcode" type="text" value="' + (extBarcode || '') + '" maxlength="32">').appendTo($div);
        $input.keyup(function () {
            if ($(this).val().trim().length > 0) {
                $(this).siblings(".btnNumber").hide();
            } else {
                $(this).siblings(".btnNumber").show();
            }
        });
        if (!isDefault) {
            $("<div class='clearTextRed'></div>").bind("click", function () {
                $div.remove();
            }).appendTo($div);
        }
        var $btnCreateBarcode = $('<div class="btnNumber">生成</div>').bind("click", function () {
            _this.createBarcode(this);
        }).appendTo($div);

        if (extBarcode)
            $btnCreateBarcode.hide();
        else
            $btnCreateBarcode.show();

        if (needFocus) $div.find("input.ext_barcode").select();
    },

    createBarcode: function (btn) {
        pospal.ajax({
            url: "/Product/CreateBarcode",
            data: {
            },
            success: function (result) {
                if (result.successed) {
                    $(btn).siblings(".ext_barcode").val(result.barcode);
                    $(btn).hide();
                }
            },
            complete: function () { }
        });
    },

    buildExtBarcodes: function () {
        var extBarcodes = [];
        $("#productExtBarcodesDiv .extBarcodeList").find("div.item").each(function (index, item) {
            var extBarcode = $(item).find("input.ext_barcode").val().trim();
            extBarcodes.push(extBarcode);
        });

        return extBarcodes;
    },

    checkExtBarcodes: function () {
        var isVaild = true;
        var _this = this;
        var extBarcodes = [];
        var mainBarcode = $("#edit_ext_mainCode").val().trim();
        this.formValidator.cleanMsg();
        $("#productExtBarcodesDiv .extBarcodeList").find("div.item").each(function (index, item) {
            var extBarcode = $(item).find("input.ext_barcode").val().trim();
            _this.formValidator.delErrorMsg($(item));
            if (extBarcode == "") {
                _this.formValidator.buildErrorMsg($(item), "扩展条码不能为空");
                isVaild = false;
                return false;
            }
            else if (!_this.formValidator.isValidBarcode(extBarcode)) {
                _this.formValidator.buildErrorMsg($(item), "扩展条码格式错误");
                isVaild = false;
                return false;
            }
            else if (mainBarcode == extBarcode) {
                _this.formValidator.buildErrorMsg($(item), "扩展条码不能和主条码重复");
                isVaild = false;
                return false;
            }
            else if (extBarcodes.indexOf(extBarcode) > -1) {
                _this.formValidator.buildErrorMsg($(item), "条码已添加，不能重复");
                isVaild = false;
                return false;
            }
            else {
                extBarcodes.push(extBarcode);
            }
        });
        return isVaild;
    },
    checkExtBarcodesInDb: function () {
        var _this = this;
        var userId = userSelector.getSelectedValue();
        _this.isInDb = false;
        var doing = new pospal.ui.loading($("#productExtBarcodesDiv"));
        var extBarcodes = [];
        $("#productExtBarcodesDiv .extBarcodeList").find("div.item").each(function (index, item) {
            var extBarcode = $(item).find("input.ext_barcode").val().trim();
            extBarcodes.push(extBarcode);
        });
        if (canExtBarcodeRepeat) return null;
        var dtd = pospal.ajax({
            url: "/Product/ValidExtBarcode",
            data: {
                "userId": userId,
                "extBarcodes": JSON.stringify(extBarcodes),
                "productBarcode": $("#editArea").data("id") == "0" ? "" : $("#edit_ext_mainCode").val().trim()
            },
            success: function (result) {
                if (result.successed) {
                    $("#productExtBarcodesDiv .extBarcodeList").find("div.item").each(function (index, item) {
                        var extBarcode = $(item).find("input.ext_barcode").val().trim();
                        if ((result.extBarcodes || []).indexOf(extBarcode) > -1) {
                            _this.formValidator.buildErrorMsg($(item), "条码已添加，不能重复");
                            _this.isInDb = true;
                        }
                    });
                }
            },
            complete: function () {
                doing.destroy();
            }
        });
        return dtd;
    },
    save: function () {
        var _this = this;
        if (this.formValidator.isValid() && this.checkExtBarcodes()) {
            var dtd = _this.checkExtBarcodesInDb();
            $.when(dtd).then(function () {
                if (_this.isInDb) return;

                var extBarcodes = _this.buildExtBarcodes();
                if (extBarcodes.length == 0) {
                    new pospal.ui.msgBox("请添加至少一项扩展条码");
                    return;
                }

                $("#editArea").data("productExtBarcodes", extBarcodes);
                $("#edit_barcode").val($("#edit_ext_mainCode").val().trim());
                editProduct.changeHasExtBarcode();
                _this.hide();
            });
        }
    }
}

var productSelectorApp = {
    init: function (opt) {
        var _this = this;

        this.queryApp = new pospal.ui.app({
            el: "#queryProducts .popupTitle",
            data: {
                categoryOpt: {
                    textWidth: 140,
                    selectBoxWidth: 180,
                    options: [{
                        text: "全部分类", value: ""
                    }],
                    _compiled: function (app, inst) {
                        app.ddl_category = inst;
                    }
                }
            },
            methods: {
                keydownEnter: function (event) {
                    if (event.keyCode == 13) { _this.loadList(); }
                },
                search: function () { _this.loadList(); },
                close: function () {
                    _this.hide();
                }
            }
        });
        this.queryApp.init();

        $(document).on("click", "#queryProductTable .cb_productOption", function () {
            var rowObj = JSON.parse($(this).parent().find("input[name=json]").val());
            if ($(this).prop("checked")) {
                _this.selected.push(rowObj);
            }
            else {
                var index = pospal.inArray(_this.selected, "barcode", rowObj.barcode);
                if (index > -1) _this.selected.splice(index, 1);
            }
        });

        this.buildBlankRows();
    },

    updateSelector: function (userId) {
        var _this = this;
        if (userId == this.userId) return;
        this.userId = userId;

        pospal.ajax({
            url: "/Category/LoadCategoryDDLJson",
            data: {
                "userId": userId,
                "withMnemonicCode": true,
                "withCashierCategoryDisable": true
            },
            success: function (result) {
                if (result.successed) {
                    var options = pospal.buildCategoryOptions(result.categorys);
                    options.unshift({ text: "全部分类", value: "" });
                    _this.queryApp.ddl_category.update(options);
                }
            },
            complete: function () { }
        });
    },

    loadList: function () {
        var _this = this;
        var $keyword = $("#queryProducts").find("[p-model=keyword]");
        var categoryUids = this.queryApp.ddl_category.getSelectedSubOptionValues();
        var keyword = $keyword.val().trim();

        if (categoryUids.length == 0 && keyword.length == 0) {
            new pospal.ui.msgBox("请输入条码/拼音码/名称");
            $keyword.select();
            return false;
        }

        var loading = new pospal.ui.loading($("#queryProducts"));
        pospal.ajax({
            url: "/Product/LoadEnableProductsWithUnit",
            data: {
                userId: this.userId, categorysJson: JSON.stringify(categoryUids), keyword: keyword, withCategoryName: true, withProductTag10006: true, forSelectSpec: true
            },
            success: function (result) {
                if (result.successed) {
                    var products = $.map(result.products, function (e) {
                        var p = {
                        }; $.each("uid name categoryName barcode attribute6 buyPrice sellPrice sellPrice2 stock productUnitExchangeList".split(" "), function (i, k) { p[k] = e[k]; }); return p;
                    });
                    $.each(products, function (i, p) {
                        var unit = $.grep(p.productUnitExchangeList, function (e) {
                            return e.isBase == 1;
                        });
                        if (unit.length == 0) unit = [{
                            productUnitName: "无", productUnitTxtUid: ""
                        }];
                        p.baseUnitName = unit[0].productUnitName;
                        p.baseUnitUid = unit[0].productUnitTxtUid;

                        if ($.inArray(p.barcode, _this.constBarcodes) > -1) p.hasSelect0 = true;
                        if (pospal.inArray(_this.selected, "barcode", p.barcode) > -1) p.hasSelect = true;
                    });
                    $("#queryProductTable tbody").html(template("queryProductTemplate", {
                        list: products
                    }));
                    if (products.length == 0) {
                        $keyword.select();
                    } else {
                        $("#queryProducts .contentArea").mCustomScrollbar();
                        setTimeout(function () { layout.fixedTableHeader($("#queryProductTable")) }, 1);
                    }
                }
            },
            complete: function () {
                loading.destroy();
            }
        });
    },

    hide: function () {
        $("#popupBg,#queryProducts").hide();
        this.dtd.resolve(this.selected);
    },

    show: function (barcodes) {
        this.reset();
        this.constBarcodes = barcodes;
        this.dtd = $.Deferred();
        $("#popupBg,#queryProducts").show();
        $("#queryProducts .contentArea").mCustomScrollbar();
        setTimeout(function () { layout.fixedTableHeader($("#queryProductTable")) }, 1);
        return this.dtd;
    },

    buildBlankRows: function () {
        new pospal.ui.buildBlankRows({ tableContainer: $("#queryProducts .contentArea"), rowClass: "inValid", colNum: $("#queryProductTable thead th").length });
    },

    reset: function () {
        this.constBarcodes = [];
        this.selected = [];
        $("#queryProductTable tbody").html("");
        this.buildBlankRows();
    }
};

var supplierRangeManager = {
    init: function () {
        var _this = this;

        $("#editSupplierRangeDiv .popupClose").bind("click", function () {
            _this.hide();
        });

        $("#editSupplierRangeDiv .btnSave").bind("click", function () {
            _this.save();
        });

        $("#editSupplierRangeDiv .btnSubmit").bind("click", function () {
            _this.filterOption();
        });

        $("#editSupplierRangeDiv .textInput").keydown(function () {
            if (event.keyCode == 13) {
                _this.filterOption();
            }
        });

        this.$table = $("#editSupplierRangeDiv table");

        this.cb_checkAll = new pospal.ui.checkBox({
            container: $('#editSupplierRangeDiv .cb_checkAll'),
            clickCallBack: function () {
                var checked = _this.cb_checkAll.checked;
                if (checked)
                    $("#editSupplierRangeDiv .cb_checkAll").addClass("on");
                else
                    $("#editSupplierRangeDiv .cb_checkAll").removeClass("on");

                _this.$table.find("td.auth").each(function (index, item) {
                    if ($(item).parents("tr").is(':visible')) {
                        var checkBox = $(item).data("checkBox");
                        checkBox.checked = checked;
                        checkBox.reset();
                    }
                });
                _this.recountSelectedSupplierNum();
            }
        });

        $("#btnSupplierRanges").bind("click", function () {
            _this.show();
        });
    },

    show: function (staffUid, operateType) {
        var _this = this;

        $("#editSupplierRangeDiv .textInput").val('');
        this.selectedSuppliers = $("#btnSupplierRanges").data("selectedSuppliers");
        this.buildUIList();
        this.isCheckAll();
        this.recountSelectedSupplierNum();
        $("#editSupplierRangeDiv,#popupBg").show();
        layout.fixedTableHeader($("#editSupplierRangeDiv table"));
    },

    hide: function () {
        $("#editSupplierRangeDiv,#popupBg").hide();
    },

    buildUIList: function () {
        var _this = this;
        var $tbody = this.$table.find("tbody").empty();
        for (var i = 0; i < storeSupplierOptions.length; i++) {
            var supplier = storeSupplierOptions[i];
            var index = pospal.findIndex(_this.selectedSuppliers, function (it) { return it.supplierUid == supplier.uid });
            if (index > -1) {
                var $tr = $("<tr/>").addClass("added").attr("data-supplierUid", supplier.uid).attr("data-supplierName", supplier.originalName || supplier.name).attr("data-supplierNumber", supplier.number).appendTo($tbody);
                var $td = $("<td/>").addClass("auth tdAlignCenter").html('<div style="width:20px; margin-left: 22px;"></div>').appendTo($tr);
                var $checkBox = new pospal.ui.checkBox({
                    container: $td.find("div"),
                    value: $td.parent().attr("data-supplierUid"),
                    checked: index > -1 ? true : false,
                    clickCallBack: function () {
                        var $tr = $(this.opts.container).parents("tr");
                        var sbBox = $tr.find("td.sbBox").data("sbBox");
                        if (this.checked) {
                            var selectedSuppliers = _this.buildSelectedSuppliers();
                            if (selectedSuppliers.length == 1 && selectedSuppliers[0].supplierUid == $tr.attr("data-supplierUid")) sbBox.set(1);
                        }
                        else {
                            sbBox.set(0);
                        }
                        _this.isCheckAll();
                        _this.recountSelectedSupplierNum();
                    }
                });
                $td.data("checkBox", $checkBox);
                $("<td/>").html(supplier.number).appendTo($tr);
                $("<td/>").html(supplier.originalName || supplier.name).appendTo($tr);

                var $td_sb = $("<td/>").addClass("sbBox tdAlignRight").html('<div style="width:44px;margin:0;margin-right: 8px;float:right;"></div>').appendTo($tr);
                var $sbBox = new pospal.ui.switchBox({
                    container: $td_sb.find("div"),
                    selectedValue: index > -1 ? (_this.selectedSuppliers[index].isDefault || 0) : 0,
                    options: [{ text: "是", value: "1" }, { text: "否", value: "0" }],
                    clickCallBack: function () {
                        var $tr = $(this.opts.container).parents("tr");
                        var checkBox = $tr.find("td.auth").data("checkBox");
                        var isDefault = this.getSelectedValue();
                        if (isDefault == 1) {
                            if (checkBox.checked == false) {
                                var selectedSuppliers = _this.buildSelectedSuppliers();
                                //未设置默认供货商直接勾选
                                var defaultIndex = -1;
                                $.each(selectedSuppliers, function (index, supplier) {
                                    if (supplier.isDefault == "1") {
                                        defaultIndex = index;
                                        return false;
                                    }
                                })
                                if (defaultIndex == -1) {
                                    checkBox.checked = true;
                                    checkBox.reset();
                                    _this.recountSelectedSupplierNum();
                                }
                                else {
                                    new pospal.ui.msgBox("请先勾选该供货商");
                                    this.set(0);
                                    return;
                                }
                            }
                            _this.toggleDefualt($tr.attr("data-supplierUid"));
                        }
                    }
                });
                $td_sb.data("sbBox", $sbBox);
            }
        }

        for (var i = 0; i < storeSupplierOptions.length; i++) {
            var supplier = storeSupplierOptions[i];
            var index = pospal.findIndex(_this.selectedSuppliers, function (it) { return it.supplierUid == supplier.uid });
            if (index > -1) continue;

            var $tr = $("<tr/>").addClass("added").attr("data-supplierUid", supplier.uid).attr("data-supplierName", supplier.originalName || supplier.name).attr("data-supplierNumber", supplier.number).appendTo($tbody);
            var $td = $("<td/>").addClass("auth tdAlignCenter").html('<div style="width:20px; margin-left: 22px;"></div>').appendTo($tr);
            var $checkBox = new pospal.ui.checkBox({
                container: $td.find("div"),
                value: $td.parent().attr("data-supplierUid"),
                checked: index > -1 ? true : false,
                clickCallBack: function () {
                    var $tr = $(this.opts.container).parents("tr");
                    var sbBox = $tr.find("td.sbBox").data("sbBox");
                    if (this.checked) {
                        var selectedSuppliers = _this.buildSelectedSuppliers();
                        if (selectedSuppliers.length == 1 && selectedSuppliers[0].supplierUid == $tr.attr("data-supplierUid")) sbBox.set(1);
                    }
                    else {
                        sbBox.set(0);
                    }
                    _this.isCheckAll();
                    _this.recountSelectedSupplierNum();
                }
            });
            $td.data("checkBox", $checkBox);
            $("<td/>").html(supplier.number).appendTo($tr);
            $("<td/>").html(supplier.originalName || supplier.name).appendTo($tr);

            var $td_sb = $("<td/>").addClass("sbBox tdAlignRight").html('<div style="width:44px;margin:0;margin-right: 8px;float:right;"></div>').appendTo($tr);
            var $sbBox = new pospal.ui.switchBox({
                container: $td_sb.find("div"),
                selectedValue: index > -1 ? (_this.selectedSuppliers[index].isDefault || 0) : 0,
                options: [{ text: "是", value: "1" }, { text: "否", value: "0" }],
                clickCallBack: function () {
                    var $tr = $(this.opts.container).parents("tr");
                    var checkBox = $tr.find("td.auth").data("checkBox");
                    var isDefault = this.getSelectedValue();
                    if (isDefault == 1) {
                        if (checkBox.checked == false) {
                            var selectedSuppliers = _this.buildSelectedSuppliers();
                            //未设置默认供货商直接勾选
                            var defaultIndex = -1;
                            $.each(selectedSuppliers, function (index, supplier) {
                                if (supplier.isDefault == "1") {
                                    defaultIndex = index;
                                    return false;
                                }
                            })
                            if (defaultIndex == -1) {
                                checkBox.checked = true;
                                checkBox.reset();
                                _this.recountSelectedSupplierNum();
                            }
                            else {
                                new pospal.ui.msgBox("请先勾选该供货商");
                                this.set(0);
                                return;
                            }
                        }
                        _this.toggleDefualt($tr.attr("data-supplierUid"));
                    }
                }
            });
            $td_sb.data("sbBox", $sbBox);
        }
    },

    filterOption: function () {
        var keyword = $("#editSupplierRangeDiv .textInput").val().trim();
        this.$table.find("tr.added").each(function (index, item) {
            var name = $(item).attr("data-supplierName");
            var number = $(item).attr("data-supplierNumber");
            if (!keyword || name.indexOf(keyword) > -1 || number.indexOf(keyword) > -1) {
                $(item).show();
            } else {
                $(item).hide();
            }
        });

        this.isCheckAll();
    },

    toggleDefualt: function (selectedUid) {
        this.$table.find("td.sbBox").each(function (index, item) {
            var $sbBox = $(item).data("sbBox");
            var supplierUid = $(item).parent().attr("data-supplierUid");
            if (supplierUid != selectedUid) {
                $sbBox.set("0");
            }
        });
    },

    isCheckAll: function () {
        var checkAll = true;
        var checkedNum = 0;
        this.$table.find("td.auth").each(function (index, item) {
            var checkBox = $(item).data("checkBox");
            if ($(item).parents("tr").is(':visible')) {
                if (checkBox.checked) {
                    checkedNum++;
                }
                else {
                    checkAll = false;
                    return false;
                }
            }
        });

        var checked = checkAll && checkedNum != 0;
        if (checked)
            $('#editSupplierRangeDiv .cb_checkAll').addClass("on");
        else
            $('#editSupplierRangeDiv .cb_checkAll').removeClass("on");

        this.cb_checkAll.checked = checked;
        this.cb_checkAll.reset();
    },

    recountSelectedSupplierNum: function () {
        var supplierNum = 0;
        this.$table.find("td.auth").each(function (index, item) {
            var checkBox = $(item).data("checkBox");
            if (checkBox.checked) supplierNum++;
        });

        $("#editSupplierRangeDiv .bindSupplierNum").html(supplierNum);
    },

    buildSelectedSuppliers: function () {
        var selectedSuppliers = [];
        this.$table.find("td.auth").each(function (index, item) {
            var checkBox = $(item).data("checkBox");
            if (checkBox.checked) {
                var range = {};
                range.supplierUid = $(item).parent().attr("data-supplierUid");
                range.supplierName = $(item).parent().attr("data-supplierName");
                var $sbBox = $(item).parent().find(".sbBox").data("sbBox");
                range.isDefault = $sbBox.getSelectedValue();
                selectedSuppliers.push(range);
            }
        });
        return selectedSuppliers;
    },
    save: function () {
        var _this = this;

        var selectedSuppliers = _this.buildSelectedSuppliers();

        if (selectedSuppliers.length > 0) {
            var defaultSupplierNum = 0;
            $(selectedSuppliers).each(function (index, item) {
                if (item.isDefault == 1) defaultSupplierNum++;
            });
            if (defaultSupplierNum == 0) {
                new pospal.ui.msgBox("请设置商品默认供货商");
                return;
            }

            if (defaultSupplierNum > 1) {
                new pospal.ui.msgBox("商品默认供货商只能设置一个");
                return;
            }
        }

        $("#btnSupplierRanges").data("selectedSuppliers", selectedSuppliers).find("span").html(selectedSuppliers.length);
        editProduct.changeSupplierRangeLabel();
        _this.hide();
    }
}

var editStockPositionObjApp = {
    init: function () {
        var that = this;
        var $el = this.$el = $("#editStockPositionObjDiv");
        this.$bg = $("#popupBg");

        $el.find(".popupClose").click(function () {
            that.hide();
        });

        $el.find(".js_ok").click(function () {
            var data = that.buildData();
            that.dtd.resolve(data);
            that.hide();
        });

        $el.on("click", ".js_go_StockPositionRule", function (event) {
            pospal.openPage('/ProductExt/StockPositionRule', true);
        })
    },

    loadData: function (userId) {
        var that = this;
        var doing = new pospal.ui.loading(this.$el);
        pospal.ajax({
            url: "/ProductExt/ListDdlStockPositionRule",
            data: { userId: userId },
            success: function (result) {
                if (result.successed) {
                    that.renderView(result);
                } else {
                    new pospal.ui.msgBox({ content: result.msg, autoCloseSec: 0 });
                }
            },
            complete: function () {
                doing.destroy();
            }
        });
    },

    show: function (userId, data) {
        this.dtd = $.Deferred();
        this.data = data;
        this.result = null;
        this.loadData(userId);
        this.$bg.show();
        this.$el.show();
        return this.dtd;
    },

    hide: function () {
        this.$bg.hide();
        this.$el.hide();
    },

    renderView: function (result) {
        var data = this.data;
        this.result = result;
        listTool.initArray(result.list);
        this.$el.find(".popupAreaCenter").html(template("editStockPositionObjTemplate", { list: result.list }));
        this.$el.find(".js_ddl").each(function (i, ddl) {
            var $ddl = $(ddl);
            var k = parseInt($ddl.parent().attr("data-k"));
            var item = result.list.get(k);
            var options = [{ text: "请选择", value: "" }].concat(item.ValueRangeList.map(function (it) { return { text: it.value, value: it.value }; }));

            item.ctrl = new pospal.ui.singleSelector({
                container: $ddl,
                textWidth: 240,
                selectBoxWidth: 216,
                options: options
            });
        });
        if (this.data) {
            for (var k in data) {
                var item = pospal.tool.find(result.list, function (it) { return it.parameterName == k; });
                if (item && item.ctrl) {
                    item.ctrl.setSelectedValue(data[k]);
                }
            }
        }
    },

    buildData: function () {
        var model = {};

        this.result.list.forEach(function (item) {
            if (item.ctrl) {
                var v = item.ctrl.getSelectedValue();
                if (v) {
                    model[item.parameterName] = v;
                }
            }
        });
        var newString = this.toFormula(model);
        return { newVal: model, newString: newString };
    },

    toFormula: function (model) {
        var formula = this.result.formula;
        if (!formula || jQuery.isEmptyObject(model)) return "";
        for (var k in model) {
            formula = formula.replace('{' + k + '}', model[k]);
        }
        formula = formula.replace(/\{[^}]+\}/g, '');
        return formula;
    }
}

var standardProductSelector = {
    init: function () {
        var _this = this;

        $(".btnImportMatchProduct").click(function () {
            var notified = localStorage.getItem("standardProductNotifed");
            if (notified && notified == "1") {
                _this.show();
            }
            else {
                $("#toStadardProductDiv").data("action", "1");
                $("#popupBg,#toStadardProductDiv").show();
            }
        });

        this.radioBox = new pospal.ui.radioBox({
            container: $('#standardProductSelector .radioBox'),
            text: "扫码模式",
            checked: false
        });

        $("#standardProductTable").on("keyup", "input[tab-index]", function () {
            var tabIndex = $(this).attr("tab-index").split('-');
            var rowIdex = parseInt(tabIndex[0]);
            var colIndex = parseInt(tabIndex[1]);

            if (event.keyCode == 38) {
                $("#standardProductTable").find("input[tab-index=" + (rowIdex - 1) + "-" + colIndex + "]").select();
            } else if (event.keyCode == 40) {
                $("#standardProductTable").find("input[tab-index=" + (rowIdex + 1) + "-" + colIndex + "]").select();
            } else if (event.keyCode == 37) {
                $("#standardProductTable").find("input[tab-index=" + rowIdex + "-" + (colIndex - 1) + "]").select();
            } else if (event.keyCode == 39) {
                $("#standardProductTable").find("input[tab-index=" + rowIdex + "-" + (colIndex + 1) + "]").select();
            }
        });

        $("#standardProductSelector .txt_serarch").keyup(function (event) {
            if (event.keyCode == 13) {
                _this.findProduct(true);
            }
        });

        $("#standardProductSelector .btnSearch").click(function () {
            _this.findProduct(true);
        })

        $("#standardProductSelector .btnSave").click(function () {
            _this.save();
        })

        $("#standardProductSelector .btnCancel,#standardProductSelector .popupClose").click(function () {
            _this.hide();
        })

        $("#standardProductSelector .selectAllPO").click(function () {
            _this.clickSelectAllPO(this);
        });

        this.formValidator = new pospal.formValidator();
        this.formValidator.keyChart = function (v) { return !/<|>/.test(v); }
    },

    show: function () {
        var _this = this;
        $("#standardProductSelector .selectAllPO").prop("checked", false);
        $("#standardProductSelector .txt_serarch").val('');
        $("#standardProductTable tbody").empty();
        this.buildBlankRows();
        $("#standardProductSelector .contentArea").mCustomScrollbar("update");
        setTimeout(function () { layout.fixedTableHeader($("#standardProductTable")) }, 1);
        $("#popupBg,#standardProductSelector").show();
        this.loadDraft();
    },

    hide: function (delay) {
        $("#popupBg,#standardProductSelector").hide();
        clearInterval(this.intervalFunc);
    },

    clickSelectAllPO: function (e) {
        var _this = this;

        var allChecked = $(e).prop("checked");
        $("#standardProductSelector .PO").each(function () {
            $(this).prop("checked", allChecked);
        });
    },

    checkSelectedAll: function () {
        var allChecked = true;
        $("#standardProductSelector .PO").each(function () {
            if (!$(this).prop("checked")) {
                allChecked = false;
                return false;
            }
        });
        $("#standardProductSelector .selectAllPO").prop("checked", allChecked);
    },

    accurateChange: function () {
        if (this.radioBox.checked) {
            $("#standardProductSelector .txt_serarch").select();
        }
    },

    loadDraft: function () {
        var _this = this;
        var doing = new pospal.ui.loading($("#standardProductSelector"));
        pospal.ajax({
            url: "/Eshop/GetMatchProductDraft",
            data: {},
            success: function (result) {
                if (result.successed) {
                    _this.dataKey = result.dataKey;
                    _this.dataValue = null;
                    if (result.dataValue) {
                        _this.dataValue = JSON.parse(result.dataValue);

                        var cc = new pospal.ui.msgBox({
                            boxType: "confirm",
                            content: "系统检测到有未完成的导入商品，是否恢复？",
                            showCloseBtn: false,
                            onConfirm: function () {
                                if (this.confirmValue) {
                                    setTimeout(function () {
                                        cc.mainWrap.hide();
                                        _this.loadProductsByDraft(_this.dataValue);
                                    }, 1);
                                } else {
                                    _this.saveDraftApi(null);
                                }
                                _this.intervalFunc = setInterval(function () { _this.saveDraft() }, 60 * 1000);
                            }
                        });
                    }
                    else {
                        _this.intervalFunc = setInterval(function () { _this.saveDraft() }, 60 * 1000);
                    }
                }
                else {
                    new pospal.ui.msgBox({ content: result.msg, boxType: "toast", autoCloseSec: 1000, onClose: function () { _this.accurateChange(); } });
                }
            },
            complete: function () {
                doing.destroy();
            }
        });
    },

    saveDraft: function (fromBtn) {
        var _this = this;

        var products = this.buildProducts();

        if (products.length == 0) return;
        $.each(products, function (i, item) {
            if (!_this.formValidator.isNumeric(item.stock)) {
                item.stock = 0;
            }

            if (!_this.formValidator.isNumeric(item.price)) {
                item.price = 0;
            }

            if (!_this.formValidator.isNumeric(item.buyPrice)) {
                item.buyPrice = 0;
            }
        });

        var objstr = JSON.stringify(products);
        if (objstr && objstr.length > 60000) {
            objstr = null;
            if (fromBtn) {
                return "草稿太大，无法保存！";
            }
        }
        if (objstr == this.objstr) return;
        this.objstr = null;
        return this.saveDraftApi(objstr);
    },

    saveDraftApi: function (objstr) {
        var _this = this;
        return pospal.ajax({
            url: "/draft/save",
            data: { dataKey: this.dataKey, dataValue: objstr },
            success: function () {
                _this.objstr = objstr;
            }
        });
    },

    loadProductsByDraft: function (draftValue) {
        var _this = this;

        var doing = new pospal.ui.loading($("#standardProductSelector"));
        pospal.ajax({
            url: "/Eshop/LoadMatchProductsByDraft",
            data: { "userId": userSelector.getSelectedValue(), "products": JSON.stringify(draftValue) },
            success: function (result) {
                if (result.successed) {
                    $.each(result.matchProducts, function (index, matchProduct) {
                        _this.appendNewRow(matchProduct);
                    });
                }
                else {
                    new pospal.ui.msgBox({ content: result.msg, boxType: "toast", autoCloseSec: 1000 });
                }
            },
            complete: function () {
                doing.destroy();
            }
        });
    },

    findProduct: function () {
        var _this = this;
        var barcode = $("#standardProductSelector .txt_serarch").val().trim();
        var doing = new pospal.ui.loading($("#standardProductSelector"));
        pospal.ajax({
            url: "/Eshop/GetMatchProductByBarcode",
            data: { barcode: barcode, userId: userSelector.getSelectedValue() },
            success: function (result) {
                if (result.successed) {
                    _this.appendNewRow(result.matchProduct);
                }
                else {
                    new pospal.ui.msgBox({ content: result.msg, boxType: "toast", autoCloseSec: 1000, onClose: function () { _this.accurateChange(); } });
                }
            },
            complete: function () {
                doing.destroy();
            }
        });
    },

    appendNewRow: function (product) {
        var _this = this;

        var row = $("#standardProductTable tr[data='" + product.barcode + "']");
        if (row.length > 0) {
            new pospal.ui.msgBox({ content: "列表中查询商品已存在", boxType: "toast", autoCloseSec: 1000, onClose: function () { _this.accurateChange(); } });
            return;
        }

        $("#standardProductTable tr.blank").remove();
        var index = $("#standardProductTable tr[data]").length;
        var $tr = $("<tr/>").attr("data", product.barcode).appendTo($("#standardProductTable tbody"));
        $('<td class="tdAlignCenter"><input class="PO" type="checkbox" checked /></td>').appendTo($tr);
        $('<td align="center" class="productName tdAlignCenter"><input tab-index="' + index + '-1" type="text" style="width:150px;" class="name quantity textInput" value="' + product.name + '" maxlength="100"></td>').appendTo($tr);
        $('<td class="productBarcode tdAlignLeft">' + product.barcode + '</td>').appendTo($tr);
        $('<td align="center" class="stock tdAlignCenter"><input tab-index="' + index + '-2" type="text" class="stock quantity" value="' + (product.stock || '0') + '" maxlength="8"></td>').appendTo($tr);
        $('<td align="center" class="buyPrice tdAlignCenter"><input tab-index="' + index + '-3" type="text" class="buyPrice quantity" value="' + (product.buyPrice || '0') + '" maxlength="8"></td>').appendTo($tr);
        $('<td align="center" class="sellPrice tdAlignCenter"><input tab-index="' + index + '-4" type="text" class="sellPrice quantity" value="' + (product.price || '0') + '" maxlength="8"></td>').appendTo($tr);
        if (product.imgUrl) {
            var imageUrl = imageDomain + product.imgUrl;
            $('<td class="productImage tdAlignCenter hasData"><img data-caption="' + product.name + '" data-group="stdImage_' + product.barcode + '" data-src="' + imageUrl + '" src="' + imageUrl + '" /></td>').appendTo($tr);
        }
        else {
            $('<td class="productImage tdAlignCenter noData"><img src= "' + (imageDomain + "productImages/0/default_200x200.png") + '" /></td>').appendTo($tr);
        }
        this.bindEvent($tr);
        this.buildBlankRows();
        this.checkSelectedAll();

        this.accurateChange();
    },

    bindEvent: function (row) {
        var _this = this;

        $(row).find("td.hasData img").Magnify({
            Toolbar: [
                'prev',
                'next',
                'actualSize'
            ],
            keyboard: true,
            draggable: false,
            movable: true,
            modalSize: [800, 600],
            beforeOpen: function (obj, data) {
                //$("#popupBg").show();
            },
            opened: function (obj, data) {
                console.log('opened')
            },
            beforeClose: function (obj, data) {
                console.log('beforeClose')
            },
            closed: function (obj, data) {
                //$("#popupBg").hide();
            },
            beforeChange: function (obj, data) {
                console.log('beforeChange')
            },
            changed: function (obj, data) {
                console.log('changed')
            }
        });

        $(row).find(".PO").bind("click", function () {
            _this.checkSelectedAll();
        })
    },

    buildBlankRows: function () {
        new pospal.ui.buildBlankRows({ tableContainer: $("#standardProductSelector .contentArea"), colNum: 7, rowClass: "blank" });
    },

    checkVaild: function () {
        var _this = this;
        var isValid = true;
        $("#standardProductTable .PO").each(function (i, item) {
            var tr = $(item).parents("tr");
            if ($(this).prop("checked") == true) {

                var stock = $(tr).find("input.stock").val().trim();
                if (stock.length == 0) {
                    new pospal.ui.msgBox("第" + (i + 1) + "行请输入商品库存");
                    $(tr).find("input.stock").select();
                    isValid = false;
                    return false;
                }
                else if (!_this.formValidator.isNumeric(stock)) {
                    new pospal.ui.msgBox("第" + (i + 1) + "行商品库存请输入数字");
                    $(tr).find("input.stock").select();
                    isValid = false;
                    return false;
                }

                var sellPrice = $(tr).find("input.sellPrice").val().trim();
                if (sellPrice.length == 0) {
                    new pospal.ui.msgBox("第" + (i + 1) + "行请输入商品售价");
                    $(tr).find("input.sellPrice").select();
                    isValid = false;
                    return false;
                }
                else if (!_this.formValidator.isNumeric(sellPrice)) {
                    new pospal.ui.msgBox("第" + (i + 1) + "行商品售价请输入数字");
                    $(tr).find("input.sellPrice").select();
                    isValid = false;
                    return false;
                }

                var buyPrice = $(tr).find("input.buyPrice").val().trim();
                if (buyPrice.length == 0) {
                    new pospal.ui.msgBox("第" + (i + 1) + "行请输入商品进价");
                    $(tr).find("input.buyPrice").select();
                    isValid = false;
                    return false;
                }
                else if (!_this.formValidator.isNumeric(buyPrice)) {
                    new pospal.ui.msgBox("第" + (i + 1) + "行商品进价请输入数字");
                    $(tr).find("input.buyPrice").select();
                    isValid = false;
                    return false;
                }

                var name = $(tr).find("input.name").val().trim();
                if (name.length == 0) {
                    new pospal.ui.msgBox("第" + (i + 1) + "行请输入商品名称");
                    $(tr).find("input.name").select();
                    isValid = false;
                    return false;
                } else if (!_this.formValidator.keyChart(name)) {
                    new pospal.ui.msgBox("第" + (i + 1) + "行商品名称由于<>符号异常，建议使用括号代替");
                    $(tr).find("input.name").select();
                    isValid = false;
                    return false;
                }
            }
        })

        return isValid;
    },

    buildProducts: function () {
        var products = [];
        $("#standardProductTable .PO").each(function (i, item) {
            var tr = $(item).parents("tr");
            if ($(this).prop("checked") == true) {
                var product = {};
                product.name = $(tr).find("input.name").val().trim();
                product.barcode = $(tr).find(".productBarcode").text().trim();
                product.sellPrice = $(tr).find("input.sellPrice").val().trim();
                product.buyPrice = $(tr).find("input.buyPrice").val().trim();
                product.stock = $(tr).find("input.stock").val().trim();
                products.push(product);
            }
        })

        return products;
    },

    save: function () {
        var _this = this;
        if (this.checkVaild()) {
            var products = this.buildProducts();
            if (products.length == 0) {
                new pospal.ui.msgBox("请选择要导入的标准库商品");
                return;
            }

            var doing = new pospal.ui.loading($("#standardProductSelector"));
            pospal.ajax({
                url: "/Eshop/BatchAddMatchProducts",
                data: { "productsJson": JSON.stringify(products), "userId": userSelector.getSelectedValue() },
                success: function (result) {
                    if (!result.successed) {
                        new pospal.ui.msgBox({
                            content: result.msg,
                            autoCloseSec: 0
                        });
                    } else {
                        new pospal.ui.msgBox("导入标准商品库商品成功");
                        _this.hide();
                        loadProducts();
                    }
                },
                complete: function () {
                    doing.destroy();
                }
            });
        }
    }

}

var editMoreSpecOrder = {
    init: function () {
        var _this = this;

        this.container = $("#moreSpecOrderDiv");

        this.container.on("click", "span.up,span.down", function () {
            var $elem = $(this);
            if ($elem.hasClass("disabled")) return false;
            var directUp = $elem.hasClass("up");
            var $current = $elem.parents("tr.vaild");
            if (directUp) {
                var $prev = $current.prev("tr.vaild");
                if ($prev.length != 0) {
                    $prev.before($current);
                    _this.renderTableUI();
                }
            }
            else {
                var $next = $current.next("tr.vaild");
                if ($next.length != 0) {
                    $next.after($current);
                    _this.renderTableUI();
                }
            }
            return false;
        })

        this.container.find(".popupClose").bind("click", function () {
            _this.hide();
        });

        this.container.find(".btnSave").bind("click", function () {
            _this.save();
        });

        var $tbody = this.container.find("table.resizableFixedHeader tbody");
        $tbody.sortable({
            cursor: 'grabbing',
            items: 'tr.vaild',
            axis: 'y',
            helper: function (e, ui) {
                ui.children().each(function () {
                    $(this).width($(this).width());
                });
                return ui;
            },
            start: function () {

            },
            sort: function (it) {
            },
            stop: function () {
                _this.renderTableUI();
            }
        }).disableSelection();
    },

    show: function () {
        this.buildMoreSpecProductsUI();
        $("#popupBg").show();
        this.container.show();
    },

    hide: function () {
        $("#popupBg").hide();
        this.container.hide();
    },

    buildMoreSpecProductsUI: function () {
        var noStock = editProduct.edit_sb_noStock && editProduct.edit_sb_noStock.getSelectedValue() == "1";
        var hasExchange = editProduct.edit_sb_hasExchange.getSelectedValue() == "1";
        var hasMoreWholesaleSellPrice2 = editProduct.hasMoreWholesaleSellPrice2;
        var specProductOrders = $("#btn_order_spec").data("saveData") || [];
        var products = [];
        products.push(editProduct.buildProduct());
        $("#specListDiv .specItem").each(function (index, item) {
            if (!$(item).is(":hidden")) {
                var product = editProduct.buildProduct();

                if ($(item).attr("data-productid") == "0") {
                    product.barcode = hasExchange ? $(item).find(".item.optional").find(".productBarcode").val().trim() : $(item).find(".item.required").find(".barcode").val().trim();
                    product.attribute6 = $(item).find(".item.required").find(".productSpec").val().trim();
                    product.sellPrice = $(item).find(".item.required").find(".productSellPrice").val().trim();
                    product.buyPrice = $(item).find(".item.required").find(".productBuyPrice").val().trim();
                    if (hasMoreWholesaleSellPrice2) {
                        product.sellPrice2 = $(item).find(".item.required").find(".productSellPrice2").val().trim();
                    }
                    else {
                        product.sellPrice2 = product.sellPrice;
                    }
                    product.stock = $(item).find(".item.required").find(".productStock").val().trim();
                }
                else {
                    product.barcode = $(item).find(".item.middle .barcode").text().trim();
                    product.attribute6 = $(item).find(".item.middle .productSpec").text().trim();
                    product.sellPrice = $(item).find(".item.middle .productSellPrice").text().trim();
                    product.buyPrice = $(item).find(".item.middle .productBuyPrice").text().trim();
                    if (hasMoreWholesaleSellPrice2) {
                        product.sellPrice2 = $(item).find(".item.middle .productSellPrice2").val().trim();
                    }
                    else {
                        product.sellPrice2 = product.sellPrice;
                    }
                    product.stock = $(item).find(".item.middle .productStock").text().trim();
                }

                products.push(product);
            }
        });

        products.sort(function (a, b) {
            var index1 = pospal.findIndex(specProductOrders, function (it) { return it.Barcode.toLowerCase() == a.barcode.toLowerCase(); });
            var index2 = pospal.findIndex(specProductOrders, function (it) { return it.Barcode.toLowerCase() == b.barcode.toLowerCase(); });
            var value1 = index1 == -1 ? Number.MAX_VALUE : index1;
            var value2 = index2 == -1 ? Number.MAX_VALUE : index2;
            return value1 - value2;     // 升序
        })

        this.container.find("table.resizableFixedHeader tbody").html(template("moreSpecOrderProductTemplate", {
            list: products
        }));
        this.renderTableUI();
        this.container.find(".productSellPrice2")[hasMoreWholesaleSellPrice2 ? "show" : "hide"]();
        this.container.find(".productStock")[!noStock ? "show" : "hide"]();
    },

    renderTableUI: function () {
        var length = this.container.find("tr.vaild").length;
        this.container.find("tr.vaild").each(function (index, item) {
            $(item).find(".content").html(index + 1);
            $(item).find(".up,.down").removeClass("disabled");
            if (index == 0) $(item).find(".up").addClass("disabled");
            if (index == length - 1) $(item).find(".down").addClass("disabled");
        })
    },

    buildData: function () {
        var specProductOrders = [];

        $(this.container.find("table.resizableFixedHeader tr.vaild")).each(function (index, item) {
            specProductOrders.push({ "Barcode": $(item).find(".productBarcode").html().trim(), "SpecProductOrder": index + 1 });
        })

        return specProductOrders;
    },

    save: function () {
        var specProductOrders = this.buildData();
        $("#btn_order_spec").data("saveData", specProductOrders);
        this.hide();
    }
}

var editPrinterV2 = {
    init: function () {
        var _this = this;

        this.$container = $("#printerV2ListDiv");

        this.$container.find(".popupClose,.btnCancel").bind("click", function () {
            _this.hide();
        });

        this.$container.find(".btnSave").bind("click", function () {
            _this.save();
        });
    },

    render: function (printerUids, printerSetting) {
        var _this = this;

        var $tbody = this.$container.find(".mainNewTable tbody").empty();
        if (!storePrinters) return;

        for (var i = 0; i < storePrinters.length; i++) {
            var printer = storePrinters[i];

            var model = {};
            model.name = printer.name;
            var printSize = printer.printSize == null ? defaultPrintSize : printer.printSize;
            var printSizeStr = "58mm";
            if (printSize == 1) printSizeStr = "80mm";
            else if (printSize == 2) printSizeStr = "110mm";
            model.printSize = printSizeStr;
            model.printSort = printer.printSort == 1 ? "按商品分类" : "按下单顺序";
            model.printType = "";
            if (printer.printType == 3) {
                model.printType = "一类一切";
            }
            else if (printer.printType == 2) {
                model.printType = "一份一切";
            }
            else if (printer.printType == 0) {
                model.printType = lang.tryGet("一品一切");
            }
            else {
                model.printType = lang.tryGet("一单一切");
            }
            model.portTypeName = "";
            if (printer.portTypeRule) {
                var portTypeObj = JSON.parse(printer.portTypeRule);
                model.portTypeName = portTypeObj.portType == 2 ? "驱动:" : "IP:";
                model.portValue = portTypeObj.portValue;
            }
            var areaNames = [];
            if (!printer.restaurantArea || printer.restaurantArea == '') {
                areaNames.push('全部区域');
            }
            else {
                var restaurantAreaUis = printer.restaurantArea.split(',');
                $.each(restaurantAreaUis, function (rIndex, txtUid) {
                    var restaurantArea = $.grep(restaurantAreas, function (area) { return area.txtUid == txtUid; });
                    if (restaurantArea.length > 0) areaNames.push(restaurantArea[0].name);
                });
            }
            model.areaNames = areaNames.join('、');
            var orderPrintTypeRules = [];
            var orderPrintTypeRuleNames = [];
            if (printer.orderPrintTypeRule && printer.orderPrintTypeRule != '') {
                orderPrintTypeRules = JSON.parse(printer.orderPrintTypeRule);
                $.each(orderPrintTypeRules, function (rIndex, rule) {
                    var orderTypeName = editStorePrinters.orderTypeNames[rule.orderType];
                    var printTypeName = "";
                    if (rule.printType == 3) {
                        printTypeName = "一类一切";
                    }
                    else if (rule.printType == 2) {
                        printTypeName = "一份一切";
                    }
                    else if (rule.printType == 0) {
                        printTypeName = lang.tryGet("一品一切");
                    }
                    else {
                        printTypeName = lang.tryGet("一单一切");
                    }
                    if (rule.orderType == "8" && rule.visible == false) {
                        return true;
                    }
                    orderPrintTypeRuleNames.push({ name: orderTypeName, typeName: printTypeName });
                });
                var posPrintTypeRule = $.grep(orderPrintTypeRules, function (x) { return x.orderType == 8 });
                if (posPrintTypeRule.length == 0) {
                    orderPrintTypeRuleNames.push({ name: editStorePrinters.orderTypeNames[8], typeName: model.printType });
                }
            }
            else {
                orderPrintTypeRuleNames.push({ name: "全部订单类型", typeName: model.printType });
            }
            model.orderPrintTypeRules = orderPrintTypeRuleNames;

            var $tr = $(template("printerV2_Row_Template", model)).appendTo($tbody);

            $tr.find(".timeAddRow").click(function () {
                _this.createNewTimeRow($(this).parents("tr"), null);
            });

            var switchBox = new pospal.ui.switchBox({
                container: $tr.find(".enable div"),
                options: [{ text: "开", value: "1" }, { text: "关", value: "0" }],
                selectedValue: "0",
                clickCallBack: function () {
                }
            });
            $tr.data("switchBox", switchBox);
            $tr.data("printerUid", printer.txtUid);

            if (printerUids) {
                var index = pospal.findIndex(printerUids, function (it) { return it == printer.txtUid });
                if (index > -1) {
                    switchBox.set("1");
                }
            }

            if (printerSetting) {
                var index = pospal.findIndex(printerSetting, function (it) { return it.PrinterUid.toString() == printer.txtUid });
                if (index > -1) {
                    for (var j = 0; j < printerSetting[index].WorkPeriods.length; j++) {
                        _this.createNewTimeRow($tr, printerSetting[index].WorkPeriods[j]);
                    }
                }
            }
        }
    },

    createNewTimeRow: function ($row, item) {
        var $timeRow = $(template("printerV2_timeRow_Template", { "StartTime": (item ? item.StartTime : "09:00"), "EndTime": (item ? item.EndTime : "18:00") })).insertBefore($row.find(".timeAddRow"));
        $timeRow.find(".timeSlidePicker").each(function () {
            $(this).datetimepicker({
                timeFormat: "HH:mm",
                showArrow: false,
                showTime: false,
                showTimepicker: true,
                timeOnly: true,
                showButtonPanel: false,
                showHour: true,
                showMinute: true
            });
        });
        $timeRow.find(".delete").click(function () {
            $timeRow.remove();
        })
    },

    show: function () {
        this.$container.show();
        $("#popupBg").show();
    },

    hide: function () {
        this.$container.hide();
        $("#popupBg").hide();
    },

    save: function () {
        if (this.checkData()) {
            this.hide();
            editProduct.reCountSeletedPrinterNum();
        }
    },

    checkData: function () {
        var errorMsgs = [];
        this.$container.find("tr.vaild").each(function () {
            var $tr = $(this);
            if ($tr.data("switchBox").getSelectedValue() == "1") {
                var printerName = $tr.attr("data-printerName");
                $tr.find(".timeRow").each(function () {
                    var $timeRow = $(this);
                    var startTime = $timeRow.find("input.timeSlidePicker").eq(0).val().trim();
                    var endTime = $timeRow.find("input.timeSlidePicker").eq(1).val().trim();
                    if (startTime == "" || endTime == "") {
                        errorMsgs.push(lang.tryFormat("小票机X生效时间设置", [printerName]));
                    }
                    else if (endTime <= startTime) {
                        errorMsgs.push(lang.tryFormat("小票机X生效时间校验", [printerName]));
                    }
                });
            }
        });
        if (errorMsgs.length == 0) {
            return true;
        }
        else {
            var msgBox = new pospal.ui.msgBox({ boxType: "html", content: errorMsgs.join('<br />'), autoCloseSec: 0 });
            msgBox.mainWrap.find(".popupAreaCenter").css("padding-top", "20px");
            msgBox.mainWrap.find(".popupArea").height(180);
            msgBox.mainWrap.find(".popupArea").mCustomScrollbar();
            return false;
        }
    },

    getData: function () {
        var printerUids = [];
        var printerSetting = [];
        this.$container.find("tr.vaild").each(function () {
            var $tr = $(this);
            if ($tr.data("switchBox").getSelectedValue() == "1") {
                var printerUid = $tr.data("printerUid");
                printerUids.push(printerUid);

                var workPeriods = [];
                $tr.find(".timeRow").each(function () {
                    var $timeRow = $(this);
                    workPeriods.push({
                        "StartTime": $timeRow.find("input.timeSlidePicker").eq(0).val().trim(),
                        "EndTime": $timeRow.find("input.timeSlidePicker").eq(1).val().trim(),
                    });
                });
                if (workPeriods.length > 0) {
                    printerSetting.push({ "PrinterUid": printerUid, "WorkPeriods": workPeriods });
                }
            }
        });
        return { printerUids, printerSetting };
    }
}

var tasteApp = {

    sureInit: function () {
        if (this.inited) return;
        var that = this;
        this.inited = 1;
        this.$el = $("#tasteList");

        this.$el.find(".btnShowEditTasteDiv").bind("click", function () {
            window.location.href = "/product/Tastes";
        });

        this.$el.find(".popupClose").click(function () {
            that.hide()
        });
    },

    show: function () {
        this.sureInit();
        var viewList = $.extend(true, [], editProduct.viewModel.TasteMappingList);
        listTool.initArray(viewList);
        this.viewList = viewList;
        this.tasteGroupList = $.extend(true, [], tastegroupsWithtastes);
        listTool.initArray(this.tasteGroupList);

        this.$el.show();
        $("#popupBg").show();
        this.renderHtml();
    },

    hide: function () {
        var that = this;
        var list = $.extend(true, [], this.viewList);
        list.forEach(function (it) { return delete it._id; })
        editProduct.viewModel.TasteMappingList = list;
        this.$el.hide();
        $("#popupBg").hide();
        editProduct.buildTasteUI();
    },

    renderHtml: function () {
        var that = this;

        var $table = this.$el.find(".tasteTable").empty();
        this.$el.find(".checkAllDiv").empty();
        this.tasteGroupList.forEach(function (group, gindex) {
            group.productAttributes = group.productAttributes || [];
            var $tr = $("<tr/>").appendTo($table).attr("data-k", group._id);
            var ctrlBag = {};

            //口味组
            var $td = $("<td/>").appendTo($tr);
            ctrlBag.cb_tasteGroup = new pospal.ui.checkBox({
                container: $("<div/>").appendTo($td),
                text: group.packageName,
                checked: false,
                value: group.txtUid,
                clickCallBack: function () {
                    var vals = ctrlBag.cb_tasteGroup.checked ? group.productAttributes.map(function (it) { return it.txtUid; }) : [];
                    that.changeValue(vals, group);
                    that.dataToHtml("cb_tasteGroup");
                }
            });

            var upArrow = "down";
            if (gindex > 7 && gindex + 5 > tastegroupsWithtastes.length) {
                upArrow = "up";
            }

            //口味
            var $td_taste = $("<td><div class='is-new'></div></td>").appendTo($tr);
            ctrlBag.ddl_taste = new pospal.ui.multipleSelector({
                title: function () {
                    var selected = this.getSelectedOptions();
                    var len = selected.length;
                    return "已选 {len} 个口味".replace('{len}', len);
                },
                container: $td_taste.find("div"),
                textWidth: 180,
                selectBoxWidth: 208,
                arrow: upArrow,
                autoClose: true,
                options: $.map(group.productAttributes, function (n) { return { "text": n.attributeName, "value": n.txtUid } }),
                closeButton: {
                    text: "关闭",
                    onClose: function () {
                        var vals = ctrlBag.ddl_taste.getSelectedValues();
                        that.changeValue(vals, group);
                        that.dataToHtml("ddl_taste");
                    }
                }
            });

            var $defaultTasteTd = $("<td/>").appendTo($tr);
            var ddl_suggest = ctrlBag.ddl_suggest = new pospal.ui.singleSelector({
                container: $("<div class='is-new'/>").appendTo($defaultTasteTd),
                textWidth: 180,
                selectBoxWidth: 184,
                arrow: upArrow,
                options: [{ "text": "无", "value": "" }],
                onChange: function () {
                    var val = ddl_suggest.ui.find(".optionDiv li[optionvalue].selected").attr("optionvalue");
                    tasteApp.setSuggestUid(group.txtUid, val);
                }
            });

            group.ctrls = ctrlBag;
        });
        that.cb_checkAllTaste = new pospal.ui.checkBox({
            container: $("<div/>").appendTo(this.$el.find(".checkAllDiv")),
            text: '口味组',
            clickCallBack: function () {
                if (that.cb_checkAllTaste.checked) {
                    var addList = [];
                    that.tasteGroupList.forEach(function (group) {
                        group.productAttributes.forEach(function (pa) {
                            var index = pospal.tool.findIndex(that.viewList, function (it) { return it.productAttributeUid == pa.txtUid });
                            if (index == -1) {
                                addList.push(that.toMapping(group, pa));
                            }
                        })
                    });
                    that.viewList.addRange(addList);
                } else {
                    that.viewList.length = 0;
                }
                that.dataToHtml("cb_checkAllTaste");
            }
        });
        that.dataToHtml();
        new pospal.ui.buildBlankRows({ tableContainer: this.$el.find(".contentArea"), rowClass: "inValid" });
    },

    changeValue: function (vals, group) {
        var that = this;
        var list = vals.map(function (it) { return { productAttributeUid: it } })
        var dbList = that.viewList.filter(function (m) { return m.PackageUid == group.txtUid });
        var compareResult = pospal.tool.compareList(list, dbList, function (a, b) { return a.productAttributeUid == b.productAttributeUid });
        compareResult.delList.forEach(function (dbItem) { that.viewList.remove(dbItem._id); });
        var addList = compareResult.addList.map(function (item) {
            var pa = pospal.tool.find(group.productAttributes, function (it) { return item.productAttributeUid == it.txtUid });
            return that.toMapping(group, pa);
        });
        that.viewList.addRange(addList);
    },

    toMapping: function (group, pa) {
        return {
            productAttributeUid: pa.txtUid,
            suggest: 0,
            AttributeName: pa.attributeName,
            PackageUid: group.txtUid,
            PackageName: group.packageName
        };
    },

    dataToHtml: function (eventTarget) {
        var that = this;
        var vals = this.viewList.map(function (it) { return it.productAttributeUid });

        function renderCb(cb, optionCount, selectedCount) {
            if (optionCount && optionCount == selectedCount) {
                cb.checked = true;
            } else {
                cb.checked = false;
            }
            cb.reset();
        }
        function renderCb2(cb, selectedCount) {
            var $div_check = cb.opts.container;
            if (!cb.checked && selectedCount > 0) {
                $div_check.addClass("indeterminate");
            } else {
                $div_check.removeClass("indeterminate");
            }
        }

        if (eventTarget != "cb_checkAllTaste") {
            var allUids = [];
            that.tasteGroupList.forEach(function (g) {
                g.productAttributes.forEach(function (a) {
                    allUids.push(a.txtUid);
                })
            });
            renderCb(that.cb_checkAllTaste, allUids.length, vals.length);
        }
        renderCb2(that.cb_checkAllTaste, vals.length);

        this.tasteGroupList.forEach(function (group) {
            var ctrls = group.ctrls;
            var gUids = group.productAttributes.map(function (it) { return it.txtUid; });
            var cb_tasteGroup = ctrls.cb_tasteGroup, ddl_taste = ctrls.ddl_taste, ddl_suggest = ctrls.ddl_suggest;
            var containsCount = pospal.tool.containsCount(vals, gUids);

            if (eventTarget != "cb_tasteGroup") {
                renderCb(cb_tasteGroup, gUids.length, containsCount);
            }
            renderCb2(cb_tasteGroup, containsCount);

            if (eventTarget != "ddl_taste") {
                ddl_taste.setSelectedValues(vals);
            }

            if (eventTarget != "ddl_suggest") {
                var options = ddl_taste.getSelectedOptions();
                ddl_suggest.update([{ "text": "无", "value": "" }].concat(options));
                ddl_suggest.setSelectedValue(that.getSuggestUid(group.txtUid));
            }
        });

    },

    getSuggestUid: function (packageUid) {
        var suggestObj = pospal.tool.find(this.viewList, function (it) { return it.PackageUid == packageUid && it.suggest == 1; });
        return suggestObj ? suggestObj.productAttributeUid : "";
    },

    setSuggestUid: function (packageUid, productAttributeUid) {
        this.viewList.forEach(function (item) {
            if (item.PackageUid == packageUid) {
                if (item.productAttributeUid == productAttributeUid) {
                    item.suggest = 1;
                } else {
                    item.suggest = 0;
                }
            }
        });
    }
};

function buildBlankRows() {
    new pospal.ui.buildBlankRows({ tableContainer: $("#contentArea"), colNum: $("#mainTable thead th:visible").length });
}

//专门用来处理从其他页面跳转到商品页面时的业务逻辑
var handleFromOtherPage = {
    init: function () {
        if (this.inited) return;

        var from = pospal.getLocationParamsWithDecode("from").toLowerCase();
        if (from == "category") {

            this.fromCategory();
        }
        //默认动作
        var defaultAction = pospal.getLocationParamsWithDecode("defaultAction").toLowerCase();
        if (defaultAction == "openProductUnitManager".toLowerCase()) {
            this.openProductUnitManager();
        }
        if (defaultAction == "openProductTagManager".toLowerCase()) {
            this.openProductTagManager();
        }
        if (defaultAction == "openProductBrandManager".toLowerCase()) {
            this.openProductBrandManager();
        } else if (defaultAction == "openStorePrintersManager".toLowerCase()) {
            editStorePrinters.show();
        } else if (defaultAction == "openEditLabelPrinter".toLowerCase()) {
            $(".btnShowEditLabelPrinterDiv").click();
        } else if (defaultAction == "openImport".toLowerCase()) {
            importProduct.show('0');
        }


        //打开编辑页
        var productId = pospal.getLocationParamsWithDecode("productId");
        if (productId.length > 0) {
            if (productId == "0") {
                editProduct.show();
                editProduct.resetEditUI();
                startNewProductTime = new Date();
                clickCount.save("4000013", "2");
            }
            else {
                editProduct.findProduct(productId, function () {
                    var showMulColorSize = pospal.getLocationParamsWithDecode("showMulColorSize");
                    if (showMulColorSize == "true" && $("#edit_mulColorSize_div").length > 0 && $("#edit_mulColorSize_div").is(":visible")) {
                        $("#edit_mulColorSize_div").click();
                    }
                });

            }
        }

        this.inited = true;
    },
    //设置查询门店
    setUserId: function () {
        var userIdTemp = pospal.getLocationParamsWithDecode("userId");
        if (userIdTemp.length > 0) {
            userSelector.setSelectedValue(userIdTemp);
        }
    },
    //商品分类页面跳转过来，并自动打开添加商品且选择好分类
    fromCategory: function () {
        setTimeout(function () {
            editProduct.show();
            editProduct.resetEditUI();
            var categoryUidTemp = pospal.getLocationParamsWithDecode("categoryUid");
            if (categoryUidTemp.length > 0) {
                editProduct.edit_productCategorySelector.setSelectedValue(categoryUidTemp);
            }
        }, 2000);
    },
    //打开单位管理器
    openProductUnitManager: function () {
        setTimeout(function () {
            editStoreProductUnits.show();
        }, 2000);
    },
    //打开标签管理器
    openProductTagManager: function () {
        setTimeout(function () {
            productTagApp.show();
        }, 2000);
    },
    //打开品牌管理器
    openProductBrandManager: function () {
        setTimeout(function () {
            productBrand.show();
        }, 2000);
    }
}

//新手引导
var guide = {
    init: function () {
        _this = this;

        var fromAction = pospal.getLocationParamsWithDecode("fromAction").toLowerCase();
        if (fromAction == "guideproduct" && $("#guideOverlay").length == 0) {
            var stepArray = [
                {
                    selector: '.conditionNav .btnAddProduct',
                    content: $(".guideContent[data-step=1]"),
                    align: 'left',
                    title: '点击【新增按钮】',
                    offset: {
                        x: 46,
                        highLightWidth: 60
                    },
                    beforeStep: function () {
                        //clickCount.save("新手引导", "点击【新增按钮】展示");
                    }
                },
                {
                    selector: '#editArea .commodityBasic',
                    withCursor: false,
                    content: $(".guideContent[data-step=2]"),
                    align: 'center',
                    offset: {
                        x: -30,
                        highLightLeft: -40
                    },
                    beforeStep: function () {
                        editProduct.resetBaseUnit();
                        editProduct.show();
                        //clickCount.save("新手引导", "填写*的部分展示");
                    },
                    afterStep: function () {
                    }
                },
                {
                    selector: '#editArea .editBottom .btn.save',
                    withCursor: false,
                    content: $(".guideContent[data-step=3]"),
                    align: 'center',
                    offset: {
                        x: -160
                    },
                    beforeStep: function () {
                        //clickCount.save("新手引导", "保存资料展示");
                    },
                    afterStep: function () {
                    }
                },
                {
                    selector: '.conditionNav .btnImport',
                    content: $(".guideContent[data-step=4]"),
                    align: 'left',
                    title: '点击【导入】按钮',
                    offset: {
                        x: 46
                    },
                    beforeStep: function () {
                        layout.showOrHideEditArea(false);
                        //clickCount.save("新手引导", "点击【导入】按钮展示");
                    }
                },
                {
                    selector: '#importDiv #linkdownload',
                    withCursor: false,
                    content: $(".guideContent[data-step=5]"),
                    extContent: "<div class='extTips' style='height:77px;width:168px;left: -240px;'><img src='/images/intro/helptip1.png' /></div>",
                    align: 'center',
                    offset: {
                        x: 248
                    },
                    beforeStep: function () {
                        $("#importDiv,#popupBg").show();
                    }
                },
                {
                    selector: '#importDiv .popupAreaCenter:last',
                    withCursor: false,
                    content: $(".guideContent[data-step=6]"),
                    extContent: "<div class='extTips' style='height:77px;width:168px;left: -240px;'><img src='/images/intro/helptip1.png' /></div>",
                    align: 'center',
                    offset: {
                        x: -300,
                        highLightTop: 12,
                        highLightHeight: -200
                    },
                    beforeStep: function () {
                        $("#importDiv,#popupBg").show();
                    }
                },
                {
                    selector: '#importDiv #btnUploadFile',
                    withCursor: false,
                    content: $(".guideContent[data-step=7]"),
                    extContent: "<div class='extTips' style='height:77px;width:168px;left: -240px;'><img src='/images/intro/helptip1.png' /></div>",
                    align: 'center',
                    offset: {
                        x: 248
                    }
                },
                {
                    selector: null,
                    withCursor: false,
                    content: $(".guideContent[data-step=8]"),
                    align: 'center',
                    title: '下载收银端',
                    offset: {
                        y: -100,
                        x: 0
                    },
                    beforeStep: function () {
                        $("#importDiv,#popupBg").hide();
                    },
                    afterStep: function () {
                        _this.save(1);
                        //clickCount.save("新手引导", "商品资料完成展示");
                        _this.guide.stopStep = true;
                        $("#guideOverlap .contine .cursor").shake(10, 2, 10000);
                        $("#guideOverlap .contine").click(function () {
                            _this.guide.stopStep = false;
                            //clickCount.save("新手引导", "下载收银端点击");
                            pospal.openPage("https://www.pospal.cn/downcenter.aspx", true);
                            pospal.openPage("/Dashboard/Beauty?fromAction=guidefinish", false);
                        })

                        $("#guideOverlap .exist").click(function () {
                            _this.guide.stopStep = false;
                            _this.guide.confirmExist();
                            $("#guideOverlap .guideContent .smsNum").text("100");
                        })
                    }
                },
            ];

            _this.guide = new pospal.guide({
                stepArray: stepArray,
                completCallback: function () {

                },
                existCallback: function () {
                    _this.save(-1);
                }
            });
            _this.guide.start();
        }
    },

    save: function (status) {
        var _this = this;
        var doing = new pospal.ui.loading($("#mainArea"), true);

        pospal.ajax({
            url: "/Setting/SaveGuideViewConfig",
            data: {
                "action": "guideproduct", "status": status
            },
            success: function (result) {
                if (result.successed) {

                }
            },
            complete: function () {
                doing.destroy();
            }
        });
    }
}
function compare(property) {
    return function (obj1, obj2) {
        var value1 = obj1[property] == undefined || obj1[property] == null ? Number.MAX_VALUE : obj1[property];
        var value2 = obj2[property] == undefined || obj2[property] == null ? Number.MAX_VALUE : obj2[property];
        return value1 - value2;     // 升序
    }
}

function compareColorSizeGroupOrder(obj1, obj2) {
    var groupOrder1 = obj1.groupOrderNumber == undefined || obj1.groupOrderNumber == null ? Number.MAX_VALUE : obj1.groupOrderNumber;
    var groupOrder2 = obj2.groupOrderNumber == undefined || obj2.groupOrderNumber == null ? Number.MAX_VALUE : obj2.groupOrderNumber;
    if (groupOrder1 != groupOrder2) {
        return groupOrder1 - groupOrder2;
    }

    var orderNumber1 = obj1.orderNumber == undefined || obj1.orderNumber == null ? Number.MAX_VALUE : obj1.orderNumber;
    var orderNumber2 = obj2.orderNumber == undefined || obj2.orderNumber == null ? Number.MAX_VALUE : obj2.orderNumber;
    if (orderNumber1 != orderNumber2) {
        return orderNumber1 - orderNumber2;
    }

    var sourceOrder1 = obj1.sourceOrder == undefined || obj1.sourceOrder == null ? Number.MAX_VALUE : obj1.sourceOrder;
    var sourceOrder2 = obj2.sourceOrder == undefined || obj2.sourceOrder == null ? Number.MAX_VALUE : obj2.sourceOrder;
    return sourceOrder1 - sourceOrder2;
}

var cookbookocrApp = (function () {
    var find = function (s) { return mapp.$el.find(s) }
    var mapp = {
        init: function () {
            this.$el = $("#cookbookocrAppDiv");
            if (this.$el.length == 0) {
                return;
            }

            this.$bg = $("#cookbookocrAppDivBg");

            find(".appClose").click(function () {
                mapp.hide();
            })
        },
        show: function () {
            this.$el.show();
            this.$bg.show();

            if (!mapp.setQrcode) {
                mapp.setQrcode = 1;
                var w = 80;
                myShopDownLoad_layout.buildQrCodeToDiv(find(".andriodDownloadQrCode .downQrCode").html(''), 'android', w, w);
                myShopDownLoad_layout.buildQrCodeToDiv(find(".iosDownloadQrCode .downQrCode").html(''), 'ios', w, w);
            }
        },
        hide: function () {
            this.$el.hide();
            this.$bg.hide();
        },
    }
    return mapp;
})();

var editProductBarcodeGenerationRule = {

    allCategories: [],
    categoryTree: {},
    categoryTierMap: {},
    categoryCodes: {},

    init: function () {

        if (!hasProductBarcodeGenerationRule) return;

        var self = this;

        this.sw_generationRuleEnable = new pospal.ui.switchBox({
            container: $('#sw_generationRuleEnable'),
            options: [{ text: lang.tryGet("开启"), value: "1" }, { text: lang.tryGet("关闭"), value: "0" }]
        });

        this.sw_specSuffixEnable = new pospal.ui.switchBox({
            container: $('#sw_sequenceLength'),
            options: [{ text: lang.tryGet("开"), value: "1" }, { text: lang.tryGet("关"), value: "0" }]
        });

        this.caategoryTierSelector = new pospal.ui.multipleSelector({
            title: function () {
                var selected = this.getSelectedOptions();
                var len = selected.length;
                return "已选 {len} 个层级".replace('{len}', len);
            },
            container: $('#caategoryTierSelector'),
            textWidth: 124,
            selectBoxWidth: 156,
            autoClose: true,
            options: [
                { text: "一级分类", value: "1" },
                { text: "二级分类", value: "2" },
                { text: "三级分类", value: "3" },
                { text: "四级分类", value: "4" },
                { text: "五级分类", value: "5" }
            ],
            closeButton: {
                text: "关闭",
                onClose: function () {
                    self.refreshCategoryTable();
                }
            }
        });

        this.bindEvents();

    },

    bindEvents: function () {
        var self = this;

        $(document).on('click', '.btnShowBarcodeGenerationRuleDiv', function () {
            self.showDialog();
        });

        $('#editProductBarcodeRule .popupClose').click(function () {
            $('#editProductBarcodeRule').hide();
            $("#popupBg").hide();
        });

        $('#editProductBarcodeRule .btnConfirm').click(function () {
            self.saveRule();
        });

        // 序号位数输入验证
        $('#sequenceLengthInput').on('input', function () {
            var val = $(this).val();
            if (!/^\d*$/.test(val)) {
                $(this).val(val.replace(/\D/g, ''));
            }
            var num = parseInt($(this).val()) || 0;
            if (num < 2) {
                $(this).val('');
            } else if (num > 4) {
                $(this).val(4);
            }
        });

        // 分类编码输入验证 - 支持字母和数字组合
        $(document).on('input', '#editProductBarcodeRule .specTable input[type="text"]', function () {
            var val = $(this).val();
            // 只允许字母和数字
            if (!/^[a-zA-Z0-9]*$/.test(val)) {
                $(this).val(val.replace(/[^a-zA-Z0-9]/g, ''));
            }

            var $input = $(this);
            var $editInput = $input.closest('.editInput');
            if ($editInput.hasClass('errorInput')) {
                $editInput.removeClass('errorInput');
            }

            // 实时保存输入的编码到内存中
            var tier = $input.data('tier');
            var uid = $input.data('uid');
            var code = $.trim($input.val());

            if (tier && uid) {
                if (!self.categoryCodes[tier]) {
                    self.categoryCodes[tier] = {};
                }
                if (code) {
                    self.categoryCodes[tier][uid] = code;
                } else {
                    // 如果清空了输入，从内存中删除
                    delete self.categoryCodes[tier][uid];
                }
            }
        });

        $(document).on('click', '.btnExportBarcodeRule', function () {
            self.exportCategoryCode();
        });

        $(document).on('click', '.btnImportBarcodeRule', function () {
            self.importCategoryCode();
        });

        $(document).on('click', '#btnCloseImportBarcodeRule', function () {
            self.hideImportDialog();
        });
    },

    showDialog: function () {
        $("#popupBg").show();
        $('#editProductBarcodeRule').show();
        this.loadRule();
    },

    loadRule: function () {
        var self = this;
        var doing = new pospal.ui.loading($('#editProductBarcodeRule'));

        pospal.ajax({
            url: '/Product/GetProductBarcodeGenerationRule',
            success: function (result) {
                if (result.success) {
                    if (result.rule) {
                        self.sw_generationRuleEnable.set(result.rule.isEnable ? "1" : "0");
                        self.sw_specSuffixEnable.set(result.rule.specSuffixLength > 0 ? "1" : "0");
                        $('#sequenceLengthInput').val(result.rule.sequenceLength);

                        if (result.rule.categoryTierRule) {
                            var tiers = result.rule.categoryTierRule.split(',');
                            self.caategoryTierSelector.setSelectedValues(tiers);
                        }
                    } else {
                        self.sw_generationRuleEnable.set("0");
                        self.sw_specSuffixEnable.set("1");
                        $('#sequenceLengthInput').val("");
                    }

                    // 处理分类数据
                    self.allCategories = result.categories || [];
                    self.buildCategoryTree();

                    // 加载已保存的分类编码
                    self.categoryCodes = {};
                    if (result.categoryCodes) {
                        $.each(result.categoryCodes, function (i, code) {
                            if (!self.categoryCodes[code.categoryTier]) {
                                self.categoryCodes[code.categoryTier] = {};
                            }
                            self.categoryCodes[code.categoryTier][code.categoryUid] = code.code;
                        });
                    }

                    // 刷新分类表格
                    self.refreshCategoryTable();
                } else {
                    new pospal.ui.msgBox(result.msg || '加载失败');
                }
            },
            error: function () {
                new pospal.ui.msgBox('加载条码生成规则失败');
            },
            complete: function () {
                doing.destroy();
            }
        });
    },

    buildCategoryTree: function () {
        var self = this;
        self.categoryTree = {};
        self.categoryTierMap = {};

        // 构建分类树和计算层级
        $.each(self.allCategories, function (i, cat) {
            if (!cat.parentUid || cat.parentUid == 0) {
                self.categoryTierMap[cat.uid] = 1;
            }
        });

        // 多次遍历计算各级分类
        for (var level = 2; level <= 5; level++) {
            $.each(self.allCategories, function (i, cat) {
                if (cat.parentUid && cat.parentUid != 0) {
                    if (self.categoryTierMap[cat.parentUid] == level - 1) {
                        self.categoryTierMap[cat.uid] = level;
                    }
                }
            });
        }
    },

    refreshCategoryTable: function () {
        var self = this;
        var selectedTiers = self.caategoryTierSelector.getSelectedValues();
        var tbody = $('#editProductBarcodeRule .specTable tbody');
        tbody.empty();

        if (selectedTiers.length == 0) {
            tbody.append('<tr><td colspan="3" style="text-align:center;">请先选择分类层级</td></tr>');
            return;
        }

        // 收集需要显示的分类
        var displayCategories = [];
        $.each(self.allCategories, function (i, cat) {
            var tier = self.categoryTierMap[cat.uid];
            if (tier && selectedTiers.indexOf(tier.toString()) >= 0) {
                displayCategories.push({
                    uid: cat.uid,
                    name: cat.name,
                    tier: tier,
                    parentUid: cat.parentUid || 0
                });
            }
        });

        // 按层级排序
        displayCategories.sort(function (a, b) {
            if (a.tier != b.tier) return a.tier - b.tier;
            return a.name.localeCompare(b.name);
        });

        if (displayCategories.length > 0) {
            $.each(displayCategories, function (i, cat) {
                var tierName = ["", "一级分类", "二级分类", "三级分类", "四级分类", "五级分类"][cat.tier] || "";
                var existingCode = (self.categoryCodes[cat.tier] && self.categoryCodes[cat.tier][cat.uid]) || "";
                var maxLength = 2; // 所有分类都是2位

                var tr = $('<tr></tr>');
                tr.append('<td class="tdAlignLeft">' + tierName + '</td>');
                tr.append('<td class="tdAlignLeft">' + cat.name + '</td>');
                tr.append('<td class="tdAlignRight">' +
                    '<div class="editInput">' +
                    '<input type="text" value="' + existingCode + '" maxlength="' + maxLength + '" ' +
                    'data-tier="' + cat.tier + '" data-uid="' + cat.uid + '" data-parent="' + (cat.parentUid || 0) + '" ' +
                    'style="width: 104px;">' +
                    '</div></td>');
                tbody.append(tr);
            });
        } else {
            tbody.append('<tr><td colspan="3" style="text-align:center;">没有符合条件的分类</td></tr>');
        }
    },

    exportCategoryCode: function () {
        var self = this;

        var hasData = $('#editProductBarcodeRule .specTable tbody tr').length > 0 &&
            !$('#editProductBarcodeRule .specTable tbody tr').first().find('td').text().includes('请先选择分类层级');

        if (!hasData) {
            new pospal.ui.msgBox('没有可导出的分类编码数据');
            return;
        }

        try {
            // 创建临时表格用于导出
            var tempTableId = 'tempExportBarcodeRuleTable';
            var $tempTable = $('<table id="' + tempTableId + '" style="position:absolute;left:-9999px;top:-9999px;"><thead><tr><th style="width:120px;">分类层级</th><th style="width:200px;">分类名称</th><th style="width:120px;">分类编码</th></tr></thead><tbody></tbody></table>');

            $('#editProductBarcodeRule .specTable tbody tr').each(function () {
                var $row = $(this);
                var $cells = $row.find('td');

                // 跳过提示行（包含colspan的提示行或只有一个td的行）
                if ($cells.length === 1 || $cells.first().attr('colspan')) return;

                // 再次检查是否是提示行（通过文字内容判断）
                var firstCellText = $cells.eq(0).text().trim();
                if (firstCellText.includes('请先选择') || firstCellText.includes('没有符合条件')) return;

                var tierName = $cells.eq(0).text().trim();
                var categoryName = $cells.eq(1).text().trim();
                var categoryCode = $cells.eq(2).find('input').val() || '';

                var $tempRow = $('<tr></tr>');
                $tempRow.append('<td>' + tierName + '</td>');
                $tempRow.append('<td>' + categoryName + '</td>');
                $tempRow.append('<td>' + categoryCode + '</td>');

                $tempTable.find('tbody').append($tempRow);
            });

            $('body').append($tempTable);
            pospal.exportExcelV2('商品分类编码表', { table_id: tempTableId });
            $tempTable.remove();
        } catch (e) {
            new pospal.ui.msgBox('导出失败，请稍后重试');
        }
    },

    importCategoryCode: function () {
        var self = this;

        var selectedTiers = self.caategoryTierSelector.getSelectedValues();
        if (selectedTiers.length == 0) {
            new pospal.ui.msgBox('请先选择分类层级后再导入编码');
            return;
        }

        $("#popupBg").show();
        $("#importBarcodeRuleDiv").show();

        if (this.importUploader == null) {
            this.buildImportUploader();
        }
        this.importUploader.refresh();
    },

    buildImportUploader: function () {
        var self = this;

        var opts = {};
        opts.browse_button = "btnPickBarcodeRuleFile";
        opts.url = "/Product/ImportProductBarcodeGenerationRuleCodes";
        opts.multi_selection = false;
        opts.max_file_size = "1mb";
        opts.extensions = "xls,xlsx";

        opts.PostInit = function (up) {
            $("#btnUploadBarcodeRuleFile").bind("click", function () {
                if (up.files.length == 0) {
                    $("#importBarcodeRuleMsg").text("请选择要导入的文件!");
                    $("#importBarcodeRuleFileName").val("请选择导入的文件");
                } else if (up.files.length > 1) {
                    $("#importBarcodeRuleMsg").text("只能选择一个文件");
                } else {
                    up.settings.url = "/Product/ImportProductBarcodeGenerationRuleCodes";
                    up.start();
                    up.disableBrowse(true);
                }
                return false;
            });
        };

        opts.FilesAdded = function (up, files) {
            var msg = files[0].name;
            $("#importBarcodeRuleFileName").val(msg);
            $("#importBarcodeRuleMsg").text("当前选择的文件: " + msg);
        };

        opts.UploadProgress = function (up, file) {
            if (file.percent == 100) {
                $("#importBarcodeRuleMsg").text("文件上传成功");
            }
            $("#uploadBarcodeRulePercent").css("width", file.percent + "%");
        };

        opts.FileUploaded = function (up, file, response) {
            if (response != null && response.response != null && response.response != "") {
                var result = JSON.parse(response.response);

                if (result.successed) {
                    // 处理导入的分类编码数据
                    if (result.importedCodes && result.importedCodes.length > 0) {
                        // 将导入的编码填入当前表格，并获取实际填入成功的数量
                        var actualSuccessCount = self.fillImportedCategoryCodes(result.importedCodes);

                        // 后端校验通过的数量就是 importedCodes 的长度
                        var validatedCount = result.importedCodes.length;

                        // 生成最终的成功消息（使用 FrontScript 文案）
                        var finalMsg = lang.tryFormat("共导入X条记录成功匹配", [validatedCount, actualSuccessCount]);
                        $("#importBarcodeRuleMsg").text(finalMsg);

                        // 如果有校验错误信息，也显示出来
                        var detailMsg = finalMsg;
                        if (result.validationErrors && result.validationErrors.length > 0) {
                            detailMsg += "\n\n以下分类存在问题：";
                            $.each(result.validationErrors, function (i, error) {
                                detailMsg += "\n• " + error;
                            });
                        }

                        new pospal.ui.msgBox({
                            content: detailMsg,
                            autoCloseSec: result.validationErrors && result.validationErrors.length > 0 ? 0 : 3000
                        });
                    } else {
                        // 如果没有导入数据，显示原始消息
                        var msg = result.msg || "分类编码导入成功";
                        $("#importBarcodeRuleMsg").text(msg);
                        new pospal.ui.msgBox({ content: msg, autoCloseSec: 3000 });
                    }

                    self.hideImportDialog();
                } else {
                    var errorMsg = "导入失败";

                    // 处理详细的错误信息
                    if (result.validationErrors && result.validationErrors.length > 0) {
                        errorMsg += "，存在以下问题：\n";
                        $.each(result.validationErrors, function (i, error) {
                            errorMsg += "• " + error + "\n";
                        });
                    } else if (result.msg) {
                        errorMsg += ": " + result.msg;
                    }

                    $("#importBarcodeRuleMsg").text(errorMsg);
                }

                up.disableBrowse(false);
                up.splice(0, up.files.length);
            }
        };

        opts.Error = function (up, err) {
            var errMsg = err.file.name + "：" + err.message;
            $("#importBarcodeRuleMsg").text(errMsg);
            up.disableBrowse(false);
        };

        this.importUploader = pospal.buildUploader(opts);
    },

    hideImportDialog: function () {
        $("#importBarcodeRuleDiv").hide();
        // 重置界面
        $("#importBarcodeRuleFileName").val("请选择导入的文件");
        $("#importBarcodeRuleMsg").text("导入文件为.xls、.xlsx的excel文件，大小不超过1MB。\n模板包含两列：分类名称、分类编码");
        $("#uploadBarcodeRulePercent").css("width", "0%");
    },


    // 将导入的分类编码填入表格
    fillImportedCategoryCodes: function (importedCodes) {
        var self = this;
        if (!importedCodes || importedCodes.length === 0) return 0;

        $('#editProductBarcodeRule .specTable tbody .editInput').removeClass('errorInput');

        var successCount = 0;

        // 遍历导入的分类编码，更新内存中的编码数据
        $.each(importedCodes, function (i, item) {
            // 首先更新内存中的数据
            var categoryTier = self.categoryTierMap[item.categoryUid];
            if (categoryTier) {
                if (!self.categoryCodes[categoryTier]) {
                    self.categoryCodes[categoryTier] = {};
                }
                self.categoryCodes[categoryTier][item.categoryUid] = item.categoryCode;
            }

            // 然后尝试更新当前显示的表格中的输入框
            var $input = $('#editProductBarcodeRule .specTable tbody input[data-uid="' + item.categoryUid + '"]');
            if ($input.length > 0) {
                $input.val(item.categoryCode);
                successCount++;
            }
        });

        // 刷新表格以显示所有更新的数据（包括不在当前视图中的）
        self.refreshCategoryTable();

        return successCount;
    },

    saveRule: function () {
        var self = this;

        var isEnable = self.sw_generationRuleEnable.getSelectedValue() == "1";
        var selectedTiers = self.caategoryTierSelector.getSelectedValues();
        var sequenceLength = parseInt($('#sequenceLengthInput').val());
        var specSuffixEnable = self.sw_specSuffixEnable.getSelectedValue() == "1";
        var specSuffixLength = specSuffixEnable ? 2 : 0;

        if (selectedTiers.length == 0) {
            new pospal.ui.msgBox('请选择至少一个分类层级');
            return;
        }

        // 序号位数必填验证
        if (!sequenceLength || isNaN(sequenceLength)) {
            new pospal.ui.msgBox('请输入序号位数');
            return;
        }

        if (sequenceLength < 2 || sequenceLength > 4) {
            new pospal.ui.msgBox('序号位数应在2-4之间');
            return;
        }

        var categoryCodes = [];
        var codeMap = {};
        var hasError = false;
        var emptyCodeCount = 0;
        var $emptyInputs = [];
        var $firstErrorInput = null;

        $('#editProductBarcodeRule .specTable tbody .editInput').removeClass('errorInput');

        $('#editProductBarcodeRule .specTable tbody input[type="text"]').each(function () {
            var $input = $(this);
            var code = $.trim($input.val());
            var tier = $input.data('tier');
            var uid = $input.data('uid');
            var parentUid = $input.data('parent') || 0;

            if (!code) {
                emptyCodeCount++;
                $emptyInputs.push($input);
                return true;
            }

            var key = parentUid + '-' + code;
            if (codeMap[key]) {
                var msg = parentUid == 0 ? '根分类编码不能重复' : '同一父分类下，同层级子分类编码不能重复';
                new pospal.ui.msgBox(msg);
                $input.closest('.editInput').addClass('errorInput');
                if ($firstErrorInput == null) { $firstErrorInput = $input.closest('.editInput'); }
                hasError = true;
                return false;
            }
            codeMap[key] = true;
            categoryCodes.push({
                categoryTier: tier,
                categoryUid: uid,
                code: code
            });
        });

        if (emptyCodeCount > 0) {
            $.each($emptyInputs, function (i, $input) {
                $input.closest('.editInput').addClass('errorInput');
            });

            if ($emptyInputs.length > 0) {
                var $firstErrorInput = $emptyInputs[0].closest('.editInput');
                $("#editProductBarcodeRule .scrollContentDiv").mCustomScrollbar("scrollTo", $firstErrorInput);
            }

            new pospal.ui.msgBox('所有分类编码都必须填写，不能留空');
            return;
        }

        if (hasError) {
            if ($firstErrorInput) {
                $("#editProductBarcodeRule .scrollContentDiv").mCustomScrollbar("scrollTo", $firstErrorInput);
            }
            return;
        }

        var doing = new pospal.ui.loading($('#editProductBarcodeRule'));

        pospal.ajax({
            url: '/Product/SaveProductBarcodeGenerationRule',
            data: {
                isEnable: isEnable,
                categoryTierRule: selectedTiers.join(','),
                sequenceLength: sequenceLength,
                specSuffixLength: specSuffixLength,
                categoryCodesJson: JSON.stringify(categoryCodes)
            },
            success: function (result) {
                if (result.success) {
                    new pospal.ui.msgBox('保存成功');
                    $('#editProductBarcodeRule').hide();
                    $("#popupBg").hide();
                    // 自动刷新当前页面
                    window.location.reload();
                } else {
                    new pospal.ui.msgBox(result.msg || '保存失败');
                }
            },
            error: function () {
                new pospal.ui.msgBox('保存失败，请稍后重试');
            },
            complete: function () {
                doing.destroy();
            }
        });
    }

}

