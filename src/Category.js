/**
 * ==========================================================
 * Financial Tracker Pro
 * Category.gs
 * ----------------------------------------------------------
 * Dictionary Engine
 * ==========================================================
 */


/**
 * Mengambil seluruh dictionary aktif
 * diurutkan berdasarkan priority tertinggi.
 */
function getDictionary() {

  const sheet = getSheet(CONFIG.SHEETS.DICTIONARY);

  const values = sheet.getDataRange().getValues();

  values.shift();

  return values
    .filter(row => row[0])
    .map(row => ({

      keyword: normalizeText(row[0]),

      transactionType: row[4] || CONFIG.DEFAULT.TRANSACTION_TYPE,

      category: row[1],

      subCategory: row[2],

      merchant: row[3],

      alias: row[5] || "",

      priority: Number(row[6] || 0)

    }))
    .sort((a,b)=>{
      if (b.priority !== a.priority) {
        return b.priority-a.priority;
      }

      return b.keyword.length-a.keyword.length;
    });

}

/**
 * Mencari dictionary terbaik
 * berdasarkan seluruh kalimat transaksi.
 *
 * @param {String} text
 * @returns {Object|null}
 */
function findDictionary(text){

    if(!text) return null;

    text = normalizeText(text);

    const dictionary = getDictionary();

    for(const item of dictionary){

        // keyword utama
        if(text.includes(item.keyword)){

            return item;

        }

        // alias
        if(item.alias){

            const aliases = item.alias
                .split(",")
                .map(a=>normalizeText(a));

            for(const alias of aliases){

                if(text.includes(alias)){

                    return item;

                }

            }

        }

    }

    return null;

}

function getCategory(text){

    const item = findDictionary(text);

    return item
        ? item.category
        : CONFIG.DEFAULT.CATEGORY;

}



function getSubCategory(text){

    const item = findDictionary(text);

    return item
        ? item.subCategory
        : CONFIG.DEFAULT.SUBCATEGORY;

}



function getMerchant(text){

    const item = findDictionary(text);

    return item
        ? item.merchant
        : CONFIG.DEFAULT.MERCHANT;

}



function getTransactionType(text){

    const item = findDictionary(text);

    return item
        ? item.transactionType
        : CONFIG.DEFAULT.TRANSACTION_TYPE;

}

/**
 * Menyimpan Kategori baru ke sheet Dictionary.
 *
 * @param {String} categoryName - Nama Kategori
 * @param {String|Array<String>} [keywords] - Kata kunci pendukung atau alias
 * @param {String} [defaultType] - Default tipe transaksi (default: Pengeluaran / EXPENSE)
 * @returns {Object} { category, primaryKeyword, aliases, isNew }
 */
function saveNewCategory(categoryName, keywords, defaultType) {
  if (!categoryName || !categoryName.trim()) {
    throw new Error("Nama kategori tidak boleh kosong.");
  }

  const cleanCategory = categoryName.trim();
  const type = defaultType || CONFIG.TRANSACTION_TYPE.EXPENSE;
  const sheet = getSheet(CONFIG.SHEETS.DICTIONARY);

  // Ambil daftar kata kunci/alias
  let kwList = [];
  if (Array.isArray(keywords)) {
    kwList = keywords.map(k => String(k).trim()).filter(Boolean);
  } else if (typeof keywords === "string" && keywords.trim()) {
    kwList = keywords.split(/[,;]+/).map(k => k.trim()).filter(Boolean);
  }

  const primaryKeyword = kwList.length > 0 ? kwList[0].toLowerCase() : cleanCategory.toLowerCase();
  const aliases = kwList.length > 1 ? kwList.slice(1).join(", ") : "";

  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);
  const existingRowIndex = rows.findIndex(row => 
    normalizeText(row[1]) === normalizeText(cleanCategory) &&
    normalizeText(row[0]) === normalizeText(primaryKeyword)
  );

  if (existingRowIndex !== -1) {
    const existingAlias = rows[existingRowIndex][5] || "";
    let combinedAliases = existingAlias;
    if (aliases) {
      combinedAliases = existingAlias ? (existingAlias + ", " + aliases) : aliases;
      sheet.getRange(existingRowIndex + 2, 6).setValue(combinedAliases);
    }
    return {
      category: cleanCategory,
      primaryKeyword: primaryKeyword,
      aliases: combinedAliases,
      isNew: false
    };
  }

  sheet.appendRow([
    primaryKeyword,
    cleanCategory,
    "", // Subkategori
    "", // Merchant
    type,
    aliases,
    10 // Priority default
  ]);

  return {
    category: cleanCategory,
    primaryKeyword: primaryKeyword,
    aliases: aliases,
    isNew: true
  };
}


