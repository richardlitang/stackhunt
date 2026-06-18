import { describe, expect, it } from 'vitest';
import { buildToolPageTribalKnowledgeProps } from '@/lib/tool-page/presentation/tribal-knowledge-props';

describe('tool page tribal knowledge props', () => {
  it('shows section when community is enabled and user signal exists', () => {
    const result = buildToolPageTribalKnowledgeProps({
      hasCommunity: true,
      userAdvocate: {},
      guardedHumanVerdict: null,
      vibe: 'fast',
      originStory: null,
      idealFor: ['teams'],
      guardedAvoidIf: ['strict offline'],
      powerTip: null,
      delighters: ['easy onboarding'],
      frustrations: [],
    });

    expect(result.shouldShow).toBe(true);
    expect(result.userAdvocate?.avoidIf).toEqual(['strict offline']);
  });

  it('hides section when community is disabled', () => {
    const result = buildToolPageTribalKnowledgeProps({
      hasCommunity: false,
      userAdvocate: {},
      guardedHumanVerdict: 'verdict',
      vibe: null,
      originStory: null,
      idealFor: [],
      guardedAvoidIf: [],
      powerTip: null,
      delighters: [],
      frustrations: [],
    });

    expect(result.shouldShow).toBe(false);
  });
});
