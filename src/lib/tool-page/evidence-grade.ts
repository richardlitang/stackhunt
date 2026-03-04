import type { ToolPageEvidenceGrade } from '@/lib/tool-page/trust';

export interface ToolPageEvidenceLinkLike {
  basis: string;
  domain: string;
}

export interface DeriveToolPageBaseEvidenceGradeInput {
  officialEvidenceLinks: ToolPageEvidenceLinkLike[];
  canonicalHardLimitCount: number;
  evidenceLinkCount: number;
}

export function deriveToolPageBaseEvidenceGrade(
  input: DeriveToolPageBaseEvidenceGradeInput
): ToolPageEvidenceGrade {
  const officialDomains = new Set(input.officialEvidenceLinks.map((entry) => entry.domain));
  const hasOfficialPricingSource = input.officialEvidenceLinks.some(
    (entry) => entry.basis === 'Official pricing pages'
  );
  const hasOfficialDocOrHelpSource = input.officialEvidenceLinks.some((entry) =>
    ['Official docs/help center', 'Official changelogs', 'Official status pages'].includes(entry.basis)
  );
  const hasSourcedCoreClaims = input.canonicalHardLimitCount > 0 || input.evidenceLinkCount >= 3;

  if (
    officialDomains.size >= 2 &&
    hasOfficialPricingSource &&
    hasOfficialDocOrHelpSource &&
    hasSourcedCoreClaims
  ) {
    return 'A';
  }

  if (officialDomains.size >= 1 && (input.canonicalHardLimitCount > 0 || hasOfficialDocOrHelpSource)) {
    return 'B';
  }

  return 'C';
}
