// src/app.js — bootstrap Pigeon Scratch, wire modules, expose window.PIGEON
(async function () {
  let ok = false;
  try {
    await DB.open();
    await MerchantDict.load();
    const stored = await DB.readAll();
    if (stored.length) {
      State.setTransactions(stored);
      if (MerchantDict.cache.size) {
        const changed = State.applyDict(MerchantDict.cache);
        if (changed) {
          await DB.writeBatch(State.getTransactions());
        }
      }
    }
    ok = true;
  } catch (err) {
    console.error("Startup failed:", err);
    document.getElementById("main-content").innerHTML =
      '<div class="empty-state" style="color:#c62828;"><p><strong>Could not open local database.</strong></p><p>' +
      err.message + '</p><p>Close all other Pigeon Scratch tabs, then refresh.</p>' +
      '<p style="font-size:0.8rem;margin-top:8px;">If this persists, your browser may be blocking IndexedDB (private/incognito mode).</p></div>';
    document.getElementById("stats-bar").textContent = "Database unavailable.";
  }

  if (!ok) {
    // Expose minimal PIDGEON for debugging
    window.PIGEON = { DB, State, ok: false };
    return;
  }

  ImportFlow.init();
  Render.render(State.getTransactions());

  State.onChange((txns) => Render.render(txns));

  document.getElementById("view-transactions-btn").addEventListener("click", () => Render.setView("transactions"));
  document.getElementById("view-categorize-btn").addEventListener("click", () => Render.setView("categorize"));
  document.getElementById("view-settings-btn").addEventListener("click", () => Render.setView("settings"));

  window.PIGEON = {
    State, DB, Parser, Normalize, Render, ImportFlow,
    MerchantDict, CategorizeUI, SettingsUI, AISuggest, Prompts,
    ok: true,
    get txns() { return State.getTransactions(); },
    get count() { return State.getTransactions().length; },
    get accounts() { return State.getAccounts(); },
    get merchants() { return State.getUncategorizedMerchants(); },
  };

  console.log("Pigeon Scratch v0.2.2 ready. Try PIGEON.txns or PIGEON.merchants in the console.");
})();
