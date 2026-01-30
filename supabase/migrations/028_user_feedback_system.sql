-- User Feedback System
-- Allows users to submit structured feedback about pages, tools, and content

CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Context
  tool_id UUID REFERENCES items(id) ON DELETE SET NULL,
  tool_name TEXT,
  page_url TEXT,

  -- Feedback details
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'outdated_info',
    'missing_info',
    'incorrect_pricing',
    'incorrect_features',
    'broken_link',
    'suggestion',
    'other'
  )),
  feedback_text TEXT NOT NULL CHECK (char_length(feedback_text) >= 10 AND char_length(feedback_text) <= 1000),

  -- Reporter info (optional)
  reporter_email TEXT,

  -- Privacy & Rate Limiting
  ip_hash TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,

  -- QA trigger tracking
  triggered_qa_check BOOLEAN DEFAULT FALSE,
  qa_check_queued_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_user_feedback_status ON user_feedback(status);
CREATE INDEX idx_user_feedback_tool_id ON user_feedback(tool_id);
CREATE INDEX idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at DESC);
CREATE INDEX idx_user_feedback_ip_hash_created ON user_feedback(ip_hash, created_at) WHERE ip_hash IS NOT NULL;

-- RLS Policies
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can insert feedback (rate limited by application logic)
CREATE POLICY "Anyone can submit feedback"
  ON user_feedback
  FOR INSERT
  WITH CHECK (true);

-- Only authenticated users (admins) can view feedback
CREATE POLICY "Authenticated users can view feedback"
  ON user_feedback
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only authenticated users (admins) can update feedback status
CREATE POLICY "Authenticated users can update feedback"
  ON user_feedback
  FOR UPDATE
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE user_feedback IS 'User-submitted feedback about pages, tools, and content quality';
COMMENT ON COLUMN user_feedback.feedback_type IS 'Category of feedback for triage and prioritization';
COMMENT ON COLUMN user_feedback.ip_hash IS 'Hashed IP for rate limiting while preserving privacy';
COMMENT ON COLUMN user_feedback.status IS 'Workflow status: pending → reviewing → resolved/dismissed';
COMMENT ON COLUMN user_feedback.triggered_qa_check IS 'Whether this feedback triggered an automatic QA check/re-hunt';
COMMENT ON COLUMN user_feedback.qa_check_queued_at IS 'When the QA check was queued in response to feedback volume';
