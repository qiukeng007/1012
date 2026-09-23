package com.example.pospal_stock_app

import android.content.Context
import android.net.wifi.WifiManager
import android.os.PowerManager

/**
 * 上传期间的省电锁。
 *
 * 屏幕熄灭后 Android 会让 CPU 进入休眠，Dart 里的定时器和网络回调都会被推迟，
 * 表现就是「锁屏后照片不传了」「一条请求卡满 60 秒超时」。
 * 上传期间持有一把部分唤醒锁（PARTIAL_WAKE_LOCK）+ Wi-Fi 锁，让 CPU 和 Wi-Fi 保持工作；
 * 上传结束（队列暂空）立刻释放，不会一直耗电。
 */
object UploadWake {
    private const val TAG = "UploadWake"
    /** 单次持有上限：15 分钟内没有续期就自动过期，防止 Dart 侧异常导致一直耗电 */
    private const val TIMEOUT_MS = 15 * 60 * 1000L

    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null
    private var held = false

    @Synchronized
    fun acquire(context: Context) {
        val app = context.applicationContext
        try {
            if (wakeLock == null) {
                val pm = app.getSystemService(Context.POWER_SERVICE) as PowerManager
                wakeLock = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "pospal_stock_app:upload"
                ).apply { setReferenceCounted(false) }
            }
            val wl = wakeLock
            if (wl != null) {
                if (wl.isHeld) wl.release()
                wl.acquire(TIMEOUT_MS)
                held = wl.isHeld
            }
        } catch (e: Exception) {
            android.util.Log.w(TAG, "acquire wake lock failed: ${e.message}")
        }
        try {
            if (wifiLock == null) {
                val wm = app.getSystemService(Context.WIFI_SERVICE) as WifiManager
                wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL, "pospal_stock_app:wifi")
            }
            val fl = wifiLock
            if (fl != null && !fl.isHeld) fl.acquire()
        } catch (e: Exception) {
            android.util.Log.w(TAG, "acquire wifi lock failed: ${e.message}")
        }
    }

    @Synchronized
    fun release() {
        try {
            val wl = wakeLock
            if (wl != null && wl.isHeld) wl.release()
        } catch (e: Exception) {
            android.util.Log.w(TAG, "release wake lock failed: ${e.message}")
        }
        try {
            val fl = wifiLock
            if (fl != null && fl.isHeld) fl.release()
        } catch (e: Exception) {
            android.util.Log.w(TAG, "release wifi lock failed: ${e.message}")
        }
        held = false
    }

    @Synchronized
    fun isHeld(): Boolean = held
}
