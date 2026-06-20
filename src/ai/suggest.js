// src/ai/suggest.js — DeepSeek API client for merchant categorization
const AISuggest = (() => {
  const ENDPOINT = "https://api.deepseek.com/v1/chat/completions";
  const MODEL = "deepseek-chat";
  const LS_KEY = "pigeon-scratch-deepseek-key";

  function getKey() {
    return localStorage.getItem(LS_KEY);
  }

  async function suggest(merchants) {
    const apiKey = getKey();
    if (!apiKey) throw new Error("No API key. Set your DeepSeek API key in the Settings tab first.");

    const userMsg = Prompts.categorize.buildUser(merchants);

    let resp;
    try {
      resp = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + apiKey,
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.1,
          max_tokens: 8192,
          messages: [
            { role: "system", content: Prompts.categorize.system },
            { role: "user", content: userMsg },
          ],
        }),
      });
    } catch (err) {
      throw new Error("Network error calling DeepSeek: " + err.message);
    }

    let text;
    try { text = await resp.text(); } catch (_) { text = ""; }

    if (!resp.ok) {
      let detail = "";
      try { const e = JSON.parse(text); detail = e.error?.message || text; } catch (_) {
        detail = "Non-JSON response: " + text.slice(0, 300);
      }
      throw new Error("DeepSeek API error " + resp.status + (detail ? ": " + detail : ""));
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      throw new Error("Failed to parse DeepSeek response as JSON. Body: " + text.slice(0, 300));
    }

    const content = data.choices?.[0]?.message?.content;
    const finish = data.choices?.[0]?.finish_reason || "unknown";
    if (!content) throw new Error("DeepSeek returned empty content (finish_reason=" + finish + ").");

    // Parse the JSON from the content — try direct parse, then regex extraction
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (_) {
      const m = content.match(/\{[\s\S]*\}/);
      const tail = content.length > 400 ? "…" + content.slice(-200) : "";
      if (!m) throw new Error("No JSON object found. finish_reason=" + finish + " content: " + content.slice(0, 400) + tail);
      try { parsed = JSON.parse(m[0]); } catch (_) {
        throw new Error("JSON parse failed. finish_reason=" + finish + " content: " + content.slice(0, 400) + tail);
      }
    }

    // Validate: must be an object with string keys and valid category values
    if (typeof parsed !== "object" || Array.isArray(parsed) || !parsed) {
      throw new Error("DeepSeek returned unexpected format.");
    }

    const valid = new Set(["Bills", "Discretionary", "Income", "Transfer"]);
    const cleaned = {};
    for (const [merchant, cat] of Object.entries(parsed)) {
      if (valid.has(cat)) {
        cleaned[merchant] = cat;
      } else {
        cleaned[merchant] = "Discretionary"; // default
      }
    }

    return cleaned;
  }

  return { suggest, getKey };
})();
