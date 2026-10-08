package app.convoya.trip;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Immediate trip notifications (SOS, stops, chat) that work while the app is in the background.
 * Posted directly with NotificationManager: no alarms, so Android 14+ never blocks them.
 */
@CapacitorPlugin(name = "TripAlerts")
public class TripAlertsPlugin extends Plugin {

    private static final String URGENT = "urgent";
    private static final String TRIP = "trip";
    private static final String CHAT = "chat";
    private int nextId = 1000;

    @Override
    public void load() {
        createChannels();
    }

    private void createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel urgent = new NotificationChannel(URGENT, "SOS & emergencies", NotificationManager.IMPORTANCE_HIGH);
        urgent.enableVibration(true);
        urgent.setVibrationPattern(new long[] {0, 400, 200, 400, 200, 800});
        urgent.setDescription("A rider in your trip needs help");
        NotificationChannel trip = new NotificationChannel(TRIP, "Trip updates", NotificationManager.IMPORTANCE_HIGH);
        trip.setDescription("Stops, wrong turns, riders falling behind");
        NotificationChannel chat = new NotificationChannel(CHAT, "Group chat", NotificationManager.IMPORTANCE_DEFAULT);
        nm.createNotificationChannel(urgent);
        nm.createNotificationChannel(trip);
        nm.createNotificationChannel(chat);
    }

    @PluginMethod
    public void show(PluginCall call) {
        String title = call.getString("title", "WayTogether");
        String body = call.getString("body", "");
        String channel = call.getString("channel", TRIP);
        Context ctx = getContext();

        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tap = PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        boolean urgent = URGENT.equals(channel);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, channel)
            .setSmallIcon(R.drawable.ic_stat_waytogether)
            .setColor(0xFF1A73E8)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(tap)
            .setPriority(urgent ? NotificationCompat.PRIORITY_MAX : NotificationCompat.PRIORITY_HIGH)
            .setCategory(urgent ? NotificationCompat.CATEGORY_ALARM : NotificationCompat.CATEGORY_MESSAGE);
        if (urgent) b.setVibrate(new long[] {0, 400, 200, 400, 200, 800});

        try {
            NotificationManagerCompat.from(ctx).notify(nextId++, b.build());
            call.resolve();
        } catch (SecurityException e) {
            call.reject("Notification permission not granted");
        }
    }
}
