# Pigeon Scratch — Specification

## Architecture

Static site hosted on GitHub Pages. All processing client-side. Sync via a private GitHub repo using a Personal Access Token. Data encrypted client-side before sync using a shared passphrase. Optional DeepSeek API calls for merchant categorization and Ask Pigeon.

```
┌─────────────────────────────────────────────────────┐
│  Browser (your laptop, wife's laptop, phones)       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Pigeon Scratch (static JS app)             │    │
│  │  - IndexedDB: local working data            │    │
│  │  - localStorage: tokens, passphrase hash    │    │
│  └─────────────────────────────────────────────┘    │
└──────────────┬──────────────────────┬───────────────┘
               │                      │
               │ Encrypted JSON       │ Scrubbed merchant
               │ via GitHub API       │ strings, aggregates
               ▼                      ▼
   ┌──────────────────────┐   ┌──────────────────────┐
   │  Private GitHub repo │   │  DeepSeek API        │
   │  pigeon-scratch-data │   │  (categorize + ask)  │
   └──────────────────────┘   └──────────────────────┘
```

## Modules

The app is split into discrete modules so they can be worked on independently. Each module exposes a small explicit API and minimizes cross-module dependencies. Each lives in `src/<name>/`.

### 1. `import/` — CSV parsing and normalization
- Uses PapaParse to read CSVs from the user's bank and credit card providers.
- Detects format heuristically or via a user-selected profile.
- Normalizes to the canonical Transaction shape (see Data Model).
- Tags inter-account transfers (credit card payments, savings transfers) as `Transfer` to prevent double-counting in spending math.

### 2. `storage/` — Local data and sync
- IndexedDB for the working dataset.
- localStorage for tokens, passphrase verifier, settings.
- Sync layer: pull-on-load, push-on-change, last-write-wins, with a "last synced" indicator.
- Encryption layer (`crypto/`) wraps every sync operation.

### 3. `crypto/` — Client-side encryption
- Web Crypto API (AES-GCM).
- Key derived from user passphrase via PBKDF2.
- Encrypts/decrypts the full data blob on every sync round-trip.
- Stores only a passphrase *verifier* (a hash) in localStorage, never the passphrase or the key.

### 4. `categorize/` — Merchant dictionary and recurring detection
- Local merchant→category dictionary built up over time.
- User-facing categories: **Food, Bills, Extra**. Plus **Income** and **Transfer** for the math.
- Recurring detection: same merchant + similar amount + regular cadence → flagged as recurring.
- New merchants surfaced for user labeling. AI assist (via `ai/`) optional.

### 5. `analyze/` — Aggregation and trends
- Pure functions on the transaction set.
- Computes: monthly totals, category breakdowns, recurring summary, rolling averages, outlier months, top-N extras.
- No side effects, no storage access — takes data in, returns numbers out. Easy to unit test in console.

### 6. `ai/` — DeepSeek integration
- Three functions: `categorizeMerchants(strings)`, `narrateMonth(aggregates)`, `askPigeon(question, context)`.
- All prompts in `ai/prompts.js`. Editable without touching call logic.
- Enforces privacy rules at the call site — never accepts raw transaction objects, only scrubbed inputs.

### 7. `ui/` — Interface
- Vanilla JS, no framework.
- Screens: Dashboard, Transaction Review, Ask Pigeon, Settings, Import.
- Loading state: the pigeon-pecking GIF.

## Data model

### Transaction (canonical shape)
```js
{
  id: "txn_<hash>",            // deterministic from source+date+amount+merchant
  date: "2025-09-14",          // ISO date
  amount: -48.32,              // negative = outflow, positive = inflow
  merchantRaw: "SQ *AC HARDWARE 412",
  merchantClean: "AC HARDWARE",
  category: "Extra",           // Food | Bills | Extra | Income | Transfer
  isRecurring: false,
  account: "visa",             // user-defined account label
  notes: ""
}
```

### Merchant dictionary entry
```js
{
  pattern: "AC HARDWARE",      // matched against merchantClean
  category: "Extra",
  isRecurring: false,
  labelledBy: "user",          // user | ai | rule
  confirmedAt: "2025-09-14"
}
```

### Recurring rule
```js
{
  merchantClean: "NETFLIX",
  expectedAmount: 17.99,
  amountTolerance: 1.00,
  cadenceDays: 30,
  cadenceTolerance: 3,
  lastSeen: "2025-09-04"
}
```

