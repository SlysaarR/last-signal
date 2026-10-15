# Android preview 0.55.5-test.2

Built and verified 2026-10-15.

- Source commit: `f80ad3940a10fbe599f96f25d5041aaeb7a76030`.
- Application ID: `com.slysaarr.lastsignal.preview`; version code `550502`.
- Signed APK: `Last_Signal_0.55.5-test.2.apk`, 4,171,650 bytes.
- APK SHA-256: `9c4b3892871a3dced6ff7d4817d1f324a3212b781bdac2617b8979f03067365d`.
- Signing certificate SHA-256: `939eb116d56bd19d2da7f3792258612df9d865bb8b4944c1c158e4812ea95114`.
- The signing certificate matches 0.55.4-test.1; V2 and V3 signatures verified.
- Game bundle: `0.55.5`, ID `c1dc74684ce2b89a`, 140 resources.
  Every packaged resource matched its SHA-256 and size after signing.
- Minimum API 26, target API 36; no requested permissions, debug flag or packaged service worker.

## Changes

A validated local automatic backup is captured after successful primary saves, at most
once per minute for ordinary saves and on menu/background saves. Unchanged duplicate
lifecycle events do not rewrite it. Settings → Backups offers preview, cancellation
and explicit restoration through the existing validated backup flow.

A damaged primary save cannot overwrite the previous valid automatic copy. If storage
fills up, the primary save has priority over the optional automatic-copy slot; failed
retries preserve previous records as far as storage remains available. Copy-write
failure is visible in Settings and does not turn a successful primary save into failure.

## Completed checks

CI: https://github.com/SlysaarR/last-signal/actions/runs/38757656176 (successful).
Game quality: https://github.com/SlysaarR/last-signal/actions/runs/38757656742 (successful).

- Game regression suite: automatic-copy throttling and forced refresh; malformed
  primary-save protection; explicit preview/cancel/restore; failed secondary writes;
  quota recovery; UK/EN; exact partial-cleaning marks and energy.
- Android build, backup payload unit tests and release lint passed.
- Android 15/API 35 emulator: installed baseline 0.55.4-test.1, seeded album, bag, order,
  guide, site and a partially cleaned find with energy 41.5. `adb install -r` of
  0.55.5-test.2 retained the exact JSON save, English preference and the supported
  `largest` text setting, including its applied UI state.
- Automatic-copy preview and cancellation left the save unchanged. The real Android
  Back key returned Settings to Menu and respected the unfinished-find dialog guard.
- Twenty Activity background/resume cycles left the full save byte-identical.
- A separate inert test document seeded and explicitly verified a malformed primary
  save after game lifecycle handlers had finished. The production asset/navigation
  client was restored before loading the game. Startup preserved the damaged primary,
  preview made no changes, and explicit confirmation recovered the exact prior state.
  Continuing reopened the unfinished excavation.
- Fresh-install GameSmokeTest passed after clearing only the emulator's app data:
  startup, navigation, departure, exact save after Activity recreation, native-export
  rejection and zero registered service workers. The two phase-specific upgrade tests
  are intentionally skipped in this separate fresh-install invocation.

## Scope and phone check

Instrumentation uses debug-signed baseline/current builds with the same CI debug key.
The delivered release APK was separately signed and verified against the previous
release certificate and every game asset. The upgrade fixture uses the procedural button.
Earlier coin-photo fixtures exposed
slow software-GPU startup and an intermittent teardown ANR; this is recorded for
separate performance work, not counted as a passing graphics benchmark. These tests
do not establish physical-phone FPS, audio behavior, gesture ergonomics,
Android file-picker behavior or long-session memory stability.

Vlad reported that the first APK worked. For this update, keep the existing app installed,
export a JSON backup, install this APK over it, then check the album, currency and an
unfinished find. An automatic local copy is removed with app data; use exported JSON
for uninstall/device migration. This remains a preview, not a store-ready 1.0 release.
