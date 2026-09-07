// Backlog Webhook to Slack
// BacklogのWebhookを受信し、カテゴリに応じたSlack Incoming Webhookへ通知する

// ===== 1. 定数定義 =====
const CONSTANTS = {
  EVENT_TYPES: {
    ISSUE_CREATED: 1,
    ISSUE_UPDATED: 2,
    COMMENT_ADDED: 3
  },
  SLACK_WEBHOOK_PREFIX: 'https://hooks.slack.com/services/',
  // Slack Block Kit の文字数上限
  LIMITS: {
    HEADER_TEXT: 150,
    SECTION_TEXT: 3000,
    FIELD_TEXT: 2000,
    CONTEXT_TEXT: 3000,
    FALLBACK_TEXT: 300,
    DESCRIPTION: 500,
    COMMENT: 1000,
    CHANGES: 10
  },
  PROPERTY_KEYS: {
    BACKLOG_URL: 'BACKLOG_URL',
    SLACK_WEBHOOK_URL: 'SLACK_WEBHOOK_URL',
    CATEGORY_MAP: 'CATEGORY_MAP',
    WEBHOOK_SECRET: 'WEBHOOK_SECRET',
    BACKLOG_API_KEY: 'BACKLOG_API_KEY',
    RECENT_EVENTS: 'RECENT_EVENTS'
  },
  RECENT_EVENTS_MAX: 15,
  MASTER_CACHE_SECONDS: 21600,
  // changes の field 名 -> 日本語ラベル
  FIELD_LABELS: {
    status: '状態',
    assignee: '担当者',
    priority: '優先度',
    issueType: '種別',
    resolution: '完了理由',
    milestone: 'マイルストーン',
    category: 'カテゴリ',
    version: '発生バージョン',
    summary: '件名',
    description: '詳細',
    limitDate: '期限日',
    startDate: '開始日',
    estimatedHours: '予定時間',
    actualHours: '実績時間',
    attachment: '添付ファイル',
    notificationInfo: 'お知らせ',
    parentIssue: '親課題'
  },
  // changes の値がIDで届くフィールドと、その名称を引くBacklog APIのパス
  FIELD_MASTER_PATH: {
    status: 'projects/{projectId}/statuses',
    priority: 'priorities',
    resolution: 'resolutions',
    issueType: 'projects/{projectId}/issueTypes',
    assignee: 'projects/{projectId}/users',
    category: 'projects/{projectId}/categories',
    milestone: 'projects/{projectId}/versions',
    version: 'projects/{projectId}/versions'
  },
  // イベント種別ごとの表示設定
  EVENT_PRESENTATION: {
    1: { emoji: ':new:', label: '課題が追加されました' },
    2: { emoji: ':pencil2:', label: '課題が更新されました' },
    3: { emoji: ':speech_balloon:', label: 'コメントが追加されました' }
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
 * Slack Incoming Webhook URLの形式を検証する
 */
function isValidWebhookUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith(CONSTANTS.SLACK_WEBHOOK_PREFIX);
}

/**
 * 共有シークレットを検証する（フェイルクローズ方式）
 * WEBHOOK_SECRETが未設定の場合も受信を拒否し、無防備な公開を防ぐ
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
    SLACK_WEBHOOK_URL: '',
    CATEGORY_MAP: '{}',
    WEBHOOK_SECRET: '',
    BACKLOG_API_KEY: ''
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
    defaultWebhookUrl: (properties.getProperty(keys.SLACK_WEBHOOK_URL) || '').trim(),
    categoryMap: categoryMap,
    webhookSecret: (properties.getProperty(keys.WEBHOOK_SECRET) || '').trim(),
    backlogApiKey: (properties.getProperty(keys.BACKLOG_API_KEY) || '').trim()
  };
}

// ===== 5. メイン処理関数 =====
function doPost(e) {
  try {
    logInfo('Webhook受信開始');

    initializeConfig();
    const config = loadConfig();

    // 共有シークレット検証
    if (!verifyWebhookSecret(e, config)) {
      recordEvent({
        outcome: 'unauthorized',
        hasToken: !!(e && e.parameter && e.parameter.token),
        secretConfigured: !!config.webhookSecret
      });
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
      recordEvent({ outcome: 'invalid_json' });
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

    // 対象外イベントは正常終了として握りつぶす（Backlog側の再送を招かないため）
    if (!CONSTANTS.EVENT_PRESENTATION[type]) {
      logInfo('通知対象外のイベントのためスキップします', { type: type });
      recordEvent({ outcome: 'ignored', type: type, projectKey: project?.projectKey });
      return createJsonResponse({ status: 'ignored', message: `Unsupported event type: ${type}` });
    }

    const message = createSlackMessage(type, project, content, createdUser, config);

    // カテゴリに基づいてWebhook URLを選択
    const webhookUrl = getWebhookUrlForCategories(content.category, config);
    const sendResult = postToSlack(message, webhookUrl);
    logSlackResult(sendResult);

    const base = {
      type: type,
      projectKey: project?.projectKey,
      keyId: content?.key_id,
      categoryIds: (content.category || []).map(cat => String(cat.id)),
      matchedTarget: webhookUrl
        ? (webhookUrl === config.defaultWebhookUrl ? 'SLACK_WEBHOOK_URL' : 'CATEGORY_MAP')
        : 'none',
      slackReason: sendResult.reason,
      slackStatusCode: sendResult.statusCode || null
    };

    if (sendResult.ok) {
      logInfo('Webhook処理完了');
      recordEvent(Object.assign({ outcome: 'success' }, base));
      return createJsonResponse({ status: 'success' });
    }

    logWarning('Slack送信に失敗しましたが、Webhook処理は完了');
    recordEvent(Object.assign({ outcome: 'send_failed' }, base));
    return createJsonResponse({ status: 'warning', message: 'Slack送信に失敗' });
  } catch (error) {
    logError('Webhook処理エラー', error);
    recordEvent({ outcome: 'exception', error: error.toString() });
    return createJsonResponse({ status: 'error', message: 'Internal server error' });
  }
}

/**
 * 直近の受信結果をスクリプトプロパティに記録する（診断用・機密値は保存しない）
 */
function recordEvent(entry) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const raw = properties.getProperty(CONSTANTS.PROPERTY_KEYS.RECENT_EVENTS) || '[]';

    let events = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) events = parsed;
    } catch (parseError) {
      events = [];
    }

    events.unshift(Object.assign({ at: new Date().toISOString() }, entry));
    properties.setProperty(
      CONSTANTS.PROPERTY_KEYS.RECENT_EVENTS,
      JSON.stringify(events.slice(0, CONSTANTS.RECENT_EVENTS_MAX))
    );
  } catch (error) {
    // 診断用の記録失敗は本処理に影響させない
    logWarning('受信履歴の記録に失敗しました', { error: error.toString() });
  }
}

function createJsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 診断用エンドポイント（共有シークレット必須）
 *   GET .../exec?token=xxx              -> 設定状態のヘルスチェック
 *   GET .../exec?token=xxx&action=test  -> 既定チャンネルへテスト送信し、Slackの応答をそのまま返す
 *   GET .../exec?token=xxx&action=test&category=1247157 -> 指定カテゴリの通知先へテスト送信
 *
 * シークレットやWebhook URLそのものは返さない（マスクした状態のみ）
 */
function doGet(e) {
  try {
    initializeConfig();
    const config = loadConfig();

    if (!verifyWebhookSecret(e, config)) {
      return createJsonResponse({ status: 'error', message: 'Unauthorized' });
    }

    const action = (e && e.parameter && e.parameter.action) || 'health';

    if (action === 'test') {
      return createJsonResponse(runSlackTest(config, e.parameter.category));
    }

    return createJsonResponse(buildHealthReport(config));
  } catch (error) {
    logError('診断エンドポイントでエラー', error);
    return createJsonResponse({ status: 'error', message: 'Internal server error' });
  }
}

/**
 * 設定状態のレポートを組み立てる（機密値はマスク）
 */
function buildHealthReport(config) {
  const issues = [];

  if (!config.backlogUrl || config.backlogUrl.indexOf('{YOUR_BACKLOG_DOMAIN}') !== -1) {
    issues.push('BACKLOG_URL が未設定です');
  }

  const defaultWebhook = {
    configured: !!config.defaultWebhookUrl,
    validFormat: isValidWebhookUrl(config.defaultWebhookUrl)
  };
  if (config.defaultWebhookUrl && !defaultWebhook.validFormat) {
    issues.push('SLACK_WEBHOOK_URL がSlack Incoming Webhookの形式ではありません');
  }

  const categoryTargets = Object.keys(config.categoryMap).map(categoryId => ({
    categoryId: categoryId,
    validFormat: isValidWebhookUrl(config.categoryMap[categoryId])
  }));
  categoryTargets.filter(t => !t.validFormat).forEach(t => {
    issues.push(`CATEGORY_MAP のカテゴリID ${t.categoryId} のURLがSlack Incoming Webhookの形式ではありません`);
  });

  if (categoryTargets.length === 0 && !defaultWebhook.configured) {
    issues.push('CATEGORY_MAP も SLACK_WEBHOOK_URL も未設定のため、通知先がありません');
  }

  return {
    status: issues.length === 0 ? 'ok' : 'warning',
    backlogUrl: config.backlogUrl || null,
    backlogApiKeyConfigured: !!config.backlogApiKey,
    defaultWebhook: defaultWebhook,
    categoryTargets: categoryTargets,
    webAppUrl: ScriptApp.getService().getUrl() || null,
    issues: issues,
    recentEvents: loadRecentEvents()
  };
}

