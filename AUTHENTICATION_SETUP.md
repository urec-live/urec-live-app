# UREC Live App - Frontend Authentication Setup

This document describes the frontend implementation for authentication with the backend.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

This will install the required packages including:
- `axios` - HTTP client for API requests
- `@react-native-async-storage/async-storage` - Persistent storage for tokens

### 2. Backend Configuration

Update the API base URL in `services/authAPI.ts` to point to your backend:

```typescript
const API_BASE_URL = 'http://localhost:8080/api';
```

For production, update this to your production backend URL:
```typescript
const API_BASE_URL = 'https://api.production.com/api';
```

### 3. Run the App

```bash
# Start the development server
npm start

# For iOS
npm run ios

# For Android
npm run android

# For Web
npm run web
```

## Project Structure

```
app/
├── (auth)/
│   └── login.tsx              # Login and registration screen
├── (tabs)/
│   └── ...                    # Other app screens
└── _layout.tsx

services/
└── authAPI.ts                 # API client with JWT interceptors

contexts/
└── AuthContext.tsx            # Auth state management
```

## Features

### Authentication Flow

1. **Registration**
   - User enters username, email, and password
   - Calls `/api/auth/register` endpoint
   - Stores access and refresh tokens in AsyncStorage
   - Redirects to app home

2. **Login**
   - User enters username and password
   - Calls `/api/auth/login` endpoint
   - Stores tokens in AsyncStorage
   - Redirects to app home

3. **Token Refresh**
   - Automatically triggered when access token expires
   - Calls `/api/auth/refresh` with refresh token
   - Updates both tokens in storage
   - Retries original request with new token

4. **Logout**
   - Clears all tokens from AsyncStorage
   - Resets auth state
   - Redirects to login screen

### API Client (`authAPI.ts`)

The API client includes:

**Request Interceptor**
- Automatically adds JWT token to Authorization header
- Format: `Bearer <access_token>`

**Response Interceptor**
- Handles 401 (Unauthorized) responses
- Automatically attempts token refresh
- Retries failed request with new token
- Redirects to login if refresh fails

**Auth Methods**

```typescript
authAPI.register(username, email, password)
authAPI.login(username, password)
authAPI.refreshToken(refreshToken)
authAPI.test()
```

### Auth Context

The AuthContext provides:

```typescript
{
  user: { username, email } | null,           // Current user
  loading: boolean,                           // Loading state
  isSignedIn: boolean,                        // Auth status
  signIn: (username, password) => Promise,    // Login function
  signUp: (username, email, password) => Promise,  // Register function
  signOut: () => Promise,                     // Logout function
  restoreToken: () => Promise                 // Restore session on app start
}
```

### Login Screen (`app/(auth)/login.tsx`)

- Toggle between login and registration modes
- Form validation
- Loading indicator during API calls
- Error alerts with meaningful messages
- Stores user data and tokens on success

## Storage

Tokens and user data are stored in AsyncStorage:

```typescript
// Stored items:
AsyncStorage.getItem('accessToken')    // JWT access token
AsyncStorage.getItem('refreshToken')   // JWT refresh token
AsyncStorage.getItem('user')           // User info (JSON)
```

## Handling Authentication Errors

### Common Errors

1. **Invalid Credentials**
   - Response: 401 Unauthorized
   - Displayed as: "Login Failed - Invalid credentials"

2. **User Already Exists**
   - Response: 400 Bad Request
   - Displayed as: "Registration Failed - User already exists"

3. **Network Error**
   - Handled by axios interceptor
   - Retries token refresh if available

4. **Expired Refresh Token**
   - Clears storage
   - Redirects to login screen

## API Response Format

### Success Response (200/201)
```json
{
  "accessToken": "eyJhbGciOiJIUzUxMiJ9...",
  "refreshToken": "eyJhbGciOiJIUzUxMiJ9...",
  "username": "user@example.com",
  "email": "user@example.com"
}
```

### Error Response
```json
{
  "message": "Invalid username or password",
  "status": 401
}
```

## Using Protected Endpoints

To make authenticated API calls:

```typescript
import api from '../services/authAPI';

// The token is automatically added
const response = await api.get('/protected-endpoint');
```

## Security Best Practices

1. **Never store sensitive data** in plain text
2. **Use HTTPS** in production
3. **Refresh tokens regularly** - Set appropriate expiration times
4. **Validate inputs** on both client and server
5. **Handle errors gracefully** - Don't expose internal details
6. **Use secure storage** - Consider encrypted storage libraries for production

## Testing

### Test Registration
```
1. Go to login screen
2. Click "Don't have an account? Register"
3. Enter unique username, email, and password
4. Click Register
5. Should see success alert and redirect to app
```

### Test Login
```
1. Enter registered username and password
2. Click Login
3. Should authenticate and redirect to app
4. User info stored in context
```

### Test Token Refresh
```
1. Make an authenticated request
2. Wait for token to expire (or manually expire for testing)
3. App should automatically refresh token
4. Request should succeed without user intervention
```

## Troubleshooting

### "Failed to connect to backend"
- Ensure backend is running at configured URL
- For Android emulator: Use `10.0.2.2` instead of `localhost`
- For iOS simulator: Use `localhost` or machine IP
- Check CORS settings on backend

### "Token not being sent"
- Verify token is stored in AsyncStorage
- Check Authorization header format: `Bearer <token>`
- Ensure authAPI is being used for requests

### "Getting logged out randomly"
- Check token expiration times
- Verify refresh token is being stored
- Check for errors in API responses

### "Registration/Login not working"
- Verify backend validation rules
- Check email format and uniqueness
- Ensure password meets requirements
- Look for detailed error messages in network tab

## Environment Variables

For production, consider using environment variables:

```typescript
// .env or similar
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
```

Then load with appropriate package (e.g., `react-native-dotenv` or `expo-env`).

## Additional Resources

- [Axios Documentation](https://axios-http.com/)
- [AsyncStorage Documentation](https://react-native-async-storage.github.io/)
- [JWT Documentation](https://jwt.io/)
- [React Navigation Documentation](https://reactnavigation.org/)
