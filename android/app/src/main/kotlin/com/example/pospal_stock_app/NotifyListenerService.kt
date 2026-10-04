package com.example.pospal_stock_app

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject
import java.io.File
import java.util.Calendar

/**
 * 通知抓取。这是系统绑定的 NotificationListenerService —— 用户在
 * 【设置 → 通知 → 通知使用权】里授权之后，系统会把每条通知主动回调进来，
 * 不依赖 App 在不在前台、屏幕亮不亮（所以锁屏也能播报）。
 *
 * 抓到之后：落盘一条记录 + 推给 App（通知页实时显示）+ 可选语音播报。
 */
class NotifyListenerService : NotificationListenerService() {

    companion object {
        private const val DEDUPE_MS = 8000L

        @Volatile
        var connected = false
            private set

        @Volatile
        var lastSkip = ""
            private set

        @Volatile
        private var sink: ((String) -> Unit)? = null

        /** 上次做「重活」（写组件状态）的时间：太频繁会刷一堆 PACKAGE_CHANGED 广播 */
        @Volatile
        private var lastHeavyAt = 0L

        /** 监听服务到底连上了没（权限开着也可能没连上，装完新包经常这样） */
        fun isConnected(): Boolean = connected

        /**
         * 尽最大力气把自己接回系统。
         *
         * 真机实测（OPPO / Android 16）：被强停过之后，标准 API
         * NotificationListenerService.requestRebind() 一点反应都没有 ——
         * 「通知使用权」名单里明明有我们，系统就是不绑（只有用户自己去系统设置
         * 里关掉再打开才会绑回来）。所以这里加码：把组件状态显式写一遍
         * （先 DEFAULT 再 ENABLED，组件全程都是启用的，没有禁用窗口），
         * 让系统收到一次「这个包变了」，从而重新登记、重新绑定监听。
         */
        fun hardReconnect(ctx: Context): String {
            val cn = ComponentName(ctx, NotifyListenerService::class.java)
            val sb = StringBuilder()
            sb.append("rebind=")
            sb.append(
                try {
                    NotificationListenerService.requestRebind(cn)
                    "ok"
                } catch (t: Throwable) {
                    "err:" + t.message
                }
            )
            val now = System.currentTimeMillis()
            val heavy = now - lastHeavyAt > 20000L
            sb.append(" component=")
            if (!heavy) {
                // 20 秒内已经写过一次了，这次只喊 requestRebind
                sb.append("skipped")
            } else {
                lastHeavyAt = now
                sb.append(
                    try {
                        val pm = ctx.packageManager
                        pm.setComponentEnabledSetting(
                            cn,
                            android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DEFAULT,
                            android.content.pm.PackageManager.DONT_KILL_APP
                        )
                        pm.setComponentEnabledSetting(
                            cn,
                            android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                            android.content.pm.PackageManager.DONT_KILL_APP
                        )
                        "ok"
                    } catch (t: Throwable) {
                        "err:" + t.message
                    }
                )
            }
            sb.append(" enabled=")
            sb.append(isEnabled(ctx))
            sb.append(" connected=")
            sb.append(connected)
            android.util.Log.i("PospalListener", "hardReconnect: " + sb)
            return sb.toString()
        }

        fun setSink(f: ((String) -> Unit)?) {
            sink = f
        }

        /** 有没有拿到「通知使用权」 */
        fun isEnabled(ctx: Context): Boolean {
            val flat = try {
                android.provider.Settings.Secure.getString(
                    ctx.contentResolver, "enabled_notification_listeners"
                )
            } catch (t: Throwable) {
                null
            } ?: return false
            return flat.split(":").any {
                ComponentName.unflattenFromString(it)?.packageName == ctx.packageName
            }
        }

        fun readHistory(ctx: Context): List<String> {
            val f = File(ctx.filesDir, NotifyConfig.HISTORY_FILE)
            if (!f.exists()) return emptyList()
            return try {
                f.readLines().filter { it.isNotBlank() }
            } catch (t: Throwable) {
                emptyList()
            }
        }

        fun appendHistory(ctx: Context, line: String) {
            try {
                val f = File(ctx.filesDir, NotifyConfig.HISTORY_FILE)
                f.appendText(line + "\n")
                val lines = f.readLines()
                if (lines.size > NotifyConfig.HISTORY_MAX * 2) {
                    f.writeText(
                        lines.takeLast(NotifyConfig.HISTORY_MAX).joinToString("\n") + "\n"
                    )
                }
            } catch (t: Throwable) {
            }
        }

        fun clearHistory(ctx: Context) {
            try {
                File(ctx.filesDir, NotifyConfig.HISTORY_FILE).writeText("")
            } catch (t: Throwable) {
            }
        }
    }

