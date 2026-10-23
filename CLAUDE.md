## Shared team workflow

Read `TEAM_WORKFLOW.md` before making changes. It defines shared setup, platform ownership, verification, and handoff rules. Verify architecture claims against source and keep work within the current task.

# CLAUDE.md — UREC Live Mobile App

## Project overview

This repository is the Expo/React Native member client for UREC Live.

| Area | Technology |
| --- | --- |
| Framework | React Native 0.81.5, Expo 54 |
| Language | TypeScript |
| Routing | expo-router |
| State | React Context |
| HTTP/auth | Axios with JWT request/refresh interceptors |
| Real time | STOMP over SockJS |
| QR scanning | expo-camera |

The native `ios/` and `android/` projects are generated locally and ignored by Git. Do not leave required native behavior only in those folders; persist it through app configuration, plugins, or a repeatable integration step.

## Implemented routes and flows

- Auth: `app/(auth)/login.tsx`.
- Tabs: home, equipment, workout, history, and profile.
- Workout drill-down: strength/cardio/pilates → muscle groups → compatible equipment.
- Supporting routes: QR scan, machine detail, workout summary, workout-plan editor, progress detail, help request, demo player, and chatbot UI.
- Equipment list and workout screens receive machine changes from `/topic/machines`.
- `MapModal` and `FloorMap` show backend floor-plan data from equipment and workout flows.
- Session persistence includes sets/reps/weight, notes, history, stats, streaks, weekly activity, personal records, and weight progression.
- Weekly plans use `PlanContext` and `planAPI.ts`.
- Help requests use `HelpRequestContext`, five-second foreground polling while open, cancellation/completion actions, status feedback, and placeholder demo media.

## Project structure

```text
app/                         # expo-router screens
components/                  # workout, progress, map, and help-request UI
contexts/
  AuthContext.tsx
  WorkoutContext.tsx
  PlanContext.tsx
  HelpRequestContext.tsx
services/
  authAPI.ts                 # shared Axios client and JWT refresh
  machineAPI.ts
  sessionAPI.ts
  planAPI.ts
  helpRequestAPI.ts
  chatAPI.ts
  websocketService.ts
  networkConfig.ts
__tests__/                   # Jest tests
```

## API and network configuration

All REST and SockJS origins come from `services/networkConfig.ts`.

- Set `EXPO_PUBLIC_BACKEND_ORIGIN` to an origin such as `http://localhost:8080`; do not include `/api` or `/ws`.
- Web development and iOS Simulator fall back to localhost.
- Android Emulator falls back to `10.0.2.2`.
- A non-local web build falls back to the configured Railway backend.
- Physical devices need an origin reachable from that device.

Do not add personal LAN addresses to source or duplicate base URLs in individual API modules.

## Known integration gaps

- `app/chat.tsx` and `services/chatAPI.ts` call `POST /api/chat`, but the checked-out backend has no matching REST endpoint. Treat the chatbot as client UI, not an end-to-end completed feature.
- `machineAPI.getMyEngagement()` calls `GET /api/machines/my-engagement`, which is absent from the checked-out backend and is not currently consumed by a screen.
- The backend contains social, badge, league, community-chat, and direct-message APIs; this client has no matching services/screens.
- Wearable/HealthKit/Google Fit sync, diet/nutrition, push notifications, and equipment reservations are not implemented.
- Native, web, hosted, and provider behavior require separate validation; a passing TypeScript or Jest check is not device proof.

## Coding conventions

- Use TypeScript functional components and hooks.
- Use expo-router file routing; add screens under `app/`.
- Keep HTTP calls in `services/`; components should not call Axios directly.
- Reuse the existing Context pattern instead of adding another global-state library.
- Use platform-specific files or guards for platform-specific behavior.
- Preserve the dynamic network resolver.
- Keep UI styles aligned with existing `StyleSheet.create()` patterns.

### Equipment Issue Reporting
- Members report a machine as "Not working" or "Damaged / hard to use" with a required 10–1000 character description (`app/report-issue.tsx`, `services/issueAPI.ts`)
- Entry points: machine page, scan result, and the workout tracker header (the tracker hides itself on the form without unmounting, so entered sets survive)
- `WorkoutSession.machineId` holds the machine's QR **code**, so the tracker/scanner open the form with `?code=`; the machine page uses `?id=`
- Profile → My Equipment Reports shows each report's status (Submitted → Seen by staff → Repair on the way → Fixed)
- Members can withdraw their own open report from My Reports ("Reported by mistake? Withdraw", confirmed on the card): `issueAPI.withdrawReport` → `POST /equipment-issues/{id}/withdraw`. A withdrawn report is RESOLVED with `withdrawnAt` set and shows as **Withdrawn**
- `components/MachineIssueBanner.tsx` warns every member when a machine has open reports (no reporter details)
- Errors/success are shown inline, not via `Alert` (Alert buttons don't work on web)

### Out of Order machines
- Staff can set a machine's status to "Out of Order"; use `isOutOfOrder()` from `constants/machineStatus.ts` (case-insensitive) rather than comparing strings
- It shows gray (`OUT_OF_ORDER_COLOR`, wrench icon) in the equipment list, workout machine list and floor map; the machine page replaces check-in with a notice
- The backend refuses check-in with 409 (the scan screen explains it) but still accepts check-out, so an in-progress workout can end

## Development and checks

```bash
npm ci
npm start
npm run lint
npx tsc --noEmit
npm test

# Native validation
npx expo prebuild --platform ios --no-install
npm run ios

npx expo prebuild --platform android --no-install
npm run android
```

Follow `TEAM_WORKFLOW.md` before prebuild or native validation. After adding a route, regenerate typed routes if necessary by starting Expo, then rerun TypeScript.

Help-request-specific manual and automated checks are documented in `HELP_REQUESTS_TESTING.md`.

## Jira

- Project key: UREC
- Cloud: ureclivessdi.atlassian.net
- Relevant historical epics: UREC-9 (Auth), UREC-10 (Workout), UREC-11 (QR/Equipment)

Historical roadmap text is context only. Current tasks authorize scope.
