// Google Form to Calendar Meet Notify
// ユーティリティ関数

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

// スクリプトプロパティの初期化関数
function initializeScriptProperties() {
  const properties = PropertiesService.getScriptProperties();
  
  // 必須プロパティの設定（デフォルト値は設定しない - ユーザーが設定する必要がある）
  // SHARED_CALENDAR_IDはスクリプトプロパティで設定してください
  
  // デフォルト値の設定
  if (!properties.getProperty('TIMEZONE')) {
    properties.setProperty('TIMEZONE', 'Asia/Tokyo');
  }
  
  if (!properties.getProperty('EMAIL_SUBJECT_PREFIX')) {
    properties.setProperty('EMAIL_SUBJECT_PREFIX', '登録完了: ');
  }
  
  // テスト用設定（既存の設定を維持）
  if (!properties.getProperty('TEST_EMAIL_ADDRESS')) {
    properties.setProperty('TEST_EMAIL_ADDRESS', 'YOUR_TEST_EMAIL_ADDRESS_HERE');
  }
  
  logInfo('スクリプトプロパティ初期化完了');
}

// 設定の初期化（初回のみ実行）
function initializeConfig() {
  const properties = PropertiesService.getScriptProperties();
  
  // 既に初期化済みかチェック
  if (properties.getProperty('_CONFIG_INITIALIZED') === 'true') {
    return;
  }
  
  // 新しい初期化関数を呼び出し
  initializeScriptProperties();
  
  // 初期化完了フラグを設定
  properties.setProperty('_CONFIG_INITIALIZED', 'true');
}

// 初回実行時にスクリプトプロパティを設定
initializeConfig();

// リトライすべきエラーかどうかを判定
function shouldRetry(error) {
  if (!error) return false;
  
  const errorMessage = error.toString().toLowerCase();
  const errorCode = error.code || '';
  
  // リトライすべきエラー（一時的なエラー）
  const retryableErrors = [
    'timeout',
    'network',
    'connection',
    'rate limit',
    'quota',
    '503',
    '500',
    '502',
    '504'
  ];
  
  // リトライしないエラー（恒久的なエラー）
  // 英語と日本語のエラーメッセージの両方に対応
  const nonRetryableErrors = [
    'permission denied',
    '権限がありません',
    'forbidden',
    '禁止',
    'unauthorized',
    '認証',
    'not found',
    '見つかりません',
    'invalid',
    '無効',
    '400',
    '401',
    '403',
    '404'
  ];
  
  // 恒久的なエラーの場合はリトライしない
  for (const nonRetryable of nonRetryableErrors) {
    if (errorMessage.includes(nonRetryable) || errorCode.toString().includes(nonRetryable)) {
      return false;
    }
  }
  
  // 一時的なエラーの場合はリトライする
  for (const retryable of retryableErrors) {
    if (errorMessage.includes(retryable) || errorCode.toString().includes(retryable)) {
      return true;
    }
  }
  
  // デフォルトはリトライする（既存の動作を維持）
  return true;
}

// リトライ機能付きで関数を実行
function executeWithRetry(func, funcName, maxRetries = CONSTANTS.MAX_RETRY_COUNT) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logInfo(`${funcName}実行中 (試行 ${attempt}/${maxRetries})`);
      const result = func();
      if (attempt > 1) {
        logInfo(`${funcName}成功 (試行 ${attempt}回目)`);
      }
      return result;
    } catch (error) {
      lastError = error;
      logError(`${funcName}失敗 (試行 ${attempt}/${maxRetries})`, error);
      
      // リトライすべきエラーかどうかを判定
      if (!shouldRetry(error)) {
        logWarning(`${funcName}はリトライ不可能なエラーのため、処理を中断します`, error);
        throw error;
      }
      
      if (attempt < maxRetries) {
        logInfo(`${CONSTANTS.RETRY_DELAY_MS}ms待機後にリトライします`);
        Utilities.sleep(CONSTANTS.RETRY_DELAY_MS);
      }
    }
  }
  
  throw new Error(`${funcName}が${maxRetries}回試行しても失敗しました: ${lastError?.toString() || 'Unknown error'}`);
}

// ==================== 日時解析機能 ====================

/**
 * 日時文字列をDateオブジェクトに変換
 * 要件 5.4 に対応 - 柔軟な日時フォーマット解析
 */
