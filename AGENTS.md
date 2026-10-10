# AGENTS.md — pospal_stock_app

## 改动范围铁律（最高优先级）
- 只改用户指定的内容，禁止自作主张扩大范围
- 每次动手前先确认：要改什么？旁边有什么不能碰？
- 如果发现关联代码也需要改动才能工作，必须先告知用户确认

## UTF-8 文件安全规则（血的教训，强制执行）

### ❌ 绝对禁止
1. **禁止 PowerShell `-replace` 操作符修改含中文的 .dart 文件**  
   PowerShell 的字符串替换会在内部做编码转换，损坏多字节 UTF-8 序列。
   后果：中文变成乱码（闆?、涓€ 等），字符串引号断裂，整个文件无法编译。

2. **禁止 PowerShel `Set-Content` / `Out-File` 写入代码文件**  
   默认编码不可控。

3. **禁止 Python 的 `text.replace(old, new)` 用不精确的内容做多行替换**  
   行尾格式（\r\n vs \n）不匹配时会导致大规模误匹配，毁掉整个文件。
   反面案例：用 `catch (_)` 匹配会命中文件中所有 catch 块。

4. **禁止 `apply_patch` 或任何脚本使用行号定位**  
   `lines[235:269] = new_content` 这类行号操作随时可能因文件变化而偏移。

### ✅ 正确做法（优先级从高到低）

#### 方案 A：Python 二进制精确替换（推荐）
```python
with open(filepath, 'rb') as f:
    raw = f.read()

# 1. 用唯一的内容锚点定位起止位置
start = raw.find(b"Future<bool> keepAlive")  # 唯一的方法签名
while start > 0 and raw[start-1:start] != b'\n':
    start -= 1  # 回溯到行首

end_marker = b'\n  }\n\n  /// 从 Product/Manage'  # 唯一定位：方法结束后紧跟的下一个文档注释
end = raw.find(end_marker, start) + len(b'\n  }')

# 2. 替换指定区间
new_bytes = b"""...新内容..."""
if b'\r\n' in raw:
    new_bytes = new_bytes.replace(b'\n', b'\r\n')  # 匹配原文件行尾
raw = raw[:start] + new_bytes + raw[end:]

# 3. 二进制写回
with open(filepath, 'wb') as f:
    f.write(raw)
```
**条件**：起止锚点必须在文件中**唯一**出现。用方法签名 + 下一个方法的文档注释这种组合来保证唯一性。

#### 方案 B：PowerShell `[System.IO.File]` API（内容匹配）
```powershell
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
$content = $content.Replace("exact_old_text", "exact_new_text")
[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
```
**条件**：替换文本必须**完全精确**匹配（包括换行符 \r\n、空格、缩进）。  
**风险**：如果旧文本在文件中出现多次，会全部替换，容易误伤。

### 🔍 修改后必做验证
1. 与 GitHub/备份版本做 diff，确认**只改了目标方法**
2. `flutter build apk --release` 编译通过
3. 检查文件行数变化是否合理（目标方法 ±5 行以内）

## 版本管理规则
- **GitHub 仓库 `qiukeng007/109` 是 v1.0.9 的唯一定稿版本**  
  任何时候需要干净文件，直接从 GitHub clone，不要用本地备份（可能已被污染）
- 本地备份目录（`*_backup`）的时间戳不可信——可能在编辑过程中被覆盖
- 每次发现本地文件损坏，第一时间从 GitHub 恢复，不要试图修复损坏文件

