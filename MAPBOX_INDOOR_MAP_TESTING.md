# Equipment tab: Mapbox indoor map (Level 1 proof of concept)

When a Mapbox token is configured, the Equipment tab draws the real Level 1 of the UREC building with Mapbox instead of the backend's illustrative SVG floors:

- **Floor data**: `constants/indoorVenue.ts` holds Level 1 in Mapbox's custom indoor schema (facility > structure > floor > room, each room with a `floor_id`; see https://docs.mapbox.com/help/dive-deeper/indoor-mapping/). The rooms were traced by hand from the Level 1 wayfinding sign (Fitness north and south, pool, two locker rooms, restrooms, wet classroom, stairs, elevator, staff rooms). They are placed on the building outline from OpenStreetMap way 1051865705. It is an illustrative trace, not a survey.
- **Equipment**: no machine has a real position yet, so `utils/indoorPlacement.ts` lays every machine of the gym out in rows across the two Fitness areas. Machines are grouped by their first muscle group (A–Z, ungrouped last), then sorted by name. The spacing shrinks to fit any count. Backend `floorX`/`floorY` values are ignored in this mode.
- **Floors**: Mapbox's experimental indoor floor selector isn't exposed by `@rnmapbox/maps`. So the floor tabs in the top panel come from the venue data, and every layer filters on `floor_id`, which is the custom-UI approach Mapbox's indoor docs describe. There is one floor, **Level 1**.
- **Map**: Mapbox Standard basemap with its own 3D buildings hidden. Two toggle buttons sit at the top right, under the top panel:
  - **3D** (on by default): the floor is tilted about 50°, walls stand 2.5 m tall (`INDOOR_WALLS`; the two Fitness rooms are open floor, so no wall runs between them), room names float above the walls, and machines are small boxes in the usual status colours. Non-matching boxes fade, and the selected box rises and gets a dark ring on the floor. Two-finger tilt works. Turn it off for the flat 2D view: status-coloured dots that fade when a search doesn't match and get a dark ring when selected.
  - **Rotate** (off by default): turn it on to twist the map with two fingers. Turning it off turns the map back to north.
- Tapping a box or dot opens the same card as the list. Rooms aren't tappable in this mode, and backend "places" aren't listed.
- **No token**: the tab is unchanged and shows the SVG floor map (or "Map not available yet").

Not included: navigation or routes, staff placement of machines, other floors and other gyms. Every gym shows this venue.

## Setup

1. Create a free Mapbox account and copy its **Default public token** (`pk.…`). No secret download token is needed for Android.
2. In this repository, add it to `.env.local` (gitignored) next to your backend origin:
   ```
   EXPO_PUBLIC_MAPBOX_TOKEN=pk.your-token
   ```
3. `@rnmapbox/maps` is native, so rebuild the dev client once: `npm run android` (Windows/Android) or `npm run ios` (macOS, which runs `pod install`). After a token change, restart Metro with `npx expo start --clear`.
4. Start your backend (any database). The map works with gyms that have no floor plans and no machine positions.

## Manual test

1. Open **Equipment**. Behind the panels you see the Mapbox basemap with the UREC building and its Level 1 rooms, tilted in 3D: Fitness on the east side, the pool on the west, lockers between them. Walls stand up, and machines are boxes. The floor fits between the top panel and the sheet's title bar. The Mapbox logo and ⓘ sit just above the title bar, and the **3D** (on) and **Rotate** (off) buttons sit at the top right, under the top panel.
2. The floor tabs show a single **Level 1** tab with the number of machines. The boxes sit in tidy rows in both Fitness rooms, and none are on the central stairs or the partition. No wall runs across the middle of the Fitness area. With the list open, each machine's row says "Level 1", not "Location not mapped".
3. Pinch to zoom: room names appear from about street-block zoom and float above the walls. Tilt with two fingers. Two-finger twisting does nothing while **Rotate** is off. You can't pan far away from the building.
4. Tap a box. It rises, gets a dark ring on the floor, the map focuses on it in the uncovered band, and its card shows in the closed sheet. **View equipment** opens the machine page. Close the card with ✕ and the same tilted view of the whole floor comes back, without zooming far out.
5. Search `bench` (or filter by availability). Non-matching boxes fade, and the Level 1 tab's count drops. Tapping a faded box still opens it. Tap a result in the list and the map focuses on it.
6. Tap **Rotate** (it turns green) and twist the map with two fingers. Tap a box: the focus keeps your rotation. Tap **Rotate** again: the map turns back to north.
7. Tap **3D** to turn it off. The map goes flat and top-down, the walls disappear, and machines are dots again. Tilting does nothing. Tap a dot and repeat step 5 here. Tap **3D** again and the tilted view comes back.
8. Hide and show the top panel: the fitted floor and the two buttons follow the freed space.
9. Live status: in admin, set a machine to In Use. Its box (or dot) changes colour and the map doesn't move.
10. Remove `EXPO_PUBLIC_MAPBOX_TOKEN` from `.env.local` and restart Metro with `--clear`. The tab goes back to the SVG floor map.

Check on a mid-range Android phone that panning in 3D stays smooth. If walls hide too many machines, lower `WALL_H` in `constants/indoorVenue.ts`.

## Automated checks

- `npm test -- __tests__/indoor-map.test.ts __tests__/indoor-map-view.test.tsx __tests__/equipment-tab.test.tsx`:
  - Venue data: unique ids, rooms on a known floor, Fitness zones inside the Fitness rooms and clear of the stairs and partition.
  - Placement: 0/1/95/160 machines inside the zones at least 1.5 m apart, grouped and deterministic.
  - Walls: one wall-thick quad inside each edge for either winding, every wall inside its own room or the outline, unique ids, the partition included, nothing on the open Fitness floor.
  - Boxes: centred and sized right, no two overlapping with 160 machines.
  - Toggles (`@rnmapbox/maps` mocked): starts in 3D facing north; **3D** off gives pitch 0, no walls and dots; **Rotate** on unlocks rotation and keeps it on later fits, off turns back to north.
  - The tab in Mapbox mode: Level 1, no backend floors, search matches and the selection passed to the map.
- Full suite: `npm run lint`, `npx tsc --noEmit`, `npm test -- --runInBand`.

## Platform status

- 3D view and the **3D**/**Rotate** toggles: pending on both platforms (steps 1–9 above).
- Android (2D view, before the toggles): passed on 2026-11-27, Pixel_8_Pro emulator, dev build with `@rnmapbox/maps` 10.3.19 (Maps SDK 11.33; no download token needed), local backend on the Neon dev database (95 machines, no floor plans).
  - Checked steps 1–6: Level 1 on the basemap, 95 dots in both Fitness rooms, tapping a dot, View equipment, closing back to the fit, searching `bench` (12 matches, the rest faded, a list pick centred), and hiding and showing the top panel.
  - Not run: step 7 (admin wasn't started) and step 8 (the no-token fallback, covered by `equipment-tab.test.tsx`).
- iOS: pending (Thanmay). The Podfile got the `@rnmapbox/maps` pre/post-install hooks from the config plugin, but `pod install` and an iOS build haven't run.
