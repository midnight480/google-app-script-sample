// Backlog Webhook to Discord
// 共通ユーティリティ関数を読み込み
// 注意: Google Apps Scriptでは、utils/config.jsの内容をこのファイルに直接含める必要があります

// 定数定義
const CONSTANTS = {
  EVENT_TYPES: {
    ISSUE_CREATED: 1,
    ISSUE_UPDATED: 2,
    COMMENT_ADDED: 3
  }
};

// ログ出力関数
function logInfo(message, data = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message: message,
    data: data
  }));
}

function logError(message, error = null) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message: message,
    error: error ? error.toString() : null
  }));
}

function logWarning(message, data = {}) {
  console.warn(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'WARNING',
    message: message,
    data: data
  }));
}

// バリデーション関数
function validateWebhookData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid webhook data format');
  }
  
  if (!data.type || !data.project || !data.content) {
    throw new Error('Missing required webhook data fields');
  }
  
  return true;
}

function isValidWebhookUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('https://discord.com/api/webhooks/');
}

// 設定の初期化
function initializeConfig() {
  const properties = PropertiesService.getScriptProperties();
  const defaultConfig = {
    BACKLOG_URL: '{YOUR_BACKLOG_DOMAIN}.backlog.com',
    DISCORD_WEBHOOK_URL: '',
    CATEGORY_MAP: '{}'
  };

  Object.entries(defaultConfig).forEach(([key, value]) => {
    if (!properties.getProperty(key)) {
      properties.setProperty(key, value);
    }
  });
}

// 初回実行時にスクリプトプロパティを設定
initializeConfig();

// 環境変数の設定
const BACKLOG_URL = PropertiesService.getScriptProperties().getProperty('BACKLOG_URL');
const DEFAULT_DISCORD_WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty('DISCORD_WEBHOOK_URL');
const categoryMapJson = PropertiesService.getScriptProperties().getProperty('CATEGORY_MAP') || '{}';
const CATEGORY_WEBHOOK_MAP = JSON.parse(categoryMapJson);

