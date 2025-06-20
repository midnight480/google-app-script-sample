// RSSフィード取得スクリプト
// スプレッドシートからRSSフィードのURLを取得し、重複を排除して別のスプレッドシートに書き込む

// 定数定義
const CONSTANTS = {
  RSS_VERSION_PATTERN: 'rss/1.0',
  DEFAULT_SLEEP_MS: 1000
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
         spreadsheetId !== 'YOUR_SOURCE_SPREADSHEET_ID_HERE' && 
         spreadsheetId !== 'YOUR_TARGET_SPREADSHEET_ID_HERE' && 
         /^[a-zA-Z0-9-_]+$/.test(spreadsheetId);
}

function isValidRssUrl(url) {
  return url && 
         typeof url === 'string' && 
         url.includes(CONSTANTS.RSS_VERSION_PATTERN);
}

function isValidSheetName(sheetName) {
  return sheetName && 
         sheetName !== 'YOUR_SOURCE_SHEET_NAME_HERE' && 
         sheetName !== 'YOUR_TARGET_SHEET_NAME_HERE' && 
         sheetName.length > 0;
}

function isValidColumnName(columnName) {
  return columnName && 
         columnName !== 'YOUR_SOURCE_COLUMN_NAME_HERE' && 
         columnName !== 'YOUR_TARGET_COLUMN_NAME_HERE' && 
         columnName.length > 0;
}

// 設定の初期化
function initializeConfig() {
  const properties = PropertiesService.getScriptProperties();
  const defaultConfig = {
    SOURCE_SPREADSHEET_ID: 'YOUR_SOURCE_SPREADSHEET_ID_HERE',
    SOURCE_SHEET_NAME: 'YOUR_SOURCE_SHEET_NAME_HERE',
    SOURCE_COLUMN_NAME: 'YOUR_SOURCE_COLUMN_NAME_HERE',
    TARGET_SPREADSHEET_ID: 'YOUR_TARGET_SPREADSHEET_ID_HERE',
    TARGET_SHEET_NAME: 'YOUR_TARGET_SHEET_NAME_HERE',
    TARGET_COLUMN_NAME: 'YOUR_TARGET_COLUMN_NAME_HERE'
  };

  Object.entries(defaultConfig).forEach(([key, value]) => {
    if (!properties.getProperty(key)) {
      properties.setProperty(key, value);
    }
  });
}

// 初回実行時にスクリプトプロパティを設定
initializeConfig();

// メイン関数
function getAndWriteRssUrls() {
  try {
    logInfo('RSSフィード処理開始');
    
    // 設定値を取得
    const config = getConfig();
    
    // 設定の検証
    if (!validateConfiguration(config)) {
      logError('設定が不完全です。処理を中止します');
      return false;
    }
    
    // ソーススプレッドシートからRSS URLを取得
    const rssUrls = getRssUrlsFromSource(config);
    if (!rssUrls || rssUrls.length === 0) {
      logWarning('取得したRSS URLがありません');
      return true;
    }
    
    logInfo('RSS URL取得完了', { count: rssUrls.length });
    
    // 重複を排除
    const uniqueRssUrls = removeDuplicates(rssUrls);
    logInfo('重複排除完了', { 
      original: rssUrls.length, 
      unique: uniqueRssUrls.length 
    });
    
    // ターゲットスプレッドシートに書き込み
    const writeResult = writeRssUrlsToTarget(uniqueRssUrls, config);
    if (writeResult) {
      logInfo('RSSフィード処理完了');
      return true;
    } else {
      logError('RSSフィード処理に失敗しました');
      return false;
    }
    
  } catch (error) {
    logError('RSSフィード処理エラー', error);
    return false;
  }
}

