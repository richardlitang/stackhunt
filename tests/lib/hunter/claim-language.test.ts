import { describe, expect, it } from 'vitest';
import {
  detectClaimKind,
  hasComparatorToken,
  isConditional,
  isRenderableClaimText,
  sanitizeRiskyClaimLanguage,
  softenAbsoluteMarketingLanguage,
  sourceTierForClaim,
  stripTerminalPunctuation,
} from '@/lib/hunter/content-policy/claim-language';

describe('claim-language policy (characterization)', () => {
  it('flags conditional phrasing', () => {
    expect(isConditional('Exports work only if you are on the Pro plan')).toBe(true);
    expect(isConditional('Exports work on the Pro plan')).toBe(false);
  });

  it('strips terminal punctuation without touching inner text', () => {
    expect(stripTerminalPunctuation('Fast sync engine.')).toBe('Fast sync engine');
    expect(stripTerminalPunctuation('Fast sync engine')).toBe('Fast sync engine');
  });

  it('detects comparator tokens', () => {
    expect(hasComparatorToken('2x faster than Notion')).toBe(true);
    expect(hasComparatorToken('a fast editor')).toBe(false);
  });

  it('rejects incomplete long claim text', () => {
    expect(isRenderableClaimText('Works well for small teams that')).toBe(false);
    expect(isRenderableClaimText('')).toBe(false);
  });

  it('maps source tiers from url patterns', () => {
    expect(sourceTierForClaim('https://example.com/docs/start')).toBe('A');
    expect(sourceTierForClaim('https://example.com/pricing')).toBe('B');
    expect(sourceTierForClaim('https://example.com/blog/post')).toBe('C');
  });

  it('softens absolute marketing language', () => {
    expect(softenAbsoluteMarketingLanguage('Unlimited exports are guaranteed and never fail')).toBe(
      'expanded exports are designed to and rarely fail'
    );
  });

  it('sanitizes risky claim language', () => {
    expect(sanitizeRiskyClaimLanguage('This verified best tool has no free tier')).toBe(
      'This source-backed best tool has no self-serve free tier is listed'
    );
  });

  it('classifies claim kinds using current heuristics', () => {
    expect(detectClaimKind('2x faster than Notion', 'fact')).toBe('comparison');
    expect(detectClaimKind('Activation rate improved by 12%', 'fact')).toBe('comparison');
    expect(detectClaimKind('Native SSO support', 'fact')).toBe('verbatim_feature');
    expect(detectClaimKind('Feels easier to use', 'opinion')).toBe('inference');
  });
});
