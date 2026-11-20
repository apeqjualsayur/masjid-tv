package my.masjidview.tv

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Opens the app after the TV boots, when "Buka automatik semasa TV dihidupkan" is on. Best effort:
 * Android 10+ allows it only with "Display over other apps", and some Google TVs block it anyway.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != "android.intent.action.QUICKBOOT_POWERON") return
        if (!Prefs.autoStart(context)) return
        runCatching {
            context.startActivity(Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }
}
