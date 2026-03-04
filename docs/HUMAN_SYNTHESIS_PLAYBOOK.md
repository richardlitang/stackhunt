# Human Synthesis Playbook

Last verified: 2026-03-05

## When To Use This

Use this workflow when a tool is marked `HUMAN_REQUIRED` because automated synthesis is blocked by source policy (for example: vendor domain is `LINK_ONLY` with `llm_ingestion_allowed=NO`).

Typical signal:
- `items.quality_review_needed = true`
- Review `reviewer_notes` starts with `HUMAN_REQUIRED: ...`

---

## Where Human Synthesis Happens

1. Review queue: `/admin/review`
2. Detailed editor: `/admin/review/[id]`

All manual synthesis is done in the form fields on `/admin/review/[id]`:
- `Summary (Markdown)`
- `Pros` and `Cons` (one claim per line)
- `Claim Evidence` (source URL + source type per claim)
- `Reviewer Notes` (internal audit trail)
- `Save Changes` / `Save & Publish`

---

## Workflow

1. Open `/admin/review` and find entries with `HUMAN_REQUIRED` in notes.
2. Open `/admin/review/[id]`.
3. Manually research allowed public sources:
   - Official vendor pages (pricing, docs, product pages, legal pages)
   - Reputable editorial/community pages as supporting evidence
4. Write original synthesis:
   - Summary: neutral and contextual to the page intent
   - Pros/Cons: concrete, non-generic, one claim per line
5. Add evidence for each claim in `Claim Evidence`:
   - `source_url` must be real and reachable
   - `source_type` should be `official`, `docs`, `support`, `editorial`, or `community`
6. Add audit note in `Reviewer Notes`:
   - Include date and initials, e.g. `2026-02-17 RL: manual synthesis completed for policy-restricted domain.`
7. Click `Re-check` in `Publish Checks`, resolve blockers, then `Save & Publish`.

---

## Guardrails

- Do not paste long verbatim excerpts.
- Do not fabricate URLs or claims.
- Keep claims tied to evidence you can cite.
- Use hedging for opinionated/community claims.

---

## Optional: Find Human-Required Items (SQL)

```sql
select id, name, quality_review_needed, quality_review_reason, quality_review_flagged_at
from items
where quality_review_needed = true
order by quality_review_flagged_at desc nulls last;
```

## Optional: Clear Flag After Completion (SQL)

```sql
update items
set
  quality_review_needed = false,
  quality_review_completed_at = now(),
  quality_review_result = 'manual_synthesis_complete',
  updated_at = now()
where id = '<item_id>';
```
