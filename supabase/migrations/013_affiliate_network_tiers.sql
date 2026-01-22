-- Migration: Affiliate Network Tiers & Link Health Tracking
-- Description: Add support for tiered affiliate networks (PartnerStack/Impact/Manual)
--              and automated link health verification
-- Author: StackHunt
-- Date: 2026-01-22

-- Add new columns to affiliate_offers table
ALTER TABLE affiliate_offers
  ADD COLUMN IF NOT EXISTS network_tier smallint DEFAULT 3
    CHECK (network_tier IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS network_program_id text,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unknown'
    CHECK (verification_status IN ('healthy', 'broken', 'expired', 'pending', 'unknown'));

-- Add comments for documentation
COMMENT ON COLUMN affiliate_offers.network_tier IS
  'Tier 1: API-integrated networks (PartnerStack, Impact) - auto-verified
   Tier 2: Legacy networks (ShareASale, CJ) - CSV import
   Tier 3: Direct/manual links (Rewardful, indie tools) - manual check';

COMMENT ON COLUMN affiliate_offers.network_program_id IS
  'Program ID from affiliate network API for automated verification';

COMMENT ON COLUMN affiliate_offers.last_verified_at IS
  'Last time this link was verified (HEAD request or API check)';

COMMENT ON COLUMN affiliate_offers.verification_status IS
  'Current link health status - updated by automated worker';

-- Index for link health queries (find broken links)
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_verification_status
  ON affiliate_offers(verification_status)
  WHERE verification_status != 'healthy';

-- Index for expired verification checks (find links needing re-verification)
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_last_verified
  ON affiliate_offers(last_verified_at)
  WHERE is_active = true;

-- Create function to auto-disable broken links after 3 failed verifications
CREATE OR REPLACE FUNCTION auto_disable_broken_links()
RETURNS trigger AS $$
BEGIN
  -- If a link has been broken for 7+ days, auto-disable it
  IF NEW.verification_status = 'broken'
     AND NEW.last_verified_at < NOW() - INTERVAL '7 days'
     AND NEW.is_active = true THEN
    NEW.is_active = false;

    -- Log the auto-disable in audit (if audit table exists)
    -- INSERT INTO audit_log (entity_type, entity_id, action, metadata)
    -- VALUES ('affiliate_offer', NEW.id, 'auto_disabled', jsonb_build_object('reason', 'broken_link_7_days'));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-disable broken links
DROP TRIGGER IF EXISTS trigger_auto_disable_broken_links ON affiliate_offers;
CREATE TRIGGER trigger_auto_disable_broken_links
  BEFORE UPDATE OF verification_status ON affiliate_offers
  FOR EACH ROW
  EXECUTE FUNCTION auto_disable_broken_links();

-- Update existing records to have default tier based on network
UPDATE affiliate_offers
SET network_tier = CASE
  WHEN network IN ('partnerstack', 'impact') THEN 1
  WHEN network IN ('shareasale', 'cj', 'rakuten') THEN 2
  ELSE 3
END
WHERE network_tier IS NULL;

-- Grant necessary permissions
GRANT SELECT ON affiliate_offers TO authenticated;
GRANT ALL ON affiliate_offers TO service_role;
