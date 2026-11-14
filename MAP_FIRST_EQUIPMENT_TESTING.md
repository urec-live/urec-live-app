# Map-first Equipment screen

Branch: `feature/map-first-equipment`, based on the existing member-experience branch at `61188a7`.

The floor map stays mounted while a member searches, opens results, or selects equipment. Search and filters highlight matching pins. Selecting a result switches to its mapped floor. Mobile results have a draggable, keyboard-accessible sheet; desktop results stay in a sidebar. Floor fitting, zoom, live availability, saved-data notices, and QR check-in/reporting remain available.

QR results now offer **Show on gym map**. This resolves the machine code to its stable equipment ID and selects it on the correct floor, without checking in. Failed lookups keep the scan for retry; abandoned lookups cannot navigate after a new scan or after leaving the screen. This highlights a known machine, not a continuously tracked user position.

No Google Maps account, location permission, new dependency, backend change, or migration is required. The local demo floor plans remain visibly marked as illustrative and fictional.

## Local review

- App: http://localhost:8091/equipment
- Existing isolated demo backend: http://localhost:8080/api/auth/test
- Demo member: `mapmember` / `MapDemo2026!` (fixture credentials, only for the opt-in local `map-demo` profile).
- The app runs with `EXPO_PUBLIC_BACKEND_ORIGIN=http://localhost:8080`.

1. Sign in with the local demo member and open Equipment. Expect Ground, live status, a visible floor map, the side floor selector, and a collapsed results sheet.
2. Drag the sheet handle up/down, or activate Expand/Collapse results with the keyboard. Expect a scrolling list without losing the map's floor or camera position.
3. Search `treadmill`. Ground should stay selected until choosing a result. Press Enter to expand results; select Treadmill 1. Expect Level 4, a highlighted pin, its availability, and View equipment. That action should open its machine details.
4. Combine muscle, availability, and area filters. Expect pins, counts, and rows to agree. Search an unknown name, expand results, then Clear filters. Expect an empty-state explanation followed by restored results.
5. Switch floors, zoom, and Fit. Repeat on a desktop-width browser; expect a sidebar beside the map.
6. On a camera-capable device, scan a local machine QR and choose Show on gym map. Expect the mapped machine selection without a check-in or occupancy change. Check camera denial, scan retry, unknown codes, and returning to the previous screen.

## Evidence (2026-11-13)

- TypeScript: `npx tsc --noEmit` passed.
- Repository lint: `npm run lint` passed with seven existing warnings in unchanged files.
- Focused Jest: `npm test -- --runInBand __tests__/equipment-tab.test.tsx __tests__/equipment-map.test.ts __tests__/equipment-list.test.tsx __tests__/scan.test.tsx` passed, 4 suites / 21 tests.
- `npx expo export --platform web --output-dir /tmp/urec-map-first-web` passed.
- Local demo smoke: `UREC_MAP_SMOKE_ORIGIN=http://localhost:8080 node scripts/smoke-equipment-map.cjs` passed for 160 machines and all five tested WebSocket status transitions.
- Chrome desktop and 373 × 728 responsive mode: rendered map/sidebar, search across floors, selected-machine details, sheet dragging both ways, empty search and recovery verified. Final preview was opened after restarting Expo from this branch.
- Native iOS/Android builds, native gesture feel, physical camera scanning, and production deployment remain unverified. QR-to-map navigation and failure/retry behavior have automated coverage.

Changes are local and uncommitted. No push, merge, or deployment was performed.
