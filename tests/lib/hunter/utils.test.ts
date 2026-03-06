/**
 * Tests for Hunter Utility Functions
 *
 * Pure functions with no side effects - easy to test!
 */

import { describe, it, expect } from 'vitest';
import {
  slugify,
  interpolateTemplate,
  buildFactSummary,
  classifySourceType,
  isLlmEligibleScoutSource,
  buildBalancedSynthesisSources,
  buildSnippetBucketsFromScout,
} from '@/lib/hunter/utils';
import type { RawSource } from '@/lib/hunter/types';
import type { KnowledgeCard } from '@/lib/knowledge-card';

describe('slugify', () => {
  it('converts text to lowercase with hyphens', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('Notion App')).toBe('notion-app');
  });

  it('removes special characters', () => {
    expect(slugify("Notion's App!")).toBe('notion-s-app');
    expect(slugify('Test@#$%Tool')).toBe('test-tool');
  });

  it('removes leading and trailing hyphens', () => {
    expect(slugify('---Test---')).toBe('test');
    expect(slugify('!@#Tool!@#')).toBe('tool');
  });

  it('collapses multiple hyphens into one', () => {
    expect(slugify('Test    Tool')).toBe('test-tool');
    expect(slugify('A--B--C')).toBe('a-b-c');
  });

  it('handles empty strings', () => {
    expect(slugify('')).toBe('');
  });

  it('handles strings with only special characters', () => {
    expect(slugify('!@#$%^&*()')).toBe('');
  });
});

