// src/ui/settings.js — settings panel (API key management)
const SettingsUI = (() => {
  const LS_KEY = "pigeon-scratch-deepseek-key";

  function render() {
    const el = document.getElementById("main-content");
    const existing = localStorage.getItem(LS_KEY) || "";

    el.innerHTML = `
      <div class="settings-panel" style="max-width:500px;">
        <h2 style="font-size:1.1rem;font-weight:600;margin-bottom:16px;">Settings</h2>

        <div style="margin-bottom:24px;">
          <label style="display:block;font-size:0.85rem;font-weight:600;margin-bottom:6px;">
            DeepSeek API Key
          </label>
          <div style="display:flex;gap:8px;">
            <input type="password" id="settings-apikey" value="${escAttr(existing)}"
                   style="flex:1;border:1px solid var(--border);border-radius:4px;padding:6px 8px;font-size:0.9rem;">
            <button id="settings-toggle-vis" style="background:none;border:1px solid var(--border);border-radius:4px;padding:4px 8px;cursor:pointer;font-size:0.8rem;">Show</button>
          </div>
          <div style="margin-top:8px;display:flex;gap:8px;">
            <button id="settings-save-key" style="background:var(--accent);color:#fff;border:none;border-radius:4px;padding:6px 14px;font-size:0.85rem;cursor:pointer;">Save</button>
            <button id="settings-clear-key" style="background:none;border:1px solid var(--border);border-radius:4px;padding:6px 14px;font-size:0.85rem;cursor:pointer;">Clear</button>
          </div>
          <div id="settings-key-msg" style="font-size:0.8rem;color:var(--text-muted);margin-top:6px;">
            ${existing ? "Key is set." : "No key set. AI Suggest won't work without one."}
          </div>
        </div>

        <div style="border-top:1px solid var(--border);padding-top:16px;">
          <h3 style="font-size:0.9rem;font-weight:600;margin-bottom:8px;">Data</h3>
          <p style="font-size:0.85rem;color:var(--text-muted);">
            ${MerchantDict.size()} merchants categorized.
          </p>
        </div>
      </div>`;

    // Wire events
    document.getElementById("settings-save-key").addEventListener("click", () => {
      const val = document.getElementById("settings-apikey").value.trim();
      if (val) {
        localStorage.setItem(LS_KEY, val);
        document.getElementById("settings-key-msg").textContent = "Saved.";
        document.getElementById("settings-key-msg").style.color = "#2e7d32";
      } else {
        document.getElementById("settings-key-msg").textContent = "Enter a key first.";
        document.getElementById("settings-key-msg").style.color = "#c62828";
      }
    });

    document.getElementById("settings-clear-key").addEventListener("click", () => {
      localStorage.removeItem(LS_KEY);
      document.getElementById("settings-apikey").value = "";
      document.getElementById("settings-key-msg").textContent = "Key removed.";
      document.getElementById("settings-key-msg").style.color = "var(--text-muted)";
    });

    document.getElementById("settings-toggle-vis").addEventListener("click", () => {
      const inp = document.getElementById("settings-apikey");
      const btn = document.getElementById("settings-toggle-vis");
      if (inp.type === "password") { inp.type = "text"; btn.textContent = "Hide"; }
      else { inp.type = "password"; btn.textContent = "Show"; }
    });
  }

  function escAttr(s) {
    return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  return { render };
})();