    private val dedupe = LinkedHashMap<String, Long>()

    /** 方向控制 / 零宽字符：WhatsApp、微信 用来包住对方名字的那类看不见的字符 */
    private val invisibleChars =
        Regex("[\\u200B-\\u200F\\u202A-\\u202E\\u2060\\u2066-\\u2069\\uFEFF]")

    private fun stripInvisible(raw: String): String = try {
        invisibleChars.replace(raw, "")
            .replace('\u00A0', ' ')
            .trim()
    } catch (t: Throwable) {
        raw.trim()
    }

    /** 正文开头如果是「标题 + 冒号」就返回冒号后面的内容；不像就返回 null */
    private fun stripLeadingSelf(text: String, title: String): String? {
        if (!text.startsWith(title)) return null
        var rest = text.substring(title.length).trimStart()
        if (rest.startsWith("：") || rest.startsWith(":")) {
            rest = rest.substring(1).trimStart()
        } else {
            return null
        }
        return rest.ifEmpty { null }
    }

    /** 盯着屏幕亮/灭，用来判断「屏幕是不是刚被点亮」 */
    private var screenReceiver: android.content.BroadcastReceiver? = null

    /** 每 2 秒采样一次屏幕状态：广播收不到的时候靠它兜底 */
    private val screenHandler =
        android.os.Handler(android.os.Looper.getMainLooper())
    private val sampler = object : Runnable {
        override fun run() {
            NotifyConfig.sampleScreen(this@NotifyListenerService)
            screenHandler.postDelayed(this, 2000L)
        }
    }

    private fun registerScreenReceiver() {
        if (screenReceiver != null) return
        val r = object : android.content.BroadcastReceiver() {
            override fun onReceive(c: Context?, i: android.content.Intent?) {
                when (i?.action) {
                    android.content.Intent.ACTION_SCREEN_ON ->
                        NotifyConfig.screenOnAt = System.currentTimeMillis()
                    android.content.Intent.ACTION_SCREEN_OFF -> {
                        NotifyConfig.screenOnAt = 0L
                        // 灭屏＝人走开了（无论有没有锁屏密码）
                        NotifyConfig.setUserPresent(false)
                    }
                    // 真正解锁进桌面
                    android.content.Intent.ACTION_USER_PRESENT ->
                        NotifyConfig.setUserPresent(true)
                }
            }
        }
        try {
            registerReceiver(
                r,
                android.content.IntentFilter().apply {
                    addAction(android.content.Intent.ACTION_SCREEN_ON)
                    addAction(android.content.Intent.ACTION_SCREEN_OFF)
                    addAction(android.content.Intent.ACTION_USER_PRESENT)
                }
            )
            screenReceiver = r
        } catch (_: Throwable) {
        }
    }

    override fun onDestroy() {
        try {
            screenHandler.removeCallbacks(sampler)
        } catch (_: Throwable) {
        }
        try {
            screenReceiver?.let { unregisterReceiver(it) }
        } catch (_: Throwable) {
        }
        screenReceiver = null
        super.onDestroy()
    }