describe('interpolateTemplate', () => {
  describe('simple variable substitution', () => {
    it('replaces simple variables', () => {
      const template = 'Hello {{name}}!';
      const result = interpolateTemplate(template, { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    it('replaces multiple variables', () => {
      const template = '{{greeting}} {{name}}, you are {{age}} years old';
      const result = interpolateTemplate(template, {
        greeting: 'Hello',
        name: 'Alice',
        age: '30',
      });
      expect(result).toBe('Hello Alice, you are 30 years old');
    });

    it('handles empty variable values', () => {
      const template = 'Hello {{name}}!';
      const result = interpolateTemplate(template, { name: '' });
      expect(result).toBe('Hello !');
    });

    it('handles missing variables', () => {
      const template = 'Hello {{name}}!';
      const result = interpolateTemplate(template, {});
      expect(result).toBe('Hello {{name}}!');
    });
  });

  describe('conditional blocks', () => {
    it('shows conditional blocks when variable is truthy', () => {
      const template = '{{#context}}Context: {{context}}{{/context}}';
      const result = interpolateTemplate(template, { context: 'Testing' });
      expect(result).toBe('Context: Testing');
    });

    it('hides conditional blocks when variable is empty', () => {
      const template = '{{#context}}Context: {{context}}{{/context}}';
      const result = interpolateTemplate(template, { context: '' });
      expect(result).toBe('');
    });

    it('handles multiple conditional blocks', () => {
      const template = '{{#a}}A is {{a}}. {{/a}}{{#b}}B is {{b}}.{{/b}}';
      const result1 = interpolateTemplate(template, { a: 'present', b: '' });
      expect(result1).toBe('A is present. ');

      const result2 = interpolateTemplate(template, { a: '', b: 'present' });
      expect(result2).toBe('B is present.');
    });

    it('handles nested variables in conditional blocks', () => {
      const template = '{{#show}}Name: {{name}}, Age: {{age}}{{/show}}';
      const result = interpolateTemplate(template, {
        show: 'yes',
        name: 'Bob',
        age: '25',
      });
      expect(result).toBe('Name: Bob, Age: 25');
    });
  });

  describe('edge cases', () => {
    it('handles empty template', () => {
      const result = interpolateTemplate('', { name: 'Test' });
      expect(result).toBe('');
    });

    it('handles template with no variables', () => {
      const result = interpolateTemplate('Plain text', { name: 'Test' });
      expect(result).toBe('Plain text');
    });

    it('handles multiline templates', () => {
      const template = `Line 1: {{a}}
{{#b}}Line 2: {{b}}
{{/b}}Line 3: {{c}}`;
      const result = interpolateTemplate(template, { a: 'A', b: 'B', c: 'C' });
      expect(result).toBe('Line 1: A\nLine 2: B\nLine 3: C');
    });
  });
});

describe('buildFactSummary', () => {
  it('builds a complete summary with all sections', () => {
    const card: KnowledgeCard = {
      official_name: 'Notion',
      tagline: 'All-in-one workspace',
      website_url: 'https://notion.so',
      logo_url: 'https://notion.so/logo.png',
      company: {
        name: 'Notion Labs',
        founded_year: 2016,
        headquarters: 'San Francisco, CA',
        employee_count: '201-500',
        funding_stage: 'series-c+',
      },
      pricing: {
        model: 'freemium',
        has_free_tier: true,
        has_free_trial: false,
        trial_days: null,
        starting_price: '$8/user/mo',
        tiers: [],
      },
      platforms: [
        { platform: 'web', available: true },
        { platform: 'mac', available: true },
        { platform: 'ios', available: true },
      ],
      features: {
        core: ['Collaborative docs', 'Databases', 'Wikis'],
        unique: ['Blocks-based editor', 'API-first'],
        capabilities: [],
      },
      integrations: {
        total_count: 50,
        notable: [
          { name: 'Slack', type: 'native', direction: 'bidirectional' },
          { name: 'Google Drive', type: 'native', direction: 'import' },
        ],
        has_api: true,
        has_webhooks: true,
        has_zapier: true,
      },
      audience: {
        primary: ['Teams', 'Individuals'],
        use_cases: ['Note-taking', 'Project management'],
        team_size: 'any',
        skill_level: 'beginner',
      },
      competitive: {
        main_alternatives: ['Confluence', 'Coda', 'Roam Research'],
        differentiators: ['Flexible blocks', 'Beautiful UI'],
        best_for: 'Teams wanting flexibility',
        not_ideal_for: 'Simple note-taking',
      },
      security: {
        soc2_certified: true,
        gdpr_compliant: true,
        hipaa_compliant: false,
        data_encryption: 'both',
        sso_available: true,
        two_factor: true,
        self_hosted_option: false,
      },
      support: {
        has_documentation: true,
        has_community: true,
        has_live_chat: true,
        has_phone_support: false,
        has_dedicated_support: true,
      },
      meta: {
        last_major_update: '2024-01',
        active_development: true,
        user_sentiment: 'positive',
        data_quality: 'high',
        extraction_date: '2024-01-15',
      },
    };

    const summary = buildFactSummary(card);

    // Check for key sections
    expect(summary).toContain('## Verified Facts for Notion');
    expect(summary).toContain('### Pricing');
    expect(summary).toContain('Model: freemium');
    expect(summary).toContain('Free Tier: Yes');
    expect(summary).toContain('Starting Price: $8/user/mo');
    expect(summary).toContain('### Platforms');
    expect(summary).toContain('Available on: web, mac, ios');
    expect(summary).toContain('### Core Features');
    expect(summary).toContain('Collaborative docs');
    expect(summary).toContain('### Unique Differentiators');
    expect(summary).toContain('Blocks-based editor');
    expect(summary).toContain('### Integrations');
    expect(summary).toContain('API: Yes');
    expect(summary).toContain('Zapier: Yes');
    expect(summary).toContain('Notable: Slack, Google Drive');
    expect(summary).toContain('### Target Audience');
    expect(summary).toContain('Primary: Teams, Individuals');
    expect(summary).toContain('### Competitive Landscape');
    expect(summary).toContain('Main Alternatives: Confluence, Coda, Roam Research');
    expect(summary).toContain('Best For: Teams wanting flexibility');
    expect(summary).toContain('Not Ideal For: Simple note-taking');
    expect(summary).toContain('### Security');
    expect(summary).toContain('SSO, 2FA, SOC 2, GDPR');
    expect(summary).toContain('### Data Quality: high');
  });

  it('handles minimal card with empty arrays', () => {
    const card: KnowledgeCard = {
      official_name: 'MinimalTool',
      tagline: null,
      website_url: null,
      logo_url: null,
      company: {},
      pricing: {
        model: 'free',
        has_free_tier: true,
        has_free_trial: false,
        trial_days: null,
        starting_price: null,
        tiers: [],
      },
      platforms: [],
      features: {
        core: [],
        unique: [],
        capabilities: [],
      },
      integrations: {
        total_count: null,
        notable: [],
        has_api: false,
        has_webhooks: false,
        has_zapier: false,
      },
      audience: {
        primary: [],
        use_cases: [],
        team_size: null,
        skill_level: null,
      },
      competitive: {
        main_alternatives: [],
        differentiators: [],
        best_for: null,
        not_ideal_for: null,
      },
      security: {
        soc2_certified: null,
        gdpr_compliant: null,
        hipaa_compliant: null,
        data_encryption: null,
        sso_available: null,
        two_factor: null,
        self_hosted_option: false,
      },
      support: {
        has_documentation: false,
        has_community: false,
        has_live_chat: false,
        has_phone_support: false,
        has_dedicated_support: false,
      },
      meta: {
        last_major_update: null,
        active_development: null,
        user_sentiment: null,
        data_quality: 'low',
        extraction_date: '2024-01-15',
      },
    };

    const summary = buildFactSummary(card);

    expect(summary).toContain('## Verified Facts for MinimalTool');
    expect(summary).toContain('Model: free');
    expect(summary).toContain('Free Tier: Yes');
    expect(summary).toContain('API: No');
    expect(summary).toContain('Data Quality: low');
    // Should not have empty sections
    expect(summary).not.toContain('### Platforms');
    expect(summary).not.toContain('### Core Features');
  });

  it('handles free trial with days', () => {
    const card: KnowledgeCard = {
      official_name: 'TestTool',
      tagline: null,
      website_url: null,
      logo_url: null,
      company: {},
      pricing: {
        model: 'paid',
        has_free_tier: false,
        has_free_trial: true,
        trial_days: 14,
        starting_price: '$10/mo',
        tiers: [],
      },
      platforms: [],
      features: {
        core: [],
        unique: [],
        capabilities: [],
      },
      integrations: {
        total_count: null,
        notable: [],
        has_api: false,
        has_webhooks: false,
        has_zapier: false,
      },
      audience: {
        primary: [],
        use_cases: [],
        team_size: null,
        skill_level: null,
      },
      competitive: {
        main_alternatives: [],
        differentiators: [],
        best_for: null,
        not_ideal_for: null,
      },
      security: {
        soc2_certified: null,
        gdpr_compliant: null,
        hipaa_compliant: null,
        data_encryption: null,
        sso_available: null,
        two_factor: null,
        self_hosted_option: false,
      },
      support: {
        has_documentation: false,
        has_community: false,
        has_live_chat: false,
        has_phone_support: false,
        has_dedicated_support: false,
      },
      meta: {
        last_major_update: null,
        active_development: null,
        user_sentiment: null,
        data_quality: 'medium',
        extraction_date: '2024-01-15',
      },
    };

    const summary = buildFactSummary(card);

    expect(summary).toContain('Free Trial: 14 days');
  });
});

describe('classifySourceType', () => {
  it('classifies first-party community subdomains as community', () => {
    expect(
      classifySourceType('https://community.baserow.io/t/example-thread', 'https://baserow.io')
    ).toBe('community');
  });

  it('classifies tool root domain as official', () => {
    expect(classifySourceType('https://baserow.io/pricing', 'https://baserow.io')).toBe('official');
  });

  it('classifies known editorial and community domains', () => {
    expect(classifySourceType('https://techradar.com/reviews/tool')).toBe('editorial');
    expect(classifySourceType('https://reddit.com/r/tool/comments/abc')).toBe('community');
  });

  it('respects scout source type hints for docs/support domains', () => {
    expect(
      classifySourceType(
        'https://support.claude.com/en/articles/11049762-choosing-a-claude-plan',
        'https://claude.ai',
        'support'
      )
    ).toBe('official');
  });
});

describe('isLlmEligibleScoutSource', () => {
  it('accepts scrape-allowed and non-scrape ingestion-allowed sources', () => {
    expect(
      isLlmEligibleScoutSource({
        policy: { acquisition_mode: 'SCRAPE_ALLOWED', llm_ingestion_allowed: 'YES' } as any,
      } as any)
    ).toBe(true);
    expect(
      isLlmEligibleScoutSource({
        policy: { acquisition_mode: 'LINK_ONLY', llm_ingestion_allowed: 'YES_LIMITED' } as any,
      } as any)
    ).toBe(true);
    expect(
      isLlmEligibleScoutSource({
        policy: { acquisition_mode: 'API_ONLY', llm_ingestion_allowed: 'YES' } as any,
      } as any)
    ).toBe(true);
  });

  it('rejects blocked or non-ingestable sources', () => {
    expect(
      isLlmEligibleScoutSource({
        policy: { acquisition_mode: 'BLOCKED', llm_ingestion_allowed: 'YES' } as any,
      } as any)
    ).toBe(false);
    expect(
      isLlmEligibleScoutSource({
        policy: { acquisition_mode: 'SCRAPE_ALLOWED', llm_ingestion_allowed: 'NO' } as any,
      } as any)
    ).toBe(false);
    expect(isLlmEligibleScoutSource({ policy: undefined as any } as any)).toBe(false);
  });
});

function createSource(overrides: Partial<RawSource>): RawSource {
  return {
    url: 'https://example.com',
    title: 'Source',
    snippet: 'Snippet',
    domain: 'example.com',
    retrieved_at: '2026-03-06',
    canonical_url: 'https://example.com',
    source_type: 'editorial',
    intent_tags: ['reviews'],
    policy: {
      acquisition_mode: 'SCRAPE_ALLOWED',
      llm_ingestion_allowed: 'YES',
      display_mode: 'ATTRIBUTED_EXCERPT',
    },
    ...overrides,
  };
}

describe('buildBalancedSynthesisSources', () => {
  it('includes user-signal sources even when curated set is docs-heavy', () => {
    const official = createSource({
      url: 'https://tool.com/docs',
      source_type: 'official',
      intent_tags: ['integrations'],
    });
    const reddit = createSource({
      url: 'https://reddit.com/r/tool/comments/1',
      source_type: 'community',
      intent_tags: ['reviews'],
    });
    const g2 = createSource({
      url: 'https://www.g2.com/products/tool/reviews',
      source_type: 'editorial',
      intent_tags: ['reviews'],
    });

    const result = buildBalancedSynthesisSources([official, reddit, g2], new Set([official.url]));
    const urls = result.map((entry) => entry.url);

    expect(urls).toContain(official.url);
    expect(urls).toContain(reddit.url);
    expect(urls).toContain(g2.url);
  });
});

describe('buildSnippetBucketsFromScout', () => {
  it('orders review snippets with user-signal before official docs', () => {
    const officialReview = createSource({
      url: 'https://tool.com/reviews',
      source_type: 'official',
      intent_tags: ['reviews'],
      title: 'Official review page',
    });
    const redditReview = createSource({
      url: 'https://reddit.com/r/tool/comments/1',
      source_type: 'community',
      intent_tags: ['reviews'],
      title: 'Reddit thread',
    });

    const buckets = buildSnippetBucketsFromScout([officialReview, redditReview]);

    expect(buckets.reviewsSnippets[0]).toContain('reddit.com');
    expect(buckets.reviewsSnippets[1]).toContain('tool.com/reviews');
  });
});
