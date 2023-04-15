function getAndWriteRssUrls() {
  // 取得するSheetのIDとシート名を変数で定義する
  var sourceSpreadsheetId = 'your_source_spreadsheet_id';
  var sourceSheetName = 'your_source_sheet_name';
  var sourceColumnName = 'your_source_column_name';

  // 書き込むSheetのIDとシート名を変数で定義する
  var targetSpreadsheetId = 'your_target_spreadsheet_id';
  var targetSheetName = 'your_target_sheet_name';
  var targetColumnName = 'your_target_column_name';

  // 取得するSheetを開く
  var sourceSpreadsheet = SpreadsheetApp.openById(sourceSpreadsheetId);
  var sourceSheet = sourceSpreadsheet.getSheetByName(sourceSheetName);

  // 取得するSheetのデータ範囲を取得
  var sourceRange = sourceSheet.getDataRange();
  var sourceData = sourceRange.getValues();

  // 列名から列インデックスを取得する
  var sourceColumnIndex = sourceData[0].indexOf(sourceColumnName);

  // 取得したRSSフィードのURLを配列に格納する
  var rssUrls = [];
  for (var i = 1; i < sourceData.length; i++) {
    var row = sourceData[i];
    var url = row[sourceColumnIndex];
    if (url.includes('rss/1.0')) { // URLがRSS1.0形式のRSSフィードを示している場合
      rssUrls.push(url);
    }
  }

  // 配列に格納したURLの重複排除する
  var uniqueRssUrls = Array.from(new Set(rssUrls));

  // 重複排除したURLをSheetに書き込む
  var targetSpreadsheet = SpreadsheetApp.openById(targetSpreadsheetId);
  var targetSheet = targetSpreadsheet.getSheetByName(targetSheetName);

  // 最終行の取得
  var lastRow = targetSheet.getLastRow();
  var targetColumnIndex = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0].indexOf(targetColumnName);

  // 重複排除したURLを最終行以降に書き込む
  for (var j = 0; j < uniqueRssUrls.length; j++) {
    targetSheet.getRange(lastRow + 1 + j, targetColumnIndex + 1).setValue(uniqueRssUrls[j]);
  }
}
