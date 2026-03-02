-- Add generation quality telemetry JSON for review-level auditing
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS generation_quality JSONB DEFAULT NULL;

COMMENT ON COLUMN reviews.generation_quality IS
'Generation-stage quality telemetry (confidence stats, source diversity, abstentions) for auditability and editorial debugging.';

CREATE INDEX IF NOT EXISTS idx_reviews_generation_quality
  ON reviews USING GIN (generation_quality)
  WHERE generation_quality IS NOT NULL;
