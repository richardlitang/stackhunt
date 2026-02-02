# Smart Schema Quick Reference

> **Location:** `src/lib/hunter/schemas/category-schemas.ts`

## Philosophy

Different buyers care about different things. Instead of extracting 50 fields for every tool, we extract:
- **Universal baseline** (~10 fields) for ALL tools
- **Category-specific fields** (~5-8 fields) based on tool type

This reduces extraction cost by ~40% while increasing data relevance.

---

## Universal Baseline (Always Extract)

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Tool name |
| `logo_url` | string | Logo URL |
| `homepage_url` | string | Main website |
| `description_short` | string | One sentence, max 150 chars |
| `pricing_model` | enum | free, freemium, flat, per_seat, usage_based, contact_sales |
| `starting_price_monthly` | number | Cheapest paid plan |
| `ideal_customer_profile` | string | "Freelancers", "Enterprise IT teams" |
| `killer_feature` | string | THE one differentiator |
| `platforms` | object | web, ios, android, mac, windows, linux |

---

## Category-Specific Fields

### A. Infrastructure & Databases
**Examples:** Supabase, Firebase, PlanetScale, Vercel
**Persona:** CTO / Lead Dev
**Cost:** +$0.01

| Field | Type | Why It Matters |
|-------|------|----------------|
| `free_tier_hard_cap` | boolean | TRUE = safe (app pauses), FALSE = auto-charges |
| `data_residency` | string[] | ["US", "EU", "Global"] - GDPR critical |
| `self_hostable` | boolean | Exit strategy if vendor dies |
| `backup_policy` | string | "Point-in-time recovery, 30 days" |
| `cold_start_time` | string | For serverless: "~250ms" |

### B. Enterprise SaaS
**Examples:** Salesforce, HubSpot, Workday, ServiceNow
**Persona:** VP / CIO
**Cost:** +$0.02

| Field | Type | Why It Matters |
|-------|------|----------------|
| `sso_included_plan` | string | Which plan includes SSO |
| `sso_tax_pct` | number | % price increase for SSO |
| `compliance_certs` | string[] | ["SOC2 Type II", "ISO 27001"] |
| `implementation_time` | enum | instant, days, weeks, months |
| `dedicated_support` | boolean | Named account manager |
| `audit_logs_included` | boolean | Activity logs in base plan |

### C. Productivity & Knowledge
**Examples:** Notion, Obsidian, Linear, Roam
**Persona:** Knowledge Worker
**Cost:** +$0.01

| Field | Type | Why It Matters |
|-------|------|----------------|
| `migration_difficulty` | enum | trivial → locked |
| `export_formats` | string[] | ["Markdown", "HTML", "JSON"] |
| `import_from` | string[] | Tool slugs with native import |
| `offline_mode` | boolean | Works without internet |
| `real_time_collab` | boolean | Google Docs-style editing |
| `mobile_experience` | enum | native, pwa, wrapper, none |

### D. Developer Tools
**Examples:** GitHub, Postman, Docker
**Persona:** Maker / Senior Engineer
**Cost:** +$0.00 (info on main site)

| Field | Type | Why It Matters |
|-------|------|----------------|
| `api_completeness` | boolean | Can do everything via API |
| `cli_available` | boolean | Official CLI tool |
| `sdk_languages` | string[] | ["JavaScript", "Python", "Go"] |
| `extensions_marketplace` | boolean | Community plugins |
| `open_source_tier` | boolean | FOSS version available |
| `api_rate_limit` | string | "5000 req/hour" |

### E. Design & Marketing
**Examples:** Figma, Canva, Semrush, Ahrefs
**Persona:** Creative / Marketing Manager
**Cost:** +$0.01

| Field | Type | Why It Matters |
|-------|------|----------------|
| `asset_storage_limit` | string | "Unlimited", "100GB" |
| `version_history_days` | number | How far back can undo |
| `collaboration_style` | enum | realtime, async, none |
| `guest_access` | boolean | Share with non-paying viewers |
| `usage_credits` | string | "500 keywords/day" |
| `whitelabel` | boolean | Remove vendor branding |

### F. CRM & Sales
**Examples:** HubSpot, Pipedrive, Salesforce, Close
**Persona:** VP of Sales
**Cost:** +$0.01

| Field | Type | Why It Matters |
|-------|------|----------------|
| `contact_limit` | number | Max contacts before price hike |
| `contact_overage_cost` | string | "$50/1000 contacts" |
| `email_sequence_limit` | number | Daily email send limit |
| `has_dialer` | boolean | Built-in calling |
| `lead_scoring` | boolean | AI lead scoring |
| `pipeline_views` | number | Number of pipelines allowed |

