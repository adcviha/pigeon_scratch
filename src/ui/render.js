// src/ui/render.js — transaction list view
const Render = (() => {
  const el = document.getElementById("main-content");
  const statsEl = document.getElementById("stats-bar");

  let sortKey = "date";
  let sortDir = "desc"; // newest first

  function formatCurrency(n) {
    const abs = Math.abs(n);
    return "$" + abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function formatDate(d) {
    if (!d) return "";
    // Convert ISO to a friendly format like Jan 14, 2025
    const [y, m, day] = d.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return months[parseInt(m,10)-1] + " " + parseInt(day,10) + ", " + y;
  }

  function catClass(cat) {
    return "cat-" + (cat || "null");
  }

  function renderStats(txns) {
    const total = txns.length;
    const inflow = txns.filter(t => t.amount > 0 && t.category !== "Transfer").reduce((s,t) => s + t.amount, 0);
    const outflow = txns.filter(t => t.amount < 0 && t.category !== "Transfer").reduce((s,t) => s + Math.abs(t.amount), 0);
    const accounts = new Set(txns.map(t => t.account).filter(Boolean));
    statsEl.textContent = `${total} transactions across ${accounts.size} account(s) · In: ${formatCurrency(inflow)} · Out: ${formatCurrency(outflow)}`;
  }

  function buildTable(txns) {
    if (!txns.length) {
      el.innerHTML = '<div class="empty-state"><p>No transactions yet.</p><p>Pick an account name, choose a CSV file, and hit Import.</p></div>';
      return;
    }

    const sorted = [...txns].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.date.localeCompare(b.date);
      else if (sortKey === "amount") cmp = a.amount - b.amount;
      else if (sortKey === "merchant") cmp = a.merchantClean.localeCompare(b.merchantClean);
      else if (sortKey === "category") cmp = (a.category||"").localeCompare(b.category||"");
      else if (sortKey === "account") cmp = a.account.localeCompare(b.account);
      return sortDir === "desc" ? -cmp : cmp;
    });

    const rows = sorted.map(t => {
      const amtClass = t.amount >= 0 ? "amount-in" : "amount-out";
      const cat = t.category || "—";
      return `
        <tr>
          <td>${formatDate(t.date)}</td>
          <td>${esc(t.merchantClean)}</td>
          <td class="${amtClass}">${t.amount >= 0 ? "+" : "−"}${formatCurrency(t.amount)}</td>
          <td><span class="cat-tag ${catClass(t.category)}">${esc(cat)}</span></td>
          <td>${esc(t.account)}</td>
        </tr>`;
    }).join("");

    el.innerHTML = `
      <table>
        <thead>
          <tr>
            <th data-sort="date">Date</th>
            <th data-sort="merchant">Merchant</th>
            <th data-sort="amount">Amount</th>
            <th data-sort="category">Category</th>
            <th data-sort="account">Account</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    // Click-to-sort headers
    el.querySelectorAll("th[data-sort]").forEach(th => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (sortKey === key) sortDir = sortDir === "asc" ? "desc" : "asc";
        else { sortKey = key; sortDir = "asc"; }
        render(State.getTransactions());
      });
    });
  }

  function esc(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function render(txns) {
    renderStats(txns);
    buildTable(txns);
  }

  return { render };
})();
