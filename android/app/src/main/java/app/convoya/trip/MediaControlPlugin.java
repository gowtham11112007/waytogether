package app.convoya.trip;

import android.content.Context;
import android.media.AudioManager;
import android.os.SystemClock;
import android.view.KeyEvent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Media keys for the trip music controls: play/pause/next/previous go to whichever app
 * is playing (Spotify, YouTube Music, any player), exactly like a Bluetooth headset button.
 */
@CapacitorPlugin(name = "MediaControl")
public class MediaControlPlugin extends Plugin {

    private AudioManager audio() {
        return (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
    }

    private void sendKey(int code) {
        long now = SystemClock.uptimeMillis();
        AudioManager am = audio();
        am.dispatchMediaKeyEvent(new KeyEvent(now, now, KeyEvent.ACTION_DOWN, code, 0));
        am.dispatchMediaKeyEvent(new KeyEvent(now, now, KeyEvent.ACTION_UP, code, 0));
    }

    @PluginMethod
    public void playPause(PluginCall call) {
        sendKey(KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE);
        call.resolve();
    }

    @PluginMethod
    public void next(PluginCall call) {
        sendKey(KeyEvent.KEYCODE_MEDIA_NEXT);
        call.resolve();
    }

    @PluginMethod
    public void previous(PluginCall call) {
        sendKey(KeyEvent.KEYCODE_MEDIA_PREVIOUS);
        call.resolve();
    }

    @PluginMethod
    public void volumeUp(PluginCall call) {
        audio().adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_RAISE, AudioManager.FLAG_SHOW_UI);
        call.resolve();
    }

    @PluginMethod
    public void volumeDown(PluginCall call) {
        audio().adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_LOWER, AudioManager.FLAG_SHOW_UI);
        call.resolve();
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("playing", audio().isMusicActive());
        call.resolve(result);
    }
}
