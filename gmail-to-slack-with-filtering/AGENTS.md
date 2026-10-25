# Agent Instructions (gmail-to-slack-with-filtering)

このディレクトリで作業する AI エージェント向けの説明です。リポジトリ全体のルールはルートの [AGENTS.md](../AGENTS.md) に従ってください。ここにはこのスクリプト固有のことだけを書きます。

## 出力言語
- 利用者は非エンジニアを想定しています。説明は日本語で、専門用語を避け、操作手順は「どの画面で・何を押すか」まで具体的に書いてください

## このスクリプトがすること
Gmail の受信メールを From（必須）/ To（任意）で絞り込み、本文から指定項目を抽出して、Slack（Bot Token + SlackApp ライブラリ, Block Kit）に通知し、スプレッドシートの「通知履歴」シートに記録します。5分ごとの時間主導トリガーで `main` が動きます。

## ファイル構成
| ファイル | 内容 |
|---|---|
| `Code.js` | すべての処理（定数 → ログ → バリデーション → 設定 → メイン → ヘルパー → テストの順） |
| `appsscript.json` | マニフェスト。リポジトリでは `.gitignore` 対象 |
| `appsscript.json.example` | マニフェストの正本（SlackApp ライブラリ設定入り）。`clasp create-script` 後にこれで上書きする |
| `.clasp.json.example` | clasp 設定の雛形。`.clasp.json` は `.gitignore` 対象 |
| `README.md` | 利用者向けの手順書 |
| `.claude/skills/` | カスタマイズ用の Skills |

## カスタマイズの原則
利用者の依頼の多くは **コードを変えずにスクリプトプロパティで解決** できます。まずそれを検討してください。

| 依頼の例 | 対応 |
|---|---|
| 抜き出す項目を増やしたい・変えたい | `EXTRACT_FIELDS` を作り直す（Skill: `customize-extract-fields`） |
| 送信元・宛先を変えたい | `FROM_ADDRESSES` / `TO_ADDRESSES`（カンマ区切り） |
| 通知先チャンネルを変えたい | `SLACK_CHANNEL_ID`（チャンネルにアプリの招待が必要） |
| 記録先のシートを変えたい | `SPREADSHEET_ID` |
| 初回セットアップ | Skill: `setup-gmail-to-slack` |

コードの変更が必要なのは、たとえば次のような場合です。
- 実行間隔・1回の処理件数・表示文言を変える → `CONSTANTS`（`TRIGGER_INTERVAL_MINUTES`, `MAX_MESSAGES_PER_RUN`, `NOT_FOUND_TEXT` など）
- Slack のメッセージの見た目を変える → `createSlackMessage`
- 1行形式・段落形式以外のメールに対応する → `extractFields` に探し方を追加（既存の2形式の挙動は変えない）

## 抽出ロジックの仕様（変更時に守ること）
- 項目ごとに **1行形式**（`項目名: 値` / `項目名：値`）→ **段落形式**（項目名だけの段落の次の段落）の順に探す
- 項目名は `normalizeLabel` で正規化したうえで **完全一致**（部分一致・前方一致にはしない。利用者が選んだ仕様）
- 段落形式で、次の段落が登録済みの別の項目名なら未回答として `（なし）`
- 抽出ロジックを変えたら `testExtractFields` にケースを追加し、Node でも確認する:
  ```bash
  node -e "const fs=require('fs'),vm=require('vm');const c={console,Utilities:{formatDate:d=>d.toISOString()}};vm.createContext(c);vm.runInContext(fs.readFileSync('Code.js','utf8'),c);process.exit(vm.runInContext('testExtractFields()',c)?0:1)"
  ```

## スプレッドシート記録の仕様
- 見出し行の名前で列を対応づける。新しい項目は右端に追加し、既存の列は削除・移動しない
- `メールID` 列で行を特定し、Slack 送信の再試行で成功したら同じ行を更新する
- `EXTRACT_FIELDS` の `name` に固定列名（`記録日時` `受信日時` `件名` `From` `To` `Slack送信` `Gmailリンク` `メールID`）は使えない
- 記録に失敗しても Slack 通知と処理済み管理は止めない

## 守ること
- **秘密情報**: `SLACK_BOT_TOKEN` をコード・README・コミットに書かない。スクリプトプロパティだけに置く
- **個人情報**: 抽出した値（氏名・連絡先など）をログに出さない。ログは件数・項目名のみ（例外は実行者本人が見る `previewExtraction`）。利用者から受け取ったサンプルメールの実データを README・テスト・コミットに含めず、ダミー値に置き換える
- **処理済み管理**: `LAST_PROCESSED_AT` / `LAST_PROCESSED_IDS` の意味を変えると、二重通知や取りこぼしが起きる。変える場合は移行方法も用意する
- **独立性**: 他のサンプルディレクトリに依存・変更しない
- 機能を変えたら `README.md` を更新する

## 反映手順
```bash
cd gmail-to-slack-with-filtering
clasp push      # コードを反映（トリガーは作り直し不要）
```
スクリプトプロパティの変更は push 不要で、次回の実行から反映されます。
