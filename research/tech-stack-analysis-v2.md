# Tech Stack Analysis v2 - 拡張比較調査

**Date:** 2026-02-01
**Author:** Researcher Agent
**Status:** Complete
**前回調査:** [tech-stack-analysis.md](./tech-stack-analysis.md) (PRP案内の技術比較)

---

## 概要

前回調査ではPRP案内の選択肢（Express, SQLite, bcrypt等）を比較した。本調査では、外部サービス・BaaS・フルスタックフレームワークを含む**4つの構成パターン**を横断的に評価し、「再利用可能な開発テンプレート」として最適な構成を判定する。

---

## A. 認証サービス比較

| 項目 | bcrypt + express-session (PRP案) | Supabase Auth | Clerk | Auth.js (NextAuth v5) |
|------|----------------------------------|---------------|-------|----------------------|
| **タイプ** | ライブラリ (自前実装) | BaaS | SaaS | OSS フレームワーク |
| **セットアップ時間** | 1-2時間 (実装含む) | 30分 | 15-30分 | 1-2時間 |
| **無料枠** | 無制限 (自前) | 50,000 MAU | 10,000 MAU | 無制限 (自前) |
| **UI コンポーネント** | なし (自前実装) | なし (自前実装) | あり (高品質) | なし (自前実装) |
| **OAuth対応** | なし | 組み込み | 組み込み | 組み込み |
| **RLS連携** | なし | PostgreSQL RLS統合 | なし | なし |
| **ベンダーロックイン** | なし | 中 (Supabase依存) | 高 (Clerk依存) | なし |
| **セッション管理** | サーバーサイド (安全) | クライアント側トークン | Clerk管理 | フレームワーク依存 |
| **MFA** | 自前実装が必要 | サードパーティ連携 | 組み込み | 自前実装が必要 |
| **学習コスト** | 低 (基礎的な概念) | 中 | 低 (SDK充実) | 中 (v5はまだbeta) |
| **ドキュメント品質** | N/A (基本ライブラリ) | 良好 | 非常に良好 | 良好だがv5は発展途上 |
| **テンプレート適性** | ★★★★★ | ★★★☆☆ | ★★☆☆☆ | ★★★☆☆ |

### 分析

- **bcrypt + express-session**: 外部依存ゼロ。認証フローの全貌が見え、学習用テンプレートとして最適。PRP要件「OAuth不要、高度な権限管理不要」に完全合致。
- **Supabase Auth**: PostgreSQL RLS統合が強力だが、Supabase DBとセットで使わないと利点が薄い。セッション寿命の設定不可、クライアント側トークン保存にセキュリティ懸念あり。
- **Clerk**: DX最高だが、テンプレートとしては「Clerkアカウント必須」が障壁。Next.js特化であり、Express単体での利用は限定的。価格も規模拡大時に高騰。
- **Auth.js v5**: Next.js前提。v5は2026年1月時点でまだbeta。Express単体では使えない。

---

## B. データベース / ORM 比較

### B-1. データベースサービス

| 項目 | SQLite (better-sqlite3) (PRP案) | Supabase (PostgreSQL) | Neon (PostgreSQL) |
|------|----------------------------------|----------------------|-------------------|
| **タイプ** | 組み込みファイルDB | マネージドBaaS | サーバーレスPostgreSQL |
| **セットアップ** | ゼロ設定 | アカウント登録 + プロジェクト作成 | アカウント登録 + DB作成 |
| **無料枠** | 無制限 (ローカル) | 500MB, Nano (0.5GB RAM) | 0.5GB/プロジェクト, 100 CU-hours/月 |
| **コスト (有料)** | $0 | $25/月〜 | $19/月〜 |
| **ポータビリティ** | ★★★★★ (ファイルコピー) | ★★★☆☆ (標準PostgreSQL) | ★★★★☆ (標準PostgreSQL) |
| **同時接続** | 制限あり | 高 | 高 (コネクションプーリング) |
| **ブランチング** | なし | なし | あり (DB branching) |
| **スケールtoゼロ** | N/A (常にローカル) | なし (常時稼働) | あり (5分アイドルで停止) |
| **ベンダーロックイン** | なし | 低〜中 (BaaS機能に依存) | 低 (標準PostgreSQL) |
| **git clone後の利用** | 即座に可能 | 環境変数設定が必要 | 環境変数設定が必要 |
| **テンプレート適性** | ★★★★★ | ★★★☆☆ | ★★★☆☆ |

