// Google Form to Calendar Meet Notify
// バリデーション関数

/**
 * メールアドレスの形式検証
 * 要件 1.1, 5.2 に対応
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * 必須フィールドの存在確認
 * 要件 1.1, 5.2 に対応
 */
function validateRequiredFields(formSubmission) {
  const errors = [];
  
  // 登録者メールアドレス（必須）
  if (!formSubmission.registrantEmail || formSubmission.registrantEmail.trim() === '') {
    errors.push('登録者メールアドレスは必須です');
  } else if (!isValidEmail(formSubmission.registrantEmail)) {
    errors.push('登録者メールアドレスの形式が無効です');
  }
  
  // 開始日時（必須）
  if (!formSubmission.startDateTime) {
    errors.push('開始日時は必須です');
  } else if (!(formSubmission.startDateTime instanceof Date) || isNaN(formSubmission.startDateTime.getTime())) {
    errors.push('開始日時の形式が無効です');
  }
  
  // 終了日時（必須）
  if (!formSubmission.endDateTime) {
    errors.push('終了日時は必須です');
  } else if (!(formSubmission.endDateTime instanceof Date) || isNaN(formSubmission.endDateTime.getTime())) {
    errors.push('終了日時の形式が無効です');
  }
  
  // イベントタイトル（必須）
  if (!formSubmission.title || formSubmission.title.trim() === '') {
    errors.push('イベントタイトルは必須です');
  }
  
  return errors;
}

/**
 * 日時の妥当性検証
 * 要件 5.2 に対応
 */
function validateDateTimeLogic(formSubmission) {
  const errors = [];
  
  if (formSubmission.startDateTime && formSubmission.endDateTime) {
    // 終了日時が開始日時より後であることを確認
    if (formSubmission.endDateTime <= formSubmission.startDateTime) {
      errors.push('終了日時は開始日時より後である必要があります');
    }
    
    // 過去の日時でないことを確認（現在時刻より前でも警告のみ）
    const now = new Date();
    if (formSubmission.startDateTime < now) {
      logWarning('開始日時が過去の時刻です', {
        startDateTime: formSubmission.startDateTime.toISOString(),
        currentTime: now.toISOString()
      });
    }
  }
  
  return errors;
}

/**
 * 追加通知メールアドレスの検証と解析
 * 要件 2.2, 2.3 に対応
 */
function validateAndParseNotifyEmails(notifyEmailsString) {
  if (!notifyEmailsString || notifyEmailsString.trim() === '') {
    return [];
  }
  
  // カンマ区切りで分割
  const emailList = notifyEmailsString.split(',')
    .map(email => email.trim())
    .filter(email => email !== '');
  
  // 重複排除
  const uniqueEmails = [...new Set(emailList)];
  
  // メール形式検証
  const validEmails = uniqueEmails.filter(email => {
    if (!isValidEmail(email)) {
      logWarning('無効なメールアドレス形式をスキップしました', { email: email });
      return false;
    }
    return true;
  });
  
  // セキュリティチェック（最大数制限）
  const maxCount = 50;
  if (validEmails.length > maxCount) {
    logWarning(`メールアドレス数が制限を超えています（${validEmails.length} > ${maxCount}）。最初の${maxCount}件のみ使用します。`);
    return validEmails.slice(0, maxCount);
  }
  
  return validEmails;
}

/**
 * FormSubmission の包括的検証
 * 要件 1.1, 5.2, 5.5 に対応
 */
function validateFormSubmission(formSubmission) {
  if (!formSubmission) {
    throw new Error('フォームデータが提供されていません');
  }
  
  // 必須フィールドの検証
  const requiredFieldErrors = validateRequiredFields(formSubmission);
  
  // 日時ロジックの検証
  const dateTimeErrors = validateDateTimeLogic(formSubmission);
  
  // すべてのエラーを結合
  const allErrors = [...requiredFieldErrors, ...dateTimeErrors];
  
  if (allErrors.length > 0) {
    const errorMessage = 'フォームデータの検証に失敗しました: ' + allErrors.join(', ');
    throw new Error(errorMessage);
  }
  
  return true;
}

/**
 * 出席者リストの作成と検証
 * 要件 2.1, 2.2, 2.3, 2.4 に対応
 */
function createAttendeeList(formSubmission) {
  const attendees = [];
  
  // 登録者メールを追加
  if (formSubmission.registrantEmail && isValidEmail(formSubmission.registrantEmail)) {
    attendees.push(formSubmission.registrantEmail.trim());
  }
  
  // 追加通知メールを解析・追加
  const notifyEmails = validateAndParseNotifyEmails(formSubmission.notifyEmails);
  
  // 重複排除（登録者メールと追加通知メールの重複も含む）
  const allEmails = [...attendees, ...notifyEmails];
  const uniqueAttendees = [...new Set(allEmails.map(email => email.toLowerCase()))]
    .map(lowerEmail => allEmails.find(email => email.toLowerCase() === lowerEmail));
  
  return uniqueAttendees;
}

// 既存のvalidateFormData関数を新しい検証システムに更新
function validateFormData(formData) {
  // 既存のコードとの互換性のため、古い形式のデータを新しい形式に変換
  const formSubmission = createFormSubmission({
    registrantEmail: formData.organizerEmail,
    startDateTime: formData.startTime,
    endDateTime: formData.endTime,
    title: formData.title,
    description: formData.description,
    notifyEmails: formData.attendees ? formData.attendees.join(',') : ''
  });
  
  return validateFormSubmission(formSubmission);
}

