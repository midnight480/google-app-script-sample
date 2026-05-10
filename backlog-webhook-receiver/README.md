# Backlog Webhook Receiver

BacklogのWebhookを受信し、データを処理・保存するGoogle Apps Scriptです。Webhookデータの検証、ログ出力、データベース保存などの機能を提供します。

## 🎯 機能

- Backlog Webhookの受信と検証
- Webhookデータの詳細ログ出力
- データの永続化（Google Spreadsheet等）
- エラーハンドリングとセキュリティ対策
- 複数プロジェクトの対応
- Git Webhook（プッシュイベント等）の対応と専用シートへの保存
- モダンなWebUI（ダッシュボード）による受信データのページネーション付き一覧・詳細確認
- カスタム処理の拡張可能

## 📋 前提条件

- BacklogのWebhook設定
- Google Apps Scriptの実行権限
- データ保存先（Google Spreadsheet等）
- 外部サービスへの接続権限

## ⚙️ セットアップ

### 1. BacklogのWebhook設定

#### Backlogでの設定

1. Backlogのプロジェクト設定でWebhookを有効化
2. Webhook URLを設定（Google Apps ScriptのデプロイURL）
3. 通知したいイベントを選択：
   - 課題の追加
   - 課題の更新
   - コメントの追加
   - プロジェクトの更新
   - ファイルの追加

#### Webhook URLの取得

```bash
# Google Apps Scriptをデプロイ
clasp deploy

# デプロイURLをコピーしてBacklogに設定
```

### 2. データ保存先の準備

スクリプトをデプロイ後、Backlogから最初のWebhookが送信されると、紐づいたスプレッドシートに以下のシートとヘッダー行が**自動的に作成されます**。事前のシート作成や列の定義は不要です。

- `RawData` シート: 受信したWebhookの全データ
- `WebhookLog` シート: 課題関連のイベントログ
- `GitWebhookLog` シート: Git関連のイベントログ

### 3. Google Apps Scriptの設定

#### プロジェクトとスプレッドシートの作成（初回のみ）

以下のコマンドを実行すると、新規でGoogleスプレッドシートが作成され、そこにバインドされたGASプロジェクトがセットアップされます。

```bash
clasp create --type sheets --title "Backlog Webhook Receiver"
```

※ コマンド実行後にコンソールに表示されるGoogleスプレッドシートのURLを開き、確認できるようにしておいてください。

#### appsscript.jsonでの設定

```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "access": "ANYONE",
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
        -   `BACKLOG_URL`: `your-project.backlog.com`
        -   `LOG_LEVEL`: `INFO`
3.  **保存**:
    「スクリプトプロパティを保存」をクリックします。

#### 設定項目の説明

- `BACKLOG_URL`: Backlogのドメイン
- `LOG_LEVEL`: ログレベル（DEBUG, INFO, WARN, ERROR）

### 4. 権限設定

初回実行時に以下の権限を許可：

- Google Spreadsheetの読み書き権限
- 外部サービスへの接続権限
- Webアプリケーションの実行権限

### 5. デプロイ

```bash
# コードをプッシュ
clasp push

# Webアプリとしてデプロイ
clasp deploy
```

## 🔧 使用方法

### Webアプリ（ダッシュボード）の表示

デプロイしたWebアプリのURL（`https://script.google.com/macros/s/.../exec`）をブラウザで開くと、受信したWebhookの履歴を確認できるダッシュボードが表示されます。

- **All Webhooks (Raw Data) タブ**: 受信したすべてのWebhookの生データ一覧です。「詳細を見る」をクリックすると、送信されたJSONペイロードの全体をモーダルで確認できます。
- **Git Webhooks タブ**: Git Webhook（リポジトリへのプッシュなど）の履歴が整形されて一覧表示されます。

### メイン関数

```javascript
// WebアプリのUIを表示するエンドポイント
function doGet(e) {
  // Index.htmlをレンダリング
}

// Webhookエンドポイント（自動実行）
function doPost(e) {
  // BacklogからのWebhookを受信して処理・保存
}

// 手動実行用のテスト関数
function testWebhookProcessing() {
  // テスト用のWebhookデータを処理
}
```

### Webhook URLの設定

1. デプロイ後に取得したURLをBacklogに設定
2. URL形式: `https://script.google.com/macros/s/SCRIPT_ID/exec`

## 📊 処理内容

### 受信データの処理

