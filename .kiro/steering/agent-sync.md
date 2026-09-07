---
inclusion: fileMatch
fileMatchPattern: "AGENTS.md,CLAUDE.md,GEMINI.md,.cursorrules,.clinerules,.antigravity/rules.md,.github/copilot-instructions.md"
---
# エージェント定義ファイル同期ルール

## マスターファイル
- `AGENTS.md` がすべてのエージェント定義のマスター（Single Source of Truth）です
- 内容を変更する場合は必ず `AGENTS.md` を編集してください

`AGENTS.md` は複数のコーディングエージェントが参照する共通フォーマットとして広く使われているため、
これをマスターに置き、各エージェント固有のファイルはここへ集約する構成にしています。

## 同期対象ファイル

### ポインタ（AGENTS.md を参照するだけの短いファイル）
`@ファイル名` のインポート記法に対応しているエージェント向けです。

| エージェント | ファイルパス |
|---|---|
| Anthropic Claude Code | `CLAUDE.md` |
| Gemini CLI | `GEMINI.md` |

### 複製（AGENTS.md の全文コピー）
インポート記法を持たないため、全文を複製します。差分はタイトル行（1行目）のみです。

| エージェント | ファイルパス |
|---|---|
| Cursor | `.cursorrules` |
| Cline | `.clinerules` |
| Antigravity | `.antigravity/rules.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |

## 同期方法
1. **自動同期（推奨）**: `AGENTS.md` を保存すると、Kiroフック `sync-agent-rules` が `scripts/sync-agent-rules.sh` を実行し、全ファイルを自動同期します
2. **手動同期**: `./scripts/sync-agent-rules.sh` を実行してください

## 重要なルール
- `AGENTS.md` 以外のエージェントファイルを直接編集しないでください（同期スクリプトで上書きされます）
- 新しいエージェントを追加する場合は `scripts/sync-agent-rules.sh` に `write_pointer` または `write_copy` の呼び出しを追加してください
