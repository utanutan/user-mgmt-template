# Google OAuth Implementation Plan

## 1. DB Schema Changes

### 1.1 ALTER TABLE statements

SQLite does not support `ALTER COLUMN`, so `password_hash` cannot be changed to nullable on an existing table. Instead, use a migration approach:

```sql
-- Add new columns
ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'email';
ALTER TABLE users ADD COLUMN avatar_url TEXT;
```

For `password_hash` NULL permissibility, the `CREATE TABLE IF NOT EXISTS` in `database.js` already only runs on first creation. For existing databases, SQLite's `ALTER TABLE` cannot change NOT NULL constraints. **Practical solution**: Recreate the table via migration.

### 1.2 Updated CREATE TABLE (database.js)

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,          -- Changed: NULL allowed (Google-only users)
  name TEXT NOT NULL,
  google_id TEXT UNIQUE,       -- New
  auth_provider TEXT DEFAULT 'email',  -- New: 'email' | 'google' | 'both'
  avatar_url TEXT,             -- New
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
)
```

### 1.3 Migration strategy

Add a migration function in `database.js` that:
1. Checks if `google_id` column exists (via `PRAGMA table_info(users)`)
2. If not, runs the 3 ALTER TABLE ADD COLUMN statements
3. For `password_hash` NULL: create new table, copy data, drop old, rename (wrapped in transaction)

### 1.4 Impact on existing data

- All existing users get `auth_provider = 'email'`, `google_id = NULL`, `avatar_url = NULL`
- No data loss; existing password_hash values remain intact

---

## 2. API Design

### 2.1 `POST /api/auth/google`

**Request:**
```json
{
  "credential": "<Google ID Token>"
}
```

**Success Response (200 or 201):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "isNewUser": false
}
```
- Status `200` for existing user login
- Status `201` for new user auto-registration

**Processing Logic:**

```
1. Verify ID token via OAuth2Client.verifyIdToken()
2. Extract: email, name, sub (google_id), picture (avatar_url)
3. Look up user by google_id (User.findByGoogleId)
   - Found → login (set session), return 200
4. Look up user by email (User.findByEmail)
   - Found → link account: set google_id, auth_provider='both', avatar_url
   - Set session, return 200
5. Neither found → create new user:
   - password_hash = NULL, auth_provider = 'google'
   - Set session, return 201
```

**Error Responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 400 | Missing credential | `{ "error": "Credential is required" }` |
| 401 | Invalid/expired token | `{ "error": "Invalid Google token" }` |
| 500 | Server error | `{ "error": "Server error" }` |

### 2.2 `GET /api/auth/google-client-id`

Returns the Google Client ID for frontend use (graceful degradation).

**Response when configured:**
```json
{ "clientId": "xxxx.apps.googleusercontent.com" }
```

**Response when not configured:**
```json
{ "clientId": null }
```

### 2.3 Changes to existing `POST /api/auth/login`

No changes needed. The existing bcrypt.compare will work because Google-only users have `password_hash = NULL`, and `bcrypt.compare(password, null)` will throw/fail, which falls into the catch block returning 401. However, for clearer error handling, add an explicit check:

```js
if (!user.password_hash) {
  return res.status(401).json({ error: 'This account uses Google login' });
}
```

---

## 3. Frontend Changes

### 3.1 GIS Script Loading

In both `login.html` and `register.html`, conditionally load the GIS script:

```html
<!-- Google Sign-In (loaded conditionally by auth.js) -->
<div id="google-signin-container" style="display:none">
  <div class="divider"><span>or</span></div>
  <div id="g_id_signin"></div>
</div>
```

The GIS `<script>` tag is injected dynamically by `auth.js` only after confirming that `clientId` is available.

### 3.2 Google Button Placement

Place the `#google-signin-container` div after the login/register form's submit button and error div, before the `.link` div.

### 3.3 Callback Processing (auth.js)

