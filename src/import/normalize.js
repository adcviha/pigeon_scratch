// src/import/normalize.js — raw CSV rows → canonical Transaction shape
const Normalize = (() => {

  // Deterministic ID from source + date + amount + merchant.
  // Simple djb2-ish hash — not crypto, just for dedup.
  function makeId(account, date, amount, merchantRaw) {
    const str = [account || "", date || "", String(amount), merchantRaw || ""].join("|");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return "txn_" + (Math.abs(hash) % 0xffffffff).toString(36);
  }

  function parseAmount(val) {
    if (val == null || val === "") return null;
    const cleaned = String(val).replace(/[$,]/g, "").trim();
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }

  // Rudimentary merchant cleaning — strips common payment processor prefixes.
  function cleanMerchant(raw) {
    if (!raw) return "";
    let s = raw.toUpperCase().trim();
    s = s.replace(/^(SQ|TST|SP|PAYPAL)\s*\*/, "").trim();
    // Strip trailing transaction IDs like #ABC123 or 12-digit numbers
    s = s.replace(/\s+#?\w{6,}$/, "").trim();
    // Collapse whitespace
    s = s.replace(/\s+/g, " ");
    return s;
  }

  function normalizeRow(row, formatMap, account) {
    let date, desc, outflow, inflow;

    if (formatMap) {
      date = row[formatMap.date];
      desc = row[formatMap.desc];
      inflow = formatMap.inflow >= 0 ? parseAmount(row[formatMap.inflow]) : null;
      outflow = formatMap.outflow >= 0 ? parseAmount(row[formatMap.outflow]) : null;
      if (formatMap.amount >= 0 && inflow == null && outflow == null) {
        // Some formats use a single Amount column (negative = outflow)
        const amt = parseAmount(row[formatMap.amount]);
        if (amt !== null) {
          if (amt < 0) outflow = Math.abs(amt);
          else inflow = amt;
        }
      }
    }

    const amount = inflow ? inflow : (outflow ? -outflow : 0);
    if (amount === 0) return null;

    const merchantRaw = desc || "";
    const merchantClean = cleanMerchant(merchantRaw);
    const dateStr = normalizeDate(date);

    return {
      id: makeId(account, dateStr, amount, merchantRaw),
      date: dateStr,
      amount,
      merchantRaw: merchantRaw,
      merchantClean,
      category: null,          // Unassigned — user labels later
      isRecurring: false,
      account: account || "",
      notes: "",
    };
  }

  // Parse various date formats into ISO (YYYY-MM-DD)
  function normalizeDate(val) {
    if (!val) return "";
    const s = String(val).trim();
    // Already ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // MM/DD/YYYY (North American format; DD/MM not yet handled)
    const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdy) return `${mdy[3]}-${mdy[1].padStart(2,"0")}-${mdy[2].padStart(2,"0")}`;
    // Give up, return as-is
    return s;
  }

  function normalizeRows(rows, formatMap, account) {
    const txns = [];
    for (const row of rows) {
      const txn = normalizeRow(row, formatMap, account);
      if (txn) txns.push(txn);
    }
    return txns;
  }

  return { normalizeRows, cleanMerchant, makeId };
})();
