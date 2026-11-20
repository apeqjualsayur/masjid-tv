package my.masjidview.tv

import android.app.Activity

/** Google Play build: Play handles updates; no boot start, no install permission (PRD enhancements §8.1). */
object Flavor {
    const val SELF_UPDATE = false
    const val BOOT_START = false

    @Suppress("UNUSED_PARAMETER")
    fun onStart(activity: Activity) = Unit

    @Suppress("UNUSED_PARAMETER")
    fun checkUpdates(activity: Activity, manual: Boolean) = Unit
}
