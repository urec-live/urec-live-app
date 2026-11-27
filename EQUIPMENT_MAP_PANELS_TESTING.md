# Equipment tab: full-screen map with sliding panels

The Equipment tab's floor map now fills the whole screen. What used to sit above and below it slides over the map instead of pushing it around:

- **Top panel** (gym name, Scan QR, search and filters, floor tabs, live status, Refresh): open by default. Swipe it up or tap the grab bar at its bottom to hide it. A small pill then stays at the top showing the floor (and the search, if any). Tap the pill or pull it down to bring the panel back.
- **Results sheet** (equipment and places list, legend): closed by default. Only its title bar ("Equipment & places (N)", "N on Ground · N elsewhere") shows at the bottom. Swipe up on the title bar or tap it to open the list. Swipe down or tap again to close it. The list scrolls on its own and never moves the sheet.
- **Selected item**: picking a pin, a room or a list row closes the list and shows the item's card (status, exercises, View equipment) in the closed sheet, under the title.
- Pressing the keyboard's search key opens the list. A new search or filter starts the list at the top.
- The map keeps its full size the whole time. Fit and focus keep the floor or the selected item in the uncovered part of the screen, and the zoom buttons sit just above the closed sheet. If you haven't panned or zoomed, the map follows the panels as they open and close. Once you pan or zoom, opening or closing a panel leaves your view where it is. At most it glides to close a gap a closing panel left, or re-centres a floor that's smaller than the space.
- The old **List** toggle is gone: the opened sheet is the list.

## Setup

From the workspace root (Windows, Git Bash): `./runall.sh --map-demo backend app`. This starts the backend on the local map demo (four illustrative floors, 160 machines) and the app on the emulator. Sign in as `mapmember` / `MapDemo2026!`.

Without the launcher: start the backend with the `map-demo` profile (see `EQUIPMENT_MAP_TESTING.md`), then `npm run android` (or `npm run ios`) in this repository.

## Manual test

1. Open **Equipment**. The map fills the screen behind the panels. The top panel is open. At the bottom there is only the sheet's title bar, e.g. "Equipment & places (164)" and "40 on Ground · 124 elsewhere". The whole Ground floor fits between the panel and the title bar. Zoom buttons (− Fit +) sit just above the title bar.
2. **Hide the top panel by swiping:** drag up anywhere on the panel (not just the grab bar). It follows your finger. Let go past halfway, or flick, and it slides away. Let go early and slowly and it springs back. Once it's hidden, the pill shows "Ground", and the map grows to use the freed space if you hadn't moved it.
3. **Bring it back:** pull the pill down, or tap it. The panel slides back over the map and your search text is still there.
4. **Tap to hide:** tap the grab bar under the status row. The panel hides.
5. **Open the list by swiping:** drag the title bar up. The sheet follows your finger and covers the map up to just below the top panel (or the pill). The map underneath does not move or shrink. Scroll the list: the sheet stays put. Drag the title bar down, or flick it, to close it.
6. **Tap to open:** tap the title bar. The list opens. Tap it again and it closes.
7. **Search:** open the list, scroll down, then type `running` in the search box. The results start at the top. Press the keyboard's search key. The list opens with Search results. Tap Treadmill 1. The list closes, the map switches floor and centers the treadmill, and its card shows under the title bar. **View equipment** opens the machine page. Close the card with ✕.
8. **Pins:** tap a pin on the map. Its card appears in the closed sheet, and the pin stays centered above the card.
9. **Your view stays put:** pinch or pan the map somewhere, then hide and show the top panel. The map doesn't jump. At most it glides a little to close a gap above the floor. Tap **Fit**, then hide the panel: the floor slides to fit the larger space.
10. **Horizontal scroll still works:** with the top panel open, swipe the floor tabs sideways. They scroll and the panel doesn't move. Typing in the search box and opening Filters work as before.
11. **Live status:** in admin, set a machine to In Use while its card is open in the app. The pin, the card and the list row update together, and the map doesn't move.

## Automated checks

- `npm test -- __tests__/equipment-tab.test.tsx __tests__/map-panels.test.ts __tests__/equipment-map.test.ts`: the panels' defaults, taps and swipes (using gesture-handler's `fireGestureHandler`), what the map is told the panels cover, the snap rules, when the camera follows, and the inset-aware fit, clamp and focus.
- Full suite: `npm run lint`, `npx tsc --noEmit`, `npm test -- --runInBand`.

## Platform status

- Android: passed on 2026-11-27, Pixel_8_Pro emulator (Android 17), map-demo backend, signed in as mapmember. Steps 1–10 checked: hiding by swipe and by tap, the pill by pull and by tap, swiping the sheet up, list scrolling without moving the sheet, tapping the title, Enter opening results, selecting from a row and a pin, Fit/zoom with the panel hidden, and a new search resetting the list. Step 11 wasn't run (admin wasn't started).
- iOS: pending (Thanmay). Watch the panel and sheet shadows, the keyboard over the closed sheet, and swipe-to-hide next to the search box.