/**
 * 記録済みの受信履歴を読み出す
 */
function loadRecentEvents() {
  const raw = PropertiesService.getScriptProperties()
    .getProperty(CONSTANTS.PROPERTY_KEYS.RECENT_EVENTS) || '[]';
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (parseError) {
    return [];
  }
}

/**
 * 実際にSlackへテスト送信し、Slackからの応答をそのまま返す
 */
function runSlackTest(config, categoryId) {
  let target = config.defaultWebhookUrl;
  let targetLabel = 'SLACK_WEBHOOK_URL';

  if (categoryId) {
    target = config.categoryMap[String(categoryId)];
    targetLabel = `CATEGORY_MAP[${categoryId}]`;
  }

  const message = buildIssueCreatedMessage(
    { projectKey: 'TEST', name: 'テストプロジェクト' },
    {
      key_id: 1,
      summary: 'Slack連携の疎通テスト',
      description: 'このメッセージが表示されていれば連携は成功しています。',
      issueType: { name: 'タスク' },
      status: { name: '未対応' },
      priority: { name: '中' },
      assignee: { name: '担当 太郎' }
    },
    { name: 'Backlog Webhook' },
    config
  );

  const result = postToSlack(message, target);
  logInfo('診断テスト送信', { target: targetLabel, reason: result.reason, statusCode: result.statusCode });

  return {
    status: result.ok ? 'ok' : 'error',
    target: targetLabel,
    reason: result.reason,
    slackStatusCode: result.statusCode || null,
    slackResponseBody: result.body || null
  };
}

// ===== 6. ヘルパー関数 =====

/**
 * カテゴリに基づいて通知先のSlack Incoming Webhook URLを取得する
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
 * Slack mrkdwn用に特殊文字をエスケープする
 * https://api.slack.com/reference/surfaces/formatting#escaping
 */
function escapeSlackText(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 指定した最大長に切り詰める（超過時は末尾を「…」に置き換える）
 */
function truncate(text, maxLength) {
  const value = (text === null || text === undefined) ? '' : String(text);
  if (value.length <= maxLength) return value;
  return value.slice(0, Math.max(0, maxLength - 1)) + '…';
}

/**
 * 課題のパーマリンクを組み立てる
 */
function buildIssueUrl(backlogUrl, project, content) {
  if (!backlogUrl || !project?.projectKey || !content?.key_id) return '';
  const host = backlogUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return `https://${host}/view/${project.projectKey}-${content.key_id}`;
}

/**
 * イベント種別に応じたSlackメッセージ（Block Kit）を生成する
 */
function createSlackMessage(type, project, content, createdUser, config) {
  switch (type) {
    case CONSTANTS.EVENT_TYPES.ISSUE_CREATED:
      return buildIssueCreatedMessage(project, content, createdUser, config);
    case CONSTANTS.EVENT_TYPES.ISSUE_UPDATED:
      return buildIssueUpdatedMessage(project, content, createdUser, config);
    case CONSTANTS.EVENT_TYPES.COMMENT_ADDED:
      return buildCommentAddedMessage(project, content, createdUser, config);
    default:
      throw new Error(`Unknown event type: ${type}`);
  }
}

/**
 * 全イベント共通のヘッダー・タイトル部を生成する
 */
function buildCommonBlocks(type, project, content, config) {
  const presentation = CONSTANTS.EVENT_PRESENTATION[type];
  const issueUrl = buildIssueUrl(config.backlogUrl, project, content);
  const issueKey = `${project.projectKey}-${content.key_id}`;
  const summary = escapeSlackText(truncate(content.summary, 200));

  const titleText = issueUrl
    ? `*<${issueUrl}|${escapeSlackText(issueKey)}>* ${summary}`
    : `*${escapeSlackText(issueKey)}* ${summary}`;

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: truncate(`${presentation.label}`, CONSTANTS.LIMITS.HEADER_TEXT),
        emoji: true
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: truncate(`${presentation.emoji} ${titleText}`, CONSTANTS.LIMITS.SECTION_TEXT)
      }
    }
  ];
}

