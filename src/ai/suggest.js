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
          messages: [
            { role: "system", content: Prompts.categorize.system },
            { role: "user", content: userMsg },
          ],
        }),
      });
    } catch (err) {
      throw new Error("Network error calling DeepSeek: " + err.message);
    }

    if (!resp.ok) {
      let detail = "";
      try { const e = await resp.json(); detail = e.error?.message || JSON.stringify(e); } catch (_) {
        const text = await resp.text();
        detail = "Non-JSON response: " + text.slice(0, 300);
      }
      throw new Error("DeepSeek API error " + resp.status + (detail ? ": " + detail : ""));
    }

    let data;
    try { data = await resp.json(); } catch (_) {
      const text = await resp.text();
      throw new Error("Failed to parse DeepSeek response as JSON. Body: " + text.slice(0, 300));
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek returned an empty response.");

    // Parse the JSON from the content — try direct parse, then regex extraction
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (_) {
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Could not parse categorization JSON from DeepSeek response.");
      try { parsed = JSON.parse(m[0]); } catch (_) {
        throw new Error("Could not parse categorization JSON from DeepSeek response.");
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
