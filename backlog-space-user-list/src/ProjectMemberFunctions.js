function fetchProjectMembersAndTeams(data) {
  try {
    console.log('開始: fetchProjectMembersAndTeams', data);
    
    // 入力値検証
    const { spaceId, domain, apiKey } = data;
    if (!spaceId || !domain || !apiKey) {
      throw new Error('必要な入力値が不足しています: spaceId, domain, apiKey');
    }
    
    console.log('入力値確認完了:', { spaceId, domain, apiKeyLength: apiKey.length });
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
    const projectSheetName = "ProjectList_" + today;
    
    // 1. ProjectList_YYYYMMDDシートを取得
    console.log('ステップ1: ProjectListシート取得');
    const projectSheet = spreadsheet.getSheetByName(projectSheetName);
    if (!projectSheet) {
      throw new Error(`${projectSheetName} シートが見つかりません。先にユーザ一覧・プロジェクト一覧を取得してください。`);
    }
    
    // 2. プロジェクト一覧を読み取り
    console.log('ステップ2: プロジェクト一覧読み取り');
    const projectData = projectSheet.getDataRange().getValues();
    const projectHeaders = projectData[0];
    const projects = projectData.slice(1);
    
    console.log('プロジェクト数:', projects.length);
    console.log('プロジェクトヘッダー:', projectHeaders);
    
    // 3. ヘッダーにuser-count, team-countを追加（まだない場合）
    // archivedカラムが追加されたため、E列とF列に配置
    console.log('ステップ3: ヘッダー更新確認');
    let userCountIndex = projectHeaders.indexOf('user-count');
    let teamCountIndex = projectHeaders.indexOf('team-count');
    
    if (userCountIndex === -1 || teamCountIndex === -1) {
      console.log('user-count, team-countヘッダーを追加');
      if (userCountIndex === -1) {
        projectHeaders.push('user-count');
        userCountIndex = projectHeaders.length - 1;
      }
      if (teamCountIndex === -1) {
        projectHeaders.push('team-count');
        teamCountIndex = projectHeaders.length - 1;
      }
      projectSheet.clear();
      projectSheet.appendRow(projectHeaders);
    }
    
    console.log(`user-countインデックス: ${userCountIndex}, team-countインデックス: ${teamCountIndex}`);
    
    // 4. プロジェクトメンバーシート作成
    console.log('ステップ4: プロジェクトメンバーシート作成');
    const projectMemberSheetName = "ProjectMember_" + today;
    let projectMemberSheet = spreadsheet.getSheetByName(projectMemberSheetName);
    
    if (projectMemberSheet) {
      console.log('既存プロジェクトメンバーシートが見つかりました。内容をクリアします。');
      projectMemberSheet.clear();
    } else {
      console.log('新しいプロジェクトメンバーシートを作成します。');
      projectMemberSheet = spreadsheet.insertSheet(projectMemberSheetName);
    }
    
    const projectMemberHeaders = [
      'projectId',
      'projectKey', 
      'projectName',
      'userId',
      'name',
      'roleType',
      'lang',
      'mailAddress',
      'nulabAccount.name'
    ];
    projectMemberSheet.appendRow(projectMemberHeaders);
    console.log('プロジェクトメンバーヘッダー行追加完了');
    
    // 5. チームメンバーリストシート作成
    console.log('ステップ5: チームメンバーリストシート作成');
    const teamMemberSheetName = "TeamMemberList_" + today;
    let teamMemberSheet = spreadsheet.getSheetByName(teamMemberSheetName);
    
    if (teamMemberSheet) {
      console.log('既存チームメンバーシートが見つかりました。内容をクリアします。');
      teamMemberSheet.clear();
    } else {
      console.log('新しいチームメンバーシートを作成します。');
      teamMemberSheet = spreadsheet.insertSheet(teamMemberSheetName);
    }
    
    const teamMemberHeaders = [
      'id',
      'name',
      'members.name',
      'members.nulabAccount.name',
      'members.mailAddress'
    ];
    teamMemberSheet.appendRow(teamMemberHeaders);
    console.log('チームメンバーヘッダー行追加完了');
    
    // 5. 各プロジェクトのメンバー数・チーム数を取得
    console.log('ステップ5: プロジェクトメンバー・チーム情報取得開始');
    
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const projectId = project[0]; // id列
      const projectKey = project[1]; // projectKey列
      const projectName = project[2]; // name列
      
      console.log(`プロジェクト処理中 ${i + 1}/${projects.length}: ${projectName} (ID: ${projectId})`);
      
      try {
        // プロジェクトメンバー取得
        const memberUrl = `https://${spaceId}.${domain}/api/v2/projects/${projectId}/users?apiKey=${encodeURIComponent(apiKey)}`;
        const memberResponse = UrlFetchApp.fetch(memberUrl);
        
        if (memberResponse.getResponseCode() !== 200) {
          console.error(`プロジェクト ${projectId} のメンバー取得エラー: ${memberResponse.getResponseCode()}`);
          project[userCountIndex] = 'エラー';
        } else {
          const members = JSON.parse(memberResponse.getContentText());
          project[userCountIndex] = members.length;
          console.log(`プロジェクト ${projectName} のメンバー数: ${members.length}`);
          
          // プロジェクトメンバー詳細をProjectMemberシートに追加
          for (const member of members) {
            const projectMemberRow = [
              projectId,
              projectKey,
              projectName,
              member.userId || '',
              member.name || '',
              member.roleType || '',
              member.lang || '',
              member.mailAddress || '',
              member.nulabAccount?.name || ''
            ];
            projectMemberSheet.appendRow(projectMemberRow);
          }
        }
        
        // プロジェクトチーム取得
        const teamUrl = `https://${spaceId}.${domain}/api/v2/projects/${projectId}/teams?apiKey=${encodeURIComponent(apiKey)}`;
        const teamResponse = UrlFetchApp.fetch(teamUrl);
        
        if (teamResponse.getResponseCode() !== 200) {
          console.error(`プロジェクト ${projectId} のチーム取得エラー: ${teamResponse.getResponseCode()}`);
          project[teamCountIndex] = 'エラー';
        } else {
          const teams = JSON.parse(teamResponse.getContentText());
          project[teamCountIndex] = teams.length;
          console.log(`プロジェクト ${projectName} のチーム数: ${teams.length}`);
          
          // チームメンバー詳細を取得してTeamMemberListに追加
          for (const team of teams) {
            const teamDetailUrl = `https://${spaceId}.${domain}/api/v2/teams/${team.id}?apiKey=${encodeURIComponent(apiKey)}`;
            const teamDetailResponse = UrlFetchApp.fetch(teamDetailUrl);
            
            if (teamDetailResponse.getResponseCode() === 200) {
              const teamDetail = JSON.parse(teamDetailResponse.getContentText());
              
              if (teamDetail.members && teamDetail.members.length > 0) {
                for (const member of teamDetail.members) {
                  const teamMemberRow = [
                    team.id,
                    team.name,
                    member.name || '',
                    member.nulabAccount?.name || '',
                    member.mailAddress || ''
                  ];
                  teamMemberSheet.appendRow(teamMemberRow);
                }
              } else {
                // メンバーがいない場合も記録
                const teamMemberRow = [
                  team.id,
                  team.name,
                  '',
                  '',
                  ''
                ];
                teamMemberSheet.appendRow(teamMemberRow);
              }
            }
          }
        }
        
        // プロジェクトシートの行を更新
        projectSheet.getRange(i + 2, 1, 1, project.length).setValues([project]);
        
        // API制限を避けるため少し待機
        if (i % 5 === 4) {
          console.log('API制限回避のため1秒待機');
          Utilities.sleep(1000);
        }
        
      } catch (projectError) {
        console.error(`プロジェクト ${projectId} の処理エラー:`, projectError);
        project[userCountIndex] = 'エラー';
        project[teamCountIndex] = 'エラー';
        projectSheet.getRange(i + 2, 1, 1, project.length).setValues([project]);
      }
    }
    
    console.log('処理完了: 全プロジェクトメンバー・チーム情報の取得完了');
    
  } catch (error) {
    console.error('fetchProjectMembersAndTeams エラー:', error);
    console.error('エラースタック:', error.stack);
    throw error;
  }
}
