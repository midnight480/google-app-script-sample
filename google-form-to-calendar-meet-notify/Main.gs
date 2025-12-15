// Google Form to Calendar Meet Notify
// メインエントリーポイント

/**
 * Google Formの送信をトリガーに実行される関数
 * 要件 1.1, 1.2, 1.3, 1.4, 1.5 に対応
 * @param {Object} e - FormSubmitEvent
 */
function onFormSubmit(e) {
  try {
    logInfo('Google Form送信受信');
    
    // FormSubmissionProcessorを使用して処理
    const processor = createFormSubmissionProcessor();
    const result = processor.processSubmission(e);
    
    logInfo('Google Form to Calendar Meet Notify処理完了', result);
    
    return result;
    
  } catch (error) {
    logError('Google Form to Calendar Meet Notify処理エラー', error);
    // エラーは再スローしない（Google Apps Scriptのトリガーではエラーを再スローすると問題が発生する可能性がある）
    // エラーログは既に記録されている
  }
}

/**
 * Formの回答を解析
 * @param {Array} itemResponses - Formの項目回答リスト
 * @returns {Object} 解析されたフォームデータ
 */
function parseFormResponses(itemResponses) {
  const formData = {
    organizerEmail: '',
    assigneeUserId: null,  // BacklogユーザーID
    startTime: null,
    endTime: null,
    title: '',
    description: '',
    attendees: [],
    notifiedUserIds: []  // BacklogユーザーIDリスト
  };
  
  for (let i = 0; i < itemResponses.length; i++) {
    const itemResponse = itemResponses[i];
    const item = itemResponse.getItem();
    const title = item.getTitle();
    const response = itemResponse.getResponse();
    const itemType = item.getType();
    
    logInfo('Form項目解析', { title: title, response: response, itemType: itemType.toString() });
    
    // 項目タイトルに基づいてデータを解析
    if (title.includes('メールアドレス') || title.includes('主幹') || (title.includes('登録者') && !title.includes('担当者'))) {
      // 後方互換性のため、メールアドレス入力もサポート
      formData.organizerEmail = response;
    } else if (title.includes('登録者') && title.includes('担当者')) {
      // BacklogユーザーID（リストボックスから選択）
      // 値の形式: "ユーザー名|ユーザーID"
      if (response) {
        const parts = response.split('|');
        const userId = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : parseInt(response, 10);
        if (!isNaN(userId)) {
          formData.assigneeUserId = userId;
          logInfo('担当者ユーザーID取得', { userId: userId, response: response });
        }
      }
    } else if ((title.includes('開始') && title.includes('日時')) || 
               (title.includes('開始日時')) || 
               (title.includes('開始時刻'))) {
      // 開始日時を解析
      formData.startTime = parseDateTime(response);
    } else if ((title.includes('終了') && title.includes('日時')) || 
               (title.includes('終了日時')) || 
               (title.includes('終了時刻'))) {
      // 終了日時を解析
      formData.endTime = parseDateTime(response);
    } else if (title.includes('件名') || title.includes('タイトル')) {
      formData.title = response;
    } else if (title.includes('本文') || title.includes('説明')) {
      formData.description = response;
    } else if (title.includes('参加者') || title.includes('お知らせしたい人')) {
      // チェックボックスの場合（複数選択）
      if (itemType === FormApp.ItemType.CHECKBOX) {
        // チェックボックスの選択値は配列
        // 値の形式: "ユーザー名|ユーザーID"
        if (Array.isArray(response)) {
          const userIds = response.map(r => {
            const parts = r.split('|');
            return parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : parseInt(r, 10);
          }).filter(id => !isNaN(id));
          formData.notifiedUserIds = userIds;
          logInfo('通知先ユーザーID取得', { userIds: userIds, responses: response });
        } else if (response) {
          // 単一選択の場合
          const parts = response.split('|');
          const userId = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : parseInt(response, 10);
          if (!isNaN(userId)) {
            formData.notifiedUserIds = [userId];
          }
        }
      } else {
        // 後方互換性のため、カンマ区切りのメールアドレスもサポート
        if (response && response.trim() !== '') {
          const emailList = response.split(',').map(email => email.trim()).filter(email => isValidEmail(email));
          formData.attendees = validateEmailList(emailList);
        }
      }
    }
  }
  
  return formData;
}

