# CLAUDE.md — Pigeon Scratch

## Project summary

Pigeon Scratch is a small private financial-hygiene web app. You and the user's wife sit down monthly, look at imported bank/credit-card CSVs, and prune what isn't serving them.

Read before any non-trivial change:
- **`design.md`** — the philosophy and goals. Consult when deciding whether a feature fits.
- **`spec.md`** — the functional spec, data model, and module breakdown.

## Tech stack and constraints

- **Vanilla JS.** No framework. No build step.
- **PapaParse** for CSV parsing. Loaded from CDN.
- **Web Crypto API** for encryption (AES-GCM, PBKDF2).
- **GitHub API** for sync (via `fetch`).
- **DeepSeek API** for AI features (via `fetch`).
- Static hosting on **GitHub Pages**.
- The build step IS the cost. Do not introduce one "to make things cleaner."

## Module map

Each module lives in `src/<name>/` and exposes a small explicit API. When working on one, do not silently change another. Cross-module calls go through the API, not through internals.

- `import/` — CSV parsing and normalization
- `storage/` — IndexedDB + GitHub repo sync
- `crypto/` — client-side encryption
- `categorize/` — merchant dictionary, recurring detection, merchant string cleaning
- `analyze/` — pure aggregation and trends
- `ai/` — DeepSeek integration + prompts
- `ui/` — screens and interactions

## Hard rules

Non-negotiable, apply to every change.

1. **Never commit secrets.** No PATs, passphrases, or API keys in source or git history. They live in localStorage only.
2. **Never send raw transactions to AI.** Only scrubbed/aggregated data per `spec.md` Privacy Rules.
3. **Encryption is mandatory on every sync.** No plaintext data blob ever leaves the device.
4. **Inter-account transfers are tagged Transfer and excluded from spending math.** Double-counting credit card payments is the #1 way to corrupt the picture.
5. **No new dependencies without flagging the trade-off first.** PapaParse is in. Anything else is a conversation.
6. **No build step. No minification. No framework.**

## Code conventions

- **Readable over clever.** No one-liners flexing. Comments explain *why*, not *what*.
- **Hackable.** Someone with intermediate JS skill should be able to open a file, find the relevant section, and modify it without setup.
- `const` declarations before any code that uses them, even within a file.
- Functions short and named for what they do.
- Internals exposed on a global for console hacking — `window.PIGEON` with submodules (`PIGEON.analyze`, `PIGEON.storage`, etc.).

## Versioning (SemVer as strings)

Use **Major.Minor.Patch** as strings, not decimals. `0.9.10` comes after `0.9.9`.

- **Patch** (0.9.0 → 0.9.1): Bug fixes, polish, small tweaks. No new features.
- **Minor** (0.9.0 → 0.10.0): New feature, tool, or system. The only thing that moves the feature number forward.
- **Major** (0.9.0 → 1.0.0): Breaking change to the data format, data model, or core workflow.

**CRITICAL: `design.md` roadmap milestones are Minor targets.** If `design.md` says "v0.4 — Encrypted sync," that means the 0.4.x series delivers encrypted sync. Ship it as `0.4.0`. Bug fixes after that are `0.4.1`, `0.4.2`. Do NOT bump Minor for bug fixes.

Git commits are tagged with the version. Push to master auto-deploys via GitHub Pages.

## Working protocol (every task, every time)

Before writing any code, follow these four steps in order.

### 1. Translate the Vibe
The user describes behavior in plain English ("make the dashboard feel calmer"). Translate this into technical terms ("reduce visual weight: smaller font, lower-contrast secondary numbers, more whitespace between sections") and state your approach in one sentence. If the description is ambiguous, ask the one clarifying question that matters most.

### 2. Version bump
State the new version number based on SemVer above. The version string goes in every place it's referenced.

### 3. The GO Gate
List every file you will modify or create. State the plan in 2-3 sentences. Then **stop and wait** for the user to say "GO" before writing any code. Do not output code, diffs, or implementations until you hear "GO."

### 4. No reinventing wheels
If a request can be handled by an existing library method, browser API, or a function already in the codebase, say so and use it. Don't write custom math when the library already does it. PapaParse handles CSV. Web Crypto handles encryption. The Intl API handles formatting.

## When making changes

- **Always follow the Working Protocol.** Never skip the GO Gate.
- Test in-browser. There is no lint or build step to lean on.
- If a feature is getting complex, that's a signal to redesign the workflow, not pile on code.
- Match the user's pace. They are still prototyping. Don't over-engineer ahead of decisions they haven't made.
- One commit per version increment. Don't batch unrelated changes.

## When to push back

- A request that would require adding a framework, build chain, or large dependency — flag the trade-off before doing it.
- A feature that conflicts with `design.md` (anti-goals, principles, the five questions).
- Any change that softens a Hard Rule.
- Anything cascading or recursive that creates nested mental models — flat is preferred.

## When to confirm before coding

- **The user describes a behavior change imprecisely** (vague language, contradictory signals, "I'm not sure how to describe this"). Pause, replay what you understood in your own words, get explicit confirmation, then GO Gate.
- Signals: "I'm not exactly sure how to describe that," "it's like... but also...," "I can't imagine exactly without trying," or a fix description that contradicts the described behavior.
- Once confirmed, implement exactly what was agreed. Don't add "while I was in there" changes.

## Common pitfalls

Watch for these — they came up in design conversations:

- **Visa-payment double-counting.** Credit card payments appearing as outflows on the bank statement AND as the originating purchases on the Visa statement. The fix: tag transfers, exclude from spending math.
- **Sending raw transactions to AI.** Easy to slip into. The categorization and Ask Pigeon prompts in `ai/prompts.js` define what's allowed to leave the device — enforce in `ai/` at the call site.
- **PAT scope creep.** The GitHub PAT needs `repo` scope only. Don't ask for more.
- **Over-categorization.** Three user-facing categories: Bills, Discretionary, Income (plus Transfer for inter-account moves). Don't add categories without a `design.md` conversation first.
- **Treating "Discretionary" as something to break down.** It's intentionally a catch-all for variable spending. The way you keep an eye on it is the top-5 surface, not sub-categories.
- **Storing the passphrase or derived key.** Only the verifier hash. The key is derived per-session from the user's typed passphrase.

## How to run locally

It's a static site. Open `index.html` in a browser, or serve the directory with any static server. On Google Cloud Shell, use the built-in web preview on port 8080:

```sh
python3 -m http.server 8080
```

Then use Web Preview → Preview on port 8080.

No build, no install, no npm.
