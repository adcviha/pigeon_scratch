// src/ui/categorize.js — merchant categorization screen
const CategorizeUI = (() => {

  const CATEGORIES = [
    { value: "", label: "Uncategorized" },
    { value: "Bills", label: "🧾 Bills" },
    { value: "Discretionary", label: "😜 Discretionary" },
    { value: "Income", label: "😌💵 Income" },
    { value: "Transfer", label: "🔄 Transfer" },
  ];

  const CAT_COLORS = {
    Bills: "#1565c0",
    Discretionary: "#e65100",
    Income: "#2e7d32",
    Transfer: "#757575",
  };

  let reviewMode = false;
  let reviewData = null;  // { MERCHANT: suggestedCategory }

  function esc(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function optionHTML(selectedCat) {
    return CATEGORIES.map(c =>
      `<option value="${c.value}" ${c.value === (selectedCat||"") ? "selected" : ""}>${c.label}</option>`
    ).join("");
  }

  function render() {
    const el = document.getElementById("main-content");
    reviewMode = false;
    reviewData = null;

    const counts = State.getMerchantCounts();
    const merchants = Object.entries(counts)
      .sort(([,a], [,b]) => b.count - a.count);

    if (!merchants.length) {
      el.innerHTML = '<div class="empty-state"><p>No transactions to categorize.</p></div>';
      return;
    }

    const uncategorized = merchants.filter(([m]) => !counts[m].category).length;
    const total = merchants.length;

    const rows = merchants.map(([merchant, info]) => {
      const cat = info.category || "";
      const catColor = CAT_COLORS[cat] || "";
      const highlight = !cat ? 'style="background:#fffbe6;"' : "";
      return `
        <tr ${highlight}>
          <td>${esc(merchant)}</td>
          <td style="text-align:center;">${info.count}</td>
          <td>
            <select class="cat-select" data-merchant="${escAttr(merchant)}" style="border:1px solid var(--border);border-radius:3px;padding:2px 4px;font-size:0.8rem;">
              ${optionHTML(cat)}
            </select>
          </td>
          <td>
            <button class="cat-save-btn" data-merchant="${escAttr(merchant)}"
                    style="background:${catColor || 'var(--accent)'};color:#fff;border:none;border-radius:3px;padding:3px 10px;font-size:0.8rem;cursor:pointer;">
              ${cat ? 'Update' : 'Save'}
            </button>
          </td>
        </tr>`;
    }).join("");

    el.innerHTML = `
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:0.9rem;color:var(--text-muted);">
            ${total} merchants · ${uncategorized} uncategorized
          </span>
          <button id="ai-suggest-btn"
                  style="background:var(--accent);color:#fff;border:none;border-radius:4px;padding:8px 18px;font-size:0.9rem;cursor:pointer;font-weight:500;">
            🤖 AI Suggest
          </button>
        </div>
        <div id="ai-msg" style="margin-top:8px;font-size:0.85rem;"></div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:0.9rem;background:var(--surface);border:1px solid var(--border);border-radius:6px;overflow:hidden;">
        <thead>
          <tr>
            <th style="cursor:default;">Merchant</th>
            <th style="cursor:default;text-align:center;width:60px;">Count</th>
            <th style="cursor:default;width:180px;">Category</th>
            <th style="cursor:default;width:80px;"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    wireSaveButtons();
    wireSuggestButton();
  }

  function wireSaveButtons() {
    document.querySelectorAll(".cat-save-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const merchant = btn.dataset.merchant;
        const select = document.querySelector(`select[data-merchant="${CSS.escape(merchant)}"]`);
        const category = select.value || null;

        if (category) {
          await MerchantDict.set(merchant, category);
        }
        const changed = State.updateCategory(merchant, category);
        if (changed && category) {
          // Persist affected transactions
          const affected = State.getTransactions().filter(t => t.merchantClean === merchant);
          await DB.writeBatch(affected);
        }
        render();
      });
    });
  }

  function wireSuggestButton() {
    const btn = document.getElementById("ai-suggest-btn");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const merchants = State.getUncategorizedMerchants();
      if (!merchants.length) {
        document.getElementById("ai-msg").innerHTML = '<span style="color:#2e7d32;">All merchants are already categorized.</span>';
        return;
      }

      btn.disabled = true;
      btn.textContent = "Thinking...";
      document.getElementById("ai-msg").innerHTML = 'Asking DeepSeek to categorize ' + merchants.length + ' merchants...';

      try {
        const suggestions = await AISuggest.suggest(merchants);
        renderSuggestReview(suggestions);
      } catch (err) {
        document.getElementById("ai-msg").innerHTML = '<span style="color:#c62828;">' + esc(err.message) + '</span>';
        btn.disabled = false;
        btn.textContent = "🤖 AI Suggest";
      }
    });
  }

  function renderSuggestReview(suggestions) {
    reviewMode = true;
    reviewData = suggestions;
    const el = document.getElementById("main-content");
    const entries = Object.entries(suggestions);
    const counts = State.getMerchantCounts();

    const rows = entries.map(([merchant, suggestedCat]) => {
      const count = counts[merchant]?.count || 0;
      return `
        <tr>
          <td>${esc(merchant)}</td>
          <td style="text-align:center;">${count}</td>
          <td>
            <select class="review-select" data-merchant="${escAttr(merchant)}" style="border:1px solid var(--border);border-radius:3px;padding:2px 4px;font-size:0.8rem;">
              ${optionHTML(suggestedCat)}
            </select>
          </td>
        </tr>`;
    }).join("");

    el.innerHTML = `
      <div style="margin-bottom:16px;">
        <p style="font-size:0.9rem;color:var(--text-muted);margin-bottom:8px;">
          🤖 DeepSeek suggested categories for ${entries.length} merchants. Review and correct, then apply.
        </p>
        <div style="display:flex;gap:8px;">
          <button id="review-apply-btn"
                  style="background:#2e7d32;color:#fff;border:none;border-radius:4px;padding:8px 18px;font-size:0.9rem;cursor:pointer;font-weight:500;">
            ✅ Apply All
          </button>
          <button id="review-cancel-btn"
                  style="background:none;border:1px solid var(--border);border-radius:4px;padding:8px 18px;font-size:0.9rem;cursor:pointer;">
            Cancel
          </button>
        </div>
        <div id="review-msg" style="margin-top:8px;font-size:0.85rem;"></div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:0.9rem;background:var(--surface);border:1px solid var(--border);border-radius:6px;overflow:hidden;">
        <thead>
          <tr>
            <th style="cursor:default;">Merchant</th>
            <th style="cursor:default;text-align:center;width:60px;">Count</th>
            <th style="cursor:default;width:180px;">Category</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

    document.getElementById("review-cancel-btn").addEventListener("click", () => render());

    document.getElementById("review-apply-btn").addEventListener("click", async () => {
      // Read current select values (user may have corrected some)
      const final = {};
      document.querySelectorAll(".review-select").forEach(sel => {
        if (sel.value) final[sel.dataset.merchant] = sel.value;
      });

      await MerchantDict.setBatch(final);
      for (const [merchant, category] of Object.entries(final)) {
        State.updateCategory(merchant, category);
      }
      // Persist all affected transactions
      const affected = State.getTransactions().filter(t => final[t.merchantClean]);
      await DB.writeBatch(affected);

      document.getElementById("review-msg").innerHTML = '<span style="color:#2e7d32;">Applied ' + Object.keys(final).length + ' categories.</span>';
      setTimeout(() => render(), 800);
    });
  }

  function escAttr(s) {
    return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  return { render };
})();
