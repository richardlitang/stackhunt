import type { ReviewLens } from '@/lib/tool-page/presentation/view-model';

interface ToolPageNotableIntegrationLike {
  name: string;
  type?: string | null;
  direction?: string | null;
  works_for_lenses?: Array<'personal' | 'startup' | 'enterprise'> | null;
}

function scoreIntegrationForLens(
  integration: ToolPageNotableIntegrationLike,
  lens: ReviewLens
): number {
  if (lens === 'general') return 0;
  const name = integration.name.toLowerCase();
  const type = (integration.type || '').toLowerCase();
  const direction = (integration.direction || '').toLowerCase();

  if (lens === 'enterprise') {
    let score = 0;
    if (/(okta|azure|azure ad|google workspace|microsoft 365)/.test(name)) score += 6;
    if (/(salesforce|servicenow)/.test(name)) score += 3;
    if (type === 'native' || type === 'api') score += 2;
    if (direction === 'bidirectional') score += 2;
    return score;
  }

  if (lens === 'personal') {
    let score = 0;
    if (/(gmail|google calendar|notion|trello|slack|zapier)/.test(name)) score += 4;
    if (type === 'zapier' || type === 'native') score += 2;
    if (direction === 'import') score += 1;
    return score;
  }

  let score = 0;
  if (/(slack|hubspot|salesforce|stripe|notion|jira|github)/.test(name)) score += 4;
  if (type === 'api' || type === 'native' || type === 'zapier') score += 2;
  if (direction === 'bidirectional' || direction === 'export') score += 1;
  return score;
}

function hasLensTag(
  tags: ToolPageNotableIntegrationLike['works_for_lenses'],
  lens: Exclude<ReviewLens, 'general'>
): boolean {
  return Array.isArray(tags) && tags.includes(lens);
}

export function rankIntegrationsForLens<T extends ToolPageNotableIntegrationLike>(
  notable: T[],
  activeReviewLens: ReviewLens
): T[] {
  if (activeReviewLens === 'general') return notable;
  const lens = activeReviewLens;
  return [...notable]
    .map((integration, index) => ({
      integration,
      index,
      score:
        (hasLensTag(integration.works_for_lenses, lens) ? 100 : 0) +
        scoreIntegrationForLens(integration, lens),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.integration);
}
