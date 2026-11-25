# Testing: chat photos (member app)

Branch `chat-photos` (same name in the backend and admin repos) starts from `main`, which already has the GIF, sticker and reaction work. It adds photos to community chat and DMs:
- A **📷 button** at the left of the message bar opens **Take photo** / **Choose from library**. A preview follows, with an optional caption (up to 500 characters) and Send.
- Before upload, the photo is resized to at most 1600 px on its long edge and saved as JPEG at quality 0.75 (`utils/chatPhotos.ts`). The server re-encodes it again and strips EXIF and GPS data.
- The bubble shows the photo at once from the local file, with a percentage while it uploads, then "Sending…" until the server echoes it. If the **upload** fails, "Tap to retry" uploads it again. If only the **send** failed (offline, no echo within 10 s, or a server rejection), retrying sends the same `clientId` and `mediaId` without uploading again. The server can't save it twice.
- Photos show at their own shape (up to 240 x 300), with the caption under them in the bubble. **Tap** opens them full screen; **long press** reacts, deletes or reports as with other messages.
- Photo URLs expire and change on every fetch, so `expo-image` caches each photo by `chat-media-<id>` and doesn't download it again. A photo that can't load (an expired link, or one the server couldn't sign) shows "Photo unavailable".
- The DM inbox shows a camera icon and "Photo".

## Rebuild the dev client (new native modules)

`expo-image-picker` and `expo-image-manipulator` are native modules, so the development build on each emulator, simulator or device has to be rebuilt once. From this repository, after `npm ci`:

```bash
npm run android                # Windows / Android
npm run ios                    # macOS / iOS
```

- `app.json` now configures the image picker's permission strings.
- You don't need `npx expo prebuild` for Android. The camera permission is already in `android/app/src/main/AndroidManifest.xml`, and the system photo picker needs no permission. The two modules link through autolinking at build time.
- If you do run `npx expo prebuild --platform android --clean` anyway, run `git status` first. `android/` is tracked, and prebuild would overwrite any local changes there (see `TEAM_WORKFLOW.md`).
- iOS: `ios/urecliveapp/Info.plist` now has the photo library string (`NSPhotoLibraryUsageDescription`) and the new camera string, matching `app.json`.

## Privacy page

`privacy-site/build.py` (and the pages it generates under `privacy-site/public/`) now covers chat photos: the camera and photo picker, what is uploaded, metadata removal, storage (app servers or Cloudflare R2), expiring links, staff access to reported photos, deleted photos kept for moderation, and photos in account deletion. To read the committed pages, run `python3 -m http.server 4173 --directory privacy-site/public --bind 127.0.0.1` and open <http://127.0.0.1:4173/privacy/>. Don't use `build.py --preview` for this: it rewrites the committed pages as drafts. After editing `build.py`, regenerate with `python3 build.py` from `privacy-site/`. On Windows use `python -X utf8 build.py`; without UTF-8 mode, Python writes the pages' curly apostrophes in the Windows code page. Before release, add photos to the Play Data safety form so it matches.

## Automated tests

```bash
npx jest
npx tsc --noEmit
```

Expected: `Tests: 491 passed` (52 suites), and tsc prints nothing.

| Test | What it covers |
|---|---|
| `chatPhotos.test.ts` (9) | **Picking**, with the picker and manipulator faked. The camera asks for permission first and stops with `PhotoPermissionError` if refused; a cancelled camera gives null. The library asks for nothing. 4000x3000 is resized by width and 3000x4000 by height to 1600; 800x600 isn't resized; all are saved as JPEG at 0.75. **Upload:** posts `/messaging/media` as multipart (`{uri, name, type}`) with a 60 s timeout and the abort signal, and reports progress as a fraction. Error labels for 413, 415, 400, 429, 401, 503, offline and others. **Helpers:** relative URLs resolve against the backend while R2 and file URLs stay as they are; the cache key is by `mediaId`; sizes fit 240 x 300 |
| `useChatMessages-photos.test.tsx` (9) | A photo shows at once from the local file with progress 0, then 0.4. Once uploaded it's sent as `{kind: "IMAGE", content: <trimmed caption>, media: {mediaId}}`, and the echo settles it, keeping the local file for the bubble. No caption is sent as `""`. A failed upload (413, "Photo too large") sends nothing, and retry uploads again with the same `clientId`. A failed send retries the same payload without uploading. After `MEDIA_IN_USE` a retry just resends; after `INVALID_MEDIA` it uploads again. The 10 s echo timeout doesn't run during the upload. Discarding or leaving the room aborts the upload, and nothing is sent when it finishes later. DM photos go to the partner |
| `chat-photos.test.tsx` (15) | **Bubble:** the resolved URL with `cacheKey: chat-media-<id>`, sized to its shape, with the caption and the sender. Tap opens it; long press opens the actions. R2 URLs are used as is. While uploading: the local file, "Uploading photo, 42%", and tapping doesn't open it. A sent photo of mine has the local file as its placeholder. A failed one taps to retry, not open. "Photo unavailable" with no URL or after a load error, and a fresh URL tries again. Deleted and removed photos are placeholders. **Sheets:** camera and library choices; the preview trims the caption, caps it at 500 and clears it for the next photo; the viewer uses the same cache key and closes. **Whole screen:** 📷 → library → preview → caption → Send uploads and sends an IMAGE message. Tapping a photo in history opens the viewer. Camera access off shows a notice. Backing out of the picker does nothing. **Inbox:** camera icon and "Photo" |

## Manual test (Android emulator; then a phone if you can)

Prerequisites: the backend from its `chat-photos` branch (local storage is fine, see the backend repository's `CHAT_PHOTOS_TESTING.md`), the development build rebuilt as above, and two member accounts on your development database, signed in on two native clients at once: for example the Android emulator and a phone, or a second emulator. For the moderation step, an admin account and the admin dashboard.

1. **Library photo with caption.** Community chat → 📷 → **Choose from library**. The emulator has a few photos; to add your own, drag a JPEG onto the emulator window. Pick one: the preview opens. Type "leg day", tap Send. The bubble shows at once with a percentage, then "Sending…", then settles. The other device shows it within a second or two, with the caption.
2. **Camera.** 📷 → **Take photo**. The first time, Android asks for camera access; allow it. The emulator's virtual scene camera works. Send without a caption: the photo shows with no caption bubble.
3. **Upright.** On a phone, take a portrait photo with the camera app, then send it from the library. It shows upright, in the bubble and on the other device.
4. **Full screen.** Tap a photo: it opens full screen with the sender and caption. Close it. Reopening the chat doesn't re-download photos you've seen (they're cached by id); the URL in history changes each time, and that's expected.
5. **Long press** a photo: react 🔥 (the chip shows on both devices), then Delete it from the sender's side. Both show "This message was deleted".
6. **Report and moderate.** Send a captioned photo as one member and report it from the other. In the admin dashboard → **Chat Reports**, the photo and its caption show; click the photo to open it full size. **Remove** turns it into "Removed by staff" on both devices.
7. **Upload failure and retry.** Turn on airplane mode (or stop the backend), send a photo: after a moment it says "No connection · Tap to retry". Turn the network back on (or start the backend) and tap it: it uploads again and sends.
8. **Send failure and retry** (optional; `useChatMessages-photos.test.tsx` covers it). Here the upload works but the send doesn't, and the gap between them is a fraction of a second, so it's hard to hit by hand. To try: send a large photo and turn on airplane mode right as the percentage reaches 100%. If you catch it, it ends with "Not sent · Tap to retry". Tapping it after the network is back sends it without a second upload (the backend log shows one `POST /api/messaging/media`), and only one copy appears. If you're a moment late, you get the upload failure from step 7 instead.
9. **Camera access off.** Android Settings → Apps → urec-live-app → Permissions → Camera → Don't allow. 📷 → Take photo: the chat says "Allow camera access in Settings to take photos."
10. **DM inbox.** Send a photo in a DM. The other member's inbox row shows a camera icon and "Photo".
11. **iOS** (macOS only; hand it over if you're on Windows). Repeat steps 1, 2 and 9 on the iOS Simulator or an iPhone. The first library or camera use shows the permission text from `app.json`.

If photos show "Photo unavailable" in local mode, check the backend origin the app uses (`EXPO_PUBLIC_BACKEND_ORIGIN` in `.env.local`, otherwise the defaults in `services/networkConfig.ts`; see `TEAM_WORKFLOW.md`). The app adds that origin to the server's relative photo URLs, so it must be reachable from the device.
