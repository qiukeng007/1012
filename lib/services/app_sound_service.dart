
import 'package:audioplayers/audioplayers.dart';

/// APP 音效（目前只有扫码提示音，取自「我的店铺」APK 的 scan_beep）
class AppSoundService {
  AppSoundService._();
  static final AppSoundService instance = AppSoundService._();

  final AudioPlayer _scanPlayer = AudioPlayer();

  Future<void> playScanBeep() async {
    try {
      await _scanPlayer.stop();
      await _scanPlayer.play(
        AssetSource('sounds/scan_beep.mp3'),
        volume: 1.0,
      );
    } catch (_) {
      // 音效失败不影响扫码流程
    }
  }
}
