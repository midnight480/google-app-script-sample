function fetchAndWriteUsersAndProjects(data) {
  try {
    console.log('開始: fetchAndWriteUsers', data);
    
    // 入力値検証
    const { spaceId, domain, apiKey } = data;
    if (!spaceId || !domain || !apiKey) {
      throw new Error('必要な入力値が不足しています: spaceId, domain, apiKey');
    }
    
    console.log('入力値確認完了:', { spaceId, domain, apiKeyLength: apiKey.length });
  
    // 1. ライセンスタイプを取得
    console.log('ステップ1: ライセンスタイプ取得開始');
    const spaceUrl = `https://${spaceId}.${domain}/api/v2/space?apiKey=${encodeURIComponent(apiKey)}`;
    console.log('スペースURL:', spaceUrl.replace(apiKey, '***'));
    
    const spaceResponse = UrlFetchApp.fetch(spaceUrl);
    console.log('スペースAPI レスポンスコード:', spaceResponse.getResponseCode());
    
    if (spaceResponse.getResponseCode() !== 200) {
      throw new Error(`スペース情報取得エラー: ${spaceResponse.getResponseCode()} - ${spaceResponse.getContentText()}`);
    }
    
    const spaceInfo = JSON.parse(spaceResponse.getContentText());
    console.log('スペース情報取得完了:', spaceInfo);
  
    // 2. ライセンスタイプ判別
    const licenseType = spaceInfo.licenseType; 
    console.log('ライセンスタイプ:', licenseType);
    // 1 = Classic, 2 = New
  
    const roleMapClassic = {
      1: 'Administrator',
      2: 'User',
      3: 'Guest'
    };
  
    const roleMapNew = {
      1: 'Administrator',
      2: 'User',
      3: 'Reporter',
      4: 'Guest'
    };
  
    // 3. どちらのマップを使うか
    const roleMap = (licenseType === 1) ? roleMapClassic : roleMapNew;
    console.log('使用するロールマップ:', roleMap);
  
    // 4. ユーザ取得
    console.log('ステップ4: ユーザ一覧取得開始');
    const url = `https://${spaceId}.${domain}/api/v2/users?apiKey=${encodeURIComponent(apiKey)}`;
    console.log('ユーザAPI URL:', url.replace(apiKey, '***'));
    
    const response = UrlFetchApp.fetch(url);
    console.log('ユーザAPI レスポンスコード:', response.getResponseCode());
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`ユーザ情報取得エラー: ${response.getResponseCode()} - ${response.getContentText()}`);
    }
    
    const users = JSON.parse(response.getContentText());
    console.log('ユーザ数:', users.length);
  
    // 5. シート作成または既存シートのクリア
    console.log('ステップ5: シート作成開始');
    const sheetName = "UserList_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
    console.log('シート名:', sheetName);
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(sheetName);
    
    if (sheet) {
      console.log('既存シートが見つかりました。内容をクリアします。');
      sheet.clear();
      console.log('シート内容クリア完了');
    } else {
      console.log('新しいシートを作成します。');
      sheet = spreadsheet.insertSheet(sheetName);
      console.log('シート作成完了');
    }
  
    const headers = [
      'id',
      'userId',
      'name',
      'Role',
      'lang',
      'mailAddress',
      'nulabAccount.name'
    ];
    sheet.appendRow(headers);
    console.log('ヘッダー行追加完了');
  
    // 6. ユーザを行に書き出す
    console.log('ステップ6: ユーザデータ書き出し開始');
    users.forEach((user, index) => {
      try {
        const row = [
          user.id,
          user.userId,
          user.name,
          roleMap[user.roleType] || '',
          user.lang,
          user.mailAddress,
          user.nulabAccount?.name || ''
        ];
        sheet.appendRow(row);
        if (index % 10 === 0) {
          console.log(`ユーザ書き出し進捗: ${index + 1}/${users.length}`);
        }
      } catch (userError) {
        console.error(`ユーザ ${index} の書き出しエラー:`, userError, user);
        throw userError;
      }
    });
    
    console.log('処理完了: 全ユーザデータの書き出し完了');
    
    // 7. プロジェクト一覧取得
    console.log('ステップ7: プロジェクト一覧取得開始');
    const projectUrl = `https://${spaceId}.${domain}/api/v2/projects?apiKey=${encodeURIComponent(apiKey)}&all=true`;
    console.log('プロジェクトAPI URL:', projectUrl.replace(apiKey, '***'));
    
    const projectResponse = UrlFetchApp.fetch(projectUrl);
    console.log('プロジェクトAPI レスポンスコード:', projectResponse.getResponseCode());
    
    if (projectResponse.getResponseCode() !== 200) {
      throw new Error(`プロジェクト情報取得エラー: ${projectResponse.getResponseCode()} - ${projectResponse.getContentText()}`);
    }
    
    const projects = JSON.parse(projectResponse.getContentText());
    console.log('プロジェクト数:', projects.length);
    
    // 8. プロジェクトシート作成または既存シートのクリア
    console.log('ステップ8: プロジェクトシート作成開始');
    const projectSheetName = "ProjectList_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
    console.log('プロジェクトシート名:', projectSheetName);
    
    let projectSheet = spreadsheet.getSheetByName(projectSheetName);
    
    if (projectSheet) {
      console.log('既存プロジェクトシートが見つかりました。内容をクリアします。');
      projectSheet.clear();
      console.log('プロジェクトシート内容クリア完了');
    } else {
      console.log('新しいプロジェクトシートを作成します。');
      projectSheet = spreadsheet.insertSheet(projectSheetName);
      console.log('プロジェクトシート作成完了');
    }
    
    const projectHeaders = [
      'id',
      'projectKey',
      'name',
      'archived'
    ];
    projectSheet.appendRow(projectHeaders);
    console.log('プロジェクトヘッダー行追加完了');
    
    // 9. プロジェクトを行に書き出す
    console.log('ステップ9: プロジェクトデータ書き出し開始');
    projects.forEach((project, index) => {
      try {
        const projectRow = [
          project.id,
          project.projectKey,
          project.name,
          project.archived || false
        ];
        projectSheet.appendRow(projectRow);
        if (index % 10 === 0) {
          console.log(`プロジェクト書き出し進捗: ${index + 1}/${projects.length}`);
        }
      } catch (projectError) {
        console.error(`プロジェクト ${index} の書き出しエラー:`, projectError, project);
        throw projectError;
      }
    });
    
    console.log('処理完了: 全ユーザ・プロジェクトデータの書き出し完了');
    
  } catch (error) {
    console.error('fetchAndWriteUsersAndProjects エラー:', error);
    console.error('エラースタック:', error.stack);
    throw error; // エラーを再スローしてダイアログに表示
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Backlog API')
    .addItem('[STEP1]ユーザ一覧・プロジェクト一覧を取得', 'showDialog')
    .addItem('[STEP2]プロジェクトメンバー、チームを取得', 'showProjectMemberDialog')
    .addItem('[STEP3]プロジェクトに参加していないメンバーの確認', 'checkUnassignedMembers')
    .addToUi();
}
  
