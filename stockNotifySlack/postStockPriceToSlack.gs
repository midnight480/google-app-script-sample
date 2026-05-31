// Google App Scriptのソースコード
// 株価情報をSlackに通知するスクリプト

// 定数定義
const CONSTANTS = {
  YAHOO_FINANCE_API_BASE: 'https://query1.finance.yahoo.com/v7/finance/chart/',
  API_INTERVAL: '1d',
  JAPANESE_MARKET_SUFFIX: '.T'
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
function isValidStockCode(stockCode) {
  return stockCode && 
         stockCode !== 'XXXX' && 
         /^\d{4}$/.test(stockCode);
}

function isValidSlackToken(token) {
  return token && 
         token !== 'xoxb-XXXX' && 
         token.startsWith('xoxb-');
}

function isValidSlackChannel(channel) {
  return channel && 
         channel !== '#channel' && 
         channel.startsWith('#');
}

// 設定の初期化
function initializeConfig() {
  const properties = PropertiesService.getScriptProperties();
  const defaultConfig = {
    STOCK_CODE: 'XXXX',
    SLACK_BOT_TOKEN: 'xoxb-XXXX',
    SLACK_CHANNEL: '#channel'
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
function postStockPriceComparisonToSlack() {
  try {
    logInfo('株価通知処理開始');
    
    // 設定値を取得
    const config = getConfig();
    
    // 設定の検証
    if (!validateConfiguration(config)) {
      logError('設定が不完全です。処理を中止します');
      return false;
    }
    
    // 株価情報を取得
    const stockData = getStockPriceData(config.stockCode);
    if (!stockData) {
      logError('株価データの取得に失敗しました');
      return false;
    }
    
    // Slackに送信
    const sendResult = sendToSlack(stockData, config);
    if (sendResult) {
      logInfo('株価通知送信完了');
      return true;
    } else {
      logError('株価通知送信に失敗しました');
      return false;
    }
    
  } catch (error) {
    logError('株価通知処理エラー', error);
    return false;
  }
}

// 設定を取得する関数
function getConfig() {
  const properties = PropertiesService.getScriptProperties();
  return {
    stockCode: properties.getProperty('STOCK_CODE') || 'XXXX',
    slackBotToken: properties.getProperty('SLACK_BOT_TOKEN') || 'xoxb-XXXX',
    slackChannel: properties.getProperty('SLACK_CHANNEL') || '#channel'
  };
}

// 設定の検証
function validateConfiguration(config) {
  const stockValid = isValidStockCode(config.stockCode);
  const tokenValid = isValidSlackToken(config.slackBotToken);
  const channelValid = isValidSlackChannel(config.slackChannel);
  
  logInfo('設定検証結果', {
    stockValid: stockValid,
    tokenValid: tokenValid,
    channelValid: channelValid,
    stockCode: config.stockCode,
    slackChannel: config.slackChannel
  });
  
  if (!stockValid) {
    logWarning('証券コードが正しく設定されていません', { stockCode: config.stockCode });
  }
  
  if (!tokenValid) {
    logWarning('Slack Bot Tokenが正しく設定されていません');
  }
  
  if (!channelValid) {
    logWarning('Slack Channelが正しく設定されていません', { channel: config.slackChannel });
  }
  
  return stockValid && tokenValid && channelValid;
}

// ヤフーファイナンスから株価を取得する
function getStockPriceData(stockCode) {
  try {
    logInfo('株価データ取得開始', { stockCode: stockCode });
    
    const apiUrl = `${CONSTANTS.YAHOO_FINANCE_API_BASE}${stockCode}${CONSTANTS.JAPANESE_MARKET_SUFFIX}?interval=${CONSTANTS.API_INTERVAL}`;
    logInfo('API URL生成', { apiUrl: apiUrl });
    
    const response = UrlFetchApp.fetch(apiUrl);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      logError('API レスポンスエラー', { 
        statusCode: responseCode,
        response: response.getContentText()
      });
      return null;
    }
    
    const jsonResponse = JSON.parse(response.getContentText());
    
    // レスポンスの構造を検証
    if (!jsonResponse.chart || !jsonResponse.chart.result || jsonResponse.chart.result.length === 0) {
      logError('API レスポンス形式エラー', { response: jsonResponse });
      return null;
    }
    
    const result = jsonResponse.chart.result[0];
    const currentPrice = result.meta.regularMarketPrice;
    const previousPrice = result.meta.chartPreviousClose;
    
    if (!currentPrice || !previousPrice) {
      logError('株価データが取得できませんでした', { 
        currentPrice: currentPrice,
        previousPrice: previousPrice
      });
      return null;
    }
    
    const priceDifference = currentPrice - previousPrice;
    const priceChangePercent = (priceDifference / previousPrice) * 100;
    
    const stockData = {
      stockCode: stockCode,
      currentPrice: currentPrice,
      previousPrice: previousPrice,
      priceDifference: priceDifference,
      priceChangePercent: priceChangePercent,
      timestamp: new Date().toISOString()
    };
    
    logInfo('株価データ取得完了', stockData);
    return stockData;
    
  } catch (error) {
    logError('株価データ取得エラー', error);
    return null;
  }
}

// Slackに送信する
function sendToSlack(stockData, config) {
  try {
    logInfo('Slack送信開始', { 
      stockCode: stockData.stockCode,
      channel: config.slackChannel
    });
    
    // 価格変動の方向を判定
    const priceDirection = stockData.priceDifference >= 0 ? '📈' : '📉';
    const priceColor = stockData.priceDifference >= 0 ? 'good' : 'danger';
    
    const message = `*${stockData.stockCode}* の株価情報 ${priceDirection}
当日の株価: *${stockData.currentPrice.toFixed(2)}* 円
前日の株価: *${stockData.previousPrice.toFixed(2)}* 円
差額: *${stockData.priceDifference.toFixed(2)}* 円 (${stockData.priceChangePercent.toFixed(2)}%)
取得時刻: ${new Date(stockData.timestamp).toLocaleString('ja-JP')}`;
    
    const slackApp = SlackApp.create(config.slackBotToken);
    const result = slackApp.postMessage(config.slackChannel, message);
    
    if (result) {
      logInfo('Slack送信成功', { 
        channel: config.slackChannel,
        result: result
      });
      return true;
    } else {
      logError('Slack送信失敗', { 
        channel: config.slackChannel,
        result: result
      });
      return false;
    }
    
  } catch (error) {
    logError('Slack送信エラー', error);
    return false;
  }
}

// テスト関数
function testStockPriceAPI() {
  logInfo('株価APIテスト開始');
  
  const testStockCode = '7203'; // トヨタ自動車
  const stockData = getStockPriceData(testStockCode);
  
  if (stockData) {
    logInfo('株価APIテスト成功', stockData);
    return true;
  } else {
    logError('株価APIテスト失敗');
    return false;
  }
}

// 設定確認関数
function checkConfiguration() {
  logInfo('設定確認開始');
  
  const config = getConfig();
  const isValid = validateConfiguration(config);
  
  logInfo('設定確認結果', {
    isValid: isValid,
    stockCode: config.stockCode,
    slackChannel: config.slackChannel
  });
  
  if (isValid) {
    logInfo('設定確認完了 - 正常に設定されています');
  } else {
    logWarning('設定確認完了 - 設定が不完全です');
  }
  
  return isValid;
}

// 複数銘柄の株価を取得して送信する関数
function postMultipleStockPrices() {
  const stockCodes = ['7203', '6758', '9984']; // トヨタ、ソニー、ソフトバンク
  let successCount = 0;
  let failureCount = 0;
  
  logInfo('複数銘柄株価通知開始', { stockCodes: stockCodes });
  
  for (const stockCode of stockCodes) {
    try {
      const stockData = getStockPriceData(stockCode);
      if (stockData) {
        const config = getConfig();
        const sendResult = sendToSlack(stockData, config);
        if (sendResult) {
          successCount++;
        } else {
          failureCount++;
        }
      } else {
        failureCount++;
      }
      
      // API制限を避けるため少し待機
      Utilities.sleep(1000);
      
    } catch (error) {
      failureCount++;
      logError(`銘柄 ${stockCode} の処理エラー`, error);
    }
  }
  
  logInfo('複数銘柄株価通知完了', {
    total: stockCodes.length,
    success: successCount,
    failure: failureCount
  });
  
  return failureCount === 0;
}
