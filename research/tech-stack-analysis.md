# Tech Stack Analysis - User Management Dev Template

**Date:** 2026-02-01
**Author:** Researcher Agent
**Status:** Complete

---

## 1. 認証・ユーザー管理

### 比較表

| 項目 | bcrypt + express-session (PRP案) | Passport.js | JWT (jsonwebtoken) |
|------|----------------------------------|-------------|-------------------|
| **概要** | パスワードハッシュ + サーバーサイドセッション | 認証ミドルウェア (300+ストラテジー) | ステートレストークン認証 |
| **学習コスト** | 低 | 中 | 中 |
| **依存パッケージ数** | 2 (bcrypt, express-session) | 3+ (passport, passport-local, express-session等) | 2 (bcrypt, jsonwebtoken) |
| **セットアップ複雑度** | 低 | 中 (ストラテジー設定が必要) | 低〜中 |
| **セキュリティ** | 高 (サーバー側でセッション管理) | 高 (実績豊富) | 中 (トークン失効管理が必要) |
| **スケーラビリティ** | 低 (セッションストア依存) | ストラテジー次第 | 高 (ステートレス) |
| **OAuth対応** | なし | 容易 (passport-google等) | 手動実装が必要 |
| **テンプレート適性** | ★★★★★ | ★★★☆☆ | ★★★☆☆ |

### 分析

- **bcrypt + express-session** はPRPの要件（シンプルなユーザー登録・ログイン・ログアウト）に最も適合する。依存関係が最小限で、コードの見通しが良く、テンプレートとして理解しやすい。
- **Passport.js** は多機能だが、テンプレートとしては抽象化が過剰。OAuthが不要な本プロジェクトでは利点が薄い。
- **JWT** はAPI/SPA向きであり、サーバーレンダリングのWebアプリには過剰。トークンの失効管理など追加の複雑性が生じる。

### 推奨: **bcrypt + express-session (PRP案を支持)**

理由: 最小依存・最小複雑性でPRP要件を満たす。テンプレートの利用者が認証フローを容易に理解・カスタマイズできる。

---

## 2. データベース

### 比較表

| 項目 | SQLite (better-sqlite3) (PRP案) | PostgreSQL (pg) | MySQL (mysql2) | MongoDB (mongoose) |
|------|----------------------------------|-----------------|----------------|-------------------|
| **セットアップ** | ゼロ設定 (ファイルベース) | サーバーインストール必要 | サーバーインストール必要 | サーバー or Atlas必要 |
| **依存関係** | 1パッケージ | 1パッケージ + 外部DB | 1パッケージ + 外部DB | 1パッケージ + 外部DB |
| **パフォーマンス** | 小〜中規模で非常に高速 | 大規模・複雑クエリに強い | Webアプリに十分 | JSON操作に高速 |
| **同時接続** | 制限あり (単一ファイル) | 高 | 高 | 高 |
| **データモデル** | リレーショナル (SQL) | リレーショナル (SQL) | リレーショナル (SQL) | ドキュメント (JSON/BSON) |
| **ポータビリティ** | ★★★★★ (ファイルコピーのみ) | ★★☆☆☆ | ★★☆☆☆ | ★★☆☆☆ |
| **npmダウンロード/週** | 約243万 | 約800万 | 約400万 | 約200万 |
| **テンプレート適性** | ★★★★★ | ★★★☆☆ | ★★★☆☆ | ★★☆☆☆ |

### 分析

- **better-sqlite3** はゼロ設定で即座に動作し、テンプレートをコピーするだけで新プロジェクトを開始できる。PRPの目標「プロジェクトのコピーで即座に新規プロジェクト開始可能」に最も適合する。同期APIで初心者にも分かりやすい。
- **PostgreSQL / MySQL** は本格的なWebアプリ向けだが、外部DBサーバーの設定が必要でテンプレートの即時利用性を損なう。
- **MongoDB** はスキーマレスで柔軟だが、リレーショナルなユーザー管理にはSQLの方が自然。外部サーバーも必要。

### 推奨: **SQLite (better-sqlite3) (PRP案を支持)**

理由: ゼロ設定・ファイルベースでテンプレートの即時利用性が最高。開発用途では同時接続の制限は問題にならない。将来PostgreSQL等への移行も、SQL互換のため比較的容易。

---

## 3. バックエンドフレームワーク

### 比較表

| 項目 | Express (PRP案) | Fastify | Hono |
|------|-----------------|---------|------|
| **パフォーマンス (req/s)** | 約15,000 | 約30,000 | 約25,000 |
| **メモリ効率** | 基準 | Express比 -20% | Express比 -40% |
| **エコシステム** | ★★★★★ (最大) | ★★★★☆ | ★★★☆☆ (成長中) |
| **学習リソース** | ★★★★★ (最多) | ★★★☆☆ | ★★☆☆☆ |
| **ミドルウェア互換性** | 最も豊富 | Express互換あり | 限定的 |
| **TypeScript対応** | 追加設定必要 | 組み込み | ネイティブ |
| **安定性・実績** | 10年以上 | 5年以上 | 2年程度 |
| **テンプレート適性** | ★★★★★ | ★★★★☆ | ★★★☆☆ |

### 分析

