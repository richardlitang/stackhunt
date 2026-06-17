import { slugify } from '../utils';

type ResearchCheckpoint = Record<string, unknown> & {
  scoutResult?: unknown;
  knowledgeCard?: unknown;
};

export function extractResearchCheckpoint(
  phaseCheckpoint: Record<string, unknown> | null | undefined
): ResearchCheckpoint | null {
  const research = phaseCheckpoint?.research;
  if (!research || typeof research !== 'object') {
    return null;
  }

  const checkpoint = research as ResearchCheckpoint;
  if (!checkpoint.scoutResult || !checkpoint.knowledgeCard) {
    return null;
  }

  return checkpoint;
}

export function buildEvalFixtureSlug(toolName: string, contextTitle?: string | null): string {
  return slugify(`${toolName}-${contextTitle || 'general'}`);
}