    override fun onListenerConnected() {
        connected = true
        // 保活前台服务：有它挂着，系统不会把 App 冻掉，语音引擎也就能一直
        // 保持「就绪」，锁屏时来通知才念得出来。常驻挂着 —— 状态栏一直看得到
        // 「保持在线」图标（低优先级、静音，不会响也不会弹横幅）。
        try {
            KeepAliveService.start(this)
        } catch (_: Throwable) {
        }
        NotifyConfig.seedUserPresent(this)
        registerScreenReceiver()
        NotifyConfig.sampleScreen(this)
        screenHandler.removeCallbacks(sampler)
        screenHandler.post(sampler)
        try {
            NotifyVoice.init(this)
        } catch (_: Throwable) {
        }
    }

    override fun onListenerDisconnected() {
        connected = false
        // 被系统解绑后主动要求重连（进程被回收时系统也会重新绑定）。
        // 立刻喊往往不生效：隔 3 秒再喊，之后每 5 秒一轮，直到连上为止 ——
        // 省得用户自己进页面点「重连」。
        val handler = android.os.Handler(android.os.Looper.getMainLooper())
        var tries = 0
        val again = object : Runnable {
            override fun run() {
                if (connected) return
                try {
                    requestRebind(
                        ComponentName(
                            this@NotifyListenerService, NotifyListenerService::class.java
                        )
                    )
                } catch (_: Throwable) {
                }
                tries++
                if (tries < 12) handler.postDelayed(this, 5000L)
            }
        }
        handler.postDelayed(again, 3000L)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        try {
            handle(sbn)
        } catch (t: Throwable) {
            lastSkip = "处理通知出错：" + t
        }
    }