// 設定を取得する関数
function getConfig() {
  const properties = PropertiesService.getScriptProperties();
  return {
    sourceSpreadsheetId: properties.getProperty('SOURCE_SPREADSHEET_ID') || 'YOUR_SOURCE_SPREADSHEET_ID_HERE',
    sourceSheetName: properties.getProperty('SOURCE_SHEET_NAME') || 'YOUR_SOURCE_SHEET_NAME_HERE',
    sourceColumnName: properties.getProperty('SOURCE_COLUMN_NAME') || 'YOUR_SOURCE_COLUMN_NAME_HERE',
    targetSpreadsheetId: properties.getProperty('TARGET_SPREADSHEET_ID') || 'YOUR_TARGET_SPREADSHEET_ID_HERE',
    targetSheetName: properties.getProperty('TARGET_SHEET_NAME') || 'YOUR_TARGET_SHEET_NAME_HERE',
    targetColumnName: properties.getProperty('TARGET_COLUMN_NAME') || 'YOUR_TARGET_COLUMN_NAME_HERE'
  };
}

// 設定の検証
function validateConfiguration(config) {
  const sourceSpreadsheetValid = isValidSpreadsheetId(config.sourceSpreadsheetId);
  const sourceSheetValid = isValidSheetName(config.sourceSheetName);
  const sourceColumnValid = isValidColumnName(config.sourceColumnName);
  const targetSpreadsheetValid = isValidSpreadsheetId(config.targetSpreadsheetId);
  const targetSheetValid = isValidSheetName(config.targetSheetName);
  const targetColumnValid = isValidColumnName(config.targetColumnName);
  
  logInfo('設定検証結果', {
    sourceSpreadsheetValid: sourceSpreadsheetValid,
    sourceSheetValid: sourceSheetValid,
    sourceColumnValid: sourceColumnValid,
    targetSpreadsheetValid: targetSpreadsheetValid,
    targetSheetValid: targetSheetValid,
    targetColumnValid: targetColumnValid
  });
  
  if (!sourceSpreadsheetValid) {
    logWarning('ソーススプレッドシートIDが正しく設定されていません', { id: config.sourceSpreadsheetId });
  }
  
  if (!sourceSheetValid) {
    logWarning('ソースシート名が正しく設定されていません', { name: config.sourceSheetName });
  }
  
  if (!sourceColumnValid) {
    logWarning('ソース列名が正しく設定されていません', { name: config.sourceColumnName });
  }
  
  if (!targetSpreadsheetValid) {
    logWarning('ターゲットスプレッドシートIDが正しく設定されていません', { id: config.targetSpreadsheetId });
  }
  
  if (!targetSheetValid) {
    logWarning('ターゲットシート名が正しく設定されていません', { name: config.targetSheetName });
  }
  
  if (!targetColumnValid) {
    logWarning('ターゲット列名が正しく設定されていません', { name: config.targetColumnName });
  }
  
  return sourceSpreadsheetValid && sourceSheetValid && sourceColumnValid && 
         targetSpreadsheetValid && targetSheetValid && targetColumnValid;
}

// ソーススプレッドシートからRSS URLを取得する
function getRssUrlsFromSource(config) {
  try {
    logInfo('ソーススプレッドシートからRSS URL取得開始', { 
      spreadsheetId: config.sourceSpreadsheetId,
      sheetName: config.sourceSheetName
    });
    
    // 取得するSheetを開く
    const sourceSpreadsheet = SpreadsheetApp.openById(config.sourceSpreadsheetId);
    if (!sourceSpreadsheet) {
      throw new Error('ソーススプレッドシートが見つかりません');
    }
    
    const sourceSheet = sourceSpreadsheet.getSheetByName(config.sourceSheetName);
    if (!sourceSheet) {
      throw new Error('ソースシートが見つかりません');
    }
    
    // 取得するSheetのデータ範囲を取得
    const sourceRange = sourceSheet.getDataRange();
    const sourceData = sourceRange.getValues();
    
    if (sourceData.length <= 1) {
      logWarning('ソースシートにデータがありません');
      return [];
    }
    
    // 列名から列インデックスを取得する
    const sourceColumnIndex = sourceData[0].indexOf(config.sourceColumnName);
    if (sourceColumnIndex === -1) {
      throw new Error(`ソース列名 "${config.sourceColumnName}" が見つかりません`);
    }
    
    // 取得したRSSフィードのURLを配列に格納する
    const rssUrls = [];
    for (let i = 1; i < sourceData.length; i++) {
      const row = sourceData[i];
      const url = row[sourceColumnIndex];
      
      if (isValidRssUrl(url)) {
        rssUrls.push(url);
        logInfo('RSS URL発見', { 
          row: i + 1, 
          url: url 
        });
      } else if (url) {
        logWarning('RSS URLではないURLをスキップ', { 
          row: i + 1, 
          url: url 
        });
      }
    }
    
    logInfo('RSS URL取得完了', { 
      totalRows: sourceData.length - 1,
      rssUrlsFound: rssUrls.length
    });
    
    return rssUrls;
  } catch (error) {
    logError('ソーススプレッドシートからのRSS URL取得エラー', error);
    return [];
  }
}

