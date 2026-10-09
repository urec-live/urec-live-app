# Testing: Equipment Issue Reporting (mobile app)

This branch adds:
- **Report a problem** on the machine page, on the scan result and in the workout tracker
- the report form (`app/report-issue.tsx`)
- **My Equipment Reports** (`app/my-reports.tsx`, under Profile)
- a warning banner on the machine page when a machine has open reports
- **Out of Order** machines: staff can take a machine out of service.
  - It shows gray in the equipment list, the workout machine list and on the floor map.
  - The machine page replaces check-in with a notice.
  - The scan screen explains why check-in is refused.

Members can withdraw a report they filed by mistake: **Reported by mistake? Withdraw** under any open report in My Reports, confirmed on the card. A withdrawn report shows a gray **Withdrawn** pill and no longer counts as open. Reports still can't be edited or deleted.

The full walkthrough across backend, admin and app is in `urec-live-backend/EQUIPMENT_ISSUES_TESTING.md`.

## Automated tests

```bash
npm install   # once, to pick up the new dev dependencies
npm test
```

You should see `Tests: 78 passed`. The suite uses Jest with `jest-expo` and React Native Testing Library, which are dev dependencies only, configured in `package.json` under `"jest"`. Test files live in `__tests__/`, outside `app/`, so Expo Router doesn't treat them as screens. The backend and navigation are mocked, so no server is needed.

| File | What it covers |
|---|---|
| `report-issue.test.tsx` (12) | Loads the machine by id (machine page) or by QR code (scanner/tracker); a way back if it can't be found; Send stays disabled until a type is chosen and the description has 10+ characters once trimmed; the character counter; the trimmed payload; the success screen points to My Reports for withdrawing a report sent by mistake; the 409 "already reported" message with its link; retrying after a network error keeps the text |
| `my-reports.test.tsx` (15) | Each card shows machine, problem type, description and status; each status's member-facing label; the progress strip fills up to the current step. **Withdrawing:** only offered on open reports; asks first, and Keep report changes nothing; the card then shows Withdrawn; failures are explained and the report stays open; a report closed in the meantime is reloaded. Also:  empty and error states; pull-to-refresh picks up new statuses |
| `MachineIssueBanner.test.tsx` (7) | Hidden when nothing is open; headline per severity; status text per status; count for multiple reports; announced as an alert |
| `machine-details.test.tsx` (6) | Banner shown or hidden; the page still works if the summary fails to load; Report a problem opens the form; **an out-of-order machine shows a notice instead of check-in**, while in-service machines keep it |
| `scan.test.tsx` (4) | Report a Problem after a valid scan, without checking in; not offered for a non-machine QR code; **a 409 explains the machine is out of order**; a server error never shows `[object Object]` |
| `equipment-list.test.tsx` (1), `exercise-machines.test.tsx` (1) | **Out of order** labels in the Equipment tab; in a workout's machine list the card is disabled and has no Start button |
| `machineStatus.test.tsx` (11) | `isOutOfOrder` in any letter case; floor-map marker colour and legend entry |
| `ActiveExerciseTracker.test.tsx` (3) | The Report button passes the machine's QR code; the tracker hides on the form and keeps entered reps/weights |
| `issueErrors.test.ts` (13), `issueAPI.test.ts` (5) | Error-message mapping per status code and for network errors, for filing and for withdrawing; endpoints and payloads |

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
5. Profile → **My Equipment Reports** shows the report as **Submitted**, with a **Reported by mistake? Withdraw** link under it (see step 13).
6. Have an admin change the status, then pull to refresh. You should see **Seen by staff**, then **Repair on the way**, then **Fixed**. The banner follows the same changes, and disappears once the report is fixed.
7. Scan a machine's QR code. **Report a Problem** appears next to Confirm Check-In. Use QR codes from `scripts/generate-qr.js`: codes printed from the admin dashboard don't scan, which is a separate issue that predates this branch.
8. Check in to a machine and enter some reps. Tap **Report** in the tracker: the form opens with no overlay. Go back: your reps are still there.
9. **Out of order:**
   - Have an admin turn on **Out of order** for a machine. On the Equipment tab and the floor map it turns gray straight away.
   - Its machine page shows "Staff have taken this machine out of service…" instead of **Scan QR to Check In**.
   - In a workout's machine list it's grayed out with no **Start** button.
   - Scanning it and tapping **Confirm Check-In** shows "This machine is out of order…".
10. If you were already checked in when it was marked out of order, **End Workout** still ends and saves the workout.
11. When the admin resolves the machine's last open report, it shows Available again.
12. Try it on web (`npx expo start`, then `w`). Errors and success are shown on the page rather than in pop-up alerts, so they work in the browser too.
13. **Withdraw a report filed by mistake:** in My Equipment Reports, tap **Reported by mistake? Withdraw** on an open report.
    - The card asks "Withdraw this report?". **Keep report** changes nothing.
    - **Withdraw report** turns the pill gray **Withdrawn** and replaces the progress strip with "You withdrew this report on …". The machine page's banner goes away, and you can report the machine again.
    - Fixed and withdrawn reports have no withdraw link.
    - Withdrawing doesn't change the machine's status: an out-of-order machine stays out of order until staff switch it back.
    - It works on web too, since the confirmation is on the card rather than in a pop-up.
