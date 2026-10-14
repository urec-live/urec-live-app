# UREC Live — Apple Watch App

A companion watchOS app for UREC Live that lets users monitor active workouts, control rest timers, log sets, and end sessions directly from their wrist.

---

## Requirements

- **macOS** with Xcode 15+
- **iOS deployment target**: 17.0+ (for the companion iPhone app)
- **watchOS deployment target**: 10.0+
- An **Apple Watch** (physical device) or **Apple Watch Simulator** paired with an iPhone simulator
- Apple Developer account (free account works for simulator; paid account required for physical device)

---

## Project Structure

```
ios/watchapp Watch App/
├── watchappApp.swift       # App entry point — initializes PhoneConnector singleton
├── ContentView.swift       # Main watch UI: exercise timer, rest timer, controls
├── PhoneConnector.swift    # WCSession delegate — all iPhone ↔ Watch communication
├── LogSetView.swift        # Sheet modal for logging reps and weight
└── Assets.xcassets/        # Watch app icons and assets
```

Supporting files in `ios/`:
- `WatchApp-Watch-App-Info.plist` — Watch bundle config (companion app ID, WKApplication flag)
- `urecliveapp.xcodeproj/` — Xcode project containing both the iOS and Watch targets

---

## Building & Running

### 1. Install Node dependencies (if not already done)

```bash
cd urec-live-app   # repo root
npm install
```

### 2. Install CocoaPods

```bash
cd ios
pod install
cd ..
```

This installs the `WatchConnectivity` CocoaPod that bridges `react-native-watch-connectivity` to native iOS.

### 3. Open the workspace (not the `.xcodeproj`)

```bash
open ios/urecliveapp.xcworkspace
```

> **Important:** Always open the `.xcworkspace`, not the `.xcodeproj`. The workspace includes CocoaPods dependencies.

### 4. Select the Watch target and a simulator

In Xcode's toolbar:

1. Click the scheme selector (next to the Run/Stop buttons).
2. Select **`watchapp Watch App`** as the scheme.
3. Select a paired Watch simulator, e.g., `Apple Watch Series 10 (46mm) — Paired with iPhone 16`.

### 5. Run

Press **Cmd+R** or click the **Run** button.

The Watch app will launch in the Watch simulator. The paired iPhone simulator will also launch automatically — this is required for Watch Connectivity to work.

---

## Running on a Physical Apple Watch

1. Connect your iPhone to your Mac via USB.
2. Make sure your Apple Watch is paired to the iPhone and both are on.
3. In Xcode, select **`watchapp Watch App`** scheme and your physical Watch as the destination.
4. You need a valid signing team. Go to each target's **Signing & Capabilities** tab and select your Apple Developer team.
5. Press **Cmd+R** to build and install.

---

## How It Works

### Communication Architecture

All data flows through Apple's `WCSession` (Watch Connectivity framework):

```
iPhone (React Native)               Apple Watch (SwiftUI)
──────────────────────              ──────────────────────
WatchService.syncWorkout()   →→→    PhoneConnector.processIncoming()
  sendMessage()                       updates @Published state
  updateApplicationContext()          ContentView re-renders

ContentView button tap       ←←←    PhoneConnector.toggleRest()
  WatchService.subscribeToWatch()     sendMessage() back to iPhone
```

### Message Format

Messages are plain dictionaries exchanged via `WCSession.sendMessage()`:

| Key                 | Type     | Description                              |
|---------------------|----------|------------------------------------------|
| `type`              | String   | `"WORKOUT_STATUS"` or `"LOG_SET"`        |
| `status`            | String   | `"START"`, `"PAUSE"`, or `"END"`         |
| `exercise`          | String   | Exercise name (e.g. `"Bench Press"`)     |
| `exerciseStartTime` | Int64    | Unix timestamp (ms) when exercise began  |
| `restStartTime`     | Int64    | Unix timestamp (ms) when rest began (`0` if not resting) |
| `reps`              | Int      | (LOG_SET only) Number of reps logged     |
| `weight`            | Double   | (LOG_SET only) Weight in lbs             |

### iPhone → Watch (triggered by `WatchService.syncWorkout()`)

Called when the user starts, pauses, or ends a workout in the iPhone app. The watch UI updates in real time.

### Watch → iPhone (triggered by watch button taps)

- **Rest/Resume button** → sends `PAUSE` or `START` status back to the iPhone
- **Log Set** → sends a `LOG_SET` message with `reps` and `weight`; the iPhone app persists this to the backend
- **End button** → sends `END` status; the iPhone app ends the session

---

## Watch App Screens

### Idle state
Shown when no workout is active on the iPhone. Displays a strength training icon and "Waiting for iPhone..." text.

### Active workout state
Shown when the iPhone sends a `START` status:
- **Exercise name** (green header)
- **Exercise timer** — counts up from when the exercise started (MM:SS, updates every 0.5s)
- **Rest timer** — appears in yellow when in rest mode
- **Rest / Resume button** — toggles rest mode, syncs back to iPhone
- **Log Set button** — opens `LogSetView` sheet
- **End button** — ends the workout remotely

### Log Set sheet (`LogSetView`)
A compact modal with:
- Reps stepper (1–100)
- Weight stepper (0–1000 lbs, in 5 lb increments)
- Confirm button — sends the set to the iPhone and closes the sheet

---

## Troubleshooting

**Watch app shows "Waiting for iPhone..." even when a workout is active**
- Make sure both the iPhone simulator and Watch simulator are running.
- Verify the iPhone app's `WatchService.syncWorkout()` is being called (add a `console.log`).
- Check that both simulators show the same paired device in the Xcode toolbar.

**`pod install` fails with WatchConnectivity errors**
- Run `pod repo update` then retry `pod install`.
- Make sure your CocoaPods version is 1.13+: `pod --version`.

**Build error: "No such module 'WatchConnectivity'"**
- You opened the `.xcodeproj` instead of the `.xcworkspace`. Close it and `open ios/urecliveapp.xcworkspace`.

**Signing error on physical device**
- Go to **Xcode → Target → Signing & Capabilities** for both the `urecliveapp` target and the `watchapp Watch App` target.
- Select your Apple Developer team for both.
- Bundle IDs must match the pattern: `com.tanboyy.urecliveapp` (iPhone) and `com.tanboyy.urecliveapp.watchkitapp` (Watch).

**Messages not reaching the watch on simulator**
- Watch Connectivity on simulators can be unreliable. Try stopping both simulators, resetting the Watch simulator (**Device → Erase All Content and Settings**), and re-running.
- Physical devices are significantly more reliable for testing Watch Connectivity.
