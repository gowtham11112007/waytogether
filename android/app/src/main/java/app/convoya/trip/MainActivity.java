package app.convoya.trip;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugins must be registered before the bridge starts.
        registerPlugin(MediaControlPlugin.class);
        registerPlugin(TripAlertsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
