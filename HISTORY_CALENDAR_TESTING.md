# Workout history calendar

Delivery branch: `feature/member-experience-2026-11-13`. Earlier preview evidence below is historical; current integrated preview: http://localhost:8091/history.

## Behavior

- Sunday-first month calendar, previous/next month controls and Today shortcut.
- Gold lightning marks dates with logged exercises. Today has a green background; the selected week has a pale green outline and fill.
- A brief row above every week counts workout days, logged exercises and logged duration for the whole Sunday–Saturday week, including adjacent-month dates.
- Tap a date or brief row to select a week. The summary below counts workout days, logged exercises, sets and logged duration, followed by the existing day-by-day exercise/set details for that week only.
- Starts at the latest logged workout. With no history, starts at the current month. Empty weeks retain the calendar and show an empty state.
- Date-only labels use local calendar dates; timestamps are grouped by local day. Summed duration includes completed exercise sessions, not time between exercises.
- Weekly card also shows estimated kcal and a distinct named muscle-group count/list (case-insensitive; General/Unknown excluded). Calories use completed logged duration, the weight saved in Profile (or a clearly labeled 70 kg reference fallback), and 3.5 MET moderate resistance training (2024 Adult Compendium, code 02054). No measured calorie data is available.
- Existing cached history, pull-to-refresh, focus revalidation and offline fallback are retained. No API, schema, dependency or environment changes.

## Focused manual check

Prerequisites: development backend running at the app's configured origin; signed-in member with saved workouts in two different weeks. Local web: http://localhost:8082/history.

1. Open History. Check lightning markers match logged workout dates, the latest workout week is selected, and its brief counts match the summary below.
2. Tap a date in a different week. Only that week's day cards should appear, with exercise names, duration and sets intact.
3. Tap an empty week. Expect zero totals and “No workouts this week.”
4. Navigate months, including December → January. Check the month heading and adjacent-month dates; weekly totals include all seven days across the boundary.
5. Tap Today. Expect the current month and current Sunday–Saturday week.
6. Complete a workout and revisit History or pull to refresh. Expect updated markers, counts and details. Disconnect the backend after loading history and refresh: expect saved details and the offline note.
7. With a new member, expect the calendar plus “No workout history yet.” Check phone layout and large system text on both native platforms.

## Validation performed

- `npx tsc --noEmit`: passed.
- `npm run lint`: passed, with eight existing warnings outside this change.
- `npm test -- --runInBand __tests__/history-calendar.test.ts __tests__/member-screens.test.tsx`: 16 tests passed. Coverage includes week filtering, empty history, offline/cache behavior, month/year boundaries, leap day and DST-safe calendar arithmetic.
- Expo web restarted from this branch on port 8082; `GET /history`: HTTP 200.
- Signed-in Chrome at 373 × 728: visually checked markers and selected styling; selected an empty November week; navigated to October; selected Oct 25–31 and observed 1 workout day, 2 logged exercises, 4 sets, 10 minutes, and the two matching detailed exercise cards.
- Live offline/recovery and pull-to-refresh gestures were not manually exercised; cached/offline/focus-refresh behavior is covered by the existing member-screen tests.
- iOS and Android native checks pending. No production deployment performed. Existing unrelated worktree edits preserved.


Profile features have separate guides: `BODY_MEASUREMENTS_TESTING.md` and `WEIGHT_PROGRESS_TESTING.md`.
