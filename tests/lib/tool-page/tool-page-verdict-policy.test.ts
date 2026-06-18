import { describe, expect, it } from 'vitest';
import { deriveToolPageVerdictPolicy } from '@/lib/tool-page/decision/verdict-policy';

describe('tool page verdict policy', () => {
  it('suppresses negative verdict claims when evidence is insufficient', () => {
    const result = deriveToolPageVerdictPolicy({
      firstReviewSummaryMarkdown: 'This tool is expensive and broken for teams.',
      toolVerdict: null,
      humanVerdict: 'Avoid because it fails under load.',
      avoidIf: ['You need reliability.'],
      hasEligibleNegativeEvidence: false,
      hasFreePlanSignal: false,
      renderVerdict: 'Fallback verdict',
    });

    expect(result.guardedHumanVerdict).toBeNull();
    expect(result.guardedAvoidIf).toEqual([]);
    expect(result.renderVerdictSafe).toBe('Fallback verdict');
  });

  it('removes contradictory free-plan and web-only claims from verdict text', () => {
    const result = deriveToolPageVerdictPolicy({
      firstReviewSummaryMarkdown: null,
      toolVerdict: null,
      humanVerdict: null,
      avoidIf: [],
      hasEligibleNegativeEvidence: true,
      hasFreePlanSignal: true,
      renderVerdict:
        'There is no free tier available. Platform access is limited to web-only environments.',
    });

    expect(result.renderVerdictSafe).toBeTruthy();
    expect(result.renderVerdictSafe).not.toContain('no free tier');
    expect(result.renderVerdictSafe).not.toContain('web-only');
    expect(result.isDisallowedConClaim('No free plan for users')).toBe(true);
  });
});
