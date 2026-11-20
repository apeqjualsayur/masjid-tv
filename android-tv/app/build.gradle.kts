import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

/** Machine-specific, git-ignored: sdk.dir and (optional) masjidview.debugUrl for debug builds. */
val localProps = Properties().apply {
    rootProject.file("local.properties").takeIf { it.exists() }?.inputStream()?.use { load(it) }
}

/** Signing key: environment variables (GitHub Actions) or a git-ignored keystore.properties (this PC). */
val keyProps = Properties().apply {
    rootProject.file("keystore.properties").takeIf { it.exists() }?.inputStream()?.use { load(it) }
}
fun secret(env: String, key: String): String? =
    System.getenv(env)?.takeIf { it.isNotBlank() } ?: keyProps.getProperty(key)?.takeIf { it.isNotBlank() }

/** "http://192.168.1.10:3100/tv/" → "http://192.168.1.10:3100" */
fun originOf(url: String): String = Regex("^(https?://[^/]+)").find(url)?.value ?: url

android {
    namespace = "my.masjidview.tv"
    compileSdk = 36

    defaultConfig {
        applicationId = "my.masjidview.tv"
        minSdk = 24
        targetSdk = 36
        versionCode = (property("VERSION_CODE") as String).toInt()
        versionName = property("VERSION_NAME") as String
        buildConfigField("String", "START_URL", "\"https://masjidview.my/tv/\"")
        buildConfigField("String", "ALLOWED_ORIGIN", "\"https://masjidview.my\"")
    }

    buildFeatures {
        buildConfig = true
    }

    flavorDimensions += "channel"
    productFlavors {
        // Pilot: installed from masjidview.my/apk; updates itself and can start when the TV boots.
        create("sideload") { dimension = "channel" }
        // Google Play (later): no self-update, no boot start, no install permission.
        create("play") { dimension = "channel" }
    }

    val storePath = secret("ANDROID_KEYSTORE_FILE", "storeFile")
    signingConfigs {
        if (storePath != null) {
            create("release") {
                storeFile = file(storePath)
                storePassword = secret("ANDROID_KEYSTORE_PASSWORD", "storePassword")
                keyAlias = secret("ANDROID_KEY_ALIAS", "keyAlias")
                keyPassword = secret("ANDROID_KEY_PASSWORD", "keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Without a key (e.g. a test build on this PC) the release APK is built unsigned.
            signingConfig = signingConfigs.findByName("release")
        }
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            localProps.getProperty("masjidview.debugUrl")?.takeIf { it.isNotBlank() }?.let { url ->
                buildConfigField("String", "START_URL", "\"$url\"")
                buildConfigField("String", "ALLOWED_ORIGIN", "\"${originOf(url)}\"")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    packaging {
        jniLibs.useLegacyPackaging = false
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.webkit:webkit:1.12.1")
}

// The owner's artwork (designs/android/banner.png 320×180, icon.png) replaces the placeholders when
// present, so CI builds always use the real files.
val syncArt by tasks.registering(Copy::class) {
    val art = rootProject.file("../designs/android")
    onlyIf { art.exists() }
    from(art) {
        include("banner.png")
        into("drawable-xhdpi")
    }
    from(art) {
        include("icon.png")
        rename("icon.png", "ic_launcher.png")
        into("mipmap-xxxhdpi")
    }
    into(layout.projectDirectory.dir("src/main/res"))
}
tasks.named("preBuild") { dependsOn(syncArt) }
