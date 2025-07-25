function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Backlog API')
    .addItem('ライセンス・プロジェクト一覧を取得する', 'showDialogForInit')
    .addItem('プロジェクト毎の課題数を取得する', 'fetchAndWriteIssueCounts')
    .addToUi();
  // 初回起動時にライセンス・プロジェクト一覧取得
  showDialogForInit();
}

function showDialogForInit() {
  const html = HtmlService.createHtmlOutputFromFile('Dialog')
    .setWidth(550)
    .setHeight(350);
  // ライセンス・プロジェクト取得モードであることを示すためフラグをクリア
  PropertiesService.getScriptProperties().deleteProperty('isIssueCountMode');
  SpreadsheetApp.getUi().showModalDialog(html, 'Backlogライセンス・プロジェクト一覧取得');
}

function showDialog() {
  // 既存のDialog表示（課題数取得用に再利用可能）
  const html = HtmlService.createHtmlOutputFromFile('Dialog')
    .setWidth(400)
    .setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, 'Backlog課題数取得');
}

function checkModeAndExecute(data) {
  const isIssueCountMode = PropertiesService.getScriptProperties().getProperty('isIssueCountMode') === 'true';
  
  if (isIssueCountMode) {
    // 課題数取得モード: 既存シートに課題数を追加
    fetchAndWriteProjectIssues(data);
    return true; // 課題数モードであることを返す
  } else {
    // ライセンス・プロジェクト取得モード: 新しいシートを作成
    fetchAndWriteLicenseAndProjects(data);
    return false; // ライセンスモードであることを返す
  }
}

function fetchAndWriteLicenseAndProjects(data) {
  try {
    const { spaceId, domain, apiKey } = data;
    const baseUrl = `https://${spaceId}.${domain}/api/v2`;
    
    console.log(`API接続開始: ${baseUrl}`);

    // 1. ライセンス情報取得
    const licenseUrl = `${baseUrl}/space/licence?apiKey=${encodeURIComponent(apiKey)}`;
    console.log('ライセンス情報を取得中...');
    const licenseRes = UrlFetchApp.fetch(licenseUrl);
    
    if (licenseRes.getResponseCode() !== 200) {
      throw new Error(`ライセンス情報の取得に失敗しました (HTTP ${licenseRes.getResponseCode()})`);
    }
    
    const license = JSON.parse(licenseRes.getContentText());
    console.log('ライセンス情報取得完了');
    console.log('License data:', JSON.stringify(license, null, 2));

    // 2. プロジェクト一覧取得（アーカイブ含む）
    const projectUrl = `${baseUrl}/projects?all=true&apiKey=${encodeURIComponent(apiKey)}`;
    console.log('プロジェクト一覧を取得中...');
    const projectRes = UrlFetchApp.fetch(projectUrl);
    
    if (projectRes.getResponseCode() !== 200) {
      throw new Error(`プロジェクト一覧の取得に失敗しました (HTTP ${projectRes.getResponseCode()})`);
    }
    
    const projects = JSON.parse(projectRes.getContentText());
    console.log(`プロジェクト一覧取得完了: ${projects.length}件`);
    
    if (!Array.isArray(projects)) {
      throw new Error('プロジェクト一覧の形式が正しくありません');
    }

    // 3. 新規シート作成
    console.log('スプレッドシートに出力中...');
    const sheetName = 'Backlog_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);

    // 4. ライセンス情報（横並び）
    sheet.appendRow(['■ライセンス情報']);
    sheet.appendRow(['licenceTypeId', 'limitDate', 'startedOn', 'storageLimit', 'active', 'price']);
    
    // ライセンスデータを安全に処理（実際のAPIレスポンスに合わせて修正）
    const licenseRow = [
      license.licenceTypeId || '',
      license.limitDate || '',
      license.startedOn || '',
      license.storageLimit ? (license.storageLimit / (1024*1024*1024)).toFixed(2) + 'GB' : '',
      license.active !== undefined ? license.active : '',
      license.price || ''
    ];
    
    // 空の行でないことを確認
    if (licenseRow.some(cell => cell !== '')) {
      sheet.appendRow(licenseRow);
    } else {
      sheet.appendRow(['データなし', '', '', '', '', '']);
    }
    sheet.appendRow(['', '', '', '', '']); // 空行

    // 5. プロジェクト一覧
    sheet.appendRow(['■プロジェクト一覧']);
    sheet.appendRow(['id', 'projectKey', 'name', 'archived']);
    
    if (projects.length === 0) {
      sheet.appendRow(['プロジェクトがありません', '', '', '']);
    } else {
      projects.forEach(project => {
        // プロジェクトデータを安全に処理
        const projectRow = [
          project.id || '',
          project.projectKey || '',
          project.name || '名前なし',
          project.archived !== undefined ? project.archived : false
        ];
        
        // 空の行でないことを確認
        if (projectRow.some(cell => cell !== '')) {
          sheet.appendRow(projectRow);
        }
      });
    }
    
    console.log('データ出力完了');
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw new Error(error.message || 'データの取得に失敗しました');
  }
}

