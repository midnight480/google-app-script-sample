// Google Form to Calendar Meet Notify
// FormManager クラス

/**
 * Form Serviceを使用してGoogleフォームを管理するクラス
 * 要件 5.1, 5.3 に対応
 */
class FormManager {
  constructor() {
    this.form = null;
  }
  
  /**
   * 新しいGoogleフォームを作成
   * @param {string} title - フォームのタイトル
   * @returns {GoogleAppsScript.Forms.Form} 作成されたフォーム
   */
  createForm(title) {
    try {
      if (!title || typeof title !== 'string' || title.trim() === '') {
        throw new Error('フォームタイトルは必須です');
      }
      
      this.form = FormApp.create(title.trim());
      
      // フォームの基本設定
      this.configureFormSettings(this.form);
      
      logInfo('Googleフォーム作成完了', {
        formId: this.form.getId(),
        title: this.form.getTitle(),
        editUrl: this.form.getEditUrl(),
        publishedUrl: this.form.getPublishedUrl()
      });
      
      return this.form;
    } catch (error) {
      logError('Googleフォーム作成エラー', error);
      throw error;
    }
  }
  
  /**
   * 必須フィールドをフォームに追加
   * 要件 5.1 に対応
   * @param {GoogleAppsScript.Forms.Form} form - 対象フォーム
   */
  addRequiredFields(form) {
    if (!form) {
      throw new Error('フォームオブジェクトが提供されていません');
    }
    
    try {
      
      // 2. 開始日時（必須）
      const startDateTimeItem = form.addDateTimeItem()
        .setTitle('開始日時')
        .setHelpText('イベントの開始日時を選択してください')
        .setRequired(true);
      
      // 3. 終了日時（必須）
      const endDateTimeItem = form.addDateTimeItem()
        .setTitle('終了日時')
        .setHelpText('イベントの終了日時を選択してください')
        .setRequired(true);
      
      // 4. イベントタイトル（必須）
      const titleItem = form.addTextItem()
        .setTitle('イベントタイトル')
        .setHelpText('会議やイベントのタイトルを入力してください')
        .setRequired(true);
      
      // タイトルの長さ制限を追加
      const titleValidation = FormApp.createTextValidation()
        .setHelpText('タイトルは1文字以上100文字以下で入力してください')
        .requireTextLengthGreaterThanOrEqualTo(1)
        .requireTextLengthLessThanOrEqualTo(100)
        .build();
      titleItem.setValidation(titleValidation);
      
      logInfo('必須フィールド追加完了', {
        formId: form.getId(),
        requiredFields: ['開始日時', '終了日時', 'イベントタイトル']
      });
      
    } catch (error) {
      logError('必須フィールド追加エラー', error);
      throw error;
    }
  }
  
  /**
   * オプションフィールドをフォームに追加
   * 要件 5.3 に対応
   * @param {GoogleAppsScript.Forms.Form} form - 対象フォーム
   */
  addOptionalFields(form) {
    if (!form) {
      throw new Error('フォームオブジェクトが提供されていません');
    }
    
    try {
      // 1. イベント説明（オプション）
      const descriptionItem = form.addParagraphTextItem()
        .setTitle('イベント説明（オプション）')
        .setHelpText('会議の詳細や議題などを入力してください（1000文字以下）')
        .setRequired(false);
      
      // 注意: ParagraphTextItemにはsetValidationメソッドがありません
      // 長さ制限はヘルプテキストで案内します
      
      logInfo('オプションフィールド追加完了', {
        formId: form.getId(),
        optionalFields: ['イベント説明']
      });
      
    } catch (error) {
      logError('オプションフィールド追加エラー', error);
      throw error;
    }
  }
  
  /**
   * Backlogユーザーチェックボックスをフォームに追加
   * @param {GoogleAppsScript.Forms.Form} form - 対象フォーム
   * @param {string} title - フィールドタイトル（デフォルト: 'お知らせしたい人'）
   * @param {boolean} required - 必須かどうか（デフォルト: true）
   */
  addBacklogUserCheckboxes(form, title = 'お知らせしたい人', required = true) {
    if (!form) {
      throw new Error('フォームオブジェクトが提供されていません');
    }
    
    try {
      // BacklogIssueCreatorを使用してユーザー一覧を取得
      const backlogCreator = createBacklogIssueCreator();
      const users = backlogCreator.getProjectUsers();
      
      if (!users || users.length === 0) {
        throw new Error('Backlogプロジェクトのユーザー一覧が取得できませんでした。設定を確認してください。');
      }
      
      // チェックボックス項目を作成
      const checkboxItem = form.addCheckboxItem()
        .setTitle(title)
        .setHelpText('通知を送りたいユーザーを選択してください（複数選択可）')
        .setRequired(required);
      
      // ユーザーを選択肢として追加
      // Google Apps Scriptでは、createChoiceは値のみを受け取り、表示名は値と同じになります
      // 値として「ユーザー名 (ID: ユーザーID)」の形式を使用（表示名として見やすく、後で解析可能）
      const choices = users.map(user => {
        const displayName = user.name || user.userId || `ユーザーID: ${user.id}`;
        // 値として「ユーザー名|ユーザーID」の形式を使用（後で解析できるように）
        const value = `${displayName}|${user.id}`;
        return checkboxItem.createChoice(value);
      });
      
      checkboxItem.setChoices(choices);
      
      logInfo('Backlogユーザーチェックボックス追加完了', {
        formId: form.getId(),
        userCount: users.length,
        title: title
      });
      
      return checkboxItem;
      
    } catch (error) {
      logError('Backlogユーザーチェックボックス追加エラー', error);
      throw error;
    }
  }
  
