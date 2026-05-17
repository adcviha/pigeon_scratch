// src/ui/importFlow.js — file input → parse → normalize → store → render pipeline
const ImportFlow = (() => {
  const fileInput = document.getElementById("file-input");
  const importBtn = document.getElementById("import-btn");
  const accountInput = document.getElementById("account-input");
  const msgEl = document.getElementById("import-msg");
  const accountList = document.getElementById("account-list");

  function setMsg(text, isError) {
    msgEl.textContent = text;
    msgEl.style.color = isError ? "#c62828" : "var(--text-muted)";
  }

  function updateAccountDatalist() {
    const accounts = State.getAccounts();
    accountList.innerHTML = accounts.map(a => `<option value="${a}">`).join("");
  }

  async function doImport() {
    const file = fileInput.files[0];
    if (!file) return setMsg("Pick a CSV file first.", true);

    const account = accountInput.value.trim();
    if (!account) return setMsg("Enter an account name (e.g. td-checking).", true);

    setMsg("Parsing…");

    let parsed;
    try {
      parsed = await Parser.parseCSV(file);
    } catch (err) {
      return setMsg(err.message, true);
    }

    if (!parsed.format) {
      return setMsg(
        "Unknown CSV format. Headers found: " + parsed.headers.join(", ") +
        ". This format isn't recognized yet — add a format definition in src/import/parser.js.",
        true
      );
    }

    setMsg("Normalizing…");
    const txns = Normalize.normalizeRows(parsed.rows, parsed.format.map, account);

    if (!txns.length) return setMsg("No valid transactions found in file.", true);

    setMsg("Saving…");
    const added = State.addTransactions(txns);

    // Auto-categorize against known merchants
    if (typeof MerchantDict !== "undefined" && MerchantDict.cache.size) {
      State.applyDict(MerchantDict.cache);
    }

    try {
      await DB.writeBatch(txns);
    } catch (err) {
      return setMsg("IndexedDB write failed: " + err.message, true);
    }

    updateAccountDatalist();
    const existing = txns.length - added;
    setMsg(`Imported ${added} new transactions${existing ? ", " + existing + " already in store" : ""}.`);
    fileInput.value = "";
  }

  importBtn.addEventListener("click", doImport);

  function init() {
    updateAccountDatalist();
  }

  return { init };
})();