**Note (2025年5月):** NeonはDatabricksに$1Bで買収され、価格が大幅に引き下げ（ストレージ: $1.75 → $0.35/GB-month）。

### B-2. ORM

| 項目 | 生SQL (PRP案) | Prisma | Drizzle ORM |
|------|---------------|--------|-------------|
| **アプローチ** | 直接SQL | スキーマファーストコード生成 | コードファースト (SQL-like API) |
| **型安全性** | なし | 完全 (生成された型) | 部分的 (クエリ結果のみ) |
| **バンドルサイズ** | 0 | 大 (Rustエンジン, 2025/11にRust-free化) | ~7KB (minified+gzipped) |
| **コールドスタート** | 最速 | やや遅い (エンジン起動) | 最速級 |
| **マイグレーション** | 手動SQL | 組み込み (prisma migrate) | 組み込み (drizzle-kit) |
| **学習コスト** | 低 (SQL知識のみ) | 中 (Prisma独自API) | 中 (SQL知識が活きる) |
| **SQLite対応** | 当然 | あり | あり |
| **PostgreSQL対応** | 当然 | あり | あり |
| **テンプレート適性** | ★★★★★ | ★★★★☆ | ★★★★☆ |

### 分析

- **生SQL + better-sqlite3**: 依存ゼロ、コード透明、学習に最適。テンプレートのコピーだけで動作。
- **Prisma**: DX優秀だがセットアップに `prisma generate` 等の追加ステップが必要。2025/11のRust-free化でバンドルサイズ改善。
- **Drizzle**: 軽量でSQL思考の開発者に人気。サーバーレス環境に最適だが、テンプレートにはオーバースペック。

---

## C. フレームワーク構成パターン比較

### パターン一覧

| | パターン1 (PRP案) | パターン2 | パターン3 | パターン4 |
|---|---|---|---|---|
| **構成名** | ミニマル | マネージドDB | フルスタック | BaaS |
| **フレームワーク** | Express | Express | Next.js | Express |
| **DB** | SQLite | Supabase (PostgreSQL) | Neon (PostgreSQL) | Supabase (PostgreSQL) |
| **ORM** | 生SQL | Prisma | Drizzle or Prisma | Supabase Client |
| **認証** | bcrypt + express-session | bcrypt + express-session | Auth.js | Supabase Auth |

### 評価軸別比較

| 評価軸 | パターン1 (ミニマル) | パターン2 (マネージドDB) | パターン3 (フルスタック) | パターン4 (BaaS) |
|--------|---------------------|------------------------|------------------------|-----------------|
| **開発体験 (DX)** | ★★★★☆ シンプルで見通し良い | ★★★★☆ Prismaの型安全性が良い | ★★★★★ Next.jsのDXは最高峰 | ★★★☆☆ Supabase固有の学習が必要 |
| **無料枠 / コスト** | ★★★★★ 完全無料 | ★★★☆☆ Supabase無料枠あるが制限あり | ★★★☆☆ Neon無料枠あるが制限あり | ★★★☆☆ Supabase無料枠あるが制限あり |
| **ベンダーロックイン** | ★★★★★ なし | ★★★☆☆ Supabase依存 | ★★★★☆ Neonは標準PG, Auth.jsはOSS | ★★☆☆☆ Supabase強依存 |
| **テンプレート汎用性** | ★★★★★ あらゆるPJに適用可 | ★★★★☆ PG系PJに適用可 | ★★★☆☆ Next.js PJ限定 | ★★☆☆☆ Supabase PJ限定 |
| **セットアップ容易さ** | ★★★★★ git clone → npm install → 動作 | ★★★☆☆ Supabaseアカウント+環境変数 | ★★☆☆☆ Neonアカウント+Auth.js設定 | ★★★☆☆ Supabaseアカウント+環境変数 |
| **依存関係の安定性** | ★★★★★ 枯れた技術のみ | ★★★★☆ Prismaは安定、Supabase APIは変動あり | ★★★☆☆ Auth.js v5はbeta, Next.js頻繁更新 | ★★★☆☆ Supabase APIは変動あり |
| **学習コスト** | ★★★★★ 基礎知識のみ | ★★★☆☆ Prisma+Supabaseの学習 | ★★☆☆☆ Next.js+Auth.js+Neonの学習 | ★★★☆☆ Supabase固有概念の学習 |

