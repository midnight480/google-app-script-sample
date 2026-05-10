# 佐賀市ごみ収集通知

佐賀市のごみ収集スケジュールをGoogle Spreadsheetで管理し、収集日の前日にDiscordに通知を送信するGoogle Apps Scriptです。

## 🎯 機能

- 佐賀市のごみ収集スケジュール管理
- 収集日の前日にDiscord通知
- Google Spreadsheetでのデータ管理
- エラーハンドリングと詳細なログ出力
- 定期実行による自動通知

## 📋 前提条件

- 佐賀市のごみ収集スケジュールデータ
- Google Spreadsheet
- Discord Webhook URL
- Google Apps Scriptの実行権限

## ⚙️ セットアップ

### 1. Google Spreadsheetの準備

#### スプレッドシートの構造

以下の列を持つシートを作成：

| 列 | 項目 | 説明 |
|---|---|---|
| A | 日付 | 収集日（YYYY/MM/DD形式） |
| B | 曜日 | 曜日（自動計算） |
| C | 可燃ごみ | 可燃ごみの収集有無（○/×） |
| D | 不燃ごみ | 不燃ごみの収集有無（○/×） |
| E | 資源ごみ | 資源ごみの収集有無（○/×） |
| F | 粗大ごみ | 粗大ごみの収集有無（○/×） |

#### サンプルデータ

```
日付        曜日    可燃ごみ  不燃ごみ  資源ごみ  粗大ごみ
2024/01/15  月     ○       ×       ×       ×
2024/01/16  火     ×       ○       ×       ×
2024/01/17  水     ×       ×       ○       ×
2024/01/18  木     ○       ×       ×       ×
2024/01/19  金     ×       ×       ×       ○
```

### 2. Discord Webhookの作成

1. Discordサーバーの設定 → 統合機能 → Webhook
2. 新しいWebhookを作成
3. Webhook URLをコピー

### 3. Google Apps Scriptの設定

#### プロジェクトの作成（初回のみ）

```bash
clasp create --type standalone --title "佐賀市ごみ収集通知"
```

#### appsscript.jsonでの設定

```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
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
        -   `SPREADSHEET_ID`: `your-spreadsheet-id`
        -   `SHEET_NAME`: `ごみ収集スケジュール`
        -   `DISCORD_WEBHOOK_URL`: `https://discord.com/api/webhooks/your-webhook-url`
3.  **保存**:
    「スクリプトプロパティを保存」をクリックします。

#### スプレッドシートIDの取得方法

1. Google Spreadsheetを開く
2. URLからIDを取得：
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```

### 4. 権限設定

初回実行時に以下の権限を許可：

- Google Spreadsheetの読み取り権限
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
function checkGarbageSchedule() {
  // ごみ収集スケジュールをチェックしてDiscordに通知
}

// 手動実行用のテスト関数
function testGarbageNotification() {
  // テスト用の通知を送信
}
```

### 定期実行の設定

1. Google Apps Scriptエディタで「トリガー」を開く
2. 「トリガーを追加」をクリック
3. 以下の設定で作成：
   - 実行する関数：`checkGarbageSchedule`
   - 実行するデプロイ：`Head`
   - イベントのソース：`時間主導型`
   - 時間ベースのトリガーのタイプ：`日次`
   - 時刻：`午前7時`（推奨）

## 📊 通知内容

### ごみ収集通知例

```
🗑️ 明日はごみ収集日です！

📅 2024年1月16日（火）
♻️ 収集予定：
   • 可燃ごみ
   • 資源ごみ

📋 注意事項：
   • 可燃ごみは午前8時までに出してください
   • 資源ごみは分別して出してください
```

### 通知タイミング

- 収集日の前日午前7時
- 手動実行でもテスト可能

## 🔍 ログ出力

構造化ログで詳細な情報を出力：

```json
{
  "timestamp": "2024-01-01T07:00:00.000Z",
  "level": "INFO",
  "message": "ごみ収集スケジュール確認開始",
  "data": {
    "spreadsheetId": "xxx",
    "sheetName": "ごみ収集スケジュール",
    "checkDate": "2024-01-16"
  }
}
```

## 🛠 トラブルシューティング

### よくある問題

1. **スプレッドシートにアクセスできない**
   - スプレッドシートIDが正しいか確認
   - スプレッドシートの共有設定を確認
   - Google Apps Scriptの権限を確認

2. **Discordに通知されない**
   - Webhook URLの形式を確認
   - Discordチャンネルの権限を確認
   - ログでエラー内容を確認

3. **データが正しく読み込まれない**
   - スプレッドシートの列構造を確認
   - 日付形式が正しいか確認
   - シート名が正しいか確認

### デバッグ方法

```javascript
// 設定確認
checkConfiguration();

// スプレッドシートアクセステスト
testSpreadsheetAccess();

// Discord通知テスト
testDiscordNotification();
```

## 📝 カスタマイズ

### 通知メッセージの変更

`createGarbageMessage`関数を編集：

```javascript
function createGarbageMessage(scheduleData) {
  const date = new Date(scheduleData.date);
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  
  let message = `🗑️ 明日はごみ収集日です！\n\n`;
  message += `📅 ${formatDate(date)}（${dayOfWeek}）\n`;
  message += `♻️ 収集予定：\n`;
  
  if (scheduleData.combustible) message += `   • 可燃ごみ\n`;
  if (scheduleData.incombustible) message += `   • 不燃ごみ\n`;
  if (scheduleData.recyclable) message += `   • 資源ごみ\n`;
  if (scheduleData.bulky) message += `   • 粗大ごみ\n`;
  
  return message;
}
```

### スプレッドシート構造の変更

異なる列構造に対応する場合、`readGarbageSchedule`関数を編集：

```javascript
function readGarbageSchedule() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  // カスタム列構造に対応
  return data.slice(1).map(row => ({
    date: row[0],           // A列: 日付
    combustible: row[2],    // C列: 可燃ごみ
    incombustible: row[3],  // D列: 不燃ごみ
    recyclable: row[4],     // E列: 資源ごみ
    bulky: row[5]           // F列: 粗大ごみ
  }));
}
```

### 複数地域対応

```javascript
const REGIONS = {
  'saga': {
    spreadsheetId: 'saga-spreadsheet-id',
    sheetName: '佐賀市ごみ収集',
    webhookUrl: 'saga-discord-webhook'
  },
  'other': {
    spreadsheetId: 'other-spreadsheet-id',
    sheetName: '他地域ごみ収集',
    webhookUrl: 'other-discord-webhook'
  }
};
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

- [佐賀市ごみ収集カレンダー](https://www.city.saga.lg.jp/kurashi/gomi/)
- [Google Apps Script Spreadsheet Service](https://developers.google.com/apps-script/reference/spreadsheet)
- [Discord Webhook API](https://discord.com/developers/docs/resources/webhook) 