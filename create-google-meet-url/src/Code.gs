/**
 * Google Meet URL作成とBacklog連携
 * 
 * 使用方法:
 * curl -X POST "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec" \
 *   -H "Content-Type: application/json" \
 *   -d '{"issueKey":"PROJECT-123","apiKey":"your_backlog_api_key"}'
 */

/**
 * Googleフォーム送信時のトリガー関数
 * @param {Object} e - イベントオブジェクト
 */
function onFormSubmit(e) {
  try {
    Logger.log('フォーム送信を受け取りました: ' + JSON.stringify(e));

    // スクリプトプロパティから設定を取得
    const props = PropertiesService.getScriptProperties();
    const apiKey = props.getProperty('BACKLOG_API_KEY');
    let spaceUrl = props.getProperty('BACKLOG_SPACE_URL');
    const sharedCalendarId = props.getProperty('SHARED_CALENDAR_ID');

    if (!apiKey || !spaceUrl) {
      Logger.log('エラー: Backlog設定（APIキーまたはスペースURL）が不足しています');
      return;
    }

    // スペースURLの正規化
    spaceUrl = spaceUrl.replace(/\/$/, '');

    // フォームの回答を取得（質問のタイトルに依存します）
    // 想定する質問: "会議タイトル", "開催日", "開始時刻", "終了時刻", "概要", "Backlog課題キー"
    const responses = e.namedValues;
    
    // 値の取得（配列で返ってくるため[0]を取得）
    const meetTitle = responses['会議タイトル'] ? responses['会議タイトル'][0] : 'Google Meet会議';
    const dateStr = responses['開催日'] ? responses['開催日'][0] : '';
    const startTimeStr = responses['開始時刻'] ? responses['開始時刻'][0] : '';
    const endTimeStr = responses['終了時刻'] ? responses['終了時刻'][0] : '';
    const description = responses['概要'] ? responses['概要'][0] : '';
    const issueKey = responses['Backlog課題キー'] ? responses['Backlog課題キー'][0] : '';

    if (!issueKey) {
      Logger.log('エラー: Backlog課題キーが指定されていません');
      return;
    }

    // 日時の結合とパース
    const startTime = parseDateTime(dateStr, startTimeStr);
    const endTime = parseDateTime(dateStr, endTimeStr);

    if (!startTime || !endTime) {
      Logger.log('エラー: 日時の形式が不正です');
      return;
    }

    // Google Meet URLの作成
    const meetUrl = createGoogleMeetUrl(meetTitle, description, startTime, endTime, sharedCalendarId);
    
    if (meetUrl) {
      Logger.log('Google Meet URL作成成功: ' + meetUrl);
      
      // Backlogにコメントのみ投稿（ステータス更新などは行わない）
      const commentResult = addBacklogComment(issueKey, apiKey, spaceUrl, meetUrl, meetTitle, startTime, endTime);
      
      if (commentResult.success) {
        Logger.log('Backlogコメント投稿成功');
      } else {
        Logger.log('Backlogコメント投稿失敗: ' + commentResult.error);
      }
    } else {
      Logger.log('Google Meet URL作成失敗');
    }

  } catch (error) {
    Logger.log('予期しないエラーが発生しました: ' + error.message);
  }
}

/**
 * 日付と時刻の文字列からDateオブジェクトを作成
 */
function parseDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  // dateStr: YYYY-MM-DD or YYYY/MM/DD, timeStr: HH:MM
  try {
    const d = new Date(dateStr.replace(/-/g, '/') + ' ' + timeStr);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch (e) {
    return null;
  }
}

/**
 * Webアプリのエントリーポイント
 * @param {Object} e - リクエストパラメータ
 * @return {Object} レスポンス
 */
