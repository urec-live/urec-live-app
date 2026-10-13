# CLAUDE.md — UREC Live Mobile App

## Project Overview

UREC Live is a cross-platform gym management and fitness tracking app for university recreation centers. This repo is the **React Native (Expo) mobile app** — the primary interface for gym members.

**What the app does:** Users check real-time equipment availability, scan QR codes on machines to check in/out, track workouts, and view their session history. The killer feature is live equipment status — no other gym app does this.

**Current stage:** MVP feature-complete. Authentication, equipment tracking, QR scanning, workout tracking, and session persistence to the backend are all implemented.

---

## Architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | React Native 0.81.5, Expo 54 | Managed workflow. Do NOT eject. |
| Language | TypeScript | Strict mode. All new code must be TypeScript. |
| Routing | expo-router (file-based) | Pages in `app/` directory |
| State | React Context | AuthContext, WorkoutContext |
| HTTP | Axios | JWT interceptors for auto-auth + 401 refresh |
| Real-time | STOMP over SockJS | Singleton WebSocket client with auto-reconnect (5 retries) |
| QR Scanning | expo-camera | Scans QR codes on gym equipment |

---

## Project Structure

```
app/
├── (auth)/
│   └── login.tsx             # Login screen (unauthenticated)
├── (tabs)/
│   ├── index.tsx             # Home tab
│   ├── equipment.tsx         # Equipment availability tab (real-time)
│   ├── history.tsx           # Workout history grouped by date
│   ├── profile.tsx           # User profile + logout
│   └── workout/
│       ├── index.tsx         # Workout type selection (Strength/Cardio/Pilates)
│       ├── strength.tsx      # Strength exercises
│       ├── cardio.tsx        # Cardio exercises
│       ├── pilates.tsx       # Pilates exercises
│       ├── exercises/
│       │   └── [muscle].tsx  # Exercises filtered by muscle group
│       └── equipment/
│           └── [exercise].tsx # Equipment for specific exercise
├── machine/
│   └── [id].tsx              # Machine detail screen (+ Call staff card)
├── help-request.tsx          # The member's help request: status stepper, demo links, Received help / Cancel
├── demo-player.tsx           # Plays an exercise's demo video/GIF (/demo-player?title=…&video=…&gif=…&show=…)
├── scan.tsx                  # QR code scanner → check in/out
├── summary.tsx               # Workout summary screen
└── modal.tsx                 # Modal screen

components/                   # Reusable UI components
├── ActiveExerciseTracker.tsx  # (+ Call staff pill; hidden on /help-request and /demo-player)
├── DailyWorkoutSummary.tsx
├── CallStaffCard.tsx          # Machine page "Call staff" card
├── HelpRequestBanner.tsx      # Help request status bar above every screen
├── DemoGif.tsx                # Inline GIF player (expo-image; Pause/Play on native)
├── DemoVideo.tsx              # Native: hands the clip to the in-app browser's video player
├── DemoVideo.web.tsx          # Web: inline <video> element
└── (themed primitives, icons)

contexts/
├── AuthContext.tsx            # User, JWT tokens, login/signup/logout
├── WorkoutContext.tsx         # Active session, today's workouts, history, offline queue
└── HelpRequestContext.tsx     # The open help request: loads on sign-in, polls every 5 s while open

services/
├── authAPI.ts                 # Axios client + JWT auto-refresh interceptor
├── machineAPI.ts              # 18 functions for equipment/exercise API calls
├── sessionAPI.ts              # postSession(), getMyHistory(), getMyStats()
├── helpRequestAPI.ts          # /api/help-requests calls and types
└── websocketService.ts        # Singleton STOMP client, auto-reconnect

utils/
├── confirm.ts                 # confirmAsync(): Alert on native, window.confirm on web
├── demoPlayer.ts              # demo player route params (build + validate)
└── helpRequestErrors.ts       # user-facing messages for help request API errors

hooks/
├── use-color-scheme.ts
└── use-theme-color.ts

constants/
└── theme.ts                   # Colors, spacing
```

---

## What's Complete

### Authentication
- Login screen (`app/(auth)/login.tsx`)
- JWT token management (access + refresh)
- AuthContext manages user state globally
- Auto-refresh on 401 via Axios interceptor
- Session persistence via AsyncStorage (survives app restart)

### Equipment Availability
- Real-time equipment status (Available / In Use / Reserved)
- WebSocket subscription to `/topic/machines` — instant updates
- QR code scanning via device camera
- Scan → identify machine → show status → check in/out

### Workout Tracking
- Browse exercises by type: Strength, Cardio, Pilates
- Browse by muscle group
- Each exercise shows which machines support it + live availability
- Check in/out starts/ends a session
- Session data tracked: machine, exercise, muscle group, duration

