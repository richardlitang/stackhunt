/**
 * Prompt registry: stable version ids + content fingerprints for every
 * LLM prompt that shapes persisted review content.
 *
 * Rule: any edit to a prompt's text MUST bump its version and update its
 * sha256 here. tests/lib/prompt-registry.test.ts enforces the fingerprint;
 * the version id is stamped into reviews.generation_quality.promptVersions
 * so review quality can be correlated with prompt revisions.
 */
import { createHash } from 'node:crypto';
import { buildExtractionPrompt } from './extraction';
import { SYNTHESIS_PROMPT } from '../services/prompts';

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

const EXTRACTION_FINGERPRINT_INPUT = {
  toolName: '__fingerprint__',
  toolSlug: '__fingerprint__',
  contextTitle: '__fingerprint__',
  reviewsSnippets: ['__fingerprint__'],
  pricingSnippets: ['__fingerprint__'],
  alternativesSnippets: ['__fingerprint__'],
  companySnippets: ['__fingerprint__'],
  technicalSnippets: ['__fingerprint__'],
  corporateProfilerSnippets: ['__fingerprint__'],
  pricingDeepContent: '__fingerprint__',
} as Parameters<typeof buildExtractionPrompt>[0];

export const PROMPT_VERSIONS = {
  synthesis: 'synthesis-v1',
  extraction: 'extraction-v1',
} as const;

export const PROMPT_FINGERPRINTS: Record<keyof typeof PROMPT_VERSIONS, string> = {
  synthesis: '2d9de9246ca93794ebac9f86f7c83979ded6c8359b43f8bd71dfebd32d588f04',
  extraction: 'f49b5de326b33f31056379eb812ce12a8494255556bcb272b2216bd59b21d7f8',
};

export function computePromptFingerprints(): Record<keyof typeof PROMPT_VERSIONS, string> {
  return {
    synthesis: sha256(SYNTHESIS_PROMPT),
    extraction: sha256(buildExtractionPrompt(EXTRACTION_FINGERPRINT_INPUT)),
  };
}
