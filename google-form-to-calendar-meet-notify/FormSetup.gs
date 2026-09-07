// Google Form to Calendar Meet Notify
// フォームセットアップ用のヘルパー関数

// ログ関数のフォールバック（Utils.gsが読み込まれていない場合に備える）
function _logInfo(message, data = {}) {
  if (typeof logInfo === 'function') {
    logInfo(message, data);
  } else {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: message,
      data: data
    }));
  }
}

function _logError(message, error = null) {
  if (typeof logError === 'function') {
    logError(message, error);
  } else {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message: message,
      error: error ? error.toString() : null
    }));
  }
}

function _logWarning(message, data = {}) {
  if (typeof logWarning === 'function') {
    logWarning(message, data);
  } else {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'WARNING',
      message: message,
      data: data
    }));
  }
}

/**
 * スプレッドシートにApps Scriptエディタを開くためのURLを生成
 * @param {string} spreadsheetId - スプレッドシートID
 * @returns {string} Apps ScriptエディタのURL
 */
function getSpreadsheetScriptEditorUrl(spreadsheetId) {
  // スプレッドシートにバインドされたスクリプトを作成するためのURL
  // 注意: このURLは新しいプロジェクトを作成するためのものです
  // 既存のプロジェクトがある場合は、スプレッドシートの「拡張機能」→「Apps Script」から開いてください
  return `https://script.google.com/home/projects?create=true&ssId=${spreadsheetId}`;
}

/**
 * スプレッドシートにスクリプトをコピーする手順を記録
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet - 対象スプレッドシート
 * @param {string} scriptEditorUrl - Apps ScriptエディタのURL
 */
function addScriptSetupInstructions(spreadsheet, scriptEditorUrl) {
  try {
    let instructionSheet = spreadsheet.getSheetByName('スクリプト設定手順');
    if (instructionSheet) {
      instructionSheet.clear();
    } else {
      instructionSheet = spreadsheet.insertSheet('スクリプト設定手順');
    }
    
    const spreadsheetId = spreadsheet.getId();
    
    const instructions = [
      ['スクリプト設定手順', ''],
      ['', ''],
      ['【方法1】claspを使用する方法（推奨・最も簡単）', ''],
      ['', ''],
      ['手順1', 'ターミナルでプロジェクトディレクトリに移動'],
      ['', 'cd /path/to/google-form-to-calendar-meet-notify'],
      ['', ''],
      ['手順2', 'スプレッドシートにバインドされたスクリプトを作成'],
      ['', 'clasp create --title "フォームスクリプト" --type sheets --parentId ' + spreadsheetId],
      ['', ''],
      ['手順3', 'コードをデプロイ'],
      ['', 'clasp push'],
      ['', ''],
      ['手順4', 'スクリプトプロパティを設定'],
      ['', 'Google Apps Scriptエディタで「プロジェクトの設定」→「スクリプト プロパティ」を開く'],
      ['', '以下を設定：'],
      ['', '  - SHARED_CALENDAR_ID'],
      ['', '  - BACKLOG_SPACE_URL'],
      ['', '  - BACKLOG_API_KEY'],
      ['', '  - BACKLOG_PROJECT_KEY'],
      ['', '  - TIMEZONE（オプション）'],
      ['', ''],
      ['手順5', 'setupFormSubmitTrigger()関数を実行してトリガーを設定'],
      ['', 'または、createFormWithBacklogUsersAndTrigger()関数を実行'],
      ['', ''],
      ['【方法2】手動でコピー＆ペースト（claspが使えない場合）', ''],
      ['', ''],
      ['手順1', '以下のURLをクリックして、スプレッドシートにバインドされたApps Scriptエディタを開く'],
      ['', 'または、スプレッドシートの「拡張機能」→「Apps Script」を開く'],
      ['', scriptEditorUrl],
      ['', ''],
      ['手順2', '「全コード出力」シートを確認'],
      ['', 'このスプレッドシートの「全コード出力」シートに、すべてのコードが1つにまとめられています'],
      ['', 'そのコードをコピーして、Apps Scriptエディタに貼り付けます'],
      ['', ''],
      ['手順3', 'スクリプトプロパティを設定'],
      ['', '「プロジェクトの設定」→「スクリプト プロパティ」で以下を設定：'],
      ['', '  - SHARED_CALENDAR_ID'],
      ['', '  - BACKLOG_SPACE_URL'],
      ['', '  - BACKLOG_API_KEY'],
      ['', '  - BACKLOG_PROJECT_KEY'],
      ['', '  - TIMEZONE（オプション）'],
      ['', ''],
      ['手順4', 'setupFormSubmitTrigger()関数を実行してトリガーを設定'],
      ['', 'または、createFormWithBacklogUsersAndTrigger()関数を実行'],
      ['', ''],
      ['注意', 'この手順は、スプレッドシートにバインドされたスクリプトとして実行する必要があります'],
    ];
    
    instructionSheet.getRange(1, 1, instructions.length, 2).setValues(instructions);
    
    // 列幅を調整
    instructionSheet.setColumnWidth(1, 200);
    instructionSheet.setColumnWidth(2, 700);
    
    // ヘッダー行を太字に
    instructionSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    instructionSheet.getRange(3, 1, 1, 2).setFontWeight('bold');
    instructionSheet.getRange(20, 1, 1, 2).setFontWeight('bold');
    
    // URLをハイパーリンクに
    const urlCell = instructionSheet.getRange(23, 2);
    urlCell.setValue(scriptEditorUrl);
    urlCell.setFormula('=HYPERLINK("' + scriptEditorUrl + '","' + scriptEditorUrl + '")');
    
    _logInfo('スクリプト設定手順を追加しました', {
      spreadsheetId: spreadsheetId,
      scriptEditorUrl: scriptEditorUrl
    });
    
  } catch (error) {
    _logWarning('スクリプト設定手順の追加に失敗しました', error);
  }
}

