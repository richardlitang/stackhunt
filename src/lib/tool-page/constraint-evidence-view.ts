import type { ToolPageEvidenceBullet } from '@/lib/tool-page/evidence-bullets';
import type { buildToolPageConstraintEvidence } from '@/lib/tool-page/constraint-evidence';

export function buildToolPageConstraintEvidenceView(
  constraintEvidence: ReturnType<typeof buildToolPageConstraintEvidence>
): {
  hiddenCostBullets: ToolPageEvidenceBullet[];
  hardLimitFromConstraints: ToolPageEvidenceBullet[];
} {
  return {
    hiddenCostBullets: constraintEvidence.hiddenCostBullets as ToolPageEvidenceBullet[],
    hardLimitFromConstraints: constraintEvidence.hardLimitFromConstraints as ToolPageEvidenceBullet[],
  };
}
