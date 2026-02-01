# Architecture - User Management Dev Template

**Date:** 2026-02-01
**Author:** Architect-Plan Agent
**Status:** Final

---

## 1. プロジェクト構造

```
src/
  app.js                  # Expressアプリ定義（ミドルウェア設定）
  server.js               # サーバー起動エントリポイント
  config/
    database.js            # SQLite接続・初期化
    session.js             # express-session設定
  routes/
    auth.js                # 認証系ルート（登録・ログイン・ログアウト）
    user.js                # ユーザーCRUD API
    pages.js               # ページ配信ルート
  middleware/
    auth.js                # 認証チェックミドルウェア
  models/
    user.js                # Userモデル（DB操作）
  public/
    css/
      style.css            # 共通スタイル
    js/
      auth.js              # 登録・ログインフォーム処理
      dashboard.js         # ダッシュボードUI処理
    pages/
      login.html           # ログイン画面
      register.html        # 登録画面
      dashboard.html       # ダッシュボード画面
.env.example               # 環境変数テンプレート
package.json
```

### 設計方針

- **MVC構造**: routes(Controller) / models(Model) / public/pages(View) の明確な分離
- **静的HTMLファイル配信**: EJSは使わず、HTMLファイルをpublicから配信。API経由でデータ取得
- **Stripe拡張ポイント**: `routes/` に `stripe.js`、`models/` に `subscription.js` を追加するだけで対応可能

---

## 2. データベース設計

### usersテーブル

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### 将来拡張（Stripe連携時に追加）

```sql
-- usersテーブルにカラム追加
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;

-- subscriptionsテーブル
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Webhook冪等性テーブル
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_id TEXT PRIMARY KEY,
  processed_at TEXT DEFAULT (datetime('now'))
);
```

### SQLite設定

- WALモード有効化: `PRAGMA journal_mode=WAL;`
- 外部キー有効化: `PRAGMA foreign_keys=ON;`

---

## 3. API設計

### 認証API

| Method | Path | 説明 | 認証 | Request Body | Response |
|--------|------|------|------|-------------|----------|
| POST | `/api/auth/register` | ユーザー登録 | 不要 | `{ email, password, name }` | `{ id, email, name }` |
| POST | `/api/auth/login` | ログイン | 不要 | `{ email, password }` | `{ id, email, name }` |
| POST | `/api/auth/logout` | ログアウト | 必要 | なし | `{ message }` |
| GET | `/api/auth/me` | 現在のユーザー取得 | 必要 | なし | `{ id, email, name }` |

### ユーザーCRUD API

| Method | Path | 説明 | 認証 | Request Body | Response |
|--------|------|------|------|-------------|----------|
| GET | `/api/users` | ユーザー一覧 | 必要 | なし | `[{ id, email, name, created_at }]` |
| GET | `/api/users/:id` | ユーザー詳細 | 必要 | なし | `{ id, email, name, created_at }` |
| PUT | `/api/users/:id` | ユーザー更新 | 必要 | `{ name, email }` | `{ id, email, name }` |
| DELETE | `/api/users/:id` | ユーザー削除 | 必要 | なし | `{ message }` |

### ページ配信

| Method | Path | 説明 |
|--------|------|------|
| GET | `/` | ログイン画面へリダイレクト |
| GET | `/login` | ログイン画面 |
| GET | `/register` | 登録画面 |
| GET | `/dashboard` | ダッシュボード（認証必要） |

### 認証ミドルウェア

```javascript
// middleware/auth.js
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}
```

- セッションベース認証（express-session）
- セッションストア: メモリ（開発用途。本番移行時にconnect-sqlite3等に変更可能）
- ページへの未認証アクセスはログイン画面へリダイレクト、APIは401を返す

### エラーハンドリング

レスポンス形式を統一:

```json
{
  "error": "エラーメッセージ"
}
```

| HTTP Status | 用途 |
|-------------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 400 | バリデーションエラー（不正入力、重複メール等） |
| 401 | 未認証 |
| 404 | リソース未発見 |
| 500 | サーバーエラー |

---

## 4. フロントエンド設計

### 画面一覧

1. **ログイン画面** (`/login`) - メール・パスワード入力、登録画面へのリンク
2. **登録画面** (`/register`) - 名前・メール・パスワード入力、ログイン画面へのリンク
3. **ダッシュボード** (`/dashboard`) - ユーザー情報表示、ユーザー一覧表示、ログアウトボタン

### 画面遷移

```
[登録画面] --登録成功--> [ログイン画面]
[ログイン画面] --ログイン成功--> [ダッシュボード]
[ダッシュボード] --ログアウト--> [ログイン画面]
[未認証でダッシュボードアクセス] --> [ログイン画面]
```

### フロントエンド技術方針

- HTML + Vanilla JS + CSS（フレームワークなし）
- fetch APIでバックエンドと通信
- フォームバリデーションはクライアント側でも最低限実施（空欄チェック）
- レスポンシブ対応は最低限（モバイルでも崩れない程度）

---

## 5. 依存パッケージ

```json
{
  "dependencies": {
    "express": "^4.21.0",
    "better-sqlite3": "^11.0.0",
    "bcrypt": "^5.1.0",
    "express-session": "^1.18.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {}
}
```

合計5パッケージ。最小限を維持。

---

## 6. 環境変数

```env
# .env.example
PORT=3000
SESSION_SECRET=your-secret-key-change-this
NODE_ENV=development
```

---

## 7. Stripe拡張ポイント（将来用メモ）

Stripe連携時に追加・変更が必要なファイル:

| 操作 | ファイル |
|------|---------|
| 新規作成 | `src/routes/stripe.js` - Checkout/Webhook |
| 新規作成 | `src/models/subscription.js` - サブスクリプションCRUD |
| 変更 | `src/config/database.js` - テーブル追加 |
| 変更 | `src/models/user.js` - stripe_customer_id対応 |
| 変更 | `src/app.js` - stripe routeとexpress.raw()追加 |
| 変更 | `.env` - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET追加 |

既存コードへの変更は最小限に抑えられる構造になっている。
