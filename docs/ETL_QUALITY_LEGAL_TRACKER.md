# ETL Quality + Legal Risk Tracker

Last verified: 2026-03-05

Last updated: 2026-02-16

## Rollout Status

- `2026-02-16`: Atomic checkpoint locking migration applied to production Supabase (`atomic_checkpoint_locking`, version `20260216090234`).
- Live function signature verified: `save_hunt_checkpoint(uuid, integer, jsonb, integer) -> boolean`.
- `2026-02-16`: RLS hardening applied to `claims`, `source_policy_registry`, and `source_policy_review_queue` (`secure_claims_and_source_policy_rls`, version `20260216091136`).
- Verified: all three tables now have `relrowsecurity=true`, explicit deny-all public policies, and no `anon`/`authenticated` table grants.
- `2026-02-16`: View/function security hardening applied (`security_view_and_function_hardening`, version `20260216091547`).
- Verified: `tools_needing_affiliates` + `freelancer_friendly_tools` now have `security_invoker=on`; `claim_hunt_queue_item(text)` + `set_updated_at_timestamp()` now pin `search_path=public, pg_catalog`.
- `2026-02-16`: Legacy claim ledger metadata backfill applied (`backfill_legacy_claim_metadata`, version `20260216092620`).
- Verified (pre-2026-02-16 claims): missing `source_domain` `95 -> 0`, missing `policy_snapshot` `95 -> 0`, missing `confidence` `409 -> 0`.
- `2026-02-16`: Queue completion RPC compatibility fix applied (`fix_complete_hunt_item_id_signature`, version `20260216093523`).
- Verified: `complete_hunt(uuid,uuid,uuid,uuid,integer)` now writes `hunt_queue.item_id` (not legacy `tool_id`) and accepts `p_item_id` named argument.
- `2026-02-16`: Malformed claim text cleanup applied (`prune_malformed_claim_text`, version `20260216101604`).
- Verified: truncated clauses and first-party official claims using community-hedging language were pruned from `claims`, `reviews.pros/cons`, and `items.specs.pros/cons`.
- `2026-02-16`: First-party hedging claim cleanup applied (`remove_community_hedging_first_party_claims`, version `20260216095908`).
- Verified: claim-ledger rows with `Users report...` style phrasing and first-party source URLs were deleted.
- `2026-02-16`: Community host source-type normalization applied (`normalize_community_source_types`, version `20260216112507`).
- Verified: forum/community hosts (e.g., `community.*`) are now normalized to `source_type='community'` across `claims`, `reviews.pros/cons`, and `items.specs.pros/cons`.

## Purpose
Track whether ETL outputs stay decision-useful for readers/SaaS users and legally defensible for publication.

## Core Signals (Weekly)

| Signal | Target | Why |
|---|---|---|
| Claims dropped for invalid/unverifiable source URLs | `< 10%` of generated claims | Provenance integrity; blocks fabricated citations |
| Negative claims filtered by corroboration guardrail | Tracked trend (not always down) | Legal safety; catches unsupported negatives |
| Batch/stale items persisted via canonical persistence path | `100%` | Prevents quality/legal drift between pipeline paths |
| Queue items completed with linked `item_id` + `review_id` after batch/stale | `100%` where synthesis succeeds | Ensures product + SEO surfaces stay populated |
| Official-source fallback overrides on explicit policies | `0` | Avoids accidental policy bypass |
| Checkpoint save conflicts (expected version mismatch) | Tracked trend | Detects worker contention safely (without overwrite) |

## Operating Checklist (Weekly)

- [ ] Sample 10 newly completed queue items from batch/stale runs and verify:
  - review exists
  - pros/cons are structured with sources when available
  - status is `draft` or `published` per guardrails (not missing review)
- [ ] Sample 10 edited admin reviews and verify structured claim attribution is preserved for unchanged lines.
- [ ] Inspect logs for spikes in:
  - `Filtered ... missing a verifiable source URL`
  - `Negative opinion only corroborated by ...`
  - `Checkpoint conflict detected`
- [ ] Spot-check 5 tool pages + 5 best pages + 5 compare pages for stale/thin output.
- [ ] Spot-check generated claims for malformed endings (e.g. trailing `to/for/with`) and source-language mismatch (`Users report...` on official sources).

## Weekly Snapshot Template

Copy this section each week and fill it in:

```md
### YYYY-MM-DD
- Claims dropped (missing/invalid source URL): X / Y (Z%)
- Negative claims filtered by corroboration: X
- Batch/stale canonical persistence success: X / Y
- Queue completion metadata coverage (`item_id` + `review_id`): X / Y
- Fallback policy overrides on explicit policy: X
- Checkpoint save conflicts: X
- Notes: anomalies, regressions, decisions
```

## Advisor Baseline (2026-02-16)

- Security advisor now reports only extension-placement warnings:
  - `extension_in_public` for `vector`
  - `extension_in_public` for `pg_trgm`
- Performance advisor reports multiple pre-existing lints (unindexed foreign keys, unused/duplicate indexes).
- Action: track these as separate database hardening tasks; do not block ETL quality rollout on them.

