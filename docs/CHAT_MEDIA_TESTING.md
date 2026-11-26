# Testing: chat GIFs, stickers, reactions and reporting (member app)

Branch `chat-gifs-reactions` (same name in the backend and admin repos) changes community chat (League tab → chat button) and DMs (Profile → inbox, or **Message** on someone's profile):
- A **GIF button** in the message bar opens a GIFs | Stickers sheet: trending first, search as you type, more as you scroll, "Powered by KLIPY" at the bottom. Tap one to send it. GIFs show at their own shape; stickers show large, without a bubble.
- The message bar and the picker stay above the keyboard. On Android the app draws edge-to-edge, so the window doesn't shrink for the keyboard: both pad by the keyboard's height instead (`hooks/useKeyboardHeight.ts`). iOS keeps `KeyboardAvoidingView`, now told how far down the window the screen starts.
- **Long press** a message for 👍 ❤️ 😂 🔥 💪 😮 (one per person; tap yours again to remove it), then **Delete message** (yours) or **Report message** (others'). Chips under a message show counts, with yours highlighted, and tapping one toggles it.
- Deleted messages stay as "This message was deleted"; staff removals show "Removed by staff". Both update live.
- Sends show at once as "Sending…". If the server rejects one, the socket is down, or nothing comes back in 10 s, it shows "Not sent · Tap to retry".
- History now opens on the **newest** messages (it used to show the oldest 50) and loads older ones as you scroll up.
- The inbox shows "GIF", "Sticker" or "Message deleted" for those last messages.

No new native modules: `expo-image` was already in the dev client, so no rebuild is needed.

## Automated tests

```bash
npx jest
npx tsc --noEmit
```

Expected: `Tests: 458 passed` (49 suites), and tsc prints nothing. `npm run lint` still reports 4 errors, all in code this branch didn't write: the AI chat screen, and the inbox's empty-state text, which moved from line 70 to 78.

| Test | What it covers |
|---|---|
| `useChatMessages.test.tsx` (16) | Newest page first, older pages when the first was full; live messages added, updates replaced by id, deleted ones keep their place; `onIncoming` only for others' new messages; a DM screen shows only its conversation; a send shows at once and the echo replaces it; GIF/sticker media sent as is; blank text ignored; a server rejection marks it failed and retry keeps the `clientId`; failed at once while offline; failed after 10 s with no echo; discard; after a reconnect it catches up and settles sends saved meanwhile; a load error and reload; unsubscribes on unmount; `upsertMessage` ordering |
| `chat-components.test.tsx` (25) | Bubbles: text with sender names (community only, never mine); GIF at its shape with preview placeholder; sticker large and uncropped; deleted/removed placeholders with no long-press or reactions; sending and failed states, tap to retry; reaction chips with counts and mine highlighted. Picker: trending and the KLIPY credit; debounced search; Stickers tab; picking sends and closes; the next page with no duplicates; "not set up" (503) with Try again; "Nothing found"; nothing loads while hidden; the sheet clears the home indicator / navigation bar and rises above the keyboard (iOS and Android sums). Composer: the GIF button opens the picker. Actions sheet: six reactions with mine marked; Delete only on mine, Report only on others'. Report form: a reason is required, note sent, "Report sent", and errors shown |
| `chat-room.test.tsx` (16) | Whole screens with the API and socket faked: send and settle; sender name opens their profile; react from the sheet; tap my chip to unreact; reaction error message; delete after confirming, nothing on cancel; a sheet action is dropped if the screen closes before the sheet has finished closing (no dialog over the next screen); report and duplicate report; send a picked GIF with its media; on Android the message bar pads by the keyboard's height and drops back when it closes; retry after offline; empty state and load error. DMs: marked read on open and on each incoming message; sends to the partner; reactions on the dm channel |
| `useKeyboardHeight.test.tsx` (3) | Follows `keyboardWillShow`/`WillHide` on iOS and `keyboardDidShow`/`DidHide` on Android (ignoring the other platform's events); stops listening on unmount |
| `chatAPI.test.ts` (6) | History params (`limit`, `before`, URL encoding); reaction, delete and report URLs and bodies (a blank note left out); GIF search URLs; error messages by status |
| `websocketService.test.ts` (+4) | A send returns false while disconnected; payloads carry `clientId`, kind and media (DMs add the recipient); the error queue reaches subscribers, survives a reconnect and unsubscribes; it subscribes straight away when already connected |
| `member-screens.test.tsx` (+1) | Inbox previews for GIF, Sticker and deleted messages |

## Manual checks

Run the backend from this branch with `KLIPY_API_KEY` in its `.env` (see `urec-live-backend/CHAT_MEDIA_TESTING.md`). Then sign in as two members at once, for example `urecuser` on the Android emulator (`./runall.sh --android`) and `urecadmin` in the web build (press `w` in Expo, <http://localhost:8081>).

1. **Newest first.** Open community chat. The latest messages are at the bottom. If there are more than 50, scroll up: a spinner, then older ones.
2. **GIF.** Tap **GIF** in the message bar, search "deadlift", and tap one. It appears at once (faded, "Sending…"), then solid. The other member sees it animate within a second or two, at its own shape.
3. **Sticker.** Switch to Stickers and send one. It's large, with no bubble, transparent where the sticker is.
4. **React.** Long press the other member's message and pick 🔥. A chip "🔥 1" appears, highlighted for you, and on their screen without a refresh. Pick 💪 from the sheet: the chip switches. Tap your chip: it's gone.
5. **Delete.** Long press one of your own messages → Delete message → Delete. Both screens show "This message was deleted". Long pressing it does nothing.
   - On iOS only (the sheet takes 350 ms to close there), long press → Delete message, then swipe back at once. The inbox shows no "Delete message?" dialog, and the message isn't deleted.
6. **Report.** Long press someone else's message → Report message → Spam → Report → "Report sent". Doing it again says you've already reported it. The admin dashboard's **Chat Reports** shows it (see the admin guide). If staff remove it, both screens show "Removed by staff".
7. **Failed send.** Stop the backend, send a message: "Not connected · Tap to retry" (or "Not sent" after 10 s). Start the backend again, wait for the app to reconnect (about 5 s), and tap it: it sends once.
8. **DM.** Open the other member's profile → Message, and send a GIF. Their inbox shows "GIF" with a GIF icon and the unread dot. Opening the conversation clears the dot, and messages that arrive while it's open don't bring it back.
9. **No key.** Without `KLIPY_API_KEY`, the picker says "GIFs aren't set up on the server yet." Text, reactions, delete and report still work.
10. **Keyboard** (Android emulator, and an iPhone if you have one). Tap the message box: the whole message bar (box, **GIF**, send) sits right on top of the keyboard, and the newest message is just above it. Close the keyboard: the bar goes back to the bottom, above the gesture bar. Open the picker and tap its search box: the sheet rises so its tabs, search box, a couple of rows of GIFs and "Powered by KLIPY" are above the keyboard. With the keyboard closed, "Powered by KLIPY" is clear of the gesture bar. Do the same in a DM.
