// Google Calendar to Discord
// Google Apps Script(JavaScript)

// 定数定義
const CONSTANTS = {
  NOTIFICATION_INTERVAL_DAYS: 7,
  SLEEP_INTERVAL_MS: 1000
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
function isValidCalendarId(calendarId) {
  return calendarId && 
         calendarId !== 'YOUR_GOOGLE_CALENDAR_ID_HERE' && 
         calendarId.includes('@');
}

function isValidWebhookUrl(webhookUrl) {
  return webhookUrl && 
         webhookUrl !== 'YOUR_DISCORD_WEBHOOK_URL_HERE' && 
         webhookUrl.startsWith('https://discord.com/api/webhooks/');
}

// 設定の初期化
function initializeConfig() {
  const properties = PropertiesService.getScriptProperties();
  const defaultConfig = {
    CALENDAR_ID: 'YOUR_GOOGLE_CALENDAR_ID_HERE',
    DISCORD_WEBHOOK_URL: 'YOUR_DISCORD_WEBHOOK_URL_HERE'
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
function main() {
  try {
    logInfo('Google Calendar to Discord処理開始');
    
    const events = getGoogleCalendar();
    if (events.length === 0) {
      logInfo('取得した予定はありません');
    } else {
      logInfo('取得した予定の数', { count: events.length });
      const sendResult = send2Discord(events);
      if (sendResult) {
        logInfo('Discord送信完了');
      } else {
        logError('Discord送信に失敗しました');
      }
    }
    
    logInfo('Google Calendar to Discord処理完了');
  } catch (error) {
    logError('メイン処理エラー', error);
  }
}

// Google Calendarの予定を取得する
function getGoogleCalendar() {
  const calendarId = PropertiesService.getScriptProperties().getProperty('CALENDAR_ID');
  
  if (!isValidCalendarId(calendarId)) {
    logWarning('Google Calendar IDが正しく設定されていません', { calendarId });
    return [];
  }
  
  try {
    logInfo('Google Calendarから予定を取得開始', { calendarId });
    
    const today = new Date();
    const oneWeekLater = new Date();
    oneWeekLater.setDate(today.getDate() + CONSTANTS.NOTIFICATION_INTERVAL_DAYS);
    
    logInfo('取得期間設定', { 
      start: today.toISOString(), 
      end: oneWeekLater.toISOString() 
    });
    
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      logError('指定されたカレンダーが見つかりません', { calendarId });
      return [];
    }
    
    const events = calendar.getEvents(today, oneWeekLater);
    const eventDetails = [];
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const eventDetail = {
        'title': event.getTitle(),
        'startTime': event.getStartTime(),
        'endTime': event.getEndTime(),
        'location': event.getLocation(),
        'description': event.getDescription()
      };
      
      eventDetails.push(eventDetail);
      logInfo('予定情報取得', { 
        index: i, 
        title: eventDetail.title,
        startTime: eventDetail.startTime.toISOString()
      });
    }
    
    logInfo('Google Calendar予定取得完了', { 
      totalEvents: eventDetails.length 
    });
    
    return eventDetails;
  } catch (error) {
    logError('Google Calendar予定取得エラー', error);
    return [];
  }
}

// Discordに通知する
function send2Discord(events) {
  const webhookUrl = PropertiesService.getScriptProperties().getProperty('DISCORD_WEBHOOK_URL');
  
  if (!isValidWebhookUrl(webhookUrl)) {
    logWarning('Discord Webhook URLが正しく設定されていません', { webhookUrl });
    return false;
  }
  
  if (!events || events.length === 0) {
    logInfo('送信する予定がありません');
    return true;
  }
  
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    
    try {
      const payload = {
        'content': '予定の通知',
        'embeds': [{
          'title': event.title,
          'fields': [
            {'name': '開始日時', 'value': event.startTime.toString(), 'inline': true},
            {'name': '終了日時', 'value': event.endTime.toString(), 'inline': true},
            {'name': '場所', 'value': event.location || '未設定', 'inline': true}
          ]
        }]
      };
      
      const options = {
        'method': 'post',
        'contentType': 'application/json',
        'payload': JSON.stringify(payload)
      };
      
      logInfo('Discord送信開始', { 
        index: i, 
        title: event.title 
      });
      
      const response = UrlFetchApp.fetch(webhookUrl, options);
      const responseCode = response.getResponseCode();
      
      if (responseCode >= 200 && responseCode < 300) {
        successCount++;
        logInfo('Discord送信成功', { 
          index: i, 
          title: event.title,
          statusCode: responseCode,
          response: response.getContentText()
        });
      } else {
        failureCount++;
        logError('Discord送信失敗', { 
          index: i, 
          title: event.title,
          statusCode: responseCode,
          response: response.getContentText()
        });
      }
      
    } catch (error) {
      failureCount++;
      logError('Discord送信エラー', { 
        index: i, 
        title: event.title,
        error: error
      });
    }
    
    // 1秒待機 (1000ミリ秒 = 1秒)
    if (i < events.length - 1) { // 最後のイベント以外で待機
      Utilities.sleep(CONSTANTS.SLEEP_INTERVAL_MS);
    }
  }
  
  logInfo('Discord送信完了', { 
    total: events.length, 
    success: successCount, 
    failure: failureCount 
  });
  
  return failureCount === 0;
}

// テスト関数
function testCalendarAccess() {
  logInfo('Google Calendarアクセステスト開始');
  
  const calendarId = PropertiesService.getScriptProperties().getProperty('CALENDAR_ID');
  
  if (!isValidCalendarId(calendarId)) {
    logError('Calendar IDが無効です', { calendarId });
    return false;
  }
  
  try {
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (calendar) {
      logInfo('Calendarアクセステスト成功', { 
        calendarName: calendar.getName(),
        calendarId: calendar.getId()
      });
      return true;
    } else {
      logError('Calendarが見つかりません', { calendarId });
      return false;
    }
  } catch (error) {
    logError('Calendarアクセステストエラー', error);
    return false;
  }
}

// 設定確認関数
function checkConfiguration() {
  logInfo('設定確認開始');
  
  const calendarId = PropertiesService.getScriptProperties().getProperty('CALENDAR_ID');
  const webhookUrl = PropertiesService.getScriptProperties().getProperty('DISCORD_WEBHOOK_URL');
  
  const calendarValid = isValidCalendarId(calendarId);
  const webhookValid = isValidWebhookUrl(webhookUrl);
  
  logInfo('設定確認結果', { 
    calendarValid: calendarValid,
    webhookValid: webhookValid,
    calendarId: calendarId,
    webhookUrl: webhookUrl
  });
  
  if (calendarValid && webhookValid) {
    logInfo('設定確認完了 - 正常に設定されています');
    return true;
  } else {
    logWarning('設定確認完了 - 一部の設定が不完全です');
    return false;
  }
}