/**
 * 課題の属性（プロジェクト・状態・優先度など）をfieldsブロックにまとめる
 */
function buildAttributeFields(project, content, createdUser) {
  const fields = [];

  const push = (label, value) => {
    if (!value) return;
    fields.push({
      type: 'mrkdwn',
      text: truncate(`*${label}*\n${escapeSlackText(value)}`, CONSTANTS.LIMITS.FIELD_TEXT)
    });
  };

  push('プロジェクト', project?.name || project?.projectKey);
  push('種別', content?.issueType?.name);
  push('状態', content?.status?.name);
  push('優先度', content?.priority?.name);
  push('担当者', content?.assignee?.name || '未設定');
  push('登録者', createdUser?.name);

  if (content?.category && content.category.length > 0) {
    push('カテゴリ', content.category.map(cat => cat.name).join(', '));
  }
  if (content?.milestone && content.milestone.length > 0) {
    push('マイルストーン', content.milestone.map(ms => ms.name).join(', '));
  }
  if (content?.dueDate) {
    push('期限日', content.dueDate);
  }

  // Slackのfieldsは最大10要素
  return fields.slice(0, 10);
}

/**
 * 本文・コメントなどの引用ブロックを生成する
 */
function buildQuoteSection(label, text, maxLength) {
  const trimmed = (text === null || text === undefined) ? '' : String(text).trim();
  if (!trimmed) return null;

  const quoted = escapeSlackText(truncate(trimmed, maxLength))
    .split('\n')
    .map(line => `>${line}`)
    .join('\n');

  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: truncate(`*${label}*\n${quoted}`, CONSTANTS.LIMITS.SECTION_TEXT)
    }
  };
}

// 課題作成時のメッセージ
function buildIssueCreatedMessage(project, content, createdUser, config) {
  const blocks = buildCommonBlocks(CONSTANTS.EVENT_TYPES.ISSUE_CREATED, project, content, config);

  const fields = buildAttributeFields(project, content, createdUser);
  if (fields.length > 0) {
    blocks.push({ type: 'section', fields: fields });
  }

  const description = buildQuoteSection('詳細', content.description, CONSTANTS.LIMITS.DESCRIPTION);
  if (description) blocks.push(description);

  return {
    text: buildFallbackText(CONSTANTS.EVENT_TYPES.ISSUE_CREATED, project, content, createdUser, config),
    blocks: blocks
  };
}

// 課題更新時のメッセージ
function buildIssueUpdatedMessage(project, content, createdUser, config) {
  const blocks = buildCommonBlocks(CONSTANTS.EVENT_TYPES.ISSUE_UPDATED, project, content, config);

  const changesText = formatChanges(content.changes, content, project, config);
  if (changesText) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: truncate(`*変更内容*\n${changesText}`, CONSTANTS.LIMITS.SECTION_TEXT)
      }
    });
  }

  const comment = buildQuoteSection('コメント', content?.comment?.content, CONSTANTS.LIMITS.COMMENT);
  if (comment) blocks.push(comment);

  blocks.push(buildContextBlock(project, content, createdUser));

  return {
    text: buildFallbackText(CONSTANTS.EVENT_TYPES.ISSUE_UPDATED, project, content, createdUser, config),
    blocks: blocks
  };
}

