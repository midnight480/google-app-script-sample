// Google Form to Calendar Meet Notify
// FormSubmissionProcessor クラス

/**
 * FormSubmissionProcessor クラス
 * フォーム回答の処理を担当するメインコンポーネント
 * 要件 1.1, 1.2, 1.3, 1.4, 1.5 に対応
 */
class FormSubmissionProcessor {
  constructor(spreadsheet) {
    this.spreadsheet = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
    this.logger = createProcessingLogger(this.spreadsheet);
    this.eventCreator = null;
    this.backlogIssueCreator = createBacklogIssueCreator();
    
    // CalendarEventCreatorを初期化
    const properties = PropertiesService.getScriptProperties();
    const calendarId = properties.getProperty('SHARED_CALENDAR_ID');
    if (calendarId) {
      this.eventCreator = createCalendarEventCreator(calendarId);
    }
  }
  
  /**
   * フォーム送信を処理
   * 要件 1.1, 1.2, 1.3, 1.4, 1.5 に対応
   * @param {Object} e - FormSubmitEvent
   * @returns {Object} 処理結果
   */
  processSubmission(e) {
    const rowIndex = e.range.getRow();
    
    try {
      logInfo('フォーム送信処理開始', { rowIndex: rowIndex });
      
      // 1. 重複処理チェック（要件 4.1, 4.2）
      if (this.logger.isAlreadyProcessed(rowIndex)) {
        logInfo('既に処理済みのため、処理をスキップします', { rowIndex: rowIndex });
        return {
          success: true,
          skipped: true,
          message: '既に処理済みです'
        };
      }
      
      // 2. 処理開始をログに記録（要件 1.4）
      this.logger.logProcessingStart(rowIndex);
      
      // 3. Formの回答を取得
      const formResponse = e.response;
      if (!formResponse) {
        throw new Error('Form response is not available');
      }
      
      // 4. Formの項目を取得してFormSubmissionに変換
      const itemResponses = formResponse.getItemResponses();
      const formData = parseFormResponses(itemResponses);
      
      // 5. 古い形式から新しい形式に変換
      const formSubmission = createFormSubmission({
        registrantEmail: formData.organizerEmail,
        notifyEmails: formData.attendees ? formData.attendees.join(',') : '',
        startDateTime: formData.startTime,
        endDateTime: formData.endTime,
        title: formData.title,
        description: formData.description || ''
      });
      
      logInfo('Formデータ解析完了', {
        rowIndex: rowIndex,
        registrantEmail: formSubmission.registrantEmail,
        title: formSubmission.title
      });
      
      // 6. 入力検証（要件 1.1, 1.5）
      this.validateInput(formSubmission);
      
      // 7. 出席者リストを作成
      const attendees = createAttendeeList(formSubmission);
      
      // 8. EventDataを作成
      const eventData = createEventData(formSubmission, attendees);
      
      // 9. カレンダーイベントを作成（要件 1.2, 1.3）
      if (!this.eventCreator) {
        throw new Error('CalendarEventCreatorが初期化されていません');
      }
      
      const createdEvent = this.eventCreator.createEventWithMeet(eventData);
      
      if (!createdEvent || !createdEvent.id) {
        throw new Error('イベントの作成に失敗しました');
      }
      
      const eventId = createdEvent.id;
      const meetUrl = createdEvent.hangoutLink || null;
      
      logInfo('カレンダーイベント作成完了', {
        rowIndex: rowIndex,
        eventId: eventId,
        meetUrl: meetUrl
      });
      
      // 10. 処理成功をログに記録（要件 1.4）
      this.logger.logProcessingSuccess(rowIndex, eventId);
      
      // 11. Backlog課題を作成（登録者を担当者、お知らせしたい人を通知先に設定）
      try {
        // ユーザーIDが直接指定されている場合（チェックボックス/リストボックス方式）
        let assigneeUserId = formData.assigneeUserId;
        let notifiedUserIds = formData.notifiedUserIds || [];
        
        // 後方互換性: メールアドレス方式の場合、ユーザーIDを取得
        if (!assigneeUserId && formSubmission.registrantEmail) {
          assigneeUserId = this.backlogIssueCreator.getUserIdByEmail(formSubmission.registrantEmail);
          if (!assigneeUserId) {
            logWarning('登録者のBacklogユーザーIDが取得できませんでした。担当者なしで課題を作成します。', {
              email: formSubmission.registrantEmail
            });
          }
        }
        
        // 後方互換性: メールアドレス方式の場合、通知先ユーザーIDを取得
        if (notifiedUserIds.length === 0 && formSubmission.notifyEmails) {
          const notifyEmails = formSubmission.notifyEmails.split(',').map(e => e.trim()).filter(e => e);
          for (const email of notifyEmails) {
            const userId = this.backlogIssueCreator.getUserIdByEmail(email);
            if (userId) {
              notifiedUserIds.push(userId);
            }
          }
        }
        
        // 担当者を通知先から除外
        if (assigneeUserId) {
          notifiedUserIds = notifiedUserIds.filter(id => id !== assigneeUserId);
        }
        
        this.backlogIssueCreator.createIssue(
          eventData,
          assigneeUserId,
          notifiedUserIds,
          meetUrl
        );
        logInfo('Backlog課題作成完了', { 
          rowIndex: rowIndex,
          assigneeUserId: assigneeUserId,
          notifiedUserIds: notifiedUserIds
        });
      } catch (backlogError) {
        // Backlog課題作成のエラーは処理を中断しない
        logError('Backlog課題作成エラー（処理は継続）', backlogError);
      }
      
      logInfo('フォーム送信処理完了', {
        rowIndex: rowIndex,
        eventId: eventId
      });
      
      return {
        success: true,
        eventId: eventId,
        meetUrl: meetUrl,
        rowIndex: rowIndex
      };
      
    } catch (error) {
      // エラーをログに記録（要件 1.4, 4.4）
      this.logger.logProcessingError(rowIndex, error);
      
      logError('フォーム送信処理エラー', {
        rowIndex: rowIndex,
        error: error.toString()
      });
      
      // エラーを再スロー（要件 1.5）
      throw error;
    }
  }
  
  /**
   * 入力検証
   * 要件 1.1, 1.5 に対応
   * @param {Object} submission - FormSubmission
   * @returns {boolean} 検証成功時true
   */
  validateInput(submission) {
    try {
      validateFormSubmission(submission);
      return true;
    } catch (error) {
      // 検証失敗時はエラーを再スロー（要件 1.5）
      logError('入力検証失敗', { submission: submission, error: error.toString() });
      throw error;
    }
  }
  
  /**
   * 重複処理チェック
   * 要件 4.1, 4.2 に対応
   * @param {number} rowIndex - 行番号
   * @returns {boolean} 既に処理済みの場合true
   */
  checkDuplicateProcessing(rowIndex) {
    return this.logger.isAlreadyProcessed(rowIndex);
  }
}

// FormSubmissionProcessorのインスタンスを作成するヘルパー関数
function createFormSubmissionProcessor(spreadsheet) {
  return new FormSubmissionProcessor(spreadsheet);
}

