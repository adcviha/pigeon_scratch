// src/analyze/monthly.js — Pure aggregation functions on transaction arrays
const Analyze = (() => {

  function monthKey(dateStr) {
    if (!dateStr) return null;
    return dateStr.slice(0, 7); // "YYYY-MM"
  }

  function parseMonth(ym) {
    const [y, m] = ym.split("-").map(Number);
    return { year: y, month: m };
  }

  function filterMonth(txns, ym) {
    return txns.filter(t => t.date && t.date.startsWith(ym));
  }

  function monthlyTotals(txns, ym) {
    const monthTxns = filterMonth(txns, ym);
    let income = 0, bills = 0, discretionary = 0;

    for (const t of monthTxns) {
      if (t.category === "Transfer") continue;
      if (t.category === "Income" || t.amount > 0) {
        income += t.amount;
      } else if (t.category === "Bills") {
        bills += Math.abs(t.amount);
      } else {
        // Discretionary or uncategorized outflows
        discretionary += Math.abs(t.amount);
      }
    }

    return {
      income: Math.round(income * 100) / 100,
      bills: Math.round(bills * 100) / 100,
      discretionary: Math.round(discretionary * 100) / 100,
      remainder: Math.round((income - bills - discretionary) * 100) / 100
    };
  }

  function topDiscretionary(txns, ym, n) {
    n = n || 5;
    const monthTxns = filterMonth(txns, ym);
    const disc = monthTxns.filter(t =>
      t.category !== "Transfer" && t.category !== "Income" && t.amount < 0
    );
    disc.sort((a, b) => a.amount - b.amount); // most negative first
    return disc.slice(0, n).map(t => ({
      merchantClean: t.merchantClean,
      amount: Math.abs(t.amount),
      date: t.date,
      category: t.category || "Uncategorized"
    }));
  }

  function rollingAverage(txns, ym, nMonths) {
    nMonths = nMonths || 3;
    const target = parseMonth(ym);
    // Build list of preceding complete calendar months
    const candidates = allMonths(txns);
    const before = [];
    for (const c of candidates) {
      const p = parseMonth(c);
      if (p.year < target.year || (p.year === target.year && p.month < target.month)) {
        before.push(c);
      }
    }
    // Take up to nMonths most recent preceding months that have transactions
    const recent = before.slice(-nMonths);
    if (recent.length === 0) {
      return { income_avg: 0, bills_avg: 0, discretionary_avg: 0, remainder_avg: 0, months_used: 0 };
    }

    let incSum = 0, billSum = 0, discSum = 0, remSum = 0;
    for (const m of recent) {
      const tot = monthlyTotals(txns, m);
      incSum += tot.income;
      billSum += tot.bills;
      discSum += tot.discretionary;
      remSum += tot.remainder;
    }
    const k = recent.length;
    return {
      income_avg: Math.round((incSum / k) * 100) / 100,
      bills_avg: Math.round((billSum / k) * 100) / 100,
      discretionary_avg: Math.round((discSum / k) * 100) / 100,
      remainder_avg: Math.round((remSum / k) * 100) / 100,
      months_used: k
    };
  }

  function allMonths(txns) {
    const months = new Set();
    for (const t of txns) {
      if (t.date) months.add(monthKey(t.date));
    }
    return Array.from(months).sort();
  }

  function mostRecentMonth(txns) {
    const months = allMonths(txns);
    return months.length ? months[months.length - 1] : null;
  }

  function isCurrentMonth(ym) {
    const now = new Date();
    const cur = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    return ym === cur;
  }

  function monthLabel(ym) {
    const p = parseMonth(ym);
    const date = new Date(p.year, p.month - 1, 1);
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  }

  function previousMonth(ym) {
    const p = parseMonth(ym);
    const d = new Date(p.year, p.month - 2, 1);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  function nextMonth(ym) {
    const p = parseMonth(ym);
    const d = new Date(p.year, p.month, 1);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }

  return { monthKey, parseMonth, filterMonth, monthlyTotals, topDiscretionary,
           rollingAverage, allMonths, mostRecentMonth, isCurrentMonth, monthLabel,
           previousMonth, nextMonth };
})();
