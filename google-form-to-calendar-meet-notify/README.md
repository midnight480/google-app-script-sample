# Google Form to Calendar Meet Notify

Google Formで登録した内容をGoogle Calendarに登録し、Google Meetを発行してBacklogに課題を作成するGoogle Apps Scriptです。

## 🎯 機能

- Google Formの送信をトリガーにGoogle Calendarに予定を登録
- Google MeetのURLを自動発行
- Backlogに課題を作成（登録者を担当者、お知らせしたい人を通知先に設定）
- エラーハンドリングとリトライ機能（最大3回）
- 処理ログの記録（冪等性の保証）

## 📋 前提条件

- Google Calendar APIの有効化
- Google Formの作成と設定
- Google Apps Scriptの実行権限
- 対象のGoogle Calendarへのアクセス権限
- Backlogスペースへのアクセス権限とAPIキー
- Node.jsとclaspのインストール（ローカル開発・デプロイ用）

## 🚀 セットアップ手順

### 1. リポジトリのクローンと依存関係のインストール

```bash
# リポジトリをクローン（既にクローン済みの場合はスキップ）
cd google-form-to-calendar-meet-notify

# claspをグローバルにインストール（未インストールの場合）
npm install -g @google/clasp

# Googleアカウントでログイン
clasp login
```

### 2. ソースコードのデプロイ

```bash
# ローカルのコードをGoogle Apps Scriptにプッシュ
clasp push

# デプロイ後、Google Apps Scriptエディタで確認
clasp open
```

### 3. Google Calendar APIの有効化

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択（または新規作成）
3. 「APIとサービス」→「ライブラリ」を開く
4. 「Google Calendar API」を検索して有効化

5. Google Apps Scriptエディタで：
   - 「拡張機能」→「Google 拡張機能サービス」を開く
   - 「Calendar API」を有効化
   - バージョン「v3」を選択

### 4. スクリプトプロパティの設定

Google Apps Scriptエディタで以下のプロパティを設定します：

1. 「プロジェクトの設定」→「スクリプト プロパティ」を開く
2. 以下のプロパティを追加：

| プロパティ名 | 説明 | 例 |
|------------|------|-----|
| `SHARED_CALENDAR_ID` | 共有カレンダーのID（必須） | `c_xxx@group.calendar.google.com` |
| `BACKLOG_SPACE_URL` | BacklogスペースのURL（必須） | `https://your-space.backlog.com` または `https://your-space.backlog.jp` |
| `BACKLOG_API_KEY` | Backlog APIキー（必須） | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `BACKLOG_PROJECT_KEY` | Backlogプロジェクトキー（必須） | `PROJECT` |
| `TIMEZONE` | タイムゾーン（オプション、デフォルト: Asia/Tokyo） | `Asia/Tokyo` |

#### カレンダーIDの取得方法

1. Googleカレンダーを開く
2. 共有したいカレンダーの横の「⋮」をクリック
3. 「設定と共有」を選択
4. 「カレンダーの統合」セクションで「カレンダーID」をコピー

#### Backlog APIキーの取得方法

1. Backlogにログイン
2. 「個人設定」→「API」を開く
3. 「新しいAPIキーを発行」をクリック
4. APIキーをコピー（表示されるのは一度だけなので注意）

#### Backlogプロジェクトキーの確認方法

1. Backlogでプロジェクトを開く
2. プロジェクトのURLから確認（例: `https://your-space.backlog.com/projects/PROJECT` の`PROJECT`部分）

### 5. フォームとトリガーの設定

**重要**: フォーム送信時のトリガーを使用するには、**スプレッドシートにバインドされたスクリプト**として実行する必要があります。

#### 方法1: プログラムで自動設定（推奨）

この方法では、フォーム作成とトリガー設定を一度に実行できます。

**手順A: claspを使用する方法（推奨・最も簡単）**

