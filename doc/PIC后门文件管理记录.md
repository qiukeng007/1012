# PIC 后门文件管理 —— 功能与踩坑记录

更新日期：2026-09-09（1012 主工程）

## 1. 功能
- 入口：配置页底部「当前版本」连续点击 10 次（间隔超 0.8 秒重新计数）→ 输入管理员密码 `99252057`。
- 页面：PIC 文件管理（ServerTxtManagerPage）
  - 显示补货服务器 PIC 目录下的 txt（含名称、日期、大小）。
  - 「全部下载到手机」：逐个拉到手机本地（Documents/server_txt）。
  - 点文件名 → 查看/编辑 → 「保存并上传到服务器」（覆盖同名文件）。
  - 目录索引被拦时进入“手机已知/常用文件名”模式：常用文件 + 手动添加（＋）的操作员名文件，如 `张三.txt`；手动添加的行可点红色 ✕ 删除（会同时清理本地缓存）。
- 服务端配合：`index.esp` 的 POST 里新增 `piclist` 分支，只返回 PIC 目录所有 txt 文件名（每行一个、UTF-8），图片名不暴露。APP 优先调用它。

## 2. 关键结论（以后不再走弯路）
1. 这台补货服务器（Webesp）**支持** `/PIC/` 目录索引，只要 `config.ini` 里 `EnDir=1` 且重启。
2. 域名 `wenzi778899.dpdns.org` 走了 Cloudflare/CDN，**目录索引 /PIC/ 被拦**：返回 200 + “请求页面不存在”小网页（无文件列表），但**按文件名直读正常**（`/PIC/蚊子.txt` 能读到），上传 `index.esp?uploadlog` 也正常。
   → 所以“能上传但列不出文件”不是故障，是防护拦截目录列举。
3. Webesp 对“文件不存在”的请求会返回 **200 + 网页错误页**，不是 404。APP 端已识别：内容以 `<` 开头且含 `<html`/“不存在”/Error 时按“文件不存在”处理，避免把错误页当文本打开或误覆盖上传。
4. 易语言环境**没有**“寻找文件结束”命令：编译报错时删掉该行即可，不影响枚举。
5. **“一进后门就被服务器拉黑”的根因**（本次最重要）：
   - 原实现发的是“空内容、Content-Type=urlencoded 的 POST”（Content-Length: 0）+ 必要时 `GET /PIC/` 目录页。这两类请求与 APP 平时流量（浏览器式 multipart 表单）形态不同，被安全防护判定为“异常空 POST / 目录列举扫描”，自动把来源 IP 拉黑。
   - 已修复：`fetchPicTxtList()` 改为与日常补货/使用记录**完全一致的多部分表单 POST**（multipart/form-data，带普通字段 `t`），本机实测正常。
   - 排障证据：本机 `D:\WebServer2.3.1\Black.list`（加密格式，24 字节）在 2026-09-08 15:21 后未再变动 → 当时被拉黑发生在域名/正式那一侧，不是本机这台。
   - 解除拉黑入口：先确认在哪个防护里看到黑名单（WebServer 管理界面 / 路由器“IP 黑名单·防攻击” / Cloudflare Security → IP Access Rules），从那里删除对应 IP。

## 3. APP 改动文件（D:\APP_DEMO\1012）
- `lib/pages/settings_page.dart`：版本号连点后门 + 密码弹窗。
- `lib/pages/server_txt_manager_page.dart`：新增 PIC 文件管理/编辑页（含手动文件名增删、自适应三种取列表方式：piclist → 目录索引 → 手机已知文件名）。
- `lib/services/server_txt_service.dart`：新增服务（listTxt / fetchPicIndex / parseIndex / fetchPicTxtList(multipart) / fetchTxt / uploadTxt / 本地缓存增删）。

## 4. 服务端改动（正式服务器需自行更新）
- `index.esp`（易语言源码在 `D:\WebServer2.3.1\www\`）：POST 子程序新增：

```易语言
.判断 (请求参数 ＝ “piclist”)  ' 返回 PIC 目录全部 txt 文件名（每行一个，UTF-8）
    输出调试信息_ (“PIC文件清单”)
    临时行 ＝ 寻找文件 (取绝对路径 (请求文件) ＋ “\pic\*.txt”, )
    .判断循环首 (临时行 ≠ “”)
        json文本 ＝ json文本 ＋ 临时行 ＋ #换行符
        临时行 ＝ 寻找文件 (, )
    .判断循环尾
    返回值 ＝ 网页应答_发送数据 (ANSI转UTF8 (json文本), “html”, , , , , , , , )
    返回 (返回值)
```

- 要点：不要写“寻找文件结束”；如缺 `临时行`/`json文本` 局部变量需补声明；替换前先停服务器，替换后再启动。

## 5. 待办/备注
- 1012 安卓包已出：`build\app\outputs\flutter-apk\app-release.apk`（2026-09-09）。
- iOS 未打包；是否同步到 1011-1/1011-2、是否推送 GitHub 由用户明确告知后再做。
- 正式服务器 2026-09-09 曾出现全站 502（Cloudflare 到不了源站），与代码无关，需检查那台服务器进程/端口/网关。

## 6. 2026-09-10 补记：上传报 `HTTP 200 返回=0000100`

- 现象：后门编辑文件 →「保存并上传」→ 提示 `上传失败：HTTP 200 返回=0000100`。
- 用 curl 从外部对 `https://wenzi778899.dpdns.org/index.esp?uploadlog`（http/https 都试过、user 用 ASCII/中文/纯数字都试过）
  实测返回始终是 `ok`，且 `/PIC/<名字>.txt` 能读回刚上传的内容 —— **服务端分支本身是好的**。
- 本地 `D:\WebServer2.3.1` 全盘（含 `index.e` / `index.esp` / `WebServer.exe` / `webesp.fne`）搜不到字符串 `0000100`，
  说明它不来自补货系统的易语言源码，而是运行环境（网关/防护/别的地址）返回的。
- 已做的 APP 侧加固（`lib/services/server_txt_service.dart`）：
  1. `normalizeUrl()` 不再把 `https://` 强制降级成 `http://`（旧逻辑与使用记录上报不一致，后者一直是 https）。
  2. 上传返回非 `ok` 时，**回读服务器同名文件做二次确认**，内容一致即视为成功，避免误报失败。
  3. 失败提示带上实际请求地址，形如 `HTTP 200 返回=xxx（http://.../index.esp?uploadlog）`，便于一眼看出打到了哪台服务器。
- 仍未定位：如果重装加固版后依旧报同样的错，说明手机打到的地址不是域名那台 —— 需要看提示里括号中的地址。
- 排障遗留（可删）：测试上传在服务器 PIC 目录留下 3 个文件 `__codextest.txt`、`__codextest2.txt`、`0000100.txt`。
