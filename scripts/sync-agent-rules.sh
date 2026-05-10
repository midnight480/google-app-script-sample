#!/bin/bash
# sync-agent-rules.sh
# エージェント定義ファイルの同期スクリプト
# ソースファイル (CLAUDE.md) を基準に、他のエージェント向けファイルを同期します。
#
# 使い方:
#   ./scripts/sync-agent-rules.sh
#
# 注意:
#   - CLAUDE.md をマスターとして使用します
#   - 各ファイルのタイトル行のみエージェント名に合わせて変更されます
#   - 内容は完全に同一になります

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE_FILE="$PROJECT_ROOT/CLAUDE.md"

if [ ! -f "$SOURCE_FILE" ]; then
  echo "エラー: ソースファイル $SOURCE_FILE が見つかりません"
  exit 1
fi

echo "🔄 エージェント定義ファイルの同期を開始します..."
echo "   ソース: CLAUDE.md"
echo ""

# AGENTS.md (OpenAI Codex)
sed '1s/.*/# OpenAI Codex Project Instructions (google-app-script-sample)/' "$SOURCE_FILE" > "$PROJECT_ROOT/AGENTS.md"
echo "   ✅ AGENTS.md (OpenAI Codex)"

# GEMINI.md (Gemini CLI)
sed '1s/.*/# Gemini CLI Project Instructions (google-app-script-sample)/' "$SOURCE_FILE" > "$PROJECT_ROOT/GEMINI.md"
echo "   ✅ GEMINI.md (Gemini CLI)"

# .cursorrules (Cursor)
sed '1s/.*/# Cursor Project Instructions (google-app-script-sample)/' "$SOURCE_FILE" > "$PROJECT_ROOT/.cursorrules"
echo "   ✅ .cursorrules (Cursor)"

# .clinerules (Cline)
sed '1s/.*/# Cline Project Instructions (google-app-script-sample)/' "$SOURCE_FILE" > "$PROJECT_ROOT/.clinerules"
echo "   ✅ .clinerules (Cline)"

# .antigravity/rules.md (Antigravity)
mkdir -p "$PROJECT_ROOT/.antigravity"
sed '1s/.*/# Antigravity Project Instructions (google-app-script-sample)/' "$SOURCE_FILE" > "$PROJECT_ROOT/.antigravity/rules.md"
echo "   ✅ .antigravity/rules.md (Antigravity)"

# .github/copilot-instructions.md (GitHub Copilot)
mkdir -p "$PROJECT_ROOT/.github"
sed '1s/.*/# GitHub Copilot Project Instructions (google-app-script-sample)/' "$SOURCE_FILE" > "$PROJECT_ROOT/.github/copilot-instructions.md"
echo "   ✅ .github/copilot-instructions.md (GitHub Copilot)"

echo ""
echo "✨ 同期完了！全7ファイルが最新の状態です。"
