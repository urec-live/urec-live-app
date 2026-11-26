# Exercise details: summary, history and instructions

Owner: Codex. App/backend delivery branch: `feature/member-experience-2026-11-13`.
Current integrated preview: http://localhost:8091/exercise/1, using the local demo account documented in EQUIPMENT_MAP_TESTING.md. The preview accounts/ports and validation below are historical. No production deployment or shared-database change was performed.

## Local preview

- App: http://localhost:8082/exercise/1 (Bench Press)
- Row: http://localhost:8082/exercise/10
- Demo account: `exercise_demo` / `ExerciseDemo2026!`
- Existing plan-preview login remains `plan_preview` / `PlanPreview2026!`;
  its local plan was preserved and restored during the backend restart.

The separate demo account contains explicitly seeded sample workouts for testing
charts and records; they are not real member results. The backend uses an isolated
in-memory test database, so accounts and records disappear when it stops.

## Design and behavior

The exercise page uses one workspace instead of Summary/History/How-to tabs.
Its forest-green header groups the exercise identity and start action. A progress
workspace and training timeline occupy the main column; lifetime records, an amber
movement guide and pinned notes sit alongside them on desktop. On narrower screens,
the columns stack. There is no oversized demonstration banner.

1. Open an exercise from the library or a named plan goal. Start exercise still
   opens the existing active tracker.
2. Progress over time: open the date-range control and choose 3/6/12 months or All
   time; select a metric and a chart date. Values should update.
3. Training log: expand a dated entry to see set tiles, session duration and notes.
   Three recent sessions appear first; load older workouts to see more. An exercise
   with the same name and a different ID is excluded.
4. Lifetime bests: inspect the compact record grid and expand Set records or the
   explanation control.
5. Movement guide: expand to reveal muscle focus, form cues and any available media.
   Pinned notes remain independently accessible, without switching views.
6. Add/edit/clear a private pinned note, reload, and verify persistence. Save failures
   retain the draft. Start the exercise and confirm the note appears while logging.
7. Check an exercise without history/media, an invalid link, and a network failure.
8. Check timed, reps-only and distance/time exercises: weighted PR controls must not
   appear.

The day-plan picker follows the same visual direction: a day-focused header,
square exercise thumbnails, selectable result cards, a removable selection tray
and an **Add to day** action. Search, combined filters and cancel remain supported.

Records use full paginated history rather than the latest 100 sessions.
Weighted records: heaviest weight, estimated 1RM, best set volume, best session volume,
and the heaviest load for each rep count. Volume is weight × reps. Estimated 1RM uses
Epley (weight × (1 + reps/30)), limited to 1–12 reps; singles use the actual weight.
The chart shows daily best values in the chosen range; PRs remain all-time.

## Data coverage

The existing seed's 63 image URLs are label placeholders, not exercise demonstrations.
Known placeholder hosts are excluded. Real media URLs render through expo-image,
with playback control, retry and missing-media states. No Hevy assets were copied.
Actual demonstration assets still need to be supplied for catalog coverage.

Secondary muscles are now returned as an array when catalog metadata exists. The
initial reviewed entries are Bench Press and Seated Cable Row; other entries explicitly
say they are not listed. Primary muscle groups and existing instructions are preserved.
Source references and the additive schema are documented in backend EXERCISE_DETAILS.md.

## Validation

Latest visual revision (2026-11-10):
- Reached the restarted local exercise page and visually reviewed the unified layout
  in native Chrome, including its empty state, desktop columns and coaching panel.
- Focused Jest: exercise-detail, plan-exercise-picker, plan-editor and
  pinned-exercise-note: 4 suites, 10 tests passed.
- TypeScript: passed. Lint: no errors, 8 pre-existing warnings.
- No backend/API/schema/dependency changes were made for this visual revision.
- Native iOS Simulator and Android Emulator checks remain pending.

Before this visual revision, the full frontend suite passed 54 suites / 472 tests,
and Java 21 backend verification passed 329 tests with 3 skipped. Live note save/read,
session logging and metadata checks are recorded in the companion backend document.

## Rollout

Deploy the backend and review/apply `migrations/20261109_exercise_notes.sql`
before releasing this client (plus the companion plan migration if not already applied).
No package or environment-variable changes. Notes use authenticated GET/PUT
`/api/exercises/{id}/notes`, JSON `{ "note": "..." }`, max 2000 characters.
