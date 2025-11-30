# Backlog Webhook to Discord

BacklogのWebhookを受信し、カテゴリに応じて適切なDiscordチャンネルに通知を送信するGoogle Apps Scriptです。

## 🎯 機能

- Backlogの課題作成・更新・コメント追加をDiscordに通知
- カテゴリ別のWebhook URL設定（複数チャンネル対応）
- エラーハンドリングと詳細なログ出力
- Webhookデータのバリデーション

## 📋 前提条件

- BacklogのWebhook設定
- Discord Webhook URL
- Google Apps Scriptの実行権限

## ⚙️ セットアップ

### 1. BacklogのWebhook設定

1. Backlogのプロジェクト設定でWebhookを有効化
2. Webhook URLを設定（Google Apps ScriptのデプロイURL）
3. 通知したいイベントを選択：
   - 課題の追加
   - 課題の更新
   - コメントの追加

### 2. Discord Webhookの作成

1. Discordサーバーの設定 → 統合機能 → Webhook
2. 新しいWebhookを作成
3. Webhook URLをコピー

### 3. Google Apps Scriptの設定

#### appsscript.jsonでの設定

```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "access": "ANYONE_ANONYMOUS",
    "executeAs": "USER_DEPLOYING"
  }
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
        -   `BACKLOG_URL`: `{YOUR_BACKLOG_DOMAIN}.backlog.(jp|com)`
        -   `DISCORD_WEBHOOK_URL`: `https://discord.com/api/webhooks/your-webhook-url`
        -   `CATEGORY_MAP`: `{"カテゴリID1":"WebhookURL1", "カテゴリID2":"WebhookURL2"}` (JSON形式)
3.  **保存**:
    「スクリプトプロパティを保存」をクリックします。

#### カテゴリ別Webhook設定

カテゴリごとの通知先Webhook URLは、スクリプトプロパティの `CATEGORY_MAP` で設定します。
キーにBacklogのカテゴリID、値にそのカテゴリに対応するDiscordのWebhook URLをJSON形式で指定してください。

**例:**
```json
{
  "1695590": "https://discord.com/api/webhooks/your-category-specific-webhook",
  "100": "https://discord.com/api/webhooks/another-category-webhook"
}
```

この設定は、`doPost`関数内の`CATEGORY_WEBHOOK_MAP`に反映されます。

### 4. デプロイ

```bash
# コードをプッシュ
clasp push

# Webアプリとしてデプロイ
clasp deploy
```

## 🔧 使用方法

### メイン関数

```javascript
// Webhookエンドポイント（自動実行）
function doPost(e) {
  // BacklogからのWebhookを受信して処理
}
```

### テスト関数

```javascript
// 設定確認
checkConfiguration();

// Webhook処理テスト
testWebhookProcessing();
```

## 📊 通知内容

### 課題作成時
```
新たに課題が追加されました。
https://{YOUR_BACKLOG_DOMAIN}.backlog.(jp|com)/view/PROJECT-123
件名: 課題のタイトル
担当: 担当者名
```

### 課題更新時
```
新たに課題が更新されました。
https://{YOUR_BACKLOG_DOMAIN}.backlog.(jp|com)/view/PROJECT-123
件名: 課題のタイトル
担当: 担当者名
```

### コメント追加時
```
コメントが追加されました。
https://{YOUR_BACKLOG_DOMAIN}.backlog.(jp|com)/view/PROJECT-123
件名: 課題のタイトル
担当: 担当者名
```

## 🔍 ログ出力

構造化ログで詳細な情報を出力：

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "INFO",
  "message": "Webhook受信開始",
  "data": {
    "type": 1,
    "projectKey": "PROJECT",
    "contentKey": 123
  }
}
```

## 🛠 トラブルシューティング

### よくある問題

1. **Webhookが受信されない**
   - BacklogのWebhook設定を確認
   - Google Apps ScriptのデプロイURLを確認
   - アクセス権限を確認

2. **Discordに通知されない**
   - Webhook URLの形式を確認
   - Discordチャンネルの権限を確認
   - ログでエラー内容を確認

3. **カテゴリ別通知が動作しない**
   - カテゴリIDが正しいか確認
   - `CATEGORY_WEBHOOK_MAP`の設定を確認

### デバッグ方法

```javascript
// 設定確認
checkConfiguration();

// ログ確認
console.log('デバッグ情報');
```

## 📝 カスタマイズ

### 通知メッセージの変更

`createIssueCreatedMessage`、`createIssueUpdatedMessage`、`createCommentAddedMessage`関数を編集：

```javascript
function createIssueCreatedMessage(project, content, createdUser) {
  return `🎉 新しい課題が作成されました！
📋 ${content.summary}
👤 ${createdUser.name}
🔗 https://${BACKLOG_URL}/view/${project.projectKey}-${content.key_id}`;
}
```

### カテゴリ判定ロジックの変更

`getWebhookUrlForCategories`関数を編集して、独自の判定ロジックを追加できます。

## 🔗 関連リンク

- [Backlog Webhook API](https://developer.nulab.com/docs/backlog/api/2/add-webhook/)
- [Discord Webhook API](https://discord.com/developers/docs/resources/webhook)
- [Google Apps Script](https://developers.google.com/apps-script) 