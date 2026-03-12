import { describe, expect, it } from 'vitest';
import { preflightSubjectResolution } from '@/lib/hunter/subject-preflight';

describe('hunter subject preflight', () => {
  it('requires explicit scope for ambiguous parent tools', () => {
    const result = preflightSubjectResolution({
      toolName: 'GitHub',
      mode: 'direct_hunt',
    });

    expect(result.ok).toBe(false);
    expect(result.requiresExplicitScope).toBe(true);
    expect(result.recommendedScopes).toContain('copilot');
  });

  it('accepts explicit scope for ambiguous parent tools', () => {
    const result = preflightSubjectResolution({
      toolName: 'GitHub',
      entityScope: 'copilot',
      mode: 'direct_hunt',
    });

    expect(result.ok).toBe(true);
    expect(result.resolvedScope).toBe('copilot');
  });

  it('infers scope from tool naming tokens', () => {
    const result = preflightSubjectResolution({
      toolName: 'GitHub Copilot',
      mode: 'queue_add',
    });

    expect(result.ok).toBe(true);
    expect(result.resolvedScope).toBe('copilot');
  });

  it('normalizes ghes alias to enterprise_server scope', () => {
    const result = preflightSubjectResolution({
      toolName: 'GitHub Enterprise Server',
      entityScope: 'ghes',
      mode: 'direct_hunt',
    });

    expect(result.ok).toBe(true);
    expect(result.resolvedScope).toBe('enterprise_server');
  });

  it('defaults non-ambiguous tools to core scope', () => {
    const result = preflightSubjectResolution({
      toolName: 'Notion',
      mode: 'direct_hunt',
    });

    expect(result.ok).toBe(true);
    expect(result.resolvedScope).toBe('core');
  });

  it('fails fast for invalid scope inputs', () => {
    const result = preflightSubjectResolution({
      toolName: 'Notion',
      entityScope: 'invalid_scope',
      mode: 'direct_hunt',
    });

    expect(result.ok).toBe(false);
    expect(result.requiresExplicitScope).toBe(false);
    expect(result.message).toMatch(/Invalid entity scope/i);
  });
});
