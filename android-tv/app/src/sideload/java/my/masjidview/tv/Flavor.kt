package my.masjidview.tv

import android.app.Activity

/** Sideload build (pilot): updates itself from masjidview.my/apk and can start when the TV boots. */
object Flavor {
    const val SELF_UPDATE = true
    const val BOOT_START = true

    /** Check for an update now and every 24 h while the app runs. */
    fun onStart(activity: Activity) = Updater.schedule(activity)

    fun checkUpdates(activity: Activity, manual: Boolean) = Updater.check(activity, manual)
}
