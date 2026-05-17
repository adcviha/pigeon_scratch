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

  function updateCategory(merchantClean, category) {
    let changed = 0;
    for (const t of transactions) {
      if (t.merchantClean === merchantClean && t.category !== category) {
        t.category = category;
        changed++;
      }
    }
    if (changed) notify();
    return changed;
  }

  function applyDict(dictCache) {
    let changed = false;
    for (const t of transactions) {
      if (!t.category && dictCache.has(t.merchantClean)) {
        t.category = dictCache.get(t.merchantClean);
        changed = true;
      }
    }
    if (changed) notify();
    return changed;
  }

  function getUncategorizedMerchants() {
    const uncategorized = new Set();
    const categorized = new Set();
    for (const t of transactions) {
      if (!t.category && t.merchantClean) {
        uncategorized.add(t.merchantClean);
      } else if (t.category && t.merchantClean) {
        categorized.add(t.merchantClean);
      }
    }
    return [...uncategorized].filter(m => !categorized.has(m));
  }

  function getMerchantCounts() {
    const counts = {};
    for (const t of transactions) {
      if (!t.merchantClean) continue;
      if (!counts[t.merchantClean]) {
        counts[t.merchantClean] = { count: 0, category: t.category };
      }
      counts[t.merchantClean].count++;
      if (t.category) counts[t.merchantClean].category = t.category;
    }
    return counts;
  }

  return { onChange, getTransactions, setTransactions, addTransactions, getAccounts,
           updateCategory, applyDict, getUncategorizedMerchants, getMerchantCounts };
})();
