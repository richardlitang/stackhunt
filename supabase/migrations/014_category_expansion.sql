-- ============================================================================
-- CATEGORY EXPANSION: The Operating System for Digital Business
-- Migration 014: Expanding from Dev Tools to Full Business Stack
-- ============================================================================
--
-- Strategic Pivot: StackHunt is now the "Bloomberg Terminal for Tech Stacks"
-- serving Freelancers, Agencies, Founders, and Digital Workers.
--
-- NEW PILLARS:
--   A. Builder Stack (Dev Tools, No-Code)
--   B. Creative Stack (Design, Video/Audio, Writing)
--   C. Growth Stack (Marketing, Sales/CRM)
--   D. Operations Stack (HR/Finance, Freelance Ops, Collaboration)
--
-- STILL BANNED:
--   - Lifestyle B2C (Dating, Gaming, Fitness, Entertainment)
--   - Consumer Hardware (TVs, Phones, Appliances)
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD PILLAR COLUMN TO CATEGORIES (for grouping in UI)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'category_pillar'
  ) THEN
    CREATE TYPE category_pillar AS ENUM (
      'builder',     -- Dev Tools, No-Code
      'creative',    -- Design, Video, Writing
      'growth',      -- Marketing, Sales
      'operations'   -- HR, Finance, Collaboration
    );
  END IF;
END$$;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS pillar category_pillar;

-- ============================================================================
-- STEP 2: NEW FUNCTION CATEGORIES
-- ============================================================================

-- Pillar A: Builder Stack
INSERT INTO categories (name, slug, type, description, icon, display_order, is_featured, pillar) VALUES
  ('No-Code & Low-Code', 'no-code', 'function', 'Visual builders, app makers, and automation platforms', 'blocks', 11, true, 'builder')
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  pillar = EXCLUDED.pillar;

-- Update existing Dev Tools to builder pillar
UPDATE categories SET pillar = 'builder' WHERE slug IN ('developer-tools');

-- Pillar B: Creative Stack
INSERT INTO categories (name, slug, type, description, icon, display_order, is_featured, pillar) VALUES
  ('Video & Audio', 'video-audio', 'function', 'Video editing, podcasting, screen recording, and audio production', 'video', 12, true, 'creative'),
  ('Writing & Content', 'writing-content', 'function', 'AI writing assistants, content management, and knowledge bases', 'pen-tool', 13, true, 'creative'),
  ('Graphics & Illustration', 'graphics', 'function', 'Image editing, vector graphics, and digital art tools', 'image', 14, false, 'creative')
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  pillar = EXCLUDED.pillar;

-- Update existing Design to creative pillar
UPDATE categories SET pillar = 'creative' WHERE slug IN ('design');

-- Pillar C: Growth Stack
INSERT INTO categories (name, slug, type, description, icon, display_order, is_featured, pillar) VALUES
  ('SEO & Analytics', 'seo-analytics', 'function', 'Search optimization, web analytics, and data visualization', 'bar-chart-2', 15, true, 'growth'),
  ('Email Marketing', 'email-marketing', 'function', 'Email campaigns, newsletters, and marketing automation', 'mail', 16, false, 'growth'),
  ('Social Media', 'social-media', 'function', 'Social scheduling, community management, and influencer tools', 'share-2', 17, false, 'growth')
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  pillar = EXCLUDED.pillar;

-- Update existing Marketing & CRM to growth pillar
UPDATE categories SET pillar = 'growth' WHERE slug IN ('marketing', 'crm-sales');

-- Pillar D: Operations Stack
INSERT INTO categories (name, slug, type, description, icon, display_order, is_featured, pillar) VALUES
  ('Freelance & Contractor', 'freelance-ops', 'function', 'Time tracking, invoicing, contracts, and client management', 'clock', 18, true, 'operations'),
  ('Collaboration', 'collaboration', 'function', 'Team workspaces, wikis, and real-time collaboration tools', 'users-2', 19, true, 'operations'),
  ('Accounting & Invoicing', 'accounting', 'function', 'Bookkeeping, expense tracking, and financial management', 'calculator', 20, false, 'operations'),
  ('Payments & Banking', 'payments', 'function', 'Payment processing, international transfers, and business banking', 'credit-card', 21, false, 'operations'),
  ('Legal & Contracts', 'legal', 'function', 'E-signatures, contract management, and legal document automation', 'file-text', 22, false, 'operations')
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  pillar = EXCLUDED.pillar;

-- Update existing ops-related categories
UPDATE categories SET pillar = 'operations' WHERE slug IN ('finance', 'hr-recruiting', 'communication', 'customer-support');

-- AI & Automation spans multiple pillars - assign to builder as primary
UPDATE categories SET pillar = 'builder' WHERE slug = 'ai-automation';

-- Productivity is cross-pillar - assign to operations as primary
UPDATE categories SET pillar = 'operations' WHERE slug = 'productivity';

-- ============================================================================
-- STEP 3: NEW AUDIENCE CATEGORIES (Expanded target market)
-- ============================================================================

