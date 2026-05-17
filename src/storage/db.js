// src/storage/db.js — IndexedDB wrapper for transactions + merchant dictionary
const DB = (() => {
  const DB_NAME = "pigeon-scratch";
  const DB_VERSION = 2;
  const STORE_TXN = "transactions";
  const STORE_DICT = "merchantDict";

  let db = null;

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORE_TXN)) {
          d.createObjectStore(STORE_TXN, { keyPath: "id" });
        }
        if (!d.objectStoreNames.contains(STORE_DICT)) {
          d.createObjectStore(STORE_DICT, { keyPath: "merchantClean" });
        }
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror = () => reject(new Error("Failed to open IndexedDB"));
    });
  }

  function readAll() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TXN, "readonly");
      const store = tx.objectStore(STORE_TXN);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error("Failed to read transactions"));
    });
  }

  function writeBatch(transactions) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TXN, "readwrite");
      const store = tx.objectStore(STORE_TXN);
      for (const txn of transactions) store.put(txn);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("Failed to write transactions"));
    });
  }

  function count() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TXN, "readonly");
      const req = tx.objectStore(STORE_TXN).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error("Failed to count transactions"));
    });
  }

  // --- Merchant dictionary store ---

  function readAllDict() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DICT, "readonly");
      const store = tx.objectStore(STORE_DICT);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error("Failed to read dictionary"));
    });
  }

  function writeDictBatch(entries) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DICT, "readwrite");
      const store = tx.objectStore(STORE_DICT);
      for (const e of entries) store.put(e);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("Failed to write dictionary"));
    });
  }

  return { open, readAll, writeBatch, count, readAllDict, writeDictBatch };
})();