function doPost(e) {
  try {
    // パラメータの取得とチェック
    const params = getParameters(e);
    if (!params.valid) {
      return createErrorResponse(params.error, 400);
    }

    const { issueKey, apiKey, spaceUrl } = params;

    // Backlogのアクセス確認と課題の存在確認
    const backlogCheck = checkBacklogIssue(issueKey, apiKey, spaceUrl);
    if (!backlogCheck.valid) {
      return createErrorResponse(backlogCheck.error, backlogCheck.statusCode || 400);
    }

    // Google Meet URLの作成（デフォルトの日時を使用）
    const meetUrl = createGoogleMeetUrl('Google Meet会議', '', null, null);
    if (!meetUrl) {
      return createErrorResponse('Google Meet URLの作成に失敗しました', 500);
    }

    // Backlogの課題にコメントを追加
    const commentResult = addBacklogComment(issueKey, apiKey, spaceUrl, meetUrl, 'Google Meet会議', null, null);
    if (!commentResult.success) {
      return createErrorResponse(
        `Backlogコメントの追加に失敗しました: ${commentResult.error}`,
        500
      );
    }

    // 成功レスポンス
    return createSuccessResponse({
      meetUrl: meetUrl,
      issueKey: issueKey,
      message: 'Google Meet URLを作成し、Backlogの課題にコメントを追加しました'
    });

  } catch (error) {
    return createErrorResponse(`予期しないエラーが発生しました: ${error.message}`, 500);
  }
}

/**
 * GETリクエストでHTMLフォームを表示
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Form')
    .setTitle('Google Meet URL作成')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * HTMLフォームからのPOSTリクエスト用
 * @param {Object} formData - フォームデータ
 * @return {Object} レスポンス
 */
function doPostFromForm(formData) {
  try {
    // パラメータの検証
    if (!formData.meetTitle || formData.meetTitle.trim() === '') {
      return { success: false, error: '会議のタイトルが指定されていません' };
    }

    if (!formData.meetDate || !formData.meetStartTime || !formData.meetEndTime) {
      return { success: false, error: '会議の日付、開始時刻、終了時刻が指定されていません' };
    }

    // 会議時間の検証（オプション）
    const meetDuration = formData.meetDuration ? parseInt(formData.meetDuration) : null;
    if (meetDuration && (meetDuration < 1 || meetDuration > 1440)) {
      return { success: false, error: '会議時間は1分〜1440分の範囲で入力してください' };
    }

    if (!formData.issueKey || formData.issueKey.trim() === '') {
      return { success: false, error: 'issueKeyパラメータが指定されていません' };
    }

    if (!formData.apiKey || formData.apiKey.trim() === '') {
      return { success: false, error: 'apiKeyパラメータが指定されていません' };
    }

    if (!formData.spaceUrl || formData.spaceUrl.trim() === '') {
      return { success: false, error: 'spaceUrlパラメータが指定されていません' };
    }

    const meetTitle = formData.meetTitle.trim();
    const meetDescription = formData.meetDescription ? formData.meetDescription.trim() : '';
    const calendarId = formData.calendarId ? formData.calendarId.trim() : null;
    const issueKey = formData.issueKey.trim();
    const apiKey = formData.apiKey.trim();
    let spaceUrl = formData.spaceUrl.trim();

    // 日時のパースと検証
    const startDateTime = new Date(formData.meetDate + 'T' + formData.meetStartTime);
    const endDateTime = new Date(formData.meetDate + 'T' + formData.meetEndTime);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return { success: false, error: '日付または時刻の形式が正しくありません' };
    }

    if (endDateTime <= startDateTime) {
      return { success: false, error: '終了時刻は開始時刻より後である必要があります' };
    }

    // スペースURLの形式チェック
    if (!spaceUrl.startsWith('http://') && !spaceUrl.startsWith('https://')) {
      return { success: false, error: 'spaceUrlはhttp://またはhttps://で始まる必要があります' };
    }

    // 末尾のスラッシュを削除
    spaceUrl = spaceUrl.replace(/\/$/, '');

    // Backlogのアクセス確認と課題の存在確認
    const backlogCheck = checkBacklogIssue(issueKey, apiKey, spaceUrl);
    if (!backlogCheck.valid) {
      return { success: false, error: backlogCheck.error };
    }

    // Google Meet URLの作成
    const meetUrl = createGoogleMeetUrl(meetTitle, meetDescription, startDateTime, endDateTime, calendarId);
    if (!meetUrl) {
      return { success: false, error: 'Google Meet URLの作成に失敗しました' };
    }

    // Backlogの課題にコメントを追加
    const commentResult = addBacklogComment(
      issueKey, 
      apiKey, 
      spaceUrl, 
      meetUrl, 
      meetTitle, 
      startDateTime, 
      endDateTime
    );
    if (!commentResult.success) {
      return { success: false, error: `Backlogコメントの追加に失敗しました: ${commentResult.error}` };
    }

    // 成功レスポンス
    return {
      success: true,
      data: {
        meetUrl: meetUrl,
        issueKey: issueKey,
        message: 'Google Meet URLを作成し、Backlogの課題にコメントを追加しました'
      }
    };

  } catch (error) {
    return { success: false, error: `予期しないエラーが発生しました: ${error.message}` };
  }
}

