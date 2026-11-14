# Google Maps indoor demo

Branch: `feat/google-maps-indoor`, based on the current map-first equipment work.
Only the native Equipment tab opts into Google Maps. Other floor-map callers
continue using the existing renderer. No backend API or database changes.

## Provider setup

### Xcode 27 Device Hub compatibility

On Xcode 27, Apple supplies `DeviceHub.app` (`com.apple.dt.Devices`) instead of
the legacy `Simulator.app`. The pinned Expo CLI 54.0.20 still assumes the old
name. `scripts/patch-expo-xcode27.cjs` backports discovery, process detection,
opening, and optional window-focus support. `postinstall` and `preios` apply it
automatically on macOS; other operating systems skip it. It validates every
replacement before writing and refuses an unexpected CLI version. Review/remove
the patch when upgrading Expo; do not suppress a version mismatch.

To open the simulator UI and run the app:

```sh
open -a DeviceHub
npm run ios
```

When Metro is already running on port 8082, build with
`npm run ios -- --no-bundler`, then connect the installed development client to
`http://localhost:8082`. Expo does not allow `--port` with `--no-bundler`.
`xcode-select -p` is already `/Applications/Xcode.app/Contents/Developer` on the
current host; changing that path does not fix the renamed application.

Patch checks: apply twice with `node scripts/patch-expo-xcode27.cjs` (both should
succeed), then `npm run ios`. Keep build/install/launch evidence separate from
Google provider checks. No Maps key is needed to launch the custom-map fallback.

Xcode 27 also rejects dependency deployment targets below iOS 15. The tracked
Podfile and `plugins/with-pod-deployment-target.js` raise only lower Pod targets
to `ios.deploymentTarget` (default 15.1), preserving higher settings. After
changing this hook, run `pod install --project-directory=ios --no-repo-update`.
The plugin preserves it across prebuild without regenerating wearable targets
just to repair the current local Pods project.

Prefer the default booted simulator (`npm run ios` without `--device`). This
pinned CLI routed an explicitly supplied simulator UDID through its physical
device installer on the current Xcode 27 host; that install was stopped. The
default simulator path installed and opened the successfully built binary.

### Google credentials and native setup

Install dependencies with `npm ci`. The SDK 54 dependency is
`react-native-maps` **1.20.1**; do not substitute the newest Maps config plugin.
SDK 54's built-in prebuild integration reads `ios.config.googleMapsApiKey` and
`android.config.googleMaps.apiKey`, provided by `app.config.js`.

In your Google Cloud project, configure billing and enable **Maps SDK for iOS**
and **Maps SDK for Android**. Create separate, API-restricted keys:

- iOS application restriction: bundle ID `com.tanboyy.urecliveapp`.
- Android application restriction: package `com.tanboyy.urecliveapp` plus the
  SHA-1 of the certificate signing the actual binary. Debug, EAS, and Play App
  Signing certificates can differ; register the appropriate ones.

Set `GOOGLE_MAPS_IOS_API_KEY` and/or `GOOGLE_MAPS_ANDROID_API_KEY` in your local
environment or ignored `.env.local`. Do not commit keys. These are native SDK
keys embedded in the binary, so application/API restrictions are necessary.
JS extra contains only availability flags. No location tracking is implemented.

Read `TEAM_WORKFLOW.md` before native regeneration. This checkout currently
**tracks native projects**, including custom wearable configuration. Review and
back up custom native files before prebuild; never use `--clean` here. From the
app repository, after loading the applicable key:

```sh
npx expo prebuild --platform ios --no-install
npm run ios
```

On the Android host:

```sh
npx expo prebuild --platform android --no-install
npm run android
```

Review the native diff after prebuild. Generated AppDelegate/Info.plist/manifest
files can contain the key: **do not commit key-containing generated changes**.
Keep configuration reproducible through `app.config.js`. When native folders are
included in an EAS build, EAS does not automatically rerun prebuild; generate the
appropriate native configuration locally before submitting that build. Never
publish an OTA-only update as a substitute for installing the Maps native module
or changing its key. Restart Metro after changing the environment and install
the rebuilt development client.

