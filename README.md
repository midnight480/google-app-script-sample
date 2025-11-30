# Google Apps Script サンプル集

このリポジトリは、Google Apps Scriptを使用した各種自動化スクリプトのサンプル集です。各スクリプトは独立して動作し、Webhook、通知、データ処理などの機能を提供します。

## 📋 目次

- [概要](#概要)
- [セットアップ手順](#セットアップ手順)
- [各スクリプトの説明](#各スクリプトの説明)
- [使用方法](#使用方法)
- [トラブルシューティング](#トラブルシューティング)
- [開発環境](#開発環境)

## 🎯 概要

このリポジトリには以下のスクリプトが含まれています：

1. **Backlog Webhook to Discord** - BacklogのWebhookをDiscordに転送
2. **Backlog Webhook Receiver** - BacklogのWebhookデータをスプレッドシートに記録
3. **Calendar to Discord** - Google Calendarの予定をDiscordに通知
4. **Saga Garbage Notify** - 佐賀市のごみ収集日をDiscordに通知
5. **Stock Notify Slack** - 株価情報をSlackに通知
6. **Get RSS Feed** - RSSフィードのURLを処理

## 🚀 セットアップ手順

### 1. 環境準備

```bash
# claspのインストール
npm install -g @google/clasp

# Google Apps Scriptにログイン
clasp login

# プロジェクトの作成（各スクリプトごと）
clasp create --type standalone --title "Backlog Webhook to Discord"
```

### 2. 各スクリプトの設定

#### 方法1: appsscript.jsonでの設定（推奨）

各スクリプトの`appsscript.json`ファイルで環境変数を設定できます：

```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "scriptProperties": {
    "DISCORD_WEBHOOK_URL": "https://discord.com/api/webhooks/your-webhook-url",
    "CALENDAR_ID": "your-calendar-id@group.calendar.google.com",
    "SPREADSHEET_ID": "your-spreadsheet-id"
  }
}
```

#### 方法2: スクリプトプロパティでの設定

Google Apps Scriptのエディタで「プロジェクトの設定」→「スクリプトプロパティ」から設定：

| プロパティ名 | 値 | 説明 |
|-------------|----|------|
| `DISCORD_WEBHOOK_URL` | `https://discord.com/api/webhooks/...` | Discord Webhook URL |
| `CALENDAR_ID` | `your-calendar-id@group.calendar.google.com` | Google Calendar ID |
| `SPREADSHEET_ID` | `1ABC...` | Google Spreadsheet ID |
| `SLACK_BOT_TOKEN` | `xoxb-...` | Slack Bot Token |
| `STOCK_CODE` | `7203` | 証券コード |

#### Backlog Webhook to Discord

1. `backlog-webhook-discord/appsscript.json`を編集：
   ```json
   {
     "scriptProperties": {
       "BACKLOG_URL": "{YOUR_BACKLOG_DOMAIN}.backlog.(jp|com)",
       "DISCORD_WEBHOOK_URL": "YOUR_DISCORD_WEBHOOK_URL_HERE"
     }
   }
   ```

#### Backlog Webhook Receiver

1. `backlog-webhook-receiver/appsscript.json`を編集：
   ```json
   {
     "scriptProperties": {
       "SPREADSHEET_ID": "YOUR_SPREADSHEET_ID_HERE"
     }
   }
   ```

#### Calendar to Discord

1. `calendar-to-discord/appsscript.json`を編集：
   ```json
   {
     "scriptProperties": {
       "CALENDAR_ID": "YOUR_GOOGLE_CALENDAR_ID_HERE",
       "DISCORD_WEBHOOK_URL": "YOUR_DISCORD_WEBHOOK_URL_HERE"
     }
   }
   ```

#### Saga Garbage Notify

1. `saga-garbage-notify/appsscript.json`を編集：
   ```json
   {
     "scriptProperties": {
       "DISCORD_WEBHOOK_URL": "YOUR_DISCORD_WEBHOOK_URL_HERE"
     }
   }
   ```

#### Stock Notify Slack

1. `stockNotifySlack/appsscript.json`を編集：
   ```json
   {
     "scriptProperties": {
       "STOCK_CODE": "7203",
       "SLACK_BOT_TOKEN": "xoxb-XXXX",
       "SLACK_CHANNEL": "#general"
     }
   }
   ```

#### Get RSS Feed

1. `get-rss-feed/appsscript.json`を編集：
   ```json
   {
     "scriptProperties": {
       "SOURCE_SPREADSHEET_ID": "YOUR_SOURCE_SPREADSHEET_ID_HERE",
       "SOURCE_SHEET_NAME": "YOUR_SOURCE_SHEET_NAME_HERE",
       "SOURCE_COLUMN_NAME": "YOUR_SOURCE_COLUMN_NAME_HERE",
       "TARGET_SPREADSHEET_ID": "YOUR_TARGET_SPREADSHEET_ID_HERE",
       "TARGET_SHEET_NAME": "YOUR_TARGET_SHEET_NAME_HERE",
       "TARGET_COLUMN_NAME": "YOUR_TARGET_COLUMN_NAME_HERE"
     }
   }
   ```

### 3. 設定の適用

```bash
# コードをプッシュ
clasp push

# 設定を確認
clasp open
```

## 📖 各スクリプトの説明

### Backlog Webhook to Discord

BacklogのWebhookを受信し、カテゴリに応じて適切なDiscordチャンネルに通知を送信します。

**機能：**
- 課題の作成・更新・コメント追加の通知
- カテゴリ別のWebhook URL設定
- エラーハンドリングとログ出力

**設定項目：**
- `BACKLOG_URL`: BacklogのURL
- `DISCORD_WEBHOOK_URL`: Discord Webhook URL（デフォルト）

### Backlog Webhook Receiver

BacklogのWebhookデータを受信し、スプレッドシートに記録します。

**機能：**
- RAWデータの記録
- 構造化ログデータの記録
- 自動シート作成

**設定項目：**
- `SPREADSHEET_ID`: スプレッドシートID

### Calendar to Discord

Google Calendarの予定を取得し、Discordに通知します。

**機能：**
- 指定期間の予定取得
- Discord Embed形式での通知
- エラーハンドリング

**設定項目：**
- `CALENDAR_ID`: Google Calendar ID
- `DISCORD_WEBHOOK_URL`: Discord Webhook URL

### Saga Garbage Notify

佐賀市のごみ収集スケジュールに基づいて通知を送信します。

**機能：**
- 曜日・週による収集日判定
- 燃えるごみ、ペットボトル、燃えないゴミ、資源物の判定
- 朝・夕の時間帯による通知制御

**設定項目：**
- `DISCORD_WEBHOOK_URL`: Discord Webhook URL

### Stock Notify Slack

Yahoo Financeから株価情報を取得し、Slackに通知します。

**機能：**
- リアルタイム株価取得
- 前日比・変動率の計算
- SlackAppライブラリを使用

**設定項目：**
- `STOCK_CODE`: 証券コード
- `SLACK_BOT_TOKEN`: Slack Bot Token
- `SLACK_CHANNEL`: 投稿先チャンネル

### Get RSS Feed

スプレッドシートからRSSフィードのURLを取得し、重複を排除して別のスプレッドシートに書き込みます。

**機能：**
- RSS 1.0形式のURL判定
- 重複排除
- バッチ処理

**設定項目：**
- `SOURCE_SPREADSHEET_ID`: ソーススプレッドシートID
- `SOURCE_SHEET_NAME`: ソースシート名
- `SOURCE_COLUMN_NAME`: ソース列名
- `TARGET_SPREADSHEET_ID`: ターゲットスプレッドシートID
- `TARGET_SHEET_NAME`: ターゲットシート名
- `TARGET_COLUMN_NAME`: ターゲット列名

## 🔧 使用方法

### 基本的な実行方法

1. **手動実行**
   ```javascript
   // 各スクリプトのメイン関数を実行
   main();
   notifyTrashCollection();
   postStockPriceComparisonToSlack();
   getAndWriteRssUrls();
   ```

2. **トリガー設定**
   - Google Apps Scriptのトリガー機能を使用
   - 時間ベースの定期実行
   - Webhookベースの即座実行

### テスト関数

各スクリプトにはテスト関数が含まれています：

```javascript
// 設定確認
checkConfiguration();

// 機能テスト
testWebhookProcessing();
testTrashCollectionLogic();
testCalendarAccess();
testStockPriceAPI();
testRssUrlValidation();
```

### ログ確認

各スクリプトは構造化ログを出力します：

```javascript
// ログレベル
logInfo('情報メッセージ', { data: 'value' });
logWarning('警告メッセージ', { data: 'value' });
logError('エラーメッセージ', error);
```

## 🛠 トラブルシューティング

### よくある問題

1. **Webhook URLが無効**
   - Discord Webhook URLの形式を確認
   - URLが正しく設定されているか確認

2. **スプレッドシートアクセスエラー**
   - スプレッドシートの共有設定を確認
   - スプレッドシートIDが正しいか確認

3. **Calendarアクセスエラー**
   - Google Calendarの共有設定を確認
   - Calendar IDが正しいか確認

4. **Slack送信エラー**
   - Bot Tokenが正しいか確認
   - チャンネル名が正しいか確認

### デバッグ方法

1. **ログ確認**
   ```javascript
   // 実行ログを確認
   console.log('デバッグ情報');
   ```

2. **設定確認**
   ```javascript
   // 設定値を確認
   checkConfiguration();
   ```

3. **テスト実行**
   ```javascript
   // 各テスト関数を実行
   testWebhookProcessing();
   ```

## 🏗 開発環境

### 必要なツール

- **clasp**: Google Apps Scriptのコマンドラインツール
- **Node.js**: 開発環境
- **TypeScript**: 型安全性（オプション）

### TypeScript設定

```json
// tsconfig.json
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

### ライブラリ

- **SlackApp**: `1on93YOYfSmV92R5q59NpKmsyWIQD8qnoLYk-gkQBI92C58SPyA2x1-bq`

### コマンド

```bash
# プロジェクトの作成
clasp create --type standalone --title "プロジェクト名"

# コードのプッシュ
clasp push

# コードのプル
clasp pull

# ログの確認
clasp logs
```

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 貢献

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📞 サポート

問題や質問がある場合は、GitHubのIssuesページでお知らせください。
