// Google Form to Calendar Meet Notify
// 後方互換性のためのレガシー関数
// 注意: これらの関数は段階的に削除される予定です。新しいクラスベースの実装を使用してください。

/**
 * 日時をフォーマット（タイムゾーンを明示的に処理）
 * @deprecated EmailNotificationSender.formatDateTime()を使用してください
 */
function formatDateTime(date) {
  if (!date) return '';
  try {
    // スクリプトのタイムゾーンを使用してフォーマット
    const scriptTimeZone = Session.getScriptTimeZone();
    return Utilities.formatDate(date, scriptTimeZone, 'yyyy-MM-dd HH:mm');
  } catch (error) {
    // フォールバック: デフォルトのフォーマット
    logWarning('タイムゾーン処理でエラーが発生しました。デフォルトフォーマットを使用します', error);
    return date.toString();
  }
}

/**
 * Google Calendarに予定を登録
 * @deprecated CalendarEventCreator.createEventWithMeet()を使用してください
 */
function createCalendarEvent(formData) {
  const properties = PropertiesService.getScriptProperties();
  const calendarId = properties.getProperty('SHARED_CALENDAR_ID');
  if (!calendarId) {
    throw new Error('SHARED_CALENDAR_IDがスクリプトプロパティに設定されていません');
  }
  
  return executeWithRetry(() => {
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      throw new Error(`Calendar not found: ${calendarId}`);
    }
    
    // イベントを作成
    const event = calendar.createEvent(
      formData.title,
      formData.startTime,
      formData.endTime,
      {
        description: formData.description || '',
        guests: formData.attendees.join(','),
        sendInvites: false // 自動送信はしない（後でメール送信するため）
      }
    );
    
    // 主幹を参加者として追加
    event.addGuest(formData.organizerEmail, {
      sendInvites: false,
      optional: false
    });
    
    // 主幹を共同主催者として設定（Calendar APIを使用）
    // guestsCanModifyを有効にすることで、主幹が予定を編集でき、
    // 録画・文字起こしの操作が可能になります（Google Workspace Enterprise）
    try {
      const eventId = event.getId().split('@')[0];
      const calendarService = Calendar.Events.get(calendarId, eventId);
      
      // 参加者リストを更新
      const attendees = calendarService.attendees || [];
      const organizerIndex = attendees.findIndex(a => a.email === formData.organizerEmail);
      
      // 主幹を参加者として追加/更新
      const organizerAttendee = {
        email: formData.organizerEmail,
        responseStatus: 'accepted',
        optional: false
      };
      
      if (organizerIndex >= 0) {
        attendees[organizerIndex] = organizerAttendee;
      } else {
        attendees.push(organizerAttendee);
      }
      
      // イベントを更新（guestsCanModifyを有効化して録画・文字起こし権限を付与）
      const resource = {
        attendees: attendees,
        guestsCanModify: true
      };
      const updatedEvent = Calendar.Events.patch(resource, calendarId, eventId);
      
      // 更新結果をログ出力
      if (updatedEvent && updatedEvent.id) {
        logInfo('主幹の参加者設定が完了しました', { eventId: updatedEvent.id });
      } else {
        logWarning('主幹の参加者設定の結果が不明です', { updatedEvent: updatedEvent });
      }
    } catch (error) {
      // 参加者設定は補助的な機能のため、失敗してもイベント作成は成功している
      // 警告として記録するが、処理は継続する（エラーを再スローしない）
      logWarning('主幹の参加者設定に失敗しましたが、イベントは作成されました', error);
    }
    
    return event;
  }, 'Calendar予定登録');
}

/**
 * Google MeetのURLを取得
 * @deprecated CalendarEventCreator.addMeetUrlToEvent()を使用してください
 */
