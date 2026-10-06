/**
 * ==========================================================
 * Financial Tracker Pro
 * Webhook.gs
 * ----------------------------------------------------------
 * HTTP Endpoint Google Apps Script Web App (doGet & doPost)
 * Standar Testing Webhook & Simulator
 * ==========================================================
 */

/**
 * Endpoint HTTP GET untuk health-check, verifikasi status, dan browser testing.
 *
 * @param {Object} e
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = (params.action || "status").toLowerCase();

  try {
    if (action === "ping") {
      return createJsonResponse({ ok: true, status: "pong", timestamp: new Date() });
    }

    if (action === "webhook_info") {
      const info = getTelegramWebhookInfo();
      return createJsonResponse({ ok: true, webhook: info });
    }

    if (action === "test") {
      const testText = params.text || "Makan siang 25k bca";
      const simResult = simulateTelegramMessage(testText, params.chat_id || 99999999);
      return createJsonResponse({ ok: true, testText: testText, result: simResult });
    }

    return createJsonResponse({
      ok: true,
      app: CONFIG.APP.NAME,
      version: CONFIG.APP.VERSION,
      status: "Active & Listening",
      instructions: "Gunakan POST untuk Telegram Webhook. Gunakan ?action=webhook_info untuk status webhook."
    });
  } catch (error) {
    return createJsonResponse({ ok: false, error: error.message });
  }
}

/**
 * Endpoint HTTP POST untuk menerima update webhook dari Telegram.
 *
 * @param {Object} e
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ ok: false, reason: "No post data received" });
    }

    const update = JSON.parse(e.postData.contents);
    const result = handleTelegramUpdate(update);

    return createJsonResponse({ ok: true, result: result });
  } catch (error) {
    logError("Webhook doPost Error: " + error.message);
    return createJsonResponse({ ok: false, error: error.message });
  }
}

/**
 * Membungkus payload menjadi TextOutput JSON standar.
 *
 * @param {Object} data
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Menyimulasikan pesan teks Telegram untuk pengujian menu spreadsheet/editor.
 *
 * @param {String} text
 * @param {Number|String} [chatId]
 * @returns {Object}
 */
function simulateTelegramMessage(text, chatId) {
  const id = chatId || 1001;
  const mockUpdate = {
    update_id: Math.floor(Math.random() * 100000),
    message: {
      message_id: Math.floor(Math.random() * 1000),
      from: { id: id, first_name: "Tester" },
      chat: { id: id, type: "private" },
      date: Math.floor(Date.now() / 1000),
      text: text
    }
  };

  return handleTelegramUpdate(mockUpdate);
}

/**
 * Menyimulasikan pemrosesan struk gambar dari file ID Google Drive.
 *
 * @param {String} fileId
 * @returns {Object}
 */
function simulateReceiptOcrFromFile(fileId) {
  const file = DriveApp.getFileById(fileId);
  const blob = file.getBlob();
  return processReceiptImage(blob);
}

