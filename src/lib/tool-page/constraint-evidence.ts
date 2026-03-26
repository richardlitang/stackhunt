export interface ToolPageConstraintEvidenceBullet {
  text: string;
  sourceUrl: string;
  works_for_lenses?: Array<'personal' | 'startup' | 'enterprise'>;
}

interface BuildToolPageConstraintEvidenceInput {
  constraints: unknown;
  isEligibleEvidenceUrl: (url: string) => boolean;
  isDisallowedConClaim: (text: string) => boolean;
}

export interface ToolPageConstraintEvidence {
  hiddenCostBullets: ToolPageConstraintEvidenceBullet[];
  hardLimitFromConstraints: ToolPageConstraintEvidenceBullet[];
}

const CONSTRAINT_METRIC_LABELS: Record<string, string> = {
  seat_count: 'Seat limit',
  user_count: 'User limit',
  member_count: 'Member limit',
  project_count: 'Project limit',
  record_count: 'Record limit',
  storage_gb: 'Storage limit',
  api_requests_per_month: 'API request limit',
  api_rate_limit_per_sec: 'API rate limit',
  active_contacts: 'Active contact limit',
  message_credits: 'Message credit limit',
  event_limit: 'Event limit',
  mtu_limit: 'Tracked user limit',
  app_limit: 'App limit',
  channel_limit: 'Channel limit',
  file_size_limit: 'File size limit',
  usage_limit: 'Usage limit',
};

function toTitleWords(value: string): string {
  return value
    .replace(/_/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizePlanLabel(planName: string): string {
  const normalized = planName.trim().replace(/\s+/g, ' ');
  return /plan$/i.test(normalized) ? normalized : `${normalized} plan`;
}

function extractPlanFromValue(value: string): { value: string; plan: string | null } {
  const trimmed = value.trim();
  const suffixMatch = trimmed.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (!suffixMatch) {
    return { value: trimmed, plan: null };
  }
  const extractedValue = suffixMatch[1]?.trim() || '';
  const extractedPlan = suffixMatch[2]?.trim() || '';
  if (!extractedValue || !extractedPlan) {
    return { value: trimmed, plan: null };
  }
  return { value: extractedValue, plan: normalizePlanLabel(extractedPlan) };
}

function buildHardLimitText(entry: Record<string, unknown>): string {
  const metricRaw = typeof entry.metric === 'string' ? entry.metric.trim().toLowerCase() : '';
  const valueRaw =
    typeof entry.value === 'number' || typeof entry.value === 'string'
      ? String(entry.value).trim()
      : '';
  const unitRaw = typeof entry.unit === 'string' ? entry.unit.trim() : '';
  const planRaw = typeof entry.plan_name_match === 'string' ? entry.plan_name_match.trim() : '';
  const extractedPlanFromValue = extractPlanFromValue(valueRaw);
  const planLabel = planRaw
    ? normalizePlanLabel(planRaw)
    : extractedPlanFromValue.plan || '';
  const unitLabel = unitRaw ? unitRaw.replace(/_/g, ' ') : '';
  const metricLabel =
    (metricRaw && CONSTRAINT_METRIC_LABELS[metricRaw]) ||
    (metricRaw ? toTitleWords(metricRaw) : 'Limit');
  const isGenericMetric = metricLabel.toLowerCase() === 'limit';
  const normalizedValueRaw = extractedPlanFromValue.value || valueRaw;
  const valueWithUnit = [normalizedValueRaw, unitLabel].filter(Boolean).join(' ').trim();
  const fallbackValue = valueWithUnit || valueRaw || unitLabel;

  if (isGenericMetric && planLabel && fallbackValue) {
    return `${toTitleWords(planLabel)} limit: ${fallbackValue}`;
  }
  if (isGenericMetric && unitLabel && fallbackValue) {
    return `${toTitleWords(unitLabel)} limit: ${fallbackValue}`;
  }
  if (fallbackValue && planLabel) {
    return `${metricLabel}: ${fallbackValue} on ${planLabel}`;
  }
  if (fallbackValue) {
    return `${metricLabel}: ${fallbackValue}`;
  }
  return planLabel ? `${metricLabel} on ${planLabel}` : metricLabel;
}

export function buildToolPageConstraintEvidence(
  input: BuildToolPageConstraintEvidenceInput
): ToolPageConstraintEvidence {
  const constraints = (input.constraints || {}) as Record<string, unknown>;

  const hiddenCostBullets = Array.isArray(constraints.hidden_costs)
    ? constraints.hidden_costs
        .map((cost) => {
          const entry = cost as Record<string, unknown>;
          const sourceUrl = typeof entry.source_url === 'string' ? entry.source_url.trim() : '';
          if (!input.isEligibleEvidenceUrl(sourceUrl)) return null;
          const name = typeof entry.name === 'string' ? entry.name.trim() : 'Hidden cost';
          const amount = typeof entry.amount === 'string' ? ` (${entry.amount})` : '';
          const whenCharged =
            typeof entry.when_charged === 'string' ? ` — ${entry.when_charged}` : '';
          const worksForLenses = Array.isArray(entry.works_for_lenses)
            ? entry.works_for_lenses.filter(
                (lens): lens is 'personal' | 'startup' | 'enterprise' =>
                  lens === 'personal' || lens === 'startup' || lens === 'enterprise'
              )
            : undefined;
          return {
            text: `${name}${amount}${whenCharged}`,
            sourceUrl,
            ...(worksForLenses && worksForLenses.length > 0
              ? { works_for_lenses: worksForLenses }
              : {}),
          };
        })
        .filter((item): item is ToolPageConstraintEvidenceBullet => Boolean(item))
    : [];

  const hardLimitFromConstraints = Array.isArray(constraints.hard_limits)
    ? constraints.hard_limits
        .map((limit) => {
          const entry = limit as Record<string, unknown>;
          const sourceUrl = typeof entry.source_url === 'string' ? entry.source_url : '';
          if (!input.isEligibleEvidenceUrl(sourceUrl)) return null;
          const text = buildHardLimitText(entry);
          if (!text || text === 'Limit:') return null;
          if (input.isDisallowedConClaim(text)) return null;
          const worksForLenses = Array.isArray(entry.works_for_lenses)
            ? entry.works_for_lenses.filter(
                (lens): lens is 'personal' | 'startup' | 'enterprise' =>
                  lens === 'personal' || lens === 'startup' || lens === 'enterprise'
              )
            : undefined;
          return {
            text,
            sourceUrl,
            ...(worksForLenses && worksForLenses.length > 0
              ? { works_for_lenses: worksForLenses }
              : {}),
          };
        })
        .filter((item): item is ToolPageConstraintEvidenceBullet => Boolean(item))
    : [];

  return {
    hiddenCostBullets,
    hardLimitFromConstraints,
  };
}
