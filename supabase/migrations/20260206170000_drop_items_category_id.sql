-- Drop category_id from items and update dependent views to use item_category_links

DROP INDEX IF EXISTS idx_tools_category;
DROP INDEX IF EXISTS idx_items_category;

CREATE OR REPLACE VIEW public.tools
WITH (security_invoker=true) AS
SELECT
  i.id,
  i.name,
  i.slug,
  i.website,
  i.logo_path,
  i.logo_url,
  i.short_description,
  i.long_description,
  pc.category_id AS category_id,
  i.pricing_type,
  i.avg_score,
  i.review_count,
  i.embedding,
  i.is_featured,
  i.is_verified,
  i.created_at,
  i.updated_at,
  i.metadata,
  i.type,
  i.video_id,
  i.video_title,
  i.data_confidence,
  i.learning_curve,
  i.quality_review_needed,
  i.quality_review_reason,
  i.quality_review_flagged_at,
  i.quality_review_completed_at,
  i.quality_review_result,
  i.correction_count,
  i.confirmed_correction_count,
  i.verdict,
  i.base_score,
  i.last_major_update,
  i.specs,
  i.base_score_breakdown,
  i.pricing_verified_at,
  i.pricing_confidence,
  i.review_context,
  i.parent_id,
  i.target_market,
  i.user_verifications_this_week,
  i.last_user_verified_at,
  i.embedding_version,
  i.embedding_model
FROM items i
LEFT JOIN LATERAL (
  SELECT icl.category_id
  FROM item_category_links icl
  WHERE icl.item_id = i.id
  ORDER BY icl.relevance_score DESC
  LIMIT 1
) pc ON true;

DROP VIEW IF EXISTS public.tools_with_tags;

CREATE OR REPLACE VIEW public.tools_with_tags
WITH (security_invoker=true) AS
SELECT
  t.*,
  COALESCE(
    (SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'type', c.type, 'slug', c.slug))
     FROM item_category_links icl
     JOIN categories c ON icl.category_id = c.id
     WHERE icl.item_id = t.id AND c.type = 'function'), '[]'::json
  ) as function_tags,
  COALESCE(
    (SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'type', c.type, 'slug', c.slug))
     FROM item_category_links icl
     JOIN categories c ON icl.category_id = c.id
     WHERE icl.item_id = t.id AND c.type = 'audience'), '[]'::json
  ) as audience_tags,
  COALESCE(
    (SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'type', c.type, 'slug', c.slug))
     FROM item_category_links icl
     JOIN categories c ON icl.category_id = c.id
     WHERE icl.item_id = t.id AND c.type = 'platform'), '[]'::json
  ) as platform_tags
FROM tools t;

DROP VIEW IF EXISTS public.tools_needing_affiliates;

CREATE OR REPLACE VIEW public.tools_needing_affiliates AS
SELECT
  t.id,
  t.name,
  t.slug,
  t.website,
  t.avg_score,
  t.review_count,
  c.name AS category_name,
  ao.url AS current_url,
  ao.is_affiliate
FROM tools t
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN affiliate_offers ao ON t.id = ao.item_id AND ao.is_primary = true
WHERE ao.is_affiliate = false OR ao.id IS NULL
ORDER BY t.review_count DESC, t.avg_score DESC;

DROP VIEW IF EXISTS public.freelancer_friendly_tools;

CREATE OR REPLACE VIEW public.freelancer_friendly_tools AS
SELECT
  t.id,
  t.name,
  t.slug,
  t.logo_url,
  t.short_description,
  t.pricing_type,
  t.avg_score,
  c.name as category_name,
  c.slug as category_slug,
  c.pillar,
  CASE
    WHEN t.pricing_type IN ('free', 'open_source') THEN 'free'
    WHEN t.pricing_type = 'freemium' THEN 'freemium'
    ELSE 'paid'
  END as cost_tier,
  CASE WHEN t.pricing_type = 'open_source' THEN true ELSE false END as is_open_source,
  CASE WHEN t.pricing_type IN ('free', 'freemium') THEN true ELSE false END as has_free_tier
FROM tools t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.pricing_type IN ('free', 'freemium', 'open_source')
ORDER BY t.avg_score DESC NULLS LAST;

ALTER TABLE items DROP COLUMN IF EXISTS category_id;
