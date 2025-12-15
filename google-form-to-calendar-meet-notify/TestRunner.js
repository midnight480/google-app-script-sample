// テスト実行用のランナー
// Google Apps Script環境でプロパティテストを実行

// プロパティテスト実行関数
function executePropertyTest1() {
  try {
    logInfo('プロパティテスト1実行開始: 包括的入力検証');
    
    // **Feature: google-form-to-calendar-with-meet, Property 1: 包括的入力検証**
    // **検証対象: 要件 1.1, 5.2, 5.5**
    
    const validResult = testProperty1_ComprehensiveInputValidation();
    const invalidResult = testProperty1_InvalidInputValidation();
    
    const overallSuccess = validResult.success && invalidResult.success;
    
    if (overallSuccess) {
      logInfo('プロパティテスト1成功', { 
        validResult: validResult, 
        invalidResult: invalidResult 
      });
      return { success: true, validResult: validResult, invalidResult: invalidResult };
    } else {
      logError('プロパティテスト1失敗', { 
        validResult: validResult, 
        invalidResult: invalidResult 
      });
      
      const failingExample = !validResult.success ? validResult.failures[0] : invalidResult.failures[0];
      return { 
        success: false, 
        validResult: validResult, 
        invalidResult: invalidResult,
        failingExample: failingExample 
      };
    }
    
  } catch (error) {
    logError('プロパティテスト1実行エラー', error);
    return { 
      success: false, 
      error: error.toString(),
      failingExample: `テスト実行中にエラーが発生: ${error.message}`
    };
  }
}

// 無効入力検証テスト実行
function executeInvalidInputTest() {
  try {
    logInfo('無効入力検証テスト実行開始');
    
    const result = testProperty1_InvalidInputValidation();
    
    if (result.success) {
      logInfo('無効入力検証テスト成功', result);
      return { success: true, result: result };
    } else {
      logError('無効入力検証テスト失敗', result);
      return { success: false, result: result, failingExample: result.failures[0] };
    }
    
  } catch (error) {
    logError('無効入力検証テスト実行エラー', error);
    return { 
      success: false, 
      error: error.toString(),
      failingExample: `テスト実行中にエラーが発生: ${error.message}`
    };
  }
}

// 手動テスト実行用関数
function runManualPropertyTest() {
  try {
    logInfo('手動プロパティテスト実行開始');
    
    // 1つのテストケースを手動で実行
    const dateRange = Generators.randomDateRange();
    const formData = {
      organizerEmail: Generators.randomEmail(),
      startTime: dateRange.start,
      endTime: dateRange.end,
      title: Generators.randomString(20),
      description: Generators.randomString(100),
      attendees: Generators.randomEmailList(3)
    };
    
    logInfo('生成されたテストデータ', formData);
    
    // 検証を実行
    validateFormData(formData);
    
    logInfo('手動プロパティテスト成功 - 有効なデータが正しく検証された');
    
    // 無効なデータのテスト
    const invalidData = {
      organizerEmail: '', // 無効なメール
      startTime: dateRange.start,
      endTime: dateRange.end,
      title: 'test'
    };
    
    try {
      validateFormData(invalidData);
      logError('手動プロパティテスト失敗 - 無効なデータが検証を通過した');
      return false;
    } catch (error) {
      logInfo('手動プロパティテスト成功 - 無効なデータが正しく拒否された', { error: error.message });
      return true;
    }
    
  } catch (error) {
    logError('手動プロパティテスト実行エラー', error);
    return false;
  }
}

