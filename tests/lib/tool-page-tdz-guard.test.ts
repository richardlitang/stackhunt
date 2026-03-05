import { describe, expect, it } from 'vitest';
import { findToolPagePrepReviewEvidenceTDZRisks } from '../../scripts/lib/tool-page-tdz-guard.mjs';

describe('tool page tdz guard', () => {
  it('flags disallowed identifiers inside prep review evidenceContext', () => {
    const source = `
const x = buildToolPagePrepReviewEvidenceStateFromDecisionContext({
  reviewEvidence: {
    evidenceContext: {
      hasPricing,
      faqItems,
      toEvidenceBullet,
      isDisallowedConClaim,
    }
  }
});
`;
    const findings = findToolPagePrepReviewEvidenceTDZRisks(source);
    expect(findings.map((item) => item.identifier).sort()).toEqual([
      'faqItems',
      'hasPricing',
      'isDisallowedConClaim',
      'toEvidenceBullet',
    ]);
  });

  it('does not flag when evidenceContext avoids disallowed identifiers', () => {
    const source = `
const x = buildToolPagePrepReviewEvidenceStateFromDecisionContext({
  reviewEvidence: {
    evidenceContext: {
      firstReview,
      constraints,
      knowledgeCard,
    }
  }
});
`;
    expect(findToolPagePrepReviewEvidenceTDZRisks(source)).toHaveLength(0);
  });

  it('ignores disallowed-looking tokens in comments and strings', () => {
    const source = `
// buildToolPagePrepReviewEvidenceStateFromDecisionContext({ evidenceContext: { faqItems } });
const note = "buildToolPagePrepReviewEvidenceStateFromDecisionContext({ evidenceContext: { hasPricing } })";
const x = buildToolPagePrepReviewEvidenceStateFromDecisionContext({
  reviewEvidence: {
    evidenceContext: {
      firstReview,
      constraints,
    }
  }
});
`;
    expect(findToolPagePrepReviewEvidenceTDZRisks(source)).toHaveLength(0);
  });
});
