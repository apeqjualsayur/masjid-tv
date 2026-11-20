# Masjid View TV — Android TV app

A small Android app for TVs and TV boxes. It shows **https://masjidview.my/tv/** full screen, keeps it
running, and (in the pilot version) updates itself. Everything you see on the TV is still the website;
this app is only the "frame" around it. Spec: `_specs/60-PRD-enhancements.md` §8.

This folder is **not** part of the website build. You never need Android Studio: GitHub Actions builds
and signs the app (step E7).

## What each file is

| File | What it does |
|---|---|
| `gradle.properties` | **The app version** (`VERSION_CODE`, `VERSION_NAME`) — the only file you change for a release |
| `app/src/main/java/.../MainActivity.kt` | The screen: shows the website full screen, keeps the TV awake, offline screen, restarts the page if it gets stuck, remote control keys |
| `app/src/main/java/.../SettingsActivity.kt` | The **Tetapan** screen (press **Menu** on the remote, or hold **OK** for 3 seconds) |
| `app/src/main/java/.../Shell.kt` | Small helpers: saved settings, the WebView version check, large on-screen text and buttons |
| `app/src/sideload/...` | Only in the **pilot** app (installed from `masjidview.my/apk`): self-update (`Updater.kt`) and start when the TV is switched on (`BootReceiver.kt`) |
| `app/src/play/...` | Only in the future **Google Play** app: no self-update, no start-on-boot |
| `app/src/main/res/values/strings.xml` | Every word the app shows (Bahasa Melayu) |
| `app/src/main/res/drawable-xhdpi/banner.png`, `mipmap-xxxhdpi/ic_launcher.png` | TV launcher banner (320×180) and icon. **Placeholders**: put your own `banner.png` and `icon.png` in `designs/android/` and every build uses them automatically |
| `app/build.gradle.kts` | Build settings: package `my.masjidview.tv`, Android versions, the two flavours, signing |
| `gradlew`, `gradlew.bat`, `gradle/wrapper/` | The Gradle wrapper (downloads the right build tool by itself) |

Never commit: `*.jks`, `*.keystore`, `keystore.properties`, `local.properties` (all in `.gitignore`).

## Versions

- `VERSION_NAME` is what people see, e.g. `1.0.0`, `1.0.1`, `1.1.0`. The admin shows it as "App TV 1.0.0".
- `VERSION_CODE` is a whole number that **goes up by 1 for every release** (1, 2, 3 …). Android
  installs an update only when this number is higher. Never reuse or lower it.
- Release: change both numbers in `gradle.properties`, commit, then create a tag `tv-v<VERSION_NAME>`
  (e.g. `tv-v1.0.1`). GitHub Actions builds, signs and publishes it to `masjidview.my/apk`; TVs with
  the pilot app offer the update within 24 hours (or at once via Tetapan → Semak kemas kini).

## The signing key (very important)

Every version must be signed with **the same key, forever**. If the key is lost, an update can't be
installed over the old app: every masjid would have to uninstall, reinstall and pair the TV again.
Keep two backups (e.g. a password manager and a USB drive at home) of:
1. the key file `masjidview-tv-upload.jks`,
2. its store password and key password,
3. the alias `masjidview-tv`.

GitHub Actions gets the key from 4 repository secrets (E7). On this PC, an optional git-ignored
`android-tv/keystore.properties` can point to it for a local signed build:

```
storeFile=C:/Users/<you>/keys/masjidview-tv-upload.jks
storePassword=…
keyAlias=masjidview-tv
keyPassword=…
```

## How the app behaves (for testing)

- Opens `https://masjidview.my/tv/?shell=apk&shellv=<version>`; only masjidview.my pages can be shown.
- No internet on the very first start: "Tiada sambungan internet", tries again every 30 seconds.
  After the first visit the website keeps working offline by itself.
- If the website stops answering for 3 minutes, or its renderer crashes, the app reloads it.
- **Back** twice within 2 seconds closes the app. **Menu** (or hold **OK** 3 s) opens Tetapan:
  Muat semula · Buka automatik semasa TV dihidupkan · Semak kemas kini · versions.
- Old TV boxes: needs Android System WebView 111 or newer; otherwise the app says
  "Sila kemas kini Android System WebView".

## Building on a PC (optional, for developers)

Needs JDK 17 and the Android SDK (platform 36). From this folder:
`gradlew assembleSideloadDebug` (test app, installs next to the real one as `my.masjidview.tv.debug`)
or `gradlew assembleSideloadRelease bundlePlayRelease`. A debug build can point at a dev server by adding
`masjidview.debugUrl=http://<pc-ip>:3100/tv/` to `local.properties`.
