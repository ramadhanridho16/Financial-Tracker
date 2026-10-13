/**
 * ==========================================================
 * Financial Tracker Pro
 * GeminiVisionRepository.gs
 * ----------------------------------------------------------
 * Repositori Akses REST API Google Gemini Vision (VLM)
 * Menggunakan model gemini-2.5-flash / gemini-1.5-flash
 * ==========================================================
 */

/**
 * Mengambil API Key Gemini yang tersimpan di Script Properties atau Settings.
 *
 * @returns {String}
 */
function getGeminiApiKey() {
  const propKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (propKey && propKey.trim().length > 0) {
    return propKey.trim();
  }

  const settingKey = getSetting("Gemini API Key");
  if (settingKey && String(settingKey).trim().length > 0) {
    return String(settingKey).trim();
  }

  if (CONFIG.GEMINI && CONFIG.GEMINI.API_KEY) {
    return String(CONFIG.GEMINI.API_KEY).trim();
  }

  return "";
}

/**
 * Menyimpan API Key Gemini ke Script Properties secara aman.
 *
 * @param {String} apiKey
 * @returns {Boolean}
 */
function saveGeminiApiKey(apiKey) {
  if (!apiKey || apiKey.trim().length === 0) {
    return false;
  }
  PropertiesService.getScriptProperties().setProperty("GEMINI_API_KEY", apiKey.trim());
  return true;
}

/**
 * Mengirimkan citra gambar dan prompt ke Google Gemini VLM API.
 *
 * @param {GoogleAppsScript.Base.Blob} imageBlob
 * @param {String} promptText
 * @param {String} [modelName]
 * @returns {Object} JSON hasil respons VLM
 */
function callGeminiVisionApi(imageBlob, promptText, modelName) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  const primaryModel = modelName || "gemini-2.5-flash";
  try {
    return executeGeminiGenerateContent(apiKey, primaryModel, imageBlob, promptText);
  } catch (err) {
    // Fallback otomatis ke gemini-1.5-flash jika model 2.5 mengalami limit atau kendala
    if (primaryModel !== "gemini-1.5-flash" && isRecoverableGeminiError(err)) {
      logError("Gemini " + primaryModel + " gagal, mencoba fallback ke gemini-1.5-flash: " + err.message);
      return executeGeminiGenerateContent(apiKey, "gemini-1.5-flash", imageBlob, promptText);
    }
    throw err;
  }
}

/**
 * Menjalankan HTTP POST generateContent ke Google Gemini REST API.
 *
 * @param {String} apiKey
 * @param {String} model
 * @param {GoogleAppsScript.Base.Blob} blob
 * @param {String} prompt
 * @returns {Object}
 */
function executeGeminiGenerateContent(apiKey, model, blob, prompt) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
  const base64Data = Utilities.base64Encode(blob.getBytes());
  const mimeType = blob.getContentType() || "image/jpeg";

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Data
          }
        }
      ]
    }],
    generationConfig: {
      response_mime_type: "application/json",
      temperature: 0.1
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  const text = response.getContentText();

  if (statusCode !== 200) {
    throw new Error("Gemini API Error (" + statusCode + "): " + text);
  }

  return parseGeminiResponseContent(text);
}

/**
 * Mem-parse teks konten JSON dari respons wrapper Gemini API.
 *
 * @param {String} responseText
 * @returns {Object}
 */
function parseGeminiResponseContent(responseText) {
  const json = JSON.parse(responseText);
  if (!json.candidates || json.candidates.length === 0) {
    throw new Error("Gemini tidak mengembalikan kandidat respons.");
  }

  const parts = json.candidates[0].content && json.candidates[0].content.parts;
  if (!parts || parts.length === 0) {
    throw new Error("Bagian konten respons Gemini kosong.");
  }

  const rawJsonText = parts[0].text;
  return JSON.parse(rawJsonText);
}

/**
 * Mengecek apakah error Gemini API layak dicoba ulang dengan model fallback.
 *
 * @param {Error} err
 * @returns {Boolean}
 */
function isRecoverableGeminiError(err) {
  const msg = String(err.message || "");
  return msg.indexOf("404") !== -1 || msg.indexOf("429") !== -1 || msg.indexOf("503") !== -1 || msg.indexOf("NOT_FOUND") !== -1;
}

