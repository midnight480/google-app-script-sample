// Backlog Webhook Receiver
// Webhookデータを受信してスプレッドシートに記録するスクリプト

// 定数定義
const CONSTANTS = {
  SHEET_NAMES: {
    RAW_DATA: 'RawData',
    WEBHOOK_LOG: 'WebhookLog',
    GIT_WEBHOOK_LOG: 'GitWebhookLog'
  },
  COLUMN_HEADERS: {
    RAW_DATA: ['タイムスタンプ', '生データ', '整形データ'],
    WEBHOOK_LOG: ['タイムスタンプ', 'プロジェクト', 'イベントタイプ', 'コンテンツタイプ', 'キー', 'サマリー', 'ユーザー', '詳細URL'],
    GIT_WEBHOOK_LOG: ['タイムスタンプ', 'リポジトリ', 'イベントタイプ', 'ブランチ/タグ', 'コミット数', 'プッシュしたユーザー']
  }
};

// ログ出力関数
function logInfo(message, data = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message: message,
    data: data
  }));
}

function logError(message, error = null) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message: message,
    error: error ? error.toString() : null
  }));
}

function logWarning(message, data = {}) {
  console.warn(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'WARNING',
    message: message,
    data: data
  }));
}



function validateWebhookData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid webhook data format');
  }
  
  if (!data.type) {
    throw new Error('Missing required webhook data field: type');
  }

  // 課題Webhookはproject、Git Webhookはrepositoryを持つ
  if (!data.project && !data.repository) {
    throw new Error('Missing required webhook data fields: project or repository');
  }
  
  return true;
}



