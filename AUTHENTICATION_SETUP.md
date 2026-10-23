# Mobile Authentication Setup

The mobile client uses the shared Axios instance in `services/authAPI.ts`, `AuthContext`, JWT access/refresh tokens, and AsyncStorage.

## Setup

```bash
npm ci
npm start
```

The backend must be running. Do not edit individual API files to change hosts. `services/networkConfig.ts` is the single source of truth:

```bash
EXPO_PUBLIC_BACKEND_ORIGIN=http://localhost:8080 npm start
```

Use an origin only—no trailing `/api` or `/ws`. iOS Simulator and local web default to localhost; Android Emulator defaults to `10.0.2.2`; physical devices need an origin reachable from the device.

## Flow

1. Register or log in through `/api/auth/*`.
2. Store the returned access token, refresh token, and user in AsyncStorage.
3. The request interceptor adds the access token to protected requests.
4. On a 401, the response interceptor calls `POST /api/auth/refresh`, stores both returned tokens, and retries the original request once.
5. If refresh fails, the shared auth-failure handler clears stored auth and returns the app to signed-out state.

## Implementation locations

- `app/(auth)/login.tsx`
- `contexts/AuthContext.tsx`
- `services/authAPI.ts`
- `services/networkConfig.ts`

## Checks

- Register and sign in with a development account.
- Restart the app and confirm the session restores.
- Call a protected endpoint and confirm the Bearer token is attached.
- Exercise the refresh failure path and confirm tokens/user are cleared.
- Validate iOS, Android, and web separately when they are in scope.

AsyncStorage is persistent but not encrypted secure storage. Reassess the storage mechanism and HTTPS/network policy before a production security release.
