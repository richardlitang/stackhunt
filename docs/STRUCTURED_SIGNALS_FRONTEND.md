## Structured Signals Frontend Guide

This guide describes the UX changes needed to implement “Structured Signal Reports”
instead of free‑form reviews. The goal is to capture high‑signal user input without
moderation overhead and to create first‑hand experience signals for SEO.

---

### 1) Core UX Pattern (Signal Report)

Replace “Write a review” with short, fast, structured prompts:

1) **Agree with Pros?** [Yes] [No]\n
2) **Agree with Cons?** [Yes] [No]\n
3) **Experienced a gotcha?** [Hidden fee] [Setup cost] [SSO paywall]\n
4) **Vibe check after 3 months** [Still fast] [Getting cluttered] [Slow search]\n
5) **Switched from** [Jira] [Trello] [Asana] [Other]

All of these map to `signal_definitions` + `signal_options` in the DB.

---

### 2) Suggested Placement

**Tool page (highest priority):**
- Add a “Report a signal” block under the AI pros/cons.
- Show summary badges above it (aggregates):  
  “80% agree with pros” · “22 reports of slow search” · “Most common switch: Jira”

**Compare page:**
- Add a compact “User signals” section under contextual pros/cons.
- Show which tool has stronger sentiment on key signals.

**Best list pages:**
- Show a “Community signal badge” per tool (“Fast UI”, “Hidden fee reports”).

---

### 3) Display Aggregates (read‑only)

Use `signal_aggregates` for fast display:
- total count
- positive vs negative
- top options

Example UI:
```
Community Signals
✅ 83% agree with pros
⚠️ 12 users reported hidden setup fees
🔁 Most common switch: Jira
```

---

### 4) Submission Flow (No Account Required)

Use anonymous signal capture:
- Submit via `record_signal(...)` RPC.
- Reuse IP hash + fingerprint hash logic (same as votes).

Anti‑spam:
- Throttle by IP hash (rate limits table can be reused).
- Max 1 signal per item per signal per 24h.

---

### 5) Trust + SEO

Make signals visible, but lightweight:
- “Reported by community” label.
- “Verified payer” (future SaaS phase).

---

### 6) Schema Mapping (Backend)

Frontend widgets should map to:
- `signal_definitions.key`
- `signal_options.key`
- Submit via `record_signal(...)` RPC

---

### 7) Phase Rollout

**Phase 1 (Now)**
- Agree with pros/cons
- Gotcha signals

**Phase 2**
- Vibe check
- Switch signals

**Phase 3 (SaaS)**
- Verified payer badges
- “You spend $X” signals

---

If you want, I can provide React/Astro components for:
- SignalReportWidget
- SignalAggregatesBadge
- CompareSignalsRow