1. Google Apps Scriptエディタで、**スタンドアロンスクリプト**としてコードをデプロイ（`clasp push`）
2. `FormSetup.gs`の`createFormWithBacklogUsers()`関数を実行してフォームを作成
   - 実行後、スプレッドシートに「スクリプト設定手順」シートが自動的に作成されます
   - このシートには、claspを使用する方法と手動コピーの方法が記載されています
3. ターミナルでプロジェクトディレクトリに移動
   ```bash
   cd /path/to/google-form-to-calendar-meet-notify
   ```
4. スプレッドシートにバインドされたスクリプトを作成
   ```bash
   clasp create --title "フォームスクリプト" --type sheets --parentId [スプレッドシートID]
   ```
   - スプレッドシートIDは、「フォーム設定情報」シートの「スプレッドシートURL」から取得できます
   - または、スプレッドシートのURLから直接取得：`https://docs.google.com/spreadsheets/d/[スプレッドシートID]/edit`
5. コードをデプロイ
   ```bash
   clasp push
   ```
6. Google Apps Scriptエディタでスクリプトプロパティを設定
   - スプレッドシートの「拡張機能」→「Apps Script」を開く
   - 「プロジェクトの設定」→「スクリプト プロパティ」で以下を設定：
     - `SHARED_CALENDAR_ID`
     - `BACKLOG_SPACE_URL`
     - `BACKLOG_API_KEY`
     - `BACKLOG_PROJECT_KEY`
     - `TIMEZONE`（オプション）
7. `FormSetup.gs`の`createFormWithBacklogUsersAndTrigger()`関数を実行
   - この関数は、フォーム作成とトリガー設定を一度に実行します
   - **注意**: この関数はスプレッドシートにバインドされたスクリプトとして実行する必要があります

**手順B: 手動でコピー＆ペースト（claspが使えない場合）**

1. Google Apps Scriptエディタで、**スタンドアロンスクリプト**としてコードをデプロイ（`clasp push`）
2. `FormSetup.gs`の`createFormWithBacklogUsers()`関数を実行してフォームを作成
   - 実行後、スプレッドシートに「スクリプト設定手順」シートと「全コード出力」シートが自動的に作成されます
3. 作成されたスプレッドシートを開く
4. 「全コード出力」シートを確認
   - このシートには、必要なファイル一覧とコードを貼り付ける場所が用意されています
5. 現在のスタンドアロンスクリプトのすべての.gsファイルのコードをコピー
   - 「全コード出力」シートに記載されているファイル一覧を参考にしてください
6. 「スクリプト設定手順」シートに記載されているURLをクリックしてApps Scriptエディタを開く
   - または、スプレッドシートの「拡張機能」→「Apps Script」を開く
7. コピーしたコードをスプレッドシートにバインドされたApps Scriptエディタに貼り付け
8. スクリプトプロパティを設定（「プロジェクトの設定」→「スクリプト プロパティ」）
9. `FormSetup.gs`の`setupFormSubmitTrigger()`関数を実行
   - または、`createFormWithBacklogUsersAndTrigger()`関数を実行

**自動フォーム作成で追加されるフィールド：**

- **件名**（テキスト、必須）
- **開始日時**（日時、必須）
- **終了日時**（日時、必須）
- **登録者（担当者）**（リストボックス、必須）- Backlogプロジェクトのユーザー一覧から選択
- **お知らせしたい人**（チェックボックス、必須）- Backlogプロジェクトのユーザー一覧から複数選択
- **イベント説明**（段落テキスト、オプション）

**実行後の確認：**

- フォームURLとスプレッドシートURLがログに表示されます
- スプレッドシートの「フォーム設定情報」シートに詳細情報が記録されます
- スプレッドシートの「スクリプト設定手順」シートにスクリプトコピー手順が記載されます（claspを使用する方法と手動コピーの方法）
- スプレッドシートの「全コード出力」シートに、手動コピー用のテンプレートが用意されます（claspが使えない場合）
- トリガーが正しく設定されているか、「拡張機能」→「トリガー」で確認できます

#### 方法2: 手動で設定

1. Google Formを手動で作成し、以下のフィールドを追加：

