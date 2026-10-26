# Testing: "Can't reach UREC Live" notice (mobile app)

Branch `minor-fixes-and-speed-ups`, app side (the rest of the branch is in `MINOR_FIXES_TESTING.md`). This part needs no backend change, so the backend can be on main or on the branch.

When the app can't reach the backend, a grey bar appears above every screen, the sign-in screen included:

> **Can't reach UREC Live**
> Check your Wi-Fi or mobile data, then try again. If your connection is fine, the server may be down for a moment. If it keeps happening, close and reopen the app.
> [Try again]

**When it shows**
- Every API request goes through the one Axios client in `services/authAPI.ts`. Its response interceptor reports to `services/backendStatus.ts`, so nothing extra is sent to check. The token refresh, a separate bare call, reports there too.
- A request with no answer at all means the server can't be reached. The cause can be no Wi-Fi or data, the server being down, or the 10 s timeout.
- A 502, 503 or 504 means Railway's proxy answered that the backend behind it is down. Then the bar says **UREC Live isn't responding**, since the member's own connection works. On the web, the browser hides those pages from the app, so they read as no answer. That's why the first wording mentions the server too.
- Any other answer, error codes included, means the server is reachable.
- With this branch's saved data, screens keep showing their saved copies while the server can't be reached, and the bar says why they may be out of date. A screen whose saved copy is still fresh sends no request, so opening it doesn't bring the bar up.
- A slow request that fails after a newer one was answered (e.g. a timed-out poll) is ignored. Requests are numbered as they start, so changing the phone's clock doesn't affect this.

**How long it stays.** It's temporary, and it doesn't flicker on a patchy connection:
- It goes away on its own after 10 seconds, or with the close button. More failures and a change of wording don't keep it up longer.
- Once it has gone, failures in the next 30 seconds don't bring it back, even if some requests get answers in between. A failure after that shows it again. If the phone's clock is set back, the quiet time ends instead of stretching.
- If requests get answers while it's up, it turns green and says **Connected again** for 3 seconds. If they fail again during those 3 seconds, the green bar just goes; it doesn't flip back to grey.

**Try again** asks the server (`GET /api/auth/test`).
- While it waits, the button reads **Checking…** and can't be tapped again. The bar stays up until the check is done.
- If the server answers, the bar says Connected again. If not, it says **Still can't reach UREC Live** and stays another 10 seconds.
- Closing the bar during a check keeps it closed. Once the grey bar has gone for any reason, a check still running no longer changes it.