INSERT INTO categories (name, slug, type, description, display_order) VALUES
  ('Content Creators', 'content-creators', 'audience', 'YouTubers, podcasters, bloggers, and social media creators', 110),
  ('Marketers', 'marketers', 'audience', 'Digital marketers, growth hackers, and marketing teams', 111),
  ('Virtual Assistants', 'virtual-assistants', 'audience', 'VAs, executive assistants, and remote support staff', 112),
  ('Consultants', 'consultants', 'audience', 'Independent consultants and advisory professionals', 113),
  ('Coaches', 'coaches', 'audience', 'Life coaches, business coaches, and online educators', 114),
  ('Founders', 'founders', 'audience', 'Startup founders and bootstrapped entrepreneurs', 115),
  ('Solopreneurs', 'solopreneurs', 'audience', 'One-person businesses and solo operators', 116),
  ('Creatives', 'creatives', 'audience', 'Artists, writers, musicians, and creative professionals', 117),
  ('Sales Teams', 'sales-teams', 'audience', 'SDRs, AEs, and sales organizations', 118),
  ('Finance Teams', 'finance-teams', 'audience', 'CFOs, accountants, and finance departments', 119)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- STEP 4: VIEW FOR CATEGORIES BY PILLAR
-- ============================================================================

CREATE OR REPLACE VIEW categories_by_pillar AS
SELECT
  pillar,
  type,
  json_agg(json_build_object(
    'id', id,
    'name', name,
    'slug', slug,
    'description', description,
    'icon', icon,
    'is_featured', is_featured
  ) ORDER BY display_order, name) as categories
FROM categories
WHERE type = 'function'
  AND pillar IS NOT NULL
GROUP BY pillar, type
ORDER BY
  CASE pillar
    WHEN 'builder' THEN 1
    WHEN 'creative' THEN 2
    WHEN 'growth' THEN 3
    WHEN 'operations' THEN 4
  END;

-- ============================================================================
-- STEP 5: HELPER VIEW - FREELANCER-FRIENDLY TOOLS
-- ============================================================================

-- View that highlights tools with free tiers or one-time pricing
-- Useful for the "Freelancer Filter" content angle

CREATE OR REPLACE VIEW freelancer_friendly_tools AS
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
  -- Metadata for "Freelancer Filter" badges
  CASE WHEN t.pricing_type = 'open_source' THEN true ELSE false END as is_open_source,
  CASE WHEN t.pricing_type IN ('free', 'freemium') THEN true ELSE false END as has_free_tier
FROM tools t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.pricing_type IN ('free', 'freemium', 'open_source')
ORDER BY t.avg_score DESC NULLS LAST;

-- ============================================================================
-- STEP 6: UPDATE DISPLAY ORDER FOR FEATURED CATEGORIES
-- ============================================================================

-- Ensure featured categories are properly ordered by pillar
UPDATE categories SET display_order = 1, is_featured = true WHERE slug = 'developer-tools';
UPDATE categories SET display_order = 2, is_featured = true WHERE slug = 'no-code';
UPDATE categories SET display_order = 3, is_featured = true WHERE slug = 'ai-automation';
UPDATE categories SET display_order = 4, is_featured = true WHERE slug = 'design';
UPDATE categories SET display_order = 5, is_featured = true WHERE slug = 'video-audio';
UPDATE categories SET display_order = 6, is_featured = true WHERE slug = 'writing-content';
UPDATE categories SET display_order = 7, is_featured = true WHERE slug = 'marketing';
UPDATE categories SET display_order = 8, is_featured = true WHERE slug = 'crm-sales';
UPDATE categories SET display_order = 9, is_featured = true WHERE slug = 'collaboration';
UPDATE categories SET display_order = 10, is_featured = true WHERE slug = 'freelance-ops';

-- ============================================================================
-- STEP 7: CONTENT STRATEGY METADATA
-- ============================================================================

-- Add a note field for editorial guidance
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS editorial_notes TEXT;

-- Add notes for key categories
UPDATE categories SET editorial_notes = 'WEDGE: Prioritize Open Source alternatives. Key comparisons: Penpot vs Figma, GIMP vs Photoshop' WHERE slug = 'design';
UPDATE categories SET editorial_notes = 'WEDGE: Focus on self-hosted options. Key tools: Descript, Loom, OBS alternatives' WHERE slug = 'video-audio';
UPDATE categories SET editorial_notes = 'HIGH VALUE: Cost-sensitive audience. Highlight free tiers and one-time payments. Compare Wise vs PayPal, Wave vs QuickBooks' WHERE slug = 'freelance-ops';
UPDATE categories SET editorial_notes = 'CORE: Our origin. Continue deep coverage of Supabase, Vercel, Railway, etc.' WHERE slug = 'developer-tools';
UPDATE categories SET editorial_notes = 'EXPANSION: High search volume. Cover Notion, Obsidian, Coda comparisons' WHERE slug = 'collaboration';

-- ============================================================================
-- COMMENT: BANNED CATEGORIES (Do NOT add these)
-- ============================================================================
-- The following are explicitly OUT OF SCOPE for StackHunt:
--
-- LIFESTYLE B2C:
--   - Dating apps (Tinder, Hinge, Bumble)
--   - Gaming/Entertainment (Steam, Netflix, Spotify)
--   - Fitness trackers (MyFitnessPal, Strava)
--   - Consumer shopping (Amazon, eBay)
--
-- CONSUMER HARDWARE:
--   - TVs, Appliances, Phones (unless dev-specific like Mac)
--   - Generic electronics reviews
--
-- These categories DO NOT help someone "make money" or "run a business"
-- and dilute our positioning as a professional tools directory.
-- ============================================================================
