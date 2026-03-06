import { describe, expect, it } from 'vitest';
import { buildToolPageResearchStatusView } from '@/lib/tool-page/research-status';

describe('tool page research status view', () => {
  it('builds pending confirmation and last checked labels', () => {
    const result = buildToolPageResearchStatusView({
      evaluationDepth: 'Hands-on + source-audited',
      collectedSourcesTotal: 7,
      trustConfidenceLabel: 'high',
      pendingVerificationCount: 2,
      communityCorroborationCount: 3,
      userSignalCoveragePending: true,
      communityVerifiedLabel: null,
      specsVerifiedLabel: '3 days ago',
      pricingCheckedLabel: null,
    });

    expect(result.pendingConfirmationLabel).toContain('2 claims still pending');
    expect(result.communityCorroborationLabel).toContain('3 corroborating community domains');
    expect(result.userSignalCoverageLabel).toContain(
      'User-reported claim extraction is still pending'
    );
    expect(result.lastCheckedLabel).toBe('3 days ago');
  });

  it('hides pending confirmation when none are pending', () => {
    const result = buildToolPageResearchStatusView({
      evaluationDepth: 'Source-backed',
      collectedSourcesTotal: 3,
      trustConfidenceLabel: 'medium',
      pendingVerificationCount: 0,
      communityCorroborationCount: 0,
      userSignalCoveragePending: false,
      communityVerifiedLabel: null,
      specsVerifiedLabel: null,
      pricingCheckedLabel: null,
    });

    expect(result.pendingConfirmationLabel).toBeNull();
    expect(result.communityCorroborationLabel).toBeNull();
    expect(result.userSignalCoverageLabel).toBeNull();
    expect(result.lastCheckedLabel).toBe('unknown');
  });
});
