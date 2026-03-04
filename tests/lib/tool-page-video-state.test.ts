import { describe, expect, it } from 'vitest';
import { buildToolPageVideoState } from '@/lib/tool-page/video-state';

describe('tool page video state', () => {
  it('shows video section when video id exists', () => {
    expect(buildToolPageVideoState({ videoId: 'abc123' }).hasVideo).toBe(true);
  });

  it('hides video section when video id is missing', () => {
    expect(buildToolPageVideoState({ videoId: null }).hasVideo).toBe(false);
  });
});
