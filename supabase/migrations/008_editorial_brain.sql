-- =================================================================
-- MIGRATION 008: Editorial Brain System
-- Autonomous content discovery and editorial planning
-- =================================================================

-- =================================================================
-- ENUMS
-- =================================================================

CREATE TYPE topic_type AS ENUM (
  'best_list',      -- "Best X for Y" articles
  'comparison',     -- "X vs Y" articles
  'tool_review',    -- Single tool deep-dive
  'roundup',        -- "Top 10 X tools in 2024"
  'guide'           -- "How to choose X"
);

CREATE TYPE topic_status AS ENUM (
  'proposed',       -- AI-suggested, awaiting review
  'approved',       -- Human approved, ready to queue
  'queued',         -- In content_queue, being processed
  'in_progress',    -- Currently being hunted
  'completed',      -- Published
  'rejected',       -- Human rejected
  'archived'        -- Old/outdated
);

CREATE TYPE topic_source AS ENUM (
  'trend_scanner',  -- From trending searches
  'gap_analyzer',   -- From coverage gap analysis
  'competitor',     -- From competitor monitoring
  'user_request',   -- From user submissions
  'manual',         -- Admin manually added
  'seasonal'        -- Recurring seasonal content
);

CREATE TYPE revenue_potential AS ENUM (
  'high',           -- High-commission affiliates available
  'medium',         -- Some affiliate potential
  'low',            -- Limited monetization
  'unknown'         -- Not yet assessed
);

-- =================================================================
-- EDITORIAL TOPICS TABLE
-- =================================================================

CREATE TABLE editorial_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Topic Details
  topic TEXT NOT NULL,                              -- "Best CRM for Real Estate Agents"
  topic_type topic_type NOT NULL,
  description TEXT,                                 -- Why this topic matters

  -- Discovery Metadata
  source topic_source NOT NULL DEFAULT 'manual',
  source_data JSONB DEFAULT '{}',                   -- Raw data from source (trends, etc.)

  -- Scoring & Prioritization
  priority_score NUMERIC(5,2) DEFAULT 50,           -- 0-100, higher = more important
  search_volume INT,                                -- Estimated monthly searches
  competition_score NUMERIC(3,2),                   -- 0-1, lower = easier to rank
  revenue_potential revenue_potential DEFAULT 'unknown',

  -- Suggested Content
  suggested_tools TEXT[],                           -- Tools to include
  suggested_angle TEXT,                             -- Unique angle/hook
  target_audience TEXT,                             -- Who is this for

  -- Status & Workflow
  status topic_status NOT NULL DEFAULT 'proposed',
  rejected_reason TEXT,

  -- Ownership
  proposed_by TEXT DEFAULT 'system',                -- 'system' or admin user id
  approved_by UUID,
  approved_at TIMESTAMPTZ,

  -- Execution
  queue_item_id UUID REFERENCES content_queue(id),
  context_id UUID REFERENCES contexts(id),          -- Resulting context after completion

  -- Scheduling
  scheduled_for DATE,                               -- When to publish
  is_evergreen BOOLEAN DEFAULT TRUE,                -- Seasonal vs evergreen
  refresh_after INTERVAL DEFAULT '90 days',         -- When to update

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_topic UNIQUE (topic)
);

-- Indexes for common queries
CREATE INDEX idx_editorial_topics_status ON editorial_topics (status);
CREATE INDEX idx_editorial_topics_priority ON editorial_topics (priority_score DESC) WHERE status IN ('proposed', 'approved');
CREATE INDEX idx_editorial_topics_scheduled ON editorial_topics (scheduled_for) WHERE status = 'approved';
CREATE INDEX idx_editorial_topics_source ON editorial_topics (source);

-- =================================================================
-- EDITORIAL GUIDELINES TABLE
-- =================================================================

CREATE TABLE editorial_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,                         -- 'avoid_topics', 'quality_rules', etc.
  name TEXT NOT NULL,                               -- Human-readable name
  description TEXT,                                 -- What this guideline controls
  content JSONB NOT NULL,                           -- Flexible structure
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =================================================================
-- SEED DEFAULT GUIDELINES
-- =================================================================

