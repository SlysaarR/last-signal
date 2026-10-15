#!/usr/bin/env bash
set -euo pipefail
package=com.slysaarr.lastsignal.preview
runner="$package.test/androidx.test.runner.AndroidJUnitRunner"
mkdir -p android/app/build/outputs/upgrade-results
adb install -r "$LAST_SIGNAL_PREVIOUS_APK"
adb install -r android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
for phase in seed verify; do
  if [ "$phase" = verify ]; then
    adb install -r android/app/build/outputs/apk/debug/app-debug.apk
    method=verifyUpdatedVersion
  else
    method=seedPreviousVersion
  fi
  result="android/app/build/outputs/upgrade-results/$phase.txt"
  adb shell am instrument -w -r -e upgradePhase "$phase" -e class "com.slysaarr.lastsignal.UpgradeTest#$method" "$runner" | tee "$result"
  python3 -c 'import pathlib,re,sys; assert re.search(r"(?m)^OK \(1 test\)",pathlib.Path(sys.argv[1]).read_text()), "Instrumentation failed"' "$result"
done
# Fresh-install coverage is independent from the deliberately seeded upgrade case.
adb shell pm clear "$package"
gradle -p android --no-daemon :app:connectedDebugAndroidTest
