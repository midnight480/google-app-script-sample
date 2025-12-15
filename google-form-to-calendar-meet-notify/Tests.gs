// Google Form to Calendar Meet Notify
// テスト関数

// テスト用: Google Formで登録した内容をGoogle Calendarに登録する
function testCreateCalendarEvent() {
  try {
    logInfo('テスト: Calendar予定登録開始');
    
    const properties = PropertiesService.getScriptProperties();
    const testEmailAddress = properties.getProperty('TEST_EMAIL_ADDRESS') || 'YOUR_TEST_EMAIL_ADDRESS_HERE';
    
    // テスト用メールアドレスが設定されているか確認
    if (!testEmailAddress || 
        testEmailAddress === 'YOUR_TEST_EMAIL_ADDRESS_HERE' ||
        !isValidEmail(testEmailAddress)) {
      throw new Error('テスト用メールアドレスが設定されていません。PropertiesServiceでTEST_EMAIL_ADDRESSを設定してください。');
    }
    
    const testFormData = {
      organizerEmail: testEmailAddress,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明日
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 明日の1時間後
      title: 'テスト会議',
      description: 'これはテスト用の会議です',
      attendees: []
    };
    
    validateFormData(testFormData);
    const event = createCalendarEvent(testFormData);
    
    logInfo('テスト: Calendar予定登録成功', { eventId: event.getId() });
    return event;
  } catch (error) {
    logError('テスト: Calendar予定登録失敗', error);
    throw error;
  }
}

// テスト用: Google Calendarに登録した内容をGoogle Meetに発行する
function testCreateMeetLink() {
  try {
    logInfo('テスト: Google Meet発行開始');
    
    // まずテストイベントを作成
    const event = testCreateCalendarEvent();
    
    // Meet URLを取得
    const meetUrl = getMeetUrlFromEvent(event);
    
    logInfo('テスト: Google Meet発行成功', { meetUrl: meetUrl });
    return meetUrl;
  } catch (error) {
    logError('テスト: Google Meet発行失敗', error);
    throw error;
  }
}

// テスト用: Google Meetに発行した内容をメールで通知する
function testSendNotificationEmail() {
  try {
    logInfo('テスト: メール通知送信開始');
    
    const properties = PropertiesService.getScriptProperties();
    const testEmailAddress = properties.getProperty('TEST_EMAIL_ADDRESS') || 'YOUR_TEST_EMAIL_ADDRESS_HERE';
    
    // テスト用メールアドレスが設定されているか確認
    if (!testEmailAddress || 
        testEmailAddress === 'YOUR_TEST_EMAIL_ADDRESS_HERE' ||
        !isValidEmail(testEmailAddress)) {
      throw new Error('テスト用メールアドレスが設定されていません。PropertiesServiceでTEST_EMAIL_ADDRESSを設定してください。');
    }
    
    // 実際のイベントを作成してMeet URLを取得
    const testFormData = {
      organizerEmail: testEmailAddress,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      title: 'テスト会議 - メール通知',
      description: 'これはメール通知のテストです',
      attendees: []
    };
    
    // 実際のイベントを作成してMeet URLを取得
    validateFormData(testFormData);
    const event = createCalendarEvent(testFormData);
    const meetUrl = getMeetUrlFromEvent(event);
    
    logInfo('テスト: Meet URL取得完了', { meetUrl: meetUrl });
    
    sendNotificationEmail(testFormData, meetUrl);
    
    logInfo('テスト: メール通知送信成功');
    return true;
  } catch (error) {
    logError('テスト: メール通知送信失敗', error);
    throw error;
  }
}

// テスト用: 全体的なテスト
function testFullFlow() {
  try {
    logInfo('テスト: 全体フロー開始');
    
    const properties = PropertiesService.getScriptProperties();
    const testEmailAddress = properties.getProperty('TEST_EMAIL_ADDRESS') || 'YOUR_TEST_EMAIL_ADDRESS_HERE';
    
    // テスト用メールアドレスが設定されているか確認
    if (!testEmailAddress || 
        testEmailAddress === 'YOUR_TEST_EMAIL_ADDRESS_HERE' ||
        !isValidEmail(testEmailAddress)) {
      throw new Error('テスト用メールアドレスが設定されていません。PropertiesServiceでTEST_EMAIL_ADDRESSを設定してください。');
    }
    
    const testFormData = {
      organizerEmail: testEmailAddress,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      title: 'テスト会議 - 全体フロー',
      description: 'これは全体フローのテストです',
      attendees: []
    };
    
    // 1. Calendarに登録
    validateFormData(testFormData);
    const event = createCalendarEvent(testFormData);
    logInfo('テスト: Calendar予定登録完了', { eventId: event.getId() });
    
    // 2. Meet URLを取得
    const meetUrl = getMeetUrlFromEvent(event);
    logInfo('テスト: Google Meet URL取得完了', { meetUrl: meetUrl });
    
    // 3. メール通知
    sendNotificationEmail(testFormData, meetUrl);
    logInfo('テスト: メール通知送信完了');
    
    logInfo('テスト: 全体フロー成功');
    return true;
  } catch (error) {
    logError('テスト: 全体フロー失敗', error);
    throw error;
  }
}

