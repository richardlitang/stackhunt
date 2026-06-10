import { describe, expect, it } from 'vitest';
import { PROMPT_FINGERPRINTS, computePromptFingerprints } from '@/lib/hunter/prompts/registry';

describe('prompt registry drift', () => {
  it('every prompt edit bumps its version and fingerprint', () => {
    const actual = computePromptFingerprints();
    for (const [name, expected] of Object.entries(PROMPT_FINGERPRINTS)) {
      expect(
        actual[name as keyof typeof actual],
        `Prompt "${name}" changed. Bump PROMPT_VERSIONS.${name} and update PROMPT_FINGERPRINTS.${name} to ${actual[name as keyof typeof actual]}`
      ).toBe(expected);
    }
  });
});