#### 課題作成時
```json
{
  "type": 1,
  "project": {
    "projectKey": "PROJECT",
    "name": "プロジェクト名"
  },
  "content": {
    "key_id": 123,
    "summary": "課題タイトル",
    "assignee": {
      "name": "担当者名"
    }
  },
  "createdUser": {
    "name": "作成者名"
  }
}
```

#### 課題更新時
```json
{
  "type": 2,
  "project": {
    "projectKey": "PROJECT"
  },
  "content": {
    "key_id": 123,
    "summary": "課題タイトル",
    "assignee": {
      "name": "担当者名"
    }
  },
  "updatedUser": {
    "name": "更新者名"
  }
}
```

#### コメント追加時
```json
{
  "type": 3,
  "project": {
    "projectKey": "PROJECT"
  },
  "content": {
    "key_id": 123,
    "summary": "課題タイトル",
    "comment": {
      "id": 456,
      "content": "コメント内容"
    }
  },
  "createdUser": {
    "name": "コメント投稿者"
  }
}
```

#### Git Webhook（プッシュ時）
```json
{
  "type": 12,
  "repository": {
    "name": "リポジトリ名"
  },
  "content": {
    "ref": "refs/heads/main",
    "revisions": [
      {
        "rev": "abcdef123456",
        "comment": "コミットメッセージ"
      }
    ]
  },
  "createdUser": {
    "name": "プッシュしたユーザー名"
  }
}
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
    "contentKey": 123,
    "user": "作成者名"
  }
}
```

## 🛠 トラブルシューティング

### よくある問題

1. **Webhookが受信されない**
   - BacklogのWebhook設定を確認
   - Google Apps ScriptのデプロイURLを確認
   - アクセス権限を確認

2. **データが保存されない**
   - スプレッドシートIDが正しいか確認
   - スプレッドシートの共有設定を確認
   - Google Apps Scriptの権限を確認

3. **エラーが発生する**
   - ログでエラー内容を確認
   - Webhookデータの形式を確認
   - 設定値が正しいか確認

### デバッグ方法

```javascript
// 設定確認
checkConfiguration();

// スプレッドシートアクセステスト
testSpreadsheetAccess();

// Webhook処理テスト
testWebhookProcessing();
```

## 📝 カスタマイズ

### データ保存形式の変更

`saveWebhookData`関数を編集：

```javascript
function saveWebhookData(webhookData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('WebhookLog');
  
  const rowData = [
    new Date(),                    // タイムスタンプ
    getEventTypeName(webhookData.type), // イベントタイプ
    webhookData.project.projectKey,     // プロジェクトキー
    webhookData.content.key_id,         // 課題キー
    webhookData.content.summary,        // タイトル
    webhookData.content.assignee?.name || '', // 担当者
    webhookData.content.status?.name || '',   // ステータス
    webhookData.content.priority?.name || '', // 優先度
    webhookData.content.category?.name || '', // カテゴリ
    webhookData.updatedUser?.name || webhookData.createdUser?.name || '', // 更新者
    getUpdateDetails(webhookData)       // 更新内容
  ];
  
  sheet.appendRow(rowData);
}
```

### 追加処理の実装

```javascript
function processWebhookData(webhookData) {
  // 基本処理
  validateWebhookData(webhookData);
  logWebhookData(webhookData);
  saveWebhookData(webhookData);
  
  // カスタム処理
  if (webhookData.type === 1) {
    // 課題作成時の特別処理
    processIssueCreated(webhookData);
  } else if (webhookData.type === 2) {
    // 課題更新時の特別処理
    processIssueUpdated(webhookData);
  } else if (webhookData.type === 3) {
    // コメント追加時の特別処理
    processCommentAdded(webhookData);
  }
}
```

### セキュリティ強化

```javascript
function validateWebhookData(webhookData) {
  // 必須フィールドのチェック
  if (!webhookData.type || !webhookData.project) {
    throw new Error('Invalid webhook data structure');
  }
  
  // プロジェクトキーの検証
  const allowedProjects = ['PROJECT1', 'PROJECT2'];
  if (!allowedProjects.includes(webhookData.project.projectKey)) {
    throw new Error('Unauthorized project');
  }
  
  // データサイズの制限
  const dataSize = JSON.stringify(webhookData).length;
  if (dataSize > 10000) {
    throw new Error('Webhook data too large');
  }
}
```


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
- [Google Apps Script Spreadsheet Service](https://developers.google.com/apps-script/reference/spreadsheet)
- [Google Apps Script Web App](https://developers.google.com/apps-script/guides/web) 