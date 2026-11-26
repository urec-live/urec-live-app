# Google sign-in setup

UREC Live uses the same web flow as Spotter: Google Identity Services returns an ID token to the Expo web app, and the Spring Boot backend verifies the token before issuing UREC Live access and refresh tokens.

## Google Cloud

1. In Google Cloud Console, configure the OAuth consent screen for an external app.
2. Create an **OAuth 2.0 Client ID** with application type **Web application**.
3. Add each exact frontend origin under **Authorized JavaScript origins**. Origins do not include a path or trailing slash. Typical values are:
   - `http://localhost:8081` for local Expo web development (use the actual port Expo prints)
   - `https://urec-live-app.onrender.com` for the deployed web app
4. While the consent screen is in Testing, add each tester as a test user.

This popup-based flow does not use an authorized redirect URI.

## Environment variables

Use the same Web client ID in both services:

- Expo web build: `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- Spring Boot backend: `GOOGLE_CLIENT_ID`

The client ID is public configuration. Do not create, commit, or expose a client secret for this flow.

After changing the frontend value, rebuild/redeploy the Expo web app because `EXPO_PUBLIC_*` values are embedded at build time. Restart/redeploy the backend after changing its value.

## Manual check

1. Open the frontend in a signed-out or private browser session.
2. Confirm the login screen appears and select **Continue with Google**.
3. Complete Google account selection.
4. Confirm UREC Live opens the member tabs and Profile shows the Google account email.
5. Log out, sign in with the same Google account again, and confirm the same UREC Live profile is restored rather than a duplicate account being created.
