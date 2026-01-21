-- ============================================================================
-- KNOWLEDGE GRAPH SCHEMA v2.0
-- Transforms flat categories into a semantic graph
-- ============================================================================

-- ============================================================================
-- STEP 1: CATEGORY TYPE ENUM
-- ============================================================================

CREATE TYPE category_type AS ENUM (
  'function',   -- What it does: "Notetaking", "CRM", "Project Management"
  'audience',   -- Who it's for: "Students", "Small Teams", "Developers"
  'platform'    -- Where it runs: "Mac", "iOS", "Web", "Self-hosted"
);

-- ============================================================================
-- STEP 2: ADD TYPE TO CATEGORIES
-- ============================================================================

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS type category_type DEFAULT 'function';

-- Migrate existing categories as 'function' type (they're all functional categories)
UPDATE categories SET type = 'function' WHERE type IS NULL;

-- ============================================================================
-- STEP 3: TOOL-CATEGORY JUNCTION TABLE (Graph Edges)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tool_category_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  relevance_score NUMERIC(3,2) DEFAULT 1.0, -- 0.0-1.0 how relevant this tag is
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_tool_category UNIQUE (tool_id, category_id)
);

CREATE INDEX idx_tool_category_tool ON tool_category_links(tool_id);
CREATE INDEX idx_tool_category_category ON tool_category_links(category_id);

-- ============================================================================
-- STEP 4: TITLE TEMPLATE ENUM
-- ============================================================================

CREATE TYPE title_template AS ENUM (
  'best',           -- "Best X for Y"
  'top_10',         -- "Top 10 X for Y"
  'alternatives',   -- "X Alternatives for Y"
  'vs',             -- "X vs Y" (for compare pages)
  'free',           -- "Free X for Y"
  'open_source'     -- "Open Source X for Y"
);

-- ============================================================================
-- STEP 5: RESTRUCTURE CONTEXTS TABLE
-- ============================================================================

-- Add new columns for structured titles and graph relationships
ALTER TABLE contexts
  ADD COLUMN IF NOT EXISTS title_template title_template DEFAULT 'best',
  ADD COLUMN IF NOT EXISTS title_noun TEXT,           -- "Notetaking Apps"
  ADD COLUMN IF NOT EXISTS title_modifier TEXT,       -- "for Students"
  ADD COLUMN IF NOT EXISTS function_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS audience_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS platform_category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX idx_contexts_function ON contexts(function_category_id);
CREATE INDEX idx_contexts_audience ON contexts(audience_category_id);
CREATE INDEX idx_contexts_platform ON contexts(platform_category_id);

-- ============================================================================
-- STEP 6: HELPER FUNCTION - GET OR CREATE CATEGORY
-- ============================================================================

CREATE OR REPLACE FUNCTION get_or_create_category(
  p_name TEXT,
  p_type category_type,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_category_id UUID;
  v_slug TEXT;
  v_normalized_name TEXT;
BEGIN
  -- Normalize name (trim, title case)
  v_normalized_name := INITCAP(TRIM(p_name));

  -- Generate slug
  v_slug := LOWER(REGEXP_REPLACE(v_normalized_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := TRIM(BOTH '-' FROM v_slug);

  -- Try to find existing category (fuzzy match on name)
  SELECT id INTO v_category_id
  FROM categories
  WHERE type = p_type
    AND (
      LOWER(name) = LOWER(v_normalized_name)
      OR slug = v_slug
      OR similarity(LOWER(name), LOWER(v_normalized_name)) > 0.8
    )
  ORDER BY similarity(LOWER(name), LOWER(v_normalized_name)) DESC
  LIMIT 1;

  -- If not found, create it
  IF v_category_id IS NULL THEN
    INSERT INTO categories (name, slug, type, description)
    VALUES (v_normalized_name, v_slug, p_type, p_description)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_category_id;
  END IF;

  RETURN v_category_id;
END;
$$;

-- ============================================================================
-- STEP 7: HELPER FUNCTION - LINK TOOL TO CATEGORY
-- ============================================================================

CREATE OR REPLACE FUNCTION link_tool_to_category(
  p_tool_id UUID,
  p_category_name TEXT,
  p_category_type category_type,
  p_relevance NUMERIC DEFAULT 1.0
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_category_id UUID;
BEGIN
  -- Get or create the category
  v_category_id := get_or_create_category(p_category_name, p_category_type);

  -- Create the link
  INSERT INTO tool_category_links (tool_id, category_id, relevance_score)
  VALUES (p_tool_id, v_category_id, p_relevance)
  ON CONFLICT (tool_id, category_id) DO UPDATE SET relevance_score = EXCLUDED.relevance_score;

  RETURN v_category_id;
END;
$$;

-- ============================================================================
-- STEP 8: HELPER FUNCTION - BUILD CONTEXT TITLE
-- ============================================================================

CREATE OR REPLACE FUNCTION build_context_title(
  p_template title_template,
  p_noun TEXT,
  p_modifier TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_template
    WHEN 'best' THEN 'Best ' || p_noun || COALESCE(' ' || p_modifier, '')
    WHEN 'top_10' THEN 'Top 10 ' || p_noun || COALESCE(' ' || p_modifier, '')
    WHEN 'alternatives' THEN p_noun || ' Alternatives' || COALESCE(' ' || p_modifier, '')
    WHEN 'vs' THEN p_noun -- For vs pages, noun contains "X vs Y"
    WHEN 'free' THEN 'Free ' || p_noun || COALESCE(' ' || p_modifier, '')
    WHEN 'open_source' THEN 'Open Source ' || p_noun || COALESCE(' ' || p_modifier, '')
    ELSE p_noun || COALESCE(' ' || p_modifier, '')
  END;
END;
$$;

-- ============================================================================
-- STEP 9: VIEW - ALL CATEGORIES BY TYPE
-- ============================================================================

CREATE OR REPLACE VIEW categories_by_type AS
SELECT
  type,
  json_agg(json_build_object(
    'id', id,
    'name', name,
    'slug', slug,
    'description', description
  ) ORDER BY name) as categories
FROM categories
GROUP BY type;

-- ============================================================================
-- STEP 10: VIEW - TOOL WITH GRAPH TAGS
-- ============================================================================

CREATE OR REPLACE VIEW tools_with_tags AS
SELECT
  t.*,
  COALESCE(
    (SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'type', c.type, 'slug', c.slug))
     FROM tool_category_links tcl
     JOIN categories c ON tcl.category_id = c.id
     WHERE tcl.tool_id = t.id AND c.type = 'function'), '[]'::json
  ) as function_tags,
  COALESCE(
    (SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'type', c.type, 'slug', c.slug))
     FROM tool_category_links tcl
     JOIN categories c ON tcl.category_id = c.id
     WHERE tcl.tool_id = t.id AND c.type = 'audience'), '[]'::json
  ) as audience_tags,
  COALESCE(
    (SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'type', c.type, 'slug', c.slug))
     FROM tool_category_links tcl
     JOIN categories c ON tcl.category_id = c.id
     WHERE tcl.tool_id = t.id AND c.type = 'platform'), '[]'::json
  ) as platform_tags
