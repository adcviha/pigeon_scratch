// src/app.js — bootstrap Pigeon Scratch, wire modules, expose window.PIGEON
(async function () {
  try {
    await DB.open();
    const stored = await DB.readAll();
    if (stored.length) {
      State.setTransactions(stored);
    }
  } catch (err) {
    console.error("Failed to load from IndexedDB:", err);
    // Continue with empty state — IndexedDB may be unavailable
  }

  ImportFlow.init();
  Render.render(State.getTransactions());

  // Re-render whenever state changes
  State.onChange((txns) => Render.render(txns));

  // Expose for console hacking
  window.PIGEON = {
    State,
    DB,
    Parser,
    Normalize,
    Render,
    ImportFlow,

    // Quick accessors
    get txns() { return State.getTransactions(); },
    get count() { return State.getTransactions().length; },
    get accounts() { return State.getAccounts(); },
  };

  console.log("Pigeon Scratch v0.1.1 ready. Try PIGEON.txns in the console.");
})();
