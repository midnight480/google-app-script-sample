// Gmail で受信したメールを From / To で絞り込み、本文から指定した項目を抜き出して
// Slack に通知し、スプレッドシートにも記録するスクリプト

// ========================================
// 1. 定数定義
// ========================================
const CONSTANTS = {
  // スクリプトプロパティのキー
  PROPERTY_KEYS: {
    FROM_ADDRESSES: 'FROM_ADDRESSES',
    TO_ADDRESSES: 'TO_ADDRESSES',
    EXTRACT_FIELDS: 'EXTRACT_FIELDS',
    SLACK_BOT_TOKEN: 'SLACK_BOT_TOKEN',
    SLACK_CHANNEL_ID: 'SLACK_CHANNEL_ID',
    SPREADSHEET_ID: 'SPREADSHEET_ID',
    LAST_PROCESSED_AT: 'LAST_PROCESSED_AT',
    LAST_PROCESSED_IDS: 'LAST_PROCESSED_IDS'
  },

  // initializeConfig で入れる仮の値（このままでは動かないことを checkConfiguration で検出する）
  PLACEHOLDERS: {
    FROM_ADDRESSES: 'sender@example.com',
    EXTRACT_FIELDS: '[{"name":"都道府県","label":"都道府県"},{"name":"年齢","label":"年齢"}]',
    SLACK_BOT_TOKEN: 'xoxb-XXXX',
    SLACK_CHANNEL_ID: 'C0123456789'
  },

  // 実行の設定
  TRIGGER_FUNCTION: 'main',
  TRIGGER_INTERVAL_MINUTES: 5,
  MAX_MESSAGES_PER_RUN: 20,
  MAX_SEARCH_THREADS: 50,
  LOCK_WAIT_MS: 10000,
  PREVIEW_SEARCH_PERIOD: '30d',

  // 抽出・表示
  NOT_FOUND_TEXT: '（なし）',
  SLACK_HEADER_MAX_LENGTH: 150,
  SLACK_FIELD_MAX_LENGTH: 1900,
  SLACK_FIELDS_PER_SECTION: 10,
  GMAIL_URL_BASE: 'https://mail.google.com/mail/u/0/#all/',
  DATE_FORMAT: 'yyyy/MM/dd HH:mm:ss',

  // スプレッドシート
  SPREADSHEET_TITLE: 'gmail-to-slack-with-filtering 通知履歴',
  SHEET_NAME: '通知履歴',
  STATUS_SUCCESS: '成功',
  STATUS_FAILURE: '失敗',
  FIXED_HEADERS: {
    RECORDED_AT: '記録日時',
    RECEIVED_AT: '受信日時',
    SUBJECT: '件名',
    FROM: 'From',
    TO: 'To',
    SLACK_STATUS: 'Slack送信',
    GMAIL_LINK: 'Gmailリンク',
    MESSAGE_ID: 'メールID'
  }
};

// ========================================
// 2. ログ関数
// ========================================
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
    error: error ? (error.stack || error.toString()) : null
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

// ========================================
// 3. バリデーション関数
// ========================================

/**
 * メールアドレスとして妥当か（厳密なRFC準拠ではなく、設定ミスの検出が目的）
 */
function isValidEmailAddress(address) {
  return typeof address === 'string' && /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(address);
}

function isValidSlackToken(token) {
  return typeof token === 'string' &&
         token !== CONSTANTS.PLACEHOLDERS.SLACK_BOT_TOKEN &&
         token.startsWith('xoxb-');
}

function isValidSlackChannelId(channelId) {
  return typeof channelId === 'string' &&
         channelId !== CONSTANTS.PLACEHOLDERS.SLACK_CHANNEL_ID &&
         /^[CGD][A-Z0-9]{8,}$/.test(channelId);
}

/**
 * EXTRACT_FIELDS の中身を検証する
 * @param {*} fields JSON.parse 済みの値
 * @return {string[]} エラーメッセージの一覧（空なら妥当）
 */
