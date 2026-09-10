import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/store_config.dart';
import '../services/mode_service.dart';
import '../services/server_txt_service.dart';

/// 管理员后门页面：管理补货服务器 PIC 目录下的 txt 文件。
/// 入口：配置页底部连续点击版本号 10 次 → 输入管理员密码。
///
/// 说明：部分服务器/域名（如经 CDN 转发）会拦截「目录索引」，
/// 但按文件名直接 GET 仍可用。因此本页会自动切换两种模式：
///  1) 目录索引可用 → 直接列出服务器全部 txt；
///  2) 索引被拦 → 用「手机已缓存文件 + 常用文件 + 手动添加文件名」逐一下载。
class ServerTxtManagerPage extends StatefulWidget {
  final String initialServerUrl;

  const ServerTxtManagerPage({super.key, this.initialServerUrl = ''});

  @override
  State<ServerTxtManagerPage> createState() => _ServerTxtManagerPageState();
}

class _ServerTxtManagerPageState extends State<ServerTxtManagerPage> {
  static const _urlPrefsKey = 'server_txt_mgr_url';
  static const _extraNamesKey = 'server_txt_extra_names';

  /// 索引被拦时始终尝试的常用文件
  static const _defaultSeeds = [
    'password.txt',
    'app_version.txt',
    '_app_start.txt',
  ];

  final _urlCtrl = TextEditingController();
  List<PicTxtEntry> _entries = [];
  List<String> _cached = [];
  List<String> _extraNames = [];
  bool _loading = false;
  bool _downloadingAll = false;
  bool _indexBlocked = false;
  String _status = '';
  String _diag = '';
  String _connUrl = '';

