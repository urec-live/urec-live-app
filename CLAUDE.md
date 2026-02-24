# CLAUDE.md — UREC Live Mobile App

## Project Overview

UREC Live is a cross-platform gym management and fitness tracking app for university recreation centers. This repo is the **React Native (Expo) mobile app** — the primary interface for gym members.

**What the app does:** Users check real-time equipment availability, scan QR codes on machines to check in/out, track workouts, and view their session history. The killer feature is live equipment status — no other gym app does this.

**Current stage:** The mobile app is feature-complete for MVP. Remaining work is mostly polish, bug fixes, and connecting workout sessions to the backend for persistence.

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
urec-live-app/
├── app/                  # Expo Router pages (file-based routing)
│   ├── (tabs)/           # Tab navigator screens
│   │   ├── equipment/    # Equipment availability tab
│   │   ├── workout/      # Workout browsing tab
│   │   ├── history/      # Workout history tab
│   │   └── profile/      # User profile tab
│   ├── login.tsx         # Login screen
│   └── register.tsx      # Registration screen
├── components/           # Reusable UI components
├── contexts/             # React Context providers (Auth, Workout)
├── hooks/                # Custom hooks
├── services/             # API service layer (Axios calls)
├── qr-codes/             # QR scanning related code
├── utils/                # Helper functions
├── constants/            # App constants (colors, config)
└── scripts/              # Build/dev scripts
```

---

## What's Complete

### Authentication (UREC-9 — DONE)
- Login and registration screens
- JWT token management (access + refresh)
- AuthContext manages user state globally
- Auto-refresh on 401 responses via Axios interceptor
- Session persistence via AsyncStorage (survives app restart)

### Equipment Availability (UREC-11 — DONE)
- Real-time equipment status view (Available / In Use / Reserved)
- WebSocket subscription to `/topic/machines` — updates are instant
- QR code scanning via device camera
- Scan → identify machine → show status → check in / check out
- Singleton WebSocket service with auto-reconnect logic

### Workout Tracking (UREC-10 — DONE)
- Browse exercises by type: Strength, Cardio, Pilates
- Browse by muscle group
- Each exercise shows which machines support it + live availability
- Check in to a machine starts a session
- Session data tracked: machine, exercise, muscle group, duration

### Workout History (UREC-10 — DONE)
- History tab shows past sessions grouped by date
- Each entry: exercises performed, muscle groups, duration
- Data persists in WorkoutContext state

### Profile (UREC-9 — DONE)
- Profile tab with user info
- Logout functionality

---

## What Needs to Be Built (MVP Priority Order)

### Priority 1: Connect Session History to Backend
**Currently workout sessions only live in React Context — lost on app restart or device switch.**

Once the backend adds session endpoints (POST/GET `/api/sessions`):
- On session completion → POST session data to backend
- History tab → GET sessions from backend instead of context
- Keep context as in-memory cache, backend as source of truth
- Handle offline: queue session data locally, sync when online

### Priority 2: Error Handling & Loading States
- Add error boundary component
- Network error screens with retry buttons
- Skeleton loaders for equipment list, workout screens, history
- Toast notifications for check-in/out success/failure
- Handle WebSocket disconnection gracefully with user-visible indicator

### Priority 3: App Onboarding Flow
- First-launch tutorial screens (3-4 slides):
  1. "See what's available" — equipment status explanation
  2. "Scan to check in" — QR scanning demo
  3. "Track your progress" — workout logging explanation
- Show once, persist "has_onboarded" flag in AsyncStorage
- Should feel native and polished (use `react-native-reanimated` for animations)

### Priority 4: Environment Configuration
- Create `.env.development` and `.env.production`
- Move API base URL to env vars (currently likely hardcoded)
- WebSocket URL to env vars
- Use `expo-constants` or `react-native-dotenv` for access

### Priority 5: Pre-Launch Polish
- App icon and splash screen (branded, not Expo defaults)
- Pull-to-refresh on equipment list
- Haptic feedback on QR scan success
- Empty states for history (first-time user sees helpful message, not blank screen)

---

## Coding Conventions

- **TypeScript:** All new files must be `.tsx` / `.ts`. No `any` types.
- **Components:** Functional components with hooks only. No class components.
- **Naming:** PascalCase for components, camelCase for functions/variables, UPPER_SNAKE for constants.
- **Styling:** StyleSheet.create() preferred. Consistent with existing patterns.
- **State:** Use existing Context pattern. Don't add Redux/Zustand/MobX — not needed at this scale.
- **API calls:** All HTTP calls go through the `services/` layer. Never call Axios directly from components.
- **Navigation:** Use expo-router file-based routing. New screens = new files in `app/`.

---

## What NOT to Build Yet (Phase 2+)

Do NOT implement any of the following in this phase:
- Smartwatch companion app or HealthKit/Google Fit sync (UREC-13)
- Diet / nutrition screens (UREC-14)
- AI chatbot interface (UREC-15)
- Social features (leaderboards, workout buddies)
- Push notifications (good Phase 2 feature)
- Equipment reservation system
- Interactive gym floor map (Phase 2 — current list view is fine for MVP)

Focus only on polish and backend integration tasks listed above.

---

## Development Setup

```bash
# Prerequisites: Node.js 18+, Expo CLI
npm install
npx expo start

# Scan QR code with Expo Go app on your phone
# Or press 'i' for iOS simulator, 'a' for Android emulator
```

## Backend API
- Runs at: http://localhost:8080 (dev)
- WebSocket: ws://localhost:8080/ws
- Auth: JWT Bearer token in Authorization header

## Jira Project
- Project key: UREC
- Cloud: ureclivessdi.atlassian.net
- Relevant epics: UREC-9 (Auth), UREC-10 (Workout), UREC-11 (QR/Equipment)
