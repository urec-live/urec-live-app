# Testing: Equipment Issue Reporting (mobile app)

This branch adds:
- **Report a problem** on the machine page, on the scan result and in the workout tracker
- the report form (`app/report-issue.tsx`)
- **My Equipment Reports** (`app/my-reports.tsx`, under Profile)
- a warning banner on the machine page when a machine has open reports

The full walkthrough across backend, admin and app is in `urec-live-backend/EQUIPMENT_ISSUES_TESTING.md`.

## Automated tests

```bash
npm install   # once, to pick up the new dev dependencies
npm test
```

You should see `Tests: 48 passed`. The suite uses Jest with `jest-expo` and React Native Testing Library, which are dev dependencies only, configured in `package.json` under `"jest"`. Test files live in `__tests__/`, outside `app/`, so Expo Router doesn't treat them as screens. The backend and navigation are mocked, so no server is needed.

| File | What it covers |
|---|---|
| `report-issue.test.tsx` (11) | Loads the machine by id (machine page) or by QR code (scanner/tracker); a way back if it can't be found; Send stays disabled until a type is chosen and the description has 10+ characters once trimmed; the character counter; the trimmed payload; the success screen with View my reports / Done; the 409 "already reported" message with its link; retrying after a network error keeps the text |
| `my-reports.test.tsx` (10) | Each card shows machine, problem type, description and status; each status's member-facing label; the progress strip fills up to the current step; empty and error states; pull-to-refresh picks up new statuses |
| `MachineIssueBanner.test.tsx` (7) | Hidden when nothing is open; headline per severity; status text per status; count for multiple reports; announced as an alert |
| `machine-details.test.tsx` (4) | Banner shown or hidden; the page still works if the summary fails to load; Report a problem opens the form for this machine |
| `ActiveExerciseTracker.test.tsx` (3) | The Report button passes the machine's QR code; the tracker hides on the form and keeps entered reps/weights |
| `scan.test.tsx` (2) | Report a Problem after a valid scan, without checking in; not offered for a non-machine QR code |
| `issueErrors.test.ts` (7), `issueAPI.test.ts` (4) | Error-message mapping per status code and for network errors; endpoints and payloads |

Type check and lint:

```bash
npx tsc --noEmit   # one existing error in app/settings/plan.tsx predates this branch
npx expo lint
```

## Manual checks (backend running on port 8080, logged in as a member)

1. Open a machine from the Equipment tab and tap **Report a problem**.
2. Send stays disabled until you pick **Not working** or **Damaged / hard to use** *and* write at least 10 characters.
3. Send the report. "Thanks, staff have been notified" appears. Tap **Done** and the machine page shows the red or amber banner.
4. Report the same machine again: you see "You already have an open report for this machine" and a link to My Reports.
5. Profile → **My Equipment Reports** shows the report as **Submitted**.
6. Have an admin change the status, then pull to refresh. You should see **Seen by staff**, then **Repair on the way**, then **Fixed**. The banner follows the same changes, and disappears once the report is fixed.
7. Scan a machine's QR code. **Report a Problem** appears next to Confirm Check-In. Use QR codes from `scripts/generate-qr.js`: codes printed from the admin dashboard don't scan, which is a separate issue that predates this branch.
8. Check in to a machine and enter some reps. Tap **Report** in the tracker: the form opens with no overlay. Go back: your reps are still there.
9. Try it on web (`npx expo start`, then `w`). Errors and success are shown on the page rather than in pop-up alerts, so they work in the browser too.
