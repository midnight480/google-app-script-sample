// RSSフィード取得・Discord通知スクリプト
// 複数のRSSフィードを監視し、更新があった場合にDiscordのWebhookに通知を送信する

// 定数定義
const CONSTANTS = {
  DEFAULT_SLEEP_MS: 1000,
  RSS_PROPERTY_PREFIX: 'RSS_URL_',
  DEFAULT_SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',
  DEFAULT_SHEET_NAME: 'YOUR_SHEET_NAME_HERE',
  DEFAULT_CELL: 'A1',
  DEFAULT_WEBHOOK_URL: 'YOUR_DISCORD_WEBHOOK_URL_HERE'
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
function validateConfig(config) {
  let isValid = true;

  if (!config.rssUrls || config.rssUrls.length === 0) {
    logWarning('RSS_URL_x の設定が見つかりません');
    isValid = false;
  }

  if (!config.webhookUrl || config.webhookUrl === CONSTANTS.DEFAULT_WEBHOOK_URL) {
    logWarning('Discord Webhook URL が正しく設定されていません');
    isValid = false;
  }

  if (!config.spreadsheetId || config.spreadsheetId === CONSTANTS.DEFAULT_SPREADSHEET_ID) {
    logWarning('スプレッドシートID が正しく設定されていません');
    isValid = false;
  }

  return isValid;
}

// 設定の初期化
function initializeConfig() {
  const properties = PropertiesService.getScriptProperties();
  const defaultConfig = {
    'RSS_URL_1': 'https://example.com/rss',
    'WEBHOOK_URL': CONSTANTS.DEFAULT_WEBHOOK_URL,
    'LAST_CHECKED_SPREADSHEET_ID': CONSTANTS.DEFAULT_SPREADSHEET_ID,
    'LAST_CHECKED_SHEET_NAME': CONSTANTS.DEFAULT_SHEET_NAME,
    'LAST_CHECKED_CELL': CONSTANTS.DEFAULT_CELL
  };

  Object.entries(defaultConfig).forEach(([key, value]) => {
    if (!properties.getProperty(key)) {
      properties.setProperty(key, value);
    }
  });
}

// 初回実行時にスクリプトプロパティを設定
initializeConfig();

// 設定を取得する関数
function getConfig() {
  const properties = PropertiesService.getScriptProperties();
  const allProperties = properties.getProperties();
  
  // RSS_URL_ で始まるプロパティをすべて取得
  const rssUrls = [];
  for (const key in allProperties) {
    if (key.startsWith(CONSTANTS.RSS_PROPERTY_PREFIX) && allProperties[key]) {
      rssUrls.push(allProperties[key]);
    }
  }

  return {
    rssUrls: rssUrls,
    webhookUrl: properties.getProperty('WEBHOOK_URL') || CONSTANTS.DEFAULT_WEBHOOK_URL,
    spreadsheetId: properties.getProperty('LAST_CHECKED_SPREADSHEET_ID') || CONSTANTS.DEFAULT_SPREADSHEET_ID,
    sheetName: properties.getProperty('LAST_CHECKED_SHEET_NAME') || CONSTANTS.DEFAULT_SHEET_NAME,
    cell: properties.getProperty('LAST_CHECKED_CELL') || CONSTANTS.DEFAULT_CELL
  };
}

// メイン関数
function checkRssFeedsAndNotify() {
  try {
    logInfo('RSSフィード監視開始');
    
    const config = getConfig();
    if (!validateConfig(config)) {
      logError('設定が不完全です。処理を中止します');
      return false;
    }
    
    const lastCheckedTime = getLastCheckedTime(config);
    logInfo('前回確認日時', { time: new Date(lastCheckedTime).toISOString() });
    
    let hasNewItems = false;
    let latestTime = lastCheckedTime;

    for (const url of config.rssUrls) {
      logInfo('RSSフィード取得中', { url: url });
      
      try {
        const items = fetchAndParseRss(url);
        
        // 新しい記事を抽出（古い順に処理するためにリバース）
        const newItems = items
          .filter(item => item.pubDate > lastCheckedTime)
          .sort((a, b) => a.pubDate - b.pubDate);
          
        if (newItems.length > 0) {
          logInfo('新しい記事が見つかりました', { url: url, count: newItems.length });
          hasNewItems = true;
          
          for (const item of newItems) {
            sendToDiscordWebhook(config.webhookUrl, item);
            if (item.pubDate > latestTime) {
              latestTime = item.pubDate;
            }
            Utilities.sleep(CONSTANTS.DEFAULT_SLEEP_MS);
          }
        }
      } catch (error) {
        logError('RSSフィードの処理に失敗しました', { url: url, error: error.toString() });
        // 他のフィードは継続する
      }
    }
    
    // 最終実行日時を保存
    // 記事の有無に関わらず、チェックした日時として現在の時刻を保存
    updateLastCheckedTime(config, new Date().getTime());
    
    if (!hasNewItems) {
      logInfo('新しい記事はありませんでした');
    }
    
    logInfo('RSSフィード監視完了');
    return true;
    
  } catch (error) {
    logError('システムエラー', error);
    return false;
  }
}

// 前回確認日時をスプレッドシートから取得
function getLastCheckedTime(config) {
  try {
    const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
    const sheet = spreadsheet.getSheetByName(config.sheetName);
    if (!sheet) throw new Error('指定されたシートが見つかりません');
    
    const cellValue = sheet.getRange(config.cell).getValue();
    
    // 値がなければ0を返す（すべての記事が対象になる）
    if (!cellValue) return 0;
    
    // Date型またはタイムスタンプ値として解釈
    const time = new Date(cellValue).getTime();
    return isNaN(time) ? 0 : time;
  } catch (error) {
    logWarning('前回確認日時の取得に失敗したため、0から開始します', { error: error.toString() });
    return 0;
  }
}

// 前回確認日時をスプレッドシートに保存
function updateLastCheckedTime(config, timestamp) {
  try {
    const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
    const sheet = spreadsheet.getSheetByName(config.sheetName);
    if (!sheet) throw new Error('指定されたシートが見つかりません');
    
    // ISO 8601形式で保存
    const dateStr = new Date(timestamp).toISOString();
    sheet.getRange(config.cell).setValue(dateStr);
    logInfo('最終確認日時を更新しました', { timestamp: dateStr });
  } catch (error) {
    logError('最終確認日時の更新に失敗しました', error);
  }
}

// RSSのフェッチとパース
function fetchAndParseRss(url) {
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error(`HTTP Error: ${response.getResponseCode()}`);
  }
  
  const xml = response.getContentText();
  const document = XmlService.parse(xml);
  const root = document.getRootElement();
  const namespace = root.getNamespace();
  
  const items = [];
  
  // RSS 2.0 の場合
  if (root.getName() === 'rss') {
    const channel = root.getChild('channel');
    if (channel) {
      const entries = channel.getChildren('item');
      for (const entry of entries) {
        const title = entry.getChildText('title') || '';
        const link = entry.getChildText('link') || '';
        const pubDateStr = entry.getChildText('pubDate') || '';
        const pubDate = pubDateStr ? new Date(pubDateStr).getTime() : 0;
        
        items.push({ title, link, pubDate });
      }
    }
  } 
  // Atom 1.0 の場合
  else if (root.getName() === 'feed') {
    const entries = root.getChildren('entry', namespace);
    for (const entry of entries) {
      const title = entry.getChildText('title', namespace) || '';
      
      let link = '';
      const linkElements = entry.getChildren('link', namespace);
      for (const linkEl of linkElements) {
        if (linkEl.getAttribute('rel') && linkEl.getAttribute('rel').getValue() === 'alternate') {
          link = linkEl.getAttribute('href').getValue();
          break;
        } else if (!linkEl.getAttribute('rel')) {
          link = linkEl.getAttribute('href').getValue();
        }
      }
      
      const pubDateStr = entry.getChildText('published', namespace) || entry.getChildText('updated', namespace) || '';
      const pubDate = pubDateStr ? new Date(pubDateStr).getTime() : 0;
      
      items.push({ title, link, pubDate });
    }
  }
  // RDF/RSS 1.0 などのフォールバック
  else {
    const rss1Namespace = XmlService.getNamespace('http://purl.org/rss/1.0/');
    const dcNamespace = XmlService.getNamespace('http://purl.org/dc/elements/1.1/');
    const entries = root.getChildren('item', rss1Namespace);
    
    for (const entry of entries) {
      const title = entry.getChildText('title', rss1Namespace) || '';
      const link = entry.getChildText('link', rss1Namespace) || '';
      const pubDateStr = entry.getChildText('date', dcNamespace) || '';
      const pubDate = pubDateStr ? new Date(pubDateStr).getTime() : 0;
      
      items.push({ title, link, pubDate });
    }
  }
  
  return items;
}