**Sign-in.** When the server can't be reached, signing in or registering used to say "Invalid credentials" or "Failed to register". Now the alert says **Couldn't sign in** (or **Couldn't register**): "Can't reach UREC Live right now. Check your Wi-Fi or mobile data, then try again." A real wrong password still says Invalid credentials. Google sign-in (from main) shows the same short message under its button, except when the server is just slow to wake up: that keeps its own "The server took too long to wake up" message.

**Signed out by a dropped connection.** When a request got a 401 and the token refresh then couldn't reach the server, the member used to be signed out. Now they stay signed in and see the bar. A refresh the server refuses still signs them out. The refresh also gets the same 10 s timeout as every other request; before, it had none, so a hung refresh left its screen waiting indefinitely.

**Not covered**
- Chat's live connection (STOMP over SockJS in `services/websocketService.ts`) doesn't go through the Axios client. A chat message sent while it's down is still lost without a notice, as on main.
- Pop-up sheets (React Native `Modal`, e.g. the machine check-in sheet) cover the bar while they're open.

The wording and timings are in `constants/backendStatus.ts`.

## Automated tests

```bash
npm test
```

You should see `Tests: 364 passed` across 38 files: the 49 below, plus the branch's other tests (see `MINOR_FIXES_TESTING.md`). Everything is mocked, so no server is needed.

| File | What it covers |
|---|---|
| `backendStatus.test.ts` (24) | **What counts:** no answer and timeouts are network problems; 502/503/504 mean the server is down; 400, 401, 403, 404, 409 and 500 are answers; cancelled requests and other errors are ignored. **The status:** records the kind and time; an error answer clears it; listeners hear only real changes. **Through the real shared client** (fake network adapter): a request with no answer and a 502 both report an outage; the next answer clears it; a slow request failing after a newer answer is ignored; failures after the phone's clock is set back are still reported. **Token refresh:** if it can't reach the server, the member stays signed in and the outage is reported; it has the same 10 s timeout; one failing after a newer answer is ignored, and the member stays signed in; if the server refuses it, they're signed out as before |
| `BackendUnreachableNotice.test.tsx` (18) | **Showing:** nothing while requests are answered; the title, steps, **Try again** and the screen-reader announcement; the server-down wording for a 503. **Timing:** gone after 10 s even while a poll keeps failing; a change of wording doesn't extend it; quiet for 30 s after going, then back; closed, it stays away for 30 s while answers and failures take turns; a clock set back ends the quiet time. **Recovery:** Connected again for 3 s, only if the bar was up; failing again drops the green bar rather than flipping back. **Try again:** Checking…, a second tap sends nothing, then Connected again; the bar stays up however long the check takes; a poll answered during a hanging check shows Connected again for its 3 s, and the check's late failure can't bring the warning back; still failing says so and keeps it up another 10 s; closed during the check, it stays closed; an error answer counts as connected. **Web:** a server snapshot for the static web build |
| `login-unreachable.test.tsx` (6) | Login with no answer says Couldn't sign in, not Invalid credentials; Google sign-in with no answer shows the short message, but a slow wake-up keeps Google's own message; a 401 still says Invalid credentials; registering during a 503 says the server isn't responding; a refused registration keeps main's message |
| `notice-saved-data.test.tsx` (1) | The real Equipment tab, saved data and shared client together: with the server out of reach, the saved machines stay on screen and the bar appears |

**Mutation-checked.** Each of these 28 temporary breaks makes at least one test fail:
- the shared client not reporting failures
- the shared client not reporting answers
- requests' start times not recorded
- a refresh that can't reach the server signing the member out
- a failed refresh not reported
- a failed refresh skipping the stale-request rule
- the refresh having no timeout
- a 500 counting as the server being down
- a 502 counting as an answer
- cancelled requests counting as an outage
- an error answer not clearing the outage
- a slow failure overriding a newer answer
- no server snapshot for the web build
- repeat failures keeping the notice up longer
- a change of failure kind keeping it up longer
- no quiet time after it goes
- a clock set back stretching the quiet time
- Connected again flipping back to the warning
- Connected again showing when the notice wasn't up
- Connected again going too soon
- the notice never going away on its own
- the time on screen running out while Try again checks
- the grey bar going without ending a running check
- a failed Try again not saying so or restarting the time
- Try again ignoring what the check found
- Try again staying tappable while checking
- login blaming the password again
- registration blaming the input again

**Web build.** I ran `npx expo export -p web` with and without the server snapshot. Without it, the exported sign-in page (`dist/(auth)/login.html`) came out empty. With it, the form is there.

Type check and lint:

```bash
npx tsc --noEmit   # no errors
npx expo lint      # the files this branch adds or changes are clean
```

## Manual checks

**Setup.** Switch the app checkout to the branch, if it isn't already (see `MINOR_FIXES_TESTING.md`). `android/` is the same as on main, so your local changes there carry over. No packages are added, so the installed dev build works as is.

```bash
cd /c/Users/abelv/portfolio/getmefit/urec-live-app && git switch minor-fixes-and-speed-ups
```

Then run TERMINAL 1–3 from `commands.txt` (or `./runall.sh`), and sign in. Each section starts with the backend running.

**Server down**
1. Open the **Equipment** tab. Stop the backend with Ctrl+C in TERMINAL 1, then pull to refresh. The grey **Can't reach UREC Live** bar appears at the top, with the steps and **Try again**.
2. Leave it alone: it's gone after about 10 seconds. Pull to refresh again straight away: no bar. Wait 30 seconds and pull again: it's back.
3. Tap **Try again**: it reads **Checking…**, then **Still can't reach UREC Live**.
4. Start the backend again (TERMINAL 1). While it boots, keep tapping **Try again** whenever the bar is up; each failed check keeps it up another 10 seconds. Once the backend has started, the next tap turns the bar green with **Connected again**, and it goes after 3 seconds. If the bar had already gone by then, that's expected: with the server answering, nothing brings it back. Pull to refresh to confirm no bar appears.
5. Stop the backend again, wait 30 seconds, and pull to refresh so the bar shows. Close it with **✕**. Pull to refresh a few times: it stays away for 30 seconds. Start the backend again.

**Phone offline**

6. Make sure the backend from step 5 has finished starting, and wait 30 seconds after the last bar. Turn on airplane mode in the emulator's quick settings, or run `adb shell cmd connectivity airplane-mode enable`. Pull to refresh: the same bar appears. Turn airplane mode off from quick settings (quicker than switching to Git Bash), then tap **Try again** straight away. Keep tapping while it says **Still can't reach UREC Live**; each failed check keeps the bar up another 10 seconds. Once Wi-Fi is back, it says **Connected again**. If the bar went away before you could tap, that's expected; with Wi-Fi back, pulling to refresh shows no bar.

**Sign-in**

7. Sign out and stop the backend. Wait 30 seconds after the last bar (the **Connected again** in step 6), since the bar stays quiet that long. Signing out doesn't reset that. Enter any username and password and tap **Login**. The alert says **Couldn't sign in**: "Can't reach UREC Live right now…", not "Invalid credentials". The bar shows above the form.
8. Start the backend and log in with a wrong password: it still says **Login Failed / Invalid credentials**. Then sign in properly.

**Server answering 503 (optional)**

9. Stop the backend, then run this in a new Git Bash window. It stands in for Railway's proxy and answers every request with a 503 on port 8080:

```bash
python - <<'EOF'
from http.server import BaseHTTPRequestHandler, HTTPServer

class Handler(BaseHTTPRequestHandler):
    def reply(self):
        self.send_response(503)
        self.send_header("Content-Length", "0")
        self.end_headers()
    do_GET = do_POST = do_PUT = do_DELETE = reply

HTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
EOF
```

   Wait 30 seconds after the last bar, then pull to refresh on the **Equipment** tab. The bar says **UREC Live isn't responding** and suggests trying again in a minute. Stop the script with Ctrl+C and start the backend again.

**Web**

10. In a new Git Bash window, start the web build against the local backend. The app window's `EXPO_PUBLIC_BACKEND_ORIGIN` points at the emulator-only `10.0.2.2`, which the browser can't use:

    ```bash
    cd /c/Users/abelv/portfolio/getmefit/urec-live-app && EXPO_PUBLIC_BACKEND_ORIGIN=http://localhost:8080 npx expo start --web --port 8082
    ```

    Sign in, then in Chrome DevTools open **Network** and set throttling to **Offline**. Use the app: the bar appears. Set it back to **No throttling** and tap **Try again**.
