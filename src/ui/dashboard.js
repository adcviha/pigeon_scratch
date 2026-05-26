// src/ui/dashboard.js — Dashboard view with month selector, summary cards, recurring, top discretionary
const DashboardUI = (() => {
  let selectedMonth = null;

  function render(txns) {
    if (!selectedMonth) {
      selectedMonth = Analyze.mostRecentMonth(txns);
    }
    // If selected month no longer has data after an import, reset
    if (selectedMonth && Analyze.filterMonth(txns, selectedMonth).length === 0) {
      selectedMonth = Analyze.mostRecentMonth(txns);
    }
    if (!selectedMonth) {
      document.getElementById("main-content").innerHTML =
        '<div class="empty-state"><p>No transactions yet.</p><p>Pick an account name, choose a CSV file, and hit Import.</p></div>';
      return;
    }

    const totals = Analyze.monthlyTotals(txns, selectedMonth);
    const avg = Analyze.rollingAverage(txns, selectedMonth, 3);
    const top5 = Analyze.topDiscretionary(txns, selectedMonth, 5);
    const recurring = Recurring.detectRecurring(txns);
    const months = Analyze.allMonths(txns);
    const isMostRecent = selectedMonth === months[months.length - 1];
    const isCurrent = Analyze.isCurrentMonth(selectedMonth);

    let html = "";

    // Month selector
    html += '<div class="dashboard-month-nav">';
    html += '<button id="dash-prev-month" class="dash-nav-btn"' +
            (selectedMonth === months[0] ? " disabled" : "") + '>&larr;</button>';
    html += '<span class="dash-month-label">' + Analyze.monthLabel(selectedMonth) + '</span>';
    html += '<button id="dash-next-month" class="dash-nav-btn"' +
            (isMostRecent ? " disabled" : "") + '>&rarr;</button>';
    if (isCurrent) {
      html += '<span class="dash-badge">Month in progress</span>';
    }
    html += '</div>';

    // Summary cards
    html += '<div class="dash-cards">';
    html += cardHtml("Income", totals.income, "income", "😌💵");
    html += cardHtml("Bills", totals.bills, "bills", "🧾");
    html += cardHtml("Discretionary", totals.discretionary, "discretionary", "😜");
    const remClass = totals.remainder >= 0 ? "remainder-pos" : "remainder-neg";
    const remEmoji = totals.remainder >= 0 ? "👍" : "⚠️";
    html += cardHtml("Remainder", totals.remainder, remClass, remEmoji);
    html += '</div>';

    // Rolling comparison
    if (avg.months_used > 0) {
      html += '<div class="dash-section">';
      html += '<h3 class="dash-section-title">vs. ' + avg.months_used + '-month average</h3>';
      html += '<table class="dash-compare-table">';
      html += compareRow("Income", totals.income, avg.income_avg);
      html += compareRow("Bills", totals.bills, avg.bills_avg, true);
      html += compareRow("Discretionary", totals.discretionary, avg.discretionary_avg, true);
      html += compareRow("Remainder", totals.remainder, avg.remainder_avg);
      html += '</table></div>';
    }

    // Fixed monthly (recurring)
    if (recurring.length > 0) {
      html += '<div class="dash-section">';
      html += '<h3 class="dash-section-title">Fixed Monthly</h3>';
      html += '<table class="dash-recurring-table">';
      html += '<thead><tr><th>Merchant</th><th>Amount</th><th>Cadence</th><th>Seen</th></tr></thead><tbody>';
      for (const r of recurring) {
        const rowClass = r.possiblyEnded ? "recurring-ended" : "";
        const seen = r.lastSeen + (r.possiblyEnded ? " ⏳" : "");
        html += '<tr class="' + rowClass + '">' +
                '<td>' + esc(r.merchantClean) + '</td>' +
                '<td>' + fmt(r.expectedAmount) + '</td>' +
                '<td>' + r.cadence + '</td>' +
                '<td>' + seen + '</td>' +
                '</tr>';
      }
      // Total of all recurring monthly
      const recurringTotal = Math.round(recurring.reduce((s, r) => s + r.totalMonthly, 0) * 100) / 100;
      html += '<tr class="recurring-total"><td><strong>Total estimated monthly</strong></td>' +
              '<td><strong>' + fmt(recurringTotal) + '</strong></td><td></td><td></td></tr>';
      html += '</tbody></table></div>';
    }

    // Top 5 discretionary
    if (top5.length > 0) {
      html += '<div class="dash-section">';
      html += '<h3 class="dash-section-title">Top Discretionary</h3>';
      html += '<table class="dash-top5-table">';
      html += '<thead><tr><th>Merchant</th><th>Amount</th><th>Date</th></tr></thead><tbody>';
      for (const t of top5) {
        html += '<tr><td>' + esc(t.merchantClean) + '</td>' +
                '<td>' + fmt(t.amount) + '</td>' +
                '<td>' + (t.date || "") + '</td></tr>';
      }
      html += '</tbody></table></div>';
    }

    // Empty month
    if (Analyze.filterMonth(txns, selectedMonth).length === 0) {
      html = html.replace('<div class="dash-cards">', '<div class="dash-cards">' +
        '<div class="dash-empty-month">No transactions this month.</div>');
    }

    document.getElementById("main-content").innerHTML = html;

    // Wire month nav buttons
    const prevBtn = document.getElementById("dash-prev-month");
    const nextBtn = document.getElementById("dash-next-month");
    if (prevBtn) prevBtn.addEventListener("click", () => {
      selectedMonth = Analyze.previousMonth(selectedMonth);
      render(txns);
    });
    if (nextBtn) nextBtn.addEventListener("click", () => {
      selectedMonth = Analyze.nextMonth(selectedMonth);
      render(txns);
    });
  }

  function cardHtml(label, amount, cssClass, emoji) {
    return '<div class="dash-card dash-card-' + cssClass + '">' +
           '<div class="dash-card-emoji">' + emoji + '</div>' +
           '<div class="dash-card-label">' + label + '</div>' +
           '<div class="dash-card-amount">' + fmt(amount) + '</div>' +
           '</div>';
  }

  function compareRow(label, current, avg, inverted) {
    inverted = inverted || false;
    let delta = Math.round((current - avg) * 100) / 100;
    let sign, cls;
    if (delta > 0) {
      sign = "+"; cls = inverted ? "delta-bad" : "delta-good";
    } else if (delta < 0) {
      sign = ""; cls = inverted ? "delta-good" : "delta-bad";
    } else {
      sign = ""; cls = "delta-neutral";
    }
    return '<tr><td>' + label + '</td>' +
           '<td>' + fmt(current) + '</td>' +
           '<td>' + fmt(avg) + '</td>' +
           '<td class="' + cls + '">' + sign + fmt(Math.abs(delta)) + '</td></tr>';
  }

  function fmt(n) {
    if (n === 0) return "$0";
    return n < 0 ? "-$" + Math.abs(n).toFixed(2) : "$" + n.toFixed(2);
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  return { render };
})();
