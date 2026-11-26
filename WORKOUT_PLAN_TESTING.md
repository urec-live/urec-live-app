# Exercise-based workout plans

Owner: Codex. App and backend delivery branch: `feature/member-experience-2026-11-13`.
Current integrated preview: http://localhost:8091/settings/plan. The preview account/port and validation below are historical. No shared-database migration or deployment was performed.

## Behavior

Open Profile → Workout Plan, expand a day, and tap **Add Exercises**.
Search by name and combine equipment and muscle filters. Select several exercises,
then tap **Add to day** to apply them to that day. Closing the library discards unapplied selections.
Existing items cannot be selected twice in the same day. Use arrows to reorder and
the remove button to delete an item. Save, reopen, and confirm the exercise names,
order, day labels and selected days persist.

The picker reads every page of the existing catalog (212 shared exercises in the
isolated local seed, plus the member's custom exercises). It does not claim parity
with Hevy's proprietary dataset. Filter choices derive from actual catalog values.
Images appear where the catalog provides them; other rows use a dumbbell icon.
Legacy muscle-group goals remain visible and retain their counts.

Today's goals use each selected exercise's ID, and count completed sessions only.
A new exercise goal has targetCount=1 (one completed exercise workout); this change
does not add set/rep prescriptions. Tap a named goal to open that exercise's tracker.

## Local preview

App: http://localhost:8082/settings/plan
Backend: http://localhost:8080/api/auth/test

The running backend uses an isolated in-memory H2 database with the test profile.
Preview account: `plan_preview` / `PlanPreview2026!`.
This account and its plan disappear when that backend stops.

1. Sign in to the local app with the preview account and open Workout Plan.
2. Expand Monday → Add Exercises; search `bench`, filter Barbell and Chest.
3. Select an exercise, clear filters, select another, and add both.
4. Reorder, remove, add again, save, and reopen. Both names and order should persist.
5. Reopen the picker: selected day exercises show **Added** and cannot be duplicated.
6. Close the picker with a new selection: it should not appear in the day.
7. Test a search with no results, clear filters, and retry after a network failure.

Automated validation: TypeScript; lint (8 pre-existing warnings); 6 focused Jest
checks for filtering, multi-page catalog loading, selection/cancel, ordering,
save payloads, legacy plan hydration, and save-error draft retention. Backend
`mvn clean verify` on Java 21 passed 323 tests with 3 skipped; two new API integration
checks cover persistence, updates, ordering, copy, exact completion and private
exercise access. Live HTTP checks passed catalog filters and plan create/update/reload.

Browser automation was unavailable (browser access host unavailable); visual review,
iOS Simulator and Android Emulator interaction checks remain pending.

## Rollout

Deploy the backend and its additive schema change before releasing this client.
See backend `migrations/20261109_plan_exercises.sql`. Existing APIs still accept
muscle-only items. New fields: optional exerciseId on requests; exerciseId,
exerciseName and equipmentType on plan and today's-goal responses.
No dependencies or required environment variables changed.