/**
 * リクエストパラメータを取得して検証
 * @param {Object} e - リクエストオブジェクト
 * @return {Object} 検証結果
 */
function getParameters(e) {
  let params = {};

  // POSTデータの取得
  if (e.postData && e.postData.contents) {
    try {
      params = JSON.parse(e.postData.contents);
    } catch (error) {
      return {
        valid: false,
        error: 'JSONの解析に失敗しました: ' + error.message
      };
    }
  } else if (e.parameter) {
    // GETパラメータ形式でも対応
    params = e.parameter;
  }

  // 必須パラメータのチェック
  if (!params.issueKey || params.issueKey.trim() === '') {
    return {
      valid: false,
      error: 'issueKeyパラメータが指定されていません'
    };
  }

  if (!params.apiKey || params.apiKey.trim() === '') {
    return {
      valid: false,
      error: 'apiKeyパラメータが指定されていません'
    };
  }

  // BacklogスペースURLの取得（パラメータまたは設定から）
  let spaceUrl = params.spaceUrl ? params.spaceUrl.trim() : null;
  if (!spaceUrl) {
    spaceUrl = PropertiesService.getScriptProperties().getProperty('BACKLOG_SPACE_URL');
  }
  if (!spaceUrl) {
    return {
      valid: false,
      error: 'spaceUrlパラメータが指定されていないか、ScriptPropertiesに設定されていません'
    };
  }

  // スペースURLの形式チェック
  if (!spaceUrl.startsWith('http://') && !spaceUrl.startsWith('https://')) {
    return {
      valid: false,
      error: 'spaceUrlはhttp://またはhttps://で始まる必要があります'
    };
  }

  // 末尾のスラッシュを削除
  spaceUrl = spaceUrl.replace(/\/$/, '');

  return {
    valid: true,
    issueKey: params.issueKey.trim(),
    apiKey: params.apiKey.trim(),
    spaceUrl: spaceUrl
  };
}

/**
 * Backlogの課題が存在するか確認
 * @param {string} issueKey - 課題キー（例: PROJECT-123）
 * @param {string} apiKey - Backlog APIキー
 * @param {string} spaceUrl - BacklogスペースURL
 * @return {Object} 確認結果
 */
