package com.example.pospal_stock_app

import android.Manifest
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.service.notification.NotificationListenerService
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.example.pospal_stock_app/foreground"
    private val NOTIFY_CHANNEL = "com.example.pospal_stock_app/notify"
    private val NOTIFY_EVENT_CHANNEL = "com.example.pospal_stock_app/notify_events"

    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        super.onCreate(savedInstanceState)
        // App 一起来就把语音引擎预热好：后台被系统冻过之后，引擎得重新起得来
        try {
            NotifyVoice.init(this)
        } catch (_: Throwable) {
        }
        // 起来后自检：有权限、但通知监听没连上 → 让系统重新绑一次。
        // 只喊一次不够（重启 App 后系统常常隔十几秒才肯绑），所以没连上就
        // 每 3 秒再喊一次，最多 8 次。Dart 侧还有一个盯着重连的巡查。
        val connectCheck = object : Runnable {
            private var tries = 0

            override fun run() {
                try {
                    if (!NotifyListenerService.isEnabled(this@MainActivity) ||
                        NotifyListenerService.isConnected()
                    ) {
                        return
                    }
                    // 光喊 requestRebind 这台机不理，要走加码重连
                    NotifyListenerService.hardReconnect(this@MainActivity)
                    tries++
                    if (tries < 8) {
                        android.os.Handler(android.os.Looper.getMainLooper())
                            .postDelayed(this, 3000L)
                    }
                } catch (_: Throwable) {
                }
            }
        }
        android.os.Handler(android.os.Looper.getMainLooper())
            .postDelayed(connectCheck, 1500L)
        // 这一版起「语音播报」默认是关的。老版本默认开着：用户从没点过那个
        // 开关，App 一起来就在播报。升级后强制关一次，之后按用户自己的选择来。
        try {
            NotifyConfig.migrateSpeakOff(this)
        } catch (_: Throwable) {
        }
        // Android 13+: 启动时预请求通知权限，避免前台服务启动时弹窗
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    1001
                )
            }
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 1001) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                android.util.Log.i("MainActivity", "Notification permission granted")
            } else {
                android.util.Log.w("MainActivity", "Notification permission denied")
            }
        }
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "startService" -> {
                    // 保活服务常驻挂着（前台也挂）：状态栏一直能看到「保持在线」
                    // 图标，语音引擎 / 通知监听也不会被系统冻掉
                    KeepAliveService.start(this)
                    result.success(true)
                }
                "stopService" -> {
                    KeepAliveService.stop(this)
                    result.success(true)
                }
                "isRunning" -> {
                    result.success(KeepAliveService.isRunning())
                }
                "isNotificationEnabled" -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        val nm = getSystemService(NotificationManager::class.java)
                        result.success(nm.areNotificationsEnabled())
                    } else {
                        result.success(true)
                    }
                }
                // 上传期间申请省电锁：屏幕熄灭后 CPU / Wi-Fi 继续工作
                "setUploading" -> {
                    val on = call.argument<Boolean>("on") ?: false
                    if (on) UploadWake.acquire(this) else UploadWake.release()
                    result.success(UploadWake.isHeld())
                }
                "uploadWakeHeld" -> {
                    result.success(UploadWake.isHeld())
                }
                // 电池优化白名单：不在白名单里，锁屏后系统可能直接冻结 App
                "isIgnoringBatteryOptimizations" -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        val pm = getSystemService(PowerManager::class.java)
                        result.success(pm.isIgnoringBatteryOptimizations(packageName))
                    } else {
                        result.success(true)
                    }
                }
                "requestIgnoreBatteryOptimizations" -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        try {
                            val intent =
                                Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                            intent.data = Uri.parse("package:$packageName")
                            startActivity(intent)
                            result.success(true)
                        } catch (e: Exception) {
                            result.success(false)
                        }
                    } else {
                        result.success(true)
                    }
                }
                else -> result.notImplemented()
            }
        }

        // ==================== 通知页（抓通知 + 语音播报） ====================
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, NOTIFY_CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "isListenerEnabled" -> {
                        result.success(NotifyListenerService.isEnabled(this))
                    }
                    "isListenerConnected" -> {
                        result.success(NotifyListenerService.isConnected())
                    }
                    "forceReconnect" -> {
                        val info = try {
                            NotifyListenerService.hardReconnect(this)
                        } catch (t: Throwable) {
                            "err:" + t.message
                        }
                        result.success(info)
                    }
                    "rebindListener" -> {
                        // 装完新包之后，系统经常把通知监听的绑定解掉，
                        // 表现就是「再也收不到通知」。主动要求它重新绑一次。
                        val ok = try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                                NotificationListenerService.requestRebind(
                                    ComponentName(
                                        this, NotifyListenerService::class.java
                                    )
                                )
                                true
                            } else {
                                false
                            }
                        } catch (t: Throwable) {
                            false
                        }
                        result.success(ok)
                    }
                    "openListenerSettings" -> {
                        try {
                            startActivity(
                                Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            )
                            result.success(true)
                        } catch (e: Exception) {
                            result.success(false)
                        }
                    }
                    "getHistory" -> {
                        result.success(NotifyListenerService.readHistory(this).joinToString("\n"))
                    }
                    "clearHistory" -> {
                        NotifyListenerService.clearHistory(this)
                        result.success(true)
                    }
                    "getSettings" -> {
                        result.success(NotifyConfig.toJson(this))
                    }
                    "setSettings" -> {
                        val raw = call.argument<String>("json") ?: "{}"
                        NotifyConfig.apply(this, raw)
                        result.success(true)
                    }
                    "getInstalledApps" -> {
                        // 只列有桌面图标的 App（系统进程之类不显示，免得几百条没法找）
                        val arr = org.json.JSONArray()
                        try {
                            val pm = packageManager
                            val main = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
                            val list = pm.queryIntentActivities(main, 0)
                            val seen = HashSet<String>()
                            for (ri in list) {
                                val pkg = ri.activityInfo?.packageName ?: continue
                                if (pkg == packageName || !seen.add(pkg)) continue
                                val o = org.json.JSONObject()
                                o.put("pkg", pkg)
                                o.put("label", ri.loadLabel(pm).toString())
                                arr.put(o)
                            }
                        } catch (t: Throwable) {
                            // 读不到就返回空列表，页面上会提示
                        }
                        result.success(arr.toString())
                    }
                    "getRuntimeState" -> {
                        // 页面上那行自检：现在这一刻是亮屏还是灭屏、会不会念
                        NotifyConfig.sampleScreen(this)
                        val sp = NotifyConfig.prefs(this)
                        val o = org.json.JSONObject()
                        o.put("screenOn", NotifyConfig.screenOnNow(this))
                        o.put("locked", NotifyConfig.lockedNow(this))
                        o.put("inUse", NotifyConfig.inUseNow(this))
                        o.put("justLit", NotifyConfig.screenJustLit())
                        o.put("screenOnSec", NotifyConfig.screenOnSecondsAgo())
                        o.put("disp", NotifyConfig.screenStateText(this))
                        o.put("unlocked", NotifyConfig.userPresent)
                        o.put("keyguardClear", NotifyConfig.keyguardCleared(this) == true)
                        o.put("connected", NotifyListenerService.isConnected())
                        o.put("lastSkip", NotifyListenerService.lastSkip)
                        o.put("listenerEnabled", NotifyListenerService.isEnabled(this))
                        o.put("speak", sp.getBoolean(NotifyConfig.KEY_SPEAK, true))
                        o.put("screenPolicy", sp.getBoolean(NotifyConfig.KEY_SCREEN_ON, false))
                        o.put("activeWindow", NotifyConfig.inActiveWindow(this))
                        o.put("willSpeak", NotifyConfig.willSpeakNow(this))
                        result.success(o.toString())
                    }
                    "speakTest" -> {
                        val text = call.argument<String>("text") ?: ""
                        NotifyVoice.init(this)
                        NotifyVoice.speak(text)
                        result.success(NotifyVoice.statusText())
                    }
                    "speakStatus" -> {
                        NotifyVoice.init(this)
                        result.success(NotifyVoice.statusText())
                    }
                    "stopSpeak" -> {
                        NotifyVoice.stop()
                        result.success(true)
                    }
                else -> result.notImplemented()
                }
            }

        EventChannel(flutterEngine.dartExecutor.binaryMessenger, NOTIFY_EVENT_CHANNEL)
            .setStreamHandler(object : EventChannel.StreamHandler {
                override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
                    NotifyListenerService.setSink { json -> events?.success(json) }
                }

                override fun onCancel(arguments: Any?) {
                    NotifyListenerService.setSink(null)
                }
            })
    }
}
