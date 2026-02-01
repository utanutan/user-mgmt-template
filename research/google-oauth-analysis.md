# Google OAuth ログイン実装 調査レポート

**調査日**: 2026-02-01
**対象**: User Management Dev Template (Express 5 + SQLite + bcrypt + express-session)

---

## 1. 実装方法の選択肢

### 方式 A: Google Identity Services (GIS) + google-auth-library (推奨)

**概要**: フロントエンドで Google の公式 GIS ライブラリ (`accounts.google.com/gsi/client`) を使い「Sign In With Google」ボタンを表示。ユーザーがGoogleアカウントを選択すると ID Token (JWT) がフロントエンドに返却され、それをバックエンドの Express API に POST。バックエンド側で `google-auth-library` の `verifyIdToken()` を用いてトークンを検証し、ペイロードからユーザー情報 (email, name, google_id) を取得してセッションに格納する。

**追加パッケージ**: `google-auth-library` (1個のみ)

**フロー**:
```
[ブラウザ] GIS ライブラリがGoogleログインUIを表示
    ↓ ユーザーがGoogleアカウントを選択
[ブラウザ] credential (ID Token JWT) を受け取る
    ↓ POST /api/auth/google { credential }
[Express] google-auth-library で verifyIdToken()
    ↓ 検証成功: { email, name, sub (google_id), picture }
[Express] DBでユーザー検索/作成 → req.session.userId = user.id
    ↓
[ブラウザ] ダッシュボードへリダイレクト
```

### 方式 B: Passport.js + passport-google-oauth20

**概要**: Passport.js ミドルウェアを導入し、Google OAuth 2.0 認可コードフローでサーバーサイドリダイレクトを行う。`/auth/google` にアクセスするとGoogle同意画面にリダイレクトされ、コールバックURLに認可コードが返却、Passport が自動的にアクセストークン/IDトークンを取得する。

**追加パッケージ**: `passport`, `passport-google-oauth20` (2個)

**フロー**:
```
[ブラウザ] GET /auth/google
    ↓ 302 リダイレクト
[Google] OAuth同意画面
    ↓ 認可コード付きリダイレクト
[Express] GET /auth/google/callback?code=xxx
    ↓ Passport がコードをトークンに交換
[Express] コールバックでユーザー検索/作成 → セッション格納
    ↓ 302 リダイレクト
[ブラウザ] ダッシュボード
```

### 方式 C: 手動 OAuth2 実装 (google-auth-library のみ)

**概要**: サーバーサイドで OAuth2 認可コードフローを手動実装。`google-auth-library` の `OAuth2Client` を使い、認可URL生成 → コールバック処理 → トークン取得を自前で行う。

**追加パッケージ**: `google-auth-library` (1個)

---

## 2. 各方式の比較

| 項目 | A: GIS + google-auth-library | B: Passport.js | C: 手動 OAuth2 |
|------|------|------|------|
| **追加パッケージ数** | 1 | 2 (+serialize/deserialize設定) | 1 |
| **セットアップ複雑さ** | 低 | 中 | 高 |
| **既存コードへの影響** | 小 (APIルート1つ追加) | 中 (Passport初期化、serialize/deserialize) | 中 (複数ルート追加) |
| **express-session互換性** | 完全互換 (既存セッションをそのまま使用) | 互換だがPassportがセッション管理を上書き | 完全互換 |
| **フロントエンド変更** | GIS script tag + ボタン追加 | リンク1つ追加 | リンク1つ追加 |
| **UX** | ポップアップ/ワンタップ (モダン) | ページリダイレクト (従来型) | ページリダイレクト |
| **Google推奨度 (2025-2026)** | 最も推奨 (GIS は現行の公式API) | 非推奨ではないが旧式 | - |
| **将来の拡張性** | Google専用 | 多プロバイダ対応容易 | Google専用 |
| **テンプレート適性** | 最も高い | 中 | 低 |

### 2025-2026年の状況

- Google は旧 Google Sign-In JavaScript ライブラリを**非推奨**とし、Google Identity Services (GIS) への移行を推奨している
- Passport.js 公式は `passport-google-oidc` を現在推奨しているが、GIS のフロントエンド方式と比較するとサーバーサイドリダイレクトが必要で UX がやや劣る
- `google-auth-library` は npm 週間ダウンロード約 1,700万で、`passport` の約 300万を大きく上回る

---

## 3. Google Cloud Console 設定手順

### 3.1 プロジェクト作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 「新しいプロジェクト」を作成

### 3.2 OAuth 同意画面の設定
1. 「APIとサービス」 → 「OAuth 同意画面」
2. User Type: 「外部」を選択
3. アプリ名、ユーザーサポートメール、デベロッパー連絡先メールを入力
4. スコープ: `email`, `profile`, `openid` を追加
5. テストユーザー: 開発中は自分のGmailを追加

