-- ============================================================================
-- STACKHUNT DATABASE SCHEMA v1.0
-- A Hub & Spoke model for programmatic SEO software directory
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search fallback

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE pricing_model AS ENUM (
  'free',
  'freemium',
  'paid',
  'enterprise',
  'open_source'
);

CREATE TYPE hunt_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- ============================================================================
-- CATEGORIES TABLE (For organized discovery)
-- Simple but smart: flat structure with display_order for flexibility
-- ============================================================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Lucide icon name or emoji
  display_order INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_featured ON categories(is_featured) WHERE is_featured = true;

-- ============================================================================
-- TOOLS TABLE (The Hub)
-- Core product/software entries
-- ============================================================================

CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Core identity
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  website TEXT,

  -- Branding
  logo_path TEXT, -- Supabase Storage path
  logo_url TEXT,  -- Full public URL (denormalized for performance)

  -- Content
  short_description TEXT,
  long_description TEXT,

  -- Classification
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  pricing_type pricing_model DEFAULT 'freemium',

  -- Global metrics (aggregated from reviews)
  avg_score NUMERIC(4,1) DEFAULT 0, -- Cached average across all contexts
  review_count INT DEFAULT 0,       -- Total reviews/contexts it appears in

  -- Semantic search
  embedding vector(1536), -- OpenAI text-embedding-3-small

  -- Metadata
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false, -- Manual verification flag
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tools_slug ON tools(slug);
CREATE INDEX idx_tools_category ON tools(category_id);
CREATE INDEX idx_tools_featured ON tools(is_featured) WHERE is_featured = true;
CREATE INDEX idx_tools_name_trgm ON tools USING gin(name gin_trgm_ops); -- Fuzzy search
CREATE INDEX idx_tools_embedding ON tools USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- CONTEXTS TABLE (The Spoke/List)
-- Represents a specific use case or audience segment
-- e.g., "Best CRM for Dentists", "Slack Alternatives for Remote Teams"
-- ============================================================================

CREATE TABLE contexts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  title TEXT NOT NULL, -- "Best CRM for Dentists"
  slug TEXT NOT NULL UNIQUE,

  -- Content
  intro_text TEXT, -- Markdown intro for the list page
  meta_description TEXT, -- SEO meta description

  -- Classification
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- Optional: If this is an "alternatives to X" page
  primary_tool_id UUID REFERENCES tools(id) ON DELETE SET NULL,

  -- Metrics
  tool_count INT DEFAULT 0, -- Cached count of tools in this context

  -- Metadata
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contexts_slug ON contexts(slug);
CREATE INDEX idx_contexts_category ON contexts(category_id);
CREATE INDEX idx_contexts_primary_tool ON contexts(primary_tool_id);
CREATE INDEX idx_contexts_featured ON contexts(is_featured) WHERE is_featured = true;

-- ============================================================================
-- REVIEWS TABLE (The Bridge)
-- Links a Tool to a Context with contextual analysis
-- This is the "StackHunt magic" - same tool, different scores per context
-- ============================================================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  context_id UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,

  -- The Analysis (contextual to the audience/use case)
  score INT CHECK (score >= 0 AND score <= 100), -- 0-100 contextual score

  -- Structured insights
  summary_markdown TEXT, -- AI-generated contextual summary
  pros JSONB DEFAULT '[]'::jsonb,  -- ["Fast onboarding", "Great mobile app"]
  cons JSONB DEFAULT '[]'::jsonb,  -- ["Expensive for small teams", "Limited integrations"]
  sentiment_tags JSONB DEFAULT '[]'::jsonb, -- ["easy-to-use", "expensive", "feature-rich"]

  -- User engagement
  upvotes INT DEFAULT 0,
  downvotes INT DEFAULT 0,

  -- Display
  display_order INT DEFAULT 0, -- Manual override for ranking

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique tool per context
  CONSTRAINT unique_tool_context UNIQUE (tool_id, context_id)
);

CREATE INDEX idx_reviews_tool ON reviews(tool_id);
CREATE INDEX idx_reviews_context ON reviews(context_id);
CREATE INDEX idx_reviews_score ON reviews(context_id, score DESC);

-- ============================================================================
-- AFFILIATE OFFERS TABLE (Monetization)
-- Flexible structure for various affiliate networks and direct links
-- ============================================================================

