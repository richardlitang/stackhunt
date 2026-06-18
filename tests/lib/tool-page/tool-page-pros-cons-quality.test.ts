import { describe, expect, it } from 'vitest';

import {
  finalizeProsConsClaims,
  isLowSignalProsConsClaim,
  normalizeProsConsClaimKey,
} from '@/lib/tool-page/presentation/pros-cons-quality';

describe('tool-page pros/cons quality', () => {
  it('normalizes punctuation and whitespace for stable keys', () => {
    expect(normalizeProsConsClaimKey(' Free plan capped at 3 seats. ')).toBe(
      'free plan capped at 3 seats'
    );
  });

  it('strips hedging prefixes so user-voice duplicates collapse', () => {
    expect(normalizeProsConsClaimKey('Users report fast setup and reliable workflows.')).toBe(
      'fast setup and reliable workflows'
    );
  });

  it('flags low-signal claims', () => {
    expect(isLowSignalProsConsClaim('Supports core workflows for most teams')).toBe(true);
    expect(isLowSignalProsConsClaim('API access is available for custom integrations')).toBe(false);
  });

  it('drops exact and near-duplicate claims while keeping distinct ones', () => {
    const result = finalizeProsConsClaims([
      { displayText: 'Free plan capped at 3 seats' },
      { displayText: 'Free plan capped at 3 seats.' },
      { displayText: 'Free tier capped at 3 seats for one workspace' },
      { displayText: 'API and webhooks support custom workflow automation' },
    ]);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.displayText).toContain('3 seats');
    expect(result.items[1]?.displayText).toContain('API and webhooks');
    expect(result.droppedDuplicates).toBeGreaterThanOrEqual(2);
  });
});
