// src/ai/suggest.js — DeepSeek API client for merchant categorization
const AISuggest = (() => {
  const ENDPOINT = "https://api.deepseek.com/v1/chat/completions";
  const MODEL = "deepseek-chat";
  const LS_KEY = "pigeon-scratch-deepseek-key";

  function getKey() {
    return localStorage.getItem(LS_KEY);
  }

  const BATCH_SIZE = 40;

  async function suggest(merchants) {
    const apiKey = getKey();
    if (!apiKey) throw new Error("No API key. Set your DeepSeek API key in the Settings tab first.");

    const results = {};
    for (let i = 0; i < merchants.length; i += BATCH_SIZE) {
      const chunk = merchants.slice(i, i + BATCH_SIZE);
      const userMsg = Prompts.categorize.buildUser(chunk);
      const batch = await callWithRetry(apiKey, userMsg, 3);
      Object.assign(results, batch);
    }
    return results;
  }

  async function callWithRetry(apiKey, userMsg, remaining) {
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
      if (remaining > 1) {
        await sleep(1500);
        return callWithRetry(apiKey, userMsg, remaining - 1);
      }
      throw new Error("Network error calling DeepSeek: " + err.message);
    }

    let text;
    try {
      text = await resp.text();
    } catch (_) {
      if (remaining > 1) {
        console.warn("DeepSeek: body read failed, retrying (" + (remaining - 1) + " left)");
        await sleep(1500);
        return callWithRetry(apiKey, userMsg, remaining - 1);
      }
      throw new Error("Failed to read DeepSeek response body. Connection may have dropped.");
    }

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
      console.error("DeepSeek parse failed. finish_reason=" + finish + ". Full content:", content);
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("No JSON object found in model response. Check DevTools console for full output (finish_reason=" + finish + ").");
      try { parsed = JSON.parse(m[0]); } catch (_) {
        throw new Error("JSON parse failed after regex extraction. Check DevTools console for full output (finish_reason=" + finish + ").");
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

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  return { suggest, getKey };
})();
