# プロジェクト構造

## ディレクトリ構成

```
├── .git/                           # Gitリポジトリ
├── .kiro/                          # Kiro設定ファイル
├── README.md                       # プロジェクト全体の説明
├── LICENSE                         # ライセンス情報
├── EFFICIENCY_REPORT.md            # 効率性レポート
├── PR_DESCRIPTION.md               # プルリクエスト説明
├── backlog-space-project-list/     # Backlogプロジェクト一覧取得
├── backlog-space-user-list/        # Backlogユーザー一覧取得
├── backlog-webhook-discord/        # Backlog→Discord通知
├── backlog-webhook-receiver/       # Backlogデータ記録
├── calendar-to-discord/            # カレンダー→Discord通知
├── get-rss-feed/                   # RSSフィード処理
├── google-form-to-calendar-meet-notify/ # フォーム→カレンダー連携
├── saga-garbage-notify/            # ごみ収集日通知
└── stockNotifySlack/               # 株価→Slack通知
```

## 各スクリプトの標準構成

### 基本ファイル構成
```
script-name/
├── .clasp.json          # claspプロジェクト設定
├── README.md            # スクリプト固有の説明
├── appsscript.json      # Google Apps Script設定
└── Code.js              # メインコード（または複数のJSファイル）
```

### 複数ファイル構成の例（backlog-space-user-list）
```
backlog-space-user-list/
├── .clasp.json
├── README.md
├── src/
│   ├── Code.js                    # メイン処理
│   ├── Dialog.html                # ダイアログUI
│   ├── ProjectMemberDialog.html   # プロジェクトメンバー用UI
│   ├── ProjectMemberFunctions.js  # プロジェクトメンバー処理
│   └── appsscript.json           # 設定ファイル
```

## ファイル命名規則

### JavaScript/Google Apps Script
- **Code.js**: メイン処理ファイル
- **機能名.js**: 特定機能のファイル（例：ProjectMemberFunctions.js）
- **機能名.gs**: Google Apps Script形式（例：get-rss-feed.gs）

### HTML
- **Dialog.html**: 基本ダイアログ
- **機能名Dialog.html**: 特定機能のダイアログ

### 設定ファイル
- **appsscript.json**: Google Apps Script設定
- **.clasp.json**: clasp設定
- **README.md**: ドキュメント

## コード構造パターン

### 標準的なJavaScriptファイル構造
```javascript
// 1. 定数定義
const CONSTANTS = {
  // 定数値
};

// 2. ログ関数
function logInfo(message, data = {}) { /* ... */ }
function logError(message, error = null) { /* ... */ }
function logWarning(message, data = {}) { /* ... */ }

// 3. バリデーション関数
function validateXxx(data) { /* ... */ }

// 4. 設定初期化
function initializeConfig() { /* ... */ }

// 5. メイン処理関数
function main() { /* ... */ }
function doPost(e) { /* ... */ } // Webhook用

// 6. ヘルパー関数
function createMessage() { /* ... */ }
function sendToService() { /* ... */ }

// 7. テスト関数
function testXxx() { /* ... */ }
function checkConfiguration() { /* ... */ }
```

## 設定管理パターン

### appsscript.jsonでの設定例
```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "scriptProperties": {
    "API_KEY": "your-api-key",
    "WEBHOOK_URL": "your-webhook-url"
  }
}
```

### スクリプトプロパティアクセスパターン
```javascript
const properties = PropertiesService.getScriptProperties();
const apiKey = properties.getProperty('API_KEY');
```

## 共通機能パターン

- **ログ出力**: 構造化JSON形式での統一ログ
- **エラーハンドリング**: try-catch文による適切な例外処理
- **設定検証**: 実行前の設定値バリデーション
- **テスト関数**: 各機能のテスト用関数を提供
- **初期化処理**: 初回実行時の自動設定