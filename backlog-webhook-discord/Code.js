// Backlog Webhook to Discord
// BacklogのWebhookを受信し、カテゴリに応じたDiscord Webhookへ通知する

// ===== 1. 定数定義 =====
const CONSTANTS = {
  EVENT_TYPES: {
    ISSUE_CREATED: 1,
    ISSUE_UPDATED: 2,
    COMMENT_ADDED: 3
  },
  DISCORD_WEBHOOK_PREFIX: 'https://discord.com/api/webhooks/',
  PROPERTY_KEYS: {
    BACKLOG_URL: 'BACKLOG_URL',
    DISCORD_WEBHOOK_URL: 'DISCORD_WEBHOOK_URL',
    CATEGORY_MAP: 'CATEGORY_MAP',
    WEBHOOK_SECRET: 'WEBHOOK_SECRET'
  }
};

// ===== 2. ログ関数 =====
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

// ===== 3. バリデーション関数 =====
function validateWebhookData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid webhook data format');
  }

  if (!data.type || !data.project || !data.content) {
    throw new Error('Missing required webhook data fields');
  }

  return true;
}

/**
 * Discord Webhook URLの形式を検証する
 */
function isValidWebhookUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith(CONSTANTS.DISCORD_WEBHOOK_PREFIX);
}

/**
 * 共有シークレットを検証する（フェイルクローズ方式）
 *
 * Webアプリは Backlog からの受信のため認証なし（ANYONE_ANONYMOUS）で公開する必要がある。
 * URLを知られただけで偽の通知を送られないよう、クエリパラメータ ?token= の値を
 * スクリプトプロパティ WEBHOOK_SECRET と照合する。
 *
 * WEBHOOK_SECRET が未設定の場合も受信を拒否し、設定漏れによる無防備な公開を防ぐ。
 */
function verifyWebhookSecret(e, config) {
  const expected = config.webhookSecret;

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

// ===== 4. 設定初期化 =====
function initializeConfig() {
  const properties = PropertiesService.getScriptProperties();
  const defaultConfig = {
    BACKLOG_URL: '{YOUR_BACKLOG_DOMAIN}.backlog.com',
    DISCORD_WEBHOOK_URL: '',
    CATEGORY_MAP: '{}',
    WEBHOOK_SECRET: ''
  };

  Object.entries(defaultConfig).forEach(([key, value]) => {
    if (properties.getProperty(key) === null) {
      properties.setProperty(key, value);
    }
  });
}

/**
 * スクリプトプロパティを実行時に読み込む
 * ファイルスコープでキャッシュしないため、プロパティ変更が次回実行から即時反映される
 */
function loadConfig() {
  const properties = PropertiesService.getScriptProperties();
  const keys = CONSTANTS.PROPERTY_KEYS;

  const rawCategoryMap = properties.getProperty(keys.CATEGORY_MAP) || '{}';
  let categoryMap = {};
  try {
    const parsed = JSON.parse(rawCategoryMap);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      categoryMap = parsed;
    } else {
      logWarning('CATEGORY_MAPがオブジェクト形式ではないため空として扱います');
    }
  } catch (parseError) {
    logError('CATEGORY_MAPのJSONパースに失敗したため空として扱います', parseError);
  }

  return {
    backlogUrl: (properties.getProperty(keys.BACKLOG_URL) || '').trim(),
    defaultWebhookUrl: (properties.getProperty(keys.DISCORD_WEBHOOK_URL) || '').trim(),
    categoryMap: categoryMap,
    webhookSecret: (properties.getProperty(keys.WEBHOOK_SECRET) || '').trim()
  };
}

