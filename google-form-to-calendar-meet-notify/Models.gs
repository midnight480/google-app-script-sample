// Google Form to Calendar Meet Notify
// データモデル定義

/**
 * FormSubmission インターフェース
 * Googleフォームから送信されたデータの構造
 */
function createFormSubmission(data) {
  return {
    registrantEmail: data.registrantEmail || '',        // 必須: 登録者メールアドレス
    notifyEmails: data.notifyEmails || '',              // オプション: 追加通知先（カンマ区切り）
    startDateTime: data.startDateTime || null,          // 必須: 開始日時
    endDateTime: data.endDateTime || null,              // 必須: 終了日時
    title: data.title || '',                            // 必須: イベントタイトル
    description: data.description || ''                 // オプション: イベント説明
  };
}

/**
 * EventData インターフェース
 * Google Calendar APIに送信するイベントデータの構造
 */
function createEventData(formSubmission, attendeeEmails) {
  return {
    summary: formSubmission.title,
    description: formSubmission.description,
    start: { 
      dateTime: formSubmission.startDateTime.toISOString() 
    },
    end: { 
      dateTime: formSubmission.endDateTime.toISOString() 
    },
    attendees: attendeeEmails.map(email => ({ email: email })),
    conferenceData: {
      createRequest: {
        requestId: Utilities.getUuid(),
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    }
  };
}

/**
 * ProcessingLogEntry インターフェース
 * 処理ログエントリの構造
 */
function createProcessingLogEntry(data) {
  return {
    rowIndex: data.rowIndex || 0,
    status: data.status || 'PROCESSING',  // 'PROCESSING' | 'SUCCESS' | 'ERROR'
    eventId: data.eventId || null,
    processedAt: data.processedAt || new Date(),
    errorMessage: data.errorMessage || null
  };
}

/**
 * EmailTemplate インターフェース
 * メールテンプレートの構造
 */
function createEmailTemplate(data) {
  return {
    subject: data.subject || '',
    body: data.body || '',
    includeCalendarInstructions: data.includeCalendarInstructions || false
  };
}

