import { describe, expect, it } from 'vitest';
import { extractResearchCheckpoint } from '@/lib/hunter/evals/fixtures';

describe('extractResearchCheckpoint', () => {
  it('returns the research payload when scoutResult and knowledgeCard are present', () => {
    const research = {
      scoutResult: { summary: 'ok' },
      knowledgeCard: { official_name: 'Notion' },
      tokensUsed: 42,
    };

    expect(
      extractResearchCheckpoint({
        research,
      })
    ).toEqual(research);
  });

  it('returns null when the checkpoint is missing required research sections', () => {
    expect(
      extractResearchCheckpoint({
        research: {
          knowledgeCard: { official_name: 'Notion' },
        },
      })
    ).toBeNull();

    expect(
      extractResearchCheckpoint({
        research: {
          scoutResult: { summary: 'ok' },
        },
      })
    ).toBeNull();
  });
});
