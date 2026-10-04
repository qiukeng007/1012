package com.example.pospal_stock_app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.example.pospal_stock_app.R

class KeepAliveService : Service() {

    companion object {
        const val CHANNEL_ID = "keep_alive_v5"
        /** 旧频道：都要删掉，免得系统还照老设置走
         *  v3 = 会响会弹横幅；v4 = 静音频道（状态栏不显示图标） */
        val OLD_CHANNEL_IDS = listOf("keep_alive_v3", "keep_alive_v4")
        const val NOTIFICATION_ID = 520
        private var running = false

        fun start(context: Context) {
            if (running) return
            val intent = Intent(context, KeepAliveService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            running = false
            context.stopService(Intent(context, KeepAliveService::class.java))
        }

        fun isRunning(): Boolean = running
    }

    override fun onBind(intent: Intent?): IBinder? = null

    /**
     * 自愈守护：每隔一会儿看一眼「通知监听」还在不在。
     * 装完新包、被系统省电清理之后，监听常被静默解绑（界面上看不出来），
     * 这里每 15 秒喊系统重新绑一次，用户不用自己去开 App。
     */
    private val guardHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private val guard = object : Runnable {
        override fun run() {
            try {
                if (NotifyListenerService.isEnabled(this@KeepAliveService) &&
                    !NotifyListenerService.isConnected()
                ) {
                    // 后台自己接回来（内部带限流，不会每 15 秒都做一次重活）
                    NotifyListenerService.hardReconnect(this@KeepAliveService)
                }
                // 息屏期间给语音引擎热身：它被系统冻住的话，通知要等亮屏才念得出来
                if (!NotifyConfig.screenOnNow(this@KeepAliveService)) {
                    NotifyVoice.warmUp()
                }
            } catch (_: Throwable) {
            }
            guardHandler.postDelayed(this, 15000L)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        guardHandler.postDelayed(guard, 5000L)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        try {
            startForeground(NOTIFICATION_ID, buildNotification())
            running = true
        } catch (e: Exception) {
            // Android 13+ 未授权通知权限时 startForeground 会抛异常
            // 此时服务仍运行但无通知，系统可能稍后杀死服务
            android.util.Log.w("KeepAliveService", "startForeground failed: ${e.message}")
        }
        return START_STICKY
    }

    override fun onDestroy() {
        running = false
        try {
            guardHandler.removeCallbacks(guard)
        } catch (_: Throwable) {
        }
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // 优先级用 DEFAULT（不是 LOW）：
            //   LOW/MIN 的频道系统不给画状态栏图标，还会被折叠进「静默通知」，
            //   表现就是「下拉有时看得到有时看不到、顶部一直没图标」。
            // 但声音和震动都关掉、也不设 sound —— 所以它只是安静地挂在状态栏，
            // 既不响也不会弹横幅。
            val channel = NotificationChannel(
                CHANNEL_ID,
                "保持在线",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "银豹查询后台保活服务"
                setShowBadge(false)
                setSound(null, null)
                enableVibration(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
            for (old in OLD_CHANNEL_IDS) {
                try {
                    manager.deleteNotificationChannel(old)
                } catch (_: Throwable) {
                }
            }
        }
    }

    private fun buildNotification(): Notification {
        // 点击通知回到 App
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("银豹查询")
            .setContentText("保持在线 · 门店会话保活中")
            // 小图标必须是纯白剪影：用 launcher 图标的话状态栏会是一块白斑
            .setSmallIcon(R.drawable.ic_stat_pospal)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOnlyAlertOnce(true)
            .setContentIntent(pendingIntent)
            .build()
    }
}