function checkBacklogIssue(issueKey, apiKey, spaceUrl) {
  try {
    if (!spaceUrl) {
      return {
        valid: false,
        error: 'BacklogのスペースURLが指定されていません'
      };
    }

    const spaceCheckUrl = `${spaceUrl}/api/v2/space?apiKey=${apiKey}`;
    const spaceResponse = UrlFetchApp.fetch(spaceCheckUrl, {
      method: 'get',
      muteHttpExceptions: true
    });

    if (spaceResponse.getResponseCode() !== 200) {
      const errorText = spaceResponse.getContentText();
      return {
        valid: false,
        error: `Backlogへのアクセスに失敗しました: ${errorText}`,
        statusCode: spaceResponse.getResponseCode()
      };
    }

    // 課題の存在確認
    const issueUrl = `${spaceUrl}/api/v2/issues/${issueKey}?apiKey=${apiKey}`;
    const issueResponse = UrlFetchApp.fetch(issueUrl, {
      method: 'get',
      muteHttpExceptions: true
    });

    if (issueResponse.getResponseCode() === 404) {
      return {
        valid: false,
        error: `課題 ${issueKey} が見つかりませんでした`
      };
    }

    if (issueResponse.getResponseCode() !== 200) {
      const errorText = issueResponse.getContentText();
      return {
        valid: false,
        error: `課題の取得に失敗しました: ${errorText}`,
        statusCode: issueResponse.getResponseCode()
      };
    }

    return {
      valid: true,
      spaceUrl: spaceUrl
    };

  } catch (error) {
    return {
      valid: false,
      error: `Backlogの確認中にエラーが発生しました: ${error.message}`
    };
  }
}


/**
 * Google Meet URLを作成（OpenのURL）
 * @param {string} title - 会議のタイトル
 * @param {string} description - 会議の概要
 * @param {Date} startTime - 開始時刻
 * @param {Date} endTime - 終了時刻
 * @param {string} targetCalendarId - 作成先カレンダーID（オプション）
 * @return {string|null} Google Meet URL
 */
