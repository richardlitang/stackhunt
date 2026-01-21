-- ============================================================================
-- AFFILIATE AUDIT VIEW
-- Helps identify monetization opportunities
-- ============================================================================

-- View: Tools without affiliate links (money left on the table)
CREATE OR REPLACE VIEW tools_needing_affiliates AS
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
LEFT JOIN affiliate_offers ao ON t.id = ao.tool_id AND ao.is_primary = true
WHERE ao.is_affiliate = false OR ao.id IS NULL
ORDER BY t.review_count DESC, t.avg_score DESC;

-- View: Affiliate performance tracking (for future analytics)
CREATE OR REPLACE VIEW affiliate_performance AS
SELECT
  t.name AS tool_name,
  t.slug AS tool_slug,
  ao.network,
  ao.cta_text,
  ao.is_affiliate,
  ao.created_at AS offer_created,
  t.review_count,
  t.avg_score,
  -- Estimated visibility (higher score + more reviews = more clicks)
  (t.avg_score * 0.5 + t.review_count * 10) AS visibility_score
FROM affiliate_offers ao
JOIN tools t ON ao.tool_id = t.id
WHERE ao.is_primary = true
ORDER BY visibility_score DESC;

-- View: Context performance (which lists drive traffic)
CREATE OR REPLACE VIEW context_performance AS
SELECT
  ctx.title,
  ctx.slug,
  ctx.tool_count,
  c.name AS category_name,
  COUNT(r.id) AS review_count,
  AVG(r.score) AS avg_tool_score,
  SUM(r.upvotes) AS total_upvotes,
  SUM(r.downvotes) AS total_downvotes
FROM contexts ctx
LEFT JOIN categories c ON ctx.category_id = c.id
LEFT JOIN reviews r ON ctx.id = r.context_id
GROUP BY ctx.id, c.name
ORDER BY ctx.tool_count DESC;

-- ============================================================================
-- HELPFUL QUERIES (run these in SQL Editor)
-- ============================================================================

-- Find high-value tools without affiliate links:
-- SELECT * FROM tools_needing_affiliates WHERE review_count > 5;

-- Find your best performing affiliate opportunities:
-- SELECT * FROM affiliate_performance WHERE is_affiliate = true;

-- Find contexts that might need more tools:
-- SELECT * FROM context_performance WHERE tool_count < 5;
