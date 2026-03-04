# Feature: Operational Specs (Non-Pricing) + Spec Packs

Last verified: 2026-03-05

## Goal
Rename “Technical Specs” to “Operational Specs” and populate it with structured, non‑pricing operational facts (interfaces, security, data handling, limits). Add ETL routing rules to keep pricing and feature fluff out of specs. Render via category-based spec packs.

## Architecture Overview
Introduce a structured `operationalSpecs` object in `specs` that contains four blocks (Access/Interfaces, Admin/Security, Data/Portability, Operational Limits). In analysis, extract operational specs into a dedicated object using prompts/schema. In persistence, apply routing filters to exclude pricing/feature contamination. Update `DynamicSpecs` to render “Operational Specs” via spec packs based on category.

## Tech Stack
- Hunter analysis schema (`src/lib/hunter/types.ts`)
- Synthesis prompt (`src/lib/hunter/services/prompts.ts`)
- Persistence routing (`src/lib/hunter/phases/persistence.ts`)
- UI rendering (`src/components/DynamicSpecs.astro`)

## Tasks

### Task 1: Define Operational Specs schema in analysis output
**Files:**
- Modify: `src/lib/hunter/types.ts`

**Action:** Add `operationalSpecs` to `HunterAnalysis` and `AnalysisSchema` with structured fields:
- `access.platforms[]`
- `access.api.exists/type/docs_url`
- `access.webhooks.exists/docs_url`
- `access.import_formats[]`
- `access.export_formats[]`
- `security.sso/scim/audit_logs/mfa/passkeys/compliance[]`
- `data.retention/residency/encryption_at_rest/encryption_in_transit/export_delete_support`
- `limits.context_window/file_size/rate_limits/concurrency/timeout/notes[]`

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(hunter): add operational specs schema`

---

### Task 2: Update synthesis prompt to extract operational specs
**Files:**
- Modify: `src/lib/hunter/services/prompts.ts`

**Action:** Add explicit Operational Specs section and JSON schema snippet. Rules:
- No pricing, no plan names, no tiers
- No feature fluff (only interfaces, security, data handling, limits)
- Use “varies by plan” without names if needed

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(hunter): extract operational specs in synthesis`

---

### Task 3: Route specs in persistence and apply contamination filters
**Files:**
- Modify: `src/lib/hunter/phases/persistence.ts`

**Action:**
- Map `analysis.operationalSpecs` into `specs.operationalSpecs`.
- Add filter that drops any spec value containing pricing/tier markers (`$`, `/mo`, `per user`, `enterprise`, `pro`, etc.).
- Add filter to drop feature-like phrasing ("supports", "lets you", "includes") unless in interface fields.

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(hunter): persist operational specs with routing filters`

---

### Task 4: Rename and re-render section in UI
**Files:**
- Modify: `src/components/DynamicSpecs.astro`
- Modify: `src/pages/tool/[slug].astro` (if needed)

**Action:**
- Rename section title to “Operational Specs”.
- Render four blocks with spec-pack ordering based on category:
  - `ai-automation` or AI models: prioritize Interfaces + Limits + Data + Security
  - `design`/creative: prioritize Platforms + Admin/Security + Portability + Limits
  - `automation`/iPaaS: prioritize Interfaces + Limits + Data + Security
- Fall back to generic order if no pack.

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(ui): render operational specs with spec packs`

---

## Human Checkpoint
- Confirm schema fields and category-to-pack mapping before coding.