// GETリクエストを受け取るためのdoGet関数（Webアプリ表示）
function doGet(e) {
  try {
    logInfo('GETリクエスト受信（Webアプリ表示）');
    const template = HtmlService.createTemplateFromFile('Index');
    return template.evaluate()
      .setTitle('Backlog Webhook Viewer')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (error) {
    logError('GETリクエスト処理エラー', error);
    return HtmlService.createHtmlOutput('<h1>エラーが発生しました</h1><p>' + error.toString() + '</p>');
  }
}

// Webhookを受け取るためのdoPost関数
function doPost(e) {
  try {
    logInfo('Webhook受信開始');
    

    
    // リクエストデータをJSONとしてパース
    const rawData = e.postData.contents;
    const jsonData = JSON.parse(rawData);
    
    logInfo('Webhookデータ解析完了', { 
      type: jsonData.type,
      projectKey: jsonData.project?.projectKey,
      contentKey: jsonData.content?.key_id
    });
    
    // バリデーション
    validateWebhookData(jsonData);
    
    // アクティブなスプレッドシートを取得
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
      throw new Error('指定されたスプレッドシートが見つかりません');
    }
    
    // RAWデータ用のシートを取得または作成
    const rawSheet = spreadsheet.getSheetByName(CONSTANTS.SHEET_NAMES.RAW_DATA) || createRawDataSheet(spreadsheet);
    
    // RAWデータを記録
    const rawDataRow = [
      new Date(),                    // タイムスタンプ
      rawData,                       // 生のJSONデータ
      JSON.stringify(jsonData, null, 2)  // 整形したJSONデータ
    ];
    
    rawSheet.appendRow(rawDataRow);
    logInfo('RAWデータ記録完了', { 
      row: rawSheet.getLastRow(),
      dataLength: rawData.length
    });
    
    // ログデータも記録
    try {
      if (jsonData.repository) {
        // Git Webhook
        const gitSheet = spreadsheet.getSheetByName(CONSTANTS.SHEET_NAMES.GIT_WEBHOOK_LOG) || createGitLogSheet(spreadsheet);
        const gitData = createGitLogData(jsonData);
        gitSheet.appendRow(gitData);
        logInfo('Gitログデータ記録完了', {
          row: gitSheet.getLastRow(),
          repository: jsonData.repository?.name
        });
      } else {
        // 通常の課題Webhook
        const logSheet = spreadsheet.getSheetByName(CONSTANTS.SHEET_NAMES.WEBHOOK_LOG) || createLogSheet(spreadsheet);
        const logData = createLogData(jsonData);
        logSheet.appendRow(logData);
        logInfo('ログデータ記録完了', { 
          row: logSheet.getLastRow(),
          project: jsonData.project?.name
        });
      }
    } catch (logError) {
      logWarning('ログデータ記録に失敗しましたが、処理は継続します', logError);
    }
    
    // 正常応答を返す
    const response = {
      status: 'success',
      message: 'Webhook received and processed successfully',
      timestamp: new Date().toISOString(),
      processedData: {
        type: jsonData.type,
        project: jsonData.project?.name,
        content: jsonData.content?.key_id
      }
    };
    
    logInfo('Webhook処理完了', response);
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    logError('Webhook処理エラー', error);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString(),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// RAWデータ用シートを作成する関数
function createRawDataSheet(spreadsheet) {
  try {
    logInfo('RAWデータシート作成開始');
    
    const sheet = spreadsheet.insertSheet(CONSTANTS.SHEET_NAMES.RAW_DATA);
    const headers = CONSTANTS.COLUMN_HEADERS.RAW_DATA;
    
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setBackground('#f3f3f3').setFontWeight('bold');
    
    // 列幅の設定
    sheet.setColumnWidth(1, 200);  // タイムスタンプ
    sheet.setColumnWidth(2, 400);  // 生データ
    sheet.setColumnWidth(3, 600);  // 整形データ
    
    logInfo('RAWデータシート作成完了', { 
      sheetName: sheet.getName(),
      headers: headers
    });
    
    return sheet;
  } catch (error) {
    logError('RAWデータシート作成エラー', error);
    throw error;
  }
}

// ログシートを作成する関数
function createLogSheet(spreadsheet) {
  try {
    logInfo('ログシート作成開始');
    
    const sheet = spreadsheet.insertSheet(CONSTANTS.SHEET_NAMES.WEBHOOK_LOG);
    const headers = CONSTANTS.COLUMN_HEADERS.WEBHOOK_LOG;
    
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setBackground('#f3f3f3').setFontWeight('bold');
    
    // 列幅の自動調整
    sheet.autoResizeColumns(1, headers.length);
    
    logInfo('ログシート作成完了', { 
      sheetName: sheet.getName(),
      headers: headers
    });
    
    return sheet;
  } catch (error) {
    logError('ログシート作成エラー', error);
    throw error;
  }
}

// Webhookデータからログデータを作成する関数
function createLogData(jsonData) {
  try {
    return [
      new Date(),                    // タイムスタンプ
      jsonData.project?.name || 'Unknown',         // プロジェクト名
      jsonData.type || 'Unknown',                 // イベントタイプ
      jsonData.content?.type || 'Unknown',         // コンテンツタイプ
      jsonData.content?.key_id || 'Unknown',       // キー
      jsonData.content?.summary || 'No summary',      // サマリー
      jsonData.createdUser?.name || 'Unknown',     // ユーザー名
      jsonData.content?.url || 'No URL'           // 詳細URL
    ];
  } catch (error) {
    logError('ログデータ作成エラー', error);
    return [
      new Date(),
      'Error',
      'Error',
      'Error',
      'Error',
      'Error',
      'Error',
      'Error'
    ];
  }
}

// Gitログシートを作成する関数
function createGitLogSheet(spreadsheet) {
  try {
    logInfo('Gitログシート作成開始');
    
    const sheet = spreadsheet.insertSheet(CONSTANTS.SHEET_NAMES.GIT_WEBHOOK_LOG);
    const headers = CONSTANTS.COLUMN_HEADERS.GIT_WEBHOOK_LOG;
    
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setBackground('#f3f3f3').setFontWeight('bold');
    
    // 列幅の自動調整
    sheet.autoResizeColumns(1, headers.length);
    
    logInfo('Gitログシート作成完了', { 
      sheetName: sheet.getName(),
      headers: headers
    });
    
    return sheet;
  } catch (error) {
    logError('Gitログシート作成エラー', error);
    throw error;
  }
}

// Git Webhookデータからログデータを作成する関数
function createGitLogData(jsonData) {
  try {
    const revisions = jsonData.content?.revisions || [];
    const branchOrTag = jsonData.content?.ref || 'Unknown';
    
    return [
      new Date(),                                    // タイムスタンプ
      jsonData.repository?.name || 'Unknown',        // リポジトリ
      jsonData.type || 'Unknown',                    // イベントタイプ (12がGit Pushなど)
      branchOrTag,                                   // ブランチ/タグ
      revisions.length,                              // コミット数
      jsonData.createdUser?.name || 'Unknown'        // プッシュしたユーザー
    ];
  } catch (error) {
    logError('Gitログデータ作成エラー', error);
    return [new Date(), 'Error', 'Error', 'Error', 'Error', 'Error'];
  }
}

// WebUI用API関数
function getRawData(page = 1, pageSize = 50) {
  return getSheetData(CONSTANTS.SHEET_NAMES.RAW_DATA, page, pageSize);
}

function getGitWebhookLogs(page = 1, pageSize = 50) {
  return getSheetData(CONSTANTS.SHEET_NAMES.GIT_WEBHOOK_LOG, page, pageSize);
}

// スプレッドシートからデータを取得する共通関数
function getSheetData(sheetName, page, pageSize) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) return { data: [], totalPages: 0, currentPage: page };

    const lastRow = sheet.getLastRow();
    const lastCol = Math.min(sheet.getLastColumn(), 10); // 最大10列まで取得
    if (lastRow <= 1) return { data: [], totalPages: 0, currentPage: page };

    // 1行目はヘッダーなので、データは2行目から
    const totalRecords = lastRow - 1;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const actualPage = Math.min(Math.max(1, page), totalPages);
    
    // 降順（新しい順）で取得するための計算
    const startRow = Math.max(2, lastRow - (actualPage * pageSize) + 1);
    const numRows = Math.min(pageSize, lastRow - startRow + 1);
    
    const range = sheet.getRange(startRow, 1, numRows, lastCol);
    const values = range.getValues();
    
    // 新しい順にするため反転
    values.reverse();
    
    const formattedValues = values.map(row => {
      // 日付フォーマット
      if (row[0] instanceof Date) {
        row[0] = Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      }
      return row;
    });

    return {
      data: formattedValues,
      totalPages: totalPages,
      currentPage: actualPage
    };
  } catch (error) {
    logError(`データ取得エラー (${sheetName})`, error);
    throw error;
  }
}



