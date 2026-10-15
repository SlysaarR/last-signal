# Android preview

Version: 0.55.5-test.2 (550502). Application ID: `com.slysaarr.lastsignal.preview`.
Requires Android 8+ and an up-to-date Android System WebView (Chromium 108+).

## Install and transfer progress

1. In the browser game, open Menu → Settings → Backups and export the JSON backup.
2. Install the signed APK, open the game, then Settings → Backups → choose the JSON file.
3. Review the displayed progress and confirm restoration. The browser copy remains separate.
4. Test a trip in airplane mode, return to the menu, close and reopen the app.

Install future APKs over the existing app. Do not uninstall first: uninstalling removes
the local save. Export a backup before uninstalling or moving to another device.
This preview uses its own application ID; a future production ID would require a backup transfer.

## Automatic recovery

A validated automatic backup is refreshed at most once a minute during ordinary saves,
and after changed progress when returning to the menu or leaving the app. No polling
timer is added. Settings → Backups → Restore automatic backup opens a preview and
requires confirmation. A malformed primary save cannot overwrite the automatic copy.
It is stored locally: export a JSON file before uninstalling or clearing app data.

## Build

Use Java 17, Gradle 8.13, Android platform 36 and build tools 35.0.0.

```sh
npm run check
npm run build:android-assets
gradle -p android :app:assembleRelease :app:testDebugUnitTest :app:lintRelease
```

The Android workflow builds an unsigned release APK and runs instrumentation tests on
an Android 15 emulator, including an in-place update from 0.55.4-test.1,
a partially cleaned find, preferences, 20 background/resume cycles and automatic recovery. It packages only resources verified against `sw.js` hashes.
Release signing happens outside GitHub with the private preview key. The same key and
application ID, and an increasing version code, are required for in-place updates.
Never commit the signing key or passwords. CI artifacts intentionally contain no secrets.

## Runtime

The game uses AndroidX WebViewAssetLoader at a fixed HTTPS origin. All resources are
packaged, there is no INTERNET permission, and service workers are disabled for this
runtime. Saves use the game's existing localStorage schema at the fixed app origin.
Backup export/import uses Android's document picker; no broad storage permission is needed.
Exports report success only after writing the selected document. Import uses the existing
validation, preview, confirmation and previous-save recovery flow.

Native Back respects modal cancellation guards, saves before returning to the menu, and
backgrounds the app from the menu. System insets protect content from bars and the keyboard.