// ===== 5. メイン処理関数 =====
function doPost(e) {
  try {
    logInfo('Webhook受信開始');

    initializeConfig();
    const config = loadConfig();

    // 共有シークレット検証（不一致・未設定なら破棄）
    if (!verifyWebhookSecret(e, config)) {
      return createJsonResponse({ status: 'error', message: 'Unauthorized' });
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
      return createJsonResponse({ status: 'error', message: 'Invalid JSON payload' });
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
    if (content.category && content.category.length > 0) {
      logInfo('カテゴリ情報', {
        categories: content.category.map(cat => ({ id: cat.id, name: cat.name }))
      });
    } else {
      logInfo('カテゴリ情報なし');
    }

    const message = createDiscordMessage(type, project, content, createdUser, config);

    // カテゴリに基づいてWebhook URLを選択
    const webhookUrl = getWebhookUrlForCategories(content.category, config);
    const sendResult = sendToDiscordWithErrorHandling(message, webhookUrl);

    if (sendResult) {
      logInfo('Webhook処理完了');
      return createJsonResponse({ status: 'success' });
    }

    logWarning('Discord送信に失敗しましたが、Webhook処理は完了');
    return createJsonResponse({ status: 'warning', message: 'Discord送信に失敗' });
  } catch (error) {
    logError('Webhook処理エラー', error);
    return createJsonResponse({ status: 'error', message: 'Internal server error' });
  }
}

function createJsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== 6. ヘルパー関数 =====

/**
 * カテゴリに基づいて通知先のDiscord Webhook URLを取得する
 * 複数カテゴリが該当する場合は最初にマッチした1件を採用する
 */
function getWebhookUrlForCategories(categories, config) {
  const categoryMap = config.categoryMap;
  const defaultWebhookUrl = config.defaultWebhookUrl;

  if (!categories || categories.length === 0) {
    logInfo('カテゴリが存在しないため、既定のWebhook URLを使用します');
    return defaultWebhookUrl || null;
  }

  const categoryIds = categories.map(category => String(category.id));
  logInfo('処理対象のカテゴリID', { categoryIds: categoryIds });

  for (const categoryId of categoryIds) {
    if (Object.prototype.hasOwnProperty.call(categoryMap, categoryId) && categoryMap[categoryId]) {
      logInfo('カテゴリに対応するWebhook URLが見つかりました', { categoryId: categoryId });
      return categoryMap[categoryId];
    }
  }

  if (!defaultWebhookUrl) {
    logWarning('既定のWebhook URLが設定されていないため、通知をスキップします');
    return null;
  }

  logInfo('対応するWebhook URLが見つからないため、既定のURLを使用します');
  return defaultWebhookUrl;
}

/**
 * 課題のパーマリンクを組み立てる
 * BACKLOG_URL にスキームや末尾スラッシュが含まれていても正規化する
 */
function buildIssueUrl(backlogUrl, project, content) {
  if (!backlogUrl || !project?.projectKey || !content?.key_id) return '';
  const host = backlogUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return `https://${host}/view/${project.projectKey}-${content.key_id}`;
}

/**
 * イベント種別に応じたDiscordメッセージを生成する
 */
function createDiscordMessage(type, project, content, createdUser, config) {
  switch (type) {
    case CONSTANTS.EVENT_TYPES.ISSUE_CREATED:
      return createIssueCreatedMessage(project, content, createdUser, config);
    case CONSTANTS.EVENT_TYPES.ISSUE_UPDATED:
      return createIssueUpdatedMessage(project, content, createdUser, config);
    case CONSTANTS.EVENT_TYPES.COMMENT_ADDED:
      return createCommentAddedMessage(project, content, createdUser, config);
    default:
      throw new Error(`Unknown event type: ${type}`);
  }
}

// 課題作成時のメッセージ作成
function createIssueCreatedMessage(project, content, createdUser, config) {
  return `新たに課題が追加されました。
${buildIssueUrl(config.backlogUrl, project, content)}
件名: ${content.summary}
担当: ${createdUser.name}`;
}

// 課題更新時のメッセージ作成
function createIssueUpdatedMessage(project, content, createdUser, config) {
  return `新たに課題が更新されました。
${buildIssueUrl(config.backlogUrl, project, content)}
件名: ${content.summary}
担当: ${createdUser.name}`;
}

// コメント追加時のメッセージ作成
function createCommentAddedMessage(project, content, createdUser, config) {
  return `コメントが追加されました。
${buildIssueUrl(config.backlogUrl, project, content)}
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

// ===== 7. テスト・運用関数 =====

/**
 * 共有シークレットを生成してスクリプトプロパティに保存する
 * 実行後、ログに表示されたURLをBacklogのWebhookに登録すること
 */
function generateWebhookSecret() {
  const properties = PropertiesService.getScriptProperties();
  const secret = Utilities.getUuid().replace(/-/g, '');
  properties.setProperty(CONSTANTS.PROPERTY_KEYS.WEBHOOK_SECRET, secret);

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
  const config = loadConfig();

  const issues = [];

  if (!config.backlogUrl || config.backlogUrl.indexOf('{YOUR_BACKLOG_DOMAIN}') !== -1) {
    issues.push('BACKLOG_URL が未設定です（例: example.backlog.com）');
  }

  if (!config.webhookSecret) {
    issues.push('WEBHOOK_SECRET が未設定です。generateWebhookSecret() を実行してください');
  }

  const categoryIds = Object.keys(config.categoryMap);
  categoryIds.forEach(categoryId => {
    if (!isValidWebhookUrl(config.categoryMap[categoryId])) {
      issues.push(`CATEGORY_MAP のカテゴリID ${categoryId} のURLがDiscord Webhookの形式ではありません`);
    }
  });

  if (config.defaultWebhookUrl && !isValidWebhookUrl(config.defaultWebhookUrl)) {
    issues.push('DISCORD_WEBHOOK_URL がDiscord Webhookの形式ではありません');
  }

  if (categoryIds.length === 0 && !config.defaultWebhookUrl) {
    issues.push('CATEGORY_MAP も DISCORD_WEBHOOK_URL も未設定のため、通知先がありません');
  }

  const summary = {
    BACKLOG_URL: config.backlogUrl || '(未設定)',
    DISCORD_WEBHOOK_URL: config.defaultWebhookUrl ? '(設定済み)' : '(未設定)',
    CATEGORY_MAP: categoryIds.length > 0
      ? categoryIds.map(id => `${id} -> (設定済み)`).join(', ')
      : '(未設定)',
    WEBHOOK_SECRET: config.webhookSecret ? '(設定済み)' : '(未設定)',
    webAppUrl: ScriptApp.getService().getUrl() || '(未デプロイ)'
  };

  logInfo('設定確認', summary);

  if (issues.length > 0) {
    logWarning('設定に問題があります', { issues: issues });
    return false;
  }

  logInfo('設定は正常です');
  return true;
}

/**
 * サンプルペイロードでメッセージ生成と通知先の解決をテストする（Discordへの送信は行わない）
 */
function testWebhookProcessing() {
  const config = loadConfig();

  const testData = {
    type: 1,
    project: { projectKey: 'TEST' },
    content: {
      key_id: 123,
      summary: 'テスト課題',
      category: [{ id: 1695590, name: 'インフラ' }]
    },
    createdUser: { name: 'テストユーザー' }
  };

  try {
    validateWebhookData(testData);
    logInfo('テストデータのバリデーション成功');

    const message = createDiscordMessage(
      testData.type,
      testData.project,
      testData.content,
      testData.createdUser,
      config
    );
    const webhookUrl = getWebhookUrlForCategories(testData.content.category, config);

    logInfo('テストメッセージ生成成功', {
      message: message,
      webhookUrl: webhookUrl ? '(解決済み)' : '(通知先なし)'
    });

    return true;
  } catch (error) {
    logError('テスト失敗', error);
    return false;
  }
}
