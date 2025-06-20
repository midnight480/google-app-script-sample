// Backlog Webhook Receiver
// Webhookデータを受信してスプレッドシートに記録するスクリプト

// 定数定義
const CONSTANTS = {
  SHEET_NAMES: {
    RAW_DATA: 'RawData',
    WEBHOOK_LOG: 'WebhookLog'
  },
  COLUMN_HEADERS: {
    RAW_DATA: ['タイムスタンプ', '生データ', '整形データ'],
    WEBHOOK_LOG: ['タイムスタンプ', 'プロジェクト', 'イベントタイプ', 'コンテンツタイプ', 'キー', 'サマリー', 'ユーザー', '詳細URL']
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

// バリデーション関数
function isValidSpreadsheetId(spreadsheetId) {
  return spreadsheetId && 
         spreadsheetId !== 'YOUR_SPREADSHEET_ID_HERE' && 
         /^[a-zA-Z0-9-_]+$/.test(spreadsheetId);
}

function validateWebhookData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid webhook data format');
  }
  
  if (!data.type || !data.project || !data.content) {
    throw new Error('Missing required webhook data fields');
  }
  
  return true;
}

// 設定の初期化
function initializeConfig() {
  const properties = PropertiesService.getScriptProperties();
  const defaultConfig = {
    SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE'
  };

  Object.entries(defaultConfig).forEach(([key, value]) => {
    if (!properties.getProperty(key)) {
      properties.setProperty(key, value);
    }
  });
}

// 初回実行時にスクリプトプロパティを設定
initializeConfig();

// スプレッドシートのIDを保持する
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || 'YOUR_SPREADSHEET_ID_HERE';

// GETリクエストを受け取るためのdoGet関数
function doGet(e) {
  try {
    logInfo('GETリクエスト受信');
    
    const response = {
      status: 'success',
      message: 'Backlog Webhook Receiver is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
    
    logInfo('GETリクエスト応答', response);
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    logError('GETリクエスト処理エラー', error);
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Webhookを受け取るためのdoPost関数
function doPost(e) {
  try {
    logInfo('Webhook受信開始');
    
    // スプレッドシートIDの検証
    if (!isValidSpreadsheetId(SPREADSHEET_ID)) {
      logError('スプレッドシートIDが正しく設定されていません', { spreadsheetId: SPREADSHEET_ID });
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Spreadsheet ID not configured'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
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
    
    // スプレッドシートを取得
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
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
    
    // ログデータも記録（オプション）
    try {
      const logSheet = spreadsheet.getSheetByName(CONSTANTS.SHEET_NAMES.WEBHOOK_LOG) || createLogSheet(spreadsheet);
      const logData = createLogData(jsonData);
      logSheet.appendRow(logData);
      logInfo('ログデータ記録完了', { 
        row: logSheet.getLastRow(),
        project: jsonData.project?.name
      });
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

// スプレッドシートIDを設定する関数
function setSpreadsheetId(id) {
  try {
    if (!isValidSpreadsheetId(id)) {
      throw new Error('Invalid spreadsheet ID format');
    }
    
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty('SPREADSHEET_ID', id);
    
    logInfo('スプレッドシートID設定完了', { spreadsheetId: id });
    return true;
  } catch (error) {
    logError('スプレッドシートID設定エラー', error);
    return false;
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
  
  const isValid = isValidSpreadsheetId(SPREADSHEET_ID);
  
  logInfo('設定確認結果', {
    isValid: isValid,
    spreadsheetId: SPREADSHEET_ID
  });
  
  if (isValid) {
    logInfo('設定確認完了 - 正常に設定されています');
  } else {
    logWarning('設定確認完了 - スプレッドシートIDが正しく設定されていません');
  }
  
  return isValid;
}

// スプレッドシートの内容を確認する関数
function checkSpreadsheetAccess() {
  logInfo('スプレッドシートアクセステスト開始');
  
  if (!isValidSpreadsheetId(SPREADSHEET_ID)) {
    logError('スプレッドシートIDが無効です', { spreadsheetId: SPREADSHEET_ID });
    return false;
  }
  
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
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