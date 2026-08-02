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

