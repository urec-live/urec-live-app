# Testing: the tab bar on phones

Branch `fix/android-tab-bar`. One file changed: `app/(tabs)/_layout.tsx`.

**The bug.** Since main's independent-workouts update (#24), the app had no tab bar on Android: no Workout, Equipment, History, League or Profile buttons, so there was no way to reach the Profile page. The web build was fine.

**Why.**
- #24's `tabBarStyle` set `height` and `paddingBottom` to `undefined` everywhere except web.
- React Navigation applies `tabBarStyle` after its own height and safe-area bottom inset, and a key set to `undefined` still replaces them.
- With no height, the bar collapsed to a few pixels.

**The fix.** Those two keys are only added on web (`height: 64`, `paddingBottom: 8`, as before). Phones get React Navigation's own height and inset. The bar's colours and border from #24 are unchanged.

## 1. Automated tests

```bash
npx jest
```

Every test should pass; report the runner's own result.

| File | What it covers |
|---|---|
| `tab-layout.test.tsx` (4) | Drawn the way React Navigation does it (its height and inset, then `tabBarStyle`): on Android and iOS the bar keeps React Navigation's height and inset; on web it's 64 px with 8 px padding. Workout, History, League and Profile are always tabs, and Equipment only with a gym. |

**Mutation check.** Put #24's two lines back (`height: Platform.OS === "web" ? 64 : undefined` and the same for `paddingBottom`). The Android and iOS tests fail.

## 2. Manual checks

Start the app on the emulator or your phone as usual (`./runall.sh` or `./runall.sh --android`). It's a JavaScript-only change, so no rebuild is needed.

1. The tab bar shows at the bottom of every tab: Workout, History, League and Profile, plus Equipment when your account has a gym.
2. Tap **Profile**. The Profile page opens, and you can scroll down to **Logout** without the tab bar covering it.
3. On a phone with gesture navigation, the tab labels sit above the gesture bar, not on it. With the 3-button navigation bar, they sit above the buttons.
4. Start an exercise from **Workout**. The workout panel at the bottom covers the tab bar while it's open, which was already the case before #24. Finish or end it, and the tab bar is back.
5. Optional: the web build (`npx expo start --web`) still shows the same bar as before.
