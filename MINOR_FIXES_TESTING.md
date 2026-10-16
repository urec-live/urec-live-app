# Testing: minor fixes and speed-ups (mobile app)

Branch `minor-fixes-and-speed-ups`, here and in `urec-live-backend`. It changes two things:

**1. Screens show saved data first, and stop refetching what they already have.**
- **Saved copies.** A screen shows what it loaded last time right away, also after an app restart, and refreshes in the background only when that copy is stale. It redraws only if the new data is different. A spinner shows only when nothing has been saved yet.
  - The code is `services/resourceCache.ts` and `hooks/useCachedResource.ts`.
  - `services/cachedResources.ts` lists each kind of data and how long it stays fresh:

    | Data | Stays fresh |
    |---|---|
    | Exercises, muscle groups, each machine's exercises | 10 min |
    | The member's stats, history and league | 30 s, and refreshed after they finish a workout |
    | Machine statuses | While live updates stay connected, 2 min at most |
    | DM inbox | Checked on every visit |
  - Signing out, or a session that expires, wipes the member's saved stats, history and messages. Gym data stays.
- **Live updates on every screen.** `hooks/useLiveMachineUpdates.ts`, used in `app/_layout.tsx`, connects them once at sign-in. Before, only the Equipment tab and chat connected, so the workout screens got no updates unless one of those had been opened. Each machine update now patches every saved list that has the machine, and after a reconnect the machine data on screen is fetched again.
- **Equipment tab.**
  - 1 request instead of 97, with the updated backend.
  - The list shows as soon as it arrives. Floor plans load in the background, and **Locate** appears once they're in.
- **Machine picker** (exercise → machines).
  - It no longer waits about 1.7 s for floor plans before showing the list.
  - Check-in and check-out show the server's response instead of reloading the list.
  - The **History** sheet uses the History tab's saved sessions.
- **Muscle group screen.**
  - It opens instantly when you come back, including after **End Workout**.
  - Live updates change the counts without reloading every exercise's machines.
  - An exercise with no machines says **No machines** instead of "Loading availability…" forever.
- **Machine page.** It shows the machine from the Equipment tab's list right away, and uses 1 request instead of 2 one after the other.
- **Profile, League, DM inbox, History.** Coming back to the tab no longer swaps what's on screen for a spinner. History now picks up a workout you just finished. Before, it loaded once per app session.

**2. Ending an empty session doesn't save it as a workout.**
- Ending a session with no sets logged now asks **End without saving?**. It frees the machine but saves nothing: no history, and no credit toward streaks, badges, the league or Today's Goals.
- Cardio is timed rather than logged in sets, so a cardio session is saved once it has lasted a minute.
- This applies to every way a session ends: **End Workout** in the tracker, **Stop** in the machine picker, and the watch. `utils/workoutSession.ts` holds the rule, and `WorkoutContext.checkOut()` applies it.

Also fixed: `startRest()` now takes the watch's start time. That was `tsc`'s only two errors.

**The backend branch** sends each machine's exercise names and muscle groups with it, and loads the machine list with one query. Without it, the app still works: the Equipment tab and machine page fetch each machine's exercises in the background, like before but without making you wait.

## Automated tests

```bash
npm test
```

You should see `Tests: 229 passed` across 22 files: the 130 from before plus 99 new. The backend, navigation and storage are mocked, so no server is needed.

