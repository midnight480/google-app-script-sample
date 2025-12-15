// Google Form to Calendar Meet Notify
// EmailNotificationSender クラス

/**
 * EmailNotificationSender クラス
 * カスタムメール通知の送信を担当
 * 要件 3.1, 3.2, 3.3, 3.4 に対応
 */
class EmailNotificationSender {
  constructor() {
    const properties = PropertiesService.getScriptProperties();
    this.timezone = properties.getProperty('TIMEZONE') || 'Asia/Tokyo';
    this.emailSubjectPrefix = properties.getProperty('EMAIL_SUBJECT_PREFIX') || '登録完了: ';
    this.sharedCalendarId = properties.getProperty('SHARED_CALENDAR_ID');
  }
  
  /**
   * 日時をフォーマット
   * 要件 3.4 に対応
   * @param {Date} date - 日時オブジェクト
   * @param {string} timezone - タイムゾーン（オプション）
   * @returns {string} フォーマットされた日時文字列
   */
  formatDateTime(date, timezone = null) {
    if (!date) return '';
    
    try {
      const targetTimezone = timezone || this.timezone;
      return Utilities.formatDate(date, targetTimezone, 'yyyy/MM/dd HH:mm');
    } catch (error) {
      logWarning('タイムゾーン処理でエラーが発生しました。デフォルトフォーマットを使用します', error);
      return date.toString();
    }
  }
  
  /**
   * メール本文を作成
   * 要件 3.2, 3.3 に対応
   * @param {Object} eventData - イベントデータ
   * @param {string} meetUrl - Meet URL（オプション）
   * @returns {string} メール本文
   */
  buildEmailBody(eventData, meetUrl = null) {
    let body = '';
    
    // イベントタイトル
    body += `イベントタイトル: ${eventData.summary || '（タイトルなし）'}\n\n`;
    
    // 開始時刻と終了時刻
    if (eventData.start && eventData.start.dateTime) {
      const startDate = new Date(eventData.start.dateTime);
      body += `開始時刻: ${this.formatDateTime(startDate)}\n`;
    }
    
    if (eventData.end && eventData.end.dateTime) {
      const endDate = new Date(eventData.end.dateTime);
      body += `終了時刻: ${this.formatDateTime(endDate)}\n`;
    }
    
    body += '\n';
    
    // Meet URL
    if (meetUrl) {
      body += '以下のURLからGoogle Meetにアクセスできます。\n';
      body += `${meetUrl}\n\n`;
    } else {
      body += 'Google Meet URLは現在利用できません。\n\n';
    }
    
    // イベント説明
    if (eventData.description && eventData.description.trim() !== '') {
      body += `説明:\n${eventData.description}\n\n`;
    }
    
    // カレンダーIDと追加手順（要件 3.3）
    if (this.sharedCalendarId) {
      body += 'カレンダー情報:\n';
      body += `カレンダーID: ${this.sharedCalendarId}\n`;
      body += 'このカレンダーをGoogleカレンダーアプリに追加するには、以下の手順を実行してください:\n';
      body += '1. Googleカレンダーアプリを開く\n';
      body += '2. 「他のカレンダー」→「URLで追加」を選択\n';
      body += `3. 以下のURLを入力: https://calendar.google.com/calendar?cid=${encodeURIComponent(this.sharedCalendarId)}\n\n`;
    }
    
    return body;
  }
  
  /**
   * メール通知を送信
   * 要件 3.1, 3.2, 3.3 に対応
   * @param {Object} eventData - イベントデータ
   * @param {Array<string>} attendees - 出席者メールアドレスリスト
   * @param {string} meetUrl - Meet URL（オプション）
   */
  sendNotification(eventData, attendees, meetUrl = null) {
    try {
      if (!attendees || attendees.length === 0) {
        logWarning('出席者リストが空のため、メール通知をスキップします');
        return;
      }
      
      // メールアドレスの重複を排除
      const uniqueAttendees = [...new Set(attendees.map(email => email.toLowerCase()))]
        .map(lowerEmail => attendees.find(email => email.toLowerCase() === lowerEmail));
      
      // 有効なメールアドレスのみをフィルタ
      const validAttendees = uniqueAttendees.filter(email => isValidEmail(email));
      
      if (validAttendees.length === 0) {
        logWarning('有効なメールアドレスがないため、メール通知をスキップします');
        return;
      }
      
      logInfo('メール送信開始', {
        recipientCount: validAttendees.length,
        recipients: validAttendees
      });
      
      // メール本文を作成
      const emailBody = this.buildEmailBody(eventData, meetUrl);
      
      // メール件名
      const subject = `${this.emailSubjectPrefix}${eventData.summary || 'イベント登録完了'}`;
      
      // メール送信
      MailApp.sendEmail({
        to: validAttendees.join(','),
        subject: subject,
        body: emailBody,
        htmlBody: emailBody.replace(/\n/g, '<br>')
      });
      
      logInfo('メール送信成功', {
        recipientCount: validAttendees.length
      });
      
    } catch (error) {
      logError('メール送信エラー', error);
      // メール送信のエラーは処理を中断しない（要件 3.5）
      throw error;
    }
  }
}

// EmailNotificationSenderのインスタンスを作成するヘルパー関数
function createEmailNotificationSender() {
  return new EmailNotificationSender();
}