### Sync blob (encrypted before upload)
```js
{
  version: "0.x.y",
  transactions: [...],
  merchantDict: [...],
  recurringRules: [...],
  settings: {...},
  lastModified: "2025-09-14T12:00:00Z"
}
```

## Core flows

### First-time setup
1. User visits the GitHub Pages URL.
2. Prompted for: (a) GitHub PAT with `repo` scope, (b) target private repo name, (c) shared passphrase, (d) DeepSeek API key (optional).
3. App checks for existing data blob in the repo. If found, decrypts. If not, initializes empty state.
4. User imports their first CSV.

### CSV import
1. User selects CSV file and tags it with an account label (e.g. "checking", "visa").
2. PapaParse reads it.
3. App detects format or asks for column mapping.
4. Each row normalized to Transaction shape, deduplicated against existing data.
5. New merchants surfaced for review; user can confirm/edit categories. AI assist offered for unfamiliar ones.
6. Recurring detection runs on the updated set.
7. Encrypted sync pushed.

### Monthly review
1. Dashboard shows the current month's picture:
   - Income (total + breakdown)
   - Fixed outflow (recurring charges, totalled)
   - Discretionary spending by category
   - Top 5 "extras" (largest non-bill, non-food transactions)
   - Trend vs trailing 3-month average
   - Narrator paragraph (generated via AI, optional)
2. User can drill into any category to see transactions.
3. New recurring detections surfaced as "We noticed these — are they intentional?"

### Ask Pigeon
1. User types a question into the Ask Pigeon box.
2. App assembles context: aggregates + scrubbed transactions filtered to relevant period/category.
3. Sends question + context + system prompt to DeepSeek.
4. Response shown in the box. Conversation history kept in-session only (not persisted).

## Privacy and security rules

These are hard rules, not preferences.

1. **Never commit secrets.** PATs, passphrases, DeepSeek keys never appear in source, never get pushed to any repo. localStorage only.
2. **Encryption is mandatory on sync.** Data encrypted client-side before any network call. No plaintext data blob leaves the device.
3. **No raw transactions to AI.** What AI sees:
   - **Categorization**: cleaned merchant strings only. No amounts, dates, accounts.
   - **Narrator**: aggregate summary only. No transaction lines.
   - **Ask Pigeon**: aggregates + scrubbed transaction lines (clean merchant + amount + date). Never account numbers, IDs, or raw merchant strings.
4. **Passphrase is never stored.** Only a verifier hash, used to detect typos at unlock time.
5. **Inter-account transfers excluded from spending totals.** Credit card payments and savings transfers are tagged Transfer and excluded from category math.
6. **Settings include a "wipe local data" button** that clears IndexedDB and localStorage on the current device.

## DeepSeek prompt patterns

Located in `ai/prompts.js`. Each prompt is a function returning a system message + user message.

### Categorization
- **System**: "You categorize cleaned merchant strings into one of: Food, Bills, Extra. Respond with a JSON array of `{merchant, category}` only. No prose."
- **User**: JSON array of merchant strings.

### Narrator
- **System**: "You write one paragraph summarizing a month of household finances based on the supplied aggregate data. Be plain and factual. No advice, no judgment, no emojis. Note significant changes vs. the trailing 3-month average."
- **User**: JSON aggregate block.

### Ask Pigeon
- **System**: "You are Pigeon, a financial-hygiene assistant for one household. Answer only from the data provided. If the data doesn't contain the answer, say so. No advice unless asked. Plain prose, no lists unless the question calls for one."
- **User**: JSON context block + user question.

## Merchant string cleaning

Before any merchant string is stored, displayed, or sent to AI, it goes through `cleanMerchant(raw)`:

- Strip common payment-processor prefixes (`SQ *`, `TST*`, `SP *`, `PAYPAL *`).
- Strip trailing transaction numbers and store codes.
- Strip city/state/postal codes when they follow recognizable patterns.
- Collapse whitespace, uppercase.

Cleaning rules live in `categorize/cleanMerchant.js` and are added to over time as new patterns are spotted. Keep them as plain regexes with comments explaining the example they were added for.

## Versioning

Single source-of-truth version string in code, displayed in the UI footer. Bumped per the rules in CLAUDE.md. Roadmap milestones (`design.md`) correspond to Minor-version targets.

## Out of scope (for now)

- Multi-currency support.
- Mobile-native apps (the web app should work on mobile browsers).
- Real-time bank connections.
- Tax categorization.
- Shared editing conflict resolution beyond last-write-wins.
