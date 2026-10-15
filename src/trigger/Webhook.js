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

    if (action === "set_webhook") {
      const deployUrl = params.url || (CONFIG.TELEGRAM.API_URL ? ScriptApp.getService().getUrl() : "");
      const res = setTelegramWebhook(deployUrl);
      return createJsonResponse({ ok: true, result: res, registeredUrl: deployUrl });
    }

    if (action === "test") {
      const testText = params.text || "Makan siang 25k bca";
      const simResult = simulateTelegramMessage(testText, params.chat_id || 99999999);
      return createJsonResponse({ ok: true, testText: testText, result: simResult });
    }

    if (action === "test_calendar") {
      const cal = getMonthlyLoanCalendar();
      return createJsonResponse({ ok: true, calendar: cal });
    }

    if (action === "test_reminders") {
      const rem = sendDailyLoanDueReminders();
      return createJsonResponse({ ok: true, reminders: rem });
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
      return ContentService.createTextOutput("OK");
    }

    const update = JSON.parse(e.postData.contents);
    handleTelegramUpdate(update);

    return ContentService.createTextOutput("OK");
  } catch (error) {
    logError("Webhook doPost Error: " + error.message);
    // Selalu respon OK ke Telegram agar Telegram menghentikan retry loop
    return ContentService.createTextOutput("OK");
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
  let id = chatId;
  if (!id) {
    const settingId = getSetting("Telegram Allowed User ID") || getSetting("Telegram Default Chat ID");
    id = settingId ? String(settingId).split(",")[0].trim() : (CONFIG.TELEGRAM.DEFAULT_CHAT_ID || 1001);
  }

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
