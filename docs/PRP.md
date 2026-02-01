# Product Requirements Plan (PRP)

**Project Name:** User Management Dev Template
**Date:** 2026-02-01
**Author:** Developer
**Status:** Draft

---

## 1. 概要 (Overview)

ユーザー管理機能とデータベース機能を持つWebアプリケーションの再利用可能な開発テンプレート。
このテンプレートを基に、新しいプロジェクトを素早く立ち上げることができる。

## 2. 目的と目標 (Objectives)

*   **Primary Goal**: ユーザー認証・管理とDB操作の基盤テンプレートを作成
*   **Success Metrics**:
    *   [ ] プロジェクトのコピーで即座に新規プロジェクト開始可能
    *   [ ] ユーザー登録・ログイン・ログアウトが動作
    *   [ ] DBのCRUD操作が動作

## 3. スコープ (Scope)

### In Scope
*   ユーザー登録 (Email/Password)
*   ログイン・ログアウト
*   セッション管理
*   SQLite データベース
*   基本的なCRUD API
*   シンプルなUIダッシュボード

### Out of Scope
*   OAuth連携 (Google, GitHub等)
*   高度な権限管理 (RBAC)
*   メール送信機能
*   デプロイ設定

## 4. 技術仕様 (Technical Spec)

### Tech Stack
*   **Frontend**: HTML + Vanilla JS + CSS
*   **Backend**: Node.js + Express
*   **Database**: SQLite (better-sqlite3)
*   **Authentication**: bcrypt + express-session

### Architecture Notes
- シンプルなMVC構造
- テンプレートとして拡張しやすい設計
- 依存関係は最小限に抑える

## 5. タスク分割 (Task Breakdown)

| Track | タスク | 担当Agent | 依存関係 | 見積 |
|:------|:-------|:----------|:---------|:-----|
| A | Express サーバー初期設定 | Senior-Coder | なし | 30m |
| A | SQLite DB設定・User テーブル作成 | Senior-Coder | なし | 30m |
| A | ユーザー登録 API | Senior-Coder | DB設定 | 45m |
| A | ログイン/ログアウト API | Senior-Coder | 登録API | 45m |
| B | フロントエンド: 登録/ログイン画面 | Senior-Coder | なし | 1h |
| B | フロントエンド: ダッシュボード | Senior-Coder | ログイン画面 | 45m |
| C | 統合テスト | QA-Tester | 全実装完了 | 1h |

## 6. 検証計画 (Verification Plan)

*   [ ] ユーザー登録が成功する
*   [ ] 重複メールでの登録が失敗する
*   [ ] ログイン成功でダッシュボードへ遷移
*   [ ] ログアウト後に保護ページにアクセス不可
*   [ ] ブラウザテストで全フロー確認

## 7. リスクと対策 (Risks)

| リスク | 影響度 | 対策 |
|:-------|:-------|:-----|
| SQLite並行処理制限 | Low | 開発用テンプレートなので許容 |
| セッションの永続化 | Low | メモリストアで開発用途には十分 |

---

*Approved by:*
*Approved Date:*