### 3.3 クライアント ID の作成
1. 「APIとサービス」 → 「認証情報」 → 「認証情報を作成」 → 「OAuthクライアントID」
2. アプリケーションの種類: 「ウェブアプリケーション」
3. 承認済みの JavaScript オリジン: `http://localhost:3000`
4. 承認済みのリダイレクト URI (方式 B/C の場合): `http://localhost:3000/api/auth/google/callback`
5. 作成後、**クライアント ID** と **クライアント シークレット** を取得

### 3.4 開発環境 (localhost) での動作
- GIS (方式 A) は `localhost` で問題なく動作する。JavaScript オリジンに `http://localhost:3000` を登録するだけでよい
- 方式 A では**クライアントシークレットは不要** (ID Token 検証のみ)。クライアント ID のみで動作する

---

## 4. 既存テンプレートへの影響範囲

### 推奨方式 A (GIS + google-auth-library) での変更ファイル一覧

| ファイル | 変更内容 | 新規/修正 |
|---------|---------|----------|
| `src/package.json` | `google-auth-library` を追加 | 修正 |
| `src/.env.example` | `GOOGLE_CLIENT_ID` を追加 | 修正 |
| `src/.env` | `GOOGLE_CLIENT_ID` の値を設定 | 修正 |
| `src/config/database.js` | users テーブルに `google_id`, `avatar_url` カラム追加、`password_hash` を NULL 許容に変更 | 修正 |
| `src/models/user.js` | `findByGoogleId()`, `createFromGoogle()`, `linkGoogleAccount()` 関数を追加 | 修正 |
| `src/routes/auth.js` | `POST /api/auth/google` エンドポイントを追加 | 修正 |
| `src/public/pages/login.html` | GIS script tag と Google ログインボタンを追加 | 修正 |
| `src/public/pages/register.html` | GIS script tag と Google ログインボタンを追加 | 修正 |
| `src/public/js/auth.js` | Google credential コールバック関数を追加 | 修正 |

### 4.1 DB スキーマ変更

```sql
-- 既存テーブルを変更 (SQLite は ALTER TABLE の制約があるため、マイグレーション戦略が必要)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,              -- NULL許容に変更 (Googleのみユーザーはパスワード無し)
  name TEXT NOT NULL,
  google_id TEXT UNIQUE,           -- 追加: GoogleのサブジェクトID
  avatar_url TEXT,                 -- 追加: Googleプロフィール画像URL
  auth_provider TEXT DEFAULT 'local', -- 追加: 'local' | 'google' | 'both'
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

**重要**: `password_hash` を `NOT NULL` から `NULL許容` に変更する必要がある。Googleログインのみのユーザーはパスワードを持たないため。既存のバリデーションロジック (`/register`, `/login`) はパスワード必須のままでよい。

### 4.2 既存 Email/Password ログインとの共存

- 既存の `/api/auth/register` と `/api/auth/login` は**変更不要** (そのまま動作)
- Google ログインは別エンドポイント `/api/auth/google` として追加
- 同じメールアドレスで Email/Password 登録済みのユーザーが Google ログインした場合:
  - メールアドレスで既存ユーザーを検索
  - 存在すれば `google_id` を紐付け、`auth_provider` を `'both'` に更新
  - 存在しなければ新規ユーザーとして作成 (`auth_provider = 'google'`)

### 4.3 バックエンド実装イメージ (auth.js への追加)

```javascript
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Credential is required' });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // 既存ユーザー検索 (google_id or email)
    let user = User.findByGoogleId(googleId);
    if (!user) {
      user = User.findByEmail(email);
      if (user) {
        // アカウントリンク
        User.linkGoogleAccount(user.id, googleId, picture);
      } else {
        // 新規作成
        user = User.createFromGoogle(email, name, googleId, picture);
      }
    }

    req.session.userId = user.id;
    res.json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    res.status(401).json({ error: 'Invalid Google credential' });
  }
});
```

### 4.4 フロントエンド実装イメージ (login.html への追加)

```html
<!-- Google Sign In ボタン -->
<div id="g_id_onload"
     data-client_id="YOUR_GOOGLE_CLIENT_ID"
     data-callback="handleGoogleCredential"
     data-auto_prompt="false">
</div>
<div class="g_id_signin"
     data-type="standard"
     data-size="large"
     data-theme="outline"
     data-text="sign_in_with"
     data-shape="rectangular"
     data-width="100%">
</div>
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

```javascript
// auth.js に追加
async function handleGoogleCredential(response) {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });
    const data = await res.json();
    if (!res.ok) {
      return showError(data.error || 'Google login failed');
    }
    window.location.href = '/dashboard';
  } catch {
    showError('Network error');
  }
}
```

---

## 5. セキュリティ考慮事項

