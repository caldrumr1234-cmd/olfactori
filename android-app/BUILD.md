# Olfactori Android APK — Build Instructions

## Prerequisites
- Node.js 18+
- Android Studio (with Android SDK installed)
- Java 17 (bundled with Android Studio)

## 1. Install dependencies
```bash
cd android-app
npm install
```

## 2. Add the Android platform
```bash
npx cap add android
```
This generates the `android/` folder (Gradle project).

## 3. Add app icon and splash screen

Place icon and splash images BEFORE syncing.

**App icon** — replace these files in `android/app/src/main/res/`:
- `mipmap-mdpi/ic_launcher.png`      (48×48)
- `mipmap-hdpi/ic_launcher.png`      (72×72)
- `mipmap-xhdpi/ic_launcher.png`     (96×96)
- `mipmap-xxhdpi/ic_launcher.png`    (144×144)
- `mipmap-xxxhdpi/ic_launcher.png`   (192×192)
- Same sizes for `ic_launcher_round.png`

**Splash screen** — place in `android/app/src/main/res/drawable/`:
- `splash.png` — recommended 2732×2732 centered logo on #111118 background

Easiest option: use `@capacitor/assets` to auto-generate all sizes from one 1024×1024 source icon:
```bash
npm install -g @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#111118' --splashBackgroundColor '#111118'
```
(Place your source icon at `assets/icon.png` and `assets/splash.png` first.)

## 4. Sync
```bash
npx cap sync android
```

## 5. Build the APK

### Option A — command line (release APK, unsigned)
```bash
cd android
./gradlew assembleRelease
```
APK output: `android/app/build/outputs/apk/release/app-release-unsigned.apk`

To sign it (required for sideloading):
```bash
keytool -genkey -v -keystore olfactori.keystore -alias olfactori -keyalg RSA -keysize 2048 -validity 10000
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore olfactori.keystore app-release-unsigned.apk olfactori
zipalign -v 4 app-release-unsigned.apk olfactori.apk
```

### Option B — Android Studio (easier)
```bash
npx cap open android
```
Then in Android Studio: **Build → Generate Signed Bundle / APK → APK**

### Option C — debug APK (no signing needed, for testing)
```bash
cd android
./gradlew assembleDebug
```
APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

## Notes
- The app is a WebView that loads `https://www.olfactori.vip` directly
- PIN login and all features work identically to the website
- sessionStorage persists within the WebView session
- To enable hardware back button navigation, no extra config needed — Capacitor handles it
