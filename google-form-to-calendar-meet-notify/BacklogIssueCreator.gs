// Google Form to Calendar Meet Notify
// BacklogIssueCreator クラス

/**
 * BacklogIssueCreator クラス
 * Backlog APIを使用して課題を作成
 */
class BacklogIssueCreator {
  constructor() {
    const properties = PropertiesService.getScriptProperties();
    this.backlogSpaceUrl = properties.getProperty('BACKLOG_SPACE_URL');
    this.backlogApiKey = properties.getProperty('BACKLOG_API_KEY');
    this.backlogProjectKey = properties.getProperty('BACKLOG_PROJECT_KEY');
    this.timezone = properties.getProperty('TIMEZONE') || 'Asia/Tokyo';
    
    if (!this.backlogSpaceUrl || !this.backlogApiKey || !this.backlogProjectKey) {
      logWarning('Backlog設定が不完全です。課題作成はスキップされます。', {
        hasSpaceUrl: !!this.backlogSpaceUrl,
        hasApiKey: !!this.backlogApiKey,
        hasProjectKey: !!this.backlogProjectKey
      });
    }
  }
  
  /**
   * Backlog APIリクエストを送信
   * @param {string} endpoint - APIエンドポイント
   * @param {string} method - HTTPメソッド（GET, POST, PATCHなど）
   * @param {Object} payload - リクエストボディ（オプション）
   * @returns {Object} APIレスポンス
   */
  sendBacklogRequest(endpoint, method = 'GET', payload = null) {
    if (!this.backlogSpaceUrl || !this.backlogApiKey) {
      throw new Error('Backlog設定が不完全です');
    }
    
    const url = `${this.backlogSpaceUrl.replace(/\/$/, '')}/api/v2${endpoint}?apiKey=${this.backlogApiKey}`;
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };
    
    if (payload && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.payload = JSON.stringify(payload);
    }
    