function validateExtractFields(fields) {
  const errors = [];
  if (!Array.isArray(fields) || fields.length === 0) {
    errors.push('EXTRACT_FIELDS は1件以上の配列にしてください（例: [{"name":"都道府県","label":"都道府県"}]）');
    return errors;
  }

  const fixedHeaders = Object.values(CONSTANTS.FIXED_HEADERS);
  const names = new Set();
  fields.forEach((field, index) => {
    const position = `${index + 1}件目`;
    if (!field || typeof field !== 'object') {
      errors.push(`${position}: {"name":"...","label":"..."} の形にしてください`);
      return;
    }
    const name = typeof field.name === 'string' ? field.name.trim() : '';
    const label = typeof field.label === 'string' ? field.label.trim() : '';
    if (!name) errors.push(`${position}: name（Slack・シートでの表示名）が空です`);
    if (!label) errors.push(`${position}: label（メール本文の項目名）が空です`);
    if (name && names.has(name)) errors.push(`${position}: name「${name}」が重複しています`);
    if (name && fixedHeaders.includes(name)) errors.push(`${position}: name「${name}」はシートの固定列と同じ名前のため使えません`);
    if (name) names.add(name);
  });
  return errors;
}

/**
 * 設定全体を検証する
 * @return {string[]} エラーメッセージの一覧（空なら妥当）
 */
function validateConfig(config) {
  const errors = [];

  if (config.fromAddresses.length === 0) {
    errors.push('FROM_ADDRESSES が未設定です');
  } else if (config.fromAddresses.includes(CONSTANTS.PLACEHOLDERS.FROM_ADDRESSES)) {
    errors.push('FROM_ADDRESSES が仮の値（sender@example.com）のままです');
  }
  config.fromAddresses.concat(config.toAddresses).forEach(address => {
    if (!isValidEmailAddress(address)) errors.push(`メールアドレスの形式が正しくありません: ${address}`);
  });

  if (config.extractFieldsError) {
    errors.push(config.extractFieldsError);
  } else {
    errors.push(...validateExtractFields(config.extractFields));
  }

  if (!isValidSlackToken(config.slackBotToken)) {
    errors.push('SLACK_BOT_TOKEN が未設定、または xoxb- で始まっていません');
  }
  if (!isValidSlackChannelId(config.slackChannelId)) {
    errors.push('SLACK_CHANNEL_ID が未設定、または形式が正しくありません（例: C0123456789。チャンネル名ではなくIDを設定します）');
  }
  return errors;
}

// ========================================
// 4. 設定初期化
// ========================================

/**
 * 必須のスクリプトプロパティに仮の値を入れる（未設定のものだけ）
 * GASエディタの「プロジェクトの設定」に項目が並ぶので、値を書き換えるだけで設定できる
 */
function initializeConfig() {
  const properties = PropertiesService.getScriptProperties();
  const added = [];
  Object.entries(CONSTANTS.PLACEHOLDERS).forEach(([key, value]) => {
    if (!properties.getProperty(key)) {
      properties.setProperty(key, value);
      added.push(key);
    }
  });
  logInfo('スクリプトプロパティを初期化しました', { added: added });
}

/**
 * カンマ区切りのアドレス一覧を配列にする（小文字・空要素除去）
 */
function parseAddressList(value) {
  return String(value || '')
    .split(/[,、\s]+/)
    .map(address => address.trim().toLowerCase())
    .filter(address => address !== '');
}

function loadConfig() {
  const properties = PropertiesService.getScriptProperties();
  const keys = CONSTANTS.PROPERTY_KEYS;

  let extractFields = [];
  let extractFieldsError = null;
  const rawFields = properties.getProperty(keys.EXTRACT_FIELDS);
  if (!rawFields) {
    extractFieldsError = 'EXTRACT_FIELDS が未設定です';
  } else {
    try {
      extractFields = JSON.parse(rawFields);
    } catch (error) {
      extractFieldsError = `EXTRACT_FIELDS の JSON が読み取れません（カンマや " の過不足を確認してください）: ${error.message}`;
    }
  }

  return {
    fromAddresses: parseAddressList(properties.getProperty(keys.FROM_ADDRESSES)),
    toAddresses: parseAddressList(properties.getProperty(keys.TO_ADDRESSES)),
    extractFields: Array.isArray(extractFields)
      ? extractFields.map(field => ({
          name: String((field && field.name) || '').trim(),
          label: String((field && field.label) || '').trim()
        }))
      : extractFields,
    extractFieldsError: extractFieldsError,
    slackBotToken: properties.getProperty(keys.SLACK_BOT_TOKEN) || '',
    slackChannelId: (properties.getProperty(keys.SLACK_CHANNEL_ID) || '').trim(),
    spreadsheetId: (properties.getProperty(keys.SPREADSHEET_ID) || '').trim()
  };
}