// 簡単なテスト実行関数（Google Apps Script環境用）
function runSimplePropertyTest1() {
  try {
    logInfo('簡単なプロパティテスト1実行開始');
    
    // 有効なデータのテスト
    const dateRange = Generators.randomDateRange();
    const validSubmission = createFormSubmission({
      registrantEmail: Generators.randomEmail(),
      startDateTime: dateRange.start,
      endDateTime: dateRange.end,
      title: Generators.randomString(20),
      description: Generators.randomString(100),
      notifyEmails: Generators.randomEmailList(3).join(',')
    });
    
    // 有効なデータの検証
    validateFormSubmission(validSubmission);
    const attendees = createAttendeeList(validSubmission);
    
    if (!attendees.includes(validSubmission.registrantEmail)) {
      throw new Error('出席者リストに登録者メールが含まれていません');
    }
    
    logInfo('有効データテスト成功');
    
    // 無効なデータのテスト
    const invalidSubmission = createFormSubmission({
      registrantEmail: '', // 無効なメール
      startDateTime: dateRange.start,
      endDateTime: dateRange.end,
      title: 'test'
    });
    
    try {
      validateFormSubmission(invalidSubmission);
      throw new Error('無効なデータが検証を通過しました');
    } catch (error) {
      if (error.message.includes('無効なデータが検証を通過しました')) {
        throw error;
      }
      // 期待されるエラー
      logInfo('無効データテスト成功: ' + error.message);
    }
    
    logInfo('プロパティテスト1成功');
    return { success: true };
    
  } catch (error) {
    logError('プロパティテスト1失敗', error);
    return { success: false, error: error.toString() };
  }
}
// プロパティテスト10実行関数
function executePropertyTest10() {
  try {
    logInfo('プロパティテスト10実行開始: 日時解析柔軟性');
    
    // **Feature: google-form-to-calendar-with-meet, Property 10: 日時解析柔軟性**
    // **検証対象: 要件 5.4**
    
    const flexibilityResult = testProperty10_DateTimeParsingFlexibility();
    const invalidResult = testProperty10_InvalidDateTimeHandling();
    
    const overallSuccess = flexibilityResult.success && invalidResult.success;
    
    if (overallSuccess) {
      logInfo('プロパティテスト10成功', { 
        flexibilityResult: flexibilityResult, 
        invalidResult: invalidResult 
      });
      return { success: true, flexibilityResult: flexibilityResult, invalidResult: invalidResult };
    } else {
      logError('プロパティテスト10失敗', { 
        flexibilityResult: flexibilityResult, 
        invalidResult: invalidResult 
      });
      
      const failingExample = !flexibilityResult.success ? flexibilityResult.failures[0] : invalidResult.failures[0];
      return { 
        success: false, 
        flexibilityResult: flexibilityResult, 
        invalidResult: invalidResult,
        failingExample: failingExample 
      };
    }
    
  } catch (error) {
    logError('プロパティテスト10実行エラー', error);
    return { 
      success: false, 
      error: error.toString(),
      failingExample: `テスト実行中にエラーが発生: ${error.message}`
    };
  }
}

// 簡単な日時解析テスト
function runSimplePropertyTest10() {
  try {
    logInfo('簡単なプロパティテスト10実行開始');
    
    // 有効な日時形式のテスト
    const testFormats = [
      '2025-01-15 10:30:00',
      '2025/01/15 10:30',
      '2025年1月15日 10時30分',
      new Date()
    ];
    
    for (const format of testFormats) {
      const parsed = parseDateTime(format);
      
      if (!(parsed instanceof Date) || isNaN(parsed.getTime())) {
        throw new Error(`有効な形式で解析が失敗: ${format}`);
      }
      
      logInfo(`日時解析成功: ${format} -> ${parsed.toISOString()}`);
    }
    
    // 無効な日時形式のテスト
    const invalidFormats = [null, '', '無効な日時'];
    
    for (const format of invalidFormats) {
      try {
        parseDateTime(format);
        throw new Error(`無効な形式で解析が成功: ${format}`);
      } catch (error) {
        if (error.message.includes('無効な形式で解析が成功')) {
          throw error;
        }
        // 期待されるエラー
        logInfo(`無効日時処理成功: ${format} -> ${error.message}`);
      }
    }
    
    logInfo('プロパティテスト10成功');
    return { success: true };
    
  } catch (error) {
    logError('プロパティテスト10失敗', error);
    return { success: false, error: error.toString() };
  }
}
// プロパティテスト9実行関数
function executePropertyTest9() {
  try {
    logInfo('プロパティテスト9実行開始: オプションフィールド処理');
    
    // **Feature: google-form-to-calendar-with-meet, Property 9: オプションフィールド処理**
    // **検証対象: 要件 5.3**
    
    const processingResult = testProperty9_OptionalFieldProcessing();
    const boundaryResult = testProperty9_OptionalFieldBoundaryValues();
    
    const overallSuccess = processingResult.success && boundaryResult.success;
    
    if (overallSuccess) {
      logInfo('プロパティテスト9成功', { 
        processingResult: processingResult, 
        boundaryResult: boundaryResult 
      });
      return { success: true, processingResult: processingResult, boundaryResult: boundaryResult };
    } else {
      logError('プロパティテスト9失敗', { 
        processingResult: processingResult, 
        boundaryResult: boundaryResult 
      });
      
      const failingExample = !processingResult.success ? processingResult.failures[0] : boundaryResult.failures[0];
      return { 
        success: false, 
        processingResult: processingResult, 
        boundaryResult: boundaryResult,
        failingExample: failingExample 
      };
    }
    
  } catch (error) {
    logError('プロパティテスト9実行エラー', error);
    return { 
      success: false, 
      error: error.toString(),
      failingExample: `テスト実行中にエラーが発生: ${error.message}`
    };
  }
}

