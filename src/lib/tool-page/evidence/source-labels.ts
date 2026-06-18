export function formatToolPageVerifiedDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function clampToolPageSourceContext(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'this claim';
  return normalized.length > 90 ? `${normalized.slice(0, 87)}...` : normalized;
}

export function buildToolPageSourceAriaLabel(context: string): string {
  return `Open source evidence for ${clampToolPageSourceContext(context)}`;
}
