export interface ResolveFreshnessLineInput {
  lastCheckedISO: string | null | undefined;
  status?: string | null;
}

export function resolveFreshnessLine(input: ResolveFreshnessLineInput): string | null {
  if (!input.lastCheckedISO?.trim()) return null;

  const date = new Date(input.lastCheckedISO);
  if (!Number.isFinite(date.getTime())) return null;

  const formatted = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
    .format(date)
    .replace(',', '');

  return `Last verified ${formatted}`;
}
