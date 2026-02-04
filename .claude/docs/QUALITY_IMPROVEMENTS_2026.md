# Quality Improvements: Feb 2026 Data Quality Audit

Based on Aider review feedback revealing critical data quality issues.

## 1. Name Collision Detection ✅ IMPLEMENTED

**Problem:** Aider.chat (CLI coding tool) data mixed with Aider.ai (accounting software)
- Wrong pricing: $300/mo "Advisors" plan  
- Wrong integrations: Xero, QuickBooks
- Wrong categories: "Accounting Automation"

**Solution:**
- `name-collision-detector.ts` - Detects conflicting domains in research sources
- Pre-extraction filtering removes sources from wrong companies
- Post-extraction category validation flags mismatches
- Logs: `[Name Collision] HIGH confidence collision detected`

**Status:** ✅ Committed (e1bf84d)

---

## 2. Source Corroboration Improvements ✅ IMPLEMENTED

**Problem:** Negative claims lacked legal protection

**Solution:**
- 2+ independent sources required for all negative claims (cons, vetoLogic, realityChecks)
- 7 tribal threads scraped (up from 3) for better source diversity
- Corroborating source URLs logged for transparency

**Status:** ✅ Committed (e542ede, 7ec824f)

---

## 3. Model List Currency (2026 Models) 🚧 TODO

**Problem:** Listing 2024/25 models (Claude 3.5, GPT-4o) in Feb 2026

**Fix needed:** Update extraction to prioritize 2026 models
- Claude 3.7 / 4, GPT-5 / o3, DeepSeek-R1/V3, Gemini 2.0 Pro

---

## 4. GitHub Stars for CLI Tools 🚧 TODO

**Problem:** "1 Review" looks weak for open-source tools with 25k+ stars

**Fix needed:** Scrape GitHub stars and display instead of review count for CLI tools

---

## 5. Feature Detection: Architect Mode 🚧 TODO  

**Problem:** Missing key workflow features (two-stage planning, token optimization)

**Fix needed:** Enhance extraction prompts to detect technical workflows

---

## Testing

```bash
npm run hunt -- --tool="Aider" --context="Best AI Code Editor" --rehunt
```

Expected: No Aider.ai accounting data, proper aider.chat coding tool data only