  /**
   * 登録者（担当者）選択用のBacklogユーザーリストボックスを追加
   * @param {GoogleAppsScript.Forms.Form} form - 対象フォーム
   * @param {string} title - フィールドタイトル（デフォルト: '登録者（担当者）'）
   * @param {boolean} required - 必須かどうか（デフォルト: true）
   */
  addBacklogAssigneeListBox(form, title = '登録者（担当者）', required = true) {
    if (!form) {
      throw new Error('フォームオブジェクトが提供されていません');
    }
    
    try {
      // BacklogIssueCreatorを使用してユーザー一覧を取得
      const backlogCreator = createBacklogIssueCreator();
      const users = backlogCreator.getProjectUsers();
      
      if (!users || users.length === 0) {
        throw new Error('Backlogプロジェクトのユーザー一覧が取得できませんでした。設定を確認してください。');
      }
      
      // リストボックス項目を作成
      const listItem = form.addListItem()
        .setTitle(title)
        .setHelpText('課題の担当者となるユーザーを選択してください')
        .setRequired(required);
      
      // ユーザーを選択肢として追加
      // Google Apps Scriptでは、createChoiceは値のみを受け取り、表示名は値と同じになります
      // 値として「ユーザー名|ユーザーID」の形式を使用（表示名として見やすく、後で解析可能）
      const choices = users.map(user => {
        const displayName = user.name || user.userId || `ユーザーID: ${user.id}`;
        // 値として「ユーザー名|ユーザーID」の形式を使用（後で解析できるように）
        const value = `${displayName}|${user.id}`;
        return listItem.createChoice(value);
      });
      
      listItem.setChoices(choices);
      
      logInfo('Backlog担当者リストボックス追加完了', {
        formId: form.getId(),
        userCount: users.length,
        title: title
      });
      
      return listItem;
      
    } catch (error) {
      logError('Backlog担当者リストボックス追加エラー', error);
      throw error;
    }
  }
  