References: [versioned native setup](https://github.com/react-native-maps/react-native-maps/blob/v1.20.1/docs/installation.md),
[ground overlays](https://github.com/react-native-maps/react-native-maps/blob/v1.20.1/docs/overlay.md).

## Placement and fallback

`constants/googleFloorMaps.ts` contains the mapped UREC building footprint at
8827 Craver Road and its bounding rectangle for floor numbers 0–3. Only floors marked `illustrative` with
valid dimensions are eligible; this is not real building calibration. The map
retains the fictional-location notice and adds **Demo floor placement ·
approximate**. Pixel Y increases southward. Images, areas, and equipment share
one Web Mercator conversion. The indoor rooms and equipment are still fictional;
placing their rectangle over the real building envelope does not calibrate them.

Building envelope:

- Southwest: `35.3081058, -80.7358842`.
- Northeast: `35.3084858, -80.7349778`.
- The supplied Google Maps URL has viewing center `35.3083028, -80.7355263`;
  that point is not a building-corner measurement.

Outline source: [OpenStreetMap way 1051865705](https://www.openstreetmap.org/way/1051865705),
version 3, retrieved 2026-11-13; © OpenStreetMap contributors, licensed under
[ODbL](https://www.openstreetmap.org/copyright). Attribution appears on the map.
[UNC Charlotte](https://urec.charlotte.edu/home/facilities-hours) confirms the
address. The footprint is mapped data and is not a surveyed property boundary.

The green outline marks the roof footprint. The camera has a 12% margin on each
side of its envelope; the shorter dimension expands to match the native map
viewport so Fit can show the whole building on a tall screen. Native Google
camera-target bounds and zoom limits restrict gestures, and a completed-camera
check constrains pan, zoom, Fit, and result-focus commands to this local viewport.
Zoom-in is capped at 16x the fitted extent and Google level 22. The boundary is
non-interactive so area/marker taps continue to work. Map restriction is the
rectangular local viewing area, not polygon clipping or location tracking.

Missing platform key configuration, missing native provider, or unconfigured
floor geography uses the existing floor renderer. A provider that never signals
readiness falls back after 15 seconds. **Use floor map** offers manual fallback
for offline tiles or invalid provider credentials (Google may report map-ready
even when tile authentication fails). Manual fallback persists until the
Equipment screen remounts. Equipment search/results do not depend on Google.

## Native acceptance

Prerequisites: development backend running, a local member account connected to
the demo gym, Maps keys configured, and a rebuilt client. iOS Simulator connects
to `http://localhost:8080`; Android Emulator uses `http://10.0.2.2:8080` unless
`EXPO_PUBLIC_BACKEND_ORIGIN` overrides it. Keep app/backend revisions recorded.

1. Sign in and open Equipment. Confirm Google tiles and attribution are visible,
   with the demo floor overlay and both approximation/fictional notices.
2. Switch all floors. Only the selected floor's areas and equipment appear.
   Pan and pinch: polygons, image overlays (if supplied), and pins remain aligned.
   Confirm the green UREC outline persists. Attempt to drag across campus and
   zoom out repeatedly: the camera stays within the local building viewing area.
   Fit returns to the whole building; selecting edge equipment stays in bounds.
3. Tap an area label/polygon and an equipment pin. Verify matching results and
   detail navigation. Select a result on another floor: floor and camera follow.
4. Search and filter by muscle, status, and area. Matching markers remain clear;
   excluded markers dim. Clear the filters and verify all results return.
5. Exercise Fit, +, and −; drag the results sheet; verify map controls and Google
   attribution remain accessible. Scan a local equipment QR and verify selection.
6. Change a machine's status through the existing local flow. Verify the marker
   color, accessible status, and results update without resetting the camera.
7. Disable network after loading. Saved equipment results remain usable. If
   tiles are unavailable, tap **Use floor map** and continue using indoor results.
8. Rebuild/restart without Maps keys: Equipment uses the custom floor renderer.
   A client without the Maps native module must also load that fallback safely.

Google Maps does not supply these floor plans or equipment coordinates. Surveyed
building bounds, indoor calibration tooling, real positioning, navigation, and provider
rollout are outside this demo.

## Automated checks

```sh
npm run lint
npx tsc --noEmit
npx jest --runInBand __tests__/map-camera-bounds.test.ts __tests__/floor-geography.test.ts __tests__/google-maps-available.test.ts __tests__/google-floor-map.test.tsx __tests__/floor-map-provider.test.tsx __tests__/google-maps-config.test.ts __tests__/equipment-map.test.ts __tests__/equipment-tab.test.tsx __tests__/scan.test.tsx
```

Automated coverage includes coordinate bounds/corners, configuration retention,
native-module availability, overlay/marker geometry, floor and result selection,
status/filter changes, camera controls, and provider fallback. Mocked maps do not
establish Google tile availability or native gesture behavior.

## Validation record

- Automated: 9 suites / 47 tests passed. TypeScript passes; lint exits zero with
  seven existing warnings in unrelated workout/progress/tracker files.
- Local handoff after Device Hub recovery: Metro restarted on `http://localhost:8081`; `/status` reports
  `packager-status:running`. Backend `http://localhost:8080/api/auth/test` returns
  HTTP 200. The backend was already running and was not changed or restarted.
- Device Hub patch: applied twice successfully; `preios` invokes it correctly.
  Podfile Ruby syntax, TypeScript, focused app-config test, and lint for the
  compatibility files pass. All 248 Pod deployment settings are >= iOS 15.1.
- iOS rebuild: Build Succeeded, zero errors / 14 warnings (including Swift
  incremental-build cache and existing build-phase notices). Maps 1.20.1 is
  linked; no Google provider key is configured.
- iOS installation: `npm run ios -- --no-bundler --binary <built .app path>`
  installed/opened on the default booted iPhone 17 Pro / iOS 26.1. Reconnected
  with `simctl launch --initialUrl http://localhost:8081`; Device Hub native
  accessibility verified the login screen. Equipment interaction and Google
  tile checks remain pending login/provider setup.
- iOS Google provider: pending (no local Maps keys configured).
- Android: pending; validate on Abel's emulator/device against the same revision.