function showDialog() {
  const html = HtmlService.createHtmlOutputFromFile('Dialog')
      .setWidth(500)
      .setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'Backlogユーザ・プロジェクト取得');
}

function showProjectMemberDialog() {
  const html = HtmlService.createHtmlOutputFromFile('ProjectMemberDialog')
      .setWidth(500)
      .setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'プロジェクトメンバー・チーム取得');
}

function checkUnassignedMembers() {
    try {
      console.log('開始: checkUnassignedMembers');
      
      const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
      
      // 1. 必要なシートを取得
      const userListSheetName = "UserList_" + today;
      const teamMemberSheetName = "TeamMemberList_" + today;
      const projectMemberSheetName = "ProjectMember_" + today;
      
      const userListSheet = spreadsheet.getSheetByName(userListSheetName);
      const teamMemberSheet = spreadsheet.getSheetByName(teamMemberSheetName);
      const projectMemberSheet = spreadsheet.getSheetByName(projectMemberSheetName);
      
      if (!userListSheet) {
        throw new Error(`${userListSheetName} シートが見つかりません。先にユーザ一覧・プロジェクト一覧を取得してください。`);
      }
      if (!teamMemberSheet) {
        throw new Error(`${teamMemberSheetName} シートが見つかりません。先にプロジェクトメンバー、チームを取得してください。`);
      }
      if (!projectMemberSheet) {
        throw new Error(`${projectMemberSheetName} シートが見つかりません。先にプロジェクトメンバー、チームを取得してください。`);
      }
      
      console.log('シート取得完了');
      
      // 2. UserListシートのデータを取得
      const userListData = userListSheet.getDataRange().getValues();
      const userHeaders = userListData[0];
      const users = userListData.slice(1);
      
      // 3. H列にisJoinedProjectヘッダーを追加（まだない場合）
      let isJoinedProjectIndex = userHeaders.indexOf('isJoinedProject');
      if (isJoinedProjectIndex === -1) {
        console.log('isJoinedProjectヘッダーをH列に追加');
        userHeaders[7] = 'isJoinedProject'; // H列はindex 7
        isJoinedProjectIndex = 7;
        userListSheet.getRange(1, 8).setValue('isJoinedProject');
      }
      
      // 4. TeamMemberListシートからメールアドレスを収集
      const teamMemberData = teamMemberSheet.getDataRange().getValues();
      const teamMemberEmails = new Set();
      for (let i = 1; i < teamMemberData.length; i++) {
        const email = teamMemberData[i][4]; // E列: members.mailAddress
        if (email && email.trim()) {
          teamMemberEmails.add(email.trim().toLowerCase());
        }
      }
      console.log('チームメンバーメール数:', teamMemberEmails.size);
      
      // 5. ProjectMemberシートからメールアドレスを収集
      const projectMemberData = projectMemberSheet.getDataRange().getValues();
      const projectMemberEmails = new Set();
      for (let i = 1; i < projectMemberData.length; i++) {
        const email = projectMemberData[i][7]; // H列: mailAddress
        if (email && email.trim()) {
          projectMemberEmails.add(email.trim().toLowerCase());
        }
      }
      console.log('プロジェクトメンバーメール数:', projectMemberEmails.size);
      
      // 6. 各ユーザーのプロジェクト参加数をカウント
      console.log('ユーザーのプロジェクト参加数カウント開始');
      
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const userEmail = user[5]; // F列: mailAddress
        
        if (!userEmail || !userEmail.trim()) {
          user[isJoinedProjectIndex] = 0;
          continue;
        }
        
        const normalizedEmail = userEmail.trim().toLowerCase();
        let projectCount = 0;
        
        // チームメンバーとプロジェクトメンバーの両方でカウント
        if (teamMemberEmails.has(normalizedEmail)) {
          projectCount++;
        }
        if (projectMemberEmails.has(normalizedEmail)) {
          projectCount++;
        }
        
        user[isJoinedProjectIndex] = projectCount;
        
        if (i % 10 === 0) {
          console.log(`ユーザー処理進捗: ${i + 1}/${users.length}`);
        }
      }
      
      // 7. データをシートに書き込み
      console.log('データ書き込み開始');
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const projectCount = user[isJoinedProjectIndex];
        
        // H列にカウント数を設定
        userListSheet.getRange(i + 2, 8).setValue(projectCount);
        
        // 0件の場合は赤色で表示
        if (projectCount === 0) {
          userListSheet.getRange(i + 2, 8).setBackground('#ffcccc');
        } else {
          userListSheet.getRange(i + 2, 8).setBackground('#ffffff');
        }
      }
      
      console.log('処理完了: プロジェクトに参加していないメンバーの確認完了');
      
      // 結果をユーザーに通知
      const unassignedCount = users.filter(user => user[isJoinedProjectIndex] === 0).length;
      SpreadsheetApp.getUi().alert(
        '処理完了',
        `プロジェクトに参加していないメンバー: ${unassignedCount}人\n\nUserList_${today}シートのH列で確認できます。\n0件のユーザーは赤色で表示されています。`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      
    } catch (error) {
      console.error('checkUnassignedMembers エラー:', error);
      SpreadsheetApp.getUi().alert('エラー', error.message, SpreadsheetApp.getUi().ButtonSet.OK);
    }
}