  /**
   * フォームをスプレッドシートに紐付け
   * @param {GoogleAppsScript.Forms.Form} form - 対象フォーム
   * @param {string} spreadsheetId - 紐付け先スプレッドシートID（オプション）
   * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet} 紐付けられたスプレッドシート
   */
  linkToSpreadsheet(form, spreadsheetId = null) {
    if (!form) {
      throw new Error('フォームオブジェクトが提供されていません');
    }
    
    try {
      let spreadsheet;
      
      if (spreadsheetId) {
        // 既存のスプレッドシートに紐付け
        try {
          spreadsheet = SpreadsheetApp.openById(spreadsheetId);
          form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheetId);
          logInfo('既存スプレッドシートに紐付け完了', {
            formId: form.getId(),
            spreadsheetId: spreadsheetId,
            spreadsheetName: spreadsheet.getName()
          });
        } catch (error) {
          logWarning('指定されたスプレッドシートが見つかりません。新しいスプレッドシートを作成します', {
            spreadsheetId: spreadsheetId,
            error: error.message
          });
          // 新しいスプレッドシートを作成
          spreadsheet = this.createNewSpreadsheet(form);
        }
      } else {
        // 新しいスプレッドシートを作成
        spreadsheet = this.createNewSpreadsheet(form);
      }
      
      // 処理ログ用のシートを追加
      this.setupProcessingLogSheet(spreadsheet);
      
      return spreadsheet;
      
    } catch (error) {
      logError('スプレッドシート紐付けエラー', error);
      throw error;
    }
  }
  
  /**
   * 新しいスプレッドシートを作成してフォームに紐付け
   * @param {GoogleAppsScript.Forms.Form} form - 対象フォーム
   * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet} 作成されたスプレッドシート
   */
  createNewSpreadsheet(form) {
    const spreadsheetName = `${form.getTitle()} - 回答`;
    const spreadsheet = SpreadsheetApp.create(spreadsheetName);
    
    // フォームをスプレッドシートに紐付け
    form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());
    
    logInfo('新しいスプレッドシート作成・紐付け完了', {
      formId: form.getId(),
      spreadsheetId: spreadsheet.getId(),
      spreadsheetName: spreadsheet.getName(),
      spreadsheetUrl: spreadsheet.getUrl()
    });
    
    return spreadsheet;
  }
  
  /**
   * 処理ログ用のシートをセットアップ
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet - 対象スプレッドシート
   */
  setupProcessingLogSheet(spreadsheet) {
    try {
      // 処理ログ用のシートが既に存在するかチェック
      let logSheet = null;
      try {
        logSheet = spreadsheet.getSheetByName('処理ログ');
      } catch (e) {
        // シートが存在しない場合は作成
      }
      
      if (!logSheet) {
        logSheet = spreadsheet.insertSheet('処理ログ');
        
        // ヘッダー行を設定
        const headers = [
          '行番号',
          'ステータス',
          'イベントID',
          '処理日時',
          'エラーメッセージ'
        ];
        
        logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        
        // ヘッダー行のスタイルを設定
        const headerRange = logSheet.getRange(1, 1, 1, headers.length);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#f0f0f0');
        
        // 列幅を調整
        logSheet.setColumnWidth(1, 80);  // 行番号
        logSheet.setColumnWidth(2, 100); // ステータス
        logSheet.setColumnWidth(3, 200); // イベントID
        logSheet.setColumnWidth(4, 150); // 処理日時
        logSheet.setColumnWidth(5, 300); // エラーメッセージ
        
        logInfo('処理ログシート作成完了', {
          spreadsheetId: spreadsheet.getId(),
          sheetName: '処理ログ'
        });
      } else {
        logInfo('処理ログシートは既に存在します', {
          spreadsheetId: spreadsheet.getId(),
          sheetName: '処理ログ'
        });
      }
      
    } catch (error) {
      logError('処理ログシートセットアップエラー', error);
      throw error;
    }
  }
  
  /**
   * フォームの基本設定を行う
   * @param {GoogleAppsScript.Forms.Form} form - 対象フォーム
   */
  configureFormSettings(form) {
    if (!form) {
      throw new Error('フォームオブジェクトが提供されていません');
    }
    
    try {
      // フォームの説明を設定
      form.setDescription(
        'このフォームを使用して、Google Calendarにイベントを登録し、Google Meet URLを自動生成します。\n' +
        '必須項目をすべて入力してください。'
      );
      
      // 回答後の設定
      form.setConfirmationMessage(
        'ご登録ありがとうございます。\n' +
        'カレンダーイベントが作成され、Google Meet URLを含む通知メールが送信されます。'
      );
      
      // 回答の編集を許可
      form.setAllowResponseEdits(true);
      
      // 進行状況バーを表示
      form.setProgressBar(true);
      
      // 回答のコピーを送信者に送信
      form.setCollectEmail(false); // メールアドレスは別途収集するため
      
      logInfo('フォーム基本設定完了', {
        formId: form.getId(),
        settings: {
          allowResponseEdits: true,
          progressBar: true,
          collectEmail: false
        }
      });
      
    } catch (error) {
      logError('フォーム基本設定エラー', error);
      throw error;
    }
  }
  
  /**
   * 完全なフォームを作成（必須・オプションフィールド含む）
   * @param {string} title - フォームタイトル
   * @param {string} spreadsheetId - 紐付け先スプレッドシートID（オプション）
   * @param {boolean} includeBacklogUsers - Backlogユーザー選択フィールドを追加するか（デフォルト: true）
   * @returns {Object} 作成されたフォームとスプレッドシートの情報
   */
  createCompleteForm(title, spreadsheetId = null, includeBacklogUsers = true) {
    try {
      logInfo('完全フォーム作成開始', { title: title, spreadsheetId: spreadsheetId, includeBacklogUsers: includeBacklogUsers });
      
      // 1. フォーム作成
      const form = this.createForm(title);
      
      // 2. 必須フィールド追加
      this.addRequiredFields(form);
      
      // 3. Backlogユーザー選択フィールドを追加（オプション）
      if (includeBacklogUsers) {
        try {
          // 登録者（担当者）選択
          this.addBacklogAssigneeListBox(form);
          
          // お知らせしたい人（通知先）選択
          this.addBacklogUserCheckboxes(form);
        } catch (backlogError) {
          logWarning('Backlogユーザー選択フィールドの追加に失敗しました。メールアドレス入力方式にフォールバックします。', backlogError);
          // エラーが発生しても処理は継続（メールアドレス入力方式にフォールバック）
        }
      }
      
      // 4. オプションフィールド追加
      this.addOptionalFields(form);
      
      // 5. スプレッドシートに紐付け
      const spreadsheet = this.linkToSpreadsheet(form, spreadsheetId);
      
      const result = {
        form: form,
        formId: form.getId(),
        formTitle: form.getTitle(),
        editUrl: form.getEditUrl(),
        publishedUrl: form.getPublishedUrl(),
        spreadsheet: spreadsheet,
        spreadsheetId: spreadsheet.getId(),
        spreadsheetName: spreadsheet.getName(),
        spreadsheetUrl: spreadsheet.getUrl()
      };
      
      logInfo('完全フォーム作成完了', result);
      return result;
      
    } catch (error) {
      logError('完全フォーム作成エラー', error);
      throw error;
    }
  }
}

// FormManagerのインスタンスを作成するヘルパー関数
function createFormManager() {
  return new FormManager();
}

