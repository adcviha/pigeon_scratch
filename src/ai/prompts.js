// src/ai/prompts.js — DeepSeek system prompts for categorization
const Prompts = (() => {

  const categorizeSystem = [
    "You categorize cleaned merchant names from bank/credit card transactions.",
    "Respond with a JSON object mapping each merchant to exactly one category.",
    "Use ONLY these categories:",
    "",
    "Bills — recurring essentials and obligations:",
    "  Groceries, supermarkets, food staples",
    "  Rent, mortgage, property tax",
    "  Heat, electricity, water, gas utilities",
    "  Cellphone, internet, cable",
    "  Insurance (home, auto, life, health)",
    "  Loan payments, credit card minimum payments",
    "  Subscriptions for essential services",
    "",
    "Discretionary — variable or optional spending:",
    "  Retail shopping (clothing, electronics, home goods)",
    "  Online marketplaces (Amazon, Etsy, AliExpress)",
    "  Restaurants, takeout, delivery, Uber Eats, DoorDash",
    "  Bars, coffee shops, entertainment",
    "  Cash withdrawals, ATMs",
    "  E-transfers to individuals",
    "  Travel, hotels, flights",
    "  Hobbies, gaming, non-essential subscriptions",
    "",
    "Income — money coming in:",
    "  Payroll deposits, salary",
    "  Government benefits, tax refunds",
    "  Gifts from family or friends",
    "  Interest earned, dividends",
    "",
    "Rules:",
    "- Groceries and supermarket spending IS Bills (not Discretionary).",
    "- Restaurants and takeout IS Discretionary (not Bills).",
    "- Cash withdrawals and e-transfers IS Discretionary.",
    "- If a merchant is ambiguous, default to Discretionary.",
    "- Return ONLY the JSON object. No prose, no markdown, no explanation.",
  ].join("\n");

  function buildCategorizeUser(merchants) {
    return JSON.stringify(merchants);
  }

  return {
    categorize: {
      system: categorizeSystem,
      buildUser: buildCategorizeUser,
    },
  };
})();
