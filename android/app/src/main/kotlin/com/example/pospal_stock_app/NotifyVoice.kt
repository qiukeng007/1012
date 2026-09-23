package com.example.pospal_stock_app

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.io.File
import java.util.Locale
import java.util.concurrent.Executors

/**
 * 通知语音播报：系统 TTS 合成 + 自己播放。
 *
 * 为什么要自己播（而不是让引擎直接 speak）：只有自己建 AudioTrack 才能用
 * setPreferredDevice 指定「手机扬声器 / 蓝牙」——引擎自己播时输出设备由系统决定，
 * 连着蓝牙音箱时想强制用手机喇叭是做不到的。
 *
 * 合成失败或声道不支持时自动退回引擎直接播，功能不会整个废掉。
 */
object NotifyVoice {
    private var tts: TextToSpeech? = null
    private var ready = false
    private var initFailed = false
    private var lastError: String = ""
    private var appCtx: Context? = null

    private val main = Handler(Looper.getMainLooper())
    private val queue = ArrayDeque<String>()
    private var busy = false
    private var seq = 0
    private var currentFile: File? = null
    private var currentId: String = ""
    /** 当前这条要念的原文（合成格式不支持时用它退回引擎直接播） */
    private var currentText: String = ""
    /** 这条的合成回调到了没（用来兜底超时） */
    private var synthDone = false
    private var track: AudioTrack? = null
    /** 这一条是什么时候开始播的（用来发现「卡住不放」） */
    private var busyAt = 0L
    /** 最近一次真正出声的时间（0 = 这次开机以来还没出过声） */
    @Volatile
    private var lastSpokeAt = 0L
    /** 最近一次有通知要念的时间 */
    @Volatile
    private var lastCallAt = 0L
    /** 最近一次给引擎做「热身」的时间 */
    @Volatile
    private var lastWarmAt = 0L
    private val worker = Executors.newSingleThreadExecutor()

    /** 当前生效的设置（每次播报前从 NotifyConfig 重读，不用重启 App） */
    private var rate = 1.0f
    private var route = 0

    private const val MAX_PENDING = 3
    private const val MAX_ITEM_CHARS = 160
    /** 初始化失败后隔这么久允许重来一次 */
    private const val RETRY_MS = 60_000L
    /** 播报期间让 CPU 别睡的锁（锁屏不出声常常就是被冻住了） */
    private var wake: android.os.PowerManager.WakeLock? = null
    private var initAt = 0L

