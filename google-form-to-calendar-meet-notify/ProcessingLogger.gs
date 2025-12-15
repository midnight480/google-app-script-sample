// Google Form to Calendar Meet Notify
// ProcessingLogger クラス

/**
 * ProcessingLogger クラス
 * 処理ログの管理と冪等性の保証
 * 要件 1.4, 4.1, 4.2, 4.3, 4.4 に対応
 */
class ProcessingLogger {
  constructor(spreadsheet) {
    this.spreadsheet = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
    this.logSheet = null;
    this.initializeLogSheet();
  }
  
  /**
   * 処理ログ用のシートを初期化
   */
  initializeLogSheet() {
    try {
      // 処理ログ用のシートが既に存在するかチェック
      try {
        this.logSheet = this.spreadsheet.getSheetByName('処理ログ');
      } catch (e) {
        // シートが存在しない場合は作成
      }
      
      if (!this.logSheet) {
        this.logSheet = this.spreadsheet.insertSheet('処理ログ');
        
        // ヘッダー行を設定
        const headers = [
          '行番号',
          'ステータス',
          'イベントID',
          '処理日時',
          'エラーメッセージ'
        ];
        
        this.logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        
        // ヘッダー行のスタイルを設定
        const headerRange = this.logSheet.getRange(1, 1, 1, headers.length);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#f0f0f0');
        
        // 列幅を調整
        this.logSheet.setColumnWidth(1, 80);  // 行番号
        this.logSheet.setColumnWidth(2, 100); // ステータス
        this.logSheet.setColumnWidth(3, 200); // イベントID
        this.logSheet.setColumnWidth(4, 150); // 処理日時
        this.logSheet.setColumnWidth(5, 300); // エラーメッセージ
        
        logInfo('処理ログシート作成完了', {
          spreadsheetId: this.spreadsheet.getId(),
          sheetName: '処理ログ'
        });
      }
    } catch (error) {
      logError('処理ログシート初期化エラー', error);
      throw error;
    }
  }
  
  /**
   * 処理開始をログに記録
   * 要件 1.4, 4.3 に対応
   * @param {number} rowIndex - スプレッドシートの行番号
   */
  logProcessingStart(rowIndex) {
    try {
      const logEntry = createProcessingLogEntry({
        rowIndex: rowIndex,
        status: 'PROCESSING',
        processedAt: new Date()
      });
      
      this.appendLogEntry(logEntry);
      
      logInfo('処理開始ログ記録', {
        rowIndex: rowIndex,
        status: 'PROCESSING'
      });
    } catch (error) {
      logError('処理開始ログ記録エラー', error);
      throw error;
    }
  }
  
  /**
   * 処理成功をログに記録
   * 要件 1.4, 4.3 に対応
   * @param {number} rowIndex - スプレッドシートの行番号
   * @param {string} eventId - 作成されたイベントID
   */
  logProcessingSuccess(rowIndex, eventId) {
    try {
      const logEntry = createProcessingLogEntry({
        rowIndex: rowIndex,
        status: 'SUCCESS',
        eventId: eventId,
        processedAt: new Date()
      });
      
      this.appendLogEntry(logEntry);
      
      logInfo('処理成功ログ記録', {
        rowIndex: rowIndex,
        status: 'SUCCESS',
        eventId: eventId
      });
    } catch (error) {
      logError('処理成功ログ記録エラー', error);
      throw error;
    }
  }
  
  /**
   * 処理エラーをログに記録
   * 要件 1.4, 4.3, 4.4 に対応
   * @param {number} rowIndex - スプレッドシートの行番号
   * @param {Error} error - エラーオブジェクト
   */
  logProcessingError(rowIndex, error) {
    try {
      const logEntry = createProcessingLogEntry({
        rowIndex: rowIndex,
        status: 'ERROR',
        processedAt: new Date(),
        errorMessage: error ? error.toString() : 'Unknown error'
      });
      
      this.appendLogEntry(logEntry);
      
      logError('処理エラーログ記録', {
        rowIndex: rowIndex,
        status: 'ERROR',
        error: error ? error.toString() : 'Unknown error'
      });
    } catch (logError) {
      logError('処理エラーログ記録エラー', logError);
      // ログ記録のエラーは処理を中断しない
    }
  }
  
  /**
   * ログエントリをシートに追加
   * @param {Object} logEntry - ログエントリ
   */
  appendLogEntry(logEntry) {
    if (!this.logSheet) {
      throw new Error('処理ログシートが初期化されていません');
    }
    
    const row = [
      logEntry.rowIndex,
      logEntry.status,
      logEntry.eventId || '',
      logEntry.processedAt ? Utilities.formatDate(logEntry.processedAt, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : '',
      logEntry.errorMessage || ''
    ];
    
    this.logSheet.appendRow(row);
  }
  
  /**
   * 指定された行が既に処理済みかどうかを確認
   * 要件 4.1, 4.2 に対応
   * @param {number} rowIndex - スプレッドシートの行番号
   * @returns {boolean} 既に処理済みの場合true
   */
  isAlreadyProcessed(rowIndex) {
    try {
      if (!this.logSheet) {
        return false;
      }
      
      const dataRange = this.logSheet.getDataRange();
      if (!dataRange || dataRange.getNumRows() <= 1) {
        // ヘッダー行のみの場合
        return false;
      }
      
      const data = dataRange.getValues();
      
      // ヘッダー行をスキップして検索
      for (let i = 1; i < data.length; i++) {
        const logRowIndex = data[i][0]; // 行番号
        const status = data[i][1]; // ステータス
        
        if (logRowIndex === rowIndex) {
          // 同じ行番号が見つかった場合
          if (status === 'SUCCESS' || status === 'PROCESSING') {
            // 成功または処理中の場合は処理済みとみなす
            logInfo('重複処理検出', {
              rowIndex: rowIndex,
              status: status
            });
            return true;
          }
          // ERRORの場合は再処理可能
        }
      }
      
      return false;
    } catch (error) {
      logError('重複処理チェックエラー', error);
      // エラーが発生した場合は、安全のため処理済みとみなす
      return true;
    }
  }
  
  /**
   * 指定された行のログエントリを取得
   * @param {number} rowIndex - スプレッドシートの行番号
   * @returns {Object|null} ログエントリ、見つからない場合はnull
   */
  getLogEntry(rowIndex) {
    try {
      if (!this.logSheet) {
        return null;
      }
      
      const dataRange = this.logSheet.getDataRange();
      if (!dataRange || dataRange.getNumRows() <= 1) {
        return null;
      }
      
      const data = dataRange.getValues();
      
      // ヘッダー行をスキップして検索
      for (let i = 1; i < data.length; i++) {
        const logRowIndex = data[i][0];
        if (logRowIndex === rowIndex) {
          return createProcessingLogEntry({
            rowIndex: data[i][0],
            status: data[i][1],
            eventId: data[i][2] || null,
            processedAt: data[i][3] ? new Date(data[i][3]) : new Date(),
            errorMessage: data[i][4] || null
          });
        }
      }
      
      return null;
    } catch (error) {
      logError('ログエントリ取得エラー', error);
      return null;
    }
  }
}

// ProcessingLoggerのインスタンスを作成するヘルパー関数
function createProcessingLogger(spreadsheet) {
  return new ProcessingLogger(spreadsheet);
}

