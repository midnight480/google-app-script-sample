# 株価通知 Slack

指定した銘柄の株価を取得し、Slackに通知を送信するGoogle Apps Scriptです。株価の変動を監視し、設定した条件に基づいて通知を行います。

## 🎯 機能

- 指定銘柄の株価取得
- Slackへの通知送信
- 株価変動の監視
- エラーハンドリングと詳細なログ出力
- 定期実行による自動監視

## 📋 前提条件

- Slack Webhook URL
- 監視対象の株式銘柄コード
- Google Apps Scriptの実行権限
- 外部APIへの接続権限

## ⚙️ セットアップ

### 1. Slack Webhookの作成

1. Slackワークスペースの設定 → アプリとカスタマイズ → カスタムアプリ
2. 「新しいアプリを作成」をクリック
3. 「Incoming Webhooks」を有効化
4. 新しいWebhook URLを作成
5. Webhook URLをコピー

### 2. 株価データソースの準備

#### 無料APIの利用

- Yahoo Finance API
- Alpha Vantage API（無料枠あり）
- IEX Cloud API（無料枠あり）

#### 有料APIの利用

- Bloomberg API
- Reuters API
- 日本経済新聞電子版API

### 3. Google Apps Scriptの設定

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
    `clasp open`コマンドを実行するか、ブラウザで直接開きます。
2.  **スクリプトプロパティの設定**:
    -   エディタの左側メニューから「プロジェクトの設定」（歯車アイコン）をクリックします。
    -   「スクリプトプロパティ」セクションで、「スクリプトプロパティを追加」をクリックします。
    -   以下のキーと値を設定します。
        -   `SLACK_WEBHOOK_URL`: `https://hooks.slack.com/services/your-webhook-url`
        -   `STOCK_SYMBOLS`: `7203,6758,9984`
        -   `API_KEY`: `your-api-key`
        -   `NOTIFICATION_THRESHOLD`: `5.0`
3.  **保存**:
    「スクリプトプロパティを保存」をクリックします。

#### 設定項目の説明

- `SLACK_WEBHOOK_URL`: Slack Webhook URL
- `STOCK_SYMBOLS`: 監視対象の銘柄コード（カンマ区切り）
- `API_KEY`: 株価APIのキー（必要に応じて）
- `NOTIFICATION_THRESHOLD`: 通知閾値（%）

### 4. 権限設定

初回実行時に以下の権限を許可：

- 外部サービスへの接続権限
- URL Fetch APIの使用権限

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
function checkStockPrices() {
  // 株価をチェックしてSlackに通知
}

// 手動実行用のテスト関数
function testStockNotification() {
  // テスト用の通知を送信
}
```

### 定期実行の設定

1. Google Apps Scriptエディタで「トリガー」を開く
2. 「トリガーを追加」をクリック
3. 以下の設定で作成：
   - 実行する関数：`checkStockPrices`
   - 実行するデプロイ：`Head`
   - イベントのソース：`時間主導型`
   - 時間ベースのトリガーのタイプ：`分ベースのタイマー`
   - 間隔：`15分おき`（推奨）

## 📊 通知内容

### 株価通知例

```
📈 株価情報

🏢 トヨタ自動車 (7203)
💰 現在値: ¥2,500 (+2.5%)
📊 前日比: +¥60
⏰ 更新時刻: 2024-01-15 14:30

🏢 ソニーグループ (6758)
💰 現在値: ¥12,800 (-1.2%)
📊 前日比: -¥150
⏰ 更新時刻: 2024-01-15 14:30
```

### 通知タイミング

- 設定した間隔での定期チェック
- 株価変動が閾値を超えた場合
- 手動実行でもテスト可能

## 🔍 ログ出力

構造化ログで詳細な情報を出力：

```json
{
  "timestamp": "2024-01-01T14:30:00.000Z",
  "level": "INFO",
  "message": "株価取得開始",
  "data": {
    "symbols": ["7203", "6758", "9984"],
    "apiEndpoint": "https://api.example.com/stock"
  }
}
```

## 🛠 トラブルシューティング

### よくある問題

1. **株価データが取得できない**
   - APIキーが正しいか確認
   - 銘柄コードが正しいか確認
   - APIの利用制限を確認

2. **Slackに通知されない**
   - Webhook URLの形式を確認
   - Slackチャンネルの権限を確認
   - ログでエラー内容を確認

3. **定期実行が動作しない**
   - トリガーの設定を確認
   - 関数名が正しいか確認
   - 実行ログでエラーを確認

### デバッグ方法

```javascript
// 設定確認
checkConfiguration();

// API接続テスト
testApiConnection();

// Slack通知テスト
testSlackNotification();
```

## 📝 カスタマイズ

### 通知メッセージの変更

`createStockMessage`関数を編集：

```javascript
function createStockMessage(stockData) {
  let message = `📈 株価情報\n\n`;
  
  stockData.forEach(stock => {
    const changePercent = ((stock.change / (stock.price - stock.change)) * 100).toFixed(2);
    const changeIcon = stock.change >= 0 ? '📈' : '📉';
    
    message += `${changeIcon} ${stock.name} (${stock.symbol})\n`;
    message += `💰 現在値: ¥${stock.price.toLocaleString()}\n`;
    message += `📊 前日比: ${stock.change >= 0 ? '+' : ''}¥${stock.change.toLocaleString()} (${changePercent}%)\n`;
    message += `⏰ 更新時刻: ${formatDateTime(new Date())}\n\n`;
  });
  
  return message;
}
```

### 株価APIの変更

異なるAPIを使用する場合、`getStockPrice`関数を編集：

```javascript
function getStockPrice(symbol) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
  const url = `https://api.example.com/stock/${symbol}?apikey=${apiKey}`;
  
  try {
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());
    
    return {
      symbol: symbol,
      price: data.price,
      change: data.change,
      name: data.name
    };
  } catch (error) {
    logError('株価取得エラー', { symbol, error: error.toString() });
    return null;
  }
}
```

### 通知条件の変更

```javascript
function shouldNotify(stockData) {
  const threshold = parseFloat(PropertiesService.getScriptProperties().getProperty('NOTIFICATION_THRESHOLD'));
  
  return stockData.some(stock => {
    const changePercent = Math.abs((stock.change / (stock.price - stock.change)) * 100);
    return changePercent >= threshold;
  });
}
```

## 🔗 関連リンク

- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Yahoo Finance API](https://finance.yahoo.com/)
- [Alpha Vantage API](https://www.alphavantage.co/)
- [Google Apps Script URL Fetch Service](https://developers.google.com/apps-script/reference/url-fetch) 