| File | What it covers |
|---|---|
| `resourceCache.test.ts` (18) | Saving to memory and storage; reading a copy back after a restart; the startup preload, which skips unrelated and broken entries; listeners hear only real changes; one shared request per key; a failed fetch keeps the saved copy; a fetch started before sign-out isn't saved; freshness by age, by invalidation (per member) and by the live connection; live updates patch lists, floor plans and single machines, keeping each list's own exercise, and are re-applied to a fetch that was running when they arrived; after a reconnect, only the machine data on screen is refetched; sign-out wipes members' data in memory and storage, and still works when storage fails |
| `useCachedResource.test.tsx` (15) | Spinner only when nothing is saved; a fresh copy shows with no request; a stale copy shows at once and is swapped for the new one; copies found in storage; screens share one request; errors with and without a saved copy; `revalidate` fetches only when stale, while `refresh` always fetches and reports `refreshing`; `initialData`; a null key; a live update redraws without a request; the multi-key version: per-key fetches, failures and refresh, and a stable result |
| `workout-screens.test.tsx` (13) | **Strength:** saved list on the next visit, and Retry. **Muscle screen:** counts and "No machines"; a live update changes the counts with no request; the next visit is instant; lists are refetched when live updates weren't connected. **Picker:** opens from the muscle screen's saved list with no request; doesn't wait for floor plans; check-in from the response, no reload; live updates for machines whose main exercise is another one (the old screen ignored those); Stop with nothing logged warns, and Keep going stays put; End frees the machine and goes back without reloading; with sets, it stops straight away |
| `equipment-tab.test.tsx` (8) | One request for the cards (muscle groups and exercise names); doesn't wait for floor plans; **Locate** once they arrive; with an older backend, the list comes first and the exercises fill in after; the next visit is instant; a live update changes a card; pull-to-refresh fetches the list and the floor plans once each; the empty state |
| `member-screens.test.tsx` (8) | **Profile:** no reload when reopened soon after; after a workout, keeps the stats on screen while the new ones load; opens from the saved copy. **League:** refreshes in the background once 30 s old. **DM inbox:** checks every visit, with the saved list showing meanwhile. **History:** picks up a session saved after the tab was opened, sending offline sessions first; offline it shows the saved copy, or else this session's workouts, with the offline note |
| `machine-call-staff.test.tsx` (10, 2 new) | Uses the exercises sent with the machine; shows the Equipment tab's copy while its own request runs (plus the existing Call staff checks) |
| `WorkoutContext.test.tsx` (7) | Saves a session with sets (today's list, history, backend); an empty session ends without saving or queueing anything; empty set list; cardio after 59 s versus 60 s; a saved session marks only that member's data stale; an offline session is queued and the data still marked stale; `startRest(time)` |
| `workoutSession.test.ts` (7) | The rule: sets, including a "3 sets" count with no reps; no sets; the cardio minute; how "cardio" can be written; both prompts' wording |
| `tracker-end-workout.test.tsx` (7) | **End Workout** with no sets warns, and **Keep going** keeps the session; **End** frees the machine and passes no sets; with a set, the usual "Are you sure?"; short cardio explains the minute; longer cardio gets the usual prompt; the freed machine shows in saved lists at once; ends even when check-out fails |
| `liveMachineUpdates.test.tsx` (5) | Nothing while signed out; connects at sign-in and patches saved data; fresh only while connected since the fetch; disconnects at sign-out; refetches what's on screen after a reconnect, but not on the first connect |
| `websocketService.test.ts` (6) | One client even with two connects at once; no client when `disconnect()` comes while `connect()` reads the token; `getConnectedSince()` and connect listeners, including STOMP's auto-reconnect; unsubscribing; late close events from a replaced client are ignored; machine updates reach every subscriber |
| `AuthContext-cache.test.tsx` (3) | Saved data is in memory before the signed-in screens show; sign-out wipes the member's data but keeps the gym's; so does a session that expires |

**Mutation-checked.** Each of these 29 temporary breaks makes at least one of the tests above fail:
- the cache telling listeners about unchanged data
- not sharing a running request
- machine data counting as fresh while disconnected
- a live update overwriting a list's own exercise
- updates during a fetch being lost
- sign-out leaving data in storage
- screens refetching fresh data on open
- focus ignoring freshness
- the first open and focus both fetching
- short cardio counting as a workout
- empty sessions being saved again
- a saved session not marking stats stale
- the tracker never warning about an empty session
- the tracker's check-out not updating saved lists
- the picker reloading after check-in
- the picker's Stop never warning
- the picker waiting for floor plans again
- the Equipment tab waiting for floor plans again
- the Equipment tab looking up every machine's exercises
- muscle screen lists ignoring the live connection
- `disconnect()` during `connect()` still starting a client
- an old client's close resetting the new connection
- the first connect refetching everything
- sign-out keeping the member's data
- no preload at startup
- the machine page ignoring the list's copy
- the machine page always fetching exercises
- History not refreshing when reopened
- Profile reloading on every visit

Type check and lint:

```bash
npx tsc --noEmit   # no errors
npx expo lint      # nothing new: the remaining findings are on main too
```

## Measured

I replayed each screen's requests against a local backend with Neon behind it, 5 at a time like Android's HTTP client, median of 3 runs. These are first visits with nothing saved. Coming back to a screen makes no request that the screen waits for: it shows the saved copy (see the tests above).

| Screen | main app + main backend | main app + this backend | **this app + this backend** |
|---|---|---|---|
| Equipment tab | 97 requests, spinner **6.95 s** (list there at 2.73 s) | 97 requests, 2.01 s | **2 requests, 0.07 s** |
| Machine picker | 2 requests, spinner **2.81 s** (list there at 0.06 s) | 0.16 s | **0.07 s** |
| Machine detail | 2 requests one after the other, 0.19 s | 0.16 s | **1 request, 0.10 s**; from the Equipment tab, it shows at once |
| Muscle group screen | 1 + 8 requests, list 0.06 s | same | same on the first visit; reopening: none |
| Strength | 1 request, 0.10 s | 0.07 s | 0.06 s; reopening: none |

On a phone talking to Railway, each request takes longer. Before, the Equipment tab paid that delay about 19 times in a row (95 requests, 5 at a time). Now it pays it once.

## Manual checks

**Setup.** Put the backend on the branch first. The app's checkout is already on it.

```bash
cd /c/Users/abelv/portfolio/getmefit/urec-live-backend && git switch minor-fixes-and-speed-ups
```

Then run TERMINAL 1–3 from `commands.txt` (or `./runall.sh`), and sign in as a member.

**Speed**
1. Open the **Equipment** tab. The list appears in well under a second, with each machine's muscle groups and exercises. **Locate** buttons appear a moment later.
2. Go to **Workout → Strength → Chest**, open an exercise, then go back and open it again. The second time there's no spinner anywhere.
3. Turn on airplane mode and revisit those screens. They still show what they had. Turn it off again.
4. Switch between **Profile**, **League** and **History** a few times. No spinner replaces what's already on screen.
5. Close the app completely and reopen it. The tabs show their data straight away and refresh quietly.

**Live updates without the Equipment tab**
6. Restart the app and go straight to **Workout → Strength → Chest** without opening the Equipment tab. Check in to a Chest machine from another device or the admin dashboard's live monitor. The count on the Chest screen changes within a second or two, without pull-to-refresh.

**Empty sessions**
7. Start a strength machine from the picker and tap **End Workout** without entering any sets. It asks **End without saving?** Tap **Keep going**: the session is still running. Tap **End Workout → End**: the machine is free again, History doesn't list the session, and your streak and Today's Goals are unchanged.
8. Start again, enter a set (reps or weight), and tap **End Workout**. You get the usual "Are you sure?" **End** saves it, and **History** shows it when you open the tab, without pull-to-refresh.
9. Scan a treadmill's QR code and end it within a minute: you get the cardio warning. Do it again and wait over a minute: you get the usual prompt, and it's saved.

**Sign-out**
10. Sign out and sign in as a different member. None of the first member's stats, history or messages show, not even briefly.
