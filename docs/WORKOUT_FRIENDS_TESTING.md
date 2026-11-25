# Workout friends

Use a native development build and a local PostgreSQL-backed backend with the workout friends API. Create two regular member accounts and sign in on separate devices or simulators. Use the local backend origin for your device. The friends API is additive and needs the backend change before the new screen is available.

1. Open Workout as the first member. Add the second member by username. The second account should see a pending request and be able to accept it.
2. Accept the request. Progress is private until the second member enables sharing. Enable it, change the target, and finish two logged exercises on one day. The first member should see one workout day and the updated target after the Friends section refreshes.
3. Send a nudge using **Surprise me**, then edit the draft and tap **Send nudge**. The recipient should see the edited text in their DM. The sender can nudge the same friend again after 24 hours.
4. Turn off sharing and verify progress is hidden. Remove the friend and verify the friendship disappears for both accounts.

## Native push

Use an Expo development build for the existing EAS project. Android needs a Firebase app for the native package, the local `android/app/google-services.json` file, and an FCM v1 credential configured for that EAS project. iOS needs an APNs push key and a push-enabled provisioning profile. Rebuild the native app after configuring the providers. If enhanced push security is enabled in Expo, set `EXPO_PUSH_ACCESS_TOKEN` on the backend. Keep provider credentials out of Git.

On the recipient device, enable **Workout nudge notifications** and allow the OS permission. Background the app, send a nudge from the other account, and tap the notification. It should open the sender's DM. The lock-screen preview uses generic text. Repeat with device notifications disabled to verify that the DM still arrives. Test Android and iOS separately.
