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

