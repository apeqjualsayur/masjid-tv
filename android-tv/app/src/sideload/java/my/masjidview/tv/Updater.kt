package my.masjidview.tv

import android.app.Activity
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.widget.Toast
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.lang.ref.WeakReference
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import kotlin.concurrent.thread

/**
 * Self-update for the sideload build (PRD enhancements §8.2): read masjidview.my/apk/latest.json on
 * start and every 24 h; when its versionCode is higher, ask; download to the app cache, check size and
 * SHA-256, then hand the file to the Android installer. The installer itself asks for confirmation.
 */
object Updater {
    private const val LATEST_URL = "https://masjidview.my/apk/latest.json"
    private const val APK_URL = "https://masjidview.my/apk/masjidview-tv.apk"
    private const val DAY_MS = 24 * 60 * 60 * 1000L

    data class Latest(val versionCode: Int, val versionName: String, val sha256: String, val bytes: Long, val notes: String)

    private val main = Handler(Looper.getMainLooper())
    private var tick: Runnable? = null
    @Volatile private var busy = false

    fun schedule(activity: Activity) {
        val ref = WeakReference(activity)
        tick?.let(main::removeCallbacks)
        val r = object : Runnable {
            override fun run() {
                ref.get()?.takeIf { !it.isFinishing }?.let { check(it, manual = false) } ?: return
                main.postDelayed(this, DAY_MS)
            }
        }
        tick = r
        main.postDelayed(r, 20_000) // let the page load first
    }

    fun check(activity: Activity, manual: Boolean) {
        if (busy) return
        busy = true
        thread(name = "update-check") {
            val latest = runCatching { fetchLatest() }.getOrNull()
            activity.runOnUiThread {
                busy = false
                if (activity.isFinishing) return@runOnUiThread
                when {
                    latest == null -> if (manual) toast(activity, activity.getString(R.string.update_check_failed))
                    latest.versionCode <= BuildConfig.VERSION_CODE ->
                        if (manual) toast(activity, activity.getString(R.string.update_latest, BuildConfig.VERSION_NAME))
                    else -> ask(activity, latest)
                }
            }
        }
    }

    private fun fetchLatest(): Latest {
        val c = URL(LATEST_URL).openConnection() as HttpURLConnection
        c.connectTimeout = 15_000
        c.readTimeout = 15_000
        c.useCaches = false
        c.setRequestProperty("Cache-Control", "no-cache")
        try {
            val j = JSONObject(c.inputStream.bufferedReader().use { it.readText() })
            return Latest(
                versionCode = j.getInt("versionCode"),
                versionName = j.getString("versionName"),
                sha256 = j.getString("sha256").lowercase(),
                bytes = j.getLong("bytes"),
                notes = j.optString("notes", ""),
            )
        } finally {
            c.disconnect()
        }
    }

    private fun ask(a: Activity, l: Latest) {
        val msg = buildString {
            append(a.getString(R.string.update_message, l.versionName, BuildConfig.VERSION_NAME))
            if (l.notes.isNotBlank()) append("\n\n").append(l.notes)
        }
        AlertDialog.Builder(a)
            .setTitle(R.string.update_title)
            .setMessage(msg)
            .setPositiveButton(R.string.update_yes) { _, _ -> download(a, l) }
            .setNegativeButton(R.string.update_later, null)
            .show()
            .getButton(AlertDialog.BUTTON_POSITIVE)?.requestFocus()
    }

    private fun download(a: Activity, l: Latest) {
        if (busy) return
        busy = true
        toast(a, a.getString(R.string.update_downloading))
        val app = a.applicationContext
        thread(name = "update-download") {
            val dir = File(app.cacheDir, "updates").apply { mkdirs() }
            val file = File(dir, "masjidview-tv.apk")
            val ok = runCatching {
                val c = URL(APK_URL).openConnection() as HttpURLConnection
                c.connectTimeout = 15_000
                c.readTimeout = 60_000
                c.useCaches = false
                val md = MessageDigest.getInstance("SHA-256")
                var size = 0L
                try {
                    c.inputStream.use { input ->
                        file.outputStream().use { out ->
                            val buf = ByteArray(64 * 1024)
                            while (true) {
                                val n = input.read(buf)
                                if (n < 0) break
                                md.update(buf, 0, n)
                                out.write(buf, 0, n)
                                size += n
                            }
                        }
                    }
                } finally {
                    c.disconnect()
                }
                val hex = md.digest().joinToString("") { "%02x".format(it) }
                size == l.bytes && hex == l.sha256
            }.getOrDefault(false)
            if (!ok) file.delete()
            a.runOnUiThread {
                busy = false
                if (a.isFinishing) return@runOnUiThread
                if (ok) install(a, file) else toast(a, a.getString(R.string.update_bad_file))
            }
        }
    }

    private fun install(a: Activity, file: File) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !a.packageManager.canRequestPackageInstalls()) {
            AlertDialog.Builder(a)
                .setTitle(R.string.update_allow_title)
                .setMessage(R.string.update_allow_message)
                .setPositiveButton(R.string.update_allow_open) { _, _ ->
                    try {
                        a.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${a.packageName}")))
                    } catch (_: ActivityNotFoundException) {
                        toast(a, a.getString(R.string.update_allow_missing))
                    }
                }
                .setNegativeButton(R.string.update_later, null)
                .show()
            return
        }
        val uri = FileProvider.getUriForFile(a, "${a.packageName}.updates", file)
        val intent = Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            a.startActivity(intent)
        } catch (_: ActivityNotFoundException) {
            toast(a, a.getString(R.string.update_allow_missing))
        }
    }

    private fun toast(a: Activity, text: String) = Toast.makeText(a, text, Toast.LENGTH_LONG).show()
}