/**
 * 処理済みの位置（最後に処理した受信日時と、その時刻に処理したメールID）を読む
 * @return {{at: number, ids: string[]}|null} 未設定なら null（初回）
 */
function loadProcessedState() {
  const properties = PropertiesService.getScriptProperties();
  const at = Number(properties.getProperty(CONSTANTS.PROPERTY_KEYS.LAST_PROCESSED_AT));
  if (!at) return null;

  let ids = [];
  try {
    ids = JSON.parse(properties.getProperty(CONSTANTS.PROPERTY_KEYS.LAST_PROCESSED_IDS) || '[]');
  } catch (error) {
    logWarning('LAST_PROCESSED_IDS を読み取れないため空として扱います', { error: error.message });
  }
  return { at: at, ids: Array.isArray(ids) ? ids : [] };
}

function saveProcessedState(state) {
  PropertiesService.getScriptProperties().setProperties({
    [CONSTANTS.PROPERTY_KEYS.LAST_PROCESSED_AT]: String(state.at),
    [CONSTANTS.PROPERTY_KEYS.LAST_PROCESSED_IDS]: JSON.stringify(state.ids)
  });
}

// ========================================
// 5. メイン処理関数
// ========================================

/**
 * 時間主導トリガーから呼ばれるメイン処理
 */
