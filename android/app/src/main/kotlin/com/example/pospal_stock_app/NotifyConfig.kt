package com.example.pospal_stock_app

import android.content.Context
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/**
 * 通知播报的所有设置项。统一存在安卓侧，锁屏/App 不在前台时也读得到。
 */
object NotifyConfig {
    const val PREFS = "notify_prefs"

    /** 语音播报总开关 */
    const val KEY_SPEAK = "speak_enabled"
    /** 语速 0.5 ~ 2.0 */
    const val KEY_RATE = "speak_rate"
    /** 播报方式：0 跟随系统 / 1 手机扬声器 / 2 蓝牙 */
    const val KEY_ROUTE = "speak_route"
    /** 亮屏时也播报 */
    const val KEY_SCREEN_ON = "speak_screen_on"
    /** 启用时段（只在时间段内播报） */
    const val KEY_ACTIVE = "active_enabled"
    const val KEY_ACTIVE_START = "active_start_min"
    const val KEY_ACTIVE_END = "active_end_min"
    /** 屏蔽词，一行一个 */
    const val KEY_SKIP_WORDS = "skip_words"
    /** 监听哪些应用：0 全部 / 1 只监听勾选的 */
    const val KEY_APP_MODE = "app_mode"
    /** 勾选的应用包名，逗号分隔 */
    const val KEY_APPS = "app_list"
    /** 「播报默认关」的一次性迁移标记 */
    const val MIGRATED_SPEAK_OFF = "speak_off_migrated_v1"

    const val HISTORY_FILE = "notify_history.log"
    const val HISTORY_MAX = 200

    fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun appList(ctx: Context): Set<String> =
        prefs(ctx).getString(KEY_APPS, "").orEmpty()
            .split(",")
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .toSet()

    /** 这个应用要不要监听（抓取 + 播报） */
    fun appAllowed(ctx: Context, pkg: String): Boolean {
        val sp = prefs(ctx)
        if (sp.getInt(KEY_APP_MODE, 0) != 1) return true
        return appList(ctx).contains(pkg)
    }

    /** 现在在不在「启用时段」内（没开启用时段就永远算在） */
    fun inActiveWindow(ctx: Context): Boolean {
        val sp = prefs(ctx)
        if (!sp.getBoolean(KEY_ACTIVE, false)) return true
        val start = sp.getInt(KEY_ACTIVE_START, 8 * 60)
        val end = sp.getInt(KEY_ACTIVE_END, 22 * 60)
        val cal = Calendar.getInstance()
        val now = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
        return if (start <= end) now in start until end else (now >= start || now < end)
    }

    /**
     * 现在屏幕是不是「正常亮着」。
     * 注意息屏显示（AOD）不算：那时屏幕看着是亮的，人其实已经走开了。
     * 只用 isInteractive 判断会把 AOD 也算成亮屏，于是锁屏放着也被当成「正在用手机」。
     */
    fun screenOnNow(ctx: Context): Boolean = try {
        val dm = ctx.getSystemService(Context.DISPLAY_SERVICE)
            as android.hardware.display.DisplayManager
        val st = dm.getDisplay(android.view.Display.DEFAULT_DISPLAY)?.state
            ?: android.view.Display.STATE_UNKNOWN
        when (st) {
            android.view.Display.STATE_ON -> true
            android.view.Display.STATE_DOZE,
            android.view.Display.STATE_DOZE_SUSPEND,
            android.view.Display.STATE_OFF -> false
            else -> {
                val pm = ctx.getSystemService(Context.POWER_SERVICE)
                    as android.os.PowerManager
                pm.isInteractive
            }
        }
    } catch (t: Throwable) {
        true
    }

    /** 屏幕状态的文字（只用于排查记录） */
    fun screenStateText(ctx: Context): String = try {
        val dm = ctx.getSystemService(Context.DISPLAY_SERVICE)
            as android.hardware.display.DisplayManager
        when (dm.getDisplay(android.view.Display.DEFAULT_DISPLAY)?.state) {
            android.view.Display.STATE_ON -> "正常亮着"
            android.view.Display.STATE_DOZE -> "息屏显示"
            android.view.Display.STATE_DOZE_SUSPEND -> "息屏显示(挂起)"
            android.view.Display.STATE_OFF -> "灭屏"
            else -> "未知"
        }
    } catch (t: Throwable) {
        "未知"
    }

