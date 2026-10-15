# Android preview 0.55.4-test.1

Built and verified 2026-10-15.

- Source commit: `3af160ad1c3286491612656adc78211e84a57c58`.
- CI: https://github.com/SlysaarR/last-signal/actions/runs/38748425494 (successful).
- Application ID: `com.slysaarr.lastsignal.preview`; version code `550401`.
- Signed APK: `Last_Signal_0.55.4-test.1.apk`, 4,150,897 bytes.
- APK SHA-256: `a33f3f6d113350962f2010ed5e2244344ba3726de26642210a3d93671bf4059c`.
- Signing certificate SHA-256: `939eb116d56bd19d2da7f3792258612df9d865bb8b4944c1c158e4812ea95114`.
- V2 and V3 signatures verified with Android build-tools 35.0.0 apksigner.
- Game bundle: `0.55.4`, ID `2226b2a0402578f1`, 139 resources. Every packaged resource
  was compared with its runtime manifest SHA-256 both before and after signing.
- Release manifest: minimum Android 8/API 26, target API 36, no requested permissions,
  no debug flag and no packaged service worker.

## Completed checks

- Full JavaScript game regression suite, including native-mode origin gating,
  dialog cancellation guards, lifecycle saves, native-export completion/cancellation,
  and blocking navigation when saving fails.
- Two native backup validation unit tests: exact UTF-8 and malformed/oversized rejection.
- Android lint: zero errors. The legacy `onBackPressed` fallback is documented;
  API 33+ uses the framework `OnBackInvokedDispatcher` registered in `onCreate`.
- Android 15/API 35 emulator instrumentation: packaged WebView startup without
  INTERNET permission; menu/camp navigation through the JS back hook; a real departure;
  byte-identical save after Activity recreation; resuming the active field; invalid
  native-export rejection; zero registered service workers.

The instrumentation build uses the same packaged resources and Java sources as the
release, with debug signing. The delivered release was separately signed and verified.

## Phone validation still needed

This is the first native preview, not a claim of physical-device testing. Check the
Android document picker's import/export, system Back gesture, sound, background/resume,
and large-text layout on the user's phone. Transfer the browser save through a JSON
backup; browser and native origins have separate storage. Future APKs must keep this
application ID and private signing key, with an increasing version code. Install updates
over the app; uninstalling first removes its local progress.

The private signing backup is stored outside the repository. It contains the preview
keystore, its password and verification metadata; never publish or commit it.
