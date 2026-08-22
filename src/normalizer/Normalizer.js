/**
 * ==========================================================
 * Financial Tracker Pro
 * Normalizer.gs
 * ----------------------------------------------------------
 * Mengubah input ramah suara menjadi sintaks parser.
 * ==========================================================
 */

/**
 * Menyiapkan form transaksi untuk diproses parser.
 *
 * @param {Object} form
 * @returns {Object}
 */
function normalizeTransactionForm(form) {

  return Object.assign({}, form, {
    input: normalizeTransactionInput(form.input)
  });

}

/**
 * Menormalisasi setiap transaksi dalam input gabungan secara terpisah.
 *
 * @param {String} input
 * @returns {String}
 */
function normalizeTransactionInput(input) {

  return splitTransactionInput(input)
    .map(normalizeSpeechInput)
    .join(", ");

}

/**
 * Mengubah kata perintah dan satuan suara menjadi sintaks parser.
 *
 * @param {String} input
 * @returns {String}
 */
function normalizeSpeechInput(input) {

  const text = normalizeText(input);
  const command = getSpeechCommand(text);

  if (!command) {
    return normalizeSpeechUnits(text);
  }

  return normalizeSpeechCommand(text, command);

}

/**
 * Mengambil perintah transaksi bila berada di awal input.
 *
 * @param {String} text
 * @returns {String}
 */
function getSpeechCommand(text) {

  const match = text.match(/^(tambah|kurang)\b/);

  return match ? match[1] : "";

}

/**
 * Menyusun perintah suara menjadi deskripsi dan nominal parser.
 *
 * @param {String} text
 * @param {String} command
 * @returns {String}
 */
function normalizeSpeechCommand(text, command) {

  const content = text.replace(/^(tambah|kurang)\b\s*/, "");
  const amount = extractSpeechAmount(content);

  if (!amount) {
    return normalizeSpeechUnits(text)
      .replace(/^tambah\b/, "+")
      .replace(/^kurang\b/, "-");
  }

  const description = content
    .replace(amount.source, "")
    .replace(/\s+/g, " ")
    .trim();
  const sign = command === "tambah" ? "+" : "-";

  return [description, sign + amount.value]
    .filter(Boolean)
    .join(" ");

}

/**
 * Mengambil nominal pertama yang dinyatakan dengan satuan suara.
 *
 * @param {String} text
 * @returns {Object|null}
 */
function extractSpeechAmount(text) {

  const match = text.match(/\b(\d+[.,]?\d*)\s*(ribu|juta|k|jt)\b/);

  if (!match) {
    return null;
  }

  return {
    source: match[0],
    value: match[1] + normalizeSpeechUnit(match[2])
  };

}

/**
 * Mengubah seluruh satuan suara menjadi singkatan parser.
 *
 * @param {String} text
 * @returns {String}
 */
function normalizeSpeechUnits(text) {

  return text
    .replace(/\btambah\b/g, "+")
    .replace(/\bkurang\b/g, "-")
    .replace(/\bribu\b/g, "k")
    .replace(/\bjuta\b/g, "jt")
    .replace(/(\d+[.,]?\d*)\s+(k|jt)\b/g, "$1$2");

}

/**
 * Mengubah satu satuan suara menjadi singkatan parser.
 *
 * @param {String} unit
 * @returns {String}
 */
function normalizeSpeechUnit(unit) {

  return unit === "ribu" || unit === "k" ? "k" : "jt";

}