### 総合スコア (7項目平均)

| パターン | スコア |
|---------|--------|
| **パターン1: ミニマル (PRP案)** | **4.86 / 5** |
| パターン2: マネージドDB | 3.43 / 5 |
| パターン3: フルスタック | 3.00 / 5 |
| パターン4: BaaS | 2.71 / 5 |

---

## D. 各パターンの詳細分析

### パターン1: Express + SQLite + bcrypt (PRP案 - ミニマル)

**メリット:**
- git clone後、`npm install` だけで即動作。外部サービスのアカウント登録不要
- 依存パッケージが最小限（express, better-sqlite3, bcrypt, express-session）
- コード全体が見渡せ、認証・DB操作の学習教材としても機能
- ベンダーロックインゼロ。将来のPostgreSQL移行もSQL互換で比較的容易
- 完全にオフラインで開発可能

**デメリット:**
- SQLiteは同時書き込みに制限あり（本番の大規模利用には不向き）
- ORM無しのため型安全性がない（TypeScript + Drizzle等で改善可能）
- UIコンポーネントは自前実装が必要
- OAuth等の拡張は全て自前実装

**最適な用途:** 学習用テンプレート、プロトタイプ、個人プロジェクト、社内ツール

### パターン2: Express + Prisma + Supabase (マネージドDB)

**メリット:**
- Prismaの型安全性とマイグレーション機能
- SupabaseのマネージドPostgreSQLで本番環境にも対応
- Express部分は従来知識が活きる

**デメリット:**
- Supabaseアカウント登録と環境変数設定が必要（「即動作」要件を損なう）
- Prismaの `prisma generate` ステップが追加
- Supabaseの無料枠に制限あり（500MB DB, Nano instance）
- オフライン開発不可（DB接続が必要）

**最適な用途:** PostgreSQLを前提とした中規模Webアプリ開発

### パターン3: Next.js + Auth.js + Neon (フルスタック)

**メリット:**
- Next.jsのDXは最高峰（SSR, App Router, Server Components）
- NeonのDB branchingで開発体験向上
- Auth.jsでOAuth統合が容易

**デメリット:**
- 学習コストが最も高い（Next.js + Auth.js v5 beta + Neon + ORM）
- Auth.js v5はまだbeta、頻繁な破壊的変更のリスク
- Next.js自体の更新が頻繁で、テンプレートのメンテナンスコストが高い
- フロントエンドとバックエンドが密結合（Express APIとして切り出しにくい）
- Neonアカウント登録が必要

**最適な用途:** Next.jsベースの本格的フルスタックアプリ開発

### パターン4: Express + Supabase Auth + Supabase DB (BaaS)

**メリット:**
- 認証とDBが統合されており、RLSでセキュリティが強力
- Supabaseの50,000 MAU無料枠は十分
- リアルタイム機能・ストレージ等の追加機能も利用可能

