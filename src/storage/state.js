// src/storage/state.js — in-memory transaction array + simple pub/sub
const State = (() => {
  let transactions = [];
  let listeners = [];

  function onChange(fn) {
    listeners.push(fn);
    // Return unsubscribe function
    return () => { listeners = listeners.filter(l => l !== fn); };
  }

  function notify() {
    for (const fn of listeners) fn(transactions);
  }

  function getTransactions() {
    return transactions;
  }

  function setTransactions(txns) {
    transactions = txns;
    notify();
  }

  // Add transactions, deduplicating by id. Returns count of actually-new rows.
  function addTransactions(incoming) {
    const existing = new Set(transactions.map(t => t.id));
    const novel = incoming.filter(t => !existing.has(t.id));
    if (novel.length) {
      transactions = [...transactions, ...novel];
      // Sort by date descending
      transactions.sort((a, b) => b.date.localeCompare(a.date) || a.merchantClean.localeCompare(b.merchantClean));
      notify();
    }
    return novel.length;
  }

  function getAccounts() {
    const set = new Set(transactions.map(t => t.account).filter(Boolean));
    return [...set].sort();
  }

  return { onChange, getTransactions, setTransactions, addTransactions, getAccounts };
})();
