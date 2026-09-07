---
inclusion: fileMatch
fileMatchPattern: "AGENTS.md,CLAUDE.md,GEMINI.md,.cursorrules,.clinerules,.antigravity/rules.md,.github/copilot-instructions.md"
---
# エージェント定義ファイルのルール

## 実体は AGENTS.md ただ1つ

エージェント向けの指示は **`AGENTS.md` にのみ記述**します。

`AGENTS.md` は複数のコーディングエージェントが参照する共通フォーマットとして
広く使われているため、これを唯一の実体としています。

## ポインタファイル

以下はすべて `AGENTS.md` を参照するだけの13行のポインタです。指示の実体は含みません。

| エージェント | ファイルパス |
|---|---|
| Anthropic Claude Code | `CLAUDE.md` |
| Gemini CLI | `GEMINI.md` |
| Cursor | `.cursorrules` |
| Cline | `.clinerules` |
| Antigravity | `.antigravity/rules.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |

内容はエージェント名を示すタイトル行以外すべて同一です。

## 重要なルール

- **内容を変更する場合は `AGENTS.md` だけを編集してください**
- ポインタファイルは変更不要です（`AGENTS.md` を指しているだけなので自動的に追従します）
- **同期スクリプトやフックは存在しません。** 複製を持たない構成にしたため不要になりました
- 新しいエージェントに対応する場合は、既存のポインタファイルをコピーして
  タイトル行だけ書き換えてください