INSERT INTO editorial_guidelines (key, name, description, content) VALUES
(
  'topic_filters',
  'Topic Filters',
  'Rules for what topics to include or exclude',
  '{
    "avoid": [
      "Generic best software lists without specific audience",
      "Tools with less than 1000 monthly active users",
      "Categories with no affiliate programs",
      "Controversial or political software",
      "Adult content tools"
    ],
    "prioritize": [
      "SaaS tools with affiliate programs",
      "Growing niches (AI tools, no-code, automation)",
      "High commercial intent queries",
      "Underserved audiences (specific industries)",
      "Tools with recent major updates"
    ],
    "seasonal_opportunities": [
      {"month": 1, "topics": ["Tax software", "Goal tracking apps", "Productivity tools"]},
      {"month": 9, "topics": ["Back to school tools", "Student software"]},
      {"month": 11, "topics": ["Black Friday deals", "Budget tools"]}
    ]
  }'::jsonb
),
(
  'quality_thresholds',
  'Quality Thresholds',
  'Minimum requirements for content quality',
  '{
    "min_sources_per_tool": 3,
    "min_tools_per_list": 5,
    "max_tools_per_list": 12,
    "min_confidence_level": "medium",
    "require_pricing_data": true,
    "require_pros_cons": true,
    "min_pros_per_tool": 2,
    "min_cons_per_tool": 1,
    "max_days_since_update": 180
  }'::jsonb
),
(
  'style_guide',
  'Writing Style Guide',
  'Tone and style preferences for generated content',
  '{
    "tone": "helpful expert friend - knowledgeable but approachable",
    "avoid": [
      "Superlatives without evidence (best ever, amazing, incredible)",
      "Salesy language (dont miss out, act now)",
      "Vague claims (many users love it)",
      "Ignoring limitations or cons"
    ],
    "always_include": [
      "Specific use cases for each tool",
      "Honest limitations and who should NOT use it",
      "Pricing transparency",
      "Comparison to alternatives"
    ],
    "formatting": {
      "use_bullet_points": true,
      "include_tldr": true,
      "max_paragraph_length": 3
    }
  }'::jsonb
),
(
  'affiliate_priorities',
  'Affiliate Program Priorities',
  'Which affiliate programs to prioritize',
  '{
    "high_priority": [
      {"name": "Notion", "commission": "50%", "cookie_days": 90},
      {"name": "ClickUp", "commission": "20%", "cookie_days": 90},
      {"name": "Monday.com", "commission": "$50-150", "cookie_days": 90}
    ],
    "medium_priority": [
      {"name": "Airtable", "commission": "20%", "cookie_days": 30},
      {"name": "Asana", "commission": "10%", "cookie_days": 30}
    ],
    "track_but_low_priority": [
      {"name": "Slack", "commission": "Low", "notes": "Brand awareness only"},
      {"name": "Discord", "commission": "None", "notes": "Traffic driver"}
    ]
  }'::jsonb
),
(
  'discovery_config',
  'Discovery Configuration',
  'Settings for the autonomous topic discovery system',
  '{
    "daily_proposal_limit": 5,
    "auto_approve_threshold": 85,
    "min_search_volume": 100,
    "max_competition_score": 0.7,
    "trend_sources": ["google_trends", "reddit", "producthunt", "hackernews"],
    "competitor_sites": ["g2.com", "capterra.com", "getapp.com"],
    "refresh_existing_after_days": 90,
    "seasonal_lookahead_days": 30
  }'::jsonb
);

-- =================================================================
-- HELPER FUNCTIONS
-- =================================================================

