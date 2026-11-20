package my.masjidview.tv

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.webkit.WebViewCompat

/** Settings kept on the TV (survive restarts and updates). */
object Prefs {
    private const val FILE = "shell"
    private const val AUTOSTART = "autostart"

    fun autoStart(c: Context): Boolean = c.getSharedPreferences(FILE, Context.MODE_PRIVATE).getBoolean(AUTOSTART, false)

    fun setAutoStart(c: Context, on: Boolean) {
        c.getSharedPreferences(FILE, Context.MODE_PRIVATE).edit().putBoolean(AUTOSTART, on).apply()
    }
}

/**
 * The page is a modern Next.js build (Chrome 111+ features), so very old Android System WebView
 * versions cannot run it (PRD enhancements §8.6).
 */
object WebViewSupport {
    const val MIN_MAJOR = 111

    fun version(c: Context): String? = runCatching { WebViewCompat.getCurrentWebViewPackage(c)?.versionName }.getOrNull()

    fun major(c: Context): Int? = version(c)?.substringBefore('.')?.toIntOrNull()

    fun ok(c: Context): Boolean = (major(c) ?: 0) >= MIN_MAJOR
}

/** The page the app shows, with the shell's version so the admin can show "App TV x.y.z" (§8.3). */
fun startUrl(): String = "${BuildConfig.START_URL}?shell=apk&shellv=${BuildConfig.VERSION_NAME}"

/** "https://masjidview.my/tv/?a=1" → "https://masjidview.my" (null for non-http(s) URLs). */
fun originOf(url: String?): String? {
    val m = Regex("^(https?)://([^/?#]+)", RegexOption.IGNORE_CASE).find(url ?: return null) ?: return null
    return "${m.groupValues[1].lowercase()}://${m.groupValues[2].lowercase()}"
}

/** Large, remote-friendly pieces for the native screens (10-foot UI). */
object Ui {
    fun sp(c: Context, v: Float): Float = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, v, c.resources.displayMetrics)
    fun dp(c: Context, v: Int): Int = (v * c.resources.displayMetrics.density).toInt()

    fun column(c: Context): LinearLayout = LinearLayout(c).apply {
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER
        val p = dp(c, 48)
        setPadding(p, p, p, p)
        setBackgroundColor(Color.parseColor("#0B1F17"))
    }

    fun title(c: Context, text: CharSequence): TextView = TextView(c).apply {
        this.text = text
        setTextColor(Color.WHITE)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 32f)
        typeface = Typeface.DEFAULT_BOLD
        gravity = Gravity.CENTER
    }

    fun body(c: Context, text: CharSequence, center: Boolean = true): TextView = TextView(c).apply {
        this.text = text
        setTextColor(Color.parseColor("#D7E4DD"))
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
        gravity = if (center) Gravity.CENTER else Gravity.START
        setLineSpacing(0f, 1.25f)
        setPadding(0, dp(c, 12), 0, 0)
    }

    fun button(c: Context, text: CharSequence, onClick: (View) -> Unit): Button = Button(c).apply {
        this.text = text
        isAllCaps = false
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
        minHeight = dp(c, 56)
        isFocusable = true
        setOnClickListener(onClick)
    }

    fun lp(c: Context, top: Int = 16): LinearLayout.LayoutParams =
        LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(c, top) }
}