// 簡単なオプションフィールド処理テスト
function runSimplePropertyTest9() {
  try {
    logInfo('簡単なプロパティテスト9実行開始');
    
    // オプションフィールドありのテスト
    const dateRange = Generators.randomDateRange();
    const withOptionalFields = createFormSubmission({
      registrantEmail: Generators.randomEmail(),
      startDateTime: dateRange.start,
      endDateTime: dateRange.end,
      title: Generators.randomString(20),
      description: Generators.randomString(100),
      notifyEmails: Generators.randomEmailList(3).join(',')
    });
    
    // 検証とリスト作成
    validateFormSubmission(withOptionalFields);
    const attendeesWithOptional = createAttendeeList(withOptionalFields);
    
    if (!attendeesWithOptional.includes(withOptionalFields.registrantEmail)) {
      throw new Error('オプションフィールドありで登録者メールが含まれていません');
    }
    
    logInfo('オプションフィールドありテスト成功', {
      attendeeCount: attendeesWithOptional.length,
      description: withOptionalFields.description ? '説明あり' : '説明なし'
    });
    
    // オプションフィールドなしのテスト
    const withoutOptionalFields = createFormSubmission({
      registrantEmail: Generators.randomEmail(),
      startDateTime: dateRange.start,
      endDateTime: dateRange.end,
      title: Generators.randomString(20),
      description: '',
      notifyEmails: ''
    });
    
    // 検証とリスト作成
    validateFormSubmission(withoutOptionalFields);
    const attendeesWithoutOptional = createAttendeeList(withoutOptionalFields);
    
    if (!attendeesWithoutOptional.includes(withoutOptionalFields.registrantEmail)) {
      throw new Error('オプションフィールドなしで登録者メールが含まれていません');
    }
    
    if (attendeesWithoutOptional.length !== 1) {
      throw new Error(`オプションフィールドなしで出席者数が不正: ${attendeesWithoutOptional.length}`);
    }
    
    logInfo('オプションフィールドなしテスト成功', {
      attendeeCount: attendeesWithoutOptional.length
    });
    
    // 境界値テスト（空白のみ）
    const withWhitespaceFields = createFormSubmission({
      registrantEmail: Generators.randomEmail(),
      startDateTime: dateRange.start,
      endDateTime: dateRange.end,
      title: Generators.randomString(20),
      description: '   ',
      notifyEmails: '  ,  , '
    });
    
    // 検証とリスト作成
    validateFormSubmission(withWhitespaceFields);
    const attendeesWithWhitespace = createAttendeeList(withWhitespaceFields);
    
    if (!attendeesWithWhitespace.includes(withWhitespaceFields.registrantEmail)) {
      throw new Error('空白フィールドで登録者メールが含まれていません');
    }
    
    logInfo('空白フィールドテスト成功', {
      attendeeCount: attendeesWithWhitespace.length
    });
    
    logInfo('プロパティテスト9成功');
    return { success: true };
    
  } catch (error) {
    logError('プロパティテスト9失敗', error);
    return { success: false, error: error.toString() };
  }
}

// プロパティテスト3実行関数
function executePropertyTest3() {
  try {
    logInfo('プロパティテスト3実行開始: 出席者リスト処理');
    
    // **Feature: google-form-to-calendar-with-meet, Property 3: 出席者リスト処理**
    // **検証対象: 要件 2.1, 2.2, 2.3, 2.4**
    
    const processingResult = testProperty3_AttendeeListProcessing();
    const boundaryResult = testProperty3_AttendeeListBoundaryValues();
    
    const overallSuccess = processingResult.success && boundaryResult.success;
    
    if (overallSuccess) {
      logInfo('プロパティテスト3成功', { 
        processingResult: processingResult, 
        boundaryResult: boundaryResult 
      });
      return { success: true, processingResult: processingResult, boundaryResult: boundaryResult };
    } else {
      logError('プロパティテスト3失敗', { 
        processingResult: processingResult, 
        boundaryResult: boundaryResult 
      });
      
      const failingExample = !processingResult.success ? processingResult.failures[0] : boundaryResult.failures[0];
      return { 
        success: false, 
        processingResult: processingResult, 
        boundaryResult: boundaryResult,
        failingExample: failingExample 
      };
    }
    
  } catch (error) {
    logError('プロパティテスト3実行エラー', error);
    return { 
      success: false, 
      error: error.toString(),
      failingExample: `テスト実行中にエラーが発生: ${error.message}`
    };
  }
}

