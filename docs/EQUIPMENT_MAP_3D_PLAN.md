# Handoff plan: 3D Mapbox indoor map (Level 1)

Branch: `feature/equipment-map-3d`, forked from `feature/equipment-maps-and-workout-tracking` at e51bd46 ("Mapbox indoor map for Level 1"). App repo only. No backend, admin or native changes.

## Goal

Turn the 2D Mapbox indoor map on the Equipment tab into the 3D view from Mapbox's custom indoor example: walls extruded to about 2.5 m, a camera tilted about 50°, and machines drawn as small status-coloured boxes. Everything else on the tab stays the same: search, floor tabs, the selection card, the panels, and the SVG fallback when no token is set.

Out of scope: navigation and routes, real machine positions, more floors or gyms, doors, and 3D machine models.

## Where things are today

- `constants/indoorVenue.ts` holds Level 1 in Mapbox's custom indoor schema (facility > structure > floor > room, with `floor_id`). Rooms are rings in local metres (x east, y south) and are converted with `toLngLat`. `OUTLINE` and `ROOMS` aren't exported. Room `class` values are `strength` (the two Fitness rooms), `pool`, `amenity`, `studio`, `stairs`, `elevator`, `wall` (the Fitness partition) and `room`.
- `utils/indoorPlacement.ts` exports `placeEquipment(machines)`, which returns `{ machine, at }`, where `at` is a point in metres inside `FITNESS_ZONES`. Points are at least 1.5 m apart, even with 160 machines.
- `components/equipment/IndoorMap.tsx` contains:
  - `MapView` with the Mapbox Standard style, `show3dObjects: false`, and pitch and rotation turned off.
  - A `Camera` that fits bounds: the venue, or ±12 m around the selected machine.
  - Flat room fills, outlines and labels.
  - One `CircleLayer` of machine dots. Each dot has the feature properties `color`, `dim` and `selected`.
- `app/(tabs)/equipment.tsx` renders `IndoorMap` when `EXPO_PUBLIC_MAPBOX_TOKEN` is set.
- Read the "Mapbox indoor map" bullet in `CLAUDE.md` and `MAPBOX_INDOOR_MAP_TESTING.md` first.

## Facts already checked in `@rnmapbox/maps` 10.3.19

- `FillExtrusionLayer` is in the installed package, so this is a JS-only change. The current Mapbox dev build works; reload Metro, no native rebuild.
- `fillExtrusionOpacity` can't depend on a feature, only on zoom. Dimming non-matching machines therefore needs two layers: one filtered on `dim == false` and one on `dim == true` with low opacity. `fillExtrusionHeight` and `fillExtrusionColor` can use feature properties.
- Bounds fits keep pitch and heading on both platforms (Android `CameraStop.kt`, iOS `RNMBXCamera.swift`). If the `Camera` gets a `pitch` prop, every fit uses it. If `heading` isn't set, the current rotation is kept.
- Keep the existing gotcha: on Android, a bounds fit adds the map's leftover padding. So the focus view must stay a bounds fit; don't switch it to a centre-and-zoom stop.
- `ShapeSource` `onPress` has a 44×44 pt hitbox by default, which makes small boxes tappable.
- `symbolZOffset` and `symbolZElevate` exist, so labels can sit above the walls.
- There is no clip layer, so keep `show3dObjects: false`. Otherwise Standard's own 3D building would cover the floor.

## Changes

### 1. Walls: `constants/indoorVenue.ts`

