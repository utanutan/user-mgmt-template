# Tech Stack Analysis v3 - Stripe連携を踏まえた追加調査

**Date:** 2026-02-01
**Author:** Researcher Agent
**Status:** Complete
**前回調査:** [tech-stack-analysis-v2.md](./tech-stack-analysis-v2.md) (構成パターン比較)

---

## 概要

前回調査(v2)でパターン1（Express + SQLite + bcrypt）が「開発テンプレート」として最高スコア(4.86/5)を獲得した。本調査では、**将来的なStripe決済連携**を前提に4パターンを再評価し、v2の結論が変わるかどうかを判定する。

---

## A. Stripe連携で必要になる要素

| 要素 | 説明 |
|------|------|
| **stripe NPMパッケージ** | サーバーサイドSDK。全パターンで同一 |
| **Webhook受信エンドポイント** | POST `/webhook` で `express.raw()` を使用。署名検証必須 |
| **顧客(Customer)紐付け** | usersテーブルに `stripe_customer_id` カラムを追加 |
| **Checkout Session** | `stripe.checkout.sessions.create()` でセッション生成 |
| **サブスクリプション管理** | Webhook経由で `customer.subscription.created/updated/deleted` を監視 |
| **環境変数管理** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` を `.env` で管理 |
| **冪等性処理** | Webhook重複イベントの検知・スキップ |

### Stripe連携の基本原則（2025-2026年のベストプラクティス）

1. **Stripeをsingle source of truthとする** — ローカルDBには最低限の参照情報（`stripe_customer_id`, `subscription_id`, `status`）のみ保存
2. **Webhookで同期** — 決済状態の変更はWebhook経由で受信し、DBを更新
3. **サーバーサイドのみ** — Secret Keyは絶対にクライアントに露出しない
4. **`express.raw()` でWebhook受信** — `express.json()` とは別にルーティング必要
5. **Stripe CLIでローカルテスト** — `stripe listen --forward-to localhost:3000/webhook`

---

## B. 各パターンのStripe連携評価

### パターン1: Express + SQLite + bcrypt (PRP案)

**Stripe連携の実装:**

```
// Webhook受信 (express.raw)
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  // イベント処理
});

// stripe_customer_id追加
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;

// ユーザー登録時にStripe Customer作成
const customer = await stripe.customers.create({ email: user.email });
db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customer.id, user.id);
```

| 評価項目 | スコア | 理由 |
|---------|--------|------|
| Stripe SDK統合 | ★★★★★ | Expressと`stripe` npmパッケージは公式ドキュメントの標準構成。最も情報量が多い |
| DB操作（stripe_customer_id追加） | ★★★★★ | `ALTER TABLE` 一行で完了。マイグレーションツール不要 |
| Webhook実装 | ★★★★★ | Express標準。`express.raw()` ミドルウェアで即対応。公式サンプルがそのまま使える |
| 認証-Stripe連携 | ★★★★★ | セッションからuser_id取得 → DBからstripe_customer_id取得。シンプルで透明 |
| 拡張性 | ★★★★☆ | SQLiteの同時書き込み制限はWebhook大量受信時にボトルネックになり得る。ただしテンプレート用途では十分 |
| **平均** | **4.8 / 5** | |

**特記事項:**
- Stripeの公式ドキュメント・チュートリアルの大半がExpress + Node.jsで記述されている
- SQLiteでもStripe連携に必要なCRUD操作は全て問題なく実行可能
- Webhookの冪等性チェック用テーブル（processed_events）もSQLiteで容易に実装可能

---

### パターン2: Express + Prisma + Supabase

**Stripe連携の実装:**

```
// Prismaスキーマ追加
model User {
  stripeCustomerId String? @map("stripe_customer_id")
}
// prisma migrate dev で適用

