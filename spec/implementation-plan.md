# Implementation Plan - User Management Dev Template

**Date:** 2026-02-01
**Author:** Architect-Plan Agent
**For:** Senior-Coder Agent

---

## タスク一覧

全7タスク。上から順に実装すること。

---

### Task 1: プロジェクト初期化・サーバー設定

**作成ファイル:**
- `src/package.json`
- `src/.env.example`
- `src/.env` (gitignore対象)
- `src/app.js`
- `src/server.js`

**手順:**

1. `src/` で `npm init -y` を実行
2. `npm install express better-sqlite3 bcrypt express-session dotenv` を実行
3. `.env.example` を作成（PORT, SESSION_SECRET, NODE_ENV）
4. `.env` を `.env.example` からコピーして作成
5. `app.js` を作成:
   - `dotenv/config` を読み込み
   - Expressアプリを生成
   - `express.json()` ミドルウェアを設定
   - `express.static('public')` で静的ファイル配信
   - エクスポート
6. `server.js` を作成:
   - `app.js` をインポート
   - `process.env.PORT` (デフォルト3000) でリッスン

**受け入れ基準:**
- `node src/server.js` でサーバーが起動する
- `http://localhost:3000` にアクセスできる（404でOK）

---

### Task 2: データベース設定

**作成ファイル:**
- `src/config/database.js`
- `src/data/` ディレクトリ（SQLiteファイル格納用、gitignore）

**手順:**

1. `config/database.js` を作成:
   - `better-sqlite3` でDBインスタンスを生成（ファイル: `src/data/database.sqlite`）
   - WALモード有効化: `db.pragma('journal_mode = WAL')`
   - 外部キー有効化: `db.pragma('foreign_keys = ON')`
   - usersテーブルをCREATE IF NOT EXISTS
   - dbインスタンスをエクスポート
2. `src/.gitignore` に `data/*.sqlite` を追加

**usersテーブルスキーマ:**
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

**受け入れ基準:**
- `require('./config/database')` でDB接続が確立される
- usersテーブルが自動作成される

---

### Task 3: Userモデル

**作成ファイル:**
- `src/models/user.js`

**エクスポートする関数:**

```javascript
module.exports = {
  create(email, passwordHash, name)    // INSERT、返り値: { id, email, name }
  findByEmail(email)                    // SELECT by email、返り値: user row or undefined
  findById(id)                          // SELECT by id（password_hash除外）
  findAll()                             // SELECT all（password_hash除外）
  update(id, { name, email })           // UPDATE、返り値: { id, email, name }
  remove(id)                            // DELETE
};
```

**注意:**
- findById, findAll はpassword_hashを返さないこと
- findByEmailはpassword_hashを含める（ログイン検証用）
- better-sqlite3の同期APIを使用（`db.prepare(...).run/get/all`）

**受け入れ基準:**
- 全CRUD操作が動作する
- findById/findAllがpassword_hashを含まない

---

### Task 4: 認証ミドルウェア・セッション設定

**作成ファイル:**
- `src/config/session.js`
- `src/middleware/auth.js`

**変更ファイル:**
- `src/app.js` - セッションミドルウェアを追加

**session.js:**
```javascript
const session = require('express-session');
module.exports = session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,  // 開発環境用
    maxAge: 24 * 60 * 60 * 1000  // 24時間
  }
});
```

**middleware/auth.js:**
```javascript
// requireAuth - API用（401返却）
// requireAuthPage - ページ用（/loginへリダイレクト）
```

**受け入れ基準:**
- セッションが正しく生成・維持される
- 未認証APIリクエストに401が返る
- 未認証ページアクセスがログイン画面にリダイレクトされる

---

### Task 5: 認証ルート（登録・ログイン・ログアウト）

**作成ファイル:**
- `src/routes/auth.js`

**変更ファイル:**
- `src/app.js` - ルートをマウント

**エンドポイント:**

