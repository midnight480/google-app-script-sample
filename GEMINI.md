# Gemini CLI Project Instructions (google-app-script-sample)

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

### 3. Coding Standards
- **Logging**: Use structured logging (JSON format) with `logInfo`, `logWarning`, and `logError` patterns.
- **Configuration**: Use `PropertiesService.getScriptProperties()` for environment-specific values. Prefer defining default values or placeholders in `appsscript.json`.
- **Validation**: Implement explicit validation functions (e.g., `validateXxx`) before processing data.
- **Error Handling**: Use `try-catch` blocks extensively, especially around external service calls.
- **Testing**: Each script should include test functions (e.g., `testXxx`, `checkConfiguration`) to verify logic manually in the GAS editor.

### 4. Workflow & Tooling
- **Clasp**:
  - Use `clasp push` to sync local changes to the GAS server.
  - Use `clasp pull` to fetch remote changes (use with caution if local changes exist).
  - Use `clasp logs` to check execution logs.
- **Git**: Follow the repository's standard commit message style.

## Agent Guidelines (Specific to this Repo)
- **Surgical Updates**: When modifying a specific script, stay within its directory. Do not affect other samples.
- **Environment Safety**: Never hardcode secrets. Always use script properties or point to `appsscript.json` for configuration instructions.
- **Validation**: After making changes to a script, verify if it breaks the `appsscript.json` structure or `clasp` configuration.
- **Documentation**: If a new feature is added, update the script-specific `README.md` and the root `README.md` if necessary.

## Reference Documents
- Root `README.md`
- `.kiro/steering/structure.md`
- `.kiro/steering/tech.md`