    try {
      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      if (responseCode >= 200 && responseCode < 300) {
        return JSON.parse(responseText);
      } else {
        const errorData = JSON.parse(responseText);
        throw new Error(`Backlog API エラー (${responseCode}): ${errorData.errors ? JSON.stringify(errorData.errors) : responseText}`);
      }
    } catch (error) {
      logError('Backlog APIリクエストエラー', {
        endpoint: endpoint,
        method: method,
        error: error.toString()
      });
      throw error;
    }
  }
  
  /**
   * プロジェクトのユーザー一覧を取得
   * @returns {Array<Object>} ユーザー一覧（id, name, mailAddressを含む）
   */
  getProjectUsers() {
    try {
      if (!this.backlogSpaceUrl || !this.backlogApiKey || !this.backlogProjectKey) {
        throw new Error('Backlog設定が不完全です');
      }
      
      // プロジェクトのユーザー一覧を取得
      const users = this.sendBacklogRequest(`/projects/${this.backlogProjectKey}/users`, 'GET');
      
      if (Array.isArray(users)) {
        logInfo('Backlogプロジェクトユーザー一覧取得成功', {
          projectKey: this.backlogProjectKey,
          userCount: users.length
        });
        return users.map(user => ({
          id: user.id,
          name: user.name,
          mailAddress: user.mailAddress || '',
          userId: user.userId || ''
        }));
      }
      
      return [];
    } catch (error) {
      logError('Backlogプロジェクトユーザー一覧取得エラー', error);
      throw error;
    }
  }
  
  /**
   * メールアドレスからBacklogユーザーIDを取得（後方互換性のため残す）
   * @param {string} email - メールアドレス
   * @returns {number|null} BacklogユーザーID、見つからない場合はnull
   */
  getUserIdByEmail(email) {
    if (!email || !isValidEmail(email)) {
      return null;
    }
    
    try {
      // ユーザー一覧を取得してメールアドレスで検索
      const users = this.sendBacklogRequest('/users', 'GET');
      
      if (Array.isArray(users)) {
        const user = users.find(u => 
          u.mailAddress && u.mailAddress.toLowerCase() === email.toLowerCase()
        );
        
        if (user && user.id) {
          logInfo('BacklogユーザーID取得成功', {
            email: email,
            userId: user.id,
            userName: user.name
          });
          return user.id;
        }
      }
      
      logWarning('Backlogユーザーが見つかりませんでした', { email: email });
      return null;
    } catch (error) {
      logError('BacklogユーザーID取得エラー', {
        email: email,
        error: error.toString()
      });
      return null;
    }
  }
  
  /**
   * 日時をフォーマット
   * @param {Date} date - 日時オブジェクト
   * @returns {string} フォーマットされた日時文字列
   */
  formatDateTime(date) {
    if (!date) return '';
    
    try {
      return Utilities.formatDate(date, this.timezone, 'yyyy/MM/dd HH:mm');
    } catch (error) {
      logWarning('タイムゾーン処理でエラーが発生しました。デフォルトフォーマットを使用します', error);
      return date.toString();
    }
  }
  
  /**
   * 課題の説明文を作成
   * @param {Object} eventData - イベントデータ
   * @param {string} meetUrl - Meet URL（オプション）
   * @returns {string} 課題の説明文
   */
  buildIssueDescription(eventData, meetUrl = null) {
    let description = '';
    
    // イベント情報
    if (eventData.start && eventData.start.dateTime) {
      const startDate = new Date(eventData.start.dateTime);
      description += `**開始時刻**: ${this.formatDateTime(startDate)}\n\n`;
    }
    
    if (eventData.end && eventData.end.dateTime) {
      const endDate = new Date(eventData.end.dateTime);
      description += `**終了時刻**: ${this.formatDateTime(endDate)}\n\n`;
    }
    
    // Meet URL
    if (meetUrl) {
      description += `**Google Meet URL**: ${meetUrl}\n\n`;
    }
    
    // イベント説明
    if (eventData.description && eventData.description.trim() !== '') {
      description += `**説明**:\n${eventData.description}\n\n`;
    }
    
    return description.trim();
  }
  
  /**
   * Backlog課題を作成
   * @param {Object} eventData - イベントデータ
   * @param {number} assigneeUserId - 担当者のユーザーID（必須）
   * @param {Array<number>} notifiedUserIds - 通知先ユーザーIDリスト
   * @param {string} meetUrl - Meet URL（オプション）
   * @returns {Object} 作成された課題
   */
  createIssue(eventData, assigneeUserId, notifiedUserIds = [], meetUrl = null) {
    try {
      if (!this.backlogSpaceUrl || !this.backlogApiKey || !this.backlogProjectKey) {
        throw new Error('Backlog設定が不完全です。スクリプトプロパティを確認してください。');
      }
      
      if (!assigneeUserId) {
        logWarning('担当者ユーザーIDが指定されていません。担当者なしで課題を作成します。');
      }
      
      // 課題の説明文を作成
      const description = this.buildIssueDescription(eventData, meetUrl);
      
      // 課題作成リクエスト
      const issuePayload = {
        projectId: null, // projectKeyを使用する場合は不要
        summary: eventData.summary || '（タイトルなし）',
        description: description,
        issueTypeId: null, // デフォルトの課題タイプを使用（必要に応じて設定）
        priorityId: 3, // 中（必要に応じて変更）
        assigneeId: assigneeUserId || null
      };
      
      // プロジェクトキーを使用して課題を作成
      const endpoint = `/issues?projectKey=${this.backlogProjectKey}`;
      
      logInfo('Backlog課題作成開始', {
        projectKey: this.backlogProjectKey,
        summary: issuePayload.summary,
        assigneeId: assigneeUserId,
        notifiedUserIds: notifiedUserIds
      });
      
      const createdIssue = this.sendBacklogRequest(endpoint, 'POST', issuePayload);
      
      if (!createdIssue || !createdIssue.issueKey) {
        throw new Error('課題の作成に失敗しました');
      }
      
      // 通知先ユーザーにコメントで通知（課題作成後にコメントを追加）
      if (notifiedUserIds.length > 0) {
        try {
          const commentContent = `@${notifiedUserIds.map(id => `user:${id}`).join(' @')} この課題に関連するカレンダーイベントが作成されました。`;
          this.sendBacklogRequest(`/issues/${createdIssue.issueKey}/comments`, 'POST', {
            content: commentContent
          });
          logInfo('Backlogコメント追加完了', {
            issueKey: createdIssue.issueKey,
            notifiedUserCount: notifiedUserIds.length
          });
        } catch (commentError) {
          logWarning('Backlogコメント追加エラー（課題は作成済み）', commentError);
        }
      }
      
      logInfo('Backlog課題作成成功', {
        issueKey: createdIssue.issueKey,
        issueId: createdIssue.id,
        assigneeId: assigneeUserId
      });
      
      return createdIssue;
      
    } catch (error) {
      logError('Backlog課題作成エラー', error);
      throw error;
    }
  }
}

// BacklogIssueCreatorのインスタンスを作成するヘルパー関数
function createBacklogIssueCreator() {
  return new BacklogIssueCreator();
}

