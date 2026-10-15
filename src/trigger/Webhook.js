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

    if (action === "test_calendar") {
      const cal = getMonthlyLoanCalendar();
      return createJsonResponse({ ok: true, calendar: cal });
    }

    if (action === "test_reminders") {
      const rem = sendDailyLoanDueReminders();
      return createJsonResponse({ ok: true, reminders: rem });
    }

    if (action === "test_receipt_simulation") {
      const simChatId = params.chat_id || 99999999;
      const mockParsed = {
        merchant: "Tahan Banting Coffee",
        amount: 34000,
        subtotal: 34000,
        items: [{ name: "Kopi Susu Spanish L", qty: 2, price: 17000, total: 34000 }],
        category: "Makanan & Minuman",
        date: Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd"),
        notes: "Lunas via Tunai"
      };
      const draft = {
        receipt: mockParsed,
        fileUrl: "https://drive.google.com/test_receipt.jpg",
        walletName: CONFIG.DEFAULT.WALLET,
        chatId: simChatId,
        timestamp: Date.now()
      };
      setPendingReceiptVerification(simChatId, draft);
      const card = formatOcrReceiptVerificationCard(mockParsed, draft.fileUrl, draft.walletName);
      return createJsonResponse({ ok: true, draft: draft, promptCard: card });
    }

    if (action === "test_vlm_indomaret_simulation") {
      const simChatId = params.chat_id || 99999999;
      const mockIndomaret = {
        merchant: "Indomaret Veteran",
        amount: 86000,
        subtotal: 87300,
        items: [
          { name: "Le Minerale 600ml", qty: 2, price: 3600, total: 7200 },
          { name: "Voucher", qty: 1, price: -1300, total: -1300 },
          { name: "Aquaviva Btl 1600ml", qty: 1, price: 7600, total: 7600 },
          { name: "Pocari Sweat 500ml", qty: 1, price: 9500, total: 9500 },
          { name: "Ion Water Btl 500ml", qty: 2, price: 9500, total: 19000 },
          { name: "Knzlr Sngl Gjng 60g", qty: 2, price: 8900, total: 17800 },
          { name: "Knzlr Sngl Keju 60g", qty: 1, price: 8900, total: 8900 },
          { name: "Beng-Beng Maxx 32g", qty: 2, price: 6400, total: 12800 },
          { name: "Idm Tas Rmh Lngk Sdg", qty: 1, price: 4500, total: 4500 }
        ],
        category: "Belanja",
        date: Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd"),
        notes: "Tunai 100.000, Kembali 14.000"
      };
      const draft = {
        receipt: mockIndomaret,
        fileUrl: "https://drive.google.com/indomaret_receipt.jpg",
        walletName: CONFIG.DEFAULT.WALLET,
        chatId: simChatId,
        timestamp: Date.now()
      };
      setPendingReceiptVerification(simChatId, draft);
      const card = formatReceiptVerificationCard(mockIndomaret, draft.fileUrl, draft.walletName);
      return createJsonResponse({ ok: true, draft: draft, promptCard: card });
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

