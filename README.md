# User Management Dev Template

ユーザー認証・管理とデータベース機能を持つWebアプリケーションの再利用可能な開発テンプレート。
このテンプレートを基に、新しいプロジェクトを素早く立ち上げることができます。

## Tech Stack

| レイヤー | 技術 |
|----------|------|
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Authentication | bcrypt + express-session + Google OAuth (GIS) |
| Frontend | HTML + Vanilla JS + CSS |

## Quick Start

```bash
git clone https://github.com/utanutan/user-mgmt-template.git
cd user-mgmt-template/src
npm install
cp .env.example .env
node server.js
```

`http://localhost:3000` でアクセスできます。

## 機能

- ユーザー登録 (Email/Password)
- ログイン・ログアウト
- セッション管理
- ユーザーCRUD API
- ダッシュボード（ユーザー一覧表示）
- Google OAuth ログイン（オプション）

## プロジェクト構成

```
src/
  app.js                  # Expressアプリ定義
  server.js               # サーバー起動エントリポイント
  config/
    database.js            # SQLite接続・初期化
    session.js             # express-session設定
  routes/
    auth.js                # 認証系ルート（登録・ログイン・ログアウト・Google OAuth）
    user.js                # ユーザーCRUD API
    pages.js               # ページ配信ルート
  middleware/
    auth.js                # 認証チェックミドルウェア
  models/
    user.js                # Userモデル（DB操作）
  public/
    css/style.css          # 共通スタイル
    js/auth.js             # 登録・ログインフォーム処理
    js/dashboard.js        # ダッシュボードUI処理
    pages/
      login.html           # ログイン画面
      register.html        # 登録画面
      dashboard.html       # ダッシュボード画面
```

## 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `PORT` | サーバーポート | `3000` |
| `SESSION_SECRET` | セッション暗号化キー | `dev-secret` |
| `NODE_ENV` | 実行環境 | `development` |
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID（未設定時はEmail/Password認証のみ） | 空 |

## API エンドポイント

### 認証

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| POST | `/api/auth/register` | ユーザー登録 | 不要 |
| POST | `/api/auth/login` | ログイン | 不要 |
| POST | `/api/auth/logout` | ログアウト | 必要 |
| GET | `/api/auth/me` | 現在のユーザー取得 | 必要 |
| POST | `/api/auth/google` | Google OAuth ログイン | 不要 |
| GET | `/api/auth/google-client-id` | Google Client ID取得 | 不要 |

### ユーザーCRUD

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| GET | `/api/users` | ユーザー一覧 | 必要 |
| GET | `/api/users/:id` | ユーザー詳細 | 必要 |
| PUT | `/api/users/:id` | ユーザー更新（自分のみ） | 必要 |
| DELETE | `/api/users/:id` | ユーザー削除（自分のみ） | 必要 |

---

## Google OAuth ログインの設定

Google OAuth ログインは **オプション機能** です。`GOOGLE_CLIENT_ID` を設定しなければ、従来のEmail/Password認証のみで動作します（グレースフルデグラデーション）。

### 実装の仕組み

GIS（Google Identity Services）と `google-auth-library` を組み合わせた構成で、Google推奨のセキュアな方式を採用しています。

- **フロントエンド**: `google.accounts.id.initialize` でSign In With Googleボタンを表示。ユーザーがログインすると、Googleから **IDトークン (JWT)** が発行される
- **バックエンド**: 受け取ったトークンを `google-auth-library` の `verifyIdToken` メソッドで検証。トークンが偽造されていないこと、自社の `CLIENT_ID` 宛てであることを保証する
- **`email_verified` による保護**: トークン内の `payload.email_verified` が `true` であることを確認してから、既存のEmailアカウントと紐付け（アカウントリンク）を行う。未認証のメールアドレスを悪用した「なりすまし乗っ取り」を防止する
- **環境変数による動的切り替え**: `GOOGLE_CLIENT_ID` の有無で挙動を変える設計。`.env` ファイルを編集するだけでGoogleログインの有効/無効を制御できる

### Google Cloud Console の設定手順

1. **プロジェクトの選択**: [Google Cloud Console](https://console.cloud.google.com/) で、アプリ用のプロジェクトを作成または選択

2. **OAuth 同意画面の設定**:
   - 初回の場合、まず「OAuth 同意画面」を作成する
   - User Typeは、外部公開しないテスト段階なら「外部 (External)」を選択
   - スコープに `.../auth/userinfo.email` と `.../auth/userinfo.profile` を追加

3. **認証情報の作成**:
   - 「認証情報を作成」→「OAuth クライアント ID」を選択
   - **アプリケーションの種類**: 「ウェブ アプリケーション」
   - **承認済みの JavaScript 生成元**: `http://localhost:3000`（フロントエンドのURL）
   - **承認済みのリダイレクト URI**: `http://localhost:3000`（GISのワンタップやボタンを使用する場合、ここが一致している必要がある）

4. **環境変数に設定**:
   ```bash
   # src/.env
   GOOGLE_CLIENT_ID=取得したクライアントID
   ```

5. **サーバーを再起動**: ログイン画面に「Sign in with Google」ボタンが表示される

### 動作確認チェックリスト

1. `src/.env` を保存した後、必ずサーバーを再起動する
2. ログイン画面に「Sign in with Google」ボタンが表示されているか確認
3. ボタンを押してログインした後、バックエンドのコンソールにエラー（`Invalid token` など）が出ていないか確認
4. すでにEmail/Passで登録済みのメールアドレスと同じGoogleアカウントでログインした際、正しくアカウントがリンクされるか確認

---

## 本番環境への移行

### Google Cloud Console の設定変更

`http://localhost:3000` の代わりに、本番のURLを指定します。

| 項目 | 設定する値の例 | 説明 |
|------|---------------|------|
| **承認済みの JavaScript 生成元** | `https://your-app.com` | Google ログインボタンを表示するドメイン |
| **承認済みのリダイレクト URI** | `https://your-app.com` | GIS使用時は生成元と同じドメインを指定 |

> **HTTPS必須**: ローカル開発（localhost）以外では、Google OAuthは **HTTPS** 接続を必須とします。本番サーバーにはSSL証明書（Let's Encryptなど）の設定が必要です。

### OAuth 同意画面の公開ステータス

開発中は「テスト」状態で問題ありませんが、外部ユーザーに公開するにはステータスを **「本番」** に変更する必要があります。

1. 「OAuth 同意画面」タブに移動
2. 「アプリを公開」ボタンをクリック
3. 検証（Verification）が必要になる場合がある（機密性の高いスコープを使用している場合）。`email/profile` のみであれば、基本的には自己申告で即座に公開可能

### .env ファイルの更新

```bash
GOOGLE_CLIENT_ID=本番用のクライアントID
SESSION_SECRET=本番用の強力なシークレットキー
NODE_ENV=production
```

---

## 将来の拡張

このテンプレートは段階的な拡張が可能な設計になっています。

| 拡張 | 変更内容 |
|------|---------|
| **Stripe決済** | `routes/stripe.js` + `models/subscription.js` 追加、usersテーブルに `stripe_customer_id` カラム追加 |
| **PostgreSQL移行** | `config/database.js` を差し替え（SQL互換のため移行容易） |
| **追加OAuth** | `routes/auth.js` にプロバイダー別エンドポイント追加 |

## License

MIT
