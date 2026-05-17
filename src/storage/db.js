// src/storage/db.js — IndexedDB wrapper for transactions + merchant dictionary
const DB = (() => {
  const DB_NAME = "pigeon-scratch";
  const DB_VERSION = 2;
  const STORE_TXN = "transactions";
  const STORE_DICT = "merchantDict";

  let db = null;
  let openPromise = null;

  async function ensure() {
    if (db) return;
    console.warn("DB connection lost — attempting to reopen");
    db = null;
    openPromise = null;
    await open();
  }

  function open() {
    if (openPromise) return openPromise;
    openPromise = new Promise((resolve, reject) => {
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
      req.onerror = (e) => {
        openPromise = null;
        const name = e.target.error?.name || "UnknownError";
        const msg = e.target.error?.message || "";
        reject(new Error("IndexedDB open failed: " + name + (msg ? " — " + msg : "")));
      };
      req.onblocked = () => {
        openPromise = null;
        reject(new Error("IndexedDB blocked — close other Pigeon Scratch tabs and refresh."));
      };
    });
    return openPromise;
  }

  function isOpen() { return db !== null; }

  async function readAll() {
    await ensure();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TXN, "readonly");
      const req = tx.objectStore(STORE_TXN).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error("Failed to read transactions"));
    });
  }

  async function writeBatch(transactions) {
    await ensure();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TXN, "readwrite");
      const store = tx.objectStore(STORE_TXN);
      for (const txn of transactions) store.put(txn);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("Failed to write transactions"));
    });
  }

  async function count() {
    await ensure();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TXN, "readonly");
      const req = tx.objectStore(STORE_TXN).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error("Failed to count transactions"));
    });
  }

  async function readAllDict() {
    await ensure();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DICT, "readonly");
      const req = tx.objectStore(STORE_DICT).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(new Error("Failed to read dictionary"));
    });
  }

  async function writeDictBatch(entries) {
    await ensure();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DICT, "readwrite");
      const store = tx.objectStore(STORE_DICT);
      for (const e of entries) store.put(e);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("Failed to write dictionary"));
    });
  }

  return { open, isOpen, readAll, writeBatch, count, readAllDict, writeDictBatch };
})();