function main() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CONSTANTS.LOCK_WAIT_MS)) {
    logWarning('前回の処理が実行中のためスキップします');
    return;
  }

  try {
    const config = loadConfig();
    const errors = validateConfig(config);
    if (errors.length > 0) {
      logError('設定に誤りがあるため処理を中止します', new Error(errors.join(' / ')));
      return;
    }

    const state = loadProcessedState();
    if (!state) {
      // 初回は過去のメールを通知せず、今の時刻を起点にする
      saveProcessedState({ at: Date.now(), ids: [] });
      logInfo('初回実行のため、現在時刻を処理済みの起点として記録しました（過去のメールは通知しません）');
      return;
    }

    const messages = findTargetMessages(config, state);
    logInfo('対象メールを検索しました', { count: messages.length });

    let processedCount = 0;
    for (const message of messages) {
      const success = processMessage(message, config);
      if (!success) {
        // 失敗したメール以降は処理済みにせず、次回の実行で再試行する
        logWarning('Slack送信に失敗したため、このメール以降は次回に再試行します', { messageId: message.getId() });
        break;
      }
      advanceProcessedState(state, message);
      saveProcessedState(state);
      processedCount++;
    }

    logInfo('処理が完了しました', { processed: processedCount, found: messages.length });
  } catch (error) {
    logError('メイン処理でエラーが発生しました', error);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 1通のメールを抽出・通知・記録する
 * @return {boolean} Slack送信に成功したか
 */
function processMessage(message, config) {
  const mail = toMailData(message);
  const extracted = extractFields(mail.body, config.extractFields);
  const foundCount = extracted.filter(item => item.found).length;
  logInfo('項目を抽出しました', {
    messageId: mail.id,
    found: foundCount,
    total: extracted.length,
    missing: extracted.filter(item => !item.found).map(item => item.name)
  });

  const slackMessage = createSlackMessage(mail, extracted);
  const success = sendToSlack(slackMessage, config);

  recordToSpreadsheet(mail, extracted, success, config);
  return success;
}

// ========================================
// 6. ヘルパー関数
// ========================================

// ---- メールの検索・判定 ----

/**
 * 文字列からメールアドレスだけを取り出す（「表示名 <addr>」形式や複数指定に対応）
 */
function extractEmailAddresses(headerValue) {
  const matches = String(headerValue || '').match(/[^\s<>,;"'()]+@[^\s<>,;"'()]+/g);
  return matches ? matches.map(address => address.toLowerCase()) : [];
}

/**
 * From / To の条件に一致するか
 * To の条件が空なら From だけで判定する
 */
function matchesAddressFilter(fromHeader, toHeader, fromAddresses, toAddresses) {
  const fromList = extractEmailAddresses(fromHeader);
  if (!fromList.some(address => fromAddresses.includes(address))) return false;
  if (toAddresses.length === 0) return true;

  const toList = extractEmailAddresses(toHeader);
  return toList.some(address => toAddresses.includes(address));
}

/**
 * Gmail の検索クエリを作る（候補の絞り込み用。最終判定は matchesAddressFilter で行う）
 */
function buildSearchQuery(config, afterEpochSeconds) {
  const parts = [`from:(${config.fromAddresses.join(' OR ')})`];
  if (config.toAddresses.length > 0) {
    parts.push(`to:(${config.toAddresses.join(' OR ')})`);
  }
  if (afterEpochSeconds) {
    parts.push(`after:${afterEpochSeconds}`);
  }
  return parts.join(' ');
}

/**
 * まだ処理していない対象メールを、受信日時の古い順に返す
 */
function findTargetMessages(config, state) {
  // after: は秒単位のため、境界のメールを落とさないよう1秒手前から検索し、ここで厳密に判定する
  const query = buildSearchQuery(config, Math.floor(state.at / 1000) - 1);
  const threads = GmailApp.search(query, 0, CONSTANTS.MAX_SEARCH_THREADS);

  const messages = [];
  threads.forEach(thread => {
    thread.getMessages().forEach(message => {
      const time = message.getDate().getTime();
      if (time < state.at) return;
      if (time === state.at && state.ids.includes(message.getId())) return;
      if (!matchesAddressFilter(message.getFrom(), message.getTo(), config.fromAddresses, config.toAddresses)) return;
      messages.push(message);
    });
  });

  messages.sort((a, b) => a.getDate().getTime() - b.getDate().getTime());
  if (messages.length > CONSTANTS.MAX_MESSAGES_PER_RUN) {
    logInfo('件数が多いため、残りは次回に処理します', {
      found: messages.length,
      limit: CONSTANTS.MAX_MESSAGES_PER_RUN
    });
  }
  return messages.slice(0, CONSTANTS.MAX_MESSAGES_PER_RUN);
}

/**
 * 処理済みの位置をこのメールまで進める
 */
function advanceProcessedState(state, message) {
  const time = message.getDate().getTime();
  if (time === state.at) {
    state.ids.push(message.getId());
  } else {
    state.at = time;
    state.ids = [message.getId()];
  }
}

/**
 * GmailMessage を通知・記録に使う形に変換する
 */
function toMailData(message) {
  const id = message.getId();
  return {
    id: id,
    subject: message.getSubject() || '（件名なし）',
    from: message.getFrom(),
    to: message.getTo(),
    date: message.getDate(),
    body: message.getPlainBody(),
    url: CONSTANTS.GMAIL_URL_BASE + id
  };
}

// ---- 項目の抽出 ----

/**
 * 項目名の比較用に正規化する（前後の空白除去・連続する空白や改行を1つの半角スペースに・末尾のコロン除去）
 */
function normalizeLabel(text) {
  return String(text || '')
    .replace(/[\s　]+/g, ' ')
    .trim()
    .replace(/\s*[:：]$/, '');
}

/**
 * 本文から指定した項目の値を抜き出す
 *
 * 項目ごとに次の順で探す。
 *   1. 1行形式  : 「項目名: 値」「項目名：値」の行
 *   2. 段落形式 : 項目名だけの段落の、次の段落を値とする（段落 = 空行で区切られたかたまり）
 * 段落形式で、次の段落が別の登録済み項目名なら未回答とみなす。
 *
 * @param {string} body メールのプレーンテキスト本文
 * @param {{name: string, label: string}[]} fields 抽出項目
 * @return {{name: string, label: string, value: string, found: boolean}[]}
 */
function extractFields(body, fields) {
  const text = String(body || '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const paragraphs = text
    .split(/\n[ \t　]*\n/)
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph !== '');
  const normalizedParagraphs = paragraphs.map(normalizeLabel);
  const registeredLabels = new Set(fields.map(field => normalizeLabel(field.label)));

  return fields.map(field => {
    const label = normalizeLabel(field.label);
    const value = findInlineValue(lines, label) ||
                  findParagraphValue(paragraphs, normalizedParagraphs, label, registeredLabels);
    return {
      name: field.name,
      label: field.label,
      value: value || CONSTANTS.NOT_FOUND_TEXT,
      found: Boolean(value)
    };
  });
}

/**
 * 1行形式（項目名: 値）で探す
 */
function findInlineValue(lines, label) {
  for (const line of lines) {
    const match = line.match(/^(.+?)[:：](.*)$/);
    if (!match) continue;
    const value = match[2].trim();
    if (value && normalizeLabel(match[1]) === label) return value;
  }
  return '';
}

/**
 * 段落形式（項目名の段落 → 次の段落が値）で探す
 */
function findParagraphValue(paragraphs, normalizedParagraphs, label, registeredLabels) {
  const index = normalizedParagraphs.indexOf(label);
  if (index === -1 || index + 1 >= paragraphs.length) return '';

  // 次の段落が別の項目名なら、この項目は未回答
  if (registeredLabels.has(normalizedParagraphs[index + 1])) return '';
  return paragraphs[index + 1];
}

// ---- Slack ----

/**
 * Slack の mrkdwn で特別な意味を持つ文字をエスケープする
 */
function escapeSlackText(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function truncate(text, maxLength) {
  const value = String(text);
  return value.length > maxLength ? value.slice(0, maxLength - 1) + '…' : value;
}

function formatDate(date) {
  return Utilities.formatDate(date, 'Asia/Tokyo', CONSTANTS.DATE_FORMAT);
}

/**
 * Block Kit のメッセージを作る
 * @return {{text: string, blocks: Object[]}}
 */
function createSlackMessage(mail, extracted) {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: truncate(mail.subject, CONSTANTS.SLACK_HEADER_MAX_LENGTH), emoji: true }
    }
  ];

  // section の fields は1ブロック10個までのため分割する
  for (let i = 0; i < extracted.length; i += CONSTANTS.SLACK_FIELDS_PER_SECTION) {
    blocks.push({
      type: 'section',
      fields: extracted.slice(i, i + CONSTANTS.SLACK_FIELDS_PER_SECTION).map(item => ({
        type: 'mrkdwn',
        text: truncate(`*${escapeSlackText(item.name)}*\n${escapeSlackText(item.value)}`, CONSTANTS.SLACK_FIELD_MAX_LENGTH)
      }))
    });
  }

  blocks.push({
    type: 'context',
    elements: [
      { type: 'mrkdwn', text: `受信日時: ${formatDate(mail.date)}` }
    ]
  });
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Gmailで開く', emoji: true },
        url: mail.url
      }
    ]
  });

  return {
    text: `新しいメール: ${mail.subject}`,
    blocks: blocks
  };
}

