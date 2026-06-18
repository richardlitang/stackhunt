import {
  buildToolPageEvidenceBulletV2,
  toToolPageEvidenceBullet,
  type ToolPageEvidenceBullet,
  type ToolPageEvidenceBulletV2,
} from '@/lib/tool-page/evidence/evidence-bullets';

interface CreateToolPageEvidenceBulletAdaptersInput {
  isEligibleEvidenceUrl: (value: unknown) => boolean;
}

export function createToolPageEvidenceBulletAdapters(
  input: CreateToolPageEvidenceBulletAdaptersInput
): {
  toEvidenceBullet: (claim: unknown) => ToolPageEvidenceBullet | null;
  buildEvidenceBulletV2: (params: {
    text: string;
    kind: ToolPageEvidenceBulletV2['kind'];
    sourceUrl?: string | null;
    sourceLabel?: string;
    retrievedAt?: string;
    requiredSourcing: boolean;
  }) => ToolPageEvidenceBulletV2 | null;
} {
  return {
    toEvidenceBullet: (claim: unknown): ToolPageEvidenceBullet | null =>
      toToolPageEvidenceBullet(claim, input.isEligibleEvidenceUrl),
    buildEvidenceBulletV2: ({
      text,
      kind,
      sourceUrl,
      sourceLabel,
      retrievedAt,
      requiredSourcing,
    }: {
      text: string;
      kind: ToolPageEvidenceBulletV2['kind'];
      sourceUrl?: string | null;
      sourceLabel?: string;
      retrievedAt?: string;
      requiredSourcing: boolean;
    }): ToolPageEvidenceBulletV2 | null =>
      buildToolPageEvidenceBulletV2({
        text,
        kind,
        sourceUrl,
        sourceLabel,
        retrievedAt,
        requiredSourcing,
        isEligibleEvidenceUrl: input.isEligibleEvidenceUrl,
      }),
  };
}