    private fun handle(sbn: StatusBarNotification) {
        val pkg = sbn.packageName ?: return
        if (pkg == packageName) return
        val n = sbn.notification ?: return
        val flags = n.flags
        if (flags and Notification.FLAG_GROUP_SUMMARY != 0) return
        if (flags and Notification.FLAG_ONGOING_EVENT != 0) return

        val ex = n.extras
        var title = ex.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
        var text = ex.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim().orEmpty()
        val big = ex.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim().orEmpty()
        if (big.length > text.length) text = big

        // 聊天类通知：带多条消息时取最后一条，能分清「谁说的」和「说了什么」
        val msgs = try {
            ex.getParcelableArray(Notification.EXTRA_MESSAGES)
        } catch (t: Throwable) {
            null
        }
        if (msgs != null && msgs.isNotEmpty()) {
            val lastMsg = msgs.last()
            if (lastMsg is android.os.Bundle) {
                val sender = lastMsg.getCharSequence("sender")?.toString()?.trim().orEmpty()
                val body = lastMsg.getCharSequence("text")?.toString()?.trim().orEmpty()
                if (body.isNotEmpty()) {
                    text = if (sender.isNotEmpty() && !body.startsWith(sender)) "$sender：$body" else body
                    if (title.isEmpty()) title = sender
                }
            }
        }
        // WhatsApp 和微信都会在对方名字外面塞一对看不见的方向控制字符
        // （U+2068 / U+2069 之类），记录里是乱码一样的东西，而且会让
        // 「名字：」这种前缀比对失败 —— 名字就被念两遍。先洗掉再比。
        title = stripInvisible(title)
        text = stripInvisible(text)

        // WhatsApp 的通知：标题就是对方的名字，正文又是「名字：内容」，
        // 记录和播报里就会出现两遍同一个名字（听起来是「WhatsApp，王川，王川：测试」）。
        // 只对 WhatsApp 去掉正文开头重复的那一份，别的 App 不动。
        if ((pkg == "com.whatsapp" || pkg == "com.whatsapp.w4b") && title.isNotEmpty()) {
            stripLeadingSelf(text, title)?.let { text = it }
        }
        if (title.isEmpty() && text.isEmpty()) return

        val app = appLabel(pkg)
        val now = System.currentTimeMillis()
        val fp = "$pkg|$title|$text"
        val last = dedupe[fp]
        if (last != null && now - last < DEDUPE_MS) return
        dedupe[fp] = now
        if (dedupe.size > 300) {
            val keys = dedupe.keys.toList()
            for (i in 0 until 150) dedupe.remove(keys[i])
        }

        // 只监听勾选的应用：没勾的直接整条忽略（不记录、不播报）
        if (!NotifyConfig.appAllowed(this, pkg)) {
            lastSkip = "该应用未勾选：" + pkg
            return
        }

        val sp = NotifyConfig.prefs(this)
        val skipped = hitsSkipWord(sp.getString(NotifyConfig.KEY_SKIP_WORDS, "").orEmpty(), title, text)
        // 启用时段：只在用户设定的时间段内工作（不设就是全天）
        val outOfWindow = !NotifyConfig.inActiveWindow(this)
        // 「亮屏时也播报」关掉之后：正在用手机时只录不念。
        // 「正在用手机」= 屏幕正常亮着 且 已解锁（见 NotifyConfig.inUseNow）
        // 先采一下屏幕状态再判断：时间戳越准，判断越准
        NotifyConfig.sampleScreen(this)
        val screenPolicyOn = sp.getBoolean(NotifyConfig.KEY_SCREEN_ON, false)
        val screenNow = isScreenOn()
        val lockedNow = NotifyConfig.lockedNow(this)
        val justLit = NotifyConfig.screenJustLit()
        val inUseNow = NotifyConfig.inUseNow(this)
        val screenBlocked = !screenPolicyOn && inUseNow
        val speakOn = sp.getBoolean(NotifyConfig.KEY_SPEAK, false) &&
            skipped == null && !outOfWindow && !screenBlocked

        val obj = JSONObject()
        obj.put("t", now)
        obj.put("app", app)
        obj.put("pkg", pkg)
        obj.put("title", title)
        obj.put("text", text)
        obj.put("spoke", speakOn)
        // 把决策依据一起写进记录：排查「为什么没念 / 为什么念了」全靠这两项
        obj.put("screenOn", screenNow)
        obj.put("screenPolicy", screenPolicyOn)
        obj.put("locked", lockedNow)
        obj.put("inUse", inUseNow)
        obj.put("justLit", justLit)
        obj.put("disp", NotifyConfig.screenStateText(this))
        obj.put("onSec", NotifyConfig.screenOnSecondsAgo())
        obj.put("unlocked", NotifyConfig.userPresent)
        if (skipped != null) obj.put("skip", skipped)
        if (outOfWindow) obj.put("outOfWindow", true)
        // 先把语音引擎当时的状态记进这条记录，再交给它念：
        // 以后排查「为什么没声音」只要看这条记录就够了
        // 语音这块一律包起来：它出任何问题都不许影响「这条通知有没有被记下来」
        if (speakOn) {
            try {
                NotifyVoice.init(this)
                // 引擎还没就绪（多半是 App 刚被系统唤醒、被冻过）：
                // 把保活服务拉起来，给它一个能把引擎拉起来的机会
                if (!NotifyVoice.isReady()) KeepAliveService.start(this)
                obj.put("voice", NotifyVoice.stateShort())
            } catch (t: Throwable) {
                obj.put("voice", "取状态出错")
                lastSkip = "取语音状态出错：" + t
            }
        }
        val line = obj.toString()
        appendHistory(this, line)
        sink?.invoke(line)

        if (speakOn) {
            try {
                val say = if (title.isEmpty()) "$app，$text" else "$app，$title，$text"
                NotifyVoice.speak(say)
            } catch (t: Throwable) {
                lastSkip = "播报出错：" + t
            }
        }
    }

    /** 命中屏蔽词就返回那个词（标题、正文各匹配一次，不区分大小写） */
    private fun hitsSkipWord(raw: String, title: String, text: String): String? {
        val words = raw.split("\n").map { it.trim() }.filter { it.isNotEmpty() }
        if (words.isEmpty()) return null
        val hay = listOf(title, text, "$title $text").map { it.lowercase() }
        for (w in words) {
            val needle = w.lowercase()
            if (hay.any { it.contains(needle) }) return w
        }
        return null
    }

    /** 屏幕是不是亮着（只写进记录里做参考，不再参与播报判断） */
    private fun isScreenOn(): Boolean = NotifyConfig.screenOnNow(this)

    private fun appLabel(pkg: String): String = try {
        val pm = packageManager
        pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
    } catch (t: Throwable) {
        pkg
    }
}
