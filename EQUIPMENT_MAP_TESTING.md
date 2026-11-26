# Equipment map: local handoff

Repositories: app, backend and admin, each on `feature/member-experience-2026-11-13`. Existing unrelated workout/history edits are preserved. No deployment or shared-database seed is required.

## Run the isolated demo

Backend (from `backend/`, JDK 21):

```sh
bash scripts/run-local-standalone.sh \
  --spring.profiles.active=test,map-demo \
  '--spring.datasource.url=jdbc:h2:file:/tmp/urec-map-demo;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH;DB_CLOSE_DELAY=-1' \
  --spring.jpa.hibernate.ddl-auto=update --server.port=8080
```

This developer launcher includes test-scope H2. It never sources `.env`. The `map-demo` profile refuses remote database URLs or an existing non-illustrative UREC floor plan, creates four illustrative floors and 160 equipment instances, and preserves existing demo edits on subsequent starts. It excludes the older generic equipment initializer. Fictional positions are labeled in the app.

Member app (from `app/`):

```sh
EXPO_PUBLIC_BACKEND_ORIGIN=http://localhost:8080 npm run web -- --port 8091
```

Admin (from `admin/`): `npm start -- --host 127.0.0.1 --port 4200`.

Local demo accounts only: `mapmember` and `mapadmin`, password `MapDemo2026!`. Both are connected to UREC. These accounts are created only by the explicit local demo profile.

- Member: http://localhost:8091/equipment
- Admin: http://localhost:4200/floor-map
- API health: http://localhost:8080/api/auth/test

## Focused manual acceptance

1. Sign in as mapmember. Equipment starts on Ground and shows four floor choices, availability, rooms and positioned machines.
2. Search `running`: Ground stays selected, Level 4 shows matches. Select Treadmill 1: the map changes floor, focuses the marker and shows its details. View equipment opens the existing machine page. Return to Equipment.
3. Combine an exercise search, muscle, availability and area filters. Clear filters restores all results. Search `pool` and select the facility. Equipment-only filters exclude place results.
4. Zoom with buttons, wheel/trackpad, and drag within the map. Fit restores the whole floor. On native, test one-finger pan and focal pinch zoom separately. Status changes must not reset the viewport or selected floor.
5. Run `node scripts/smoke-equipment-map.cjs` from app. It signs into two local demo sessions and checks Available, In Use, Reserved, Out of Order and return-to-Available broadcasts against API snapshots. To observe the UI, use admin Equipment to change Treadmill 1 while it is selected in the member app; row, marker and detail update together.
6. Admin Floor Map: Rooms & places → select a room → rename/drag/resize → Save layout. Reopen/Refresh Equipment and confirm the update. Create a polygon, move a vertex, edit its numerical coordinates and save. Invalid/out-of-bounds layouts retain the draft and show an error.
7. Edit without saving, then select another floor or navigate away: Cancel keeps the draft; Confirm discards it. Equipment positions save separately. Move a machine and save positions; member Refresh shows its new placement.
8. At 373×728 and 390×844 browser sizes, results and tab controls stay reachable. Expand the results header to use the full content area, select a result to return to the map, and use List for a map-free view. Selected details appear in the lower panel on phones.
9. Disconnect/reconnect the backend: cached equipment remains visible with a saved-copy indicator; reconnect fetches missed changes before showing Live. Switch gyms: search, selection and floor reset, and no prior-gym equipment appears. Without a gym, direct navigation shows a Choose gym action.
10. Missing coordinates produce “Location not mapped” in results; a virtual floor (ID 0) never fabricates positions. Older floor responses without layout metadata still show valid positioned equipment.

## Automated checks

- App: `npm run lint`, `npx tsc --noEmit`, `npm test -- --runInBand`.
- Backend: `mvn clean verify` under JDK 21. New integration tests cover JSON persistence, validation, authorization, cross-gym placement, atomic position updates, and repeatable seeding.
- Admin: `npm run build`; `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/features/floor-map/floor-layout-editor.component.spec.ts`.

Recorded validation and pending native checks are in the implementation handoff. Browser phone emulation is not proof of native gesture behavior.

## Recorded results — November 13, 2026

- Full app Jest run: 58 suites, 492 tests passed. TypeScript passed; lint has zero errors and seven existing warnings in unrelated workout/progress/tracker files.
- JDK 21 `mvn clean verify`: 334 tests, zero failures/errors, three existing skipped tests.
- Admin production build passed (existing bundle/CommonJS warnings). Four focused editor tests passed in ChromeHeadless 157 on macOS.
- Browser: Equipment route verified on desktop and at 373×728; search preserves floor, cross-floor selection focuses equipment, details and controls remain reachable, and expanded results return to the map on selection. Staff room renaming persisted across reload; unsaved floor-switch warning verified.
- Two authenticated local sessions verified five availability transitions through member WebSocket events and API snapshots. Local services were restarted from the changed branches for handoff.
- Native iOS gesture validation remains pending: the simulator service/device is present, but the Simulator GUI application is unavailable in the installed Xcode layout. Android emulator/device validation is pending. Browser phone emulation and TypeScript are not native gesture proof.
- Layout persistence was exercised on local H2 in PostgreSQL mode. The JSONB migration has not been applied to a shared PostgreSQL database; production deployment was not performed.