CREATE TABLE affiliate_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationship
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,

  -- Offer details
  url TEXT NOT NULL,
  cta_text TEXT DEFAULT 'Visit Website', -- "Try Free", "Get 20% Off", etc.

  -- Tracking
  is_affiliate BOOLEAN DEFAULT false, -- true = affiliate link, false = direct
  network TEXT, -- Optional: "Impact", "PartnerStack", "Direct", etc.
  commission_note TEXT, -- Internal note: "15% recurring"

  -- Priority
  is_primary BOOLEAN DEFAULT false, -- Main CTA button
  display_order INT DEFAULT 0,

  -- Metadata
  expires_at TIMESTAMPTZ, -- Optional expiration for time-limited offers
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_affiliate_tool ON affiliate_offers(tool_id);
CREATE INDEX idx_affiliate_primary ON affiliate_offers(tool_id, is_primary) WHERE is_primary = true;

-- ============================================================================
-- VOTES TABLE (User Trust Signals)
-- Anonymous voting with anti-gaming measures
-- ============================================================================

CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationship
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,

  -- Vote
  vote_type SMALLINT NOT NULL CHECK (vote_type IN (-1, 1)), -- -1 = down, 1 = up

  -- Anti-gaming (combined fingerprint)
  ip_hash TEXT NOT NULL,
  fingerprint_hash TEXT, -- Browser fingerprint hash
  turnstile_token TEXT, -- Store for audit/debugging

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate votes from same user
  CONSTRAINT unique_vote_per_user UNIQUE (review_id, ip_hash, fingerprint_hash)
);

CREATE INDEX idx_votes_review ON votes(review_id);

-- ============================================================================
-- HUNT LOGS TABLE (Automation Tracking)
-- Track Hunter Agent runs for debugging and preventing duplicates
-- ============================================================================

CREATE TABLE hunt_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What was hunted
  tool_name TEXT NOT NULL,
  context_title TEXT,

  -- Results
  status hunt_status DEFAULT 'pending',
  tool_id UUID REFERENCES tools(id) ON DELETE SET NULL,
  context_id UUID REFERENCES contexts(id) ON DELETE SET NULL,
  review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,

  -- Debugging
  error_message TEXT,
  raw_serper_response JSONB,
  raw_openai_response JSONB,

  -- Performance
  duration_ms INT,
  tokens_used INT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_hunt_logs_status ON hunt_logs(status);