    fun init(context: Context) {
        appCtx = context.applicationContext
        if (busy) return
        val now = System.currentTimeMillis()
        // 已经就绪：不用管
        if (tts != null && ready) return
        // 上次失败：隔 60 秒允许重来（锁屏时引擎可能起不来，不能一辈子不再试）
        if (initFailed && now - initAt < RETRY_MS) return
        // 正在初始化：最多等 15 秒，超时当失败
        if (tts != null && now - initAt < 15_000) return
        releaseEngine()
        initAt = now
        try {
            val engine = TextToSpeech(appCtx) { status -> main.post { finishInit(status) } }
            tts = engine
            engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {}
                override fun onDone(utteranceId: String?) {
                    main.post { onUtteranceDone(utteranceId) }
                }

                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) {
                    main.post { onUtteranceError(utteranceId) }
                }

                override fun onError(utteranceId: String?, errorCode: Int) {
                    main.post { onUtteranceError(utteranceId) }
                }
            })
            // 引擎半天不回调也当失败（锁屏时被系统冻住很常见），交给下一次重试
            main.postDelayed({
                if (!ready && tts === engine) {
                    initFailed = true
                    lastError = "语音引擎初始化没反应（锁屏时系统可能把引擎冻住了）"
                }
            }, 15_000)
        } catch (t: Throwable) {
            initFailed = true
            lastError = t.toString()
        }
    }

    private fun releaseEngine() {
        try {
            tts?.stop()
        } catch (_: Throwable) {
        }
        try {
            tts?.shutdown()
        } catch (_: Throwable) {
        }
        tts = null
        ready = false
        initFailed = false
    }

    private fun finishInit(status: Int) {
        if (status != TextToSpeech.SUCCESS) {
            initFailed = true
            lastError = "TTS 引擎初始化失败（系统可能没装语音引擎）"
            return
        }
        ready = true
        pump()
    }

    /** 播报期间拿住省电锁：锁屏 / 灭屏时 CPU 一睡，合成就卡住、干脆不出声 */
    private fun holdWake(ctx: Context, ms: Long) {
        try {
            if (wake?.isHeld == true) return
            val pm = ctx.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
            val w = pm.newWakeLock(
                android.os.PowerManager.PARTIAL_WAKE_LOCK, "pospal:notifyvoice"
            )
            w.setReferenceCounted(false)
            w.acquire(ms)
            wake = w
        } catch (_: Throwable) {
        }
    }

    private fun dropWake() {
        try {
            if (wake?.isHeld == true) wake?.release()
        } catch (_: Throwable) {
        }
        wake = null
    }

    fun isReady(): Boolean = ready

    /**
     * 给语音引擎做「热身」：息屏期间定期让引擎干一件极小的事（合成一个标点）。
     *
     * 为什么需要：语音引擎是另一个 App（比如 ColorOS 的 com.oplus.ttsaccessibilityengine），
     * 息屏后常被系统的省电策略冻住。它一被冻，synthesizeToFile 的回调就一直不来，
     * 表现就是「通知收到了、也记下来了，但要等亮屏那一刻才突然念出来」。
     * 隔一会儿给它派点小活，进程就不容易被判成「闲着」而被冻。
     */
    fun warmUp() {
        val ctx = appCtx ?: return
        val now = System.currentTimeMillis()
        if (now - lastWarmAt < 30_000) return
        // 刚有通知要念 / 正在播，就先别插队，免得真消息排在热身后面
        if (busy) return
        if (now - lastCallAt < 10_000) return
        val engine = tts
        if (engine == null || !ready) {
            init(ctx)
            return
        }
        lastWarmAt = now
        try {
            val f = File.createTempFile("warm_", ".wav", ctx.cacheDir)
            // id 以 w 开头：完成/出错回调里只认 s / d，热身不会干扰正式播报
            engine.synthesizeToFile("，", Bundle(), f, "w" + (seq++))
            main.postDelayed({
                try {
                    f.delete()
                } catch (_: Throwable) {
                }
            }, 60_000)
        } catch (_: Throwable) {
        }
    }

    /** 极简状态，跟通知记录一起落盘，方便远程排查「为什么没声音」 */
    fun stateShort(): String = when {
        initFailed -> "不可用"
        !ready -> "初始化中"
        else -> "就绪"
    }

    fun statusText(): String {
        val vol = mediaVolumeText()
        val spoke = if (lastSpokeAt <= 0L) "" else "，上次播报 " +
            java.text.SimpleDateFormat("HH:mm:ss", Locale.getDefault())
                .format(java.util.Date(lastSpokeAt))
        if (initFailed) return "不可用：$lastError（约 1 分钟后自动重试）$vol$spoke"
        if (!ready) return "正在初始化$vol$spoke"
        val dev = describeRoute()
        val err = if (lastError.isEmpty()) "" else "，上次出错：$lastError"
        val eng = try {
            tts?.defaultEngine ?: "未知"
        } catch (t: Throwable) {
            "未知"
        }
        return "就绪（$dev，语速 ${rate}x，引擎 $eng$err$spoke)$vol"
    }

    /** 媒体音量：是 0 的话什么都听不见，排查时一眼就能看出来 */
    private fun mediaVolumeText(): String = try {
        val ctx = appCtx ?: return ""
        val am = ctx.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        "，媒体音量 ${am.getStreamVolume(AudioManager.STREAM_MUSIC)}" +
            "/${am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)}"
    } catch (t: Throwable) {
        ""
    }

    /** 现在会往哪个设备上放声音 */
    private fun describeRoute(): String {
        val ctx = appCtx ?: return "输出设备未知"
        val dev = pickDevice(ctx)
        return when (route) {
            1 -> "手机扬声器" + (if (dev == null) "（没找到内置扬声器，将跟随系统）" else "")
            2 -> if (dev == null) "蓝牙（当前没连蓝牙，将跟随系统）" else "蓝牙：" + devName(dev)
            else -> "跟随系统"
        }
    }

    private fun devName(d: AudioDeviceInfo): String = try {
        d.productName?.toString().orEmpty().ifEmpty { "设备" + d.id }
    } catch (t: Throwable) {
        "设备" + d.id
    }

    /** 念一条；引擎没好或正忙就排队 */
    fun speak(text: String) {
        val t = clip(text)
        if (t.isEmpty()) return
        lastCallAt = System.currentTimeMillis()
        if (!ready) appCtx?.let { init(it) }
        if (!ready) {
            queue.addLast(t)
            while (queue.size > MAX_PENDING) queue.removeFirst()
            // 引擎起来之后不一定有人来推（初始化回调可能被系统吞掉），自己再推一次
            main.postDelayed({ pump() }, 1500)
            return
        }
        queue.addLast(t)
        while (queue.size > 8) queue.removeFirst()
        pump()
    }

    private fun pump() {
        val ctx = appCtx ?: return
        if (busy) {
            // 上一条卡住了（播放线程被音频设备拖死）：强行拆掉，
            // 否则 busy 一直为真，后面所有通知都会静悄悄不响。
            if (System.currentTimeMillis() - busyAt > 25_000) {
                lastError = "上一条播报卡住，已强制跳过"
                try {
                    track?.stop()
                } catch (_: Throwable) {
                }
                currentId = ""
                cleanupCurrentFile()
                busy = false
            } else {
                return
            }
        }
        if (!ready) return
        val text = queue.removeFirstOrNull() ?: return
        // 一次拿 1 分钟，播完就放掉；万一没放掉也会自己过期
        // （注意要放在取到内容之后：以前队列空也抢锁，等于常年抱着唤醒锁不放）
        holdWake(ctx, 60_000)
        busy = true
        busyAt = System.currentTimeMillis()
        val cfg = NotifyConfig.prefs(ctx)
        rate = cfg.getFloat(NotifyConfig.KEY_RATE, 1.0f).coerceIn(0.5f, 2.0f)
        route = cfg.getInt(NotifyConfig.KEY_ROUTE, 0)
        val engine = tts ?: run { busy = false; return }
        try {
            engine.setSpeechRate(rate)
            engine.setPitch(1.0f)
            val loc = localeFor(text)
            if (engine.isLanguageAvailable(loc) >= TextToSpeech.LANG_AVAILABLE) {
                engine.language = loc
            } else {
                engine.language = Locale.getDefault()
            }
        } catch (_: Throwable) {
        }
        val id = "s" + (seq++)
        currentId = id
        currentText = text
        synthDone = false
        // 这条要是 20 秒还没播完（合成不来、播放线程被音频设备卡住），强拆放行，
        // 否则 busy 卡着，之后所有通知都静音 —— 用户看到的就是「不播报」
        main.postDelayed({
            if (busy && currentId == id) {
                lastError = "这条播报超过 20 秒没结束，已强制跳过"
                try {
                    track?.stop()
                } catch (_: Throwable) {
                }
                synthDone = true
                currentId = ""
                cleanupCurrentFile()
                finishCurrent()
            }
        }, 20_000)
        val f = try {
            File.createTempFile("ntf_", ".wav", ctx.cacheDir)
        } catch (t: Throwable) {
            null
        }
        if (f == null) {
            fallbackDirect(text)
            return
        }
        currentFile = f
        val r = try {
            engine.synthesizeToFile(text, Bundle(), f, id)
        } catch (t: Throwable) {
            TextToSpeech.ERROR
        }
        if (r != TextToSpeech.SUCCESS) {
            cleanupCurrentFile()
            fallbackDirect(text)
            return
        }
        // 兜底：个别引擎的合成完成回调可能不来，8 秒还没动静就放弃这条，
        // 直接让引擎自己播——否则 busy 会一直卡住，之后所有通知都念不出来
        main.postDelayed({
            if (!synthDone && currentId == id) {
                lastError = "合成超时（语音引擎息屏时被系统冻住了？），已改成让引擎直接播"
                currentId = ""
                cleanupCurrentFile()
                fallbackDirect(text)
            }
        }, 8000)
    }

    private fun fallbackDirect(text: String) {
        val engine = tts ?: run { finishCurrent(); return }
        try {
            // 引擎直接播的队列由它自己管；我们这边播完就结束当前项
            engine.speak(text, TextToSpeech.QUEUE_ADD, null, "d" + (seq++))
            lastSpokeAt = System.currentTimeMillis()
        } catch (t: Throwable) {
            lastError = t.toString()
        }
        main.postDelayed({ finishCurrent() }, 600)
    }

    private fun onUtteranceDone(id: String?) {
        if (id == null) return
        when {
            id.startsWith("s") -> {
                if (id != currentId) return
                synthDone = true
                val f = currentFile
                if (f == null) {
                    finishCurrent()
                    return
                }
                // 合成好了：丢到工作线程去播（写音频是阻塞操作）
                worker.execute {
                    try {
                        playFile(f)
                    } catch (t: Throwable) {
                        lastError = "播放失败：" + t
                    }
                    main.post {
                        cleanupCurrentFile()
                        finishCurrent()
                    }
                }
            }
            id.startsWith("d") -> {
                // 引擎直接播完的那条
            }
        }
    }

    private fun onUtteranceError(id: String?) {
        if (id != null && id.startsWith("s") && id == currentId) {
            synthDone = true
            lastError = "这一条合成失败，已跳过"
            cleanupCurrentFile()
            finishCurrent()
        }
    }

    private fun finishCurrent() {
        busy = false
        if (queue.isEmpty()) dropWake()
        pump()
    }

    private fun cleanupCurrentFile() {
        try {
            currentFile?.delete()
        } catch (_: Throwable) {
        }
        currentFile = null
    }

    fun stop() {
        dropWake()
        queue.clear()
        currentText = ""
        try {
            tts?.stop()
        } catch (_: Throwable) {
        }
        try {
            track?.stop()
        } catch (_: Throwable) {
        }
        try {
            track?.release()
        } catch (_: Throwable) {
        }
        track = null
        cleanupCurrentFile()
        busy = false
    }

    // ---------- 播放合成好的 wav ----------

    private class Wav(
        val sampleRate: Int,
        val channels: Int,
        val bits: Int,
        val dataOffset: Int,
        val dataLength: Int,
        val bytes: ByteArray
    )

    private fun playFile(f: File) {
        val ctx = appCtx ?: return
        val wav = readWav(f)
        if (wav == null || wav.bits != 16 || wav.dataLength <= 0) {
            lastError = "合成音频格式不支持，已退回引擎直接播"
            main.post {
                cleanupCurrentFile()
                val engine = tts
                try {
                    if (currentText.isNotEmpty()) {
                        engine?.speak(currentText, TextToSpeech.QUEUE_ADD, null, "d" + (seq++))
                    }
                } catch (_: Throwable) {
                }
            }
            return
        }
        val chMask =
            if (wav.channels <= 1) AudioFormat.CHANNEL_OUT_MONO else AudioFormat.CHANNEL_OUT_STEREO
        val minBuf = AudioTrack.getMinBufferSize(
            wav.sampleRate, chMask, AudioFormat.ENCODING_PCM_16BIT
        )
        val bufSize = if (minBuf > 0) minBuf * 2 else 16384
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
        val format = AudioFormat.Builder()
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setSampleRate(wav.sampleRate)
            .setChannelMask(chMask)
            .build()
        val t = AudioTrack.Builder()
            .setAudioAttributes(attrs)
            .setAudioFormat(format)
            .setBufferSizeInBytes(bufSize)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()
        // 只有「强制手机扬声器」才自己指定输出设备。跟随系统 / 蓝牙交给系统去路由：
        // 硬指定蓝牙设备，在 LE Audio、设备刚断开等情况下会变成「哪个地方都不出声」。
        val dev = if (route == 1) pickDevice(ctx) else null
        if (dev != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                t.preferredDevice = dev
            } catch (_: Throwable) {
            }
        }
        track = t
        try {
            t.play()
            lastSpokeAt = System.currentTimeMillis()
            if (dev != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    val routed = t.routedDevice
                    if (routed != null && routed.type != dev.type) {
                        lastError = "指定了" + devName(dev) + "，实际走了" + devName(routed)
                    }
                } catch (_: Throwable) {
                }
            }
            var off = wav.dataOffset
            val end = wav.dataOffset + wav.dataLength
            val bytesPerFrame = if (wav.channels <= 1) 2 else 4
            var frames = 0L
            while (off < end) {
                val n = minOf(8192, end - off)
                val w = t.write(wav.bytes, off, n)
                if (w <= 0) break
                off += w
                frames += (w / bytesPerFrame).toLong()
            }
            // MODE_STREAM 的 track 一旦 stop()，缓冲区里还没放出来的数据会被直接丢掉，
            // 短句经常整条被吃掉（听着就是「一点声音都没有」）。所以等它播完再停。
            val deadline = System.currentTimeMillis() + 8000
            while (System.currentTimeMillis() < deadline &&
                t.playbackHeadPosition.toLong() < frames
            ) {
                try {
                    Thread.sleep(20)
                } catch (_: InterruptedException) {
                }
            }
            try {
                t.stop()
            } catch (_: Throwable) {
            }
        } finally {
            try {
                t.release()
            } catch (_: Throwable) {
            }
            if (track === t) track = null
        }
    }

    /** 挑一个输出设备；返回 null = 跟随系统 */
    private fun pickDevice(ctx: Context): AudioDeviceInfo? {
        if (route == 0) return null
        val am = ctx.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return null
        val outs = try {
            am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
        } catch (t: Throwable) {
            null
        } ?: return null
        return when (route) {
            1 -> outs.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
            2 -> outs.firstOrNull { it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP }
                ?: outs.firstOrNull { it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO }
            else -> null
        }
    }

    /** 读 wav 头（TTS 合成出来的是标准 RIFF/WAVE） */
    private fun readWav(f: File): Wav? {
        val b = try {
            f.readBytes()
        } catch (t: Throwable) {
            return null
        }
        if (b.size < 44) return null
        if (b[0].toInt() != 'R'.code || b[1].toInt() != 'I'.code) return null
        var pos = 12
        var sampleRate = 0
        var channels = 1
        var bits = 16
        var dataOff = -1
        var dataLen = 0
        while (pos + 8 <= b.size) {
            val id = String(b, pos, 4, Charsets.US_ASCII)
            val size = le32(b, pos + 4)
            val body = pos + 8
            when (id) {
                "fmt " -> {
                    if (body + 16 <= b.size) {
                        channels = le16(b, body + 2)
                        sampleRate = le32(b, body + 4)
                        bits = le16(b, body + 14)
                    }
                }
                "data" -> {
                    dataOff = body
                    dataLen = minOf(size, b.size - body)
                }
            }
            if (size <= 0) break
            pos = body + size + (size and 1)
        }
        if (dataOff < 0 || sampleRate <= 0 || dataLen <= 0) return null
        return Wav(sampleRate, channels, bits, dataOff, dataLen, b)
    }

    private fun le16(b: ByteArray, p: Int): Int =
        (b[p].toInt() and 0xFF) or ((b[p + 1].toInt() and 0xFF) shl 8)

    private fun le32(b: ByteArray, p: Int): Int =
        (b[p].toInt() and 0xFF) or
            ((b[p + 1].toInt() and 0xFF) shl 8) or
            ((b[p + 2].toInt() and 0xFF) shl 16) or
            ((b[p + 3].toInt() and 0xFF) shl 24)

    private fun clip(text: String): String {
        val t = text.trim().replace('\n', ' ').replace("  ", " ")
        return if (t.length <= MAX_ITEM_CHARS) t else t.take(MAX_ITEM_CHARS) + "…"
    }

    /** 中文内容用中文念、英文内容用英文念 */
    private fun localeFor(text: String): Locale {
        val hasCjk = text.any { it.code in 0x4E00..0x9FFF }
        return if (hasCjk) Locale.SIMPLIFIED_CHINESE else Locale.US
    }
}
