# Setup Extraction Feature

## Overview

The **Setup Extraction** feature extracts the actual onboarding steps for tools, providing users with a realistic "First 5 Minutes" guide. This addresses a major gap in traditional SaaS review sites, which typically describe setup as "easy" or "intuitive" without providing concrete steps.

## Problem Solved

**Traditional Review Sites:**
- "Cursor is easy to set up" ❌
- No CLI commands shown
- No mention of permission requirements
- Users have no idea what they're getting into

**StackHunt with Setup Extraction:**
- Actual steps: `brew install cursor` ✅
- Friction score: 3/10 (requires Full Disk Access)
- Red tape flags: Admin Required
- Aha moment: "Seeing the Composer (Cmd+I) refactor your first file"

## Schema

### SetupComplexityData

```typescript
interface SetupComplexityData {
  // V1: Binary flags (backward compatible)
  requires_developer: boolean;
  requires_it_admin: boolean;
  implementation_partner_needed: boolean;
  estimated_setup_time: 'minutes' | 'hours' | 'days' | 'weeks';
  technical_blockers?: string[];

  // V2: Detailed setup path (NEW)
  setup_type?: 'cli' | 'web' | 'installer' | 'hybrid' | 'api_only';
  friction_score?: number;  // 1 (instant) to 10 (multi-day)
  steps?: SetupStep[];
  aha_moment?: string;
  red_tape?: SetupRedTape;
  setup_url?: string;
}

interface SetupStep {
  step: number;
  action: string;       // "Run 'brew install cursor'"
  command?: string;     // "brew install cursor"
  description?: string; // "Downloads .dmg for macOS"
}

interface SetupRedTape {
  cc_required?: boolean;
  domain_required?: boolean;
  admin_required?: boolean;
  sales_gated?: boolean;
  approval_required?: boolean;
}
```

## Extraction Logic

### Where It Happens

1. **Prompt**: `src/lib/hunter/prompts/extraction.ts` (STEP 2.5)
2. **Schema**: `src/lib/knowledge-card.ts` (setup_complexity field)
3. **Logging**: `src/lib/hunter/phases/research.ts` (QA logging section)
4. **Storage**: `items.metadata.setup_complexity` (JSONB in Postgres)

### Extraction Rules

The Gemini LLM is instructed to:

1. **Find actual commands** - Extract CLI commands verbatim from docs (don't paraphrase)
2. **Identify setup type** - CLI, web, installer, hybrid, or API-only
3. **Calculate friction score** - 1 (instant OAuth) to 10 (multi-server deployment)
4. **Extract 3-5 key steps** - Focus on technical steps, skip obvious "Create account"
5. **Flag red tape** - CC required, domain required, admin access, sales-gated
6. **Capture aha moment** - The first "wow" moment that proves it works
7. **Link to docs** - Direct URL to official setup guide

### Friction Score Scale

| Score | Example | Description |
|-------|---------|-------------|
| 1 | ChatGPT, Notion | OAuth login with Google/GitHub |
| 3 | OpenAI SDK, Stripe | `npm install` + API key |
| 5 | Vercel, Netlify | CLI setup + domain configuration |
| 7 | GitLab (self-hosted) | Docker setup + environment variables |
| 10 | Kubernetes | Multi-server deployment + SSL + migration |

## Usage in Hunter Pipeline

The setup extraction happens automatically during the Research phase:

```bash
npm run hunt -- --tool="Cursor" --context="Best for AI Code Editors"
```

**Output:**
```
[Setup] Time: minutes, Type: installer, Friction: 3/10
[Setup] Required: Admin access
[Setup] Steps (3):
  1. Run 'brew install cursor' or download .dmg
  2. Sign in with GitHub
  3. Open a folder and run 'Index Folder'
[Setup] Aha moment: Seeing the 'Composer' (Cmd+I) refactor your first file
[Setup] 🚨 Red tape: Admin access
```

## Frontend Display (Future)

### Component Ideas

1. **Terminal View** (for CLI tools)
   - Code block with "Copy" button
   - Syntax highlighting for commands

2. **Friction Flags** (warning badges)
   - ⚠️ CC Required
   - ⚠️ Domain Required
   - ⚠️ Admin Required
   - ⚠️ Sales Gated

3. **Setup Timeline** (visual flow)
   - Step 1 → Step 2 → Step 3 → Aha! 🎉
   - Estimated time at each step

### Example UI (Cursor)

```
┌─ Getting Started ─────────────────────────────┐
│ Setup Type: Installer                        │
│ Friction: ●●●○○○○○○○ (3/10)                  │
│ Time: ~5 minutes                             │
└──────────────────────────────────────────────┘

The Fast Path:
1. Run 'brew install cursor' or download .dmg
2. Sign in with GitHub
   → Imports VS Code extensions automatically
3. Open a folder and run 'Index Folder'

🎉 Aha Moment:
Seeing the 'Composer' (Cmd+I) refactor your first file

⚠️ Red Tape:
• Admin access required (Full Disk Access on macOS)
```

## Data Quality Indicators

The Research phase logs setup extraction metrics:

- ✅ **Extracted**: Setup data found and validated
- ⚠️ **Not extracted**: No setup docs found (set friction_score to null)

Setup extraction is included in the QA score calculation:

```typescript
const qaScore = [
  // ... other fields
  knowledgeCard.setup_complexity ? 1 : 0,
];
```

## SEO Benefits

Users search for:
- "[Tool] setup guide"
- "[Tool] installation steps"
- "[Tool] how to get started"
- "[Tool] onboarding time"
- "[Tool] requires admin access?"

By extracting setup data, StackHunt can rank for these high-intent keywords.

## Future Enhancements

1. **Video Walkthroughs** - Link to official setup videos
2. **Estimated Time Tracking** - Crowdsource actual setup times from users
3. **Setup Difficulty Comparison** - "Cursor setup is 2x faster than VS Code"
4. **Common Pitfalls** - Extract "Known Issues" from Reddit/HN
5. **Setup Verification** - "Did this work for you?" feedback widget

## Related Docs

- **Knowledge Card Schema**: `src/lib/knowledge-card.ts`
- **Extraction Prompt**: `src/lib/hunter/prompts/extraction.ts`
- **Database Types**: `src/types/database.ts`
- **Hunter Pipeline**: `PRODUCT_SUMMARY.md`