| フィールド名 | タイプ | 必須 | 説明 |
|------------|--------|------|------|
| 件名 | テキスト | ✅ | イベントのタイトル |
| 説明 | 段落テキスト | ❌ | イベントの説明 |
| 開始日時 | 日時 | ✅ | イベントの開始日時 |
| 終了日時 | 日時 | ✅ | イベントの終了日時 |
| 登録者（担当者） | リストボックス | ✅ | Backlogユーザーから選択（値はユーザーID） |
| お知らせしたい人 | チェックボックス | ✅ | Backlogユーザーから複数選択（値はユーザーID） |

2. フォームにリンクされたスプレッドシートを開く
3. スプレッドシートの「拡張機能」→「Apps Script」を開く
4. コードをスプレッドシートにコピー＆ペースト（または、`clasp`でスプレッドシートにバインドされたスクリプトとして作成）
5. 「トリガー」をクリック（時計アイコン）
6. 「トリガーを追加」をクリック
7. 以下の設定でトリガーを作成：
   - **実行する関数**: `onFormSubmit`
   - **イベントのソース**: 「スプレッドシートから」
   - **イベントの種類**: 「フォーム送信時」

**注意**: 手動でフォームを作成する場合、Backlogユーザー一覧を取得してチェックボックス/リストボックスに設定する必要があります。自動フォーム作成機能（方法1）を使用することを強く推奨します。

### 6. 権限の承認

初回実行時に：

1. スクリプトを実行（テスト実行など）
2. 「承認が必要です」をクリック
3. Googleアカウントを選択
4. 「詳細」→「[プロジェクト名]に移動」をクリック
5. 必要な権限を承認：
   - Google Calendarへのアクセス
   - メール送信権限
   - スプレッドシートへのアクセス

## 📁 プロジェクト構成

```
google-form-to-calendar-meet-notify/
├── Main.gs                      # エントリーポイント（onFormSubmit）
├── FormSubmissionProcessor.gs   # フォーム送信処理のメインロジック
├── ProcessingLogger.gs          # 処理ログ管理
├── CalendarEventCreator.gs     # カレンダーイベント作成
├── BacklogIssueCreator.gs      # Backlog課題作成（ユーザー一覧取得、課題作成）
├── EmailNotificationSender.gs  # メール通知送信（レガシー、使用されていません）
├── FormManager.gs              # フォーム管理（フォーム作成用、Backlogユーザー選択機能含む）
├── FormSetup.gs                # フォームセットアップ用ヘルパー関数
├── Validation.gs                # バリデーション関数
├── Models.gs                    # データモデル定義
├── Utils.gs                     # ユーティリティ関数（ログ、日時解析など）
├── Constants.gs                 # 定数定義
├── LegacyFunctions.gs           # 後方互換性のためのレガシー関数
├── Tests.gs                     # テスト関数
├── PropertyTests.js             # プロパティベーステスト
├── TestRunner.js                # テストランナー
├── appsscript.json              # Apps Script設定
├── .clasp.json                  # Clasp設定
└── README.md                    # このファイル
```

## 🔧 開発・デプロイワークフロー

### ローカルでの開発

```bash
# コードを編集後、Google Apps Scriptにプッシュ
clasp push

# プッシュ前に変更内容を確認
clasp status

# Google Apps Scriptエディタで開く
clasp open
```

### デプロイ

```bash
# 最新のコードをプッシュ
clasp push

# デプロイ後、Google Apps Scriptエディタでテスト実行
clasp open
```

### コードの取得（他の環境から）

```bash
# Google Apps Scriptから最新のコードを取得
clasp pull
```

## 🧪 テスト

### 手動テスト

Google Apps Scriptエディタで以下の関数を実行：

1. `testDateTimeParsing()` - 日時解析のテスト
2. `testCreateCalendarEvent()` - カレンダーイベント作成のテスト
3. `testGetBacklogUsers()` - Backlogユーザー一覧取得のテスト
4. `testFormManager()` - フォーム作成のテスト
5. `createFormWithBacklogUsers()` - Backlogユーザー一覧を含むフォーム作成

