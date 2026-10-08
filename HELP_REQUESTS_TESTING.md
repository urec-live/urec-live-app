# Testing: "Call staff" help requests (mobile app)

This branch adds:
- a **Call staff** card on the machine page, and a **Call staff** pill in the workout tracker's header
- the help request screen (`app/help-request.tsx`):
  - a stepper: Request received → On the way / Too busy → Helped
  - the current status
  - "watch how it's done" demo links
  - **I received help**, behind an "Are you sure?" prompt, and **Cancel request**
- the **demo player** (`app/demo-player.tsx`). It plays an exercise's how-to video and GIF, which are placeholder media for now.
  - The GIF plays inline, with Pause/Play, a loading spinner and **Try again** on errors.
  - On Android and iOS the video plays in the in-app browser's video player. On the web it plays inline.
  - A note says when the media are placeholders.
- a banner on every screen while a request is open, and once more when staff finish it
- `HelpRequestContext`: loads the open request on sign-in, so it survives an app restart. While a request is open and the app is in the foreground, it checks for staff responses every 5 seconds and vibrates when the status changes.

**No dev-build rebuild is needed.** The demo player only uses `expo-image` and `expo-web-browser`, which are already in the dev build. `npx expo start --dev-client --android` picks everything up.

The full walkthrough across backend, admin and app is in `urec-live-backend/HELP_REQUESTS_TESTING.md`.

## Automated tests

```bash
npm install   # once, to pick up the Jest dev dependencies
npm test
```

You should see `Tests: 128 passed` across 11 files. The backend and navigation are mocked, so no server is needed.

| File | What it covers |
|---|---|
| `help-request-screen.test.tsx` (16) | Request received / On the way / Too busy; the demo links open the demo player on the medium tapped, with every param; the placeholder note (shown only while media are placeholders); media the server switched off are left out; "Are you sure?" before closing, and backing out does nothing; the thank-you after closing; a 409 when staff closed it a moment earlier; network errors inline; Cancel with its own confirm; "Staff marked this as done"; the empty state |
| `demo-player-screen.test.tsx` (15) | Opens on the tapped medium; Play hands the clip to the in-app browser's player, stays disabled while it opens, falls back to the system on failure, and says so when nothing can open it; the GIF tab plays inline with a spinner until loaded, then Pause/Play; a GIF that fails to load offers **Try again**, which fetches it again and resumes playback; no Pause on the web; the placeholder note only for placeholder media; no tab switch with a single medium; links that aren't http(s) are refused; Back |
| `demoPlayer.test.ts` (28) | The route params both ways: which links count as web links (`javascript:`, `file:`, `intent:` and relative links are refused); building the params from a demo; reading them back with trimming, repeated params, a default title and falling back to whichever medium exists |
| `DemoVideo.web.test.tsx` (1) | On the web the video is an inline `<video>` element with the browser's controls |
| `HelpRequestContext.test.tsx` (18) | Loads on sign-in (so it survives a restart) and not while signed out; checks every 5 s only while a request is open and the app is in the foreground; vibrates on a status change only; "staff finished" and "expired" notices; keeps checking after a dropped connection; a 409 on call loads the request that's already open; Received help, Cancel and their 409s; forgets everything on sign-out |
| `machine-call-staff.test.tsx` (8) | The machine page's card: calls staff with the machine's only exercise (none if it has several), opens the request, handles 409 and other errors, shows the status at this machine, and points to a request open at another machine |
| `HelpRequestBanner.test.tsx` (7) | The banner for each open status opens the request; hidden on the help screen; "staff finished" until dismissed; expired |
| `tracker-help-pill.test.tsx` (6) | The tracker's pill calls staff by QR code with the exercise, shows the open request's status, handles 409 and other errors, and **hides on `/help-request` and `/demo-player`** |
| `helpRequestAPI.test.ts` (13), `helpRequestErrors.test.ts` (9), `confirm.test.ts` (7) | Endpoints and payloads; which statuses are open; error messages per status code and for network errors; the confirm prompt (`Alert` on native, `window.confirm` on web) |

**Mutation-checked:** each of these temporary breaks makes at least one test fail:
- accepting any URL scheme
- not falling back to the other medium
- dropping the system fallback for the video
- Play staying enabled while the player opens
- Pause calling start
- Pause enabled before the GIF loads
- **Try again** not refetching
- a retried GIF staying paused
- Pause shown on the web
- real media called placeholders
- the GIF link opening on the video
- the placeholder note always shown
- the tracker showing on the player

Type check and lint:

```bash
npx tsc --noEmit   # one existing error in app/settings/plan.tsx predates this branch
npx expo lint      # the files this branch adds or changes are clean
```

After adding a screen, the typed routes in `.expo/types/router.d.ts` need regenerating, or `tsc` rejects `router.push("/demo-player")`. Run `CI=1 npx expo start --offline --port 8099` until the file mentions the route, then stop it.

## Manual checks (backend running, logged in as a member, admin dashboard open as staff)

1. Open a machine from the Equipment tab and tap **Call staff**. The help screen shows **Request received** and the demo links, with "These are placeholder clips for now…".
2. Tap "*exercise*: how-to video". The demo player opens on **Video** with the placeholder note. Tap play: a 5-second sample clip plays in the in-app browser's player. Close it to come back.
3. Tap the **GIF** tab. A spinner shows, then an animated "Coming soon" GIF. **Pause** freezes it and **Play** resumes it.
4. With the network off, open the GIF: you get "Couldn't load the GIF…" and **Try again**, which works once the network is back.
5. If you're checked in to a machine, the workout tracker is hidden on the help screen and the player. The help banner stays on the player.
6. Have staff click **On the way**, then **Too busy**. Each shows within about 5 seconds, with a vibration.
7. Tap **I received help**. **Not yet** does nothing. **Yes, I got help** closes the request and thanks you.
8. Call staff again and have staff click **Done helping**. The app says "Staff marked this as done", and the banner keeps saying so until dismissed.
9. Call staff again and **Cancel request**. The confirm offers **Keep waiting** and **Cancel request**.
10. Call staff from the workout tracker's **Call staff** pill.
11. Close the app completely and reopen it. The open request is still there.
12. On the web (`w` in Metro), the confirms are browser dialogs, the video plays inline in the page, and the GIF has no Pause button.
