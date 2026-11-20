package my.masjidview.tv

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.ServiceWorkerController
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import org.json.JSONObject
import java.io.ByteArrayInputStream

/**
 * One full-screen WebView showing masjidview.my/tv (PRD enhancements §8.1–8.2). Everything the TV
 * shows is the web app; this shell keeps it on screen, healthy and up to date.
 */
class MainActivity : Activity() {
    private lateinit var root: FrameLayout
    private var web: WebView? = null
    private var message: View? = null
    private val handler = Handler(Looper.getMainLooper())

    /** elapsedRealtime of the page's last heartbeat; 0 = it never sent one (older web app: no watchdog). */
    @Volatile private var lastBeat = 0L
    /** The page on screen is ours (the bridge answers only then). */
    @Volatile private var pageAllowed = false
    private var mainFrameFailed = false
    private var lastBack = 0L
    private var okHeld = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        root = FrameLayout(this).apply { setBackgroundColor(Color.BLACK) }
        setContentView(root)
        if (WebViewSupport.ok(this)) start() else showOldWebView()
        handler.postDelayed(watchdog, WATCHDOG_MS)
        Flavor.onStart(this)
    }

    private fun start() {
        hideMessage()
        if (web == null) {
            web = createWebView().also { root.addView(it, 0, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)) }
        }
        load()
    }

    private fun load() {
        mainFrameFailed = false
        handler.removeCallbacks(retry)
        web?.loadUrl(startUrl())
    }

    /** Muat semula from Tetapan. */
    fun reload() {
        lastBeat = 0L
        if (web == null) start() else load()
    }

    @SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
    private fun createWebView(): WebView {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            ServiceWorkerController.getInstance().serviceWorkerWebSettings.apply {
                allowContentAccess = false
                allowFileAccess = false
                blockNetworkLoads = false
                cacheMode = WebSettings.LOAD_DEFAULT
            }
        }
        return WebView(this).apply {
            setBackgroundColor(Color.BLACK)
            isFocusable = true
            isFocusableInTouchMode = true
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true // localStorage + IndexedDB: the pairing survives restarts and updates
                mediaPlaybackRequiresUserGesture = false // azan / iqamah sound cues
                allowFileAccess = false
                allowContentAccess = false
                javaScriptCanOpenWindowsAutomatically = false
                setSupportMultipleWindows(false)
                setSupportZoom(false)
                cacheMode = WebSettings.LOAD_DEFAULT
                useWideViewPort = true
                loadWithOverviewMode = true
            }
            addJavascriptInterface(Bridge(), "MasjidViewShell")
            webChromeClient = WebChromeClient()
            webViewClient = Client()
            requestFocus()
        }
    }

    /** Lock-down: only our own origin may be shown; nothing but https (or the page's own origin) loads. */
    private inner class Client : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
            originOf(request.url.toString()) != BuildConfig.ALLOWED_ORIGIN // true = blocked

        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
            val u = request.url
            val ok = u.scheme == "https" || u.scheme == "data" || u.scheme == "blob" || originOf(u.toString()) == BuildConfig.ALLOWED_ORIGIN
            return if (ok) null else WebResourceResponse("text/plain", "utf-8", 403, "Blocked", emptyMap(), ByteArrayInputStream(ByteArray(0)))
        }

        override fun onPageStarted(view: WebView, url: String?, favicon: android.graphics.Bitmap?) {
            pageAllowed = originOf(url) == BuildConfig.ALLOWED_ORIGIN
        }

        override fun onPageFinished(view: WebView, url: String?) {
            if (!mainFrameFailed) hideMessage()
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            if (!request.isForMainFrame) return
            mainFrameFailed = true
            showOffline()
        }

        // Renderer crashed or was killed for memory: start a fresh WebView instead of dying.
        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            recreateWebView()
            return true
        }
    }

    private fun recreateWebView() {
        web?.let {
            root.removeView(it)
            it.destroy()
        }
        web = null
        lastBeat = 0L
        start()
    }

    /** The only things the page can call: heartbeat() every 30 s, and info() (§8.2 lock-down). */
    private inner class Bridge {
        @JavascriptInterface
        fun heartbeat() {
            if (pageAllowed) lastBeat = SystemClock.elapsedRealtime()
        }

        @JavascriptInterface
        fun info(): String {
            if (!pageAllowed) return "{}"
            return JSONObject()
                .put("versionName", BuildConfig.VERSION_NAME)
                .put("versionCode", BuildConfig.VERSION_CODE)
                .put("flavour", BuildConfig.FLAVOR)
                .put("webView", WebViewSupport.version(this@MainActivity) ?: "")
                .toString()
        }
    }

    /** No heartbeat for 3 minutes (after the page has sent one) → the page is stuck: reload it. */
    private val watchdog = object : Runnable {
        override fun run() {
            val beat = lastBeat
            if (beat > 0 && SystemClock.elapsedRealtime() - beat > STALL_MS && !mainFrameFailed) {
                lastBeat = 0L
                load()
            }
            handler.postDelayed(this, WATCHDOG_MS)
        }
    }

    private val retry = Runnable { load() }

    // ------------------------------------------------------------------ native screens

    private fun showOffline() {
        showMessage(getString(R.string.offline_title), getString(R.string.offline_body), null)
        handler.removeCallbacks(retry)
        handler.postDelayed(retry, RETRY_MS)
    }

    private fun showOldWebView() {
        val v = WebViewSupport.version(this) ?: getString(R.string.webview_missing)
        showMessage(getString(R.string.webview_title), getString(R.string.webview_body, WebViewSupport.MIN_MAJOR, v), getString(R.string.webview_try) to { start() })
    }

    private fun showMessage(title: String, body: String, action: Pair<String, () -> Unit>?) {
        hideMessage()
        val col = Ui.column(this).apply {
            addView(Ui.title(context, title))
            addView(Ui.body(context, body))
            action?.let { (label, run) -> addView(Ui.button(context, label) { run() }, Ui.lp(context, 28)) }
        }
        root.addView(col, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        message = col
        col.getChildAt(col.childCount - 1)?.takeIf { action != null }?.requestFocus()
    }

    private fun hideMessage() {
        message?.let { root.removeView(it) }
        message = null
        web?.requestFocus()
    }

    // ------------------------------------------------------------------ remote control

    override fun dispatchKeyEvent(e: KeyEvent): Boolean {
        when (e.keyCode) {
            KeyEvent.KEYCODE_BACK -> {
                if (e.action == KeyEvent.ACTION_UP) onBackKey()
                return true
            }
            KeyEvent.KEYCODE_MENU, KeyEvent.KEYCODE_SETTINGS -> {
                if (e.action == KeyEvent.ACTION_UP) openSettings()
                return true
            }
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_NUMPAD_ENTER -> {
                if (e.action == KeyEvent.ACTION_DOWN && e.repeatCount == 0) okHeld = false
                if (e.action == KeyEvent.ACTION_DOWN && e.repeatCount > 0) {
                    // Holding OK 3 s opens Tetapan; key repeats never reach the page.
                    if (!okHeld && e.eventTime - e.downTime >= HOLD_MS) {
                        okHeld = true
                        openSettings()
                    }
                    return true
                }
                if (e.action == KeyEvent.ACTION_UP && okHeld) return true
            }
        }
        return super.dispatchKeyEvent(e)
    }

    /** Back twice within 2 s exits; the first press only shows the hint (the TV page has no "back"). */
    private fun onBackKey() {
        val now = SystemClock.elapsedRealtime()
        if (now - lastBack < EXIT_WINDOW_MS) {
            finish()
        } else {
            lastBack = now
            Toast.makeText(this, R.string.exit_hint, Toast.LENGTH_SHORT).show()
        }
    }

    private fun openSettings() {
        @Suppress("DEPRECATION")
        startActivityForResult(Intent(this, SettingsActivity::class.java), REQ_SETTINGS)
    }

    @Deprecated("Activity result API needs androidx.activity; this shell stays dependency-light.")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_SETTINGS && resultCode == SettingsActivity.RESULT_RELOAD) reload()
    }

    // ------------------------------------------------------------------ lifecycle

    override fun onResume() {
        super.onResume()
        immersive()
        web?.onResume()
    }

    override fun onPause() {
        web?.onPause() // pauses animations only; JavaScript (clock, sync) keeps running
        super.onPause()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) immersive()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        web?.destroy()
        web = null
        super.onDestroy()
    }

    /** Full screen with no system bars (they slide in only on a swipe, which a TV never does). */
    private fun immersive() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }

    companion object {
        private const val REQ_SETTINGS = 1
        private const val WATCHDOG_MS = 30_000L
        private const val STALL_MS = 3 * 60_000L
        private const val RETRY_MS = 30_000L
        private const val HOLD_MS = 3_000L
        private const val EXIT_WINDOW_MS = 2_000L
    }
}
