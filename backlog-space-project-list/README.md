# Backlog Space Project List

Google Apps Script を使用して Backlog API からライセンス情報、プロジェクト一覧、および各プロジェクトの課題数を取得し、Google スプレッドシートに出力するツールです。

## 機能

- **ライセンス情報取得**: Backlog スペースのライセンス情報を取得
- **プロジェクト一覧取得**: 全プロジェクト（アーカイブ済み含む）の情報を取得
- **課題数取得**: 各プロジェクトの課題数をカウント

## セットアップ

### 方法1: Clasp を使用したデプロイ（推奨）

#### 1. Clasp のインストール

```bash
npm install -g @google/clasp
```

#### 2. Google Apps Script API の有効化

1. [Google Apps Script Settings](https://script.google.com/home/usersettings) にアクセス
2. 「Google Apps Script API」をオンにする

#### 3. Clasp でログイン

```bash
clasp login
```

#### 4. プロジェクトのクローンまたは作成

**既存プロジェクトをクローンする場合:**
```bash
clasp clone <SCRIPT_ID>
```

**新規プロジェクトを作成する場合:**
```bash
clasp create --type sheets --title "Backlog Space Project List"
```

#### 5. ファイルのプッシュ

```bash
clasp push
```

#### 6. スプレッドシートでの確認

1. `clasp open` でプロジェクトをブラウザで開く
2. または Google スプレッドシートから「拡張機能」→「Apps Script」でアクセス

### 方法2: 手動セットアップ

#### 1. Google Apps Script プロジェクトの作成

1. [Google Apps Script](https://script.google.com/) にアクセス
2. 「新しいプロジェクト」を作成
3. プロジェクト名を「Backlog Space Project List」に変更

#### 2. ファイルのアップロード

以下のファイルを Google Apps Script プロジェクトに追加：

- `Code.js` - メイン処理
- `Dialog.html` - ユーザーインターフェース

#### 3. Google スプレッドシートの準備

1. 新しい Google スプレッドシートを作成
2. Google Apps Script プロジェクトをスプレッドシートにバインド

## 使用方法

### 事前準備

1. **Backlog API キーの取得**
   - Backlog にログイン
   - 個人設定 → API → 「登録」でAPIキーを生成
   - 生成されたAPIキーをコピー

2. **スペース情報の確認**
   - スペースID: Backlog URL の `https://[スペースID].backlog.com` の部分
   - ドメイン: `backlog.com`, `backlog.jp`, `backlogtool.com` のいずれか

### ステップ1: ライセンス・プロジェクト情報の取得

1. Google スプレッドシートを開く
2. メニューから「Backlog API」→「ライセンス・プロジェクト一覧を取得する」を選択
3. ダイアログに以下を入力：
   - **スペースID**: あなたのBacklogスペースID
   - **ドメイン**: 使用しているドメインを選択
   - **APIキー**: 取得したAPIキーを入力
4. 「実行」ボタンをクリック

#### 出力結果

新しいシートが作成され、以下の情報が出力されます：

**■ライセンス情報**
- licenceTypeId: ライセンスタイプID
- limitDate: 有効期限
- startedOn: 開始日
- storageLimit: ストレージ制限（GB表示）
- active: アクティブ状態
- price: 価格

**■プロジェクト一覧**
- A列: id（プロジェクトID）
- B列: projectKey（プロジェクトキー）
- C列: name（プロジェクト名）
- D列: archived（アーカイブ状態）

### ステップ2: 課題数の取得

1. ステップ1で作成されたシートを開く
2. メニューから「Backlog API」→「プロジェクト毎の課題数を取得する」を選択
3. 同じAPIキー情報を入力
4. 「実行」ボタンをクリック

#### 出力結果

既存のシートのE列に課題数が追加されます：
- E5: "issue-count"（ヘッダー）
- E6以降: 各プロジェクトの課題数

## データ構造

### スプレッドシートの列構成

| 列 | 内容 | 説明 |
|---|---|---|
| A | プロジェクトID | API呼び出しに使用される数値ID |
| B | プロジェクトキー | プロジェクトの文字列識別子 |
| C | プロジェクト名 | プロジェクトの表示名 |
| D | アーカイブ状態 | true/false |
| E | 課題数 | 各プロジェクトの課題数 |

## API エンドポイント

このツールは以下の Backlog API エンドポイントを使用します：

1. **ライセンス情報**: `GET /api/v2/space/licence`
2. **プロジェクト一覧**: `GET /api/v2/projects?all=true`
3. **課題数取得**: `GET /api/v2/issues/count?projectId[]={projectId}`

## エラーハンドリング

- API接続エラーの場合、具体的なエラーメッセージが表示されます
- 個別プロジェクトの課題数取得に失敗した場合、該当セルに「エラー」と表示されます
- 必要な前提条件が満たされていない場合、適切なガイダンスメッセージが表示されます

## 注意事項

- **APIレート制限**: 課題数取得時は各API呼び出し間に100ms の待機時間を設けています
- **権限**: 使用するAPIキーには、対象プロジェクトへの適切なアクセス権限が必要です
- **データ更新**: 新しい実行のたびに新しいシートが作成されます（課題数取得は既存シートを更新）

## トラブルシューティング

### よくある問題

1. **「ライセンス・プロジェクト情報が見つかりません」エラー**
   - 先に「ライセンス・プロジェクト一覧を取得する」を実行してください

2. **「シート名はすでに存在しています」エラー**
   - 同じ日時に複数回実行した場合に発生
   - 既存のシートを削除するか、時間をおいて再実行してください

3. **API接続エラー**
   - スペースID、ドメイン、APIキーが正しいか確認してください
   - APIキーの権限を確認してください

4. **課題数が「エラー」と表示される**
   - プロジェクトIDが正しいか確認してください
   - APIキーに該当プロジェクトへのアクセス権限があるか確認してください

## 開発者向け情報

### ファイル構成

```
backlog-space-project-list/
├── src/
│   ├── Code.js          # メイン処理ロジック
│   └── Dialog.html      # ユーザーインターフェース
└── README.md           # このファイル
```

### 主要な関数

- `fetchAndWriteLicenseAndProjects()`: ライセンス・プロジェクト情報取得
- `fetchAndWriteIssueCounts()`: 課題数取得の開始処理
- `fetchAndWriteProjectIssues()`: 実際の課題数取得・書き込み処理
- `checkModeAndExecute()`: 実行モードの判定と適切な関数の呼び出し

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 更新履歴

- v1.0.0: 初回リリース
  - ライセンス情報取得機能
  - プロジェクト一覧取得機能
  - 課題数取得機能
  - エラーハンドリング
  - ユーザーフレンドリーなUI
