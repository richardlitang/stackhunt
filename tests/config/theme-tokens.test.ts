import { describe, it, expect } from 'vitest';
import config from '../../tailwind.config.mjs';

describe('theme tokens', () => {
  it('defines the decision-instrument palette', () => {
    const colors = (config as any).theme.extend.colors;
    expect(colors.ink['950']).toBe('#0B0B0D');
    expect(colors.ink['900']).toBe('#141417');
    expect(colors.ink['800']).toBe('#1C1B1E');
    expect(colors.ink.border).toBe('#26241F');
    expect(colors.paper.DEFAULT).toBe('#EDEAE3');
    expect(colors.paper.muted).toBe('#9A968C');
    expect(colors.signal.DEFAULT).toBe('#E8B14C');
  });

  it('registers display and mono font families', () => {
    const fonts = (config as any).theme.extend.fontFamily;
    expect(fonts.grotesk[0]).toBe('Space Grotesk');
    expect(fonts.mono[0]).toBe('IBM Plex Mono');
  });
});
