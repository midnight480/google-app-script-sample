# Google Meet URL作成とBacklog連携

Google Apps Scriptを使用して、Google MeetのURLを新規作成し、Backlogの課題にコメントとして追加するプロジェクトです。
Googleフォームからの回答送信をトリガーとして自動実行することも可能です。

## 機能

- Google MeetのOpen URL（誰でも参加可能）を作成
- Backlogの課題キーとAPIキーを使用して課題にコメントを追加
- **[NEW] Googleフォーム送信時の自動連携**
- Googleカレンダー（共有カレンダー対応）への予定作成

## セットアップ

### 1. Claspのインストールとログイン

```bash
npm install
npm run clasp:login
```

### 2. プロジェクトの作成

```bash
npm run clasp:create
```

### 3. スクリプトプロパティの設定

Google Apps Scriptのエディタを開き（`npm run clasp:open`）、[プロジェクトの設定] > [スクリプトプロパティ] に以下の項目を追加してください：

| プロパティ名 | 説明 | 例 |
| --- | --- | --- |
| `BACKLOG_API_KEY` | BacklogのAPIキー | `YourApiKey...` |
| `BACKLOG_SPACE_URL` | BacklogのスペースURL | `https://your-space.backlog.jp` |
| `SHARED_CALENDAR_ID` | (任意) 予定を作成する共有カレンダーID | `c_xxx...Group.calendar.google.com` |

※ `SHARED_CALENDAR_ID` を省略すると、実行ユーザーのデフォルトカレンダーに作成されます。

### 4. コードのデプロイ

```bash
npm run clasp:push
```

### 5. Googleフォームの作成とトリガー設定

1. 新しいGoogleフォームを作成します。
2. 以下の質問を作成してください（タイトルは正確に合わせてください）：
   - **会議タイトル** (記述式)
   - **開催日** (日付)
   - **開始時刻** (時刻)
   - **終了時刻** (時刻)
   - **概要** (記述式・任意)
   - **Backlog課題キー** (記述式)
3. フォームのスクリプトエディタとして、このGASプロジェクトを紐付けます（またはコードをコピーします）。
4. **トリガーの設定**:
   - 左側のメニューから「トリガー」を選択
   - [トリガーを追加] ボタンをクリック
   - 実行する関数: `onFormSubmit`
   - イベントのソース: `フォームから`
   - イベントの種類: `フォーム送信時`
   - 保存ボタンをクリック（初回は権限承認が必要です）

## 使用方法（APIとして利用する場合）

### Webアプリとして公開

1. [公開] > [ウェブアプリとして公開]
2. アクセス権: 全員（必要に応じて調整）

### Curlでの実行例

```bash
curl -X POST "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec" \
  -H "Content-Type: application/json" \
  -d '{
    "issueKey": "PROJECT-123",
    "apiKey": "your_backlog_api_key",
    "spaceUrl": "https://your-space.backlog.jp"
  }'
```

## トラブルシューティング

### Google Meet URLが作成できない
- Google Cloud Consoleで **Google Calendar API** が有効になっているか確認してください。
- 共有カレンダーIDを指定している場合、スクリプト実行ユーザーにそのカレンダーへの「予定の変更権限」があるか確認してください。

### フォーム送信しても動かない
- トリガーが「フォーム送信時」に正しく設定されているか確認してください。
- [実行数] ログを確認してエラーが出ていないかチェックしてください。
