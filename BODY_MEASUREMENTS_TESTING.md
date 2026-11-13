# Profile body measurements

Delivery branch: `feature/member-experience-2026-11-13`. Current integrated preview: http://localhost:8091/profile. Earlier validation below used port 8082.


- Added an optional card directly below the member identity in Profile, with kg/lb and cm/in inputs, explicit Save, inline validation/errors/success, and clearing by saving blank fields.
- Values are stored per username in device/browser AsyncStorage, outside the disposable API cache. They survive sign-out and reload on this device; they are not synced to the backend, other browsers, or other devices. Public profile APIs do not receive these values.
- Weight updates the weekly kcal estimate through the shared account cache. Height is stored for future calculations; it is not an input to the current MET-based formula. Editing weight recalculates displayed historical estimates using the current saved weight.
- Validation: finite weight 20–500 kg, height 50–275 cm; either field may be blank. Failed saves retain draft inputs and do not update shared calculation data.
- Checks: TypeScript passed; lint passed with the same eight unrelated warnings; 20 tests passed across body-measurements, history-calendar and member-screens suites. Tested conversion, storage reload, account isolation, validation, failed save/retry, clearing, and calorie calculation using saved weight.
- Chrome 373 × 728, signed-in local demo account: saved temporary 80 kg/180 cm; reloaded Profile and observed both restored; opened History and observed approximately 50 kcal and “80 kg saved weight” for Nov 8–14. Removed temporary measurements afterward through the form and confirmed save success.
- Manual check: open http://localhost:8082/profile, enter measurements and Save; reload to confirm persistence; open History and check its estimate note uses saved weight. Clear weight and Save to restore the labeled 70 kg fallback. Native iOS/Android keyboard and device checks remain pending.
- Only the app repository changed. No backend/schema/API/dependency changes or production deployment.
