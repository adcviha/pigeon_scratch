// src/storage/db.js — IndexedDB wrapper for transactions
const DB = (() => {
  const DB_NAME = "pigeon-scratch";
  const DB_VERSION = 1;
  const STORE = "transactions";

  let db = null;

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror = () => reject(new Error("Failed to open IndexedDB"));
    });
  }

  function readAll() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error("Failed to read transactions"));
    });
  }

  function writeBatch(transactions) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const txn of transactions) {
        store.put(txn);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("Failed to write transactions"));
    });
  }

  function count() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error("Failed to count transactions"));
    });
  }

  return { open, readAll, writeBatch, count };
})();
