package my.masjidview.tv

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.TypedValue
import android.widget.CheckBox
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Native Tetapan (Menu key, or hold OK 3 s): Muat semula · Buka automatik semasa TV dihidupkan ·
 * Semak kemas kini · versions (PRD enhancements §8.2). Big, D-pad friendly controls.
 */
class SettingsActivity : Activity() {
    private lateinit var webVersion: TextView
    private var overlayStatus: TextView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val col = Ui.column(this)
        col.addView(Ui.title(this, getString(R.string.settings_title)))

        val reload = Ui.button(this, getString(R.string.settings_reload)) {
            setResult(RESULT_RELOAD)
            finish()
        }
        col.addView(reload, Ui.lp(this, 28))

        if (Flavor.BOOT_START) {
            col.addView(CheckBox(this).apply {
                text = getString(R.string.settings_autostart)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
                minHeight = Ui.dp(context, 56)
                isChecked = Prefs.autoStart(context)
                isFocusable = true
                setOnCheckedChangeListener { _, on -> Prefs.setAutoStart(context, on) }
            }, Ui.lp(this))
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                col.addView(Ui.body(this, getString(R.string.settings_overlay_why), center = false))
                overlayStatus = Ui.body(this, "", center = false).also { col.addView(it) }
                col.addView(Ui.button(this, getString(R.string.settings_overlay_button)) { openOverlaySettings() }, Ui.lp(this))
            }
        }

        if (Flavor.SELF_UPDATE) {
            col.addView(Ui.button(this, getString(R.string.settings_update)) { Flavor.checkUpdates(this, manual = true) }, Ui.lp(this))
        }

        col.addView(Ui.body(this, getString(R.string.settings_version_app, BuildConfig.VERSION_NAME, BuildConfig.VERSION_CODE, BuildConfig.FLAVOR), center = false), Ui.lp(this, 28))
        col.addView(Ui.body(this, getString(R.string.settings_version_webview, WebViewSupport.version(this) ?: getString(R.string.webview_missing)), center = false))
        webVersion = Ui.body(this, getString(R.string.settings_version_web, getString(R.string.settings_version_web_loading)), center = false)
        col.addView(webVersion)

        col.addView(Ui.button(this, getString(R.string.settings_close)) { finish() }, Ui.lp(this, 28))

        setContentView(ScrollView(this).apply {
            isFillViewport = true
            addView(col)
        })
        reload.requestFocus()
        loadWebVersion()
    }

    override fun onResume() {
        super.onResume()
        // Back from the system screen: show whether the overlay permission is now on.
        overlayStatus?.let { s ->
            val ok = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)
            s.text = if (ok) getString(R.string.settings_overlay_ok) else ""
        }
    }

    private fun openOverlaySettings() {
        try {
            startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, R.string.settings_overlay_missing, Toast.LENGTH_LONG).show()
        }
    }

    /** The web app's own version, from the same version.json the TV page uses. */
    private fun loadWebVersion() {
        thread(name = "web-version") {
            val v = runCatching {
                val c = URL("${BuildConfig.ALLOWED_ORIGIN}/version.json").openConnection() as HttpURLConnection
                c.connectTimeout = 10_000
                c.readTimeout = 10_000
                c.useCaches = false
                try {
                    JSONObject(c.inputStream.bufferedReader().use { it.readText() }).getString("version")
                } finally {
                    c.disconnect()
                }
            }.getOrNull()
            runOnUiThread {
                if (!isFinishing) webVersion.text = getString(R.string.settings_version_web, v ?: getString(R.string.settings_version_web_none))
            }
        }
    }

    companion object {
        const val RESULT_RELOAD = RESULT_FIRST_USER + 1
    }
}
