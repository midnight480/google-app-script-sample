// 佐賀市ごみ収集通知システム
// 定数定義
const CONSTANTS = {
  WEEKDAYS: {
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
    SUNDAY: 0
  },
  TRASH_TYPES: {
    BURNABLE: '燃えるごみ',
    PET_BOTTLE: 'ペットボトル',
    NON_BURNABLE: '燃えないゴミ',
    RECYCLABLE: '資源物（紙・布類、ビン・缶）'
  },
  NOTIFICATION_TIMES: {
    MORNING: 7,
    EVENING: 19
  },
  CUTOFF_DATE: '2024-04-01'
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

// 設定の初期化
function initializeConfig() {
  const properties = PropertiesService.getScriptProperties();
  const defaultConfig = {
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

// 日付情報を一度に取得する関数
function getDateInfo(date) {
  return {
    weekday: date.getDay(),
    date: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    dateObj: date
  };
}

// メイン関数
function notifyTrashCollection() {
  try {
    logInfo('ごみ収集通知処理開始');
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayInfo = getDateInfo(today);
    const tomorrowInfo = getDateInfo(tomorrow);

    logInfo('日付情報取得完了', { 
      today: todayInfo, 
      tomorrow: tomorrowInfo 
    });

    const todayTrashTypes = getTrashType(todayInfo);
    const tomorrowTrashTypes = getTrashType(tomorrowInfo);

    logInfo('ごみ種別判定完了', { 
      today: todayTrashTypes, 
      tomorrow: tomorrowTrashTypes 
    });

    const currentHour = today.getHours();
    
    if (currentHour < CONSTANTS.NOTIFICATION_TIMES.EVENING) {
      if (todayTrashTypes.length > 0) {
        const message = `今日は${todayTrashTypes.join("、")}の回収日です。\n${getAdditionalMessage(today)}`;
        const sendResult = sendDiscordNotificationWithErrorHandling(message);
        if (sendResult) {
          logInfo('今日のごみ収集通知送信完了');
        } else {
          logError('今日のごみ収集通知送信失敗');
        }
      } else {
        logInfo('今日はごみ収集日ではありません');
      }
    } else {
      if (tomorrowTrashTypes.length > 0) {
        const message = `明日は${tomorrowTrashTypes.join("、")}の回収日です。\n${getAdditionalMessage(tomorrow)}`;
        const sendResult = sendDiscordNotificationWithErrorHandling(message);
        if (sendResult) {
          logInfo('明日のごみ収集通知送信完了');
        } else {
          logError('明日のごみ収集通知送信失敗');
        }
      } else {
        logInfo('明日はごみ収集日ではありません');
      }
    }
    
    logInfo('ごみ収集通知処理完了');
  } catch (error) {
    logError('ごみ収集通知処理エラー', error);
  }
}

// ごみ種別を判定する関数（最適化版）
function getTrashType(dateInfo) {
  const trashTypes = [];
  const { weekday, date, month, year } = dateInfo;
  const weekOfMonth = Math.ceil(date / 7);

  // 燃えるごみ（月曜日と木曜日）
  if (weekday === CONSTANTS.WEEKDAYS.MONDAY || weekday === CONSTANTS.WEEKDAYS.THURSDAY) {
    trashTypes.push(CONSTANTS.TRASH_TYPES.BURNABLE);
  }

  // ペットボトル（第1水曜日と第3水曜日）
  if (weekday === CONSTANTS.WEEKDAYS.WEDNESDAY && (weekOfMonth === 1 || weekOfMonth === 3)) {
    trashTypes.push(CONSTANTS.TRASH_TYPES.PET_BOTTLE);
  }

  // 燃えないゴミ（第1金曜日）
  // 令和8年(2026年)1月は例外処理
  if (year === 2026 && month === 1) {
    if (weekday === CONSTANTS.WEEKDAYS.FRIDAY && date === 16) {
      trashTypes.push(CONSTANTS.TRASH_TYPES.NON_BURNABLE);
    }
  } else {
    // 通常の月の処理
    if (weekday === CONSTANTS.WEEKDAYS.FRIDAY && weekOfMonth === 1) {
      trashTypes.push(CONSTANTS.TRASH_TYPES.NON_BURNABLE);
    }
  }

  // 資源物（第2金曜日と第4金曜日）
  if (weekday === CONSTANTS.WEEKDAYS.FRIDAY && (weekOfMonth === 2 || weekOfMonth === 4)) {
    trashTypes.push(CONSTANTS.TRASH_TYPES.RECYCLABLE);
  }

  return trashTypes;
}

// 追加メッセージを取得する関数
function getAdditionalMessage(date) {
  let messageURL;

  // 令和7年度 (2025/4/1 ~)
  if (date >= new Date('2025-04-01')) {
    messageURL = "https://www.city.saga.lg.jp/site_files/file/2025/202503/p1imh8o2fr1o401dob41qscd378.pdf";
  } 
  // 令和6年度 (2024/4/1 ~ 2025/3/31)
  else if (date >= new Date('2024-04-01')) {
    messageURL = "https://www.city.saga.lg.jp/site_files/file/2024/202402/p1hljj82u8kkh1a7217vu14s61lrp8.pdf";
  } 
  // 令和5年度以前 (~ 2024/3/31)
  else {
    messageURL = "https://www.city.saga.lg.jp/site_files/file/2023/202302/p1gp9ub2hm1d49iac165s13lrt4l7.pdf";
  }
  
  return `さらに情報は http://saga.5374.jp/ で確認できます。\n詳細はこちらをご覧ください: ${messageURL}\n`;
}

// Discord通知送信関数（エラーハンドリング付き）
function sendDiscordNotificationWithErrorHandling(message) {
  const webhookUrl = PropertiesService.getScriptProperties().getProperty('DISCORD_WEBHOOK_URL');

  if (!webhookUrl || webhookUrl === "YOUR_DISCORD_WEBHOOK_URL_HERE") {
    logWarning('Discord Webhook URLが設定されていないため、送信をスキップします');
    return false;
  }

  if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    logError('Invalid Discord webhook URL format', { webhookUrl });
    return false;
  }

  const payload = {
    "content": message
  };

  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  };

  try {
    const response = UrlFetchApp.fetch(webhookUrl, options);
    logInfo('Discord送信成功', { 
      statusCode: response.getResponseCode(),
      content: response.getContentText()
    });
    return true;
  } catch (error) {
    logError('Discord送信エラー', error);
    return false;
  }
}

// テスト関数
function testTrashCollectionLogic() {
  logInfo('ごみ収集ロジックテスト開始');
  
  const testCases = [
    // 令和7年度のテストケース
    { date: '2025-04-07', expected: [CONSTANTS.TRASH_TYPES.BURNABLE] }, // 月曜日
    { date: '2025-04-02', expected: [CONSTANTS.TRASH_TYPES.PET_BOTTLE] }, // 第1水曜日
    { date: '2025-04-04', expected: [CONSTANTS.TRASH_TYPES.NON_BURNABLE] }, // 第1金曜日
    { date: '2025-04-11', expected: [CONSTANTS.TRASH_TYPES.RECYCLABLE] }, // 第2金曜日
    // 令和8年(2026年)1月の例外テスト
    { date: '2026-01-02', expected: [] }, // 第1金曜日だが収集なし
    { date: '2026-01-16', expected: [CONSTANTS.TRASH_TYPES.NON_BURNABLE] }, // 例外の第3金曜日
    { date: '2026-01-09', expected: [CONSTANTS.TRASH_TYPES.RECYCLABLE] }, // 第2金曜日(資源物)
    { date: '2026-02-06', expected: [CONSTANTS.TRASH_TYPES.NON_BURNABLE] }, // 2月の第1金曜日
  ];
  
  let successCount = 0;
  
  testCases.forEach((testCase, index) => {
    const testDate = new Date(testCase.date);
    const dateInfo = getDateInfo(testDate);
    const result = getTrashType(dateInfo);
    
    const isSuccess = JSON.stringify(result.sort()) === JSON.stringify(testCase.expected.sort());
    
    if (isSuccess) {
      successCount++;
      logInfo(`テストケース ${index + 1} 成功`, { 
        date: testCase.date, 
        expected: testCase.expected, 
        actual: result 
      });
    } else {
      logError(`テストケース ${index + 1} 失敗`, { 
        date: testCase.date, 
        expected: testCase.expected, 
        actual: result 
      });
    }
  });
  
  logInfo('テスト完了', { 
    total: testCases.length, 
    success: successCount, 
    failure: testCases.length - successCount 
  });
  
  return successCount === testCases.length;
}

// 設定確認関数
function checkConfiguration() {
  logInfo('設定確認開始');
  
  const webhookUrl = PropertiesService.getScriptProperties().getProperty('DISCORD_WEBHOOK_URL');
  const isConfigured = webhookUrl !== "YOUR_DISCORD_WEBHOOK_URL_HERE" && 
                      webhookUrl.startsWith('https://discord.com/api/webhooks/');
  
  if (isConfigured) {
    logInfo('設定確認完了 - 正常に設定されています');
    return true;
  } else {
    logWarning('設定確認完了 - Webhook URLが正しく設定されていません');
    return false;
  }
}