// Webhookのエンドポイント
function doPost(e) {
  try {
    logInfo('Webhook受信開始');
    
    const data = JSON.parse(e.postData.contents);
    logInfo('受信したWebhookデータ', { 
      type: data.type,
      projectKey: data.project?.projectKey,
      contentKey: data.content?.key_id
    });
    
    // バリデーション
    validateWebhookData(data);
    
    const type = data.type;
    const project = data.project;
    const content = data.content;
    const createdUser = data.createdUser;

    // カテゴリ情報のログ出力
    if (content.category) {
      logInfo('カテゴリ情報', { 
        categories: content.category.map(cat => ({ id: cat.id, name: cat.name })),
        categoryIds: content.category.map(cat => cat.id)
      });
    } else {
      logInfo('カテゴリ情報なし');
    }

    let message = '';
    switch (type) {
      case CONSTANTS.EVENT_TYPES.ISSUE_CREATED:
        message = createIssueCreatedMessage(project, content, createdUser);
        break;
      case CONSTANTS.EVENT_TYPES.ISSUE_UPDATED:
        message = createIssueUpdatedMessage(project, content, createdUser);
        break;
      case CONSTANTS.EVENT_TYPES.COMMENT_ADDED:
        message = createCommentAddedMessage(project, content, createdUser);
        break;
      default:
        throw new Error(`Unknown event type: ${type}`);
    }

    // カテゴリに基づいてWebhook URLを選択
    const webhookUrl = getWebhookUrlForCategories(content.category);
    const sendResult = sendToDiscordWithErrorHandling(message, webhookUrl);
    
    if (sendResult) {
      logInfo('Webhook処理完了');
      return ContentService.createTextOutput(JSON.stringify({ 'status': 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      logWarning('Discord送信に失敗しましたが、Webhook処理は完了');
      return ContentService.createTextOutput(JSON.stringify({ 'status': 'warning', 'message': 'Discord送信に失敗' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    logError('Webhook処理エラー', error);
    return ContentService.createTextOutput(JSON.stringify({ 'status': 'error', 'message': error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// カテゴリに基づいてWebhook URLを取得
function getWebhookUrlForCategories(categories) {
  logInfo('getWebhookUrlForCategories呼び出し', { 
    categories: categories ? categories.map(cat => ({ id: cat.id, name: cat.name })) : null
  });

  if (!categories || categories.length === 0) {
    logInfo('カテゴリが存在しないため、デフォルトのWebhook URLを使用します');
    return DEFAULT_DISCORD_WEBHOOK_URL;
  }

  // カテゴリのIDを取得
  const categoryIds = categories.map(category => category.id.toString());
  logInfo('処理対象のカテゴリID', { categoryIds });
  
  // カテゴリIDに対応するWebhook URLを探す
  for (const categoryId of categoryIds) {
    logInfo(`カテゴリID ${categoryId} のWebhook URLを確認中`);
    if (CATEGORY_WEBHOOK_MAP[categoryId]) {
      logInfo(`カテゴリID ${categoryId} に対応するWebhook URLが見つかりました`);
      return CATEGORY_WEBHOOK_MAP[categoryId];
    }
  }

  // DEFAULT_DISCORD_WEBHOOK_URLが空白の場合はnullを返す
  if (!DEFAULT_DISCORD_WEBHOOK_URL || DEFAULT_DISCORD_WEBHOOK_URL.trim() === '') {
    logWarning('デフォルトのWebhook URLが設定されていないため、通知をスキップします');
    return null;
  }

  logInfo('対応するWebhook URLが見つからないため、デフォルトのURLを使用します');
  return DEFAULT_DISCORD_WEBHOOK_URL;
}

// 課題作成時のメッセージ作成
function createIssueCreatedMessage(project, content, createdUser) {
  return `新たに課題が追加されました。
https://${BACKLOG_URL}/view/${project.projectKey}-${content.key_id}
件名: ${content.summary}
担当: ${createdUser.name}`;
}

// 課題更新時のメッセージ作成
function createIssueUpdatedMessage(project, content, createdUser) {
  return `新たに課題が更新されました。
https://${BACKLOG_URL}/view/${project.projectKey}-${content.key_id}
件名: ${content.summary}
担当: ${createdUser.name}`;
}

// コメント追加時のメッセージ作成
function createCommentAddedMessage(project, content, createdUser) {
  return `コメントが追加されました。
https://${BACKLOG_URL}/view/${project.projectKey}-${content.key_id}
件名: ${content.summary}
担当: ${createdUser.name}`;
}

// Discordへの送信（エラーハンドリング付き）
function sendToDiscordWithErrorHandling(message, webhookUrl) {
  if (!webhookUrl) {
    logWarning('Webhook URLが設定されていないため、Discordへの送信をスキップします');
    return false;
  }

  if (!isValidWebhookUrl(webhookUrl)) {
    logError('Invalid Discord webhook URL format', { webhookUrl });
    return false;
  }

  const payload = {
    'content': message
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload)
  };

  try {
    const response = UrlFetchApp.fetch(webhookUrl, options);
    logInfo('Discord送信成功', { 
      statusCode: response.getResponseCode(),
      content: response.getContentText()
    });
    return true;
  } catch (error) {
    logError('Discord送信エラー', error);
    return false;
  }
}

// テスト関数
function testWebhookProcessing() {
  const testData = {
    type: 1,
    project: { projectKey: 'TEST' },
    content: { key_id: 123, summary: 'テスト課題' },
    createdUser: { name: 'テストユーザー' }
  };
  
  try {
    validateWebhookData(testData);
    logInfo('テストデータのバリデーション成功');
    
    const message = createIssueCreatedMessage(testData.project, testData.content, testData.createdUser);
    logInfo('テストメッセージ生成成功', { message });
    
    return true;
  } catch (error) {
    logError('テスト失敗', error);
    return false;
  }
} 