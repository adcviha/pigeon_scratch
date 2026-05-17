# Pigeon Scratch — Design

## What this is

A small private web app for monthly financial hygiene. You and your wife upload your bank and credit card CSVs, and Pigeon Scratch helps you see what's actually coming in, what's going out, and what's quietly recurring — so you can sit down once a month, feel oriented, and prune what isn't serving you.

## What it isn't

- A budgeting app. We are not setting category limits or sending notifications.
- An accounting tool. We are not balancing to the cent or tracking every coffee.
- An automated classifier. The point is *you* understanding your money, not an algorithm hiding it from you.
- A real-time dashboard. The cadence is monthly + as-needed.

## Who it's for

Two people in a household who want to sit down together, look at the picture, and make decisions with confidence. Used at roughly a monthly cadence, with ad-hoc visits when something feels off or a big decision is coming up.

## Core principles

1. **Visibility over control.** The app's job is to show you what's there, not to tell you what to do.
2. **Narrator, not taskmaster.** When the app speaks, it summarizes — it doesn't nag.
3. **Low effort to use.** If a sit-down feels like managing the app instead of looking at your finances, we've failed.
4. **Private by default.** Data lives encrypted. Nothing identifying leaves the device beyond what's strictly necessary for AI features.
5. **Hackable.** The source should be legible and modifiable by anyone with intermediate web skills. No build step, no minification.

## Anti-goals

- No meticulous transaction-by-transaction sorting.
- No category limits, budget alerts, guilt mechanics, or gamification.
- No streaks, scores, or "financial health" metrics.
- No automatic AI categorization of every transaction — only of merchants you haven't labeled yet.
- No raw transaction data sent to third-party AI.

## The five questions

Every screen, summary, and feature should help answer one of these:

1. What's our true monthly take-home?
2. What's our fixed monthly outflow?
3. What's left as discretionary, and roughly how was it spent?
4. Are there recurring charges we forgot about or aren't using?
5. Were there months where things went sideways, and why?

If a feature doesn't help answer one of these, it probably doesn't belong.

## Success criteria

- You actually use it. Six months in, the sit-down still happens.
- It takes under five minutes to import a new month and see the picture.
- You and your wife leave each sit-down with a shared understanding of the month.
- You catch at least one quietly-recurring charge you'd forgotten about within the first three months.

## Roadmap (Minor versions)

These are the planned Minor-version milestones. Each is one feature, shipped end-to-end before the next begins.

- **v0.1** — CSV import + local IndexedDB + transaction list view.
- **v0.1** — CSV import + local IndexedDB + transaction list view.
- **v0.2** — Categorization + merchant dictionary + AI Suggest.
- **v0.3** — Recurring detection + dashboard.
- **v0.4** — Encrypted GitHub repo sync.
- **v0.5** — Narrator paragraph on monthly review.
- **v0.6** — Ask Pigeon.
- **v0.7** — Settings, wipe-local, multi-device polish.
- **v1.0** — Stable data format. Pigeon Scratch is in regular use.
