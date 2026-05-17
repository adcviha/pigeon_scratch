// src/import/parser.js — CSV parsing with PapaParse + format detection
const Parser = (() => {

  // Known header patterns for common bank/credit card formats.
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
  ];

  // Fixed column positions for TD exports without headers.
  // Columns: Date, Description, Withdrawals, Deposits, Balance
  const HEADERLESS_TD_MAP = { date: 0, desc: 1, outflow: 2, inflow: 3, amount: -1 };

  // Returns true if the first cell of the row looks like a date (ISO or M/D/Y).
  function firstCellIsDate(row) {
    if (!row || row.length < 2) return false;
    const s = String(row[0]).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s)          // ISO: 2026-05-07
        || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s);  // M/D/Y: 5/7/2026
  }

  function detectFormat(headers) {
    const trimmed = headers.map(h => String(h).trim());
    console.log("detectFormat — first row:", trimmed);

    // Try header-based formats first
    for (const fmt of formats) {
      if (fmt.test(trimmed)) {
        console.log("detectFormat — matched header format:", fmt.name);
        return { name: fmt.name, map: fmt.map(trimmed), headerless: false };
      }
    }

    // If first cell is a date, treat as headerless TD export
    if (firstCellIsDate(trimmed)) {
      console.log("detectFormat — first cell is date, using headerless TD format");
      return { name: "TD Canada Trust (no headers)", map: HEADERLESS_TD_MAP, headerless: true };
    }

    console.log("detectFormat — no format matched");
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
          console.log("PapaParse — parsed", rows.length, "rows, first row:", rows[0]);

          if (!rows.length) return reject(new Error("CSV file is empty"));

          const maybeHeaders = rows[0];
          const format = detectFormat(maybeHeaders);

          if (!format) {
            return resolve({ headers: maybeHeaders.map(String), rows: rows.slice(1), format: null });
          }

          // If headerless, the first row IS data, so include it
          const dataRows = format.headerless ? rows : rows.slice(1);
          console.log("parseCSV — returning", dataRows.length, "data rows, format:", format.name);
          resolve({ headers: maybeHeaders.map(String), rows: dataRows, format });
        },
        error: (err) => reject(new Error("Failed to parse CSV: " + err.message)),
      });
    });
  }

  return { parseCSV, detectFormat };
})();