/**
 * Slack に送信する
 * @return {boolean} 成功したか
 */
function sendToSlack(slackMessage, config) {
  try {
    const slackApp = SlackApp.create(config.slackBotToken);
    const result = slackApp.postMessage(config.slackChannelId, slackMessage.text, {
      blocks: JSON.stringify(slackMessage.blocks)
    });

    if (result && result.ok) {
      logInfo('Slack送信に成功しました', { channel: config.slackChannelId });
      return true;
    }
    logError('Slack送信に失敗しました', new Error(`Slack API error: ${result ? result.error : 'no response'}`));
    return false;
  } catch (error) {
    logError('Slack送信でエラーが発生しました', error);
    return false;
  }
}

// ---- スプレッドシート ----

/**
 * 記録先のシートを取得する。スプレッドシートやシートがなければ作る
 */
function getOrCreateSheet(config) {
  let spreadsheet;
  if (config.spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create(CONSTANTS.SPREADSHEET_TITLE);
    // 新規作成時の「シート1」をそのまま記録用に使う
    spreadsheet.getSheets()[0].setName(CONSTANTS.SHEET_NAME);
    PropertiesService.getScriptProperties().setProperty(CONSTANTS.PROPERTY_KEYS.SPREADSHEET_ID, spreadsheet.getId());
    config.spreadsheetId = spreadsheet.getId();
    logInfo('記録用のスプレッドシートを作成しました', { url: spreadsheet.getUrl() });
  }

  let sheet = spreadsheet.getSheetByName(CONSTANTS.SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONSTANTS.SHEET_NAME);
    logInfo('シートを作成しました', { sheet: CONSTANTS.SHEET_NAME });
  }
  return sheet;
}

/**
 * 見出し行を整える。足りない列は右端に追加し、既存の列は動かさない
 * @return {string[]} 整えた後の見出し
 */