- Add `wallQuads(ring, thickness)`. It returns one quad per edge of a ring, offset **inward** (towards the polygon's inside) by the wall thickness, for either winding.
  - Inward offsets keep the walls of two rooms that share an edge side by side instead of overlapping, which avoids z-fighting.
  - Corner overlaps and notches of 0.2 m are acceptable.
- Export `INDOOR_WALLS` (a FeatureCollection, properties `floor_id` and `id`), built from:
  - `OUTLINE`: the outside walls.
  - Every room except class `strength`. The Fitness rooms are open floor, so the boundary between north and south gets no wall. Their sides still get walls from the neighbouring rooms and the outline.
  - The `wall` partition: use its polygon as it is, not its edges.
- Constants: `WALL_M = 0.2` (thickness) and `WALL_H = 2.5` (height). Tune the height on a device if walls hide too many machines.

Sketch, to be checked by the test rather than trusted:

```ts
const area2 = ring.reduce((s, [x0, y0], i) => {
  const [x1, y1] = ring[(i + 1) % ring.length];
  return s + x0 * y1 - x1 * y0;
}, 0);
// Edge normal (-dy, dx) scaled by sign(area2) * t; flip it if the test shows the quads point outward.
```

### 2. Machine footprints: `utils/indoorPlacement.ts`

- Add `footprint([x, y], size = 1)`, which returns a square ring in metres centred on a placed point. A 1 m box leaves at least 0.5 m between machines at the tested 1.5 m spacing.

### 3. `components/equipment/IndoorMap.tsx`

- Camera:
  - `MapView`: allow tilt and rotation (`pitchEnabled` and `rotateEnabled`) and turn on `compassEnabled` (it's off by default) so users can reset north.
  - `Camera`: add `pitch={50}`. Leave `heading` unset so a focus doesn't undo the user's rotation. Keep `bounds`, `padding` and `maxBounds` as they are.
- Walls: add a new `ShapeSource` `indoor-walls` with `shape={INDOOR_WALLS}`. Inside it, a `FillExtrusionLayer`:
  - filtered on `onFloor`
  - `fillExtrusionHeight: WALL_H` and `fillExtrusionBase: 0`
  - colour `#C9D2CC`, opacity about 0.85
  - `fillExtrusionAmbientOcclusionIntensity` about 0.3 for depth
- Don't extrude a floor slab. A slab from 0 to 0.2 m would hide the flat room fills, which stay as they are.
- Labels: add `symbolZOffset: WALL_H + 0.3` to `indoor-labels` so room names float above the walls.
- Equipment: replace the `CircleLayer` with:
  - The `equipment` collection as polygon features (`footprint(at)` through `toLngLat`), with the same properties (`id`, `floor_id`, `color`, `dim`, `selected`).
  - `equipment-boxes`, a `FillExtrusionLayer` filtered on `onFloor` and `dim == false`:
    - colour from `["get","color"]`
    - height `["case", ["==", ["get","selected"], true], 1.8, 1]`, with a short `fillExtrusionHeightTransition`
  - `equipment-boxes-dim`: the same layer filtered on `dim == true`, with `fillExtrusionOpacity` 0.3.
  - `equipment-selected`: a ground ring. It's a `CircleLayer` filtered on `selected == true`:
    - `circlePitchAlignment: "map"`
    - transparent fill
    - stroke `#16382A`, 3 px
    - radius grows with zoom, as the dots do now
- Leave unchanged: the `onPress` lookup by `properties.id`, the memoised `focus` and `padding`, and the floor filters.

### 4. Tests: `__tests__/indoor-map.test.ts`

- `wallQuads`:
  - a square gives 4 quads
  - each quad's centre lies inside the room
  - each quad is `WALL_M` thick
  - clockwise and anticlockwise rings give the same quads
- `INDOOR_WALLS`:
  - ids are unique
  - every feature is on a known floor
  - no wall crosses the open floor between the two Fitness rooms: no quad centre inside `FITNESS_ZONES`
  - the partition is included
- `footprint`:
  - the square is centred on the point and the right size
  - with 160 placed machines, no two footprints overlap
- `equipment-tab.test.tsx` mocks `IndoorMap`, so it shouldn't change. The rnmapbox ESM can't load in Jest; keep geometry in plain functions so it stays testable.

### 5. Docs

- `MAPBOX_INDOOR_MAP_TESTING.md`: change "2D top-down" to the 3D view and add the device steps below.
- `CLAUDE.md` map bullet: one line on walls (`INDOOR_WALLS`), boxes, and why dimming uses two layers.
- Privacy site: nothing to change. No new data leaves the device.

## Manual test (add to the testing guide)

1. With a token set, open **Equipment**. The floor is tilted. The walls stand up and the machines are boxes in the two Fitness rooms. The floor fits between the top panel and the sheet's title bar.
2. Room names float above the walls. No wall runs across the middle of the Fitness area.
3. Tilt with two fingers and rotate. The compass appears, and tapping it turns the map back to north.
4. Tap a box. It rises, gets a dark ring on the floor, and the map focuses on it. Close the card and the same tilted view of the whole floor comes back, without zooming far out.
5. Search `bench`. The other boxes fade, and tapping a faded box still opens it.
6. In admin, set a machine to In Use. Its box changes colour and the camera doesn't move.
7. Hide and show the top panel. The fit follows.
8. Remove the token and restart Metro with `--clear`. The SVG floor map is back.

Check on a mid-range Android phone that panning stays smooth.

## Done means

- Run `npm run lint`, `npx tsc --noEmit` and `npm test -- --runInBand`. All must be green.
- Run the manual test on Android and update the platform status in the testing guide. iOS stays pending until someone runs it on a Mac.
- Commit with a `Manual test:` section, and mark it `[testing needed]` until the feature owner confirms device testing. Don't merge into the parent branch or main without the owner.
- Handoff: say which services you restarted from the branch and that the backend answers `GET /api/auth/test`.

## Open questions for the feature owner

Both answered on 2026-11-27 and implemented:

1. Add a 2D/3D button. A **3D** toggle (on by default) chooses between this setup and `pitch={0}` with the circle dots.
2. Make rotation optional. A **Rotate** toggle (off by default) replaces the compass; turning it off turns the map back to north.

## Risks

- 3D makes the hand-traced floor plan look more exact than it is, and there are no doors, so walls are solid.
- Walls nearest the camera can hide machines behind them. Tune `WALL_H` and the opacity on a device.
- Mapbox's custom indoor support is still experimental.
