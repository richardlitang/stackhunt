-- ============================================================================
-- MIGRATION 018: Defensive ROI Formula for New Domains
-- Makes the ROI calculation more punitive for high-difficulty keywords
-- ============================================================================

-- Update the ROI calculation function to use logarithmic difficulty weighting
-- This makes KD 80 much harder to justify than KD 40 (not just 2x, but ~3.5x)
CREATE OR REPLACE FUNCTION calculate_roi_score(
  p_volume INT,
  p_difficulty INT,
  p_cpc DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Avoid division by zero
  IF p_difficulty IS NULL OR p_difficulty = 0 THEN
    RETURN 0;
  END IF;

  -- Defensive ROI formula for new domains:
  -- ROI = (Volume / Difficulty^1.5) * CPC_Weight
  --
  -- The power of 1.5 makes high-difficulty keywords exponentially harder to justify:
  -- - KD 20: divisor = 89   (20^1.5)
  -- - KD 40: divisor = 253  (40^1.5) - 2.8x harder than KD 20
  -- - KD 60: divisor = 465  (60^1.5) - 5.2x harder than KD 20
  -- - KD 80: divisor = 716  (80^1.5) - 8x harder than KD 20
  --
  -- CPC weight: 0.1 to 1.0 (higher CPC = higher commercial value)
  RETURN (p_volume::DECIMAL / POWER(p_difficulty + 10, 1.5)) * LEAST(p_cpc / 10, 1.0);
END;
$$;

-- Recalculate ROI scores for all pending content ideas
UPDATE content_ideas
SET roi_score = calculate_roi_score(search_volume, keyword_difficulty, cpc)
WHERE status = 'pending'
  AND search_volume IS NOT NULL
  AND keyword_difficulty IS NOT NULL;

COMMENT ON FUNCTION calculate_roi_score IS
  'Defensive ROI formula: (Volume / Difficulty^1.5) * CPC_Weight. Penalizes high-KD keywords exponentially for new domains.';
