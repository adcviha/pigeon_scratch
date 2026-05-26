// src/analyze/recurring.js — Pure recurring detection from transaction arrays
const Recurring = (() => {

  function detectRecurring(txns) {
    // Group by merchantClean
    const groups = new Map();
    for (const t of txns) {
      if (!t.merchantClean || t.category === "Income" || t.category === "Transfer") continue;
      if (!groups.has(t.merchantClean)) groups.set(t.merchantClean, []);
      groups.get(t.merchantClean).push(t);
    }

    const rules = [];

    for (const [merchant, merchantTxns] of groups) {
      if (merchantTxns.length < 2) continue;

      // Sort by date
      merchantTxns.sort((a, b) => a.date.localeCompare(b.date));

      // Use only outflows for amount analysis
      const outflows = merchantTxns.filter(t => t.amount < 0).map(t => Math.abs(t.amount));
      if (outflows.length < 2) continue;

      const median = medianAmount(outflows);
      const tolerance = Math.max(1.00, Math.round(median * 0.05 * 100) / 100);

      // Build intervals between consecutive transactions
      const dates = merchantTxns.map(t => t.date);
      const intervals = [];
      for (let i = 1; i < dates.length; i++) {
        intervals.push(daysBetween(dates[i - 1], dates[i]));
      }

      if (intervals.length === 0) continue;

      // Classify cadence
      const cadence = classifyCadence(intervals);
      if (!cadence) continue;

      const minOccurrences = cadence === "weekly" || cadence === "bi-weekly" ? 2 : 3;
      if (merchantTxns.length < minOccurrences) continue;

      const lastSeen = dates[dates.length - 1];
      const firstSeen = dates[0];
      const cadenceDays = cadenceDaysFor(cadence);

      // Check if possibly ended (last seen > 2x cadence from today)
      const today = new Date().toISOString().slice(0, 10);
      const daysSinceLast = daysBetween(lastSeen, today);
      const possiblyEnded = daysSinceLast > cadenceDays * 2;

      // Estimate total monthly cost
      let totalMonthly = 0;
      if (cadence === "weekly") totalMonthly = median * 4.33;
      else if (cadence === "bi-weekly") totalMonthly = median * 2.17;
      else if (cadence === "monthly") totalMonthly = median;
      else if (cadence === "quarterly") totalMonthly = median / 3;
      totalMonthly = Math.round(totalMonthly * 100) / 100;

      // Get category from the most common category among these txns
      const catCounts = new Map();
      for (const t of merchantTxns) {
        const c = t.category || "Uncategorized";
        catCounts.set(c, (catCounts.get(c) || 0) + 1);
      }
      let bestCat = "Uncategorized";
      let bestCount = 0;
      for (const [c, n] of catCounts) {
        if (n > bestCount) { bestCount = n; bestCat = c; }
      }

      rules.push({
        merchantClean: merchant,
        expectedAmount: median,
        amountTolerance: tolerance,
        cadenceDays: cadenceDays,
        cadenceTolerance: cadenceToleranceDays(cadence),
        cadence: cadence,
        occurrences: merchantTxns.length,
        lastSeen: lastSeen,
        firstSeen: firstSeen,
        category: bestCat,
        totalMonthly: totalMonthly,
        possiblyEnded: possiblyEnded
      });
    }

    // Sort by totalMonthly desc
    rules.sort((a, b) => b.totalMonthly - a.totalMonthly);
    return rules;
  }

  function medianAmount(amounts) {
    const sorted = [...amounts].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
    }
    return sorted[mid];
  }

  function daysBetween(a, b) {
    const da = new Date(a), db = new Date(b);
    return (db - da) / (1000 * 60 * 60 * 24);
  }

  function classifyCadence(intervals) {
    const avg = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    if (avg >= 6 && avg <= 8) return "weekly";
    if (avg >= 13 && avg <= 15) return "bi-weekly";
    if (avg >= 28 && avg <= 32) return "monthly";
    if (avg >= 85 && avg <= 95) return "quarterly";
    return null;
  }

  function cadenceDaysFor(cadence) {
    if (cadence === "weekly") return 7;
    if (cadence === "bi-weekly") return 14;
    if (cadence === "monthly") return 30;
    if (cadence === "quarterly") return 90;
    return 30;
  }

  function cadenceToleranceDays(cadence) {
    if (cadence === "weekly") return 1;
    if (cadence === "bi-weekly") return 1;
    if (cadence === "monthly") return 2;
    if (cadence === "quarterly") return 5;
    return 2;
  }

  return { detectRecurring };
})();