function ensureHeaders(sheet, fieldNames) {
  const lastColumn = sheet.getLastColumn();
  const headers = lastColumn > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String)
    : [];

  const required = Object.values(CONSTANTS.FIXED_HEADERS).concat(fieldNames);
  const missing = required.filter(name => !headers.includes(name));
  if (missing.length > 0) {
    sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
    sheet.setFrozenRows(1);
    logInfo('見出しに列を追加しました', { added: missing });
  }
  return headers.concat(missing);
}

/**
 * セルに書く値を整える。= + - @ で始まる文字列は数式として扱われないよう先頭に ' を付ける
 */
function toCellValue(value) {
  if (value instanceof Date) return value;
  const text = String(value === undefined || value === null ? '' : value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

/**
 * メールID が同じ行があれば更新し、なければ末尾に追加する
 */
function appendOrUpdateRecord(sheet, headers, record) {
  const row = headers.map(header => toCellValue(Object.prototype.hasOwnProperty.call(record, header) ? record[header] : ''));
  const idColumn = headers.indexOf(CONSTANTS.FIXED_HEADERS.MESSAGE_ID) + 1;

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const found = sheet.getRange(2, idColumn, lastRow - 1, 1)
      .createTextFinder(record[CONSTANTS.FIXED_HEADERS.MESSAGE_ID])
      .matchEntireCell(true)
      .findNext();
    if (found) {
      sheet.getRange(found.getRow(), 1, 1, row.length).setValues([row]);
      return 'updated';
    }
  }
  sheet.appendRow(row);
  return 'appended';
}

/**
 * 通知した内容をスプレッドシートに記録する。失敗しても通知処理は止めない
 */
function recordToSpreadsheet(mail, extracted, slackSuccess, config) {
  try {
    const sheet = getOrCreateSheet(config);
    const headers = ensureHeaders(sheet, extracted.map(item => item.name));

    const h = CONSTANTS.FIXED_HEADERS;
    const record = {
      [h.RECORDED_AT]: new Date(),
      [h.RECEIVED_AT]: mail.date,
      [h.SUBJECT]: mail.subject,
      [h.FROM]: mail.from,
      [h.TO]: mail.to,
      [h.SLACK_STATUS]: slackSuccess ? CONSTANTS.STATUS_SUCCESS : CONSTANTS.STATUS_FAILURE,
      [h.GMAIL_LINK]: mail.url,
      [h.MESSAGE_ID]: mail.id
    };
    extracted.forEach(item => {
      record[item.name] = item.value;
    });

    const result = appendOrUpdateRecord(sheet, headers, record);
    logInfo('スプレッドシートに記録しました', { messageId: mail.id, result: result });
  } catch (error) {
    logWarning('スプレッドシートへの記録に失敗しました（Slack通知は続行します）', {
      messageId: mail.id,
      error: error.toString()
    });
  }
}

// ---- トリガー ----

/**
 * 5分ごとに main を実行するトリガーを作る（既存の main のトリガーは作り直す）
 */
function createTrigger() {
  deleteTriggers();
  ScriptApp.newTrigger(CONSTANTS.TRIGGER_FUNCTION)
    .timeBased()
    .everyMinutes(CONSTANTS.TRIGGER_INTERVAL_MINUTES)
    .create();
  logInfo('トリガーを作成しました', {
    function: CONSTANTS.TRIGGER_FUNCTION,
    intervalMinutes: CONSTANTS.TRIGGER_INTERVAL_MINUTES
  });
}

/**
 * main のトリガーをすべて削除する（通知を止めたいとき）
 */
function deleteTriggers() {
  const triggers = ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === CONSTANTS.TRIGGER_FUNCTION);
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  logInfo('トリガーを削除しました', { count: triggers.length });
}

// ========================================
// 7. テスト関数
// ========================================

/**
 * 設定を確認する（最初に実行する）
 */
