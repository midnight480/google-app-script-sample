# Google Calendar to Discord

Google CalendarのイベントをDiscordに通知するGoogle Apps Scriptです。指定したカレンダーのイベントを定期的にチェックし、Discordチャンネルに通知を送信します。

## 🎯 機能

- Google CalendarのイベントをDiscordに通知
- 指定したカレンダーIDのイベントを取得
- エラーハンドリングと詳細なログ出力
- イベントデータのバリデーション
- 定期実行による自動通知

## 📋 前提条件

- Google Calendar APIの有効化
- Discord Webhook URL
- Google Apps Scriptの実行権限
- 対象のGoogle Calendarへのアクセス権限

## ⚙️ セットアップ

### 1. Google Calendar APIの有効化

1. Google Cloud ConsoleでGoogle Calendar APIを有効化
2. Google Apps ScriptプロジェクトでCalendar APIを有効化

### 2. Discord Webhookの作成

1. Discordサーバーの設定 → 統合機能 → Webhook
2. 新しいWebhookを作成
3. Webhook URLをコピー

### 3. Google Apps Scriptの設定

#### appsscript.jsonでの設定

```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {
    "enabledAdvancedServices": [{
      "userSymbol": "Calendar",
      "serviceId": "calendar",
      "version": "v3"
    }]
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```

#### スクリプトプロパティの設定

環境変数はGoogle Apps Scriptのエディタで設定します。

1.  **Google Apps Scriptエディタを開く**:
    `clasp open`コマンドを実行するか、ブラウザで直接開きます。
2.  **スクリプトプロパティの設定**:
    -   エディタの左側メニューから「プロジェクトの設定」（歯車アイコン）をクリックします。
    -   「スクリプトプロパティ」セクションで、「スクリプトプロパティを追加」をクリックします。
    -   以下のキーと値を設定します。
        -   `CALENDAR_ID`: `your-calendar-id@group.calendar.google.com`
        -   `DISCORD_WEBHOOK_URL`: `https://discord.com/api/webhooks/your-webhook-url`
3.  **保存**:
    「スクリプトプロパティを保存」をクリックします。

#### カレンダーIDの取得方法

1. Google Calendarを開く
2. 対象のカレンダーの設定を開く
3. 「カレンダーの統合」セクションでカレンダーIDを確認
4. プライマリカレンダーの場合：`primary`
5. 共有カレンダーの場合：`xxx@group.calendar.google.com`

### 4. 権限設定

初回実行時に以下の権限を許可：

- Google Calendarの読み取り権限
- 外部サービスへの接続権限

### 5. デプロイ

```bash
# コードをプッシュ
clasp push

# 定期実行の設定
# Google Apps Scriptのトリガー設定で定期実行を設定
```

## 🔧 使用方法

### メイン関数

```javascript
// 定期実行用のメイン関数
function checkCalendarEvents() {
  // カレンダーイベントをチェックしてDiscordに通知
}

// 手動実行用のテスト関数
function testCalendarNotification() {
  // テスト用の通知を送信
}
```

### 定期実行の設定

1. Google Apps Scriptエディタで「トリガー」を開く
2. 「トリガーを追加」をクリック
3. 以下の設定で作成：
   - 実行する関数：`checkCalendarEvents`
   - 実行するデプロイ：`Head`
   - イベントのソース：`時間主導型`
   - 時間ベースのトリガーのタイプ：`分ベースのタイマー`
   - 間隔：`5分おき`（推奨）

## 📊 通知内容

### イベント通知例

```
📅 新しいイベントがあります

📋 イベント名: ミーティング
📅 日時: 2024年1月15日 14:00-15:00
📍 場所: 会議室A
📝 説明: 週次ミーティングを行います
🔗 詳細: https://calendar.google.com/event?eid=xxx
```

### 通知タイミング

- イベント開始5分前
- イベント開始時刻
- カスタム設定可能

## 🔍 ログ出力

構造化ログで詳細な情報を出力：

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "INFO",
  "message": "カレンダーイベント取得開始",
  "data": {
    "calendarId": "primary",
    "timeMin": "2024-01-01T00:00:00Z",
    "timeMax": "2024-01-01T23:59:59Z"
  }
}
```

## 🛠 トラブルシューティング

### よくある問題

1. **カレンダーにアクセスできない**
   - カレンダーIDが正しいか確認
   - カレンダーの共有設定を確認
   - Google Apps Scriptの権限を確認

2. **Discordに通知されない**
   - Webhook URLの形式を確認
   - Discordチャンネルの権限を確認
   - ログでエラー内容を確認

3. **定期実行が動作しない**
   - トリガーの設定を確認
   - 関数名が正しいか確認
   - 実行ログでエラーを確認

### デバッグ方法

```javascript
// 設定確認
checkConfiguration();

// カレンダーアクセステスト
testCalendarAccess();

// Discord通知テスト
testDiscordNotification();
```

## 📝 カスタマイズ

### 通知メッセージの変更

`createEventMessage`関数を編集：

```javascript
function createEventMessage(event) {
  const startTime = new Date(event.start.dateTime || event.start.date);
  const endTime = new Date(event.end.dateTime || event.end.date);
  
  return `🎉 新しいイベントがあります！

📋 ${event.summary}
📅 ${formatDateTime(startTime)} - ${formatDateTime(endTime)}
📍 ${event.location || '場所未設定'}
📝 ${event.description || '説明なし'}
🔗 ${event.htmlLink}`;
}
```

### 通知タイミングの変更

`checkCalendarEvents`関数で通知タイミングを調整：

```javascript
// 現在時刻から1時間後のイベントをチェック
const now = new Date();
const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
```

### 複数カレンダー対応

```javascript
const CALENDAR_IDS = [
  'primary',
  'team-calendar@group.calendar.google.com',
  'events@group.calendar.google.com'
];
```

## 🔗 関連リンク

- [Google Calendar API](https://developers.google.com/calendar/api)
- [Discord Webhook API](https://discord.com/developers/docs/resources/webhook)
- [Google Apps Script Calendar Service](https://developers.google.com/apps-script/reference/calendar) 