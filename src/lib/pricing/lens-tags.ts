export type LensTag = 'personal' | 'startup' | 'enterprise';

const PERSONAL_TOKENS =
  /\b(free|personal|individual|solo|freelancer|single[- ]user|hobby|starter)\b/i;
const STARTUP_TOKENS =
  /\b(startup|team|teams|growth|smb|small business|workspace|pipeline|sdr|ae|collaboration)\b/i;
const ENTERPRISE_TOKENS =
  /\b(enterprise|sso|scim|audit|governance|compliance|soc\s?2|hipaa|admin|procurement|contract)\b/i;

const PERSONAL_INTEGRATIONS = /\b(gmail|google calendar|trello|notion|slack|zapier)\b/i;
const ENTERPRISE_INTEGRATIONS =
  /\b(okta|azure ad|microsoft 365|google workspace|servicenow|salesforce)\b/i;

const LENS_ORDER: LensTag[] = ['personal', 'startup', 'enterprise'];

export function normalizeLensTags(tags: unknown): LensTag[] {
  if (!Array.isArray(tags)) return [];
  return Array.from(
    new Set(
      tags.filter(
        (tag): tag is LensTag => tag === 'personal' || tag === 'startup' || tag === 'enterprise'
      )
    )
  ).sort((a, b) => LENS_ORDER.indexOf(a) - LENS_ORDER.indexOf(b));
}

export function deriveLensTagsFromText(text: string): LensTag[] {
  const value = text.trim();
  if (!value) return [];
  const tags: LensTag[] = [];
  if (PERSONAL_TOKENS.test(value)) tags.push('personal');
  if (STARTUP_TOKENS.test(value)) tags.push('startup');
  if (ENTERPRISE_TOKENS.test(value)) tags.push('enterprise');
  return normalizeLensTags(tags);
}

export function mergeLensTags(existing: unknown, inferred: LensTag[]): LensTag[] {
  return normalizeLensTags([...normalizeLensTags(existing), ...inferred]);
}

export function deriveLensTagsForIntegration(input: {
  name?: string | null;
  type?: string | null;
  direction?: string | null;
}): LensTag[] {
  const text = [input.name, input.type, input.direction].filter(Boolean).join(' ').trim();
  if (!text) return [];
  const tags = deriveLensTagsFromText(text);
  if (ENTERPRISE_INTEGRATIONS.test(text)) return mergeLensTags(tags, ['enterprise']);
  if (PERSONAL_INTEGRATIONS.test(text)) return mergeLensTags(tags, ['personal', 'startup']);
  return tags;
}

export function deriveLensTagsForConstraintText(input: {
  description?: string | null;
  type?: string | null;
  planName?: string | null;
  trigger?: string | null;
}): LensTag[] {
  const text = [input.description, input.type, input.planName, input.trigger]
    .filter(Boolean)
    .join(' ')
    .trim();
  return deriveLensTagsFromText(text);
}