### Session Persistence
- Completed sessions POST to `/api/sessions` via `sessionAPI.ts`
- History tab fetches from backend (`GET /api/sessions/me`)
- WorkoutContext queues failed POSTs locally and retries on app restart (offline support)
- `getMyStats()` available for aggregated stats display

### Workout History
- History tab shows past sessions grouped by date
- Fetched from backend; context serves as in-memory cache

### Profile
- User info display, logout functionality

### Call Staff (help requests)
- **Call staff** on the machine page and in the workout tracker (by QR code) → `POST /api/help-requests`; one open request per member
- `app/help-request.tsx`: Request received → On the way / Too busy → Helped; **I received help** behind an "Are you sure?" confirm; **Cancel request**
- `HelpRequestContext` polls the open request every 5 s while the app is in the foreground (no WebSocket) and vibrates on a status change; the banner shows the status on every screen
- Demo media are placeholders for now (`videoPlaceholder` / `gifPlaceholder` flags from the backend). `app/demo-player.tsx` plays the GIF inline with expo-image. There's no native video module (adding `expo-video` needs a dev-build rebuild), so on native the video opens in the in-app browser's player (`DemoVideo.tsx`); the web build plays it inline (`DemoVideo.web.tsx`)

---

## API & Network

- Backend base URL: `http://172.20.1.229:8080/api` (device IP — update when network changes)
  - Android/iOS use the device IP; web uses `http://localhost:8080/api`
- WebSocket: `http://172.20.1.229:8080/ws` (SockJS with STOMP)
- JWT: 24h access tokens, 7d refresh tokens
- Public endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/test`, `/ws`

**To change network:** Update base URL in `services/authAPI.ts` and `services/machineAPI.ts`.

---

## Coding Conventions

- **TypeScript:** All new files must be `.tsx` / `.ts`. No `any` types.
- **Components:** Functional components with hooks only. No class components.
- **Naming:** PascalCase for components, camelCase for functions/variables, UPPER_SNAKE for constants.
- **Styling:** `StyleSheet.create()` preferred. Consistent with existing patterns.
- **State:** Use existing Context pattern. Don't add Redux/Zustand/MobX.
- **API calls:** All HTTP calls go through the `services/` layer. Never call Axios directly from components.
- **Navigation:** Use expo-router file-based routing. New screens = new files in `app/`.

---

## What Still Needs Work

### Priority 1: Error Handling & Loading States
- Add error boundary component
- Network error screens with retry buttons
- Skeleton loaders for equipment list, workout screens, history
- Toast notifications for check-in/out success/failure
- Handle WebSocket disconnection gracefully with a user-visible indicator

### Priority 2: App Onboarding Flow
- First-launch tutorial screens (3–4 slides): equipment status, QR scanning, workout logging
- Show once; persist `has_onboarded` flag in AsyncStorage
- Use `react-native-reanimated` for polished animations

### Priority 3: Environment Configuration
- Move hardcoded IPs to `.env.development` / `.env.production`
- Use `expo-constants` or `react-native-dotenv` for access

### Priority 4: Pre-Launch Polish
- Custom app icon and splash screen (replace Expo defaults)
- Pull-to-refresh on equipment list
- Haptic feedback on QR scan success
- Empty states for history (first-time user sees helpful message, not blank screen)

---

## What NOT to Build (Phase 2+)

- Smartwatch / HealthKit / Google Fit sync
- Diet / nutrition screens
- AI chatbot interface
- Social features (leaderboards, workout buddies)
- Push notifications
- Equipment reservation system
- Interactive gym floor map

Focus only on polish and the remaining items listed above.

---

## Development Setup

```bash
# Prerequisites: Node.js 18+, Expo CLI
npm install
npx expo start

# Scan QR with Expo Go app on phone
# Or press 'i' for iOS simulator, 'a' for Android emulator
```

## Testing

- `npm test` runs Jest (`jest-expo` preset + React Native Testing Library). Tests live in `__tests__/`, outside `app/`, so Expo Router doesn't treat them as screens. Mock the backend, `expo-router` and native modules per test file.
- Jest resolves the native files, so test a `.web.tsx` component by importing it directly (see `__tests__/DemoVideo.web.test.tsx`)
- `npx tsc --noEmit` (one existing error in `app/settings/plan.tsx`) and `npx expo lint`
- After adding a screen, regenerate typed routes so `router.push` type-checks: run `CI=1 npx expo start --offline --port 8099` until `.expo/types/router.d.ts` mentions the route, then stop it
- Help request testing guide: `HELP_REQUESTS_TESTING.md`

## Jira Project
- Project key: UREC
- Cloud: ureclivessdi.atlassian.net
- Relevant epics: UREC-9 (Auth), UREC-10 (Workout), UREC-11 (QR/Equipment)