function checkConfiguration() {
  const config = loadConfig();
  const errors = validateConfig(config);

  logInfo('設定の確認', {
    fromAddresses: config.fromAddresses,
    toAddresses: config.toAddresses.length > 0 ? config.toAddresses : '（未設定: From だけで判定）',
    extractFields: Array.isArray(config.extractFields) ? config.extractFields.map(field => field.name) : config.extractFields,
    slackBotToken: config.slackBotToken ? `${config.slackBotToken.slice(0, 5)}...（設定済み）` : '（未設定）',
    slackChannelId: config.slackChannelId || '（未設定）',
    spreadsheetId: config.spreadsheetId || '（未設定: 初回の記録時に自動作成）',
    lastProcessedAt: (() => {
      const state = loadProcessedState();
      return state ? formatDate(new Date(state.at)) : '（未設定: 次回の実行が初回扱い）';
    })(),
    searchQuery: config.fromAddresses.length > 0 ? buildSearchQuery(config) : '（FROM_ADDRESSES 未設定）',
    triggers: ScriptApp.getProjectTriggers()
      .filter(trigger => trigger.getHandlerFunction() === CONSTANTS.TRIGGER_FUNCTION).length
  });

  if (errors.length > 0) {
    errors.forEach(error => logWarning('設定エラー', { detail: error }));
    return false;
  }
  logInfo('設定に問題はありません');
  return true;
}

/**
 * 条件に合う最新のメールで抽出結果を確認する（Slack には送らない・シートにも書かない）
 * EXTRACT_FIELDS の項目名が合っているかを確かめるために使う
 */
function previewExtraction() {
  const config = loadConfig();
  if (config.fromAddresses.length === 0) {
    logWarning('FROM_ADDRESSES を設定してから実行してください');
    return;
  }
  if (config.extractFieldsError) {
    logWarning('EXTRACT_FIELDS を確認してください', { detail: config.extractFieldsError });
    return;
  }

  const query = `${buildSearchQuery(config)} newer_than:${CONSTANTS.PREVIEW_SEARCH_PERIOD}`;
  const threads = GmailApp.search(query, 0, CONSTANTS.MAX_SEARCH_THREADS);
  let latest = null;
  threads.forEach(thread => {
    thread.getMessages().forEach(message => {
      if (!matchesAddressFilter(message.getFrom(), message.getTo(), config.fromAddresses, config.toAddresses)) return;
      if (!latest || message.getDate() > latest.getDate()) latest = message;
    });
  });

  if (!latest) {
    logWarning('条件に合うメールが見つかりませんでした', { query: query });
    return;
  }

  const mail = toMailData(latest);
  const extracted = extractFields(mail.body, config.extractFields);

  // 実行した本人だけが見る確認用のため、抽出した値もそのまま表示する
  console.log(`件名: ${mail.subject}\n受信日時: ${formatDate(mail.date)}\n`);
  extracted.forEach(item => {
    console.log(`${item.found ? '✅' : '❌'} ${item.name}（項目名: ${item.label}）\n    → ${item.value}`);
  });
  const missing = extracted.filter(item => !item.found);
  if (missing.length > 0) {
    console.log('\n❌ の項目は見つかりませんでした。メール本文の項目名と label が一字一句同じか確認してください。');
  }
}

/**
 * 抽出ロジックをダミーの本文で確認する
 */
