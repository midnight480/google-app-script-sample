# AGENT.md - Project Context & Rules

This file provides context and instructions for AI coding agents (Gemini CLI, Claude Code, Cursor, Kiro-CLI, etc.) working on this repository.

## 🎯 Project Overview
A collection of independent Google Apps Script (GAS) projects for automation, managed via `clasp`.

## 💻 Tech Stack
- **Language**: JavaScript (ES2019) / Google Apps Script
- **Runtime**: V8
- **Tooling**: `clasp` (Command Line Apps Script Projects)
- **Timezone**: `Asia/Tokyo`
- **Platforms**: Discord Webhook, Slack API, Google Calendar/Spreadsheet/Form, Backlog API

## 📂 Project Structure
Each subdirectory is a standalone GAS project:
- `[project-name]/`
  - `appsscript.json`: Manifest & Script Properties
  - `.clasp.json`: Clasp configuration
  - `Code.js` or `src/*.js`: Source code
  - `README.md`: Script-specific docs

## 🛠 Key Commands
| Action | Command |
|--------|---------|
| Login | `clasp login` |
| Push code | `clasp push` |
| Pull code | `clasp pull` |
| Open editor | `clasp open` |
| View logs | `clasp logs` |
| Deploy | `clasp deploy` |

## 規範・コーディング規約 (Rules & Conventions)

### 1. General Principles
- **Japanese First**: All communication and documentation updates should be in Japanese (日本語).
- **Independence**: Maintain strict isolation between subdirectories. Do not share code unless in a designated shared library.
- **Surgical Changes**: Only modify files directly related to the task.

### 2. Coding Standards (GAS/JS)
- **Logging**: Use structured JSON logging.
  - `logInfo(message, data)`
  - `logError(message, error)`
- **Config**: Never hardcode secrets. Use `PropertiesService.getScriptProperties()`.
- **Validation**: Always validate inputs/configs before execution.
- **Error Handling**: Wrap external API calls (UrlFetchApp, etc.) in `try-catch`.

### 3. Workflow
- **Clasp Sync**: Always `clasp push` after local edits to sync with the GAS environment.
- **Testing**: Include a `testXXX()` function in the script for manual verification in the GAS editor.

## ⚠️ Security
- **No Secrets in Code**: Do not commit API keys or Webhook URLs.
- **Ignore List**: Ensure `.gitignore` covers `.clasp.json` if it contains sensitive deployment IDs (though usually safe if IDs are public, check local policy).

---
*This file is a living document. Update it when project patterns evolve.*
