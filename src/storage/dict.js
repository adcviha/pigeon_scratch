// src/storage/dict.js — merchant dictionary: in-memory Map + IndexedDB persistence
const MerchantDict = (() => {
  const cache = new Map();  // merchantClean → category

  async function load() {
    const entries = await DB.readAllDict();
    for (const e of entries) {
      if (e.merchantClean) cache.set(e.merchantClean, e.category);
    }
  }

  function get(merchantClean) {
    return cache.get(merchantClean);
  }

  function has(merchantClean) {
    return cache.has(merchantClean);
  }

  function getAll() {
    const obj = {};
    for (const [k, v] of cache) obj[k] = v;
    return obj;
  }

  async function set(merchantClean, category) {
    cache.set(merchantClean, category);
    await DB.writeDictBatch([{ merchantClean, category }]);
  }

  async function setBatch(entries) {
    for (const [merchantClean, category] of Object.entries(entries)) {
      cache.set(merchantClean, category);
    }
    const arr = Object.entries(entries).map(([merchantClean, category]) => ({ merchantClean, category }));
    await DB.writeDictBatch(arr);
  }

  function size() {
    return cache.size;
  }

  function keys() {
    return [...cache.keys()];
  }

  return { load, get, has, getAll, set, setBatch, size, keys, cache };
})();
