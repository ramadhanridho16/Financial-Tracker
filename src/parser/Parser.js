/**
 * ==========================================================
 * Financial Tracker Pro
 * Parser.gs
 * ----------------------------------------------------------
 * Mengubah input pengguna menjadi Transaction Object.
 * Tidak menyimpan data ke Spreadsheet.
 * ==========================================================
 */


/**
 * Parser utama.
 *
 * @param {Object} form
 * @returns {Object}
 */
function parseTransaction(form){

    const text = normalizeText(form.input);

    const dictionary = findDictionary(text);

    const walletMentions = extractWalletMentions(text);

    const wallet = walletMentions[0] || getDefaultWallet() || {
        walletId: "",
        walletName: CONFIG.DEFAULT.WALLET
    };

    const targetWallet = extractTargetWallet(text, walletMentions, dictionary);

    return {

        transactionId : "",

        timestamp : form.timestamp,

        transactionType : extractTransactionType(dictionary,text),

        walletId : wallet.walletId,

        walletName : wallet.walletName,

        targetWalletId : targetWallet ? targetWallet.walletId : "",

        targetWalletName : targetWallet ? targetWallet.walletName : "",

        category : extractCategory(dictionary, text),

        subCategory : extractSubCategory(dictionary),

        merchant : extractMerchant(dictionary),

        referenceType : "",

        referenceId : "",

        description : extractDescription(text, walletMentions, dictionary),

        amount : extractAmount(text),

        date : form.date,

        note : form.note,

        attachment : form.attachment

    };

}

/**
 * Memecah satu input menjadi beberapa input transaksi.
 * Koma di antara dua angka dipertahankan sebagai pemisah desimal nominal.
 *
 * @param {String} input
 * @returns {Array<String>}
 */
function splitTransactionInput(input){

    const text = String(input || "").trim();
    const transactions = [];
    let current = "";

    for(let index = 0; index < text.length; index++){

        const character = text[index];

        if(character === "," && !isAmountDecimalSeparator(text, index)){
            addTransactionInput(transactions, current);
            current = "";
            continue;
        }

        current += character;

    }

    addTransactionInput(transactions, current);

    return transactions;

}

/**
 * Mengecek apakah koma adalah pemisah desimal pada nominal.
 *
 * @param {String} text
 * @param {Number} index
 * @returns {Boolean}
 */
function isAmountDecimalSeparator(text, index){

    return /\d/.test(text[index - 1] || "") &&
        /\d/.test(text[index + 1] || "");

}

/**
 * Menambahkan potongan transaksi bila tidak kosong.
 *
 * @param {Array<String>} transactions
 * @param {String} input
 * @returns {void}
 */
function addTransactionInput(transactions, input){

    const value = String(input || "").trim();

    if(value){
        transactions.push(value);
    }

}

function extractWallet(text){

    return extractWalletMentions(text)[0] || getDefaultWallet() || {
        walletId: "",
        walletName: CONFIG.DEFAULT.WALLET
    };

}

function extractWalletMentions(text){

    const wallets = getWallets();

    return wallets
        .map(wallet => ({
            wallet: wallet,
            index: normalizeText(text).indexOf(normalizeText(wallet.walletName))
        }))
        .filter(item => item.index !== -1)
        .sort((a,b) => a.index - b.index)
        .map(item => item.wallet);

}

function extractTargetWallet(text, walletMentions, dictionary){

    if(!isTransferTransaction(dictionary, text)){

        return null;

    }

    return walletMentions.length > 1
        ? walletMentions[1]
        : null;

}

function extractCategory(dictionary, text){

    if(isTransferPattern(text)){

        return "Pindah Buku";

    }

    if(!dictionary){

        return isTransferTransaction(dictionary, text)
            ? "Pindah Buku"
            : CONFIG.DEFAULT.CATEGORY;

    }

    return dictionary.category;

}

function extractTransactionType(dictionary,text){

    if(isTransferTransaction(dictionary, text)){

        return CONFIG.TRANSACTION_TYPE.TRANSFER;

    }

    if(dictionary){

        return dictionary.transactionType;

    }

    if(text.startsWith("+")){

        return CONFIG.TRANSACTION_TYPE.INCOME;

    }

    if(text.startsWith("-")){

        return CONFIG.TRANSACTION_TYPE.EXPENSE;

    }

    return CONFIG.DEFAULT.TRANSACTION_TYPE;

}

function isTransferTransaction(dictionary, text){

    if(isTransferPattern(text)){

        return true;

    }

    const dictionaryType = dictionary
        ? normalizeText(dictionary.transactionType)
        : "";

    const dictionaryCategory = dictionary
        ? normalizeText(dictionary.category)
        : "";

    const dictionarySubCategory = dictionary
        ? normalizeText(dictionary.subCategory)
        : "";

    if(dictionary && dictionaryType !== normalizeText(CONFIG.TRANSACTION_TYPE.TRANSFER)){

        return false;

    }

    return dictionaryType === normalizeText(CONFIG.TRANSACTION_TYPE.TRANSFER) ||
        dictionaryCategory === "pindah buku" ||
        dictionarySubCategory === "pindah buku" ||
        isTransferPattern(text);

}

function isTransferPattern(text){

    const normalizedText = normalizeText(text);
    const walletCount = extractWalletMentions(normalizedText).length;

    return walletCount >= 2 &&
        /\b(pindah|pindah buku|transfer|setor tunai|tarik tunai|pemindahbukuan)\b/.test(normalizedText);

}

function extractMerchant(dictionary){

    return dictionary
        ? dictionary.merchant
        : "";

}

function extractSubCategory(dictionary){

    return dictionary
        ? dictionary.subCategory
        : "";

}

function extractDescription(text, wallets, dictionary){

    let description = text
        .replace(/^[+-]\s*/, "")
        .replace(/\b\d+[.,]?\d*\s*(jt|juta|rb|ribu|k)?\b/i, "")
        .replace(/\s+/g, " ");

    wallets.forEach(wallet => {

        description = removeWord(description, wallet.walletName);

    });

    if(isTransferTransaction(dictionary, text)){

        description = removeWord(description, "pindah");
        description = removeWord(description, "pindah buku");
        description = removeWord(description, "transfer");
        description = removeWord(description, "setor tunai");
        description = removeWord(description, "tarik tunai");
        description = removeWord(description, "pemindahbukuan");

    }

    return description
        .replace(/\s+/g, " ")
        .trim();

}

function removeWord(text, word){

    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp("\\b" + escapedWord + "\\b", "i");

    return text.replace(regex, "");

}

function extractAmount(text){

    return parseAmount(text);

}

function getParseDebug(form){

    const text = normalizeText(form.input);
    const dictionary = findDictionary(text);
    const walletMentions = extractWalletMentions(text);
    const wallet = extractWallet(text);
    const targetWallet = extractTargetWallet(text, walletMentions, dictionary);

    return [
        "input=" + text,
        "transferPattern=" + isTransferPattern(text),
        "dictionary=" + (dictionary ? dictionary.keyword : "-"),
        "jenis=" + extractTransactionType(dictionary, text),
        "wallet=" + (wallet ? wallet.walletName : "-"),
        "walletTujuan=" + (targetWallet ? targetWallet.walletName : "-"),
        "kategori=" + extractCategory(dictionary, text),
        "nominal=" + extractAmount(text)
    ].join(" | ");

}
