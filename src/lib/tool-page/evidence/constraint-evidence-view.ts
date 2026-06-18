import type { ToolPageEvidenceBullet } from '@/lib/tool-page/evidence/evidence-bullets';
import type { buildToolPageConstraintEvidence } from '@/lib/tool-page/evidence/constraint-evidence';

export function buildToolPageConstraintEvidenceView(
  constraintEvidence: ReturnType<typeof buildToolPageConstraintEvidence>
): {
  hiddenCostBullets: ToolPageEvidenceBullet[];
  hardLimitFromConstraints: ToolPageEvidenceBullet[];
} {
  return {
    hiddenCostBullets: constraintEvidence.hiddenCostBullets as ToolPageEvidenceBullet[],
    hardLimitFromConstraints:
      constraintEvidence.hardLimitFromConstraints as ToolPageEvidenceBullet[],
  };
}
