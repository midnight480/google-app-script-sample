---
name: setup-gmail-to-slack
description: gmail-to-slack-with-filtering の初回セットアップを非エンジニアに案内する。Slack アプリ作成、clasp でのプロジェクト作成と push、スクリプトプロパティの設定、動作確認、5分ごとのトリガー作成までを順に進める。「セットアップして」「使えるようにして」「通知が来ない」と言われたら使う。
---

# 初回セットアップを案内する

利用者は非エンジニアを想定しています。**1ステップずつ**進め、各ステップの終わりに「できましたか？」と確認してから次へ進んでください。エージェントが実行できる操作（ターミナル）は代わりに実行し、ブラウザでの操作は画面のどこを押すかまで具体的に伝えます。

## 0. 状況の確認
```bash
cd gmail-to-slack-with-filtering
ls -A          # .clasp.json があれば GAS プロジェクトは作成済み
clasp --version
```
- `.clasp.json` があれば手順2は飛ばして `clasp push` だけ行う
- clasp が未インストールなら `npm install -g @google/clasp`、未ログインなら利用者に `clasp login` を実行してもらう（ブラウザでの認証が必要なため）

## 1. Slack アプリ（利用者がブラウザで操作）
1. https://api.slack.com/apps → **Create New App** → **From scratch**
2. アプリ名とワークスペースを選んで作成
3. **OAuth & Permissions** → **Bot Token Scopes** に `chat:write` を追加
4. **Install to Workspace** → 許可
5. **Bot User OAuth Token**（`xoxb-...`）を控えてもらう
6. 通知先チャンネルで `/invite @アプリ名`
7. チャンネル名 → 一番下の **チャンネルID**（`C...`）を控えてもらう

トークンはチャットに貼ってもらわず、手順3で利用者自身にスクリプトプロパティへ入力してもらう。

## 2. GAS プロジェクトの作成（エージェントが実行）
```bash
cd gmail-to-slack-with-filtering
clasp create-script --type standalone --title "gmail-to-slack-with-filtering"
cp appsscript.json.example appsscript.json   # create-script で上書きされたマニフェストを戻す（SlackApp ライブラリ設定を含む）
clasp push --force
clasp open-script
```
`appsscript.json` を戻し忘れると、`SlackApp is not defined` になる。

## 3. スクリプトプロパティ（利用者がブラウザで操作）
1. GAS エディタで `initializeConfig` を実行（初回は承認画面 → アカウント選択 → 「詳細」→「移動」→「許可」）
2. ⚙️ **プロジェクトの設定** → **スクリプト プロパティ** で値を書き換える

| プロパティ | 値 |
|---|---|
| `FROM_ADDRESSES` | 送信元アドレス（カンマ区切りで複数可） |
| `TO_ADDRESSES` | 任意。To 欄で絞り込む場合のみ。空なら From だけで判定 |
| `EXTRACT_FIELDS` | 抜き出す項目。サンプルメールがあれば Skill `customize-extract-fields` で作る |
| `SLACK_BOT_TOKEN` | 手順1-5のトークン |
| `SLACK_CHANNEL_ID` | 手順1-7のチャンネルID |
| `SPREADSHEET_ID` | 任意。空なら自動作成 |

## 4. 動作確認（利用者が GAS エディタで実行）
順に実行し、実行ログを見てもらう。
1. `checkConfiguration` → 「設定に問題はありません」
2. `previewExtraction` → すべて ✅（❌ があれば `customize-extract-fields` で label を直す）
3. `testSlackNotification` → Slack にテスト通知が届き、シートにテスト行が入る
4. `setupSpreadsheet` → 記録用シートの URL を控える

## 5. 自動実行の開始
`createTrigger` を実行してもらう。次のことを必ず伝える。
- **最初の自動実行（5分以内）は通知しない**。その時点以降に届いたメールから通知される
- 止めるときは `deleteTriggers`

## よくあるつまずき
| 症状 | 対処 |
|---|---|
| `not_in_channel` | チャンネルにアプリを招待（`/invite @アプリ名`） |
| `invalid_auth` | `SLACK_BOT_TOKEN` を確認 |
| `channel_not_found` | `SLACK_CHANNEL_ID` がチャンネル名になっていないか |
| `SlackApp is not defined` | `appsscript.json.example` を `appsscript.json` にコピーして `clasp push` |
| 通知が来ない | トリガーがあるか（`checkConfiguration` の `triggers`）、初回は通知しない仕様、To 欄の判定（Cc は対象外） |

## 注意
- トークンや抽出された個人情報をファイル・コミットに残さない
- リポジトリでは `.clasp.json` と `appsscript.json` は `.gitignore` 対象。コミットするのは `.example` の方
