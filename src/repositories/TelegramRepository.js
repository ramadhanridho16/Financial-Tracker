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

  return callTelegramApi("sendMessage", payload);
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
  const payload = { url: webhookUrl };
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