// 重複を排除する関数
function removeDuplicates(urls) {
  return [...new Set(urls)];
}

// ターゲットスプレッドシートにRSS URLを書き込む
function writeRssUrlsToTarget(urls, config) {
  try {
    logInfo('ターゲットスプレッドシートへの書き込み開始', { 
      spreadsheetId: config.targetSpreadsheetId,
      sheetName: config.targetSheetName,
      urlCount: urls.length
    });
    
    if (urls.length === 0) {
      logInfo('書き込むURLがありません');
      return true;
    }
    
    // 書き込むSheetを開く
    const targetSpreadsheet = SpreadsheetApp.openById(config.targetSpreadsheetId);
    if (!targetSpreadsheet) {
      throw new Error('ターゲットスプレッドシートが見つかりません');
    }
    
    const targetSheet = targetSpreadsheet.getSheetByName(config.targetSheetName);
    if (!targetSheet) {
      throw new Error('ターゲットシートが見つかりません');
    }
    
    // 既存のURLを取得して重複を避ける
    const existingData = targetSheet.getDataRange().getValues();
    const existingUrls = new Set(existingData.flat());

    const newUrls = urls.filter(url => !existingUrls.has(url));

    if (newUrls.length === 0) {
      logInfo('新しいURLはありません。書き込みをスキップします');
      return true;
    }
    
    // 最終行の取得と列インデックスの取得
    const lastRow = targetSheet.getLastRow();
    const headers = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0];
    const targetColumnIndex = headers.indexOf(config.targetColumnName);
    
    if (targetColumnIndex === -1) {
      throw new Error(`ターゲット列名 "${config.targetColumnName}" が見つかりません`);
    }
    
    // バッチ操作用に2次元配列を準備
    const batchData = newUrls.map(url => {
      const row = new Array(headers.length).fill('');
      row[targetColumnIndex] = url;
      return row;
    });
    
    // 一度に書き込む
    const targetRange = targetSheet.getRange(lastRow + 1, 1, newUrls.length, headers.length);
    targetRange.setValues(batchData);
    
    logInfo('ターゲットスプレッドシートへの書き込み完了', { 
      newUrlCount: newUrls.length
    });
    
    return true;
  } catch (error) {
    logError('ターゲットスプレッドシートへの書き込みエラー', error);
    return false;
  }
}

// テスト関数
function testRssUrlRetrieval() {
  logInfo('RSS URL取得ロジックテスト開始');
  
  // テスト用の設定（実際の設定に合わせて変更してください）
  const testConfig = {
    sourceSpreadsheetId: 'YOUR_TEST_SOURCE_ID',
    sourceSheetName: 'Sheet1',
    sourceColumnName: 'RSS_URL',
    targetSpreadsheetId: 'YOUR_TEST_TARGET_ID',
    targetSheetName: 'Sheet1',
    targetColumnName: 'URLS'
  };
  
  try {
    const rssUrls = getRssUrlsFromSource(testConfig);
    if (rssUrls) {
      logInfo('テスト成功: RSS URL取得', { count: rssUrls.length });
      return true;
    } else {
      logError('テスト失敗: RSS URL取得');
      return false;
    }
  } catch (error) {
    logError('テスト中にエラーが発生しました', error);
    return false;
  }
}

// 設定確認関数
function checkConfiguration() {
  logInfo('設定確認開始');
  const config = getConfig();
  const isValid = validateConfiguration(config);
  
  if (isValid) {
    logInfo('設定確認完了 - 正常に設定されています');
  } else {
    logWarning('設定確認完了 - 一部の設定が不完全です');
  }
  
  return isValid;
}
