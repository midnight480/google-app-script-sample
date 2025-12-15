// Google Form to Calendar Meet Notify
// フォームセットアップ用のヘルパー関数

/**
 * Backlogユーザー一覧を含むフォームを作成
 * この関数を実行すると、Backlogプロジェクトのユーザー一覧を取得して
 * チェックボックス/リストボックスを設定したフォームが作成されます
 */
function createFormWithBacklogUsers() {
  try {
    logInfo('Backlogユーザー一覧を含むフォーム作成開始');
    
    const formManager = createFormManager();
    const result = formManager.createCompleteForm('共有カレンダーへの予定登録と通知', null, true);
    
    logInfo('フォーム作成完了', {
      formUrl: result.publishedUrl,
      editUrl: result.editUrl,
      spreadsheetUrl: result.spreadsheetUrl
    });
    
    // 結果をスプレッドシートに記録（オプション）
    const spreadsheet = result.spreadsheet;
    if (spreadsheet) {
      const setupSheet = spreadsheet.insertSheet('フォーム設定情報');
      setupSheet.getRange(1, 1, 1, 2).setValues([['項目', '値']]);
      setupSheet.getRange(2, 1, 1, 2).setValues([['フォームURL', result.publishedUrl]]);
      setupSheet.getRange(3, 1, 1, 2).setValues([['編集URL', result.editUrl]]);
      setupSheet.getRange(4, 1, 1, 2).setValues([['フォームID', result.formId]]);
      setupSheet.getRange(5, 1, 1, 2).setValues([['スプレッドシートURL', result.spreadsheetUrl]]);
      
      // 列幅を調整
      setupSheet.setColumnWidth(1, 150);
      setupSheet.setColumnWidth(2, 400);
    }
    
    return result;
    
  } catch (error) {
    logError('フォーム作成エラー', error);
    throw error;
  }
}

/**
 * Backlogプロジェクトのユーザー一覧を取得（テスト用）
 */
function testGetBacklogUsers() {
  try {
    logInfo('Backlogユーザー一覧取得テスト開始');
    
    const backlogCreator = createBacklogIssueCreator();
    const users = backlogCreator.getProjectUsers();
    
    logInfo('Backlogユーザー一覧取得成功', {
      userCount: users.length,
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        mailAddress: u.mailAddress
      }))
    });
    
    return users;
    
  } catch (error) {
    logError('Backlogユーザー一覧取得エラー', error);
    throw error;
  }
}

/**
 * フォーム送信時のトリガーを自動設定
 * スプレッドシートにバインドされたスクリプトとして実行する必要があります
 * @param {string} formId - フォームID（オプション、指定しない場合はスプレッドシートに紐付けられたフォームを使用）
 */
function setupFormSubmitTrigger(formId = null) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
      throw new Error('アクティブなスプレッドシートが見つかりません。スプレッドシートにバインドされたスクリプトとして実行してください。');
    }
    
    // 既存のトリガーを削除（重複を防ぐため）
    const existingTriggers = ScriptApp.getProjectTriggers().filter(trigger => 
      trigger.getHandlerFunction() === 'onFormSubmit'
    );
    
    existingTriggers.forEach(trigger => {
      ScriptApp.deleteTrigger(trigger);
      logInfo('既存のトリガーを削除しました', { triggerId: trigger.getUniqueId() });
    });
    
    // フォームIDを取得
    let targetFormId = formId;
    if (!targetFormId) {
      // スプレッドシートに紐付けられたフォームを取得
      const formUrl = spreadsheet.getFormUrl();
      if (!formUrl) {
        throw new Error('スプレッドシートにフォームが紐付けられていません。フォームをスプレッドシートにリンクしてください。');
      }
      
      // URLからフォームIDを抽出
      const formUrlMatch = formUrl.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
      if (!formUrlMatch) {
        throw new Error('フォームIDを取得できませんでした。');
      }
      targetFormId = formUrlMatch[1];
    }
    
    // フォーム送信時のトリガーを作成
    const form = FormApp.openById(targetFormId);
    const trigger = ScriptApp.newTrigger('onFormSubmit')
      .onFormSubmit()
      .create();
    
    logInfo('フォーム送信時トリガー設定完了', {
      formId: targetFormId,
      formTitle: form.getTitle(),
      triggerId: trigger.getUniqueId()
    });
    
    return {
      success: true,
      formId: targetFormId,
      formTitle: form.getTitle(),
      triggerId: trigger.getUniqueId()
    };
    
  } catch (error) {
    logError('フォーム送信時トリガー設定エラー', error);
    throw error;
  }
}

/**
 * フォーム作成とトリガー設定を一度に実行
 */
function createFormWithBacklogUsersAndTrigger() {
  try {
    // 1. フォームを作成
    const formResult = createFormWithBacklogUsers();
    
    // 2. スプレッドシートに移動してトリガーを設定
    // 注意: この関数はスプレッドシートにバインドされたスクリプトとして実行する必要があります
    const spreadsheet = formResult.spreadsheet;
    
    if (spreadsheet) {
      // スプレッドシートを開く
      SpreadsheetApp.openById(spreadsheet.getId());
      
      // 少し待ってからトリガーを設定（スプレッドシートが完全に作成されるまで）
      Utilities.sleep(1000);
      
      try {
        const triggerResult = setupFormSubmitTrigger(formResult.formId);
        
        logInfo('フォーム作成とトリガー設定完了', {
          formUrl: formResult.publishedUrl,
          spreadsheetUrl: formResult.spreadsheetUrl,
          triggerId: triggerResult.triggerId
        });
        
        return {
          form: formResult,
          trigger: triggerResult
        };
      } catch (triggerError) {
        logWarning('トリガー設定に失敗しました。手動で設定してください。', triggerError);
        return {
          form: formResult,
          trigger: null,
          message: 'フォームは作成されましたが、トリガーは手動で設定する必要があります。'
        };
      }
    }
    
    return formResult;
    
  } catch (error) {
    logError('フォーム作成とトリガー設定エラー', error);
    throw error;
  }
}