1. `POST /api/auth/register`
   - body: `{ email, password, name }`
   - バリデーション: 全フィールド必須、メール形式チェック、パスワード最低6文字
   - bcryptでパスワードハッシュ化（saltRounds: 10）
   - User.create()で保存
   - セッションにuserIdを設定
   - 201を返す

2. `POST /api/auth/login`
   - body: `{ email, password }`
   - User.findByEmail()でユーザー取得
   - bcrypt.compareでパスワード検証
   - セッションにuserIdを設定
   - 200を返す

3. `POST /api/auth/logout`
   - `req.session.destroy()` でセッション破棄
   - 200を返す

4. `GET /api/auth/me`
   - requireAuth適用
   - セッションのuserIdからUser.findById()
   - 200を返す

**受け入れ基準:**
- ユーザー登録が成功する
- 重複メールで400エラーが返る
- 正しい認証情報でログイン成功
- 不正な認証情報でログイン失敗（401）
- ログアウト後にmeエンドポイントが401を返す

---

### Task 6: ユーザーCRUDルート

**作成ファイル:**
- `src/routes/user.js`

**変更ファイル:**
- `src/app.js` - ルートをマウント

**エンドポイント（全てrequireAuth適用）:**

1. `GET /api/users` - User.findAll()
2. `GET /api/users/:id` - User.findById(id)、未発見は404
3. `PUT /api/users/:id` - User.update(id, body)、自分自身のみ変更可能
4. `DELETE /api/users/:id` - User.remove(id)、自分自身のみ削除可能

**受け入れ基準:**
- 認証済みユーザーがCRUD操作できる
- 他ユーザーの更新・削除は403エラー
- 存在しないユーザーIDで404

---

### Task 7: フロントエンド（HTML/CSS/JS）

**作成ファイル:**
- `src/public/pages/login.html`
- `src/public/pages/register.html`
- `src/public/pages/dashboard.html`
- `src/public/css/style.css`
- `src/public/js/auth.js`
- `src/public/js/dashboard.js`
- `src/routes/pages.js`

**変更ファイル:**
- `src/app.js` - ページルートをマウント

**pages.js:**
```javascript
router.get('/login', (req, res) => res.sendFile('pages/login.html', { root: 'public' }));
router.get('/register', (req, res) => res.sendFile('pages/register.html', { root: 'public' }));
router.get('/dashboard', requireAuthPage, (req, res) => res.sendFile('pages/dashboard.html', { root: 'public' }));
router.get('/', (req, res) => res.redirect('/login'));
```

**各画面の要件:**

1. **login.html** - メール・パスワードフォーム、登録リンク、エラー表示エリア
2. **register.html** - 名前・メール・パスワードフォーム、ログインリンク、エラー表示エリア
3. **dashboard.html** - ログインユーザー情報表示、ユーザー一覧テーブル、ログアウトボタン

**style.css:**
- 最小限のレイアウト（中央寄せカード型フォーム）
- レスポンシブ対応（max-widthベース）

**JS:**
- fetch APIでバックエンドと通信
- フォームsubmitをpreventDefault
- エラーメッセージの表示
- ダッシュボードはページロード時に `/api/auth/me` と `/api/users` を呼び出し

**受け入れ基準:**
- ブラウザで登録 -> ログイン -> ダッシュボード閲覧 -> ログアウトの全フローが動作する
- 未認証で `/dashboard` にアクセスすると `/login` にリダイレクトされる
- エラー時にユーザーにメッセージが表示される

---

## 実装順序の依存関係

```
Task 1 (サーバー)
  └→ Task 2 (DB)
       └→ Task 3 (Model)
            └→ Task 4 (認証MW)
                 ├→ Task 5 (認証API)
                 └→ Task 6 (CRUD API)
                      └→ Task 7 (フロントエンド)
```

Task 5 と Task 6 は並行実装可能だが、順番に実装することを推奨。
