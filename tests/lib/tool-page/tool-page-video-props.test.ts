import { describe, expect, it } from 'vitest';
import { buildToolPageVideoProps } from '@/lib/tool-page/presentation/video-props';

describe('tool page video props', () => {
  it('uses provided title when available', () => {
    expect(buildToolPageVideoProps({ toolName: 'Tool', videoTitle: 'Demo' }).title).toBe('Demo');
  });

  it('falls back to tool overview title', () => {
    expect(buildToolPageVideoProps({ toolName: 'Tool', videoTitle: null }).title).toBe(
      'Tool Overview'
    );
  });
});