// Webhook受信はパターン1と同一（Express）
```

| 評価項目 | スコア | 理由 |
|---------|--------|------|
| Stripe SDK統合 | ★★★★★ | Expressベースなのでパターン1と同等 |
| DB操作（stripe_customer_id追加） | ★★★★☆ | Prismaスキーマ変更 + `prisma migrate dev`。型安全だが手順が増える |
| Webhook実装 | ★★★★★ | Express標準。パターン1と同等 |
| 認証-Stripe連携 | ★★★★☆ | セッション → Prismaクエリ。型安全だがオーバーヘッドあり |
| 拡張性 | ★★★★★ | PostgreSQLの同時書き込み性能でWebhook大量処理にも対応。Prismaのマイグレーション管理も優秀 |
| **平均** | **4.6 / 5** | |

**特記事項:**
- Supabase Stripe Sync Engineで自動同期も可能（ただし追加セットアップが必要）
- 本番環境でのスケーラビリティはパターン1より優位

---

### パターン3: Next.js + Auth.js + Neon

**Stripe連携の実装:**

```
// API Route or Server Action
// app/api/webhook/route.ts
export async function POST(req: Request) {
  const body = await req.text();
  const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
}
```

| 評価項目 | スコア | 理由 |
|---------|--------|------|
| Stripe SDK統合 | ★★★★☆ | Next.js API RoutesまたはServer Actionsで対応可能。ただしExpressほど直感的ではない |
| DB操作（stripe_customer_id追加） | ★★★★☆ | ORM経由。Neonの接続設定が追加で必要 |
| Webhook実装 | ★★★☆☆ | Next.jsのAPI Routeでraw body取得に工夫が必要。App Routerでは`req.text()`を使う。Expressほど直感的ではない |
| 認証-Stripe連携 | ★★★★☆ | Auth.jsのsession callback経由でstripe_customer_idを付与可能。ただしAuth.js v5のAPI変更リスクあり |
| 拡張性 | ★★★★☆ | Server Componentsとの統合でUI面は優位。ただし密結合 |
| **平均** | **3.8 / 5** | |

**特記事項:**
- Vercel公式の `nextjs-subscription-payments` テンプレートが存在（ただしSupabase前提）
- NextAuth + Prisma + Stripeの組み合わせはGitHubにスターター多数あり
- Webhook受信でraw body取得がExpress比で若干面倒

---

### パターン4: Express + Supabase Auth + Supabase DB

**Stripe連携の実装:**

```
// Webhook受信はパターン1と同一（Express）
// ただしDB操作はSupabase Client経由
const { data, error } = await supabase
  .from('users')
  .update({ stripe_customer_id: customer.id })
  .eq('id', userId);
```

| 評価項目 | スコア | 理由 |
|---------|--------|------|
| Stripe SDK統合 | ★★★★★ | Expressベース。パターン1と同等 |
| DB操作（stripe_customer_id追加） | ★★★☆☆ | Supabase Dashboardまたはマイグレーションで追加。RLSポリシー調整も必要 |
| Webhook実装 | ★★★★★ | Express標準。パターン1と同等 |
| 認証-Stripe連携 | ★★★☆☆ | Supabase AuthのUIDとStripe Customer IDの紐付けが複雑。JWTトークンからの取得にSupabase固有の処理が必要 |
| 拡張性 | ★★★★☆ | Stripe Sync Engineで自動同期可能。ただしSupabase依存がさらに深まる |
| **平均** | **3.8 / 5** | |

**特記事項:**
- Supabase公式の Stripe Sync Engine はStripeデータを自動的にPostgreSQLのstripeスキーマに同期する強力なツール
- ただしテンプレートとしてはセットアップの複雑さが増す
- 認証トークンからuser IDを取得してstripe_customer_idに紐付ける処理がSupabase Auth固有のコードになる

---

## C. Stripe連携総合比較

| 評価軸 | パターン1 (ミニマル) | パターン2 (マネージドDB) | パターン3 (フルスタック) | パターン4 (BaaS) |
|--------|---------------------|------------------------|------------------------|-----------------|
| Stripe SDK統合 | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★★★ |
| DB操作容易さ | ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★☆☆ |
| Webhook実装 | ★★★★★ | ★★★★★ | ★★★☆☆ | ★★★★★ |
| 認証-Stripe連携 | ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★☆☆ |
| 拡張性 | ★★★★☆ | ★★★★★ | ★★★★☆ | ★★★★☆ |
| 公式ドキュメント量 | ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★☆☆ |
| **Stripe連携スコア** | **4.8 / 5** | **4.4 / 5** | **3.8 / 5** | **3.6 / 5** |

---

## D. v2スコアとStripe連携スコアの統合

| パターン | v2スコア (テンプレート適性) | v3 Stripe連携スコア | 統合スコア (加重平均 7:3) |
|---------|---------------------------|--------------------|-----------------------|
| **パターン1: ミニマル** | **4.86** | **4.8** | **4.84** |
| パターン2: マネージドDB | 3.43 | 4.4 | 3.72 |
| パターン3: フルスタック | 3.00 | 3.8 | 3.24 |
| パターン4: BaaS | 2.71 | 3.6 | 2.98 |

**加重比率の根拠:** テンプレート適性(7):Stripe連携(3)。理由は、テンプレートの主目的はユーザー管理であり、Stripe連携は将来の拡張要件であるため。

---

## E. 結論

### v2の結論は変わらない — パターン1 (PRP案) を引き続き強く推奨

**理由:**

1. **Stripe公式ドキュメントがExpress + Node.jsを標準構成として採用** — サンプルコードがそのまま使える
2. **Webhook実装がExpress標準** — `express.raw()` ミドルウェアで即対応。追加ライブラリ不要
3. **DB操作が最もシンプル** — `ALTER TABLE users ADD COLUMN stripe_customer_id TEXT` で完了
4. **認証→Stripe連携が透明** — セッションからuser_id → DBからstripe_customer_id。ブラックボックスなし
5. **SQLiteの制限はテンプレート用途で問題にならない** — Webhookの同時処理はWALモードで十分対応可能

### Stripe連携を見据えた推奨テンプレート構成

```
Express + SQLite (better-sqlite3) + bcrypt + express-session + stripe