// コメント追加時のメッセージ
function buildCommentAddedMessage(project, content, createdUser, config) {
  const blocks = buildCommonBlocks(CONSTANTS.EVENT_TYPES.COMMENT_ADDED, project, content, config);

  const comment = buildQuoteSection('コメント', content?.comment?.content, CONSTANTS.LIMITS.COMMENT);
  if (comment) blocks.push(comment);

  blocks.push(buildContextBlock(project, content, createdUser));

  return {
    text: buildFallbackText(CONSTANTS.EVENT_TYPES.COMMENT_ADDED, project, content, createdUser, config),
    blocks: blocks
  };
}

/**
 * 更新イベントの変更差分を整形する
 * Backlogは status / assignee などの値をIDで送ってくるため、名称に解決してから表示する
 */
function formatChanges(changes, content, project, config) {
  if (!changes || changes.length === 0) return '';

  const projectId = project?.id;

  const lines = changes
    .slice(0, CONSTANTS.LIMITS.CHANGES)
    .map(change => {
      const field = change.field || '';
      const label = escapeSlackText(CONSTANTS.FIELD_LABELS[field] || field || '項目');
      const oldValue = escapeSlackText(truncate(
        resolveChangeValue(field, change.old_value, projectId, config, null), 100));
      const newValue = escapeSlackText(truncate(
        resolveChangeValue(field, change.new_value, projectId, config, content), 100));
      return `• *${label}*: ${oldValue} → ${newValue}`;
    });

  if (changes.length > CONSTANTS.LIMITS.CHANGES) {
    lines.push(`• ほか ${changes.length - CONSTANTS.LIMITS.CHANGES} 件の変更`);
  }

  return lines.join('\n');
}

/**
 * changes の値を表示用の文字列に解決する
 *
 * 1. 空なら「(なし)」
 * 2. 数値ID形式でなければ、すでに名称なのでそのまま返す
 * 3. Backlog API のマスタからID→名称を引く
 * 4. 引けない場合、変更後の値なら content から名称を補完する
 * 5. それも無理ならIDのまま表示する
 *
 * @param {Object|null} content 変更後の値の補完に使うペイロードのcontent（変更前の解決時はnull）
 */
function resolveChangeValue(field, rawValue, projectId, config, content) {
  const raw = (rawValue === null || rawValue === undefined) ? '' : String(rawValue).trim();
  if (!raw) return '(なし)';

  // ID形式（数値、またはカンマ区切りの数値）でなければ既に名称
  if (!/^[0-9]+(,[0-9]+)*$/.test(raw)) return raw;
  if (!CONSTANTS.FIELD_MASTER_PATH[field]) return raw;

  const masterMap = fetchMasterMap(field, projectId, config);
  if (masterMap) {
    const resolved = raw.split(',')
      .map(id => masterMap[id.trim()] || null)
      .filter(name => name !== null);
    if (resolved.length > 0) return resolved.join(', ');
  }

  // 変更後の値は content から名称を補完できる
  if (content) {
    const fromContent = resolveFromContent(field, content);
    if (fromContent) return fromContent;
  }

  return `ID:${raw}`;
}

/**
 * ペイロードのcontentから現在値（＝変更後の値）の名称を取り出す
 */
function resolveFromContent(field, content) {
  const joinNames = list => (list || []).map(item => item.name).filter(Boolean).join(', ');

  switch (field) {
    case 'status': return content?.status?.name || '';
    case 'priority': return content?.priority?.name || '';
    case 'issueType': return content?.issueType?.name || '';
    case 'assignee': return content?.assignee?.name || '';
    case 'resolution': return content?.resolution?.name || '';
    case 'category': return joinNames(content?.category);
    case 'milestone': return joinNames(content?.milestone);
    case 'version': return joinNames(content?.versions);
    default: return '';
  }
}

/**
 * Backlog APIからマスタを取得し {ID: 名称} を返す（6時間キャッシュ）
 * BACKLOG_API_KEY 未設定、または取得失敗時は null を返す
 */
