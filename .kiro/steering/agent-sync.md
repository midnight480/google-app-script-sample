---
inclusion: fileMatch
fileMatchPattern: "CLAUDE.md,AGENTS.md,GEMINI.md,.cursorrules,.clinerules,.antigravity/rules.md,.github/copilot-instructions.md"
---
# エージェント定義ファイル同期ルール

## マスターファイル
- `CLAUDE.md` がすべてのエージェント定義のマスター（Single Source of Truth）です
- 内容を変更する場合は必ず `CLAUDE.md` を編集してください

## 同期対象ファイル
| エージェント | ファイルパス |
|---|---|
| Anthropic Claude Code | `CLAUDE.md` (マスター) |
| OpenAI Codex | `AGENTS.md` |
| Gemini CLI | `GEMINI.md` |
| Cursor | `.cursorrules` |
| Cline | `.clinerules` |
| Antigravity | `.antigravity/rules.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |

## 同期方法
1. **自動同期（推奨）**: `CLAUDE.md` を保存すると、Kiroフック `sync-agent-rules` が `scripts/sync-agent-rules.sh` を実行し、全ファイルを自動同期します
2. **手動同期**: `./scripts/sync-agent-rules.sh` を実行してください

## 重要なルール
- `CLAUDE.md` 以外のエージェントファイルを直接編集しないでください
- 各ファイルの違いはタイトル行（1行目）のエージェント名のみです
- 内容は完全に同一であることが保証されます
