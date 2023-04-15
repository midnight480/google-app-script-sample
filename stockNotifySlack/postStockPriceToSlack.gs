// Google App Scriptのソースコード
function postStockPriceComparisonToSlack() {
  // 証券コードを定義する
  const stockCode = 'XXXX';

  // SlackのBot Tokenを定義する
  const slackBotToken = 'xoxb-XXXX';

  // Slackの投稿するチャンネルを定義する
  const slackChannel = '#channel';

  // ヤフーファイナンスの株価を取得する
  const apiUrl = `https://query1.finance.yahoo.com/v7/finance/chart/${stockCode}.T?interval=1d`;
  const response = UrlFetchApp.fetch(apiUrl);
  const jsonResponse = JSON.parse(response.getContentText());
  const currentPrice = jsonResponse.chart.result[0].meta.regularMarketPrice;
  const previousPrice = jsonResponse.chart.result[0].meta.chartPreviousClose;

  // 前日の株価と当日の株価の差額を計算する
  const priceDifference = currentPrice - previousPrice;

  // SlackAppライブラリを利用して、株価情報をSlackに投稿する
  const slackApp = SlackApp.create(slackBotToken);
  const message = `*${stockCode}* の株価情報\n当日の株価: *${currentPrice.toFixed(2)}* 円\n前日の株価: *${previousPrice.toFixed(2)}* 円\n差額: *${priceDifference.toFixed(2)}* 円`;
  
  slackApp.postMessage(slackChannel, message);
}
