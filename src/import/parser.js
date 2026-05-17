// src/import/parser.js — CSV parsing with PapaParse + format detection
const Parser = (() => {

  // Known header patterns for common bank/credit card formats.
  // Each entry: { test: fn(headers) => bool, map: fn(headers) => { canonicalKey: index } }
  // For headerless formats, test is a fn(row) that checks if the first data row matches.
  const formats = [
    {
      name: "TD Canada Trust (with headers)",
      test: (h) => h.includes("Date") && h.includes("Description") && (h.includes("Withdrawals") || h.includes("Amount")),
      map: (h) => ({
        date: h.findIndex(x => x === "Date"),
        desc: h.findIndex(x => x === "Description"),
        outflow: h.findIndex(x => x === "Withdrawals"),
        inflow: h.findIndex(x => x === "Deposits"),
        amount: h.findIndex(x => x === "Amount"),
      }),
      headerless: false,
    },
    {
      // TD exports without headers: Date, Description, Withdrawals, Deposits, Balance
      name: "TD Canada Trust (no headers)",
      test: (row) => {
        if (!row || row.length < 3) return false;
        const c0 = String(row[0]).trim();
        const c1 = String(row[1]).trim();
        const c2 = String(row[2]).trim();
        // First column is an ISO date, second is text, third is numeric or empty
        return /^\d{4}-\d{2}-\d{2}$/.test(c0) && c1.length > 0 && /^(\d|\.|-|,|\s)*$/.test(c2.replace(/[$,]/g, ""));
      },
      map: () => ({ date: 0, desc: 1, outflow: 2, inflow: 3, amount: -1 }),
      headerless: true,
    },
  ];

  function looksLikeDataRow(row) {
    if (!row || row.length < 2) return false;
    const c0 = String(row[0]).trim();
    // If the first cell is an ISO date or a number, this is probably data, not headers.
    return /^\d{4}-\d{2}-\d{2}$/.test(c0) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(c0);
  }

  function detectFormat(headers) {
    const trimmed = headers.map(h => String(h).trim());
    for (const fmt of formats) {
      if (!fmt.headerless && fmt.test(trimmed)) {
        return { name: fmt.name, map: fmt.map(trimmed), headerless: false };
      }
    }
    // Check if the first row looks like data — if so, try headerless formats
    if (looksLikeDataRow(trimmed)) {
      for (const fmt of formats) {
        if (fmt.headerless && fmt.test(trimmed)) {
          return { name: fmt.name, map: fmt.map(trimmed), headerless: true };
        }
      }
    }
    return null;
  }

  function parseCSV(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length) {
            console.warn("PapaParse warnings:", results.errors);
          }
          const rows = results.data;
          if (!rows.length) return reject(new Error("CSV file is empty"));

          const maybeHeaders = rows[0];
          const format = detectFormat(maybeHeaders);

          if (!format) {
            return resolve({ headers: maybeHeaders.map(String), rows: rows.slice(1), format: null });
          }

          // If headerless, the first row IS data, so include it
          const dataRows = format.headerless ? rows : rows.slice(1);
          resolve({ headers: maybeHeaders.map(String), rows: dataRows, format });
        },
        error: (err) => reject(new Error("Failed to parse CSV: " + err.message)),
      });
    });
  }

  return { parseCSV, detectFormat };
})();
