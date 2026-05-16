// src/import/parser.js — CSV parsing with PapaParse + format detection
const Parser = (() => {

  // Known header patterns for common bank/credit card formats.
  // Each entry: { test: fn(headers) => bool, map: { canonicalKey: headerIndex } }
  const formats = [
    {
      name: "TD Canada Trust",
      test: (h) => h.includes("Date") && h.includes("Description") && (h.includes("Withdrawals") || h.includes("Amount")),
      map: (h) => ({
        date: h.findIndex(x => x === "Date"),
        desc: h.findIndex(x => x === "Description"),
        outflow: h.findIndex(x => x === "Withdrawals"),
        inflow: h.findIndex(x => x === "Deposits"),
        amount: h.findIndex(x => x === "Amount"),
      }),
    },
  ];

  function detectFormat(headers) {
    const trimmed = headers.map(h => String(h).trim());
    for (const fmt of formats) {
      if (fmt.test(trimmed)) return { name: fmt.name, map: fmt.map(trimmed) };
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
            // PapaParse errors are usually recoverable — warn but proceed
            console.warn("PapaParse warnings:", results.errors);
          }
          const rows = results.data;
          if (!rows.length) return reject(new Error("CSV file is empty"));

          const headers = rows[0];
          const format = detectFormat(headers);
          if (!format) {
            // Fall back to generic: show headers and let user map
            return resolve({ headers: headers.map(String), rows: rows.slice(1), format: null });
          }
          resolve({ headers: headers.map(String), rows: rows.slice(1), format });
        },
        error: (err) => reject(new Error("Failed to parse CSV: " + err.message)),
      });
    });
  }

  return { parseCSV, detectFormat };
})();
