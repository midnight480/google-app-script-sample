# RSSフィード取得

指定したRSSフィードを取得し、新しい記事を検出して通知するGoogle Apps Scriptです。複数のRSSフィードを監視し、更新があった場合に通知を送信します。

## 🎯 機能

- 複数RSSフィードの監視
- 新しい記事の自動検出
- 通知システム（Slack、Discord、メール等）
- エラーハンドリングと詳細なログ出力
- 定期実行による自動監視
- 重複記事の除外機能

## 📋 前提条件

- 監視対象のRSSフィードURL
- 通知先の設定（Slack、Discord、メール等）
- Google Apps Scriptの実行権限
- 外部URLへの接続権限

## ⚙️ セットアップ

### 1. RSSフィードの準備

#### 監視対象のRSSフィード例

- 技術ブログ: `https://example.com/feed.xml`
- ニュースサイト: `https://news.example.com/rss`
- 企業ブログ: `https://company.example.com/blog/feed`

#### RSSフィードの確認方法

1. ブラウザでRSSフィードURLにアクセス
2. XML形式でデータが表示されることを確認
3. 最新記事の情報が含まれていることを確認

### 2. 通知システムの設定

#### Slack通知の場合

1. Slack Webhook URLを作成
2. 通知用チャンネルを設定

#### Discord通知の場合

1. Discord Webhook URLを作成
2. 通知用チャンネルを設定

#### メール通知の場合

1. Gmail送信権限を設定
2. 通知先メールアドレスを設定

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
        -   `RSS_FEEDS`: `https://example.com/feed.xml,https://news.example.com/rss`
        -   `NOTIFICATION_TYPE`: `slack`
        -   `SLACK_WEBHOOK_URL`: `https://hooks.slack.com/services/your-webhook-url`
        -   `DISCORD_WEBHOOK_URL`: `https://discord.com/api/webhooks/your-webhook-url`
        -   `EMAIL_RECIPIENTS`: `user@example.com`
        -   `CHECK_INTERVAL_HOURS`: `1`
3.  **保存**:
    「スクリプトプロパティを保存」をクリックします。

#### 設定項目の説明

- `RSS_FEEDS`: 監視対象のRSSフィードURL（カンマ区切り）
- `NOTIFICATION_TYPE`: 通知タイプ（slack, discord, email）
- `SLACK_WEBHOOK_URL`: Slack Webhook URL
- `DISCORD_WEBHOOK_URL`: Discord Webhook URL
- `EMAIL_RECIPIENTS`: メール通知先（カンマ区切り）
- `CHECK_INTERVAL_HOURS`: チェック間隔（時間）

### 4. 権限設定

初回実行時に以下の権限を許可：

- 外部URLへの接続権限
- URL Fetch APIの使用権限
- メール送信権限（メール通知の場合）

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
function checkRssFeeds() {
  // RSSフィードをチェックして通知
}

// 手動実行用のテスト関数
function testRssNotification() {
  // テスト用の通知を送信
}
```

### 定期実行の設定

1. Google Apps Scriptエディタで「トリガー」を開く
2. 「トリガーを追加」をクリック
3. 以下の設定で作成：
   - 実行する関数：`checkRssFeeds`
   - 実行するデプロイ：`Head`
   - イベントのソース：`時間主導型`
   - 時間ベースのトリガーのタイプ：`時間主導型`
   - 間隔：`1時間おき`（推奨）

## 📊 通知内容

### RSS記事通知例

```
📰 新しい記事があります

📋 タイトル: 最新の技術トレンドについて
📅 公開日: 2024-01-15 10:30
👤 著者: 技術ライター
🔗 URL: https://example.com/article/123
📝 概要: 最新の技術トレンドについて詳しく解説します...

📋 タイトル: 開発環境の構築方法
📅 公開日: 2024-01-15 09:15
👤 著者: 開発者
🔗 URL: https://example.com/article/124
📝 概要: 効率的な開発環境の構築方法を紹介...
```

### 通知タイミング

- 設定した間隔での定期チェック
- 新しい記事が検出された場合
- 手動実行でもテスト可能

## 🔍 ログ出力

構造化ログで詳細な情報を出力：

```json
{
  "timestamp": "2024-01-01T10:00:00.000Z",
  "level": "INFO",
  "message": "RSSフィードチェック開始",
  "data": {
    "feeds": ["https://example.com/feed.xml"],
    "lastCheckTime": "2024-01-01T09:00:00.000Z"
  }
}
```

## 🛠 トラブルシューティング

### よくある問題

1. **RSSフィードにアクセスできない**
   - URLが正しいか確認
   - RSSフィードが有効か確認
   - アクセス制限がないか確認

2. **通知が送信されない**
   - 通知設定が正しいか確認
   - Webhook URLの形式を確認
   - ログでエラー内容を確認

3. **重複通知が発生する**
   - 前回チェック時刻の管理を確認
   - 記事IDの重複チェック機能を確認

### デバッグ方法

```javascript
// 設定確認
checkConfiguration();

// RSSフィードアクセステスト
testRssFeedAccess();

// 通知テスト
testNotification();
```

## 📝 カスタマイズ

### 通知メッセージの変更

`createRssMessage`関数を編集：

```javascript
function createRssMessage(articles) {
  let message = `📰 新しい記事があります\n\n`;
  
  articles.forEach(article => {
    message += `📋 タイトル: ${article.title}\n`;
    message += `📅 公開日: ${formatDateTime(article.pubDate)}\n`;
    if (article.author) message += `👤 著者: ${article.author}\n`;
    message += `🔗 URL: ${article.link}\n`;
    if (article.description) {
      const summary = article.description.replace(/<[^>]*>/g, '').substring(0, 100);
      message += `📝 概要: ${summary}...\n`;
    }
    message += `\n`;
  });
  
  return message;
}
```

### RSSフィードパーサーの変更

異なるRSS形式に対応する場合、`parseRssFeed`関数を編集：

```javascript
function parseRssFeed(xmlContent) {
  const document = XmlService.parse(xmlContent);
  const root = document.getRootElement();
  const channel = root.getChild('channel');
  const items = channel.getChildren('item');
  
  return items.map(item => ({
    title: getElementText(item, 'title'),
    link: getElementText(item, 'link'),
    description: getElementText(item, 'description'),
    pubDate: getElementText(item, 'pubDate'),
    author: getElementText(item, 'author') || getElementText(item, 'dc:creator'),
    guid: getElementText(item, 'guid')
  }));
}
```

### 通知条件の変更

```javascript
function shouldNotify(article, lastCheckTime) {
  const articleDate = new Date(article.pubDate);
  const threshold = new Date(lastCheckTime.getTime() + (CHECK_INTERVAL_HOURS * 60 * 60 * 1000));
  
  return articleDate > lastCheckTime && articleDate <= threshold;
}
```

## 🔗 関連リンク

- [RSS 2.0 仕様](https://cyber.harvard.edu/rss/rss.html)
- [Atom 仕様](https://tools.ietf.org/html/rfc4287)
- [Google Apps Script XML Service](https://developers.google.com/apps-script/reference/xml-service)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Discord Webhook API](https://discord.com/developers/docs/resources/webhook) 