// Discord Webhookへの送信
function sendToDiscordWebhook(webhookUrl, item) {
  const message = `**新しい記事が公開されました**\n${item.title}\n${item.link}`;
  
  const payload = {
    content: message
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(webhookUrl, options);
  if (response.getResponseCode() >= 400) {
    logError('Discordへの通知に失敗しました', { 
      status: response.getResponseCode(),
      response: response.getContentText()
    });
  } else {
    logInfo('Discordに通知しました', { title: item.title });
  }
}

// テスト・確認用関数
function checkConfiguration() {
  logInfo('設定確認開始');
  const config = getConfig();
  const isValid = validateConfig(config);
  
  if (isValid) {
    logInfo('設定確認完了 - 正常に設定されています');
    logInfo('設定内容', {
      rssUrls: config.rssUrls,
      webhookUrl: config.webhookUrl.substring(0, 30) + '...',
      spreadsheetId: config.spreadsheetId,
      sheetName: config.sheetName,
      cell: config.cell
    });
  } else {
    logWarning('設定確認完了 - 一部の設定が不完全です');
  }
  
  return isValid;
}

function testWebhook() {
  const config = getConfig();
  if (config.webhookUrl === CONSTANTS.DEFAULT_WEBHOOK_URL || !config.webhookUrl) {
    logError('Webhook URLが設定されていません');
    return;
  }
  
  const dummyItem = {
    title: 'テスト通知: RSS Webhook設定',
    link: 'https://example.com',
    pubDate: new Date().getTime()
  };
  
  sendToDiscordWebhook(config.webhookUrl, dummyItem);
}