/**
 * すべてのコードを1つのファイルにまとめてスプレッドシートに出力
 * 注意: この関数は、プロジェクト内のすべての.gsファイルの内容を取得することはできません
 * 手動でコピーする必要があるコードの例を提供します
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet - 対象スプレッドシート
 */
function exportAllCodeToSpreadsheet(spreadsheet) {
  try {
    let codeSheet = spreadsheet.getSheetByName('全コード出力');
    if (codeSheet) {
      codeSheet.clear();
    } else {
      codeSheet = spreadsheet.insertSheet('全コード出力');
    }
    
    // 注意書き
    const header = [
      ['全コード出力', ''],
      ['', ''],
      ['注意', 'このシートには、プロジェクト内のすべての.gsファイルのコードを手動でコピーしてください'],
      ['', ''],
      ['手順', ''],
      ['1. 現在のスタンドアロンスクリプトのすべての.gsファイルを開く'],
      ['2. 各ファイルの内容をコピー'],
      ['3. このシートの「ファイル名」列にファイル名、「コード」列にコードを貼り付け'],
      ['4. すべてのコードを1つのファイルにまとめて、スプレッドシートにバインドされたスクリプトに貼り付ける'],
      ['', ''],
      ['または、claspを使用する方法（推奨）を「スクリプト設定手順」シートで確認してください', ''],
      ['', ''],
      ['=== 以下にコードを貼り付けてください ===', ''],
      ['', ''],
    ];
    
    codeSheet.getRange(1, 1, header.length, 2).setValues(header);
    
    // 列幅を調整
    codeSheet.setColumnWidth(1, 200);
    codeSheet.setColumnWidth(2, 800);
    
    // ヘッダー行を太字に
    codeSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    codeSheet.getRange(12, 1, 1, 2).setFontWeight('bold');
    
    // 必要なファイル一覧を追加
    const fileList = [
      ['', ''],
      ['必要なファイル一覧（手動でコピーしてください）', ''],
      ['', ''],
      ['1. Main.gs', ''],
      ['2. FormSubmissionProcessor.gs', ''],
      ['3. ProcessingLogger.gs', ''],
      ['4. CalendarEventCreator.gs', ''],
      ['5. BacklogIssueCreator.gs', ''],
      ['6. FormManager.gs', ''],
      ['7. FormSetup.gs', ''],
      ['8. Validation.gs', ''],
      ['9. Models.gs', ''],
      ['10. Utils.gs', ''],
      ['11. Constants.gs', ''],
      ['12. LegacyFunctions.gs（使用している場合）', ''],
      ['', ''],
      ['各ファイルのコードを以下の形式で貼り付けてください：', ''],
      ['', ''],
      ['// ========== ファイル名.gs ==========', ''],
      ['// コード内容', ''],
      ['', ''],
    ];
    
    const startRow = header.length + 1;
    codeSheet.getRange(startRow, 1, fileList.length, 2).setValues(fileList);
    codeSheet.getRange(startRow, 1, 1, 2).setFontWeight('bold');
    
    _logInfo('全コード出力シートを作成しました', {
      spreadsheetId: spreadsheet.getId()
    });
    
  } catch (error) {
    _logWarning('全コード出力シートの作成に失敗しました', error);
  }
}

/**
 * Backlogユーザー一覧を含むフォームを作成
 * この関数を実行すると、Backlogプロジェクトのユーザー一覧を取得して
 * チェックボックス/リストボックスを設定したフォームが作成されます
 */
