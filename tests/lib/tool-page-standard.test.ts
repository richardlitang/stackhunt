import { describe, expect, it } from 'vitest';
import { createToolPageEvidenceContract } from '@/lib/tool-page/evidence-contract';
import { computeToolPageSectionContract } from '@/lib/tool-page/standard';

describe('tool page section contract', () => {
  it('allows optional sections when evidence is complete and fresh', () => {
    const contract = createToolPageEvidenceContract({
      evaluationDepth: 'hands_on',
      confidenceByField: {
        evidence: 'high',
        alternatives: 'medium',
      },
      lastCheckedByField: {
        evidence: new Date().toISOString(),
      },
    });

    const result = computeToolPageSectionContract({
      evidenceContract: contract,
      sectionStatus: { specs: 'show', community: 'show' },
      sectionPublishability: { faq: true },
      hasFaqData: true,
      hasGettingStartedData: true,
      hasSpecsData: true,
      hasCommunityData: true,
      hasPlatformData: true,
      hasSecurityData: true,
      hasPortabilityData: true,
    });

    expect(result.allowedSections.faq).toBe(true);
    expect(result.allowedSections.specs).toBe(true);
    expect(result.allowedSections.community).toBe(true);
    expect(Object.keys(result.sectionOmissionReasons)).toHaveLength(0);
  });

  it('omits faq when checked date is missing', () => {
    const contract = createToolPageEvidenceContract({
      confidenceByField: {
        evidence: 'high',
      },
      lastCheckedByField: {
        evidence: null,
      },
    });

    const result = computeToolPageSectionContract({
      evidenceContract: contract,
      sectionStatus: { specs: 'show', community: 'show' },
      sectionPublishability: { faq: true },
      hasFaqData: true,
      hasGettingStartedData: true,
      hasSpecsData: true,
      hasCommunityData: true,
      hasPlatformData: true,
      hasSecurityData: true,
      hasPortabilityData: true,
    });

    expect(result.allowedSections.faq).toBe(false);
    expect(result.sectionOmissionReasons.faq).toBe('omitted_due_to_missing_checked_date');
  });

  it('omits specs when section status is not show', () => {
    const contract = createToolPageEvidenceContract({
      confidenceByField: {
        evidence: 'high',
      },
      lastCheckedByField: {
        evidence: new Date().toISOString(),
      },
    });

    const result = computeToolPageSectionContract({
      evidenceContract: contract,
      sectionStatus: { specs: 'procedural', community: 'show' },
      sectionPublishability: { faq: true },
      hasFaqData: true,
      hasGettingStartedData: true,
      hasSpecsData: true,
      hasCommunityData: true,
      hasPlatformData: true,
      hasSecurityData: true,
      hasPortabilityData: true,
    });

    expect(result.allowedSections.specs).toBe(false);
    expect(result.sectionOmissionReasons.specs).toBe('omitted_due_to_contract_disabled');
  });

  it('suppresses optional sections when evidence confidence is low', () => {
    const contract = createToolPageEvidenceContract({
      confidenceByField: {
        evidence: 'low',
      },
      lastCheckedByField: {
        evidence: new Date().toISOString(),
      },
    });

    const result = computeToolPageSectionContract({
      evidenceContract: contract,
      sectionStatus: { specs: 'show', community: 'show' },
      sectionPublishability: { faq: true },
      hasFaqData: true,
      hasGettingStartedData: true,
      hasSpecsData: true,
      hasCommunityData: true,
      hasPlatformData: true,
      hasSecurityData: true,
      hasPortabilityData: true,
    });

    expect(result.allowedSections.faq).toBe(false);
    expect(result.allowedSections.getting_started).toBe(false);
    expect(result.allowedSections.platform).toBe(false);
    expect(result.allowedSections.security).toBe(false);
    expect(result.allowedSections.portability).toBe(false);
    expect(result.sectionOmissionReasons.faq).toBe('omitted_due_to_low_confidence');
  });
});