FROM tools t;

-- ============================================================================
-- STEP 11: VIEW - CONTEXT WITH FULL TITLE
-- ============================================================================

CREATE OR REPLACE VIEW contexts_with_title AS
SELECT
  ctx.*,
  build_context_title(ctx.title_template, ctx.title_noun, ctx.title_modifier) as computed_title,
  fc.name as function_name,
  fc.slug as function_slug,
  ac.name as audience_name,
  ac.slug as audience_slug,
  pc.name as platform_name,
  pc.slug as platform_slug
FROM contexts ctx
LEFT JOIN categories fc ON ctx.function_category_id = fc.id
LEFT JOIN categories ac ON ctx.audience_category_id = ac.id
LEFT JOIN categories pc ON ctx.platform_category_id = pc.id;

-- ============================================================================
-- STEP 12: RLS POLICIES
-- ============================================================================

ALTER TABLE tool_category_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON tool_category_links FOR SELECT USING (true);

-- ============================================================================
-- STEP 13: GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_or_create_category TO service_role;
GRANT EXECUTE ON FUNCTION link_tool_to_category TO service_role;
GRANT EXECUTE ON FUNCTION build_context_title TO anon, authenticated, service_role;

-- ============================================================================
-- STEP 14: SEED AUDIENCE & PLATFORM CATEGORIES
-- ============================================================================

-- Audience categories
INSERT INTO categories (name, slug, type, description, display_order) VALUES
  ('Students', 'students', 'audience', 'College and university students', 100),
  ('Small Teams', 'small-teams', 'audience', 'Teams of 2-20 people', 101),
  ('Enterprise', 'enterprise', 'audience', 'Large organizations 500+ employees', 102),
  ('Freelancers', 'freelancers', 'audience', 'Independent contractors and solopreneurs', 103),
  ('Startups', 'startups', 'audience', 'Early-stage companies', 104),
  ('Developers', 'developers', 'audience', 'Software engineers and programmers', 105),
  ('Designers', 'designers', 'audience', 'UI/UX and graphic designers', 106),
  ('Remote Teams', 'remote-teams', 'audience', 'Distributed and work-from-home teams', 107),
  ('Non-Profits', 'non-profits', 'audience', 'Charitable organizations', 108),
  ('Agencies', 'agencies', 'audience', 'Marketing, design, and consulting agencies', 109)
ON CONFLICT (slug) DO NOTHING;

-- Platform categories
INSERT INTO categories (name, slug, type, description, display_order) VALUES
  ('Web', 'web', 'platform', 'Browser-based applications', 200),
  ('Mac', 'mac', 'platform', 'macOS native applications', 201),
  ('Windows', 'windows', 'platform', 'Windows native applications', 202),
  ('iOS', 'ios', 'platform', 'iPhone and iPad apps', 203),
  ('Android', 'android', 'platform', 'Android mobile apps', 204),
  ('Linux', 'linux', 'platform', 'Linux native applications', 205),
  ('Self-Hosted', 'self-hosted', 'platform', 'On-premise deployment options', 206),
  ('API', 'api', 'platform', 'Programmatic API access', 207)
ON CONFLICT (slug) DO NOTHING;