### 5.1 CSRF 対策
- GIS ライブラリは自動的に `g_csrf_token` をクッキーとリクエストボディの両方に設定する
- サーバー側でこの二重送信トークンを検証すべき:
  ```javascript
  const csrfCookie = req.cookies.g_csrf_token;
  const csrfBody = req.body.g_csrf_token;
  if (!csrfCookie || csrfCookie !== csrfBody) {
    return res.status(403).json({ error: 'CSRF verification failed' });
  }
  ```
- これを実装する場合、`cookie-parser` パッケージの追加が必要

### 5.2 トークン管理
- ID Token はサーバー側で `verifyIdToken()` で即座に検証し、セッションに userId のみ格納する
- ID Token 自体はサーバーに保存しない (ステートレス検証)
- `audience` パラメータにクライアント ID を指定し、トークンが自分のアプリ向けであることを検証する

### 5.3 アカウントリンク
- 同一メールアドレスの Email/Password ユーザーと Google ユーザーの自動リンクは便利だが、メール検証済みであることが前提
- Google アカウントのメールは検証済み (`email_verified: true`) であるため、安全に自動リンク可能
- ただし、`payload.email_verified` を必ずチェックすべき

### 5.4 その他
- Google から取得した `sub` (Subject Identifier) は Google アカウント固有の不変 ID。メールアドレスは変更される可能性があるため、`sub` を主キーとして使用する
- localStorage / sessionStorage に ID Token を保存しない (XSS 対策)

---

## 6. テンプレートとしての適性

### 6.1 グレースフルデグラデーション

**方式 A は完全にグレースフルデグラデーション可能**:

- `GOOGLE_CLIENT_ID` が `.env` に設定されていなければ、Google ログインボタンを表示しない (フロントエンドで条件分岐)
- 既存の Email/Password 認証は一切影響を受けない
- 実装方法: サーバーからクライアント ID を提供する API を用意するか、テンプレートエンジンで埋め込む

```javascript
// 例: /api/config エンドポイント
router.get('/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  });
});
```

```javascript
// フロントエンド: Google ボタンの条件表示
const config = await fetch('/api/config').then(r => r.json());
if (config.googleClientId) {
  // GIS ライブラリを動的にロードし、ボタンを表示
}
```

### 6.2 テンプレート利用者の手間

| 手順 | 所要時間 |
|------|---------|
| Google Cloud Console でプロジェクト作成 | 2分 |
| OAuth 同意画面設定 | 5分 |
| OAuth クライアント ID 作成 | 3分 |
| `.env` に `GOOGLE_CLIENT_ID` を記入 | 30秒 |
| **合計** | **約10分** |

方式 A ではクライアントシークレットが不要なため、設定がシンプル。

### 6.3 `.env.example` への追加

```env
PORT=3000
SESSION_SECRET=your-secret-key-change-this
NODE_ENV=development

# Google OAuth (optional - leave empty to disable Google login)
GOOGLE_CLIENT_ID=
```

---

## 7. 推奨方式

### **方式 A: Google Identity Services (GIS) + google-auth-library を推奨**

**理由**:

1. **Google 公式推奨の最新方式** - 旧 Google Sign-In は非推奨、GIS が現行標準
2. **追加パッケージ最小** - `google-auth-library` 1つのみ
3. **既存コードへの影響最小** - express-session をそのまま使用、Passport.js の serialize/deserialize 等の追加設定不要
4. **クライアントシークレット不要** - ID Token 検証方式のため、環境変数は `GOOGLE_CLIENT_ID` のみ
5. **グレースフルデグラデーション容易** - 環境変数未設定で既存機能のみで動作
6. **モダンな UX** - ワンタップサインイン、ポップアップ対応
7. **テンプレートとして最適** - 設定手順が最小限、理解しやすいコード量

---

## 8. 実装時の変更ファイル一覧 (まとめ)

```
src/
  package.json                    # google-auth-library 追加
  .env.example                    # GOOGLE_CLIENT_ID 追加
  config/database.js              # スキーマ変更 (google_id, avatar_url, auth_provider)
  models/user.js                  # findByGoogleId, createFromGoogle, linkGoogleAccount 追加
  routes/auth.js                  # POST /api/auth/google エンドポイント追加
  public/pages/login.html         # GIS script + Google ボタン追加
  public/pages/register.html      # GIS script + Google ボタン追加
  public/js/auth.js               # handleGoogleCredential コールバック追加
```

**変更ファイル数**: 8ファイル (全て既存ファイルの修正、新規ファイル不要)

---

## 参考情報

- [Google Identity Services - Verify ID Token (公式)](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- [Google Identity Services - Migration Guide](https://developers.google.com/identity/oauth2/web/guides/migration-to-gis)
- [google-auth-library (npm)](https://www.npmjs.com/package/google-auth-library)
- [Passport.js - Google Authentication](https://www.passportjs.org/concepts/authentication/google/)
- [passport-google-oauth20 (npm)](https://www.passportjs.org/packages/passport-google-oauth20/)