function testExtractFields() {
  const fields = [
    { name: '会社名', label: '会社名' },
    { name: '氏名', label: 'お名前' },
    { name: '都道府県', label: '都道府県' },
    { name: '年齢', label: '年齢' },
    { name: 'コメント', label: '【フリーコメント】ご自由にお書きください' },
    { name: '同意', label: 'プライバシーポリシーに同意いただけますか？' },
    { name: '電話番号', label: '電話番号' }
  ];

  const cases = [
    {
      title: '1行形式',
      body: '会社名: サンプル株式会社\nお名前：山田 太郎\n都道府県 : 東京都\n',
      expected: { '会社名': 'サンプル株式会社', '氏名': '山田 太郎', '都道府県': '東京都', '電話番号': CONSTANTS.NOT_FOUND_TEXT }
    },
    {
      title: '段落形式',
      body: 'イベントへの新しい申し込み\r\n\r\nお名前\r\n\r\n山田 太郎\r\n\r\n年齢\r\n\r\n20歳以上\r\n\r\n都道府県\r\n\r\n東京都\r\n\r\n' +
            '【フリーコメント】ご自由にお書きください\r\n\r\nよろしくお願いします\r\n\r\nプライバシーポリシーに同意いただけますか？\r\n\r\n同意する\r\n',
      expected: { '氏名': '山田 太郎', '年齢': '20歳以上', '都道府県': '東京都', 'コメント': 'よろしくお願いします', '同意': '同意する' }
    },
    {
      title: '段落形式（未回答の項目がある）',
      body: '都道府県\n\n大阪府\n\n【フリーコメント】ご自由にお書きください\n\nプライバシーポリシーに同意いただけますか？\n\n同意する\n',
      expected: { '都道府県': '大阪府', 'コメント': CONSTANTS.NOT_FOUND_TEXT, '同意': '同意する' }
    },
    {
      title: '数式に見える値',
      body: '電話番号: +81-90-0000-0000\n',
      expected: { '電話番号': '+81-90-0000-0000' }
    }
  ];

  let failed = 0;
  cases.forEach(testCase => {
    const result = extractFields(testCase.body, fields);
    Object.entries(testCase.expected).forEach(([name, expected]) => {
      const actual = result.find(item => item.name === name).value;
      if (actual === expected) {
        logInfo(`✅ ${testCase.title}: ${name}`);
      } else {
        failed++;
        logError(`❌ ${testCase.title}: ${name}`, new Error(`expected "${expected}" but got "${actual}"`));
      }
    });
  });

  const addressCases = [
    { from: 'Sender <info@example.com>', to: 'me@example.com', fromList: ['info@example.com'], toList: [], expected: true },
    { from: 'Sender <INFO@example.com>', to: 'other@example.com', fromList: ['info@example.com'], toList: ['me@example.com'], expected: false },
    { from: 'info@example.com', to: '"Team" <team@example.com>, me@example.com', fromList: ['info@example.com'], toList: ['me@example.com'], expected: true },
    { from: 'someone@example.com', to: 'me@example.com', fromList: ['info@example.com'], toList: [], expected: false }
  ];
  addressCases.forEach((testCase, index) => {
    const actual = matchesAddressFilter(testCase.from, testCase.to, testCase.fromList, testCase.toList);
    if (actual === testCase.expected) {
      logInfo(`✅ アドレス判定 ${index + 1}`);
    } else {
      failed++;
      logError(`❌ アドレス判定 ${index + 1}`, new Error(`expected ${testCase.expected} but got ${actual}`));
    }
  });

  if (failed === 0) {
    logInfo('抽出ロジックのテストはすべて成功しました');
  } else {
    logError(`抽出ロジックのテストで ${failed} 件失敗しました`);
  }
  return failed === 0;
}

/**
 * ダミーのデータで Slack への送信とスプレッドシートへの記録を確認する
 */
function testSlackNotification() {
  const config = loadConfig();
  const errors = validateConfig(config);
  if (errors.length > 0) {
    errors.forEach(error => logWarning('設定エラー', { detail: error }));
    return;
  }

  const mail = {
    id: `test-${Date.now()}`,
    subject: '【テスト】gmail-to-slack-with-filtering の通知確認',
    from: config.fromAddresses[0],
    to: config.toAddresses[0] || '',
    date: new Date(),
    body: '',
    url: CONSTANTS.GMAIL_URL_BASE
  };
  const extracted = config.extractFields.map(field => ({
    name: field.name,
    label: field.label,
    value: `（テスト値: ${field.name}）`,
    found: true
  }));

  const success = sendToSlack(createSlackMessage(mail, extracted), config);
  recordToSpreadsheet(mail, extracted, success, config);
  logInfo('テスト送信が終わりました', { slack: success ? '成功' : '失敗' });
}

/**
 * 記録用のスプレッドシートを用意し、URL を表示する
 */
function setupSpreadsheet() {
  const config = loadConfig();
  const sheet = getOrCreateSheet(config);
  if (Array.isArray(config.extractFields)) {
    ensureHeaders(sheet, config.extractFields.map(field => field.name).filter(name => name));
  }
  logInfo('記録用のスプレッドシート', { url: sheet.getParent().getUrl(), sheet: sheet.getName() });
}

/**
 * 処理済みの位置を消す（次回の実行が初回扱いになり、それ以降に届いたメールから通知する）
 */
function resetLastProcessedAt() {
  const properties = PropertiesService.getScriptProperties();
  properties.deleteProperty(CONSTANTS.PROPERTY_KEYS.LAST_PROCESSED_AT);
  properties.deleteProperty(CONSTANTS.PROPERTY_KEYS.LAST_PROCESSED_IDS);
  logInfo('処理済みの位置をリセットしました');
}