// 簡単な出席者リスト処理テスト
function runSimplePropertyTest3() {
  try {
    logInfo('簡単なプロパティテスト3実行開始');
    
    // 出席者リストありのテスト
    const dateRange = Generators.randomDateRange();
    const withAttendees = createFormSubmission({
      registrantEmail: Generators.randomEmail(),
      startDateTime: dateRange.start,
      endDateTime: dateRange.end,
      title: Generators.randomString(20),
      notifyEmails: Generators.randomEmailList(3).join(',')
    });
    
    // 検証とリスト作成
    validateFormSubmission(withAttendees);
    const attendeesWithNotify = createAttendeeList(withAttendees);
    
    if (!attendeesWithNotify.includes(withAttendees.registrantEmail)) {
      throw new Error('出席者リストに登録者メールが含まれていません');
    }
    
    if (attendeesWithNotify.length < 2) {
      throw new Error(`出席者リストの数が不正: ${attendeesWithNotify.length}`);
    }
    
    logInfo('出席者リストありテスト成功', {
      attendeeCount: attendeesWithNotify.length
    });
    
    // 出席者リストなしのテスト
    const withoutAttendees = createFormSubmission({
      registrantEmail: Generators.randomEmail(),
      startDateTime: dateRange.start,
      endDateTime: dateRange.end,
      title: Generators.randomString(20),
      notifyEmails: ''
    });
    
    // 検証とリスト作成
    validateFormSubmission(withoutAttendees);
    const attendeesWithoutNotify = createAttendeeList(withoutAttendees);
    
    if (!attendeesWithoutNotify.includes(withoutAttendees.registrantEmail)) {
      throw new Error('出席者リストなしで登録者メールが含まれていません');
    }
    
    if (attendeesWithoutNotify.length !== 1) {
      throw new Error(`出席者リストなしで出席者数が不正: ${attendeesWithoutNotify.length}`);
    }
    
    logInfo('出席者リストなしテスト成功', {
      attendeeCount: attendeesWithoutNotify.length
    });
    
    // 重複テスト
    const withDuplicates = createFormSubmission({
      registrantEmail: Generators.randomEmail(),
      startDateTime: dateRange.start,
      endDateTime: dateRange.end,
      title: Generators.randomString(20),
      notifyEmails: `${Generators.randomEmail()},${Generators.randomEmail()},${Generators.randomEmail()}`
    });
    
    // 重複を追加
    const duplicateEmail = withDuplicates.notifyEmails.split(',')[0];
    withDuplicates.notifyEmails = `${withDuplicates.notifyEmails},${duplicateEmail}`;
    
    validateFormSubmission(withDuplicates);
    const attendeesWithDuplicates = createAttendeeList(withDuplicates);
    
    // 重複が排除されていることを確認
    const uniqueAttendees = [...new Set(attendeesWithDuplicates.map(email => email.toLowerCase()))];
    if (attendeesWithDuplicates.length !== uniqueAttendees.length) {
      throw new Error(`重複が排除されていません: ${attendeesWithDuplicates.length} != ${uniqueAttendees.length}`);
    }
    
    logInfo('重複排除テスト成功', {
      attendeeCount: attendeesWithDuplicates.length
    });
    
    logInfo('プロパティテスト3成功');
    return { success: true };
    
  } catch (error) {
    logError('プロパティテスト3失敗', error);
    return { success: false, error: error.toString() };
  }
}

// FormManagerテスト実行関数
function runFormManagerTest() {
  try {
    logInfo('FormManagerテスト実行開始');
    
    // FormManagerのインスタンス作成テスト
    const formManager = createFormManager();
    
    if (!formManager) {
      throw new Error('FormManagerインスタンスの作成に失敗');
    }
    
    logInfo('FormManagerインスタンス作成成功');
    
    // 注意: 実際のフォーム作成はGoogle Apps Script環境でのみ動作するため、
    // ここでは基本的な関数の存在確認のみ行う
    
    const requiredMethods = [
      'createForm',
      'addRequiredFields', 
      'addOptionalFields',
      'linkToSpreadsheet',
      'configureFormSettings',
      'createCompleteForm'
    ];
    
    for (const method of requiredMethods) {
      if (typeof formManager[method] !== 'function') {
        throw new Error(`FormManagerに必要なメソッドが存在しません: ${method}`);
      }
    }
    
    logInfo('FormManagerメソッド確認成功', { methods: requiredMethods });
    
    logInfo('FormManagerテスト成功（構造確認のみ）');
    return { success: true, note: 'Google Apps Script環境でのみ完全なテストが可能' };
    
  } catch (error) {
    logError('FormManagerテスト失敗', error);
    return { success: false, error: error.toString() };
  }
}