  @override
  void initState() {
    super.initState();
    _urlCtrl.text = widget.initialServerUrl.trim();
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  @override
  void dispose() {
    _urlCtrl.dispose();
    super.dispose();
  }

  String get _url => _urlCtrl.text.trim();

  /// 读当前登录模式使用的补货服务器地址（与使用记录上报同源）
  Future<String> _modeServerUrl(SharedPreferences prefs) async {
    try {
      await ModeService.instance.ensureLoaded();
      final key = ModeService.instance.isStoreMode
          ? 'restock_config_store'
          : 'restock_config_hq';
      final raw =
          prefs.getString(key) ?? prefs.getString('restock_config') ?? '';
      if (raw.isEmpty) return '';
      final cfg =
          RestockConfig.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      return cfg.serverUrl.trim();
    } catch (_) {
      return '';
    }
  }

  /// 当前操作员姓名（使用记录文件一般叫 操作员.txt）
  Future<String> _modeOperator(SharedPreferences prefs) async {
    try {
      await ModeService.instance.ensureLoaded();
      final key = ModeService.instance.isStoreMode
          ? 'restock_config_store'
          : 'restock_config_hq';
      final raw =
          prefs.getString(key) ?? prefs.getString('restock_config') ?? '';
      if (raw.isEmpty) return '';
      final cfg =
          RestockConfig.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      return cfg.operatorName.trim();
    } catch (_) {
      return '';
    }
  }

  Future<void> _bootstrap() async {
    final prefs = await SharedPreferences.getInstance();
    try {
      if (_urlCtrl.text.trim().isEmpty) {
        final cfgUrl = await _modeServerUrl(prefs);
        _urlCtrl.text =
            (cfgUrl.isNotEmpty ? cfgUrl : (prefs.getString(_urlPrefsKey) ?? ''))
                .trim();
      }
      _extraNames = prefs.getStringList(_extraNamesKey) ?? [];
    } catch (_) {}
    if (!mounted) return;
    if (_url.isEmpty) {
      setState(() => _status = '请先填写补货服务器地址');
      return;
    }
    await _refresh();
  }

  void _toast(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      duration: const Duration(seconds: 4),
    ));
  }

  Future<void> _refresh() async {
    if (_url.isEmpty) {
      setState(() => _status = '请先填写补货服务器地址');
      return;
    }
    setState(() {
      _loading = true;
      _status = '';
      _diag = '';
      _indexBlocked = false;
      _connUrl = ServerTxtService.normalizeUrl(_url);
    });
    try {
      var entries = <PicTxtEntry>[];
      var blocked = false;
      var status = '';
      var diag = '';
      // 1) 首选：服务器 piclist 接口（index.esp 新分支，只返回 txt 清单）
      final picNames =
          await ServerTxtService.instance.fetchPicTxtList(_url);
      if (picNames.isNotEmpty) {
        entries = [
          for (final n in picNames)
            PicTxtEntry(name: n, dateText: '', sizeText: ''),
        ];
        status = '已从服务器获取 ${entries.length} 个 txt 文件';
      } else {
        // 2) 备选：目录索引页（EnDir 开启的服务器可用）
        // 兜底前先缓一下：服务器若正在防护/半死，紧接着再发请求会加重被拉黑的风险
        await Future.delayed(const Duration(milliseconds: 600));
        final html = await ServerTxtService.instance.fetchPicIndex(_url);
        final indexed = ServerTxtService.parseIndex(html);
        final hasAnchors =
            RegExp(r'<a href=', caseSensitive: false).hasMatch(html);
        if (indexed.isNotEmpty || hasAnchors) {
          entries = indexed;
          if (entries.isEmpty) {
            status = '目录可访问，但其中没有 .txt 文件';
          }
        } else {
          // 3) 都拿不到：退回手机已知/手动添加的文件名
          blocked = true;
          entries = await _seedEntries();
          status = '服务器暂不能返回文件清单，已用“手机已知/常用文件名”模式';
          diag =
              'piclist 无返回且目录页 ${html.length} 字节不含文件列表（可点 ＋ 添加或更新服务器 piclist 接口）';
        }
      }
      final cached = await ServerTxtService.instance.cachedNames();
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_urlPrefsKey, _url);
      if (!mounted) return;
      setState(() {
        _entries = entries;
        _cached = cached;
        _indexBlocked = blocked;
        _loading = false;
        _status = status;
        _diag = diag;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _status = '连接失败：$e';
        _diag = '请求地址：$_connUrl/index.esp?piclist';
      });
    }
  }

  /// 索引不可用时：手机缓存 + 常用文件 + 手动添加的文件名 + 本机操作员文件
  Future<List<PicTxtEntry>> _seedEntries() async {
    final names = <String>{};
    names.addAll(_defaultSeeds);
    names.addAll(_extraNames);
    final prefs = await SharedPreferences.getInstance();
    final operator = await _modeOperator(prefs);
    if (operator.isNotEmpty) names.add('$operator.txt');
    try {
      names.addAll(await ServerTxtService.instance.cachedNames());
    } catch (_) {}
    final list = names.where((n) => n.trim().isNotEmpty).toList()..sort();
    return [
      for (final n in list)
        PicTxtEntry(name: n, dateText: '', sizeText: ''),
    ];
  }

  /// 把 PIC 目录下所有 txt 全部下载到手机本地
  Future<void> _downloadAll() async {
    if (_url.isEmpty || _entries.isEmpty || _downloadingAll) return;
    setState(() => _downloadingAll = true);
    var okCount = 0;
    final failNames = <String>[];
    for (var i = 0; i < _entries.length; i++) {
      final e = _entries[i];
      try {
        final text = await ServerTxtService.instance.fetchTxt(_url, e.name);
        await ServerTxtService.instance.cacheTxt(e.name, text);
        okCount++;
      } catch (err) {
        failNames.add('${e.name}（$err）');
      }
      if (!mounted) return;
      // 节流：文件之间留间隔，避免短时间内连发请求被服务器防护拉黑
      if (i < _entries.length - 1) {
        await Future.delayed(const Duration(milliseconds: 300));
      }
    }
    if (!mounted) return;
    setState(() {
      _downloadingAll = false;
      final set = <String>{..._cached, ..._entries.map((e) => e.name)};
      _cached = set.toList()..sort();
    });
    _toast(failNames.isEmpty
        ? '已全部下载到手机（$okCount 个文件）'
        : '已下载 $okCount 个，失败：${failNames.join('；')}');
  }

  Future<void> _openEditor(PicTxtEntry entry) async {
    if (_url.isEmpty) return;
    final saved = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => ServerTxtEditPage(
        serverUrl: _url,
        fileName: entry.name,
      ),
    ));
    if (saved == true && mounted) {
      setState(() {
        if (!_cached.contains(entry.name)) {
          _cached = List<String>.of(_cached)..add(entry.name);
        }
      });
      _toast('${entry.name} 已保存到服务器');
    }
  }

  /// 删除手动添加的文件名（同时清理本地缓存，避免下次刷新又出现）
  Future<void> _removeExtraName(String name) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('删除该文件名？'),
        content: Text('将从列表移除 $name。若服务器上仍有该文件，下次刷新时还会自动列出。'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('取消')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('删除')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    final prefs = await SharedPreferences.getInstance();
    final list = List<String>.of(_extraNames)..remove(name);
    _extraNames = list;
    await prefs.setStringList(_extraNamesKey, list);
    await ServerTxtService.instance.deleteCache(name);
    if (!mounted) return;
    setState(() {
      _entries = [
        for (final e in _entries)
          if (e.name != name) e
      ];
      _cached = List<String>.of(_cached)..remove(name);
    });
    _toast('已删除 $name');
  }

  Future<void> _addExtraName() async {
    final ctrl = TextEditingController();
    final input = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('添加服务器文件名'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('当目录索引被限制时，输入要查看的 txt 文件名（含 .txt）',
                style: TextStyle(fontSize: 12)),
            const SizedBox(height: 8),
            TextField(
              controller: ctrl,
              autofocus: true,
              decoration: const InputDecoration(
                  hintText: '例如：张三.txt', isDense: true),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, ctrl.text.trim()),
              child: const Text('添加')),
        ],
      ),
    );
    if (input == null || input.isEmpty) return;
    final name = input.toLowerCase().endsWith('.txt') ? input : '$input.txt';
    final prefs = await SharedPreferences.getInstance();
    final list = List<String>.of(_extraNames);
    if (!list.contains(name)) list.add(name);
    _extraNames = list;
    await prefs.setStringList(_extraNamesKey, list);
    if (mounted) _toast('已添加 $name，正在刷新…');
    await _refresh();
  }

  String _buildStatusLine() {
    if (_status.isNotEmpty) return _status;
    final conn = _connUrl.isEmpty ? '' : '（$_connUrl/PIC/）';
    return '共 ${_entries.length} 个 txt 文件$conn';
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Scaffold(
      appBar: AppBar(
        title: const Text('PIC 文件管理'),
        actions: [
          IconButton(
            tooltip: '刷新列表',
            onPressed: _loading ? null : _refresh,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _urlCtrl,
                    keyboardType: TextInputType.url,
                    textInputAction: TextInputAction.go,
                    onSubmitted: (_) => _refresh(),
                    decoration: const InputDecoration(
                      labelText: '补货服务器地址',
                      hintText: '例如 10.0.0.16 或 wenzi778899.dpdns.org',
                      isDense: true,
                      prefixIcon: Icon(Icons.dns, size: 18),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton.icon(
                  onPressed: _loading ? null : _refresh,
                  icon: const Icon(Icons.search, size: 18),
                  label: const Text('刷新'),
                ),
              ],
            ),
          ),
          if (_indexBlocked)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 2, 12, 0),
              child: Row(
                children: [
                  const Icon(Icons.info_outline,
                      size: 14, color: Colors.orange),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      '目录索引被拦截，如需添加其他用户文件名请点右侧 ＋',
                      style: TextStyle(
                          fontSize: 11, color: Colors.orange.shade800),
                    ),
                  ),
                  IconButton(
                    tooltip: '添加文件名',
                    onPressed: _loading ? null : _addExtraName,
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(Icons.add_circle_outline, size: 18),
                    color: primary,
                  ),
                ],
              ),
            ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    _buildStatusLine(),
                    style: TextStyle(
                      fontSize: 12,
                      color: _status.startsWith('连接失败')
                          ? Colors.redAccent
                          : Colors.grey.shade700,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                TextButton.icon(
                  onPressed: (_downloadingAll || _entries.isEmpty || _loading)
                      ? null
                      : _downloadAll,
                  icon: _downloadingAll
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.download, size: 16),
                  label: Text(_downloadingAll ? '下载中…' : '全部下载到手机'),
                ),
              ],
            ),
          ),
          if (_diag.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 2),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _diag,
                      style:
                          const TextStyle(fontSize: 10, color: Colors.grey),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          const Divider(height: 1),
          Expanded(
            child: _entries.isEmpty
                ? Center(
                    child: Text(
                      _loading
                          ? '正在读取…'
                          : (_status.startsWith('连接失败')
                              ? '连接失败，请检查服务器地址后重试'
                              : '暂无 txt 文件\n点击上方「刷新」获取列表'),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade600,
                          height: 1.6),
                    ),
                  )
                : ListView.separated(
                    itemCount: _entries.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, i) {
                      final e = _entries[i];
                      final hasLocal = _cached.contains(e.name);
                      final sub = [
                        if (e.dateText.isNotEmpty) e.dateText,
                        if (e.sizeText.isNotEmpty) '${e.sizeText} B',
                        if (e.dateText.isEmpty && e.sizeText.isEmpty)
                          '手机已知文件名',
                      ].join('  ·  ');
                      return ListTile(
                        dense: true,
                        leading: Icon(
                          hasLocal ? Icons.cloud_done : Icons.description,
                          size: 22,
                          color: hasLocal ? Colors.green : Colors.blueGrey,
                        ),
                        title: Text(
                          e.name,
                          style: const TextStyle(fontSize: 14),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          sub,
                          style: const TextStyle(fontSize: 11),
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              tooltip: '查看 / 编辑',
                              onPressed: () => _openEditor(e),
                              icon: const Icon(Icons.edit, size: 20),
                              color: primary,
                            ),
                            if (_extraNames.contains(e.name))
                              IconButton(
                                tooltip: '从列表删除',
                                onPressed: () => _removeExtraName(e.name),
                                icon: const Icon(Icons.delete_outline,
                                    size: 20),
                                color: Colors.redAccent,
                              ),
                          ],
                        ),
                        onTap: () => _openEditor(e),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

