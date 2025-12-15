# 技術スタック

## プラットフォーム

- **Google Apps Script**: メインプラットフォーム
- **JavaScript (ES2019)**: プログラミング言語
- **V8ランタイム**: 実行環境

## 開発ツール

- **clasp**: Google Apps Scriptのコマンドラインツール
- **Node.js**: 開発環境
- **TypeScript**: 型安全性（オプション）

## 外部ライブラリ

- **SlackApp**: `1on93YOYfSmV92R5q59NpKmsyWIQD8qnoLYk-gkQBI92C58SPyA2x1-bq`

## API・サービス連携

- **Discord Webhook API**: 通知送信
- **Slack Bot API**: メッセージ投稿
- **Yahoo Finance API**: 株価データ取得
- **Google Calendar API**: カレンダー操作
- **Google Spreadsheet API**: データ記録
- **Backlog Webhook**: イベント受信

## 設定管理

- **スクリプトプロパティ**: 環境変数の管理
- **appsscript.json**: プロジェクト設定とメタデータ

## 共通コマンド

### プロジェクト作成
```bash
clasp create --type standalone --title "プロジェクト名"
```

### デプロイ・同期
```bash
# コードのプッシュ
clasp push

# コードのプル
clasp pull

# ログの確認
clasp logs

# プロジェクトを開く
clasp open
```

### 認証
```bash
# Google Apps Scriptにログイン
clasp login
```

## TypeScript設定（オプション）

```json
{
  "compilerOptions": {
    "target": "ES2019",
    "module": "None",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "lib": ["esnext"],
    "experimentalDecorators": true
  },
  "include": ["src"]
}
```

## 実行環境設定

- **タイムゾーン**: Asia/Tokyo
- **例外ログ**: STACKDRIVER
- **Webアプリアクセス**: ANYONE_ANONYMOUS（Webhook用）
- **実行者**: USER_DEPLOYING