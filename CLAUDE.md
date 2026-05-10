# Claude Code Project Instructions (google-app-script-sample)

## 出力言語
- すべての出力は日本語で行ってください
- 思考の過程で英語を使用するのは構いません

## Project Overview
This repository is a collection of Google Apps Script (GAS) samples for various automation tasks (webhooks, notifications, data processing). Each subdirectory functions as an independent GAS project managed via `clasp`.

## Core Mandates & Conventions

### 1. Architecture & Structure
- **Independence**: Each subdirectory is a standalone project. Do not introduce cross-dependencies between them unless explicitly requested.
- **Directory Layout**:
  - `script-name/`: Root of a script project.
    - `appsscript.json`: Manifest file containing metadata and script properties.
    - `README.md`: Script-specific documentation.
    - `Code.js` or `src/*.js`: Source code.
- **File Naming**:
  - Main entry point: `Code.js` (or `Main.gs`).
  - Helper logic: `[Functionality]Functions.js` or `[Functionality].gs`.
  - UI: `[Name]Dialog.html`.

### 2. Technical Stack
- **Language**: JavaScript (ES2019) / Google Apps Script.
- **Runtime**: V8.
- **Tooling**: `clasp` (Command Line Apps Script Projects).
- **Timezone**: `Asia/Tokyo`.
- **External Library**: SlackApp (`1on93YOYfSmV92R5q59NpKmsyWIQD8qnoLYk-gkQBI92C58SPyA2x1-bq`)

### 3. Coding Standards
- **Logging**: Use structured logging (JSON format) with `logInfo`, `logWarning`, and `logError` patterns.
- **Configuration**: Use `PropertiesService.getScriptProperties()` for environment-specific values. Prefer defining default values or placeholders in `appsscript.json`.
- **Validation**: Implement explicit validation functions (e.g., `validateXxx`) before processing data.
- **Error Handling**: Use `try-catch` blocks extensively, especially around external service calls.
- **Testing**: Each script should include test functions (e.g., `testXxx`, `checkConfiguration`) to verify logic manually in the GAS editor.

### 4. Code Structure Pattern
```javascript
// 1. 定数定義
const CONSTANTS = { /* ... */ };

// 2. ログ関数
function logInfo(message, data = {}) { /* ... */ }
function logError(message, error = null) { /* ... */ }
function logWarning(message, data = {}) { /* ... */ }

// 3. バリデーション関数
function validateXxx(data) { /* ... */ }

// 4. 設定初期化
function initializeConfig() { /* ... */ }

// 5. メイン処理関数
function main() { /* ... */ }
function doPost(e) { /* ... */ } // Webhook用

// 6. ヘルパー関数
function createMessage() { /* ... */ }
function sendToService() { /* ... */ }

// 7. テスト関数
function testXxx() { /* ... */ }
function checkConfiguration() { /* ... */ }
```

### 5. Workflow & Tooling
- **Clasp Commands**:
  - `clasp push` — sync local changes to GAS server
  - `clasp pull` — fetch remote changes
  - `clasp logs` — check execution logs
  - `clasp open` — open project in browser
  - `clasp login` — authenticate with Google
- **Git**: Follow the repository's standard commit message style.

## Agent Guidelines
- **Surgical Updates**: When modifying a specific script, stay within its directory. Do not affect other samples.
- **Environment Safety**: Never hardcode secrets. Always use script properties or point to `appsscript.json` for configuration instructions.
- **Validation**: After making changes to a script, verify if it breaks the `appsscript.json` structure or `clasp` configuration.
- **Documentation**: If a new feature is added, update the script-specific `README.md` and the root `README.md` if necessary.

---

## AI-DLC (AI-Driven Development Life Cycle) Workflow

When the user requests software development (new features, refactoring, migrations, etc.), follow the AI-DLC adaptive workflow defined below. This workflow OVERRIDES default behavior for development tasks.

### Rule Details Location
Load rule detail files from: `.kiro/aws-aidlc-rule-details/`

All file references below (e.g., `common/process-overview.md`, `inception/workspace-detection.md`) are relative to this directory.

### Mandatory: Load at Workflow Start
- `common/process-overview.md` — workflow overview
- `common/session-continuity.md` — session resumption guidance
- `common/content-validation.md` — content validation requirements
- `common/question-format-guide.md` — question formatting rules

### Extensions Loading (Context-Optimized)
1. Scan `extensions/` directory recursively
2. Load ONLY `*.opt-in.md` files initially (lightweight)
3. Full rule files loaded on-demand after user opts in during Requirements Analysis
4. Extensions without opt-in files are always enforced

### Three-Phase Adaptive Workflow

#### 🔵 INCEPTION PHASE (Planning & Architecture)
1. **Workspace Detection** (ALWAYS) — Scan workspace, determine brownfield/greenfield
2. **Reverse Engineering** (CONDITIONAL — brownfield only) — Analyze existing codebase
3. **Requirements Analysis** (ALWAYS — adaptive depth) — Gather requirements, ask clarifying questions
4. **User Stories** (CONDITIONAL) — Create user stories and personas
5. **Workflow Planning** (ALWAYS) — Create execution plan
6. **Application Design** (CONDITIONAL) — Component and service design
7. **Units Generation** (CONDITIONAL) — Decompose into units of work

#### 🟢 CONSTRUCTION PHASE (Design, Implementation & Test)
Per-Unit Loop:
1. **Functional Design** (CONDITIONAL) — Business logic design
2. **NFR Requirements** (CONDITIONAL) — Non-functional requirements
3. **NFR Design** (CONDITIONAL) — NFR patterns and components
4. **Infrastructure Design** (CONDITIONAL) — Infrastructure mapping
5. **Code Generation** (ALWAYS) — Part 1: Planning, Part 2: Generation

After all units:
6. **Build and Test** (ALWAYS) — Build instructions and test execution

#### 🟡 OPERATIONS PHASE (Placeholder)
- Future deployment and monitoring workflows

### Key Principles
- **Adaptive Execution**: Only execute stages that add value
- **User Approval Gates**: Wait for explicit approval at each stage before proceeding
- **Question Files**: ALL questions must be in dedicated .md files (never inline in chat)
- **Multiple Choice Format**: Use A, B, C, D options with [Answer]: tags
- **Audit Trail**: Log ALL user inputs in `aidlc-docs/audit.md` with ISO 8601 timestamps
- **Checkbox Tracking**: Mark [x] immediately after completing each plan step
- **Content Validation**: Validate Mermaid/ASCII diagrams before file creation
- **No Emergent Behavior**: Use standardized 2-option completion messages in CONSTRUCTION phase

### Documentation Structure
```
aidlc-docs/
├── inception/
│   ├── plans/
│   ├── reverse-engineering/
│   ├── requirements/
│   ├── user-stories/
│   └── application-design/
├── construction/
│   ├── plans/
│   ├── {unit-name}/
│   │   ├── functional-design/
│   │   ├── nfr-requirements/
│   │   ├── nfr-design/
│   │   ├── infrastructure-design/
│   │   └── code/
│   └── build-and-test/
├── operations/
├── aidlc-state.md
└── audit.md
```

### Critical Rules
- Application code: Workspace root (NEVER in aidlc-docs/)
- Documentation: aidlc-docs/ only
- Never summarize user input in audit log — capture complete raw input
- Always append to audit.md, never overwrite

## Reference Documents
- `.kiro/steering/structure.md` — Project structure details
- `.kiro/steering/tech.md` — Technical stack details
- `.kiro/steering/product.md` — Product overview
- `.kiro/aws-aidlc-rule-details/` — Complete AI-DLC rule definitions
