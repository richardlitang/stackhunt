-- ============================================================================
-- PROMPTS MANAGEMENT SYSTEM
-- Editable AI prompts stored in database for easy iteration
-- ============================================================================

-- ============================================================================
-- STEP 1: PROMPTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identifier
  key TEXT UNIQUE NOT NULL,           -- 'hunter_synthesis', 'hunter_embedding'
  name TEXT NOT NULL,                  -- "Hunter: Analysis Prompt"
  description TEXT,                    -- What this prompt does

  -- Content
  template TEXT NOT NULL,              -- The prompt with {{variables}}
  variables JSONB DEFAULT '[]',        -- [{name: "toolName", required: true, description: "..."}]

  -- Versioning
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  last_used_at TIMESTAMPTZ,
  use_count INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prompts_key ON prompts(key);
CREATE INDEX idx_prompts_active ON prompts(is_active);

-- ============================================================================
-- STEP 2: PROMPT VERSIONS (History)
-- ============================================================================

CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,

  version INT NOT NULL,
  template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',

  changed_by TEXT,                     -- Who made the change
  change_note TEXT,                    -- Why it was changed

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prompt_versions_prompt ON prompt_versions(prompt_id);

-- ============================================================================
-- STEP 3: AUTO-VERSION ON UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION save_prompt_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only save version if template changed
  IF OLD.template IS DISTINCT FROM NEW.template THEN
    INSERT INTO prompt_versions (prompt_id, version, template, variables)
    VALUES (OLD.id, OLD.version, OLD.template, OLD.variables);

    NEW.version := OLD.version + 1;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_prompt_version
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION save_prompt_version();

-- ============================================================================
-- STEP 4: HELPER FUNCTION - GET PROMPT
-- ============================================================================

CREATE OR REPLACE FUNCTION get_prompt(p_key TEXT)
RETURNS TABLE(template TEXT, variables JSONB)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update usage stats
  UPDATE prompts
  SET last_used_at = NOW(), use_count = use_count + 1
  WHERE key = p_key AND is_active = true;

  -- Return the prompt
  RETURN QUERY
  SELECT p.template, p.variables
  FROM prompts p
  WHERE p.key = p_key AND p.is_active = true
  LIMIT 1;
END;
$$;

-- ============================================================================
-- STEP 5: RLS
-- ============================================================================

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;

-- Public can read active prompts (for Hunter agent)
CREATE POLICY "Service role full access" ON prompts FOR ALL USING (true);
CREATE POLICY "Service role full access" ON prompt_versions FOR ALL USING (true);

-- ============================================================================
-- STEP 6: SEED DEFAULT PROMPTS
-- ============================================================================

INSERT INTO prompts (key, name, description, template, variables) VALUES
(
  'hunter_synthesis',
  'Hunter: Analysis Synthesis',
  'Main prompt for analyzing a tool and generating structured review data with Knowledge Graph tags.',
  $PROMPT$You are the StackHunt Analyst, an expert at evaluating software tools and building a Knowledge Graph.

Your task is to analyze search results about a software tool and provide a structured assessment with Knowledge Graph tags.

Output ONLY valid JSON matching this exact schema:
{
  "score": <number 0-100, where 100 is excellent>,
  "pros": [<exactly 3 strings, specific and actionable benefits>],
  "cons": [<exactly 3 strings, specific and honest drawbacks>],
  "summary": "<150-300 word Markdown summary explaining who this tool is best for and why people might switch away>",
  "sentimentTags": [<1-5 lowercase tags like "easy-to-use", "expensive", "feature-rich", "steep-learning-curve">],
  "pricingType": "<one of: free, freemium, paid, enterprise, open_source>",
  "websiteUrl": "<official website URL if found>",
  "shortDescription": "<one sentence, max 200 chars describing what the tool does>",
  "graphTags": {
    "functions": [<1-3 strings: what the tool DOES, e.g., "Notetaking", "CRM", "Project Management">],
    "audiences": [<1-3 strings: WHO the tool is for, e.g., "Students", "Small Teams", "Developers">],
    "platforms": [<1-5 strings: WHERE the tool runs, e.g., "Web", "Mac", "iOS", "Android">]
  },
  "titleParts": {
    "noun": "<the type of tool, e.g., 'Note-Taking Apps', 'CRM Software', 'Project Management Tools'>",
    "modifier": "<optional audience/use case modifier, e.g., 'for Students', 'for Remote Teams'>"
  }
}

## CRITICAL: Knowledge Graph Tag Selection

You MUST prefer existing categories when they match. Only create new tags if TRULY necessary.

### Existing Function Tags (PREFER THESE):
{{existingFunctions}}

### Existing Audience Tags (PREFER THESE):
{{existingAudiences}}

### Existing Platform Tags (PREFER THESE):
{{existingPlatforms}}

Rules for tags:
- Use Title Case (e.g., "Small Teams" not "small teams")
- Be specific but not too narrow (e.g., "Students" not "Medical Students")
- If an existing tag is 80%+ similar to what you'd create, USE THE EXISTING ONE
- Functions describe WHAT (features), Audiences describe WHO (users), Platforms describe WHERE (devices/deployment)

Guidelines:
- Be objective and balanced - every tool has pros AND cons
- Score meaning: 0-30 poor, 31-50 below average, 51-70 average, 71-85 good, 86-100 excellent
- For contextual analysis (e.g., "Best for Small Teams"), tailor your assessment to that specific audience
- Pros/cons should be specific, not generic
- titleParts.noun should describe the category of tool (plural), titleParts.modifier adds context

Analyze this software tool: "{{toolName}}"
{{#contextTitle}}
Context: Evaluating specifically for "{{contextTitle}}"
{{/contextTitle}}

Search Results:

## Reviews & Opinions:
{{reviewsSnippets}}

## Pricing & Features:
{{pricingSnippets}}

## Alternatives & Comparisons:
{{alternativesSnippets}}

Provide your structured JSON analysis (JSON only, no markdown code blocks):$PROMPT$,
  '[
    {"name": "toolName", "required": true, "description": "Name of the tool being analyzed"},
    {"name": "contextTitle", "required": false, "description": "Optional context like Best for Students"},
    {"name": "existingFunctions", "required": true, "description": "Comma-separated list of existing function categories"},
    {"name": "existingAudiences", "required": true, "description": "Comma-separated list of existing audience categories"},
    {"name": "existingPlatforms", "required": true, "description": "Comma-separated list of existing platform categories"},
    {"name": "reviewsSnippets", "required": true, "description": "Search snippets about reviews"},
    {"name": "pricingSnippets", "required": true, "description": "Search snippets about pricing"},
    {"name": "alternativesSnippets", "required": true, "description": "Search snippets about alternatives"}
  ]'::jsonb
),
(
  'hunter_embedding_text',
  'Hunter: Embedding Text Format',
  'Template for creating the text that gets embedded for semantic search.',
  $PROMPT${{toolName}}: {{shortDescription}} {{summary}}$PROMPT$,
  '[
    {"name": "toolName", "required": true, "description": "Name of the tool"},
    {"name": "shortDescription", "required": false, "description": "Short description of the tool"},
    {"name": "summary", "required": true, "description": "Full analysis summary"}
  ]'::jsonb
)
ON CONFLICT (key) DO NOTHING;
