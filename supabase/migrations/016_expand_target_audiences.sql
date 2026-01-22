-- ============================================================================
-- MIGRATION 016: Expand Target Audiences
-- Adds more valid target audience values for broader content coverage
-- ============================================================================

-- Drop the old constraint
ALTER TABLE content_ideas
  DROP CONSTRAINT IF EXISTS valid_target_audience;

-- Add expanded constraint with more audience types
ALTER TABLE content_ideas
  ADD CONSTRAINT valid_target_audience CHECK (
    target_audience IS NULL OR target_audience IN (
      -- Original audiences
      'freelancers',
      'solopreneurs',
      'small-teams',
      'agencies',
      'startups',
      'enterprise',
      'developers',
      'designers',
      'marketers',
      'content-creators',
      'consultants',
      'coaches',
      'remote-teams',
      'sales-teams',
      'finance-teams',
      'students',
      'non-profits',
      'virtual-assistants',
      'creatives',
      'founders',

      -- HR & People Operations
      'hr-teams',
      'recruiters',
      'hiring-managers',
      'people-ops',

      -- Support & Customer Success
      'support-teams',
      'customer-success',
      'customer-support',

      -- Engineering & Operations
      'devops-teams',
      'engineering-teams',
      'it-teams',
      'sysadmins',

      -- Product & Growth
      'product-managers',
      'product-teams',
      'growth-teams',

      -- General business roles
      'managers',
      'executives',
      'operations-teams',
      'business-owners',
      'teams'
    )
  );

COMMENT ON CONSTRAINT valid_target_audience ON content_ideas IS
  'Valid target audiences including developers, designers, business roles, HR, support, and operations teams';
