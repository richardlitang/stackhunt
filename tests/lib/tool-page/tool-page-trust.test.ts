import { describe, expect, it } from 'vitest';
import {
  buildToolPageTrustViewModel,
  countPendingVerifications,
  deriveToolPageEvidenceState,
} from '@/lib/tool-page/evidence/trust';

describe('tool page trust', () => {
  it('counts only unverified items', () => {
    const pending = countPendingVerifications([
      { unverified: true },
      { unverified: false },
      null,
      undefined,
      {},
      { unverified: true },
    ]);
    expect(pending).toBe(2);
  });

  it('degrades evidence grade A to B when pending verification exists', () => {
    const state = deriveToolPageEvidenceState({
      baseEvidenceGrade: 'A',
      pendingVerificationCount: 1,
    });

    expect(state.evidenceGrade).toBe('B');
    expect(state.isVerificationMode).toBe(true);
  });

  it('keeps evidence grade C and verification mode true without pending items', () => {
    const state = deriveToolPageEvidenceState({
      baseEvidenceGrade: 'C',
      pendingVerificationCount: 0,
    });

    expect(state.evidenceGrade).toBe('C');
    expect(state.isVerificationMode).toBe(true);
  });

  it('returns source-backed + high confidence when verification is clean', () => {
    const viewModel = buildToolPageTrustViewModel({
      hasCollectedSources: true,
      isVerificationMode: false,
      pendingVerificationCount: 0,
      contentConfidenceLevel: 'high',
      hasPricingCheckedProof: true,
      pricingCheckedLabel: 'Mar 4, 2026',
      pricingSourceUrl: 'https://example.com/pricing',
      specsVerifiedLabel: null,
      officialDocsSourceUrl: null,
      communityVerifiedLabel: null,
      officialPricingSourceUrl: null,
    });

    expect(viewModel.trustStatus).toBe('Source-backed');
    expect(viewModel.trustConfidenceLabel).toBe('High');
    expect(viewModel.updateHistoryEntries).toEqual([
      {
        date: 'Mar 4, 2026',
        what: 'Pricing references rechecked',
        why: 'Pricing is volatile and can change frequently',
        source: 'https://example.com/pricing',
      },
    ]);
  });

  it('downgrades confidence and returns pending trust status when verification is incomplete', () => {
    const viewModel = buildToolPageTrustViewModel({
      hasCollectedSources: true,
      isVerificationMode: true,
      pendingVerificationCount: 2,
      contentConfidenceLevel: 'high',
      hasPricingCheckedProof: false,
      pricingCheckedLabel: null,
      pricingSourceUrl: null,
      specsVerifiedLabel: 'Mar 1, 2026',
      officialDocsSourceUrl: 'https://example.com/docs',
      communityVerifiedLabel: 'Mar 2, 2026',
      officialPricingSourceUrl: 'https://example.com/pricing',
    });

    expect(viewModel.trustStatus).toBe('Needs confirmation');
    expect(viewModel.trustConfidenceLabel).toBe('Medium');
    expect(viewModel.updateHistoryEntries).toEqual([
      {
        date: 'Mar 1, 2026',
        what: 'Product docs and specs refreshed',
        why: 'Feature and setup claims require current docs',
        source: 'https://example.com/docs',
      },
      {
        date: 'Mar 2, 2026',
        what: 'Editorial verdict and tradeoffs updated',
        why: 'Recommendation language aligned to latest source-backed claims',
        source: 'https://example.com/docs',
      },
    ]);
  });
});