function fetchMasterMap(field, projectId, config) {
  if (!config.backlogApiKey || !config.backlogUrl) return null;

  const template = CONSTANTS.FIELD_MASTER_PATH[field];
  if (!template) return null;
  if (template.indexOf('{projectId}') !== -1 && !projectId) return null;

  const path = template.replace('{projectId}', String(projectId));
  const cacheKey = `backlog_master_${field}_${projectId || 'space'}`;

  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (parseError) {
      // キャッシュが壊れていれば取り直す
    }
  }

  const host = config.backlogUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const url = `https://${host}/api/v2/${path}?apiKey=${encodeURIComponent(config.backlogApiKey)}`;

  try {
    const response = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
    const statusCode = response.getResponseCode();

    if (statusCode !== 200) {
      // APIキーやURLは絶対にログへ出さない
      logWarning('Backlogマスタの取得に失敗しました', { field: field, statusCode: statusCode });
      return null;
    }

    const items = JSON.parse(response.getContentText());
    if (!Array.isArray(items)) return null;

    const map = {};
    items.forEach(item => {
      if (item && item.id !== undefined && item.name) {
        map[String(item.id)] = item.name;
      }
    });

    cache.put(cacheKey, JSON.stringify(map), CONSTANTS.MASTER_CACHE_SECONDS);
    logInfo('Backlogマスタを取得しました', { field: field, count: Object.keys(map).length });
    return map;
  } catch (error) {
    logError('Backlogマスタ取得エラー', error);
    return null;
  }
}

/**
 * 補足情報（状態・担当者・操作者）のcontextブロックを生成する
 */
function buildContextBlock(project, content, createdUser) {
  const parts = [];
  if (content?.status?.name) parts.push(`状態: ${content.status.name}`);
  if (content?.assignee?.name) parts.push(`担当: ${content.assignee.name}`);
  if (createdUser?.name) parts.push(`操作: ${createdUser.name}`);
  if (project?.name || project?.projectKey) parts.push(`プロジェクト: ${project.name || project.projectKey}`);

  return {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: truncate(escapeSlackText(parts.join('  |  ')) || '-', CONSTANTS.LIMITS.CONTEXT_TEXT)
      }
    ]
  };
}

/**
 * 通知バナー・検索用のフォールバックテキストを生成する
 */
function buildFallbackText(type, project, content, createdUser, config) {
  const presentation = CONSTANTS.EVENT_PRESENTATION[type];
  const issueKey = `${project.projectKey}-${content.key_id}`;
  const by = createdUser?.name ? `（${createdUser.name}）` : '';
  return truncate(
    `[${issueKey}] ${presentation.label}: ${content.summary || ''}${by}`,
    CONSTANTS.LIMITS.FALLBACK_TEXT
  );
}

/**
 * Slackへ送信し、結果の詳細を返す
 * @return {{ok: boolean, reason: string, statusCode: (number|undefined), body: (string|undefined)}}
 */
function postToSlack(message, webhookUrl) {
  if (!webhookUrl) {
    return { ok: false, reason: 'NO_WEBHOOK_URL' };
  }

  if (!isValidWebhookUrl(webhookUrl)) {
    return { ok: false, reason: 'INVALID_URL_FORMAT' };
  }

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(message),
    'muteHttpExceptions': true
  };

  try {
    const response = UrlFetchApp.fetch(webhookUrl, options);
    const statusCode = response.getResponseCode();
    const body = response.getContentText();

    if (statusCode === 200 && body === 'ok') {
      return { ok: true, reason: 'OK', statusCode: statusCode, body: body };
    }

    return { ok: false, reason: 'SLACK_ERROR', statusCode: statusCode, body: body };
  } catch (error) {
    return { ok: false, reason: 'FETCH_EXCEPTION', body: error.toString() };
  }
}

/**
 * Slackへの送信（エラーハンドリング付き）
 */
function sendToSlackWithErrorHandling(message, webhookUrl) {
  const result = postToSlack(message, webhookUrl);
  logSlackResult(result);
  return result.ok;
}

/**
 * Slack送信結果をログに出力する
 */
