// Google Form to Calendar Meet Notify
// CalendarEventCreator クラス

/**
 * CalendarEventCreator クラス
 * Google Calendar APIを使用してイベントを作成
 * 要件 1.2, 1.3, 2.5, 6.2, 6.3 に対応
 */
class CalendarEventCreator {
  constructor(calendarId) {
    const properties = PropertiesService.getScriptProperties();
    this.calendarId = calendarId || properties.getProperty('SHARED_CALENDAR_ID');
    
    if (!this.calendarId) {
      throw new Error('SHARED_CALENDAR_IDがスクリプトプロパティに設定されていません');
    }
  }
  
  /**
   * カレンダー権限を検証
   * 要件 6.4 に対応
   * @param {string} calendarId - カレンダーID（オプション）
   * @returns {boolean} 権限がある場合true
   */
  validateCalendarPermissions(calendarId = null) {
    try {
      const targetCalendarId = calendarId || this.calendarId;
      const calendar = CalendarApp.getCalendarById(targetCalendarId);
      
      if (!calendar) {
        logError('カレンダーが見つかりません', { calendarId: targetCalendarId });
        return false;
      }
      
      // カレンダーへのアクセス権限を確認
      try {
        calendar.getEvents(new Date(), new Date(Date.now() + 86400000)); // 明日までのイベントを取得
        logInfo('カレンダー権限検証成功', { calendarId: targetCalendarId });
        return true;
      } catch (error) {
        logError('カレンダー権限がありません', { calendarId: targetCalendarId, error: error.toString() });
        return false;
      }
    } catch (error) {
      logError('カレンダー権限検証エラー', error);
      return false;
    }
  }
  
  /**
   * Meet URLを生成（一意のリクエストIDを使用）
   * 要件 6.3 に対応
   * @param {string} requestId - 一意のリクエストID（オプション）
   * @returns {string} 生成されたリクエストID
   */
  generateRequestId(requestId = null) {
    return requestId || Utilities.getUuid();
  }
  
  /**
   * Meet URLを含むイベントを作成
   * 要件 1.2, 1.3, 2.5, 6.2, 6.3 に対応
   * @param {Object} eventData - イベントデータ（EventData形式）
   * @returns {Object} 作成されたイベント（Calendar API形式）
   */
  createEventWithMeet(eventData) {
    try {
      // カレンダー権限を検証
      if (!this.validateCalendarPermissions()) {
        throw new Error('カレンダーへのアクセス権限がありません');
      }
      
      // 一意のリクエストIDを生成
      const requestId = this.generateRequestId(eventData.conferenceData?.createRequest?.requestId);
      
      // conferenceDataを設定（外部アクセス可能に設定）
      const eventResource = {
        summary: eventData.summary,
        description: eventData.description || '',
        start: eventData.start,
        end: eventData.end,
        attendees: eventData.attendees || [],
        conferenceData: {
          createRequest: {
            requestId: requestId,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        },
        // 外部アクセスを許可する設定
        guestsCanModify: true,
        guestsCanInviteOthers: true
      };
      
      logInfo('イベント作成開始', {
        calendarId: this.calendarId,
        summary: eventResource.summary,
        requestId: requestId
      });
      
      // Calendar APIを使用してイベントを作成
      const createdEvent = Calendar.Events.insert(eventResource, this.calendarId, {
        conferenceDataVersion: 1,
        sendUpdates: 'none' // 自動送信はしない（後でメール送信するため）
      });
      
      if (!createdEvent || !createdEvent.id) {
        throw new Error('イベントの作成に失敗しました');
      }
      
      // Meet URLを取得
      const meetUrl = createdEvent.hangoutLink || null;
      
      logInfo('イベント作成成功', {
        eventId: createdEvent.id,
        meetUrl: meetUrl,
        requestId: requestId
      });
      
      return createdEvent;
      
    } catch (error) {
      logError('イベント作成エラー', error);
      throw error;
    }
  }
  
  /**
   * 既存のイベントにMeet URLを追加
   * 要件 1.3, 6.2 に対応
   * @param {string} eventId - イベントID
   * @returns {string} Meet URL
   */
  addMeetUrlToEvent(eventId) {
    try {
      // 一意のリクエストIDを生成
      const requestId = this.generateRequestId();
      
      const resource = {
        conferenceData: {
          createRequest: {
            requestId: requestId,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      };
      
      const updatedEvent = Calendar.Events.patch(resource, this.calendarId, eventId, {
        conferenceDataVersion: 1
      });
      
      if (updatedEvent && updatedEvent.hangoutLink) {
        logInfo('Meet URL追加成功', {
          eventId: eventId,
          meetUrl: updatedEvent.hangoutLink,
          requestId: requestId
        });
        return updatedEvent.hangoutLink;
      }
      
      throw new Error('Meet URLの追加に失敗しました');
      
    } catch (error) {
      logError('Meet URL追加エラー', error);
      throw error;
    }
  }
}

// CalendarEventCreatorのインスタンスを作成するヘルパー関数
function createCalendarEventCreator(calendarId) {
  return new CalendarEventCreator(calendarId);
}