usersテーブル拡張:
  id INTEGER PRIMARY KEY
  email TEXT UNIQUE
  password_hash TEXT
  stripe_customer_id TEXT      ← Stripe連携時に追加
  created_at DATETIME

subscriptionsテーブル（Stripe連携時に追加）:
  id INTEGER PRIMARY KEY
  user_id INTEGER REFERENCES users(id)
  stripe_subscription_id TEXT
  stripe_price_id TEXT
  status TEXT                   ← active, canceled, past_due等
  current_period_end DATETIME
  created_at DATETIME

processed_webhook_events テーブル（冪等性確保）:
  event_id TEXT PRIMARY KEY
  processed_at DATETIME
```

### 将来の拡張パス（Stripe連携後）

```
パターン1 (ミニマル + Stripe)
  ├→ 本番移行: SQLite → PostgreSQL (Neon/Supabase)  ※Webhookの同時処理が増加した場合
  ├→ 従量課金: stripe.billing.meters API を追加
  ├→ カスタマーポータル: stripe.billingPortal.sessions.create() を追加
  └→ 請求書管理: Stripe Invoicing API を追加
```

### 補足: SQLiteのWebhook処理能力について

SQLiteのWALモード（Write-Ahead Logging）を有効にすれば、読み込みと書き込みの同時実行が可能になる。Stripeの推奨Webhook応答時間（10秒以内）は、SQLiteの書き込み速度で十分クリアできる。月間数万件のWebhookイベント程度であればSQLiteで全く問題ない。本番で月間数十万件を超える場合にPostgreSQLへの移行を検討すればよい。

---

## Sources

- [Stripe Official: Build a subscriptions integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions)
- [Stripe Official: Using webhooks with subscriptions](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Stripe Subscription Payment Implementation: Complete Guide for SaaS (DEV Community, Jan 2026)](https://dev.to/marufrahmanlive/stripe-subscription-payment-implementation-complete-guide-for-saas-applications-m7e)
- [Implement Stripe Webhooks with Express.js (CodingPR)](https://codingpr.com/stripe-webhook/)
- [Stripe Webhooks Implementation Guide (Hooklistener, 2025)](https://www.hooklistener.com/learn/stripe-webhooks-implementation)
- [Stripe Subscription Integration in Node.js (DEV Community, 2024)](https://dev.to/ivanivanovv/stripe-subscription-integration-in-nodejs-2024-ultimate-guide-2ba3)
- [Modern Stripe Payment Integration with Webhooks (Medium)](https://medium.com/@csksarathi07/modern-stripe-payment-integration-a-step-by-step-guide-with-webhooks-es6-163c1c69fe85)
- [Supabase Stripe Sync Engine](https://supabase.com/blog/stripe-sync-engine-integration)
- [Supabase Stripe Foreign Data Wrapper](https://supabase.com/docs/guides/database/extensions/wrappers/stripe)
- [Stripe + Next.js 15: The Complete 2025 Guide (Pedro Alonso)](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/)
- [NextAuth + Prisma + Stripe (GitHub)](https://github.com/BastidaNicolas/nextauth-prisma-stripe)
- [Vercel nextjs-subscription-payments (GitHub)](https://github.com/vercel/nextjs-subscription-payments)
- [Stripe Integration Guide for Next.js 15 with Supabase (DEV Community)](https://dev.to/flnzba/33-stripe-integration-guide-for-nextjs-15-with-supabase-13b5)
- [Integrate Stripe Payment with Node.js and Database (Medium)](https://medium.com/@harshilsharmaa51/integrate-stripe-payment-with-nodejs-and-save-it-in-database-42a6b53c479b)
- [Stripe Subscription with Node.js (Creole Studios)](https://www.creolestudios.com/stripe-subscription-with-node-js/)