-- Get active guideline by key
CREATE OR REPLACE FUNCTION get_guideline(p_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN (
    SELECT content
    FROM editorial_guidelines
    WHERE key = p_key AND is_active = TRUE
  );
END;
$$;

-- Calculate topic priority score
CREATE OR REPLACE FUNCTION calculate_topic_priority(
  p_search_volume INT,
  p_competition_score NUMERIC,
  p_revenue_potential revenue_potential,
  p_is_trending BOOLEAN DEFAULT FALSE
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_score NUMERIC := 50;
  v_volume_score NUMERIC;
  v_competition_bonus NUMERIC;
  v_revenue_multiplier NUMERIC;
BEGIN
  -- Search volume component (0-40 points)
  IF p_search_volume IS NOT NULL THEN
    v_volume_score := LEAST(40, LOG(p_search_volume + 1) * 8);
    v_score := v_score + v_volume_score - 20;
  END IF;

  -- Competition bonus (0-20 points, lower competition = higher score)
  IF p_competition_score IS NOT NULL THEN
    v_competition_bonus := (1 - p_competition_score) * 20;
    v_score := v_score + v_competition_bonus;
  END IF;

  -- Revenue multiplier
  v_revenue_multiplier := CASE p_revenue_potential
    WHEN 'high' THEN 1.3
    WHEN 'medium' THEN 1.1
    WHEN 'low' THEN 0.9
    ELSE 1.0
  END;
  v_score := v_score * v_revenue_multiplier;

  -- Trending bonus
  IF p_is_trending THEN
    v_score := v_score * 1.2;
  END IF;

  RETURN LEAST(100, GREATEST(0, v_score));
END;
$$;

-- Approve a topic and optionally queue it
CREATE OR REPLACE FUNCTION approve_topic(
  p_topic_id UUID,
  p_admin_id UUID,
  p_auto_queue BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_topic RECORD;
  v_queue_id UUID;
BEGIN
  -- Get and lock the topic
  SELECT * INTO v_topic
  FROM editorial_topics
  WHERE id = p_topic_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Topic not found');
  END IF;

  IF v_topic.status != 'proposed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Topic is not in proposed status');
  END IF;

  -- Update status
  UPDATE editorial_topics
  SET
    status = 'approved',
    approved_by = p_admin_id,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_topic_id;

  -- Optionally add to content queue
  IF p_auto_queue THEN
    INSERT INTO content_queue (tool_name, context_title, source, priority)
    VALUES (
      COALESCE(v_topic.suggested_tools[1], 'auto-discover'),
      v_topic.topic,
      'editorial',
      CEIL(v_topic.priority_score)::INT
    )
    RETURNING id INTO v_queue_id;

    UPDATE editorial_topics
    SET
      status = 'queued',
      queue_item_id = v_queue_id,
      updated_at = NOW()
    WHERE id = p_topic_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', CASE WHEN p_auto_queue THEN 'queued' ELSE 'approved' END,
    'queue_id', v_queue_id
  );
END;
$$;

-- Reject a topic
CREATE OR REPLACE FUNCTION reject_topic(
  p_topic_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE editorial_topics
  SET
    status = 'rejected',
    rejected_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_topic_id AND status = 'proposed';

  RETURN FOUND;
END;
$$;

-- Get topics needing refresh
CREATE OR REPLACE FUNCTION get_stale_topics(p_limit INT DEFAULT 10)
RETURNS TABLE (
  context_id UUID,
  title TEXT,
  last_updated TIMESTAMPTZ,
  days_since_update INT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.updated_at,
    EXTRACT(DAY FROM NOW() - c.updated_at)::INT
  FROM contexts c
  WHERE c.updated_at < NOW() - INTERVAL '90 days'
  ORDER BY c.updated_at ASC
  LIMIT p_limit;
END;
$$;

-- =================================================================
-- TRIGGERS
-- =================================================================

-- Auto-update updated_at
CREATE TRIGGER update_editorial_topics_timestamp
  BEFORE UPDATE ON editorial_topics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_editorial_guidelines_timestamp
  BEFORE UPDATE ON editorial_guidelines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =================================================================
-- VIEWS FOR ADMIN DASHBOARD
-- =================================================================

CREATE OR REPLACE VIEW editorial_dashboard AS
SELECT
  status,
  COUNT(*) as count,
  AVG(priority_score)::NUMERIC(5,2) as avg_priority,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_this_week
FROM editorial_topics
GROUP BY status;

CREATE OR REPLACE VIEW editorial_calendar AS
SELECT
  et.id,
  et.topic,
  et.topic_type,
  et.priority_score,
  et.status,
  et.scheduled_for,
  et.source,
  et.revenue_potential,
  et.suggested_tools,
  et.created_at,
  cq.status as queue_status,
  c.title as completed_context
FROM editorial_topics et
LEFT JOIN content_queue cq ON et.queue_item_id = cq.id
LEFT JOIN contexts c ON et.context_id = c.id
WHERE et.status IN ('proposed', 'approved', 'queued', 'in_progress')
ORDER BY
  CASE et.status
    WHEN 'in_progress' THEN 1
    WHEN 'queued' THEN 2
    WHEN 'approved' THEN 3
    WHEN 'proposed' THEN 4
  END,
  et.priority_score DESC;
