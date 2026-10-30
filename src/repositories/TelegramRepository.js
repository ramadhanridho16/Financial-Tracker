/**
 * ==========================================================
 * Financial Tracker Pro
 * TelegramRepository.gs
 * ----------------------------------------------------------
 * Komunikasi HTTP dengan Telegram Bot API
 * Tidak mengandung business logic.
 * ==========================================================
 */

/**
 * Mengambil token Telegram Bot aktif.
 *
 * @returns {String}
 */
function getTelegramBotToken() {
  const propertyToken = PropertiesService.getScriptProperties()
    .getProperty("TELEGRAM_BOT_TOKEN");
  if (propertyToken) return propertyToken;

  const settingToken = getSetting("Telegram Bot Token");
  if (settingToken) return settingToken;

  return CONFIG.TELEGRAM.BOT_TOKEN;
}

/**
 * Menghasilkan URL dasar untuk panggilan API Telegram.
 *
 * @returns {String}
 */
function getTelegramApiBaseUrl() {
  const token = getTelegramBotToken();
  if (!token) {
    throw new Error("Token Telegram Bot belum dikonfigurasi.");
  }
  return CONFIG.TELEGRAM.API_URL + token;
}

/**
 * Melakukan panggilan HTTP POST ke Telegram API.
 *
 * @param {String} method
 * @param {Object} [payload]
 * @returns {Object}
 */
function callTelegramApi(method, payload) {
  const url = getTelegramApiBaseUrl() + "/" + method;
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload || {}),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());

  if (!json.ok) {
    logError("Telegram API Error [" + method + "]: " + json.description);
  }

  return json;
}

/**
 * Mengirim pesan teks ke Telegram Chat.
 *
 * @param {String|Number} chatId
 * @param {String} text
 * @param {Object} [options]
 * @returns {Object}
 */
function sendTelegramMessage(chatId, text, options) {
  const payload = Object.assign({
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
    disable_web_page_preview: true
  }, options || {});

  const res = callTelegramApi("sendMessage", payload);
  if (!res.ok && res.description && res.description.indexOf("can't parse entities") !== -1) {
    // Fallback otomatis tanpa parse_mode jika entity markdown tidak valid
    delete payload.parse_mode;
    return callTelegramApi("sendMessage", payload);
  }
  return res;
}

/**
 * Mengambil metadata file di Telegram (termasuk file_path).
 *
 * @param {String} fileId
 * @returns {Object}
 */
function getTelegramFile(fileId) {
  return callTelegramApi("getFile", { file_id: fileId });
}

/**
 * Mengunduh file dari Telegram sebagai Blob.
 *
 * @param {String} filePath
 * @returns {GoogleAppsScript.Base.Blob}
 */
function downloadTelegramFileBlob(filePath) {
  const token = getTelegramBotToken();
  const url = CONFIG.TELEGRAM.FILE_URL + token + "/" + filePath;
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });

  if (response.getResponseCode() !== 200) {
    throw new Error("Gagal mengunduh file Telegram: " + response.getResponseCode());
  }

  return response.getBlob();
}

/**
 * Mendaftarkan Webhook URL ke Telegram.
 *
 * @param {String} webhookUrl
 * @param {String} [secretToken]
 * @returns {Object}
 */
function setTelegramWebhook(webhookUrl, secretToken) {
  const payload = {
    url: webhookUrl,
    drop_pending_updates: true
  };
  if (secretToken) {
    payload.secret_token = secretToken;
  }
  return callTelegramApi("setWebhook", payload);
}

/**
 * Mengambil informasi status Webhook Telegram saat ini.
 *
 * @returns {Object}
 */
function getTelegramWebhookInfo() {
  return callTelegramApi("getWebhookInfo");
}

/**
 * Menghapus pendaftaran Webhook Telegram.
 *
 * @returns {Object}
 */
function deleteTelegramWebhook() {
  return callTelegramApi("deleteWebhook");
}

/**
 * Mendaftarkan daftar menu perintah bot ke Telegram (muncul di popup tombol [/] Menu).
 *
 * @param {Array<{command: string, description: string}>} commandsList
 * @param {Object} [scope] - Opsional (default: default bot command scope)
 * @param {String} [languageCode] - Opsional (misal: "id", "en")
 * @returns {Object} Response API Telegram
 */
function setTelegramMyCommands(commandsList, scope, languageCode) {
  if (!Array.isArray(commandsList)) {
    throw new Error("commandsList harus berupa array perintah.");
  }

  // Format dan validasi sesuai standar Telegram Bot API
  // command: 1-32 karakter, hanya huruf kecil a-z, 0-9, dan underscore _
  // description: 1-256 karakter
  const formattedCommands = commandsList.map(item => {
    let cmd = String(item.command || "").trim().toLowerCase();
    if (cmd.startsWith("/")) cmd = cmd.substring(1);
    cmd = cmd.replace(/[^a-z0-9_]/g, "");

    let desc = String(item.description || "Perintah bot").trim();
    if (desc.length > 256) desc = desc.substring(0, 253) + "...";

    return {
      command: cmd,
      description: desc
    };
  }).filter(item => item.command.length >= 1 && item.command.length <= 32);

  const payload = {
    commands: formattedCommands
  };

  if (scope) {
    payload.scope = scope;
  }
  if (languageCode) {
    payload.language_code = languageCode;
  }

  return callTelegramApi("setMyCommands", payload);
}

/**
 * Mengambil daftar perintah yang saat ini terdaftar di Telegram.
 *
 * @param {Object} [scope]
 * @param {String} [languageCode]
 * @returns {Object}
 */
function getTelegramMyCommands(scope, languageCode) {
  const payload = {};
  if (scope) payload.scope = scope;
  if (languageCode) payload.language_code = languageCode;
  return callTelegramApi("getMyCommands", payload);
}


