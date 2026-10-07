/**
 * ==========================================================
 * Financial Tracker Pro
 * LoanWizardService.gs
 * ----------------------------------------------------------
 * Layanan Mode Percakapan Berpemandu (Conversational Wizard)
 * untuk Pendaftaran Kredit & Pinjaman Melalui Telegram Bot.
 * ==========================================================
 */

/**
 * Tahapan Step Percakapan Wizard Kredit
 */
const LOAN_WIZARD_STEPS = Object.freeze({
  INIT: 0,
  NAME: 1,
  LENDER: 2,
  TYPE: 3,
  PRINCIPAL: 4,
  INTEREST_TYPE: 5,
  INTEREST_RATE: 6,
  TENOR: 7,
  INSTALLMENT_DAY: 8,
  NOTES: 9,
  CONFIRMATION: 10
});

/**
 * Mengambil state wizard pengguna dari Script Cache.
 *
 * @param {String|Number} chatId
 * @returns {Object|null}
 */
function getLoanWizardState(chatId) {
  const cache = CacheService.getScriptCache();
  const raw = cache.get("loan_wizard_" + chatId);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Menyimpan state wizard pengguna ke Script Cache (TTL 30 menit).
 *
 * @param {String|Number} chatId
 * @param {Object} state
 */
function setLoanWizardState(chatId, state) {
  const cache = CacheService.getScriptCache();
  cache.put("loan_wizard_" + chatId, JSON.stringify(state), 1800);
}

/**
 * Menghapus sesi wizard kredit pengguna.
 *
 * @param {String|Number} chatId
 */
function clearLoanWizardState(chatId) {
  const cache = CacheService.getScriptCache();
  cache.remove("loan_wizard_" + chatId);
}

/**
 * Mengecek apakah pengguna sedang dalam sesi wizard kredit aktif.
 *
 * @param {String|Number} chatId
 * @returns {Boolean}
 */
function isLoanWizardActive(chatId) {
  return getLoanWizardState(chatId) !== null;
}

/**
 * Memulai sesi percakapan berpemandu baru untuk kredit.
 *
 * @param {String|Number} chatId
 * @returns {String} Pesan pertanyaan pertama
 */
function startLoanWizard(chatId) {
  const initialState = {
    step: LOAN_WIZARD_STEPS.NAME,
    data: {}
  };
  setLoanWizardState(chatId, initialState);

  return "💳 *Pencatatan Pinjaman / Kredit Baru*\n\n" +
    "Mari catat pinjaman Anda secara terperinci untuk perhitungan ekonomi perbankan yang akurat.\n" +
    "_(Ketik *BATAL* kapan saja untuk membatalkan)_\n\n" +
    "👉 *Pertanyaan 1/8:*\n" +
    "Apa *Nama Pinjaman* ini?\n" +
    "_(Contoh: `Cicilan Motor Vario`, `KPR Mandiri`, `Pinjaman Modal Usaha`)_";
}

/**
 * Memproses balasan pengguna pada sesi wizard kredit yang sedang aktif.
 *
 * @param {String|Number} chatId
 * @param {String} text
 * @returns {String} Pesan balasan berikutnya
 */
function handleLoanWizardStep(chatId, text) {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (lower === "batal" || lower === "/batal") {
    clearLoanWizardState(chatId);
    return "❌ *Pencatatan pinjaman dibatalkan.*\nData tidak disimpan ke spreadsheet.";
  }

  const state = getLoanWizardState(chatId);
  if (!state) {
    return "Sesi telah berakhir. Ketik `/kredit` untuk memulai pencatatan baru.";
  }

  return routeLoanWizardStep(chatId, state, trimmed);
}

/**
 * Melakukan perutean input ke fungsi penanganan step masing-masing.
 *
 * @param {String|Number} chatId
 * @param {Object} state
 * @param {String} input
 * @returns {String}
 */
function routeLoanWizardStep(chatId, state, input) {
  switch (state.step) {
    case LOAN_WIZARD_STEPS.NAME:
      return handleStepName(chatId, state, input);
    case LOAN_WIZARD_STEPS.LENDER:
      return handleStepLender(chatId, state, input);
    case LOAN_WIZARD_STEPS.TYPE:
      return handleStepType(chatId, state, input);
    case LOAN_WIZARD_STEPS.PRINCIPAL:
      return handleStepPrincipal(chatId, state, input);
    case LOAN_WIZARD_STEPS.INTEREST_TYPE:
      return handleStepInterestType(chatId, state, input);
    case LOAN_WIZARD_STEPS.INTEREST_RATE:
      return handleStepInterestRate(chatId, state, input);
    case LOAN_WIZARD_STEPS.TENOR:
      return handleStepTenor(chatId, state, input);
    case LOAN_WIZARD_STEPS.INSTALLMENT_DAY:
      return handleStepInstallmentDay(chatId, state, input);
    case LOAN_WIZARD_STEPS.NOTES:
      return handleStepNotes(chatId, state, input);
    case LOAN_WIZARD_STEPS.CONFIRMATION:
      return handleStepConfirmation(chatId, state, input);
    default:
      clearLoanWizardState(chatId);
      return "Terjadi kesalahan urutan pertanyaan. Silakan ketik `/kredit` kembali.";
  }
}

/**
 * Menangani input nama pinjaman (Step 1).
 *
 * @param {String|Number} chatId
 * @param {Object} state
 * @param {String} input
 * @returns {String}
 */
function handleStepName(chatId, state, input) {
  state.data.loanName = input;
  state.step = LOAN_WIZARD_STEPS.LENDER;
  setLoanWizardState(chatId, state);

  return "👉 *Pertanyaan 2/8:*\n" +
    "Siapa *Pihak Pemberi Pinjaman* (Lender / Leasing / Bank)?\n" +
    "_(Contoh: `FIF Astra`, `BCA Finance`, `Bank Mandiri`, `Teman`)_";
}

/**
 * Menangani input pemberi pinjaman (Step 2).
 *
 * @param {String|Number} chatId
 * @param {Object} state
 * @param {String} input
 * @returns {String}
 */
function handleStepLender(chatId, state, input) {
  state.data.lender = input;
  state.step = LOAN_WIZARD_STEPS.TYPE;
  setLoanWizardState(chatId, state);

  return "👉 *Pertanyaan 3/8:*\n" +
    "Apa *Jenis Pinjaman* ini?\n" +
    "Ketik angka pilihan:\n" +
    "• *1* = *Hutang* (Kewajiban Anda membayar)\n" +
    "• *2* = *Piutang* (Orang lain berhutang kepada Anda)";
}

/**
 * Menangani input jenis pinjaman (Step 3).
 *
 * @param {String|Number} chatId
 * @param {Object} state
 * @param {String} input
 * @returns {String}
 */
function handleStepType(chatId, state, input) {
  state.data.loanType = input === "2" || input.toLowerCase() === "piutang" ? "Piutang" : "Hutang";
  state.step = LOAN_WIZARD_STEPS.PRINCIPAL;
  setLoanWizardState(chatId, state);

  return "👉 *Pertanyaan 4/8:*\n" +
    "Berapa *Pokok Pinjaman* (Nominal yang dipinjam)?\n" +
    "_(Contoh: `18jt`, `18000000`, `2.5jt`)_";
}

/**
 * Menangani input pokok pinjaman (Step 4).
 *
 * @param {String|Number} chatId
 * @param {Object} state
 * @param {String} input
 * @returns {String}
 */
function handleStepPrincipal(chatId, state, input) {
  const amount = parseAmount(input);
  if (!amount || amount <= 0) {
    return "⚠️ Nominal tidak valid. Masukkan angka pokok pinjaman dengan benar (Contoh: `18jt` atau `18000000`):";
  }

  state.data.principal = amount;
  state.step = LOAN_WIZARD_STEPS.INTEREST_TYPE;
  setLoanWizardState(chatId, state);

  return "👉 *Pertanyaan 5/8:*\n" +
    "Pilih *Sistem Perhitungan Bunga*:\n" +
    "Ketik angka pilihan:\n" +
    "• *1* = *Bunga Flat* (Bunga tetap dihitung dari pokok awal)\n" +
    "• *2* = *Bunga Efektif / Anuitas* (Bunga menurun seiring sisa pokok)\n" +
    "• *3* = *Bunga Kumulatif / Majemuk* (Compound interest bergulir)\n" +
    "• *4* = *0% / Tanpa Bunga* (Hanya membayar pokok)";
}

/**
 * Menangani pilihan sistem bunga (Step 5).
 *
 * @param {String|Number} chatId
 * @param {Object} state
 * @param {String} input
 * @returns {String}
 */
function handleStepInterestType(chatId, state, input) {
  const map = {
    "1": "Flat",
    "2": "Efektif / Anuitas",
    "3": "Kumulatif / Majemuk",
    "4": "Tanpa Bunga (0%)"
  };

  const choice = map[input.trim()] || "Flat";
  state.data.interestType = choice;

  if (choice === "Tanpa Bunga (0%)") {
    state.data.interestRate = 0;
    state.step = LOAN_WIZARD_STEPS.TENOR;
    setLoanWizardState(chatId, state);

    return "👉 *Pertanyaan 6/8:*\n" +
      "Berapa lama *Tenor Pinjaman* (dalam satuan bulan)?\n" +
      "_(Contoh: `12` untuk 1 tahun, `24` untuk 2 tahun, `6`)_";
  }

  state.step = LOAN_WIZARD_STEPS.INTEREST_RATE;
  setLoanWizardState(chatId, state);

  return "👉 *Pertanyaan 6/8:*\n" +
    "Berapa *Suku Bunga per Tahun (% p.a.)*?\n" +
    "_(Contoh: `6` untuk 6% atau `12.5`. Cukup ketik angkanya saja)_";
}

/**
 * Menangani input suku bunga (Step 6).
 *
 * @param {String|Number} chatId
 * @param {Object} state
 * @param {String} input
 * @returns {String}
 */
function handleStepInterestRate(chatId, state, input) {
  const rate = parseNumber(input);
  state.data.interestRate = rate >= 0 ? rate : 0;
  state.step = LOAN_WIZARD_STEPS.TENOR;
  setLoanWizardState(chatId, state);

  return "👉 *Pertanyaan 7/8:*\n" +
    "Berapa lama *Tenor Pinjaman* (dalam satuan bulan)?\n" +
    "_(Contoh: `12` untuk 1 tahun, `24` untuk 2 tahun, `36`)_";
}

/**
 * Menangani input tenor bulan (Step 7).
 *
 * @param {String|Number} chatId
 * @param {Object} state
 * @param {String} input
 * @returns {String}
 */
function handleStepTenor(chatId, state, input) {
  const tenor = parseNumber(input);
  if (!tenor || tenor <= 0) {
    return "⚠️ Tenor tidak valid. Masukkan jumlah bulan dengan angka (Contoh: `12`):";
  }

  state.data.tenor = tenor;
  state.step = LOAN_WIZARD_STEPS.INSTALLMENT_DAY;
  setLoanWizardState(chatId, state);

  return "👉 *Pertanyaan 8/8:*\n" +
    "Setiap *Tanggal Berapa* jatuh tempo pembayaran cicilan bulanan Anda?\n" +
    "_(Contoh: `10` untuk setiap tanggal 10, atau `25`)_";
}

/**
 * Menangani input tanggal jatuh tempo bulanan (Step 8).
 *
 * @param {String|Number} chatId
 * @param {Object} state
 * @param {String} input
 * @returns {String}
 */
function handleStepInstallmentDay(chatId, state, input) {
  const day = Math.min(31, Math.max(1, parseNumber(input) || 1));
  state.data.installmentDay = day;
  state.step = LOAN_WIZARD_STEPS.NOTES;
  setLoanWizardState(chatId, state);

  return "📝 *Catatan Tambahan (Opsional):*\n" +
    "Ada catatan khusus atau agunan/keterangan pinjaman ini?\n" +
    "_(Ketik `-` jika tidak ada catatan)_";
}

/**
 * Menangani catatan dan menampilkan kartu konfirmasi kalkulasi ekonomi (Step 9).
 *
 * @param {String|Number} chatId
 * @param {Object} state
 * @param {String} input
 * @returns {String}
 */
function handleStepNotes(chatId, state, input) {
  state.data.notes = input.trim() === "-" ? "" : input.trim();
  state.data.startDate = new Date();

  const eco = calculateLoanEconomics(
    state.data.principal,
    state.data.interestType,
    state.data.interestRate,
    state.data.tenor,
    state.data.startDate,
    state.data.installmentDay
  );

  state.data.installmentAmount = eco.installmentAmount;
  state.data.totalInterest = eco.totalInterest;
  state.data.totalPayment = eco.totalPayment;
  state.data.dueDate = eco.dueDate;

  state.step = LOAN_WIZARD_STEPS.CONFIRMATION;
  setLoanWizardState(chatId, state);

  return formatLoanConfirmationCard(state.data);
}

/**
 * Membentuk kartu tampilan validasi kalkulasi kredit perbankan.
 *
 * @param {Object} data
 * @returns {String}
 */
function formatLoanConfirmationCard(data) {
  const dueStr = Utilities.formatDate(data.dueDate, "Asia/Jakarta", "dd MMMM yyyy");

  return "📋 *Ringkasan Kalkulasi Kredit & Pinjaman*\n" +
    "--------------------------------------------------\n" +
    "• *Nama:* " + data.loanName + " (" + data.lender + ")\n" +
    "• *Jenis:* " + data.loanType + "\n" +
    "• *Pokok Pinjaman:* " + formatCurrency(data.principal) + "\n" +
    "• *Sistem Bunga:* " + data.interestType + " (" + data.interestRate + "% p.a.)\n" +
    "• *Tenor:* " + data.tenor + " Bulan\n" +
    "• *Estimasi Total Bunga:* " + formatCurrency(data.totalInterest) + "\n" +
    "• *Total Kewajiban Pelunasan:* " + formatCurrency(data.totalPayment) + "\n" +
    "• *Angsuran per Bulan:* *" + formatCurrency(data.installmentAmount) + "*\n" +
    "• *Jatuh Tempo Bulanan:* Setiap tanggal " + data.installmentDay + "\n" +
    "• *Target Pelunasan Akhir:* " + dueStr + "\n" +
    (data.notes ? "• *Catatan:* " + data.notes + "\n" : "") +
    "--------------------------------------------------\n" +
    "⚠️ *Apakah data perhitungan di atas sudah sesuai?*\n\n" +
    "👉 Ketik *YA* untuk menyimpan ke spreadsheet\n" +
    "👉 Ketik *BATAL* untuk membatalkan";
}

/**
 * Memvalidasi konfirmasi YA untuk menyimpan ke sheet Loans (Step 10).
 *
 * @param {String|Number} chatId
 * @param {Object} state
 * @param {String} input
 * @returns {String}
 */
function handleStepConfirmation(chatId, state, input) {
  const upper = input.trim().toUpperCase();

  if (upper === "YA" || upper === "Y") {
    try {
      const loanId = saveLoan(state.data);
      clearLoanWizardState(chatId);

      return "✅ *Pinjaman Berhasil Disimpan!*\n\n" +
        "• *Loan ID:* `" + loanId + "`\n" +
        "• *Nama:* " + state.data.loanName + "\n" +
        "• *Pokok:* " + formatCurrency(state.data.principal) + "\n" +
        "• *Cicilan:* *" + formatCurrency(state.data.installmentAmount) + " / bulan*\n" +
        "• *Jatuh Tempo:* Setiap tanggal " + state.data.installmentDay + "\n" +
        "• *Status:* `Active`\n\n" +
        "📊 _Data telah dicatat ke sheet Loans._\n" +
        "Ketik `/kalender` untuk melihat kalender cicilan bulan ini.";
    } catch (err) {
      clearLoanWizardState(chatId);
      return "⚠️ *Gagal Menyimpan Pinjaman:*\n" + err.message;
    }
  }

  return "Ketik *YA* untuk mengonfirmasi penyimpanan, atau ketik *BATAL* untuk membatalkan.";
}

