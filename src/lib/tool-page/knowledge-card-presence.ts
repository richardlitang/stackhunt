const hasListEntries = (value: unknown): boolean => Array.isArray(value) && value.length > 0;

const hasValue = (value: unknown): boolean => value !== null && value !== undefined;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

function hasMeaningfulValue(value: unknown, includeFalseBoolean = true): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return value || includeFalseBoolean;
  if (Array.isArray(value)) {
    return value.some((entry) => hasMeaningfulValue(entry, includeFalseBoolean));
  }
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((entry) =>
      hasMeaningfulValue(entry, includeFalseBoolean)
    );
  }
  return false;
}

export function hasMeaningfulObjectData(value: unknown, includeFalseBoolean = true): boolean {
  const record = asRecord(value);
  if (!record) return false;
  return Object.values(record).some((entry) => hasMeaningfulValue(entry, includeFalseBoolean));
}

export function hasIntegrationsData(knowledgeCard: unknown): boolean {
  const card = asRecord(knowledgeCard);
  return hasMeaningfulObjectData(card?.integrations, false);
}

export function hasCompanyInfoData(
  knowledgeCard: unknown,
  learningCurve: string | null | undefined
): boolean {
  const card = asRecord(knowledgeCard);
  const company = asRecord(card?.company);
  const audience = asRecord(card?.audience);
  return Boolean(
    hasValue(company?.founded_year) ||
    (typeof company?.headquarters === 'string' && company.headquarters.trim().length > 0) ||
    (typeof audience?.team_size === 'string' && audience.team_size.trim().length > 0) ||
    (typeof learningCurve === 'string' && learningCurve.trim().length > 0)
  );
}

export function hasSupportData(knowledgeCard: unknown): boolean {
  const card = asRecord(knowledgeCard);
  const support = asRecord(card?.support);
  return Boolean(
    support &&
    (support.has_documentation === true ||
      support.has_community === true ||
      support.has_live_chat === true ||
      support.has_phone_support === true ||
      support.has_dedicated_support === true)
  );
}

export function hasSecurityData(knowledgeCard: unknown): boolean {
  const card = asRecord(knowledgeCard);
  const security = asRecord(card?.security);
  return Boolean(
    security &&
    (hasValue(security.soc2_certified) ||
      hasValue(security.gdpr_compliant) ||
      hasValue(security.hipaa_compliant) ||
      hasValue(security.sso_available) ||
      hasValue(security.two_factor) ||
      hasValue(security.data_encryption) ||
      security.self_hosted_option === true)
  );
}

export function hasPortabilityData(knowledgeCard: unknown): boolean {
  const card = asRecord(knowledgeCard);
  const portability = asRecord(card?.smp_portability);
  return Boolean(
    portability &&
    (hasValue(portability.migration_difficulty) ||
      hasListEntries(portability.export_formats) ||
      portability.has_api_export ||
      hasValue(portability.min_commitment_months) ||
      hasValue(portability.cancellation_notice_days) ||
      hasListEntries(portability.import_from) ||
      hasListEntries(portability.export_to))
  );
}