function getMeetUrlFromEvent(event) {
  const properties = PropertiesService.getScriptProperties();
  const calendarId = properties.getProperty('SHARED_CALENDAR_ID');
  if (!calendarId) {
    throw new Error('SHARED_CALENDAR_IDがスクリプトプロパティに設定されていません');
  }
  
  return executeWithRetry(() => {
    // イベントを再取得してMeet URLを確認
    const eventId = event.getId().split('@')[0];
    
    const calendarEvent = Calendar.Events.get(calendarId, eventId);
    
    // Meet URLを取得
    if (calendarEvent.hangoutLink) {
      return calendarEvent.hangoutLink;
    }
    
    // Meet URLが存在しない場合は、Meetを追加
    const resource = {
      conferenceData: {
        createRequest: {
          requestId: Utilities.getUuid(),
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };
    const updatedEvent = Calendar.Events.patch(resource, calendarId, eventId, {
      conferenceDataVersion: 1
    });
    
    // 更新結果をログ出力
    if (updatedEvent && updatedEvent.hangoutLink) {
      logInfo('Google Meet URL生成成功', { meetUrl: updatedEvent.hangoutLink });
      return updatedEvent.hangoutLink;
    }
    
    logError('Google Meet URL生成失敗', { updatedEvent: updatedEvent });
    throw new Error('Google Meet URL could not be created');
  }, 'Google Meet URL取得');
}

/**
 * メール通知を送信
 * @deprecated EmailNotificationSender.sendNotification()を使用してください
 */
function sendNotificationEmail(formData, meetUrl) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const testEmailAddress = properties.getProperty('TEST_EMAIL_ADDRESS') || 'YOUR_TEST_EMAIL_ADDRESS_HERE';
    
    // 宛先を設定（主幹 + 参加者 + テスト用メールアドレス）
    const recipients = [formData.organizerEmail];
    
    // 参加者を追加（主幹と重複しないように）
    if (formData.attendees && formData.attendees.length > 0) {
      const uniqueAttendees = formData.attendees.filter(email => 
        email.toLowerCase() !== formData.organizerEmail.toLowerCase()
      );
      recipients.push(...uniqueAttendees);
    }
    
    // テスト用メールアドレスを追加（設定されている場合、重複チェック）
    if (testEmailAddress && 
        testEmailAddress !== 'YOUR_TEST_EMAIL_ADDRESS_HERE' &&
        isValidEmail(testEmailAddress)) {
      const testEmailLower = testEmailAddress.toLowerCase();
      const isDuplicate = recipients.some(email => email.toLowerCase() === testEmailLower);
      if (!isDuplicate) {
        recipients.push(testEmailAddress);
      }
    }
    
    // 最終的な重複除去（より効率的な実装）
    const seen = new Set();
    const uniqueRecipients = recipients.filter(email => {
      const lower = email.toLowerCase();
      if (seen.has(lower)) {
        return false;
      }
      seen.add(lower);
      return true;
    });
    
    logInfo('メール送信先', { 
      recipientCount: uniqueRecipients.length,
      recipients: uniqueRecipients 
    });
    
    // メール本文を作成
    const emailBody = createEmailBody(formData, meetUrl);
    
    // メール送信
    MailApp.sendEmail({
      to: uniqueRecipients.join(','),
      subject: formData.title,
      body: emailBody,
      htmlBody: emailBody.replace(/\n/g, '<br>')
    });
    
    logInfo('メール送信成功', { recipientCount: uniqueRecipients.length });
  } catch (error) {
    logError('メール送信エラー', error);
    throw error;
  }
}

/**
 * メール本文を作成
 * @deprecated EmailNotificationSender.buildEmailBody()を使用してください
 */
function createEmailBody(formData, meetUrl) {
  let body = '以下のURLからGoogle Meetにアクセスできます。\n';
  body += `${meetUrl}\n\n`;
  body += 'その他の情報:\n';
  body += `件名: ${formData.title}\n`;
  body += `開始日時: ${formatDateTime(formData.startTime)}\n`;
  body += `終了日時: ${formatDateTime(formData.endTime)}\n`;
  
  if (formData.description && formData.description.trim() !== '') {
    body += `本文: ${formData.description}\n`;
  }
  
  if (formData.attendees && formData.attendees.length > 0) {
    body += `参加者: ${formData.attendees.join(', ')}\n`;
  }
  
  return body;
}

/**
 * 日時解析の柔軟性テスト用関数
 * 要件 5.4 の検証用
 */
function testDateTimeParsing() {
  const testCases = [
    '2025-01-15 10:30:00',
    '2025/01/15 10:30:00',
    '2025年1月15日 10時30分',
    '2025年1月15日 10:30',
    '2025-1-15 10:30',
    '2025/1/15 10:30',
    new Date(),
    '2025-01-15T10:30:00Z'
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    try {
      const parsed = parseDateTime(testCase);
      results.push({
        input: testCase,
        success: true,
        output: parsed.toISOString(),
        type: typeof testCase
      });
    } catch (error) {
      results.push({
        input: testCase,
        success: false,
        error: error.message,
        type: typeof testCase
      });
    }
  }
  
  logInfo('日時解析テスト結果', results);
  return results;
}

