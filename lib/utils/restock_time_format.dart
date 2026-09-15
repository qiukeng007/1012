/// 「补货提交时间记录」文件的格式处理。
///
/// 纯文本处理，不依赖 Flutter / 网络，方便单独自检。
/// 文件长这样（一行一个条码，可以直接在服务器上手工改）：
///
///   # 补货提交时间记录（一行一个条码，可直接手工编辑）
///   6901234567890=2026.09.14 15:22 新店 张三
///
/// 读的时候看不懂的行直接跳过：手工编辑写坏一行，不会让整份记录失效。
class RestockTimeFormat {
  RestockTimeFormat._();

  /// 文件最多保留多少条（防止越滚越大）
  static const int maxEntries = 3000;

  /// 记录只认最近这么多天：超期的既不显示（补货按钮上当作没有记录），
  /// 也会在下次有人提交补货时从文件里删掉——正常一个月补一次货，
  /// 留 20 天足够用，文件不会越滚越大。
  static const int recentDays = 20;

  /// 文件第一行的说明（写回时会带上）
  static const String header =
      '# 补货提交时间记录（一行一个条码，只保留最近20天，可直接手工编辑）';

  /// 解析文件内容：条码 → 一行记录
  static Map<String, String> parse(String text) {
    final map = <String, String>{};
    for (final raw in text.split('\n')) {
      final line = raw.trim();
      if (line.isEmpty || line.startsWith('#')) continue;
      final i = line.indexOf('=');
      if (i <= 0) continue;
      final code = line.substring(0, i).trim();
      final value = line.substring(i + 1).trim();
      if (code.isEmpty || value.isEmpty) continue;
      map[code] = value;
    }
    return map;
  }

  /// 从一行记录里取日期部分：'2026.09.14 15:22 新店 张三' → '2026.09.14'
  static String dateOf(String value) => value.trim().split(RegExp(r'\s+')).first;

  /// 一行记录里的日期时间：'2026.09.14 15:22 新店 张三' → 2026-09-14 15:22
  /// （只写日期也行；看不懂的返回 null，这种行按「过期」处理）
  static DateTime? dateTimeOf(String value) {
    final parts = value.trim().split(RegExp(r'\s+'));
    if (parts.length < 1) return null;
    final d = parts[0].split('.');
    if (d.length != 3) return null;
    final y = int.tryParse(d[0]);
    final m = int.tryParse(d[1]);
    final day = int.tryParse(d[2]);
    if (y == null || m == null || day == null) return null;
    if (m < 1 || m > 12 || day < 1 || day > 31) return null;
    var hour = 0;
    var minute = 0;
    if (parts.length > 1 && parts[1].contains(':')) {
      final hm = parts[1].split(':');
      hour = int.tryParse(hm[0]) ?? 0;
      if (hm.length > 1) minute = int.tryParse(hm[1]) ?? 0;
    }
    return DateTime(y, m, day, hour, minute);
  }

  /// 这条记录是不是还在「最近 days 天」里（按天算，不看具体几点）
  static bool isRecent(String value, DateTime now, {int days = recentDays}) {
    final t = dateTimeOf(value);
    if (t == null) return false;
    final today = DateTime(now.year, now.month, now.day);
    final day = DateTime(t.year, t.month, t.day);
    return today.difference(day).inDays <= days;
  }

  /// 只留下还有效的记录（超期的被丢掉，写回服务器时就不会再出现）
  static Map<String, String> keepRecent(Map<String, String> lines, DateTime now,
      {int days = recentDays}) {
    final out = <String, String>{};
    lines.forEach((code, value) {
      if (isRecent(value, now, days: days)) out[code] = value;
    });
    return out;
  }

  /// '2026.09.14'
  static String dateOfTime(DateTime t) =>
      '${t.year}.${_p(t.month)}.${_p(t.day)}';

  /// '2026.09.14 15:22'
  static String stamp(DateTime t) =>
      '${dateOfTime(t)} ${_p(t.hour)}:${_p(t.minute)}';

  /// 生成要写回服务器的内容：最新的排前面，最多保留 maxEntries 条。
  /// 注意结尾带换行——这台服务器要求内容以换行结尾才收（实测）。
  static String serialize(Map<String, String> lines) {
    final entries = lines.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final sb = StringBuffer();
    sb.writeln(header);
    var n = 0;
    for (final e in entries) {
      if (n >= maxEntries) break;
      sb.writeln('${e.key}=${e.value}');
      n++;
    }
    return sb.toString();
  }

  static String _p(int v) => v.toString().padLeft(2, '0');
}
