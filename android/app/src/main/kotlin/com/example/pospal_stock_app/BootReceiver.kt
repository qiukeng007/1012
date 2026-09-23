package com.example.pospal_stock_app

import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.service.notification.NotificationListenerService

/**
 * 开机 / 覆盖安装之后，自己把「通知监听 + 保活服务」接回来。
 * 系统本来就会自动绑通知监听，但覆盖安装新包时经常解绑完就不管了，
 * 靠这个接收器主动喊一次，用户不用自己去开 App。
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        val ctx = context ?: return
        when (intent?.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            "android.intent.action.QUICKBOOT_POWERON" -> {
            }
            else -> return
        }
        try {
            KeepAliveService.start(ctx)
        } catch (_: Throwable) {
        }
        try {
            if (NotifyListenerService.isEnabled(ctx) && !NotifyListenerService.isConnected()) {
                NotificationListenerService.requestRebind(
                    ComponentName(ctx, NotifyListenerService::class.java)
                )
            }
        } catch (_: Throwable) {
        }
    }
}