// ==================== FormManager テスト関数 ====================

/**
 * FormManagerのテスト関数
 */
function testFormManager() {
  try {
    logInfo('FormManagerテスト開始');
    
    const formManager = createFormManager();
    
    // テスト用フォームを作成
    const testTitle = `テストフォーム - ${new Date().toISOString()}`;
    const result = formManager.createCompleteForm(testTitle);
    
    logInfo('FormManagerテスト成功', {
      formId: result.formId,
      formTitle: result.formTitle,
      editUrl: result.editUrl,
      publishedUrl: result.publishedUrl,
      spreadsheetId: result.spreadsheetId,
      spreadsheetUrl: result.spreadsheetUrl
    });
    
    return result;
    
  } catch (error) {
    logError('FormManagerテスト失敗', error);
    throw error;
  }
}

/**
 * 既存のスプレッドシートにフォームを紐付けるテスト
 */
function testFormManagerWithExistingSpreadsheet() {
  try {
    logInfo('既存スプレッドシート紐付けテスト開始');
    
    // まず新しいスプレッドシートを作成
    const testSpreadsheet = SpreadsheetApp.create('テスト用スプレッドシート');
    const spreadsheetId = testSpreadsheet.getId();
    
    logInfo('テスト用スプレッドシート作成完了', {
      spreadsheetId: spreadsheetId,
      spreadsheetUrl: testSpreadsheet.getUrl()
    });
    
    // FormManagerで既存スプレッドシートに紐付け
    const formManager = createFormManager();
    const testTitle = `既存スプレッドシート紐付けテスト - ${new Date().toISOString()}`;
    const result = formManager.createCompleteForm(testTitle, spreadsheetId);
    
    logInfo('既存スプレッドシート紐付けテスト成功', {
      formId: result.formId,
      formTitle: result.formTitle,
      editUrl: result.editUrl,
      publishedUrl: result.publishedUrl,
      spreadsheetId: result.spreadsheetId,
      spreadsheetUrl: result.spreadsheetUrl
    });
    
    return result;
    
  } catch (error) {
    logError('既存スプレッドシート紐付けテスト失敗', error);
    throw error;
  }
}

/**
 * フォームフィールドの検証テスト
 */
function testFormFieldValidation() {
  try {
    logInfo('フォームフィールド検証テスト開始');
    
    const formManager = createFormManager();
    
    // 1. 空のタイトルでフォーム作成を試行（エラーになるはず）
    try {
      formManager.createForm('');
      throw new Error('空のタイトルでフォーム作成が成功してしまいました');
    } catch (error) {
      if (error.message.includes('フォームタイトルは必須です')) {
        logInfo('空タイトル検証テスト成功');
      } else {
        throw error;
      }
    }
    
    // 2. nullタイトルでフォーム作成を試行（エラーになるはず）
    try {
      formManager.createForm(null);
      throw new Error('nullタイトルでフォーム作成が成功してしまいました');
    } catch (error) {
      if (error.message.includes('フォームタイトルは必須です')) {
        logInfo('nullタイトル検証テスト成功');
      } else {
        throw error;
      }
    }
    
    // 3. 正常なタイトルでフォーム作成
    const validTitle = `フィールド検証テスト - ${new Date().toISOString()}`;
    const form = formManager.createForm(validTitle);
    
    // 4. 必須フィールド追加テスト
    formManager.addRequiredFields(form);
    
    // 5. オプションフィールド追加テスト
    formManager.addOptionalFields(form);
    
    // 6. フォームの項目数を確認
    const items = form.getItems();
    const expectedItemCount = 6; // 必須4項目 + オプション2項目
    
    if (items.length !== expectedItemCount) {
      throw new Error(`期待される項目数: ${expectedItemCount}, 実際の項目数: ${items.length}`);
    }
    
    logInfo('フォームフィールド検証テスト成功', {
      formId: form.getId(),
      itemCount: items.length,
      items: items.map(item => ({
        title: item.getTitle(),
        type: item.getType().toString(),
        required: item.getType() !== FormApp.ItemType.PARAGRAPH_TEXT ? 
                 (item.asTextItem ? item.asTextItem().isRequired() : 
                  item.asDateTimeItem ? item.asDateTimeItem().isRequired() : false) : false
      }))
    });
    
    return form;
    
  } catch (error) {
    logError('フォームフィールド検証テスト失敗', error);
    throw error;
  }
}