**デメリット:**
- Supabaseへの強い依存（ベンダーロックインリスク最大）
- Supabase Authのセッション寿命設定不可問題
- クライアント側トークン保存のセキュリティ懸念
- テンプレートを別プロジェクトにコピーするたびにSupabaseプロジェクト新規作成が必要
- Supabase独自の概念（RLS, Edge Functions等）の学習コスト

**最適な用途:** Supabaseエコシステムを全面採用するプロジェクト

---

## E. 推奨構成

### 第1推奨: パターン1 (ミニマル) - PRP案を強く支持

```
Express + SQLite (better-sqlite3) + bcrypt + express-session
```

**理由:**

1. **「git cloneで即動作」要件に唯一完全合致** - 外部サービスのアカウント登録が一切不要
2. **ベンダーロックインゼロ** - 全てOSS、全てローカル動作
3. **最小依存関係** - メンテナンスコスト最小、セキュリティリスク最小
4. **最高の学習効率** - コード全体が見渡せ、ブラックボックスがない
5. **拡張性** - SQLからPostgreSQL移行、セッションからJWT移行など、段階的な拡張が可能
6. **完全オフライン開発可能** - ネットワーク不要

### 将来の拡張パス（テンプレートから発展する場合）

```
パターン1 (ミニマル)
  ├→ DB拡張: better-sqlite3 → Drizzle ORM + PostgreSQL (Neon/Supabase)
  ├→ 認証拡張: bcrypt → Supabase Auth or Auth.js
  └→ FW拡張: Express → Next.js (フロントエンド統合が必要な場合)
```

テンプレートは**出発点**であり、プロジェクトの要件に応じて各レイヤーを個別にアップグレードできる設計が望ましい。パターン1はこの段階的拡張に最も適している。

---

## Sources

- [Clerk vs Supabase Auth vs NextAuth.js: Production Reality (Medium, Dec 2025)](https://medium.com/better-dev-nextjs-react/clerk-vs-supabase-auth-vs-nextauth-js-the-production-reality-nobody-tells-you-a4b8f0993e1b)
- [Comparing Auth Providers (hyperknot blog)](https://blog.hyperknot.com/p/comparing-auth-providers)
- [Clerk Pricing](https://clerk.com/pricing)
- [Clerk vs Supabase Auth (clerk.com)](https://clerk.com/articles/clerk-vs-supabase-auth)
- [Neon Serverless Postgres Pricing 2026 (Vela)](https://vela.simplyblock.io/articles/neon-serverless-postgres-pricing-2026/)
- [Neon vs Supabase: Complete Comparison 2025 (Vela)](https://vela.simplyblock.io/neon-vs-supabase/)
- [Supabase vs Neon Comparison (Leanware)](https://www.leanware.co/insights/supabase-vs-neon)
- [Supabase vs Neon: Free Tier Comparison 2025 (FreeTiers)](https://www.freetiers.com/blog/supabase-vs-neon-comparison)
- [Drizzle vs Prisma: Better TypeScript ORM 2025 (Bytebase)](https://www.bytebase.com/blog/drizzle-vs-prisma/)
- [Prisma vs Drizzle ORM in 2026 (Medium)](https://medium.com/@thebelcoder/prisma-vs-drizzle-orm-in-2026-what-you-really-need-to-know-9598cf4eaa7c)
- [Node.js ORMs in 2025 (TheDataGuy)](https://thedataguy.pro/blog/2025/12/nodejs-orm-comparison-2025/)
- [Prisma ORM vs Drizzle (Prisma Docs)](https://www.prisma.io/docs/orm/more/comparisons/prisma-and-drizzle)
- [Hono vs Express vs Fastify 2025 Architecture Guide (Level Up Coding)](https://levelup.gitconnected.com/hono-vs-express-vs-fastify-the-2025-architecture-guide-for-next-js-5a13f6e12766)
- [Neon Pricing](https://neon.com/pricing)
- [better-sqlite3 (npm)](https://www.npmjs.com/package/better-sqlite3)
- [better-sqlite3 (GitHub)](https://github.com/WiseLibs/better-sqlite3)
