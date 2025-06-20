# Backlog Webhook Receiver

BacklogのWebhookを受信し、データを処理・保存するGoogle Apps Scriptです。Webhookデータの検証、ログ出力、データベース保存などの機能を提供します。

## 🎯 機能

- Backlog Webhookの受信と検証
- Webhookデータの詳細ログ出力
- データの永続化（Google Spreadsheet等）
- エラーハンドリングとセキュリティ対策
- 複数プロジェクトの対応
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

#### Google Spreadsheetの場合

1. 新しいGoogle Spreadsheetを作成
2. 以下の列を持つシートを作成：

| 列 | 項目 | 説明 |
|---|---|---|
| A | タイムスタンプ | 受信時刻 |
| B | イベントタイプ | Webhookの種類 |
| C | プロジェクトキー | プロジェクト識別子 |
| D | 課題キー | 課題番号 |
| E | タイトル | 課題タイトル |
| F | 担当者 | 担当者名 |
| G | ステータス | 課題ステータス |
| H | 優先度 | 優先度レベル |
| I | カテゴリ | カテゴリ名 |
| J | 更新者 | 更新者名 |
| K | 更新内容 | 更新詳細 |

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
        -   `BACKLOG_URL`: `your-project.backlog.com`
        -   `SPREADSHEET_ID`: `your-spreadsheet-id`
        -   `SHEET_NAME`: `Webhook Data`
        -   `LOG_LEVEL`: `INFO`
3.  **保存**:
    「スクリプトプロパティを保存」をクリックします。

#### 設定項目の説明

- `BACKLOG_URL`: Backlogのドメイン
- `SPREADSHEET_ID`: データ保存用スプレッドシートID
- `SHEET_NAME`: データ保存用シート名
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

### メイン関数

```javascript
// Webhookエンドポイント（自動実行）
function doPost(e) {
  // BacklogからのWebhookを受信して処理
}

// 手動実行用のテスト関数
function testWebhookReceiver() {
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
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  
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

## 🔗 関連リンク

- [Backlog Webhook API](https://developer.nulab.com/docs/backlog/api/2/add-webhook/)
- [Google Apps Script Spreadsheet Service](https://developers.google.com/apps-script/reference/spreadsheet)
- [Google Apps Script Web App](https://developers.google.com/apps-script/guides/web) 