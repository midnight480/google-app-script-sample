---
inclusion: manual
---
# Git ワークフロールール

## PR作成時のルール

PRを作成する際は、以下の手順に従ってください：

1. PR本文を `pr-body.md` として一時ファイルに書き出す
2. `gh pr create --title "タイトル" --body-file pr-body.md --base main` で作成する
3. PR作成完了後、`pr-body.md` を削除する

これにより、シェルのエスケープ問題（ダブルクォーテーション、バッククォート、特殊文字など）を回避できます。

### 例
```bash
# 1. 本文ファイル作成
# (fs_write で pr-body.md を作成)

# 2. PR作成
gh pr create --title "feat: 機能追加" --body-file pr-body.md --base main

# 3. 一時ファイル削除
rm pr-body.md
```