```js
// Pseudocode for auth.js additions
async function initGoogleSignIn() {
  const res = await fetch('/api/auth/google-client-id');
  const { clientId } = await res.json();
  if (!clientId) return; // Graceful degradation

  // Show container
  document.getElementById('google-signin-container').style.display = 'block';

  // Load GIS script
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.onload = () => {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleResponse
    });
    google.accounts.id.renderButton(
      document.getElementById('g_id_signin'),
      { theme: 'outline', size: 'large', width: '100%', text: 'signin_with' }
    );
  };
  document.head.appendChild(script);
}

async function handleGoogleResponse(response) {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });
    const data = await res.json();
    if (!res.ok) return showError(data.error || 'Google login failed');
    window.location.href = '/dashboard';
  } catch {
    showError('Network error');
  }
}

// Initialize on page load
initGoogleSignIn();
```

---

## 4. Graceful Degradation

### Backend
- `GET /api/auth/google-client-id` reads `process.env.GOOGLE_CLIENT_ID`
- Returns `{ clientId: null }` if undefined/empty
- `POST /api/auth/google` returns `400` with `"Google auth is not configured"` if GOOGLE_CLIENT_ID is missing

### Frontend
- `auth.js` calls `/api/auth/google-client-id` on page load
- If `clientId` is null: GIS script is never loaded, Google button container stays hidden
- Email/password forms work identically regardless

### .env additions
```
GOOGLE_CLIENT_ID=     # Leave empty to disable Google auth
```

---

## 5. Senior-Coder Task Breakdown

### Task 1: Database migration (src/config/database.js)
**Changes:**
- Add migration function that runs after table creation
- Use `PRAGMA table_info(users)` to detect if migration needed
- Add columns: `google_id TEXT UNIQUE`, `auth_provider TEXT DEFAULT 'email'`, `avatar_url TEXT`
- Recreate table to make `password_hash` nullable (SQLite limitation)

**Acceptance criteria:**
- Existing databases are migrated without data loss
- New databases are created with the updated schema
- `password_hash` allows NULL

### Task 2: User model updates (src/models/user.js)
**Changes:**
- Add `findByGoogleId(googleId)` function
- Add `createGoogleUser(email, name, googleId, avatarUrl)` - creates user with null password_hash
- Add `linkGoogleAccount(userId, googleId, avatarUrl)` - updates existing user with google_id
- Update `findByEmail` to also return `google_id`, `auth_provider`, `avatar_url`

**Acceptance criteria:**
- All new functions work with the updated schema
- `findById` and `findAll` include `auth_provider` and `avatar_url` in results

### Task 3: Auth routes (src/routes/auth.js)
**Changes:**
- Add `npm install google-auth-library` dependency
- Add `POST /api/auth/google` endpoint (verification + session creation)
- Add `GET /api/auth/google-client-id` endpoint
- Add explicit check in `POST /api/auth/login` for null password_hash

**Acceptance criteria:**
- Google token verification works with valid tokens
- Invalid tokens return 401
- Account linking works for existing email matches
- New Google users are auto-registered
- Session is created on successful Google auth
- Returns appropriate status codes (200 for login, 201 for new user)
- Endpoint is disabled (400) when GOOGLE_CLIENT_ID not set

### Task 4: Frontend - HTML (src/public/pages/login.html, register.html)
**Changes:**
- Add `#google-signin-container` div with divider and `#g_id_signin` button target
- Container hidden by default (`style="display:none"`)

**Acceptance criteria:**
- Google button container is present but hidden in HTML
- Layout looks correct when container is shown

### Task 5: Frontend - JavaScript (src/public/js/auth.js)
**Changes:**
- Add `initGoogleSignIn()` function (fetch client ID, load GIS, render button)
- Add `handleGoogleResponse()` callback
- Call `initGoogleSignIn()` on page load

**Acceptance criteria:**
- Google button appears only when GOOGLE_CLIENT_ID is configured
- Google login flow redirects to /dashboard on success
- Errors are displayed using existing `showError()` function
- Works on both login and register pages

### Implementation Order
1. Task 1 (DB) - foundation
2. Task 2 (Model) - depends on Task 1
3. Task 3 (Routes) - depends on Task 2
4. Task 4 (HTML) - independent, can parallel with 1-3
5. Task 5 (JS) - depends on Task 3 and 4

### New dependency
```
npm install google-auth-library
```

### .env template addition
```
GOOGLE_CLIENT_ID=your-client-id-here
```