## 项目结构
- 源码：`D:\APP_DEMO\pospal_stock_app\`
- GitHub 定稿：`qiukeng007/109`（本地 clone：`D:\APP_DEMO\pospal_stock_app_github\`）
- 打包验证：`flutter build apk --release`

## 本次会话踩坑记录

### 坑 1：PowerShell 替换损坏中文
用 `$content -replace 'pattern', 'replacement'` 修改 restock_service.dart 时，中文全部变成乱码。
→ **教训**：含中文文件只用 Python 二进制操作。

### 坑 2：用 v1.0.6 代替 v1.0.9
用户多次强调用 109 版本，我却反复回退到 106 备份。
→ **教训**：GitHub 是唯一可信的版本来源。

### 坑 3：内容匹配误伤其他方法
`text.replace("catch (_) {", ...)` 匹配到了文件中所有 8 个 catch 块。
→ **教训**：锚点必须唯一，如用方法签名 + 下一方法文档注释的组合。

### 坑 4：行号修改
`lines[235:269] = new_keepalive` 违反 AGENTS.md 行号禁令。
→ **教训**：只用内容锚点，绝不依赖行号。

### 坑 5：忽略行尾格式差异
Python `newline=''` 改变了文件读取方式，导致 `\r\n` vs `\n` 不匹配。
→ **教训**：用 `'rb'` 模式读取，处理完再匹配行尾。

### 成功案例：keepAlive 最终修复
- 起点锚点：`b"Future<bool> keepAlive"`（唯一）
- 终点锚点：`b'\n  }\n\n  /// 从 Product/Manage'`（唯一）
- 替换区间：起点行首 → 终点（含方法闭合花括号）
- 验证：diff 确认仅 keepAlive 变化，其他 785 行一致

## 内部版本号规则（用户 2026-10-07 明确要求；以本节为准）

- 内部版本号 = `pubspec.yaml` 里 version 的 build 号：`version: 1.0.12+18` 里的 **18**。
- 配置页底部显示：`当前版本: 1.0.12（内部版本1012-18）`（`1012` = 版本号去掉小数点）。
- **安卓与 iOS 必须用同一个号，永远保持一致。**
- **iOS 不能超过安卓**：
  - 只出 iOS 包时 → 直接用**当前安卓这个号**推上去，**不要再 +1**；
  - 安卓也要出新包时 → 先把号 +1，然后**安卓和 iOS 都用这个新号**（不要各加一次）。
- 推荐顺序：先出安卓 APK（+1）→ 再用同一个号推 iOS。
- 这个号同时是「检查更新」用的版本号（服务器 `PIC/app_version.txt` 里的数字比它大就提示更新），只能递增、不能重复。

## 当前功能状态（2026-10-09 更新）

### 配置页顶部「条码卡」（lib/widgets/operator_barcode_card.dart）
- `BarcodeCardsPanel` = 配置页最上面那块，做成「切换卡」的样子：
  - 默认第一张是**操作员条码**（内容固定 = `^|` + 操作员姓名，**不可编辑/不可删除**）
  - 后面可自建自定义卡（名称 + 条码内容都能改），存在 `SharedPreferences` 键 `barcode_cards_v1`，最多 12 张
  - 卡片区域左右滑动切换；**底部**一条紧凑切换条：`‹ ● ● ○ › ＋加一张`
  - 标题行**固定 28 高**（不能用 IconButton，最小 30x30 会把标题行撑高 → 左右滑动时卡片忽高忽低）
  - 条码区高度固定 62，条码按可用高宽自动铺满
  - 从别的页切回配置页时**自动跳回第一张**（`isVisible` 由 HomePage 传：`_currentTab == _settingsTabIndex`）
- 点条码放大（`showBarcodeLargeDialog`）：默认竖排；**点弹窗里任意位置都收起**（整个弹窗套了 `GestureDetector(opaque)`，里面的按钮自己处理点击不受影响）
- 条码编码：Code128；含非 ASCII 时按 UTF-8 逐字节 + FNC4（`{4}` 前缀）编码，扫码端按 UTF-8 还原

### 配置页保活（lib/pages/settings_page.dart）
- `_SettingsPageState` 混入 `AutomaticKeepAliveClientMixin` + `wantKeepAlive = true`
- 原因：配置页挂在主页 `PageView` 上，不保活时每次切走 State 就销毁，切回来重跑首次加载 → 用户看到「每次点配置页都转圈」
- 注意：`build()` 里必须调 `super.build(context)`

### 内部版本号
- 规则：**打一次包 +1**（pubspec 的 build 号），安卓/iOS 同号，iOS 不能超过安卓
- 现在：`version: 1.0.12+20` → 内部版本显示为 `1012-20`
- 配置页底部自动显示 `1.0.12（内部版本1012-20）`（读 PackageInfo，不用手改代码）

### 操作日志（lib/services/usage_log_service.dart）
- 行格式（第 3 段=模式编号，第 4 段=内部版本）：
  `2026-10-09 13:45:06|燕子|1012-1|1012-20|ccc01m01|1001|密码|Android|登录`
  - `1012-1` = 门店模式，`1012-2` = 总部模式
  - 内部版本由 `_internalVersionLabel()` 从 PackageInfo 读（`version` 去点 + `-` + buildNumber）
- **本地只保留最近 100 行**（`_maxLines = 100`，`_appendLocal` 里裁剪），上传的是整份文件，所以后台也只有最近 100 行

### 已知无关报错
- `flutter analyze` 里 `lib/gen_pdf.dart`、`lib/gen_screenshots.dart` 有 16 条 error（缺 `package:pdf` 等），是开发脚本、入口没引用，**不影响打包**
## 操作员条码的编码约定（2026-10-10）

- 条码内容 = `^|` + 操作员姓名；姓名里的**非 ASCII 按 UTF-8 逐字节写成 %XX**
  （例：`^|蚊子` → `^|%E8%9A%8A%E5%AD%90`），由 `buildOperatorBarcode` 生成
- **不要用 Code128 的 FNC4 扩展**：很多扫码枪不认，扫到扩展段就断（实测只回来 `^|`）
- 读的一方（去掉 `^|` 之后）要做 URL 解码：
  - 易语言：`编码_URL解码 (内容, 真)`
  - 浏览器 JS：`dec(v)`
  - Dart 侧目前只生成不解析，所以 App 不用解
- 每个汉字占 9 个字符，**操作员名字要短**（2~3 个字），太长条码会细到扫不出来