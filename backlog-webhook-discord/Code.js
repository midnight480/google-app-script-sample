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

/**
 * 共有シークレットを検証する（フェイルクローズ方式）
 *
 * Webアプリは Backlog からの受信のため認証なし（ANYONE_ANONYMOUS）で公開する必要がある。
 * URLを知られただけで偽の通知を送られないよう、クエリパラメータ ?token= の値を
 * スクリプトプロパティ WEBHOOK_SECRET と照合する。
 *
 * WEBHOOK_SECRET が未設定の場合も受信を拒否し、設定漏れによる無防備な公開を防ぐ。
 * シークレットはプロパティから都度読み込む（生成直後から反映させるため）。
 */
function verifyWebhookSecret(e) {
  const expected = (PropertiesService.getScriptProperties()
    .getProperty('WEBHOOK_SECRET') || '').trim();

  if (!expected) {
    logError('WEBHOOK_SECRETが未設定のため受信を拒否しました。generateWebhookSecret()を実行してください');
    return false;
  }

  const provided = (e && e.parameter && e.parameter.token) ? e.parameter.token : '';

  if (!isSecretMatch(provided, expected)) {
    logWarning('共有シークレットが一致しないため受信を拒否しました', {
      providedLength: provided.length
    });
    return false;
  }

  return true;
}

/**
 * 文字列を定数時間に近い形で比較し、タイミング攻撃の手掛かりを減らす
 */
function isSecretMatch(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;

  let diff = provided.length ^ expected.length;
  const length = Math.max(provided.length, expected.length);

  for (let i = 0; i < length; i++) {
    diff |= (provided.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  }

  return diff === 0;
}

// 設定の初期化
function initializeConfig() {
  const properties = PropertiesService.getScriptProperties();
  const defaultConfig = {
    BACKLOG_URL: '{YOUR_BACKLOG_DOMAIN}.backlog.com',
    DISCORD_WEBHOOK_URL: '',
    CATEGORY_MAP: '{}',
    WEBHOOK_SECRET: ''
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

    // 共有シークレット検証（不一致・未設定なら破棄）
    if (!verifyWebhookSecret(e)) {
      return ContentService.createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = (() => {
      try {
        return JSON.parse(e.postData.contents);
      } catch (parseError) {
        logError('JSONパースエラー', parseError);
        return null;
      }
    })();
    
    if (!data) {
      return ContentService.createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Invalid JSON payload' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
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
    return ContentService.createTextOutput(JSON.stringify({ 'status': 'error', 'message': 'Internal server error' }))
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
    logError('Invalid Discord webhook URL format');
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

/**
 * 共有シークレットを生成してスクリプトプロパティに保存する
 * 実行後、ログに表示されたURLをBacklogのWebhookに登録すること
 */
function generateWebhookSecret() {
  const properties = PropertiesService.getScriptProperties();
  const secret = Utilities.getUuid().replace(/-/g, '');
  properties.setProperty('WEBHOOK_SECRET', secret);

  const deploymentUrl = ScriptApp.getService().getUrl() || '{デプロイ後のWebアプリURL}';

  console.log([
    '共有シークレットを生成しました。',
    '',
    'WEBHOOK_SECRET: ' + secret,
    '',
    'BacklogのWebhookに登録するURL:',
    deploymentUrl + '?token=' + secret,
    '',
    '※このシークレットは第三者に共有しないでください。'
  ].join('\n'));

  return secret;
}

/**
 * 設定内容を確認する
 */
function checkConfiguration() {
  initializeConfig();
  const properties = PropertiesService.getScriptProperties();

  const backlogUrl = (properties.getProperty('BACKLOG_URL') || '').trim();
  const defaultWebhookUrl = (properties.getProperty('DISCORD_WEBHOOK_URL') || '').trim();
  const webhookSecret = (properties.getProperty('WEBHOOK_SECRET') || '').trim();

  let categoryMap = {};
  try {
    categoryMap = JSON.parse(properties.getProperty('CATEGORY_MAP') || '{}') || {};
  } catch (parseError) {
    logError('CATEGORY_MAPのJSONパースに失敗しました', parseError);
  }

  const issues = [];

  if (!backlogUrl || backlogUrl.indexOf('{YOUR_BACKLOG_DOMAIN}') !== -1) {
    issues.push('BACKLOG_URL が未設定です（例: example.backlog.com）');
  }

  if (!webhookSecret) {
    issues.push('WEBHOOK_SECRET が未設定です。generateWebhookSecret() を実行してください');
  }

  const categoryIds = Object.keys(categoryMap);
  categoryIds.forEach(categoryId => {
    if (!isValidWebhookUrl(categoryMap[categoryId])) {
      issues.push(`CATEGORY_MAP のカテゴリID ${categoryId} のURLがDiscord Webhookの形式ではありません`);
    }
  });

  if (defaultWebhookUrl && !isValidWebhookUrl(defaultWebhookUrl)) {
    issues.push('DISCORD_WEBHOOK_URL がDiscord Webhookの形式ではありません');
  }

  if (categoryIds.length === 0 && !defaultWebhookUrl) {
    issues.push('CATEGORY_MAP も DISCORD_WEBHOOK_URL も未設定のため、通知先がありません');
  }

  logInfo('設定確認', {
    BACKLOG_URL: backlogUrl || '(未設定)',
    DISCORD_WEBHOOK_URL: defaultWebhookUrl ? '(設定済み)' : '(未設定)',
    CATEGORY_MAP: categoryIds.length > 0 ? categoryIds.join(', ') : '(未設定)',
    WEBHOOK_SECRET: webhookSecret ? '(設定済み)' : '(未設定)',
    webAppUrl: ScriptApp.getService().getUrl() || '(未デプロイ)'
  });

  if (issues.length > 0) {
    logWarning('設定に問題があります', { issues: issues });
    return false;
  }

  logInfo('設定は正常です');
  return true;
}