/// 单个 txt 的查看/编辑页：内容取自服务器，保存即覆盖回传服务器。
class ServerTxtEditPage extends StatefulWidget {
  final String serverUrl;
  final String fileName;

  const ServerTxtEditPage({
    super.key,
    required this.serverUrl,
    required this.fileName,
  });

  @override
  State<ServerTxtEditPage> createState() => _ServerTxtEditPageState();
}

class _ServerTxtEditPageState extends State<ServerTxtEditPage> {
  final _ctrl = TextEditingController();
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    String text = '';
    String? note;
    try {
      text = await ServerTxtService.instance
          .fetchTxt(widget.serverUrl, widget.fileName);
    } catch (e) {
      note = '从服务器读取失败：$e\n已改用手机本地缓存（如有）';
      text =
          await ServerTxtService.instance.readCached(widget.fileName) ?? '';
    }
    if (!mounted) return;
    setState(() {
      _ctrl.text = text;
      _loading = false;
    });
    if (note != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(note),
        duration: const Duration(seconds: 4),
      ));
    }
  }

  Future<void> _save() async {
    if (_saving) return;
    setState(() => _saving = true);
    final err = await ServerTxtService.instance
        .uploadTxt(widget.serverUrl, widget.fileName, _ctrl.text);
    if (!mounted) return;
    if (err == null) {
      await ServerTxtService.instance.cacheTxt(widget.fileName, _ctrl.text);
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } else {
      setState(() => _saving = false);
      _showSaveErrorDialog(err);
    }
  }

  /// 上传失败的取证弹窗：报错较长，用可选中文本 + 复制按钮，
  /// 直接复制文字发出来就能定位是哪一层在应答（不用截图）。
  void _showSaveErrorDialog(String detail) {
    if (!mounted) return;
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('上传失败'),
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 360),
          child: SingleChildScrollView(
            child: SelectableText(detail, style: const TextStyle(fontSize: 12)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Clipboard.setData(ClipboardData(text: detail));
              ScaffoldMessenger.of(ctx).showSnackBar(
                const SnackBar(
                  content: Text('已复制到剪贴板'),
                  duration: Duration(seconds: 2),
                ),
              );
            },
            child: const Text('复制'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('关闭'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.fileName, style: const TextStyle(fontSize: 16)),
        actions: [
          TextButton.icon(
            onPressed: _loading || _saving ? null : _load,
            icon: const Icon(Icons.refresh, size: 18),
            label: const Text('重新下载'),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : Padding(
                      padding: const EdgeInsets.all(10),
                      child: TextField(
                        controller: _ctrl,
                        maxLines: null,
                        expands: true,
                        textAlignVertical: TextAlignVertical.top,
                        // 用通用文本键盘：之前禁用联想/自动更正会被安卓输入法
                        // 当成密码框，弹出没有候选栏的安全键盘。
                        keyboardType: TextInputType.multiline,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.4,
                          fontFamily: 'monospace',
                        ),
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          hintText: '在此修改文件内容…',
                        ),
                      ),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: SizedBox(
                width: double.infinity,
                height: 46,
                child: FilledButton.icon(
                  onPressed: _loading || _saving ? null : _save,
                  icon: _saving
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.upload, size: 18),
                  label: Text(_saving ? '保存中…' : '保存并上传到服务器'),
                  style: FilledButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