function fetchAndWriteIssueCounts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // シートが正しく初期化されているかチェック
  const data = sheet.getDataRange().getValues();
  let hasLicenseSection = false;
  let hasProjectSection = false;
  
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === '■ライセンス情報') {
      hasLicenseSection = true;
    }
    if (data[i][0] === '■プロジェクト一覧') {
      hasProjectSection = true;
    }
  }
  
  if (!hasLicenseSection || !hasProjectSection) {
    SpreadsheetApp.getUi().alert('ライセンス・プロジェクト情報が見つかりません。\nまず「ライセンス・プロジェクト一覧を取得する」を実行してください。');
    return;
  }
  
  // E5に"issue-count"ヘッダーを追加
  sheet.getRange('E5').setValue('issue-count');
  
  // A6から下方向にプロジェクトIDがある限り読み取る
  const projectIds = [];
  let row = 6; // A6から開始
  
  while (true) {
    const projectId = sheet.getRange(`A${row}`).getValue();
    if (!projectId || projectId === '') {
      break; // 空のセルに到達したら終了
    }
    projectIds.push({ id: projectId, row: row });
    row++;
  }
  
  if (projectIds.length === 0) {
    SpreadsheetApp.getUi().alert('A6以降にプロジェクトIDが見つかりません。\nまず「ライセンス・プロジェクト一覧を取得する」を実行してください。');
    return;
  }
  
  // API情報をユーザーに再入力してもらう
  showDialogForIssueCount(projectIds);
}

function showDialogForIssueCount(projectIds) {
  const html = HtmlService.createHtmlOutputFromFile('Dialog')
    .setWidth(550)
    .setHeight(350);
  // projectIdsをグローバル変数として保存し、Dialogから呼び出される関数で使用
  PropertiesService.getScriptProperties().setProperty('projectIds', JSON.stringify(projectIds));
  // 課題数取得モードであることを示すフラグを設定
  PropertiesService.getScriptProperties().setProperty('isIssueCountMode', 'true');
  SpreadsheetApp.getUi().showModalDialog(html, 'Backlog課題数取得');
}

function fetchAndWriteProjectIssues(data) {
  try {
    const { spaceId, domain, apiKey } = data;
    const projectIds = JSON.parse(PropertiesService.getScriptProperties().getProperty('projectIds'));
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const baseUrl = `https://${spaceId}.${domain}/api/v2`;
    
    console.log(`課題数取得開始: ${projectIds.length}件のプロジェクト`);
    
    // 各プロジェクトの課題数を取得してE列に書き込み
    projectIds.forEach((project, index) => {
      try {
        console.log(`プロジェクトID ${project.id} の課題数を取得中...`);
        
        // Backlog APIの課題数取得エンドポイントを使用
        const countUrl = `${baseUrl}/issues/count?projectId[]=${project.id}&apiKey=${encodeURIComponent(apiKey)}`;
        const countRes = UrlFetchApp.fetch(countUrl);
        
        if (countRes.getResponseCode() !== 200) {
          throw new Error(`HTTP ${countRes.getResponseCode()}`);
        }
        
        const countData = JSON.parse(countRes.getContentText());
        const issueCount = countData.count || 0;
        
        // E列の対応する行に課題数を書き込み
        sheet.getRange(`E${project.row}`).setValue(issueCount);
        
        console.log(`プロジェクトID ${project.id}: ${issueCount}件の課題`);
        
        // APIレート制限を避けるための小さな遅延
        if (index < projectIds.length - 1) {
          Utilities.sleep(100); // 100ms待機
        }
        
      } catch (error) {
        console.error(`プロジェクトID ${project.id} の課題数取得エラー:`, error);
        sheet.getRange(`E${project.row}`).setValue('エラー');
      }
    });
    
    console.log('課題数取得完了');
    
  } catch (error) {
    console.error('課題数取得処理でエラーが発生しました:', error);
    throw new Error(error.message || '課題数の取得に失敗しました');
  }
}