    /**
     * 现在是不是锁屏状态。
     * 锁屏之后屏幕常常还会亮一会儿（抬手亮屏、息屏显示、刚锁上那几秒），
     * 那种时候人已经不看手机了，不能当成「在用」。
     */
    fun lockedNow(ctx: Context): Boolean = try {
        val km = ctx.getSystemService(Context.KEYGUARD_SERVICE) as android.app.KeyguardManager
        // isDeviceLocked = 「现在要密码/图案才能进桌面」。
        // 它不受智能解锁（智能锁、可信蓝牙设备）影响：连着蓝牙耳机被系统自动解锁时，
        // isKeyguardLocked 会变成 false 让人误判成「人在用手机」，这个不会。
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) km.isDeviceLocked
        else km.isKeyguardLocked
    } catch (t: Throwable) {
        false
    }

    /**
     * 现在「不用密码 / 图案就能进桌面」吗；读不到返回 null（= 不知道）。
     *
     * 和 [lockedNow] 的区别：这个刻意把「读不到」和「未锁屏」分开。判「人在用手机」时
     * 读不到绝不能猜成「未锁屏」—— 那会把锁着手机的人也当成在用，该念的不念。
     */
    fun keyguardCleared(ctx: Context): Boolean? = try {
        val km = ctx.getSystemService(Context.KEYGUARD_SERVICE) as android.app.KeyguardManager
        val locked = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
            km.isDeviceLocked
        } else {
            km.isKeyguardLocked
        }
        !locked
    } catch (t: Throwable) {
        null
    }

    /** 屏幕是哪一刻亮起来的（由 SCREEN_ON / SCREEN_OFF 广播维护） */
    @Volatile
    var screenOnAt: Long = 0L

    /**
     * 屏幕是不是「刚被点亮」。
     * 收到通知时屏幕常常自己亮一下（锁屏通知亮屏），再加上智能解锁（比如连着
     * 蓝牙耳机时自动解锁），就会被误判成「人正在用手机」→ 干脆不念了。
     * 所以刚亮起这几秒不算「在用」。
     */
    fun screenJustLit(withinMs: Long = 8000L): Boolean =
        screenOnAt > 0 && System.currentTimeMillis() - screenOnAt < withinMs

    /**
     * 自上次灭屏以来，用户有没有真正解锁过。
     * 由系统广播维护：解锁会发 ACTION_USER_PRESENT，灭屏会发 ACTION_SCREEN_OFF。
     * 这个信号比「屏幕亮不亮」「锁屏没锁屏」都靠谱：
     *   - 连着蓝牙耳机被智能解锁时，锁屏接口一直报「未锁屏」，不能信；
     *   - 屏幕上锁后还会亮一会儿、息屏显示也算亮，只看屏幕会误判。
     */
    @Volatile
    var userPresent: Boolean = false
        private set

    /** 最近一次解锁的时间 */
    @Volatile
    var userPresentAt: Long = 0L

    fun setUserPresent(v: Boolean) {
        userPresent = v
        if (v) userPresentAt = System.currentTimeMillis()
    }

    /** 上次采样时屏幕是不是亮着（用来发现「刚变成亮」） */
    @Volatile
    private var lastSeenOn = false

    /**
     * 采样一次屏幕状态，把「屏幕是什么时候亮起来的」记准。
     * 为什么不能只靠广播：App 的进程被系统冻过／刚被唤醒时，SCREEN_ON/OFF
     * 广播可能收不到，时间戳就会停在很久以前，于是「通知自己把屏幕点亮」
     * 会被误判成「人正在用手机」，该念的不念。定时采样 + 广播双保险。
     */
    fun sampleScreen(ctx: Context) {
        try {
            val on = screenOnNow(ctx)
            val now = System.currentTimeMillis()
            if (on) {
                if (!lastSeenOn || screenOnAt <= 0L) screenOnAt = now
            } else {
                // 灭屏、息屏显示都算「人走了」。
                // 开息屏显示的手机进息屏时系统不发「灭屏」广播，
                // 不在这里清掉，人走了还会一直被当成「在用」→ 该念的不念。
                screenOnAt = 0L
                setUserPresent(false)
            }
            lastSeenOn = on
        } catch (_: Throwable) {
        }
    }

    /** 屏幕已经亮了多久（秒）；屏幕灭或者不知道就返回 -1 */
    fun screenOnSecondsAgo(): Int {
        val at = screenOnAt
        if (at <= 0) return -1
        return ((System.currentTimeMillis() - at) / 1000).toInt()
    }

    /**
     * 手机是不是「正被人拿在手上用」。
     *
     *   屏幕正常亮着 + 解锁状态      → 人在用 → 不念
     *   屏幕灭 / 息屏显示 / 锁屏亮着 → 人不在 → 念
     *
     * 三个信号一起看：
     *   - 屏幕状态走 DisplayManager：只有 STATE_ON 才算「正常亮着」，息屏显示（STATE_DOZE）不算；
     *     每 2 秒采样一次，不依赖广播。
     *   - 「解锁过」走系统 ACTION_USER_PRESENT 广播，屏幕一灭 / 进息屏显示就清掉。
     *   - 再补一条 KeyguardManager：光靠上面那条广播会「漏解锁」——
     *     屏幕灭掉又亮起来、系统还没真上锁那几秒（锁屏延迟），用户直接就回到桌面 / 应用上了，
     *     系统**不会**再发 ACTION_USER_PRESENT。这时人明明在划手机，我们却一直当成「还没解锁」，
     *     亮屏时来一条念一条（真机诊断里撞见过：屏幕已亮 294 秒，还判成「还没解锁」）。
     *     所以：屏幕亮着 + 系统说「现在不用密码就能进桌面」+ 不是刚被点亮那几秒 → 人就是在用。
     *
     * 刚被点亮那几秒不算「在用」：通知自己把屏幕点亮、抬手亮屏、息屏显示转正常亮屏都会走这一下，
     * 那时人往往已经走开了（见 [screenJustLit]）。
     */
    fun inUseNow(ctx: Context): Boolean {
        if (!screenOnNow(ctx)) return false
        if (userPresent) return true
        if (screenJustLit()) return false
        // 读不到就不猜：宁可当成「可能没解锁」，也别把正在用手机的人判成不在。
        return keyguardCleared(ctx) == true
    }

    /**
     * 只在「监听服务刚连上」时用一次：屏幕正常亮着就先当成人在用。
     * 免得服务刚起来还不认识「已经解锁」这件事，把正在用手机的人当成人不在。
     * 之后靠采样纠正：屏幕一灭或进息屏显示，userPresent 立刻被清掉。
     */
    fun seedUserPresent(ctx: Context) {
        if (screenOnNow(ctx)) setUserPresent(true)
    }

    /** 现在这一刻收到通知，会不会念（给页面上那行自检用） */
    fun willSpeakNow(ctx: Context): Boolean {
        val sp = prefs(ctx)
        if (!sp.getBoolean(KEY_SPEAK, false)) return false
        if (!inActiveWindow(ctx)) return false
        if (!sp.getBoolean(KEY_SCREEN_ON, false) && inUseNow(ctx)) return false
        return true
    }

    /**
     * 一次性迁移：这一版起「语音播报」默认是关的。
     * 老版本默认开着 —— 用户从没点过那个开关，App 一起来就在播报。
     * 升级后强制关一次；之后再开/再关，完全按用户自己的选择走。
     */
    fun migrateSpeakOff(ctx: Context) {
        val sp = prefs(ctx)
        if (sp.getBoolean(MIGRATED_SPEAK_OFF, false)) return
        sp.edit()
            .putBoolean(KEY_SPEAK, false)
            .putBoolean(MIGRATED_SPEAK_OFF, true)
            .apply()
    }

    fun toJson(ctx: Context): String {
        val sp = prefs(ctx)
        val apps = JSONArray()
        appList(ctx).forEach { apps.put(it) }
        val o = JSONObject()
        o.put(KEY_SPEAK, sp.getBoolean(KEY_SPEAK, false))
        o.put(KEY_RATE, sp.getFloat(KEY_RATE, 1.0f).toDouble())
        o.put(KEY_ROUTE, sp.getInt(KEY_ROUTE, 0))
        o.put(KEY_SCREEN_ON, sp.getBoolean(KEY_SCREEN_ON, false))
        o.put(KEY_ACTIVE, sp.getBoolean(KEY_ACTIVE, false))
        o.put(KEY_ACTIVE_START, sp.getInt(KEY_ACTIVE_START, 8 * 60))
        o.put(KEY_ACTIVE_END, sp.getInt(KEY_ACTIVE_END, 22 * 60))
        o.put(KEY_SKIP_WORDS, sp.getString(KEY_SKIP_WORDS, "").orEmpty())
        o.put(KEY_APP_MODE, sp.getInt(KEY_APP_MODE, 0))
        o.put("apps", apps)
        return o.toString()
    }

    fun apply(ctx: Context, raw: String) {
        val o = JSONObject(raw)
        val apps = ArrayList<String>()
        val arr = o.optJSONArray("apps")
        if (arr != null) {
            for (i in 0 until arr.length()) {
                val s = arr.optString(i, "").trim()
                if (s.isNotEmpty()) apps.add(s)
            }
        }
        prefs(ctx).edit()
            .putBoolean(KEY_SPEAK, o.optBoolean(KEY_SPEAK, false))
            .putFloat(KEY_RATE, o.optDouble(KEY_RATE, 1.0).toFloat())
            .putInt(KEY_ROUTE, o.optInt(KEY_ROUTE, 0))
            .putBoolean(KEY_SCREEN_ON, o.optBoolean(KEY_SCREEN_ON, false))
            .putBoolean(KEY_ACTIVE, o.optBoolean(KEY_ACTIVE, false))
            .putInt(KEY_ACTIVE_START, o.optInt(KEY_ACTIVE_START, 8 * 60))
            .putInt(KEY_ACTIVE_END, o.optInt(KEY_ACTIVE_END, 22 * 60))
            .putString(KEY_SKIP_WORDS, o.optString(KEY_SKIP_WORDS, ""))
            .putInt(KEY_APP_MODE, o.optInt(KEY_APP_MODE, 0))
            .putString(KEY_APPS, apps.joinToString(","))
            .apply()
    }
}