function logSlackResult(result) {
  switch (result.reason) {
    case 'OK':
      logInfo('Slack送信成功', { statusCode: result.statusCode });
      break;
    case 'NO_WEBHOOK_URL':
      logWarning('Webhook URLが設定されていないため、Slackへの送信をスキップします');
      break;
    case 'INVALID_URL_FORMAT':
      logError('Invalid Slack webhook URL format');
      break;
    case 'SLACK_ERROR':
      logError(`Slack送信失敗 (status=${result.statusCode}, body=${result.body})`);
      break;
    default:
      logError(`Slack送信エラー: ${result.body}`);
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
      issues.push(`CATEGORY_MAP のカテゴリID ${categoryId} のURLがSlack Incoming Webhookの形式ではありません`);
    }
  });

  if (config.defaultWebhookUrl && !isValidWebhookUrl(config.defaultWebhookUrl)) {
    issues.push('SLACK_WEBHOOK_URL がSlack Incoming Webhookの形式ではありません');
  }

  if (categoryIds.length === 0 && !config.defaultWebhookUrl) {
    issues.push('CATEGORY_MAP も SLACK_WEBHOOK_URL も未設定のため、通知先がありません');
  }

  if (!config.backlogApiKey) {
    logInfo('BACKLOG_API_KEY が未設定です。課題更新時の「変更前」の値がID表示になります（任意設定）');
  }

  const summary = {
    BACKLOG_URL: config.backlogUrl || '(未設定)',
    BACKLOG_API_KEY: config.backlogApiKey ? '(設定済み)' : '(未設定)',
    SLACK_WEBHOOK_URL: config.defaultWebhookUrl ? '(設定済み)' : '(未設定)',
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
 * サンプルペイロードでメッセージ生成をテストする（Slackへの送信は行わない）
 */
function testWebhookProcessing() {
  const config = loadConfig();

  const samples = [
    {
      label: '課題の追加',
      data: {
        type: 1,
        project: { projectKey: 'TEST', name: 'テストプロジェクト' },
        content: {
          key_id: 123,
          summary: 'テスト課題',
          description: 'これはテスト用の課題説明です。',
          issueType: { name: 'タスク' },
          status: { name: '未対応' },
          priority: { name: '中' },
          assignee: { name: '担当 太郎' },
          category: [{ id: 1695590, name: 'インフラ' }]
        },
        createdUser: { name: 'テストユーザー' }
      }
    },
    {
      label: '課題の更新',
      data: {
        type: 2,
        project: { projectKey: 'TEST', name: 'テストプロジェクト' },
        content: {
          key_id: 123,
          summary: 'テスト課題',
          status: { name: '処理中' },
          assignee: { name: '担当 太郎' },
          comment: { content: '対応を開始しました。' },
          changes: [
            { field: 'status', old_value: '未対応', new_value: '処理中' },
            { field: 'assignee', old_value: '', new_value: '担当 太郎' }
          ],
          category: [{ id: 999999, name: '未登録カテゴリ' }]
        },
        createdUser: { name: 'テストユーザー' }
      }
    },
    {
      label: 'コメントの追加',
      data: {
        type: 3,
        project: { projectKey: 'TEST', name: 'テストプロジェクト' },
        content: {
          key_id: 123,
          summary: 'テスト課題',
          status: { name: '処理中' },
          comment: { content: 'A < B & C > D のような特殊文字を含むコメント' }
        },
        createdUser: { name: 'テストユーザー' }
      }
    }
  ];

  let allPassed = true;

  samples.forEach(sample => {
    try {
      validateWebhookData(sample.data);
      const message = createSlackMessage(
        sample.data.type,
        sample.data.project,
        sample.data.content,
        sample.data.createdUser,
        config
      );
      const webhookUrl = getWebhookUrlForCategories(sample.data.content.category, config);

      logInfo(`テスト成功: ${sample.label}`, {
        fallbackText: message.text,
        blockCount: message.blocks.length,
        webhookUrl: webhookUrl ? '(解決済み)' : '(通知先なし)'
      });
      console.log(`--- ${sample.label} ---\n` + JSON.stringify(message, null, 2));
    } catch (error) {
      logError(`テスト失敗: ${sample.label}`, error);
      allPassed = false;
    }
  });

  return allPassed;
}

/**
 * 実際にSlackへテストメッセージを送信する（既定のSLACK_WEBHOOK_URL宛）
 */
function testSlackNotification() {
  const config = loadConfig();

  if (!config.defaultWebhookUrl) {
    logWarning('SLACK_WEBHOOK_URLが未設定のため送信テストを実行できません');
    return false;
  }

  const message = buildIssueCreatedMessage(
    { projectKey: 'TEST', name: 'テストプロジェクト' },
    {
      key_id: 1,
      summary: 'Slack連携の疎通テスト',
      description: 'このメッセージが表示されていれば連携は成功しています。',
      issueType: { name: 'タスク' },
      status: { name: '未対応' },
      priority: { name: '中' },
      assignee: { name: '担当 太郎' }
    },
    { name: 'Backlog Webhook' },
    config
  );

  return sendToSlackWithErrorHandling(message, config.defaultWebhookUrl);
}
