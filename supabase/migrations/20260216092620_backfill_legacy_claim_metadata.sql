-- ============================================================================
-- MIGRATION: Backfill legacy claim metadata
--
-- Problem:
-- - Pre-hardening claim ledger rows can have missing source_domain,
--   missing policy_snapshot, and null confidence.
--
-- Solution:
-- - Re-derive source_domain from source_url.
-- - Attach best-match source policy snapshot (exact domain or parent domain).
-- - Backfill conservative confidence defaults from policy posture.
-- ============================================================================

WITH target_claims AS (
  SELECT
    c.id,
    c.extracted_at,
    LOWER(REGEXP_REPLACE(SPLIT_PART(SPLIT_PART(c.source_url, '://', 2), '/', 1), '^www\.', '')) AS derived_domain
  FROM public.claims c
  WHERE c.extracted_at < '2026-02-16'::date
    AND c.source_url ~* '^https?://'
    AND (
      c.source_domain IS NULL
      OR BTRIM(c.source_domain) = ''
      OR c.policy_snapshot IS NULL
      OR c.confidence IS NULL
    )
),
policy_match AS (
  SELECT
    t.id,
    t.extracted_at,
    t.derived_domain,
    p.domain AS policy_domain,
    p.acquisition_mode,
    p.llm_ingestion_allowed,
    p.display_mode,
    p.policy_version,
    p.review_status
  FROM target_claims t
  LEFT JOIN LATERAL (
    SELECT p.*
    FROM public.source_policy_registry p
    WHERE t.derived_domain = p.domain
      OR t.derived_domain LIKE ('%.' || p.domain)
    ORDER BY LENGTH(p.domain) DESC
    LIMIT 1
  ) p ON TRUE
)
UPDATE public.claims c
SET
  source_domain = CASE
    WHEN c.source_domain IS NULL OR BTRIM(c.source_domain) = '' THEN pm.derived_domain
    ELSE c.source_domain
  END,
  policy_snapshot = CASE
    WHEN c.policy_snapshot IS NULL THEN
      jsonb_build_object(
        'acquisition_mode', COALESCE(pm.acquisition_mode, 'UNCLASSIFIED'),
        'llm_ingestion_allowed', COALESCE(pm.llm_ingestion_allowed, 'UNCLASSIFIED'),
        'is_deep_scrape_allowed', CASE
          WHEN pm.acquisition_mode = 'SCRAPE_ALLOWED' THEN TRUE
          WHEN pm.acquisition_mode IS NULL THEN NULL
          ELSE FALSE
        END,
        'block_reason', CASE
          WHEN pm.acquisition_mode IN ('BLOCKED', 'API_ONLY', 'LINK_ONLY')
            THEN 'legacy_backfill_non_scrape_policy'
          ELSE NULL
        END,
        'retrieved_at', pm.extracted_at,
        'policy_domain', pm.policy_domain,
        'policy_version', pm.policy_version,
        'policy_review_status', pm.review_status,
        'backfilled_at', NOW()
      )
    ELSE c.policy_snapshot
  END,
  confidence = COALESCE(
    c.confidence,
    CASE
      WHEN pm.llm_ingestion_allowed = 'NO' AND pm.acquisition_mode IN ('BLOCKED', 'API_ONLY') THEN 0.35
      WHEN pm.llm_ingestion_allowed = 'NO' THEN 0.45
      WHEN pm.llm_ingestion_allowed IN ('YES', 'YES_LIMITED') AND pm.acquisition_mode = 'SCRAPE_ALLOWED' THEN 0.85
      WHEN pm.policy_domain IS NULL THEN 0.55
      ELSE 0.65
    END
  )
FROM policy_match pm
WHERE c.id = pm.id;