// テスト関数
function testWebhookProcessing() {
  logInfo('Webhook処理テスト開始');
  
  const testData = {
    type: 1,
    project: { 
      projectKey: 'TEST',
      name: 'テストプロジェクト'
    },
    content: { 
      key_id: 123, 
      summary: 'テスト課題',
      type: 'issue',
      url: 'https://test.backlog.com/view/TEST-123'
    },
    createdUser: { 
      name: 'テストユーザー'
    }
  };
  
  try {
    validateWebhookData(testData);
    logInfo('テストデータのバリデーション成功');
    
    const logData = createLogData(testData);
    logInfo('テストログデータ生成成功', { logData: logData });
    
    return true;
  } catch (error) {
    logError('Webhook処理テスト失敗', error);
    return false;
  }
}

// 設定確認関数
function checkConfiguration() {
  logInfo('設定確認開始');
  
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const isValid = !!spreadsheet;
  
  logInfo('設定確認結果', {
    isValid: isValid,
    spreadsheetName: isValid ? spreadsheet.getName() : 'None'
  });
  
  if (isValid) {
    logInfo('設定確認完了 - 正常にスプレッドシートにバインドされています');
  } else {
    logWarning('設定確認完了 - スプレッドシートが見つかりません');
  }
  
  return isValid;
}

// スプレッドシートの内容を確認する関数
function checkSpreadsheetAccess() {
  logInfo('スプレッドシートアクセステスト開始');
  
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (spreadsheet) {
      const sheets = spreadsheet.getSheets();
      logInfo('スプレッドシートアクセステスト成功', { 
        spreadsheetName: spreadsheet.getName(),
        sheetCount: sheets.length,
        sheetNames: sheets.map(sheet => sheet.getName())
      });
      return true;
    } else {
      logError('スプレッドシートが見つかりません', { spreadsheetId: SPREADSHEET_ID });
      return false;
    }
  } catch (error) {
    logError('スプレッドシートアクセステストエラー', error);
    return false;
  }
} 