### G. Customer Support
**Examples:** Intercom, Zendesk, Freshdesk
**Persona:** Support Lead
**Cost:** +$0.01

| Field | Type | Why It Matters |
|-------|------|----------------|
| `pricing_metric` | enum | per_agent, per_ticket, per_contact, flat |
| `chatbot_included` | boolean | AI/Bot in base plan |
| `omnichannel` | string[] | ["email", "chat", "phone", "social"] |
| `canned_responses_limit` | number | Macro limit |

### H. HR & Recruiting
**Examples:** Ashby, Deel, Rippling, Gusto
**Persona:** HR Director
**Cost:** +$0.02

| Field | Type | Why It Matters |
|-------|------|----------------|
| `geo_compliance` | string[] | Countries supported |
| `service_type` | enum | hris, ats, eor, payroll, benefits |
| `handles_contractors` | boolean | Contractor payments |
| `handles_full_time` | boolean | Full-time employees |
| `payroll_integrations` | string[] | ["Xero", "QuickBooks"] |

### I. Finance & Accounting
**Examples:** QuickBooks, Xero, Brex, Ramp
**Persona:** CFO / Controller
**Cost:** +$0.01

| Field | Type | Why It Matters |
|-------|------|----------------|
| `multi_currency` | boolean | Bill in USD, pay in EUR |
| `multi_entity` | boolean | Consolidate companies |
| `bank_feeds_regions` | string[] | ["US", "UK", "EU"] |
| `plaid_supported` | boolean | Direct bank connection |
| `approval_workflows` | boolean | Manager sign-off |
| `receipt_ocr` | boolean | Auto-scan receipts |

### J. Security & Identity
**Examples:** 1Password, Okta, Auth0
**Persona:** CISO
**Cost:** +$0.02

| Field | Type | Why It Matters |
|-------|------|----------------|
| `encryption_model` | enum | zero_knowledge, byok, managed |
| `audit_log_retention_days` | number | How far back logs go |
| `device_management` | boolean | Remote wipe |
| `mfa_options` | string[] | ["TOTP", "WebAuthn", "SMS"] |
| `compliance_reports_downloadable` | boolean | Grab SOC2 PDF |

---

## Usage in Hunter

```typescript
import { getSchemaForCategory, getExtractionPrompt } from '@/lib/hunter/schemas';

// Get the right schema for extraction
const schema = getSchemaForCategory('databases');

// Get LLM prompt with field descriptions
const prompt = getExtractionPrompt('databases');
// Returns: "You are analyzing a Databases tool. Extract: free_tier_hard_cap (TRUE = app pauses...)..."

// Validate extracted data
const validated = schema.parse(extractedData);
```

---

## Cost Breakdown

| Category | Base Cost | Extra Cost | Total |
|----------|-----------|------------|-------|
| Developer Tools | $0.15 | +$0.00 | $0.15 |
| Productivity | $0.15 | +$0.01 | $0.16 |
| Design/Marketing | $0.15 | +$0.01 | $0.16 |
| CRM/Sales | $0.15 | +$0.01 | $0.16 |
| Infrastructure | $0.15 | +$0.01 | $0.16 |
| Customer Support | $0.15 | +$0.01 | $0.16 |
| Finance | $0.15 | +$0.01 | $0.16 |
| Enterprise SaaS | $0.15 | +$0.02 | $0.17 |
| HR/Recruiting | $0.15 | +$0.02 | $0.17 |
| Security | $0.15 | +$0.02 | $0.17 |

**Average:** ~$0.16/tool (vs $0.25/tool with kitchen-sink approach)

---

## What We DON'T Extract (By Design)

| Skipped Field | Reason |
|---------------|--------|
| `mobile_app_rating` | Varies by platform, changes constantly |
| `community_vibe` | Too subjective, hard to validate |
| `customer_support_quality` | Self-reported, unreliable |
| `learning_curve` for DevTools | Devs expect to read docs |
| `compliance_certs` for Productivity | Unless B2B, not relevant |
| `api_access` for Design tools | Designers don't script |
| `requires_developer` for DevTools | Obviously yes |

---

## Mapping Your Categories

If your category slug doesn't match exactly, the system falls back to base schema.

To add new mappings, update `CategorySchemaMap` in `category-schemas.ts`:

```typescript
export const CategorySchemaMap = {
  'your-new-category': ProductivitySchema, // Map to closest match
  // ...
};
```