- **Express** はNode.jsのデファクトスタンダード。学習リソース・ミドルウェア・コミュニティが圧倒的に豊富。テンプレートの利用者が問題に遭遇した際に解決策を見つけやすい。
- **Fastify** はパフォーマンスでExpressの約2倍だが、開発テンプレートでは性能差は問題にならない。エコシステムは成熟しつつあるが、Expressには及ばない。
- **Hono** は最新世代でエッジ/サーバーレスに強いが、エコシステムが発展途上。テンプレートとしての安定性に懸念がある。

### 推奨: **Express (PRP案を支持)**

理由: 圧倒的なエコシステムと学習リソース。テンプレートとして最も多くの開発者が即座に理解・拡張できる。パフォーマンスは開発テンプレートの用途では問題にならない。

---

## 4. フロントエンド

### 比較表

| 項目 | Vanilla JS + HTML/CSS (PRP案) | EJS | Pug |
|------|-------------------------------|-----|-----|
| **依存関係** | なし | 1パッケージ | 1パッケージ |
| **学習コスト** | なし | 低 (HTML + JSの知識で可) | 中〜高 (独自構文) |
| **テンプレート再利用** | 手動 (コピー) | パーシャル対応 | ミックスイン + 継承 |
| **レイアウト機能** | なし | 限定的 | 強力 |
| **パフォーマンス** | 最速 (プリプロセス不要) | 高速 | やや遅い (前処理あり) |
| **デバッグ容易性** | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| **テンプレート適性** | ★★★★☆ | ★★★★★ | ★★★☆☆ |

### 分析

- **Vanilla JS + HTML/CSS** はゼロ依存で最もシンプル。ただし、ページ間の共通レイアウト（ヘッダー、フッター等）の再利用が手動になる。
- **EJS** はHTML構文をそのまま使えるため学習コストが極めて低く、パーシャルによるレイアウト再利用が可能。サーバーサイドレンダリングとの親和性が高い。
- **Pug** は独自のインデント構文が必要で、テンプレートの利用者に追加の学習コストを要求する。

### 推奨: **EJS (PRP案から変更を提案)**

理由: Vanilla JSに比べて依存関係は1つ増えるだけだが、レイアウト再利用・サーバーサイドレンダリングの利便性が大幅に向上する。HTML構文をそのまま使えるため、Vanilla JSからの移行コストはほぼゼロ。ただし、PRP案のVanilla JS + 静的HTMLでもPRPの要件は十分に満たせるため、最終判断はArchitectに委ねる。

---

## 5. 推奨構成まとめ

| レイヤー | 推奨技術 | PRP案との一致 |
|----------|----------|---------------|
| **バックエンド** | Express | 一致 |
| **データベース** | SQLite (better-sqlite3) | 一致 |
| **認証** | bcrypt + express-session | 一致 |
| **フロントエンド** | EJS (または Vanilla JS) | 変更提案 (軽微) |

### 総合評価

PRP案の技術スタックは「再利用可能な開発テンプレート」という目的に対して極めて適切である。主な理由:

1. **ゼロ設定で即座に動作**: SQLiteのファイルベースDBにより、外部サービス不要
2. **最小依存関係**: セキュリティリスクとメンテナンスコストを最小化
3. **広範な学習リソース**: Express + SQLiteは最も情報が豊富な組み合わせの一つ
4. **拡張容易性**: 各レイヤーが疎結合で、PostgreSQL移行やJWT追加等が容易

唯一の提案として、フロントエンドにEJSの採用を検討することで、サーバーサイドレンダリングとレイアウト再利用の利便性が向上する。ただしこれは必須ではなく、Vanilla JSでもPRPの要件は十分に満たせる。

---

## Sources

- [npm-compare: bcrypt, express-session, jsonwebtoken, passport](https://npm-compare.com/bcrypt,express-session,jsonwebtoken,passport)
- [RunCloud: SQLite vs MySQL vs PostgreSQL](https://runcloud.io/blog/sqlite-vs-mysql-vs-postgresql)
- [DEV Community: Understanding Better-SQLite3](https://dev.to/lovestaco/understanding-better-sqlite3-the-fastest-sqlite-library-for-nodejs-4n8)
- [Medium: Fastify vs Express vs Hono](https://medium.com/@arifdewi/fastify-vs-express-vs-hono-choosing-the-right-node-js-framework-for-your-project-da629adebd4e)
- [Medium: Benchmarks - Hono, Fastify, Express](https://medium.com/@sohail_saifii/i-built-the-same-backend-in-hono-fastify-and-express-the-benchmarks-were-shocking-8b23d606e0e4)
- [Level Up Coding: Hono vs Express vs Fastify 2025 Architecture Guide](https://levelup.gitconnected.com/hono-vs-express-vs-fastify-the-2025-architecture-guide-for-next-js-5a13f6e12766)
- [CBT Nuggets: EJS vs Pug vs Handlebars](https://www.cbtnuggets.com/blog/technology/devops/ejs-vs-pug-vs-handlebars)
- [GeeksforGeeks: Choosing the Best View Engine for Node.js](https://www.geeksforgeeks.org/node-js/choosing-the-best-view-engine-for-node-js-ejs-jade-or-pug/)
- [Fastify Official Benchmarks](https://fastify.dev/benchmarks/)
- [npm: better-sqlite3](https://www.npmjs.com/package/better-sqlite3)
- [StackShare: MongoDB vs SQLite](https://stackshare.io/stackups/mongodb-vs-sqlite)
- [Airbyte: MongoDB vs SQLite Key Differences](https://airbyte.com/data-engineering-resources/mongodb-vs-sqlite)