function createGoogleMeetUrl(title, description, startTime, endTime, targetCalendarId) {
  try {
    // 日時が指定されていない場合は、デフォルト値を使用（1時間後から2時間後）
    if (!startTime || !endTime) {
      const now = new Date();
      startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1時間後
      endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // さらに1時間後
    }

    let calendar;
    let calendarId;
    let eventId = null;
    let createdInDefault = false;

    // カレンダーIDが指定されている場合
    if (targetCalendarId && targetCalendarId.trim() !== '') {
      try {
        // 指定されたカレンダーを取得
        calendar = CalendarApp.getCalendarById(targetCalendarId.trim());
        if (calendar) {
          calendarId = calendar.getId();
        } else {
          // カレンダーが見つからない場合はデフォルトカレンダーを使用
          calendar = CalendarApp.getDefaultCalendar();
          calendarId = calendar.getId();
          createdInDefault = true;
        }
      } catch (error) {
        // カレンダーへのアクセス権限がない場合はデフォルトカレンダーを使用
        Logger.log('指定されたカレンダーへのアクセスに失敗: ' + error.message);
        calendar = CalendarApp.getDefaultCalendar();
        calendarId = calendar.getId();
        createdInDefault = true;
      }
    } else {
      // カレンダーIDが指定されていない場合はデフォルトカレンダーを使用
      calendar = CalendarApp.getDefaultCalendar();
      calendarId = calendar.getId();
    }
    
    // イベントデータ（Google Meetを含む）
    const eventData = {
      summary: title || 'Google Meet会議',
      description: description || '',
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Session.getScriptTimeZone()
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Session.getScriptTimeZone()
      },
      conferenceData: {
        createRequest: {
          requestId: Utilities.getUuid(),
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          },
          // オープンアクセス（誰でも参加可能）を設定
          // 注意: この設定は組織のポリシーによって上書きされる可能性があります
          settings: {
            // 会議へのアクセスをオープンに設定
            // 実際のAPIでは、この設定が直接サポートされていない可能性があります
          }
        }
      },
      // Open URL（誰でも参加可能）にするため、attendeesを空にする
      attendees: []
    };

    // Calendar API v3を使用してイベントを作成
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`;
    
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + ScriptApp.getOAuthToken(),
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(eventData),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      const event = JSON.parse(response.getContentText());
      eventId = event.id;
      
      // 会議リンクを取得
      let meetUrl = null;
      if (event.conferenceData && event.conferenceData.entryPoints) {
        for (let i = 0; i < event.conferenceData.entryPoints.length; i++) {
          const entryPoint = event.conferenceData.entryPoints[i];
          if (entryPoint.entryPointType === 'video') {
            meetUrl = entryPoint.uri;
            break;
          }
        }
      }
      
      // 会議リンクが取得できない場合
      if (!meetUrl) {
        Logger.log('会議リンクが取得できませんでした');
        // イベントを削除
        const deleteUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
        UrlFetchApp.fetch(deleteUrl, {
          method: 'delete',
          headers: { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() }
        });
        return null;
      }

      // デフォルトカレンダーに作成したが、共有カレンダーIDが指定されている場合はコピーを試みる
      if (createdInDefault && targetCalendarId && targetCalendarId.trim() !== '') {
        try {
          const targetCalendar = CalendarApp.getCalendarById(targetCalendarId.trim());
          if (targetCalendar) {
            // イベントを共有カレンダーにコピー
            const eventToCopy = calendar.getEventById(eventId);
            if (eventToCopy) {
              const copiedEvent = targetCalendar.createEvent(
                eventToCopy.getTitle(),
                eventToCopy.getStartTime(),
                eventToCopy.getEndTime(),
                {
                  description: eventToCopy.getDescription(),
                  location: eventToCopy.getLocation(),
                  guests: '',
                  sendInvites: false
                }
              );
              
              // コピーしたイベントにGoogle Meetを追加
              const copiedEventId = copiedEvent.getId().split('@')[0];
              const targetCalendarIdForApi = targetCalendar.getId();
              
              // コピーしたイベントに会議データを追加
              const updateUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(targetCalendarIdForApi)}/events/${encodeURIComponent(copiedEventId)}?conferenceDataVersion=1`;
              const updateData = {
                conferenceData: {
                  createRequest: {
                    requestId: Utilities.getUuid(),
                    conferenceSolutionKey: {
                      type: 'hangoutsMeet'
                    }
                  }
                }
              };
              
              const updateResponse = UrlFetchApp.fetch(updateUrl, {
                method: 'patch',
                headers: {
                  'Authorization': 'Bearer ' + ScriptApp.getOAuthToken(),
                  'Content-Type': 'application/json'
                },
                payload: JSON.stringify(updateData),
                muteHttpExceptions: true
              });
              
              if (updateResponse.getResponseCode() === 200) {
                const updatedEvent = JSON.parse(updateResponse.getContentText());
                if (updatedEvent.conferenceData && updatedEvent.conferenceData.entryPoints) {
                  for (let i = 0; i < updatedEvent.conferenceData.entryPoints.length; i++) {
                    const entryPoint = updatedEvent.conferenceData.entryPoints[i];
                    if (entryPoint.entryPointType === 'video') {
                      meetUrl = entryPoint.uri;
                      // 元のイベントを削除（共有カレンダーにコピーできた場合）
                      eventToCopy.deleteEvent();
                      break;
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          Logger.log('共有カレンダーへのコピーに失敗: ' + error.message);
          // コピーに失敗しても、デフォルトカレンダーのイベントは残す
        }
      }

      // 注意: Calendar API v3では、会議のアクセス設定（オープン/信頼済み/制限付き）を
      // 直接指定する方法は提供されていません。
      // 会議のアクセス設定は、組織のデフォルト設定やポリシーに依存します。
      // オープン設定が必要な場合は、Googleカレンダーで手動で設定を変更するか、
      // 組織のデフォルト設定を「オープン」に変更してください。
      return meetUrl;
    } else if (response.getResponseCode() === 403) {
      // Calendar APIが有効になっていない場合
      const errorText = response.getContentText();
      Logger.log('Calendar API エラー: ' + errorText);
      throw new Error('Google Calendar APIが有効になっていません。Google Cloud ConsoleでCalendar APIを有効にしてください。');
    } else {
      // その他のエラー
      const errorText = response.getContentText();
      Logger.log('Calendar API エラー: ' + errorText);
      return null;
    }

  } catch (error) {
    Logger.log('Google Meet URL作成エラー: ' + error.message);
    return null;
  }
}

