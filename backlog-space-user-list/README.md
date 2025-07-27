# Backlog ユーザー・プロジェクト管理ツール

BacklogのAPIを使用して、ユーザー一覧、プロジェクト一覧、プロジェクトメンバー、チーム情報を取得し、Google Sheetsで管理するツールです。

## 機能概要

### 主要機能
1. **[STEP1] ユーザー一覧・プロジェクト一覧を取得**
   - Backlogスペースの全ユーザー情報を取得
   - 全プロジェクト情報（アーカイブ済み含む）を取得
   - 各情報を日付別シートに出力

2. **[STEP2] プロジェクトメンバー、チームを取得**
   - 各プロジェクトのメンバー数・チーム数を集計
   - プロジェクトメンバー詳細情報を取得
   - チームメンバー詳細情報を取得

3. **[STEP3] プロジェクトに参加していないメンバーの確認**
   - ユーザーのプロジェクト参加状況を分析
   - どのプロジェクトにも所属していないメンバーを特定
   - 未参加メンバーを赤色で強調表示

### 出力シート
- `UserList_YYYYMMDD`: ユーザー一覧（ID、名前、ロール、メールアドレス等）
- `ProjectList_YYYYMMDD`: プロジェクト一覧（ID、キー、名前、アーカイブ状態、メンバー数、チーム数）
- `ProjectMember_YYYYMMDD`: プロジェクトメンバー詳細
- `TeamMemberList_YYYYMMDD`: チームメンバー詳細

## セットアップ

### 前提条件
- Node.js がインストールされていること
- Google Apps Script CLI (clasp) がインストールされていること
- Backlog APIキーを取得していること

### 1. Claspのインストール
```bash
npm install -g @google/clasp
```

### 2. Claspにログイン
```bash
clasp login
```

### 3. プロジェクトのクローン
```bash
git clone <repository-url>
cd backlog-space-user-list
```

### 4. Google Sheetsの作成
1. Google Sheetsで新しいスプレッドシートを作成
2. スプレッドシートのIDをメモ（URLの`/d/`と`/edit`の間の文字列）

### 5. Claspプロジェクトの初期化
```bash
clasp create --type sheets --title "Backlog管理ツール"
```

または既存のスプレッドシートに紐付ける場合：
```bash
clasp create --type sheets --rootDir ./src
# .clasp.jsonのscriptIdを既存のスプレッドシートのスクリプトIDに変更
```

### 6. コードのデプロイ
```bash
clasp push
```

## 使用方法

### 事前準備
1. **Backlog APIキーの取得**
   - Backlogにログイン
   - 個人設定 → API → APIキーを発行
   - 30桁の英数字をメモ

2. **スプレッドシートでの設定**
   - デプロイ後、スプレッドシートを開く
   - メニューバーに「Backlog API」が表示されることを確認

### 実行手順

#### STEP1: ユーザー一覧・プロジェクト一覧を取得
1. メニューから「Backlog API」→「[STEP1]ユーザー一覧・プロジェクト一覧を取得」を選択
2. ダイアログで以下を入力：
   - **スペースID**: BacklogのスペースID（URLの`https://[スペースID].backlog.jp`の部分）
   - **ドメイン**: `backlog.com`, `backlog.jp`, `backlogtool.com`から選択
   - **APIキー**: 取得した30桁のAPIキー
3. 「実行」をクリック
4. 処理完了後、以下のシートが作成されます：
   - `UserList_YYYYMMDD`
   - `ProjectList_YYYYMMDD`

#### STEP2: プロジェクトメンバー、チームを取得
1. **STEP1が完了していることを確認**
2. メニューから「[STEP2]プロジェクトメンバー、チームを取得」を選択
3. 同様にスペースID、ドメイン、APIキーを入力
4. 「実行」をクリック
5. 処理完了後、以下が更新・作成されます：
   - `ProjectList_YYYYMMDD`にuser-count、team-countが追加
   - `ProjectMember_YYYYMMDD`が作成
   - `TeamMemberList_YYYYMMDD`が作成

#### STEP3: プロジェクトに参加していないメンバーの確認
1. **STEP1、STEP2が完了していることを確認**
2. メニューから「[STEP3]プロジェクトに参加していないメンバーの確認」を選択
3. 処理完了後、`UserList_YYYYMMDD`のH列に参加プロジェクト数が表示
4. 0件（どのプロジェクトにも所属していない）のユーザーは赤色で表示

## シート構成詳細

### UserList_YYYYMMDD
| 列 | 項目 | 説明 |
|---|---|---|
| A | id | ユーザーID |
| B | userId | ユーザー名 |
| C | name | 表示名 |
| D | Role | ロール（Administrator/User/Reporter/Guest） |
| E | lang | 言語設定 |
| F | mailAddress | メールアドレス |
| G | nulabAccount.name | Nulabアカウント名 |
| H | isJoinedProject | 参加プロジェクト数（STEP3で追加） |

### ProjectList_YYYYMMDD
| 列 | 項目 | 説明 |
|---|---|---|
| A | id | プロジェクトID |
| B | projectKey | プロジェクトキー |
| C | name | プロジェクト名 |
| D | archived | アーカイブ状態（true/false） |
| E | user-count | メンバー数（STEP2で追加） |
| F | team-count | チーム数（STEP2で追加） |

### ProjectMember_YYYYMMDD
| 列 | 項目 | 説明 |
|---|---|---|
| A | projectId | プロジェクトID |
| B | projectKey | プロジェクトキー |
| C | projectName | プロジェクト名 |
| D | userId | ユーザーID |
| E | name | ユーザー名 |
| F | roleType | ロールタイプ |
| G | lang | 言語設定 |
| H | mailAddress | メールアドレス |
| I | nulabAccount.name | Nulabアカウント名 |

### TeamMemberList_YYYYMMDD
| 列 | 項目 | 説明 |
|---|---|---|
| A | id | チームID |
| B | name | チーム名 |
| C | members.name | メンバー名 |
| D | members.nulabAccount.name | メンバーのNulabアカウント名 |
| E | members.mailAddress | メンバーのメールアドレス |

## トラブルシューティング

### メニューが表示されない場合
1. スプレッドシートを更新（F5キー）
2. Google Apps Scriptエディタで手動実行：
   ```
   関数選択 → onOpen → 実行ボタン（▶）をクリック
   ```
3. ブラウザのキャッシュをクリア

### エラーが発生した場合
1. **APIキーの確認**: 正しい30桁のAPIキーが入力されているか
2. **スペースIDの確認**: 正しいスペースIDが入力されているか
3. **権限の確認**: APIキーに必要な権限があるか
4. **実行順序の確認**: STEP1→STEP2→STEP3の順で実行されているか

### ログの確認方法
1. Google Apps Scriptエディタを開く
2. 左側メニューから「実行数」をクリック
3. 最新の実行を選択してログを確認

## API制限について
- Backlog APIには制限があります（1時間あたり5000回等）
- 大量のプロジェクトがある場合は、処理に時間がかかる場合があります
- エラーが発生した場合は、しばらく時間をおいてから再実行してください

## ライセンス
MIT License

## 更新履歴
- v1.0.0: 初回リリース
  - ユーザー一覧・プロジェクト一覧取得機能
  - プロジェクトメンバー・チーム取得機能
  - プロジェクト未参加メンバー確認機能
