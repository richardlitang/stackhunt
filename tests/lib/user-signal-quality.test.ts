import { describe, expect, it } from 'vitest';
import {
  hasUserVoiceEvidence,
  isLowSignalUserClaimText,
  scoreUserVoiceStrength,
} from '@/lib/user-signal-quality';

describe('user signal quality', () => {
  it('detects low-signal generic claims', () => {
    expect(isLowSignalUserClaimText('Supports core workflows for most teams.')).toBe(true);
    expect(isLowSignalUserClaimText('I saw slower sync during high-volume imports.')).toBe(false);
  });

  it('detects user voice language', () => {
    expect(hasUserVoiceEvidence('I had setup friction with permissions.')).toBe(true);
    expect(hasUserVoiceEvidence('Platform includes integrations and automation.')).toBe(false);
  });

  it('scores concrete user voice higher than generic claim text', () => {
    const concrete = scoreUserVoiceStrength(
      'On Reddit, users report onboarding friction and slower reporting for larger teams.'
    );
    const generic = scoreUserVoiceStrength('Supports core workflows for most teams.');
    expect(concrete).toBeGreaterThan(generic);
  });
});
