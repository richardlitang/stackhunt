import { describe, it, expect } from 'vitest';
import { shouldShowDemoBanner, DEMO_BANNER_KEY } from '@/lib/demo-banner';

describe('shouldShowDemoBanner', () => {
  it('shows when no acknowledgement stored', () => {
    expect(shouldShowDemoBanner(null)).toBe(true);
  });
  it('does not show once acknowledged', () => {
    expect(shouldShowDemoBanner('1')).toBe(false);
  });
  it('uses a stable storage key', () => {
    expect(DEMO_BANNER_KEY).toBe('sh_demo_ack');
  });
});