function parseDateTime(dateTimeString) {
  if (!dateTimeString) return null;
  
  // 既にDateオブジェクトの場合はそのまま返す
  if (dateTimeString instanceof Date) {
    if (isNaN(dateTimeString.getTime())) {
      throw new Error('無効なDateオブジェクトです');
    }
    return dateTimeString;
  }
  
  // 文字列以外の場合はエラー
  if (typeof dateTimeString !== 'string') {
    throw new Error(`無効な日時データ型: ${typeof dateTimeString}`);
  }
  
  const originalString = dateTimeString;
  let normalizedString = dateTimeString.trim();
  
  // 空文字列チェック
  if (normalizedString === '') {
    throw new Error('日時文字列が空です');
  }
  
  try {
    // 日本語形式の正規化
    normalizedString = normalizeJapaneseDateFormat(normalizedString);
    
    // 複数の解析方法を試行
    const parseMethods = [
      () => parseStandardFormat(normalizedString),
      () => parseWithSlashFormat(normalizedString),
      () => parseWithHyphenFormat(normalizedString),
      () => parseJapaneseFormat(normalizedString),
      () => parseISOFormat(normalizedString)
    ];
    
    for (const parseMethod of parseMethods) {
      try {
        const result = parseMethod();
        if (result && !isNaN(result.getTime())) {
          return result;
        }
      } catch (e) {
        // 次の方法を試行
        continue;
      }
    }
    
    throw new Error(`サポートされていない日時形式: ${originalString}`);
    
  } catch (error) {
    throw new Error(`日時解析エラー: ${originalString} - ${error.message}`);
  }
}

/**
 * 日本語形式の日時文字列を正規化
 */
function normalizeJapaneseDateFormat(dateString) {
  return dateString
    // 日本語の年月日を置換（例: "2025年1月1日" → "2025-1-1"）
    .replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/g, '$1-$2-$3')
    // 日本語の時分秒を置換（例: "10時30分" → "10:30"）
    .replace(/(\d{1,2})時(\d{1,2})分/g, '$1:$2')
    .replace(/(\d{1,2})時/g, '$1:00')
    // 全角数字を半角に変換
    .replace(/[０-９]/g, function(s) {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    })
    // 複数のスペースを1つに統一
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 標準形式での解析
 */
function parseStandardFormat(dateString) {
  return new Date(dateString);
}

/**
 * スラッシュ区切り形式での解析
 */
function parseWithSlashFormat(dateString) {
  const slashFormat = dateString.replace(/-/g, '/');
  return new Date(slashFormat);
}

/**
 * ハイフン区切り形式での解析
 */
function parseWithHyphenFormat(dateString) {
  const hyphenFormat = dateString.replace(/\//g, '-');
  return new Date(hyphenFormat);
}

/**
 * 日本語形式での解析
 */
function parseJapaneseFormat(dateString) {
  // 既に正規化されているが、さらに細かい調整
  const japaneseNormalized = dateString
    .replace(/午前/g, 'AM')
    .replace(/午後/g, 'PM');
  return new Date(japaneseNormalized);
}

/**
 * ISO形式での解析
 */
function parseISOFormat(dateString) {
  // ISO形式かどうかチェック
  if (dateString.includes('T') || dateString.includes('Z')) {
    return new Date(dateString);
  }
  
  // ISO形式に変換を試行
  const isoFormat = dateString.replace(' ', 'T');
  return new Date(isoFormat);
}

// 既存の関数との互換性を保つためのラッパー関数
function isValidCalendarId(calendarId) {
  return calendarId && 
         typeof calendarId === 'string' && 
         calendarId.trim() !== '' &&
         (calendarId === 'primary' || calendarId.includes('@'));
}

function validateEmailList(emails, maxCount = 50) {
  if (!Array.isArray(emails)) return [];
  if (emails.length > maxCount) {
    logWarning(`メールアドレス数が制限を超えています（${emails.length} > ${maxCount}）。最初の${maxCount}件のみ使用します。`);
    return emails.slice(0, maxCount);
  }
  return emails;
}

// 設定確認関数
function checkConfiguration() {
  logInfo('設定確認開始');
  
  const properties = PropertiesService.getScriptProperties();
  const calendarId = properties.getProperty('SHARED_CALENDAR_ID');
  const testEmailAddress = properties.getProperty('TEST_EMAIL_ADDRESS') || 'YOUR_TEST_EMAIL_ADDRESS_HERE';
  
  const calendarIdValid = isValidCalendarId(calendarId);
  const testEmailValid = testEmailAddress && 
                         testEmailAddress !== 'YOUR_TEST_EMAIL_ADDRESS_HERE' &&
                         isValidEmail(testEmailAddress);
  
  logInfo('設定確認結果', {
    calendarIdValid: calendarIdValid,
    calendarId: calendarId,
    testEmailValid: testEmailValid,
    testEmailAddress: testEmailAddress
  });
  
  if (calendarIdValid && testEmailValid) {
    logInfo('設定確認完了 - 正常に設定されています');
    return true;
  } else {
    if (!calendarIdValid) {
      logWarning('設定確認完了 - カレンダーIDが正しく設定されていません');
    }
    if (!testEmailValid) {
      logWarning('設定確認完了 - テスト用メールアドレスが設定されていません');
    }
    return false;
  }
}

