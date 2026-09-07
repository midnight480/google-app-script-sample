# Backlog Webhook to Discord

BacklogのWebhookを受信し、カテゴリに応じて適切なDiscordチャンネルに通知を送信するGoogle Apps Scriptです。

## 🎯 機能

- Backlogの課題作成・更新・コメント追加をDiscordに通知
- カテゴリ別のWebhook URL設定（複数チャンネル対応）
- 共有シークレット検証による不正POSTの遮断
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

#### プロジェクトの作成（初回のみ）

```bash
clasp create --type standalone --title "Backlog Webhook to Discord"
```

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
    `clasp open-script`コマンドを実行するか、ブラウザで直接開きます。
2.  **スクリプトプロパティの設定**:
    -   エディタの左側メニューから「プロジェクトの設定」（歯車アイコン）をクリックします。
    -   「スクリプトプロパティ」セクションで、「スクリプトプロパティを追加」をクリックします。
    -   以下のキーと値を設定します。
        -   `BACKLOG_URL`: `{YOUR_BACKLOG_DOMAIN}.backlog.(jp|com)`
        -   `DISCORD_WEBHOOK_URL`: `https://discord.com/api/webhooks/your-webhook-url`
        -   `CATEGORY_MAP`: `{"カテゴリID1":"WebhookURL1", "カテゴリID2":"WebhookURL2"}` (JSON形式)
        -   `WEBHOOK_SECRET`: 共有シークレット（**手動入力不要**。後述の `generateWebhookSecret()` で自動生成）
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

### 5. 共有シークレットの生成（必須）

Webアプリは Backlog からの受信のため、認証なし（`ANYONE_ANONYMOUS`）で公開する必要があります。
URLを知られただけで偽の通知を送られないよう、共有シークレットによる検証を行います。

GASエディタで `generateWebhookSecret` 関数を選択して実行してください。

```
共有シークレットを生成しました。

WEBHOOK_SECRET: 3f9a1c8e7b2d4a6f8c0e1b3d5a7f9c2e

BacklogのWebhookに登録するURL:
https://script.google.com/macros/s/AKfycb.../exec?token=3f9a1c8e7b2d4a6f8c0e1b3d5a7f9c2e
```

表示されたURL（`?token=` 付き）を Backlog の Webhook 設定に登録してください。

> ⚠️ **`WEBHOOK_SECRET` が未設定の間、Webアプリはすべてのリクエストを拒否します。**
> 設定漏れによって無防備な状態で公開されることを防ぐためのフェイルクローズ方式です。
> Backlogから通知が届かない場合は、まずこの設定を確認してください。

> ⚠️ このURLとシークレットは第三者に共有しないでください。

### 6. 設定確認

GASエディタで `checkConfiguration` を実行すると、設定漏れが一覧で出力されます。

## 🔒 セキュリティ

| 対策 | 内容 |
|------|------|
| 共有シークレット検証 | `?token=` の値を `WEBHOOK_SECRET` と照合し、不一致なら破棄 |
| フェイルクローズ | `WEBHOOK_SECRET` 未設定時も受信を拒否する |
| 定数時間比較 | 長さ差・文字差をビット演算で集約し、タイミング攻撃の手掛かりを減らす |
| シークレットの非ログ出力 | 通常のログには出力しない（`generateWebhookSecret()` 実行時のみ表示） |

### シークレットを更新したい場合

`generateWebhookSecret()` を再実行し、表示された新しいURLで Backlog 側の Webhook 設定を更新してください。

## 🔧 使用方法

### メイン関数

```javascript
// Webhookエンドポイント（自動実行）
function doPost(e) {
  // BacklogからのWebhookを受信して処理
}
```

### テスト関数

| 関数 | 用途 |
|------|------|
| `generateWebhookSecret()` | 共有シークレットを生成し、登録用URLをログに出力 |
| `checkConfiguration()` | スクリプトプロパティの設定状態を検証 |
| `testWebhookProcessing()` | サンプルペイロードでメッセージ生成を検証 |

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
   - **登録URLに `?token=` が付いているか確認**（ログに `Unauthorized` が出ていないか）
   - **`WEBHOOK_SECRET` が設定済みか確認**（未設定だと全リクエストを拒否します）
   - Google Apps ScriptのデプロイURLを確認（`/dev` ではなく `/exec` を使うこと）
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


## 🗑 プロジェクトの削除（アンインストール）

不要になったプロジェクトを削除する場合は、以下の手順を実行してください。

1. **GASプロジェクトの削除**
   - [Google Apps Script ダッシュボード](https://script.google.com/home) にアクセスします。
   - 対象のプロジェクトの右側にある「︙」メニューから「削除」を選択し、ゴミ箱に移動します。

2. **連携サービスの解除（該当する場合）**
   - BacklogやDiscordなどの外部サービスで設定したWebhook URLがある場合は、各サービスの設定画面からWebhookを削除してください。
   - 出力先として作成したスプレッドシートが不要な場合は、Googleドライブから削除してください。

3. **ローカル環境の整理**
   - ローカルのディレクトリ内にある `.clasp.json` を削除すると、GASプロジェクトとのリンクが解除されます。

## 🔗 関連リンク

- [Backlog Webhook API](https://developer.nulab.com/docs/backlog/api/2/add-webhook/)
- [Discord Webhook API](https://discord.com/developers/docs/resources/webhook)
- [Google Apps Script](https://developers.google.com/apps-script) 