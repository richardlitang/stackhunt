export function toToolPageReviewSources(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> =>
    Boolean(item && typeof item === 'object')
  );
}

export function toToolPageOrderedAlternatives(
  value: unknown
): Array<{ slug: string } & Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is { slug: string } & Record<string, unknown> =>
    Boolean(
      item && typeof item === 'object' && typeof (item as { slug?: unknown }).slug === 'string'
    )
  );
}

export function toToolPageComparableAlternatives(
  value: unknown
): Array<{ slug: string; name: string }> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is { slug: string; name: string } =>
    Boolean(
      item &&
      typeof item === 'object' &&
      typeof (item as { slug?: unknown }).slug === 'string' &&
      typeof (item as { name?: unknown }).name === 'string'
    )
  );
}

export function toToolPageSpecsRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function toToolPageOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

export function toToolPageObjectArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> =>
    Boolean(item && typeof item === 'object')
  );
}

export function toToolPageStringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