function createFormWithBacklogUsers() {
  try {
    _logInfo('Backlogユーザー一覧を含むフォーム作成開始');
    
    const formManager = createFormManager();
    const result = formManager.createCompleteForm('共有カレンダーへの予定登録と通知', null, true);
    
    _logInfo('フォーム作成完了', {
      formUrl: result.publishedUrl,
      editUrl: result.editUrl,
      spreadsheetUrl: result.spreadsheetUrl
    });
    
    // 結果をスプレッドシートに記録
    const spreadsheet = result.spreadsheet;
    if (spreadsheet) {
      // フォーム設定情報シート
      let setupSheet = spreadsheet.getSheetByName('フォーム設定情報');
      if (setupSheet) {
        setupSheet.clear();
      } else {
        setupSheet = spreadsheet.insertSheet('フォーム設定情報');
      }
      
      setupSheet.getRange(1, 1, 1, 2).setValues([['項目', '値']]);
      setupSheet.getRange(2, 1, 1, 2).setValues([['フォームURL', result.publishedUrl]]);
      setupSheet.getRange(3, 1, 1, 2).setValues([['編集URL', result.editUrl]]);
      setupSheet.getRange(4, 1, 1, 2).setValues([['フォームID', result.formId]]);
      setupSheet.getRange(5, 1, 1, 2).setValues([['スプレッドシートURL', result.spreadsheetUrl]]);
      
      // 列幅を調整
      setupSheet.setColumnWidth(1, 150);
      setupSheet.setColumnWidth(2, 400);
      
      // ヘッダー行を太字に
      setupSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
      
      // スクリプト設定手順を追加
      const scriptEditorUrl = getSpreadsheetScriptEditorUrl(spreadsheet.getId());
      addScriptSetupInstructions(spreadsheet, scriptEditorUrl);
      
      // 全コード出力シートを作成（手動コピー用）
      exportAllCodeToSpreadsheet(spreadsheet);
      
      _logInfo('スプレッドシートに設定情報と手順を記録しました', {
        spreadsheetId: spreadsheet.getId(),
        scriptEditorUrl: scriptEditorUrl
      });
    }
    
    return result;
    
  } catch (error) {
    _logError('フォーム作成エラー', error);
    throw error;
  }
}

/**
 * Backlogプロジェクトのユーザー一覧を取得（テスト用）
 */
function testGetBacklogUsers() {
  try {
    _logInfo('Backlogユーザー一覧取得テスト開始');
    
    const backlogCreator = createBacklogIssueCreator();
    const users = backlogCreator.getProjectUsers();
    
    _logInfo('Backlogユーザー一覧取得成功', {
      userCount: users.length,
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        mailAddress: u.mailAddress
      }))
    });
    
    return users;
    
  } catch (error) {
    _logError('Backlogユーザー一覧取得エラー', error);
    throw error;
  }
}

/**
 * フォーム送信時のトリガーを自動設定
 * スプレッドシートにバインドされたスクリプトとして実行する必要があります
 * @param {string} formId - フォームID（オプション、指定しない場合はスプレッドシートに紐付けられたフォームを使用）
 */
function setupFormSubmitTrigger(formId = null) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
      throw new Error('アクティブなスプレッドシートが見つかりません。スプレッドシートにバインドされたスクリプトとして実行してください。');
    }
    
    // 既存のトリガーを削除（重複を防ぐため）
    const existingTriggers = ScriptApp.getProjectTriggers().filter(trigger => 
      trigger.getHandlerFunction() === 'onFormSubmit'
    );
    
    existingTriggers.forEach(trigger => {
      ScriptApp.deleteTrigger(trigger);
      _logInfo('既存のトリガーを削除しました', { triggerId: trigger.getUniqueId() });
    });
    
    // フォームIDを取得
    let targetFormId = formId;
    if (!targetFormId) {
      // スプレッドシートに紐付けられたフォームを取得
      const formUrl = spreadsheet.getFormUrl();
      if (!formUrl) {
        throw new Error('スプレッドシートにフォームが紐付けられていません。フォームをスプレッドシートにリンクしてください。');
      }
      
      // URLからフォームIDを抽出
      const formUrlMatch = formUrl.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
      if (!formUrlMatch) {
        throw new Error('フォームIDを取得できませんでした。');
      }
      targetFormId = formUrlMatch[1];
    }
    
    // フォーム送信時のトリガーを作成
    const form = FormApp.openById(targetFormId);
    const trigger = ScriptApp.newTrigger('onFormSubmit')
      .onFormSubmit()
      .create();
    
    _logInfo('フォーム送信時トリガー設定完了', {
      formId: targetFormId,
      formTitle: form.getTitle(),
      triggerId: trigger.getUniqueId()
    });
    
    return {
      success: true,
      formId: targetFormId,
      formTitle: form.getTitle(),
      triggerId: trigger.getUniqueId()
    };
    
  } catch (error) {
    _logError('フォーム送信時トリガー設定エラー', error);
    throw error;
  }
}

