export const CURRENT_COMPILER_POLICY_VERSION = '2026-02-20.v1' as const;

export type CompilerPolicyVersion = typeof CURRENT_COMPILER_POLICY_VERSION | string;

export function resolveCompilerPolicyVersion(explicit?: string | null): CompilerPolicyVersion {
  const trimmed = typeof explicit === 'string' ? explicit.trim() : '';
  return trimmed.length > 0 ? trimmed : CURRENT_COMPILER_POLICY_VERSION;
}