### プロパティベーステスト

```bash
# Google Apps Scriptエディタで実行
TestRunner.runAllPropertyTests()
```

## 📝 使用方法

1. Google Formにアクセス
2. 必要な情報を入力：
   - 件名
   - 開始日時・終了日時
   - 登録者（担当者）- Backlogユーザー一覧から選択
   - お知らせしたい人 - Backlogユーザー一覧から複数選択
   - イベント説明（オプション）
3. フォームを送信
4. 自動的に以下が実行されます：
   - Google Calendarにイベントが作成される
   - Google MeetのURLが生成される
   - Backlogに課題が作成される（選択した登録者が担当者、選択したお知らせしたい人が通知先）

## 🔍 トラブルシューティング

### エラー: "SHARED_CALENDAR_IDがスクリプトプロパティに設定されていません"

**解決方法**: スクリプトプロパティに`SHARED_CALENDAR_ID`を設定してください。

### エラー: "カレンダーへのアクセス権限がありません"

**解決方法**: 
1. Google Calendar APIが有効化されているか確認
2. カレンダーの共有設定で、スクリプトを実行するアカウントに適切な権限を付与

### Backlog課題が作成されない

**解決方法**:
1. Backlog設定（`BACKLOG_SPACE_URL`、`BACKLOG_API_KEY`、`BACKLOG_PROJECT_KEY`）が正しく設定されているか確認
2. Backlog APIキーが有効か確認
3. フォームでユーザーが正しく選択されているか確認
4. スクリプトの実行ログを確認（「実行」→「実行ログ」）
5. BacklogスペースのURLが正しいか確認（`.backlog.com`または`.backlog.jp`で終わる必要があります）
6. Backlogプロジェクトにユーザーが存在するか確認

### フォームにBacklogユーザーが表示されない

**解決方法**:
1. `createFormWithBacklogUsers()`関数を実行してフォームを作成する場合、Backlog設定が正しく行われているか確認
2. Backlogプロジェクトにユーザーが存在するか確認
3. Backlog APIキーにプロジェクトへのアクセス権限があるか確認

### フォームのフィールドが認識されない

**解決方法**:
1. フォームのフィールド名を確認（`Main.gs`の`parseFormResponses`関数を参照）
2. フィールド名に以下のキーワードが含まれているか確認：
   - 件名: 「件名」または「タイトル」
   - 説明: 「説明」または「本文」
   - 開始日時: 「開始日時」または「開始時刻」
   - 終了日時: 「終了日時」または「終了時刻」
   - 登録者（担当者）: 「登録者」と「担当者」を含む（リストボックス）
   - お知らせしたい人: 「お知らせしたい人」または「参加者」（チェックボックス）
3. 自動フォーム作成機能（`createFormWithBacklogUsers()`）を使用することを推奨

### 処理ログの確認

1. フォームにリンクされたスプレッドシートを開く
2. 「処理ログ」シートを確認
3. 各処理のステータス（PROCESSING/SUCCESS/ERROR）を確認

## 📚 参考資料

- [Google Apps Script公式ドキュメント](https://developers.google.com/apps-script)
- [Google Calendar API](https://developers.google.com/calendar/api/v3/reference)
- [Clasp公式ドキュメント](https://github.com/google/clasp)
- [Google Forms API](https://developers.google.com/apps-script/reference/forms)

## 🔐 セキュリティ注意事項

- スクリプトプロパティに機密情報（APIキーなど）を保存する際は注意
- カレンダーIDは共有カレンダーのみを使用
- メールアドレスの検証を必ず実施
- 処理ログに個人情報が含まれないよう注意
- Backlog APIキーは適切に管理し、漏洩しないよう注意

## 📄 ライセンス

このプロジェクトのライセンス情報は`LICENSE`ファイルを参照してください。

## 🤝 コントリビューション

バグ報告や機能要望は、Issueでお知らせください。

---

**作成日**: 2025年1月
**最終更新**: 2025年1月