/**
 * フォーム作成とトリガー設定を一度に実行
 * 注意: この関数はスプレッドシートにバインドされたスクリプトとして実行する必要があります
 */
function createFormWithBacklogUsersAndTrigger() {
  try {
    // スプレッドシートにバインドされたスクリプトとして実行されているか確認
    const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!activeSpreadsheet) {
      const errorMessage = [
        'この関数はスプレッドシートにバインドされたスクリプトとして実行する必要があります。',
        '',
        '手順：',
        '1. createFormWithBacklogUsers()を実行してフォームを作成',
        '2. 作成されたスプレッドシートを開く',
        '3. スプレッドシートの「拡張機能」→「Apps Script」を開く',
        '4. 同じコードをスプレッドシートにコピー＆ペースト',
        '5. この関数を再度実行',
        '',
        'スプレッドシートの「スクリプト設定手順」シートに詳細な手順が記載されています。'
      ].join('\n');
      
      throw new Error(errorMessage);
    }
    
    // 1. フォームを作成（既に作成済みの場合はスキップ）
    let formResult;
    try {
      formResult = createFormWithBacklogUsers();
    } catch (formError) {
      // フォームが既に作成済みの場合、スプレッドシートからフォーム情報を取得
      const formUrl = activeSpreadsheet.getFormUrl();
      if (!formUrl) {
        throw new Error('スプレッドシートにフォームが紐付けられていません。まずcreateFormWithBacklogUsers()を実行してください。');
      }
      
      // URLからフォームIDを抽出
      const formUrlMatch = formUrl.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
      if (!formUrlMatch) {
        throw new Error('フォームIDを取得できませんでした。');
      }
      
      const formId = formUrlMatch[1];
      const form = FormApp.openById(formId);
      
      formResult = {
        form: form,
        formId: formId,
        formTitle: form.getTitle(),
        editUrl: form.getEditUrl(),
        publishedUrl: form.getPublishedUrl(),
        spreadsheet: activeSpreadsheet,
        spreadsheetId: activeSpreadsheet.getId(),
        spreadsheetName: activeSpreadsheet.getName(),
        spreadsheetUrl: activeSpreadsheet.getUrl()
      };
      
      _logInfo('既存のフォームを使用します', {
        formId: formId,
        formTitle: form.getTitle()
      });
    }
    
    // 2. トリガーを設定
    try {
      const triggerResult = setupFormSubmitTrigger(formResult.formId);
      
      _logInfo('フォーム作成とトリガー設定完了', {
        formUrl: formResult.publishedUrl,
        spreadsheetUrl: formResult.spreadsheetUrl,
        triggerId: triggerResult.triggerId
      });
      
      return {
        form: formResult,
        trigger: triggerResult,
        success: true
      };
    } catch (triggerError) {
      _logWarning('トリガー設定に失敗しました。手動で設定してください。', triggerError);
      
      // エラーメッセージをスプレッドシートに記録
      const spreadsheet = formResult.spreadsheet || activeSpreadsheet;
      if (spreadsheet) {
        try {
          let errorSheet = spreadsheet.getSheetByName('エラー情報');
          if (errorSheet) {
            errorSheet.clear();
          } else {
            errorSheet = spreadsheet.insertSheet('エラー情報');
          }
          
          errorSheet.getRange(1, 1, 1, 2).setValues([['エラー情報', '']]);
          errorSheet.getRange(2, 1, 1, 2).setValues([['トリガー設定エラー', triggerError.message || triggerError.toString()]]);
          errorSheet.getRange(3, 1, 1, 2).setValues([['手動設定手順', '「拡張機能」→「トリガー」から手動でトリガーを設定してください']]);
          
          errorSheet.setColumnWidth(1, 150);
          errorSheet.setColumnWidth(2, 600);
          errorSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
        } catch (sheetError) {
          _logWarning('エラー情報シートの作成に失敗しました', sheetError);
        }
      }
      
      return {
        form: formResult,
        trigger: null,
        success: false,
        message: 'フォームは作成されましたが、トリガーは手動で設定する必要があります。スプレッドシートの「エラー情報」シートを確認してください。'
      };
    }
    
  } catch (error) {
    _logError('フォーム作成とトリガー設定エラー', error);
    throw error;
  }
}

