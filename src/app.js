// src/app.js — bootstrap Pigeon Scratch, wire modules, expose window.PIGEON
(async function () {
  try {
    await DB.open();
    await MerchantDict.load();
    const stored = await DB.readAll();
    if (stored.length) {
      State.setTransactions(stored);
      // Apply existing dictionary to any uncategorized transactions
      if (MerchantDict.cache.size) {
        const changed = State.applyDict(MerchantDict.cache);
        if (changed) {
          await DB.writeBatch(State.getTransactions());
        }
      }
    }
  } catch (err) {
    console.error("Failed to load from IndexedDB:", err);
  }

  ImportFlow.init();
  Render.render(State.getTransactions());

  // Re-render whenever state changes
  State.onChange((txns) => Render.render(txns));

  // Toolbar button events
  document.getElementById("view-transactions-btn").addEventListener("click", () => Render.setView("transactions"));
  document.getElementById("view-categorize-btn").addEventListener("click", () => Render.setView("categorize"));
  document.getElementById("view-settings-btn").addEventListener("click", () => Render.setView("settings"));

  // Expose for console hacking
  window.PIGEON = {
    State,
    DB,
    Parser,
    Normalize,
    Render,
    ImportFlow,
    MerchantDict,
    CategorizeUI,
    SettingsUI,
    AISuggest,
    Prompts,

    get txns() { return State.getTransactions(); },
    get count() { return State.getTransactions().length; },
    get accounts() { return State.getAccounts(); },
    get merchants() { return State.getUncategorizedMerchants(); },
  };

  console.log("Pigeon Scratch v0.2.0 ready. Try PIGEON.txns or PIGEON.merchants in the console.");
})();