/**
 * Backlogの課題にコメントを追加
 * @param {string} issueKey - 課題キー
 * @param {string} apiKey - Backlog APIキー
 * @param {string} spaceUrl - BacklogスペースURL
 * @param {string} meetUrl - Google Meet URL
 * @param {string} meetTitle - 会議のタイトル
 * @param {Date} startDateTime - 開始日時
 * @param {Date} endDateTime - 終了日時
 * @return {Object} 実行結果
 */
function addBacklogComment(issueKey, apiKey, spaceUrl, meetUrl, meetTitle, startDateTime, endDateTime) {
  try {
    if (!spaceUrl) {
      return {
        success: false,
        error: 'BacklogのスペースURLが指定されていません'
      };
    }

    const commentUrl = `${spaceUrl}/api/v2/issues/${issueKey}/comments?apiKey=${apiKey}`;
    
    // コメント本文を作成
    let commentBody = `Google Meet URLを作成しました。\n\n`;
    
    // 会議のタイトル
    if (meetTitle) {
      commentBody += `**会議タイトル:** ${meetTitle}\n`;
    }
    
    // 日時情報
    if (startDateTime && endDateTime) {
      const startDate = new Date(startDateTime);
      const endDate = new Date(endDateTime);
      
      // 日付フォーマット（YYYY-MM-DD）
      const dateStr = startDate.getFullYear() + '-' + 
                     String(startDate.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(startDate.getDate()).padStart(2, '0');
      
      // 時刻フォーマット（HH:MM）
      const startTimeStr = String(startDate.getHours()).padStart(2, '0') + ':' + 
                           String(startDate.getMinutes()).padStart(2, '0');
      const endTimeStr = String(endDate.getHours()).padStart(2, '0') + ':' + 
                         String(endDate.getMinutes()).padStart(2, '0');
      
      commentBody += `**日付:** ${dateStr}\n`;
      commentBody += `**開始時刻:** ${startTimeStr}\n`;
      commentBody += `**終了時刻:** ${endTimeStr}\n`;
    }
    
    commentBody += `\n**Google Meet URL:**\n${meetUrl}`;
    
    const payload = {
      content: commentBody
    };

    const response = UrlFetchApp.fetch(commentUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 201) {
      const errorText = response.getContentText();
      return {
        success: false,
        error: `コメント追加に失敗しました: ${errorText}`
      };
    }

    return {
      success: true
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 成功レスポンスを作成
 * @param {Object} data - レスポンスデータ
 * @return {Object} レスポンス
 */
function createSuccessResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      data: data
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * エラーレスポンスを作成
 * @param {string} message - エラーメッセージ
 * @param {number} statusCode - HTTPステータスコード
 * @return {Object} レスポンス
 */
function createErrorResponse(message, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      error: message,
      statusCode: statusCode
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * テスト用関数（エディタで直接実行可能）
 * 使用例:
 * testCreateMeetUrl("PROJECT-123", "your_api_key", "https://your-space.backlog.com")
 */
function testCreateMeetUrl(issueKey, apiKey, spaceUrl) {
  // パラメータの検証
  if (!issueKey || !apiKey || !spaceUrl) {
    Logger.log('エラー: issueKey, apiKey, spaceUrlのすべてのパラメータが必要です');
    return { success: false, error: 'パラメータが不足しています' };
  }
  
  const e = {
    postData: {
      contents: JSON.stringify({
        issueKey: issueKey,
        apiKey: apiKey,
        spaceUrl: spaceUrl
      })
    }
  };
  
  try {
    const result = doPost(e);
    const content = result.getContent();
    Logger.log('結果: ' + content);
    return JSON.parse(content);
  } catch (error) {
    Logger.log('エラー: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * onFormSubmitのテスト用関数
 */
function testOnFormSubmit() {
  const e = {
    namedValues: {
      '会議タイトル': ['テスト会議'],
      '開催日': ['2024-01-01'],
      '開始時刻': ['10:00'],
      '終了時刻': ['11:00'],
      '概要': ['これはテストです'],
      'Backlog課題キー': ['PROJECT-123']
    }
  };
  
  // ScriptPropertiesに値が設定されていることを確認してから実行してください
  onFormSubmit(e);
}