CREATE INDEX idx_hunt_logs_tool ON hunt_logs(tool_name);
CREATE INDEX idx_hunt_logs_created ON hunt_logs(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunt_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for content tables
CREATE POLICY "Public read access" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read access" ON tools FOR SELECT USING (true);
CREATE POLICY "Public read access" ON contexts FOR SELECT USING (true);
CREATE POLICY "Public read access" ON reviews FOR SELECT USING (true);
CREATE POLICY "Public read access" ON affiliate_offers FOR SELECT USING (true);

-- Votes: No direct read (privacy), insert via RPC only
CREATE POLICY "No direct vote access" ON votes FOR SELECT USING (false);

-- Hunt logs: Admin only (via service role)
CREATE POLICY "Admin only" ON hunt_logs FOR ALL USING (false);

-- Admin write access (service_role bypasses RLS, but explicit for clarity)
-- In production, you'd use authenticated admin checks here

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Secure voting function with anti-gaming
CREATE OR REPLACE FUNCTION cast_vote(
  p_review_id UUID,
  p_vote_type SMALLINT,
  p_ip_hash TEXT,
  p_fingerprint_hash TEXT DEFAULT NULL,
  p_turnstile_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_vote SMALLINT;
  v_result JSONB;
BEGIN
  -- Validate vote type
  IF p_vote_type NOT IN (-1, 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid vote type');
  END IF;

  -- Check for existing vote
  SELECT vote_type INTO v_existing_vote
  FROM votes
  WHERE review_id = p_review_id
    AND ip_hash = p_ip_hash
    AND (fingerprint_hash = p_fingerprint_hash OR (fingerprint_hash IS NULL AND p_fingerprint_hash IS NULL));

  IF v_existing_vote IS NOT NULL THEN
    IF v_existing_vote = p_vote_type THEN
      -- Same vote exists - silently accept (shadowban behavior)
      RETURN jsonb_build_object('success', true, 'action', 'unchanged');
    ELSE
      -- Changing vote - update it
      UPDATE votes
      SET vote_type = p_vote_type,
          turnstile_token = p_turnstile_token
      WHERE review_id = p_review_id
        AND ip_hash = p_ip_hash
        AND (fingerprint_hash = p_fingerprint_hash OR (fingerprint_hash IS NULL AND p_fingerprint_hash IS NULL));

      -- Update review counts (swing of 2: remove old, add new)
      UPDATE reviews
      SET upvotes = upvotes + (CASE WHEN p_vote_type = 1 THEN 1 ELSE -1 END),
          downvotes = downvotes + (CASE WHEN p_vote_type = -1 THEN 1 ELSE -1 END),
          updated_at = NOW()
      WHERE id = p_review_id;

      RETURN jsonb_build_object('success', true, 'action', 'changed');
    END IF;
  END IF;

  -- New vote
  INSERT INTO votes (review_id, vote_type, ip_hash, fingerprint_hash, turnstile_token)
  VALUES (p_review_id, p_vote_type, p_ip_hash, p_fingerprint_hash, p_turnstile_token);

  -- Update review counts
  UPDATE reviews
  SET upvotes = upvotes + (CASE WHEN p_vote_type = 1 THEN 1 ELSE 0 END),
      downvotes = downvotes + (CASE WHEN p_vote_type = -1 THEN 1 ELSE 0 END),
      updated_at = NOW()
  WHERE id = p_review_id;

  RETURN jsonb_build_object('success', true, 'action', 'created');

EXCEPTION
  WHEN unique_violation THEN
    -- Race condition - vote already exists, silently accept
    RETURN jsonb_build_object('success', true, 'action', 'unchanged');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Semantic search function for tools
CREATE OR REPLACE FUNCTION match_tools(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  short_description TEXT,
  logo_url TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.slug,
    t.short_description,
    t.logo_url,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM tools t
  WHERE t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Update tool aggregate metrics
CREATE OR REPLACE FUNCTION update_tool_metrics(p_tool_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE tools
  SET
    avg_score = COALESCE((
      SELECT AVG(score)::NUMERIC(4,1)
      FROM reviews
      WHERE tool_id = p_tool_id AND score IS NOT NULL
    ), 0),
    review_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE tool_id = p_tool_id
    ),
    updated_at = NOW()
  WHERE id = p_tool_id;
END;
$$;

-- Update context tool count
CREATE OR REPLACE FUNCTION update_context_metrics(p_context_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE contexts
  SET
    tool_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE context_id = p_context_id
    ),
    updated_at = NOW()
  WHERE id = p_context_id;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tools_updated_at
  BEFORE UPDATE ON tools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_contexts_updated_at
  BEFORE UPDATE ON contexts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update metrics when reviews change
CREATE OR REPLACE FUNCTION trigger_review_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_tool_metrics(OLD.tool_id);
    PERFORM update_context_metrics(OLD.context_id);
    RETURN OLD;
  ELSE
    PERFORM update_tool_metrics(NEW.tool_id);
    PERFORM update_context_metrics(NEW.context_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_review_changes
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_review_metrics();

-- ============================================================================
-- SEED DATA: Initial Categories
-- ============================================================================

INSERT INTO categories (name, slug, description, icon, display_order, is_featured) VALUES
  ('CRM & Sales', 'crm-sales', 'Customer relationship management and sales tools', 'users', 1, true),
  ('Marketing', 'marketing', 'Marketing automation, email, and analytics', 'megaphone', 2, true),
  ('Productivity', 'productivity', 'Task management, notes, and collaboration', 'check-square', 3, true),
  ('Developer Tools', 'developer-tools', 'IDEs, APIs, and development platforms', 'code', 4, true),
  ('Design', 'design', 'UI/UX, graphics, and prototyping tools', 'palette', 5, true),
  ('Communication', 'communication', 'Team chat, video conferencing, and email', 'message-circle', 6, false),
  ('Finance', 'finance', 'Accounting, invoicing, and expense tracking', 'dollar-sign', 7, false),
  ('HR & Recruiting', 'hr-recruiting', 'Hiring, onboarding, and people management', 'briefcase', 8, false),
  ('Customer Support', 'customer-support', 'Help desk, live chat, and ticketing', 'headphones', 9, false),
  ('AI & Automation', 'ai-automation', 'AI tools, chatbots, and workflow automation', 'cpu', 10, true);

-- ============================================================================
-- GRANTS (for Supabase anon/authenticated roles)
-- ============================================================================

-- Allow anon to execute voting function
GRANT EXECUTE ON FUNCTION cast_vote TO anon;
GRANT EXECUTE ON FUNCTION match_tools TO anon;

-- Service role (for Hunter Agent) gets full access via service_role key
