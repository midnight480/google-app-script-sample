#!/bin/bash
# sync-agent-rules.sh
# エージェント定義ファイルの同期スクリプト
# ソースファイル (AGENTS.md) を基準に、他のエージェント向けファイルを同期します。
#
# 使い方:
#   ./scripts/sync-agent-rules.sh
#
# 方針:
#   - AGENTS.md をマスター（Single Source of Truth）として使用します
#   - CLAUDE.md / GEMINI.md は AGENTS.md を参照する「ポインタ」を生成します
#     （Claude Code と Gemini CLI は @ファイル名 のインポート記法に対応しているため）
#   - 上記以外はインポート記法を持たないため、従来どおり全文の複製を生成します
#     （タイトル行のみエージェント名に合わせて変更されます）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE_FILE="$PROJECT_ROOT/AGENTS.md"

if [ ! -f "$SOURCE_FILE" ]; then
  echo "エラー: ソースファイル $SOURCE_FILE が見つかりません"
  exit 1
fi

echo "🔄 エージェント定義ファイルの同期を開始します..."
echo "   ソース: AGENTS.md"
echo ""

# --- ポインタを生成する（インポート記法に対応したエージェント） ---
# $1: 出力先パス, $2: タイトル行, $3: エージェント名
write_pointer() {
  local dest="$1"
  local title="$2"
  local agent="$3"

  cat > "$dest" <<EOF
$title

このリポジトリのエージェント向け指示は **[AGENTS.md](AGENTS.md)** に集約されています。

@AGENTS.md

---

上記のインポートが解決されない環境では、作業を始める前に \`AGENTS.md\` を読み込んでください。

> ⚠️ **このファイルを直接編集しないでください。**
> \`./scripts/sync-agent-rules.sh\` の実行時に上書きされます。
> 内容を変更する場合は \`AGENTS.md\` を編集してください。
EOF
  echo "   ✅ $(basename "$dest") ($agent) — ポインタ"
}

# --- 全文を複製する（インポート記法を持たないエージェント） ---
# $1: 出力先パス, $2: タイトル行, $3: エージェント名
write_copy() {
  local dest="$1"
  local title="$2"
  local agent="$3"

  mkdir -p "$(dirname "$dest")"
  sed "1s|.*|$title|" "$SOURCE_FILE" > "$dest"
  echo "   ✅ ${dest#"$PROJECT_ROOT/"} ($agent) — 複製"
}

write_pointer "$PROJECT_ROOT/CLAUDE.md" \
  "# Claude Code Project Instructions (google-app-script-sample)" "Anthropic Claude Code"
write_pointer "$PROJECT_ROOT/GEMINI.md" \
  "# Gemini CLI Project Instructions (google-app-script-sample)" "Gemini CLI"

write_copy "$PROJECT_ROOT/.cursorrules" \
  "# Cursor Project Instructions (google-app-script-sample)" "Cursor"
write_copy "$PROJECT_ROOT/.clinerules" \
  "# Cline Project Instructions (google-app-script-sample)" "Cline"
write_copy "$PROJECT_ROOT/.antigravity/rules.md" \
  "# Antigravity Project Instructions (google-app-script-sample)" "Antigravity"
write_copy "$PROJECT_ROOT/.github/copilot-instructions.md" \
  "# GitHub Copilot Project Instructions (google-app-script-sample)" "GitHub Copilot"

echo ""
echo "✨ 同期完了！AGENTS.md + 6ファイルが最新の状態です。"