## Validation Run (2026-02-16)

- Queue duplicate-short-circuit test:
  - Queue item `23e48a8f-e898-4588-ab63-f7115d60e3e2` (`Airtable`) completed with existing `item_id` and no new review (expected duplicate behavior).
  - Post-RPC-fix verification: queue item `f1f4496e-0cba-41c8-86b1-1ac60e6ddd42` completed via canonical `complete_hunt` RPC without fallback warning.
- Full ETL flow test:
  - Queue item `5b1c69dc-ff5d-44b2-ad58-3f09f770133a` (`Baserow`) completed end-to-end.
  - Outputs created: `item_id=a893472f-bd1e-41c7-8eaf-3f167f43a7c3`, `context_id=8a9b9a0f-dcfd-430d-b347-7af15db31661`, `review_id=63347649-d7f1-4aad-b51c-aa8ff42a1c51`.
  - New claim ledger rows for this item: `8`, with `0` missing `source_domain`, `0` missing `policy_snapshot`, `0` missing `confidence` (avg confidence `0.881`).
- Content hygiene remediation:
  - Baserow malformed lines removed from persisted content:
    - `items.specs.cons`: `3 -> 1`
    - `reviews.cons` (latest draft): `3 -> 1`
    - claim ledger removed truncated/hedging mismatch rows, leaving 6 claims (5 pros, 1 con).
- Post-fix live ETL verification:
  - Queue item `d686e3bb-83c3-443b-887f-2769f6d2fca5` (`Mathesar`) completed end-to-end.
  - Outputs created: `item_id=0bfcdcba-d54d-425b-8215-06099a23952c`, `context_id=51fd41e9-790e-4f1c-8353-5f7d95d657bd`, `review_id=7efc0b92-b8ee-48e1-a179-062ea49c120d`.
  - Claim quality checks on this run: malformed-clause claims `0`, official-source community-hedging claims `0`.
- Forced Baserow ETL verification (duplicate-bypass):
  - Queue research warm-up: `d0f81c2e-5277-45e8-9aa8-a400f1acf7d3` (duplicate short-circuit after research only).
  - Full forced hunt (`--rehunt`) created/updated context `efb53eda-0c28-4a49-8bae-ecc8f7fcf014` and draft review `535e17f7-140f-4148-919a-199e99fce7ca`.
  - Post-normalization checks: `community.baserow.io` claims in last 30m are `12/12 source_type='community'`; malformed trailing-clause claims remain `0`; official+community-hedging mismatch remains `0`.
- Residual backfill follow-up:
  - `84` legacy claim rows still have `policy_snapshot.acquisition_mode='UNCLASSIFIED'`, concentrated in `platform.claude.com` (`48`), `codeium.com` (`14`), `cursor.com` (`12`), `gemini.google.com` (`4`), `replit.com` (`4`), `deepseek.com` (`2`).
  - Action: add/verify policy registry entries for these domains and re-run targeted claim metadata backfill.

## Incident Triggers

Open an ETL hardening task immediately if any of these occur:

1. Batch/stale completion without review creation.
2. Source provenance drop rate spikes above 25% for two consecutive runs.
3. Any explicit registry policy appears to have been bypassed by fallback logic.
4. Structured claim attribution loss after admin edits for unchanged claims.

## Change Log

### 2026-02-16

- Unified batch/stale synthesis completion with canonical persistence flow (`executePersistencePhase`), including queue completion metadata and checkpoint cleanup.
- Enforced strict source provenance for enriched claims in persistence (claim source must match vetted research source set).
- Tightened negative-claim corroboration pool to policy-eligible, non-directory sources.
- Hardened official-source fallback matching to exact/subdomain only and disabled override of explicit registry policies.
- Added atomic checkpoint version check in SQL (`save_hunt_checkpoint` returns success boolean based on expected version match).
- Enabled RLS and deny-all public policies for `claims`, `source_policy_registry`, and `source_policy_review_queue`, and revoked `anon`/`authenticated` table privileges.
- Set `security_invoker=on` for `tools_needing_affiliates` and `freelancer_friendly_tools`, and pinned search_path for `claim_hunt_queue_item(text)` + `set_updated_at_timestamp()`.
- Backfilled legacy claim ledger metadata for pre-hardening rows (`source_domain`, `policy_snapshot`, `confidence`).
- Fixed `complete_hunt` RPC to use `item_id`/`p_item_id` (removes legacy fallback path in queue completion).
- Added stricter claim text hygiene in persistence/rendering (Unicode control-char stripping + broader incomplete-clause detection).
- Added guardrail to drop community-hedging phrasing when claim source is official.
- Extended analysis validation to flag malformed claims and source-language mismatch before publish decisions.
- Added one-time cleanup migrations for malformed/truncated persisted claims and first-party hedging mismatch rows.
- Fixed ItemList schema tool URL path to `/tool/{slug}`.
- Preserved structured claim attribution during admin review edits when lines are unchanged.
