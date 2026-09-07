# Backlog Webhook to Slack

BacklogのWebhookを受信し、**課題のカテゴリに応じて通知先のSlackチャンネルを振り分ける**Google Apps ScriptのWebアプリです。

Slackの Incoming Webhook は「1つのURL = 1つのチャンネル」に固定されるため、
「カテゴリID → Incoming Webhook URL」のマッピングがそのまま「カテゴリ → チャンネル」の振り分けになります。

## 🎯 機能

- Backlogの課題作成・更新・コメント追加をSlackへ通知
- **カテゴリ別の通知先チャンネル振り分け**（`CATEGORY_MAP`）
- **Block Kit形式**のリッチな通知（見出し・課題リンク・属性フィールド・変更差分・引用）
- **共有シークレット検証**による不正POSTの遮断
- 構造化ログ（JSON）とWebhookデータのバリデーション

## 📋 前提条件

- Backlogのプロジェクト管理者権限（Webhook登録に必要）
- Slackの Incoming Webhook を作成できる権限
- Googleアカウント / [clasp](https://github.com/google/clasp) v3系

## 🏗 通知の流れ

```
Backlog                GAS Web App                      Slack
  │                        │                              │
  │  POST ?token=xxx       │                              │
  ├───────────────────────>│                              │
  │                        │ 1. 共有シークレット検証        │
  │                        │ 2. ペイロード検証             │
  │                        │ 3. content.category を取得    │
  │                        │ 4. CATEGORY_MAP で URL 解決   │
  │                        │ 5. Block Kit メッセージ生成    │
  │                        ├─────────────────────────────>│
  │                        │   POST {text, blocks}        │  #対応するチャンネル
  │  {"status":"success"}  │                              │
  │<───────────────────────┤                              │
```

### カテゴリ振り分けロジック

| 課題のカテゴリ | 通知先 |
|---------------|--------|
| `CATEGORY_MAP` にIDが登録されている | 対応するチャンネル |
| 複数カテゴリが登録済み | **最初にマッチした1件のみ**に通知 |
| どのIDにもマッチしない | 既定チャンネル（`SLACK_WEBHOOK_URL`） |
| カテゴリ未設定 | 既定チャンネル（`SLACK_WEBHOOK_URL`） |
| 上記で既定チャンネルも未設定 | 通知しない（ログに警告を出力） |

## ⚙️ セットアップ

### 1. Slack Incoming Webhook の作成

通知先にしたい**チャンネルごとに**Webhookを作成します。

1. https://api.slack.com/apps で App を作成（または既存の App を選択）
2. 「Incoming Webhooks」を有効化
3. 「Add New Webhook to Workspace」→ 通知先チャンネルを選択
4. 発行された `https://hooks.slack.com/services/T.../B.../...` をコピー
5. 振り分けたいチャンネルの数だけ 3〜4 を繰り返す

### 2. Backlogのカテゴリ ID を調べる

カテゴリIDは以下のいずれかで確認できます。

- **API**: `GET https://{スペース}.backlog.com/api/v2/projects/{projectIdOrKey}/categories?apiKey={APIキー}`
- **管理画面**: プロジェクト設定 → カテゴリー → 各カテゴリの編集リンクURL末尾の数値

### 3. GASプロジェクトの作成とデプロイ

```bash
cd backlog-webhook-slack

# プロジェクト作成（初回のみ）
clasp create-script --type standalone --title "Backlog-webhook"

# コードを反映
clasp push

# Webアプリとしてデプロイ
clasp create-deployment --description "Backlog webhook to Slack"

# デプロイURLを確認
clasp list-deployments

# 2回目以降：URLを変えずに更新する（Backlog側の再設定が不要）
clasp push
clasp update-deployment {デプロイID}
```

> `.clasp.json` は `.gitignore` 済みです。他の環境で作業する場合は `.clasp.json.example` をコピーして `scriptId` を記入してください。

#### `appsscript.json`（重要）

**このリポジトリでは `appsscript.json` も `.gitignore` されているため、リポジトリには含まれていません。**
`clasp create-script` は既定値（`timeZone: America/New_York`・`webapp` ブロック無し）で
`appsscript.json` を**上書きする**ので、作成後に以下の内容で作り直してから `clasp push` してください。

```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "access": "ANYONE_ANONYMOUS",
    "executeAs": "USER_DEPLOYING"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.scriptapp"
  ]
}
```

- `webapp.access: ANYONE_ANONYMOUS` … Backlogは認証情報を送らないため必須
- `webapp.executeAs: USER_DEPLOYING` … デプロイしたユーザーの権限で実行する
- `script.external_request` … Slackへの `UrlFetchApp` 送信と Backlog API 呼び出しに必要
- `script.scriptapp` … `ScriptApp.getService().getUrl()` でデプロイURLを取得するために必要

### 4. スクリプトプロパティの設定

**スクリプトプロパティは clasp では設定できません。** GASエディタで設定してください。

```bash
clasp open-script
```

エディタ左メニューの「プロジェクトの設定」（歯車アイコン）→「スクリプトプロパティ」で以下を設定します。

| キー | 必須 | 値の例 | 説明 |
|------|:----:|--------|------|
| `BACKLOG_URL` | ✅ | `example.backlog.com` | Backlogのドメイン。**スキーム(`https://`)は不要** |
| `CATEGORY_MAP` | – | 下記参照 | カテゴリID → Incoming Webhook URL のJSON |
| `SLACK_WEBHOOK_URL` | – | `https://hooks.slack.com/services/T.../B.../xxx` | 既定チャンネル。未設定かつ未マッチなら通知しない |
| `WEBHOOK_SECRET` | ✅ | 手順5で自動生成 | 共有シークレット。**手動入力不要** |
| `BACKLOG_API_KEY` | – | `xxxxxxxxxxxx` | 課題更新時の変更差分をID→名称に解決するためのBacklog APIキー（下記参照） |

`CATEGORY_MAP` の記入例:

```json
{
  "1695590": "https://hooks.slack.com/services/T00000/B11111/infra-channel-webhook",
  "1695591": "https://hooks.slack.com/services/T00000/B22222/dev-channel-webhook",
  "1695592": "https://hooks.slack.com/services/T00000/B33333/sales-channel-webhook"
}
```

### 5. 共有シークレットの生成（＋初回のOAuth認可）

GASエディタで `generateWebhookSecret` 関数を選択して実行します。

> ⚠️ **初回実行時は必ずここで認可を完了してください。**
> このスクリプトは `UrlFetchApp`（外部リクエスト）と `ScriptApp`（デプロイURL取得）を使うため、
> 初回実行時に「承認が必要です」ダイアログが表示されます。
> Webアプリは `executeAs: USER_DEPLOYING`（デプロイしたユーザーとして実行）で動作するため、
> **この認可が済むまでWebアプリは HTTP 403 を返し、Backlogからの通知を受信できません。**
> 認可はブラウザの同意画面でのみ可能で、`clasp` からは実行できません。

実行ログに **Backlogへ登録するWebhook URL** が表示されるので控えてください。

```
共有シークレットを生成しました。

WEBHOOK_SECRET: 3f9a1c8e7b2d4a6f8c0e1b3d5a7f9c2e

BacklogのWebhookに登録するURL:
https://script.google.com/macros/s/AKfycb.../exec?token=3f9a1c8e7b2d4a6f8c0e1b3d5a7f9c2e
```

> ⚠️ このURLとシークレットは第三者に共有しないでください。

### 6. 設定確認

GASエディタで `checkConfiguration` を実行し、設定漏れがないか確認します。
問題があれば WARNING ログに具体的な項目が出力されます。

### 7. BacklogのWebhook登録

1. Backlog のプロジェクト設定 →「インテグレーション」→「Webhook」→「Webhookを追加する」
2. **WebhookURL**: 手順5で表示されたURL（`?token=` 付き）を貼り付け

> ⚠️ **必ず `/exec` で終わるURLを使ってください。**
> GASエディタの「デプロイをテスト」から取得できる `/dev` で終わるURLは**テスト用**で、
> スクリプトの編集権限を持つGoogleアカウントでログインしている場合しかアクセスできません。
> Backlogからの匿名POSTは必ず **HTTP 401** になります。
> また `https://script.google.com/a/{ドメイン}/macros/...` のように
> Workspaceドメインが URL に含まれている場合も、その部分を除いた
> `https://script.google.com/macros/s/{デプロイID}/exec` を使ってください。
>
> 正しいURLは `clasp list-deployments` で `@1` などのバージョン付きデプロイIDを確認するか、
> GASエディタの「デプロイ」→「デプロイを管理」に表示される**ウェブアプリのURL**から取得できます。

3. **通知するイベント**で以下を選択:
   - 課題の追加
   - 課題の更新
   - 課題にコメント
4. 保存

## 🔧 使用方法

### エンドポイント

```javascript
function doPost(e) {
  // BacklogからのWebhookを受信して処理する（自動実行）
}
```

### 運用・テスト関数

GASエディタから手動実行できます。

| 関数 | 用途 |
|------|------|
| `generateWebhookSecret()` | 共有シークレットを生成し、登録用URLをログに出力 |
| `checkConfiguration()` | スクリプトプロパティの設定状態を検証 |
| `testWebhookProcessing()` | サンプルペイロードでメッセージ生成を検証（**Slackへは送信しない**） |
| `testSlackNotification()` | 既定チャンネルへ実際にテストメッセージを送信 |

## 🔤 変更差分のID→名称解決（`BACKLOG_API_KEY`）

Backlog の Webhook ペイロードは、`content.changes` の値を **IDの文字列**で送ってきます。

```json
"changes": [{ "field": "status", "old_value": "1", "new_value": "2", "type": "standard" }]
```

そのままでは Slack に `• status: 1 → 2` と表示されて読めません。
ステータスIDは**プロジェクトごとに定義され、カスタムステータスを追加するとID 5以降が割り当てられる**ため、
コード内に固定のマッピングを持つ方式では運用できません。

そこでスクリプトプロパティ `BACKLOG_API_KEY` を設定すると、
ペイロードの `project.id` を使って Backlog API からマスタを取得し、ID を名称に解決します。
取得結果は `CacheService` に **6時間キャッシュ**されるため、API呼び出しは最小限です。

| 表示 | `BACKLOG_API_KEY` あり | なし（フォールバック） |
|------|----------------------|---------------------|
| `status` | `状態: 未対応 → 処理中` | `状態: ID:1 → 処理中` |
| `assignee` | `担当者: 山田花子 → 柴尾哲也` | `担当者: ID:2 → 柴尾哲也` |
| `priority` | `優先度: 中 → 高` | `優先度: ID:3 → 高` |

**「変更後」の値はAPIキーが無くても名称で表示されます。** ペイロードの `content.status.name` などから
現在値を補完できるためです。解決できないのは「変更前」の値だけで、その場合は `ID:1` の形式で表示します。

APIが失敗した場合（キーが無効・権限不足・障害）も同じフォールバックで動作し、通知自体は止まりません。

### APIキーの発行

1. Backlog の**個人設定** →「API」→「新しいAPIキーを発行」
2. 発行されたキーをスクリプトプロパティ `BACKLOG_API_KEY` に設定

> ℹ️ 任意設定です。未設定でも通知は正常に動作します。
> ID解決の対象は `status` / `assignee` / `priority` / `issueType` / `resolution` / `category` / `milestone` / `version` です。
> `summary` や `limitDate` のように元から名称・日付で届くフィールドはそのまま表示されます。

## 🩺 診断エンドポイント

Backlogは GAS が HTTP 200 を返した時点で「成功」と表示するため、
**Slack送信の失敗はBacklog側からは見えません**。そのための診断用エンドポイントを用意しています。

いずれも `WEBHOOK_SECRET` が必須です（トークン無しでは `Unauthorized`）。

### 設定状態と受信履歴の確認

```bash
curl -sL "https://script.google.com/macros/s/{デプロイID}/exec?token={WEBHOOK_SECRET}"
```

```json
{
  "status": "ok",
  "backlogUrl": "example.backlog.com",
  "backlogApiKeyConfigured": true,
  "defaultWebhook": { "configured": true, "validFormat": true },
  "categoryTargets": [{ "categoryId": "1247157", "validFormat": true }],
  "issues": [],
  "recentEvents": [
    {
      "at": "2026-09-07T13:12:18.091Z",
      "outcome": "success",
      "type": 2,
      "projectKey": "PROJ",
      "keyId": 45,
      "categoryIds": [],
      "matchedTarget": "SLACK_WEBHOOK_URL",
      "slackReason": "OK",
      "slackStatusCode": 200
    }
  ]
}
```

`recentEvents` には直近15件の受信結果が記録されます。`outcome` の意味は以下のとおりです。

| outcome | 意味 |
|---------|------|
| `success` | Slackへの送信に成功 |
| `send_failed` | 受信はしたがSlack送信に失敗（`slackReason` / `slackStatusCode` を確認） |
| `ignored` | 通知対象外のイベント種別（`type` を確認） |
| `unauthorized` | トークン不一致、または `WEBHOOK_SECRET` 未設定 |
| `invalid_json` | ペイロードがJSONとして解釈できない |
| `exception` | 処理中に例外が発生 |

**Backlogから通知したのに `recentEvents` に何も記録されない場合は、Backlogのリクエストがこのデプロイに届いていません。**
登録URLのデプロイIDと `/exec` を確認してください。

> ⚠️ Webhook URL や `WEBHOOK_SECRET` そのものは応答に含まれません（設定済みかどうかと形式の妥当性のみ）。

### Slackへのテスト送信

Slack側のエラー（`invalid_payload` / `channel_not_found` など）をそのまま確認できます。

```bash
# 既定チャンネルへ送信
curl -sL "https://script.google.com/macros/s/{デプロイID}/exec?token={WEBHOOK_SECRET}&action=test"

# 特定カテゴリの通知先へ送信
curl -sL "https://script.google.com/macros/s/{デプロイID}/exec?token={WEBHOOK_SECRET}&action=test&category=1247157"
```

```json
{ "status": "ok", "target": "SLACK_WEBHOOK_URL", "reason": "OK", "slackStatusCode": 200, "slackResponseBody": "ok" }
```

## 📊 通知内容

### 課題の追加

```
┌────────────────────────────────────────────┐
│ 課題が追加されました                          │  ← header
├────────────────────────────────────────────┤
│ :new: PROJ-42 本番DBの障害対応               │  ← 課題リンク付き
├────────────────────────────────────────────┤
│ プロジェクト: プロジェクトA   種別: バグ        │  ← fields
│ 状態: 未対応               優先度: 高          │
│ 担当者: 山田               登録者: 田中        │
│ カテゴリ: インフラ                            │
├────────────────────────────────────────────┤
│ 詳細                                        │
│ > 手順:                                     │  ← 引用（500文字まで）
│ > 1. 確認                                   │
└────────────────────────────────────────────┘
```

### 課題の更新

変更前後の差分（最大10件）とコメントを表示します。

```
┌────────────────────────────────────────────┐
│ 課題が更新されました                          │
├────────────────────────────────────────────┤
│ :pencil2: PROJ-42 本番DBの障害対応           │
├────────────────────────────────────────────┤
│ 変更内容                                    │
│ • 状態: 未対応 → 処理中                      │
│ • 担当者: (なし) → 山田                      │
├────────────────────────────────────────────┤
│ コメント                                    │
│ > 対応を開始しました。                        │
├────────────────────────────────────────────┤
│ 状態: 処理中 | 担当: 山田 | 操作: 田中         │  ← context
└────────────────────────────────────────────┘
```

### コメントの追加

```
┌────────────────────────────────────────────┐
│ コメントが追加されました                       │
├────────────────────────────────────────────┤
│ :speech_balloon: PROJ-42 本番DBの障害対応     │
├────────────────────────────────────────────┤
│ コメント                                    │
│ > 復旧を確認しました。                        │  ← 1000文字まで
├────────────────────────────────────────────┤
│ 状態: 完了 | 担当: 山田 | 操作: 佐藤           │
└────────────────────────────────────────────┘
```

## 🔒 セキュリティ

Google Apps Script の Web アプリは Backlog からの受信のため
`access: ANYONE_ANONYMOUS`（認証なし）で公開する必要があります。
そのため以下の対策を実装しています。

- **共有シークレット検証**: `?token=` の値を `WEBHOOK_SECRET` と照合し、不一致なら破棄
- **フェイルクローズ**: `WEBHOOK_SECRET` が未設定の場合も**受信を拒否**する（設定漏れによる無防備な公開を防止）
- **定数時間比較**: 文字列比較で長さ差・文字差をビット演算で集約し、タイミング攻撃の手掛かりを減らす
- **シークレットの非ログ出力**: 通常のログにはシークレットを出力しない（`generateWebhookSecret()` 実行時のみ表示）

### シークレットを更新したい場合

`generateWebhookSecret()` を再実行し、表示された新しいURLで Backlog 側のWebhook設定を更新してください。

## 🔍 ログ出力

構造化ログ（JSON）で出力されます。

```json
{
  "timestamp": "2026-09-07T12:38:59.914Z",
  "level": "INFO",
  "message": "カテゴリに対応するWebhook URLが見つかりました",
  "data": { "categoryId": "1695590" }
}
```

確認方法:

```bash
clasp tail-logs        # 直近のログを表示
clasp open-logs        # Cloud Logging をブラウザで開く
```

## 🛠 トラブルシューティング

| 症状 | 確認すべきこと |
|------|--------------|
| Backlogから通知が来ず HTTP 401 になる | 登録したURLが **`/dev`（テスト用）** になっていないか。`/exec` に差し替える（セットアップ手順7の注意書き参照） |
| WebアプリURLが HTTP 403「アクセスが拒否されました」を返す | **初回のOAuth認可が未完了**。GASエディタで `generateWebhookSecret()` を実行して承認する（セットアップ手順5） |
| Backlogは成功表示なのにSlackに通知が来ない | 診断エンドポイント（`?token=...`）で `recentEvents` を確認。記録が無ければBacklogのリクエストが届いていない |
| Slackに何も通知されない | `checkConfiguration()` を実行して設定漏れを確認 |
| ログに `Unauthorized` | Backlog に登録したURLの `?token=` が `WEBHOOK_SECRET` と一致しているか |
| ログに `WEBHOOK_SECRETが未設定` | `generateWebhookSecret()` を実行し、表示されたURLをBacklogに再登録 |
| ログに `Invalid Slack webhook URL format` | URLが `https://hooks.slack.com/services/` で始まっているか |
| ログに `Slack送信失敗 (status=404)` | Slack側でWebhookが削除・無効化されていないか |
| ログに `Slack送信失敗 (body=invalid_payload)` | Block Kit の構造エラー。`testWebhookProcessing()` で生成結果を確認 |
| 特定カテゴリだけ既定チャンネルに行く | `CATEGORY_MAP` のキーが**カテゴリID（数値の文字列）**か。カテゴリ名では動作しません |
| 変更差分が表示されない | Backlog が `content.changes` を送らないイベント（コメントのみの更新など） |
| 変更差分が `状態: ID:1 → 完了` のように表示される | `BACKLOG_API_KEY` が未設定または無効。設定すると「変更前」も名称で表示される |
| コードを変更したのに反映されない | `clasp push` 後に再デプロイしたか。**URLを変えずに更新するには `clasp update-deployment {デプロイID}`** を使う（`create-deployment` は別URLの新規デプロイになる） |

## 📝 カスタマイズ

### 通知メッセージの変更

`buildIssueCreatedMessage` / `buildIssueUpdatedMessage` / `buildCommentAddedMessage` を編集します。
共通の見出し部は `buildCommonBlocks`、属性フィールドは `buildAttributeFields` に切り出しています。

Block Kit のレイアウトは [Block Kit Builder](https://app.slack.com/block-kit-builder) で確認できます。

### 通知対象イベントの追加

`CONSTANTS.EVENT_TYPES` と `CONSTANTS.EVENT_PRESENTATION` にイベント種別を追加し、
`createSlackMessage()` の `switch` に分岐を追加します。
（Backlogのイベント種別: 1=課題の追加 / 2=課題の更新 / 3=課題にコメント / 4=課題の削除 / 12=Gitプッシュ など）

### 複数チャンネルへの同時通知

現在は最初にマッチした1件のみに通知します。
全マッチ先へ配信したい場合は `getWebhookUrlForCategories()` を配列を返すよう変更し、
`doPost()` 側でループ送信してください。

## 🗑 プロジェクトの削除（アンインストール）

1. **BacklogのWebhook削除**: プロジェクト設定 → インテグレーション → Webhook から削除
2. **Slack Incoming Webhookの削除**: Slack App 設定の Incoming Webhooks から削除
3. **GASプロジェクトの削除**: [GASダッシュボード](https://script.google.com/home) の「︙」→「削除」
4. **ローカルの整理**: `.clasp.json` を削除するとGASプロジェクトとのリンクが解除されます

## 🔗 関連リンク

- [Backlog Webhook](https://support-ja.backlog.com/hc/ja/articles/360035645534)
- [Backlog API - カテゴリー一覧の取得](https://developer.nulab.com/ja/docs/backlog/api/2/get-category-list/)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Slack Block Kit](https://api.slack.com/block-kit)
- [Google Apps Script](https://developers.google.com/apps-script)
