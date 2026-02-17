import type { PricingV2Category, PricingV2Meter } from '@/types/database';

type MeterAlias = {
  meter_id: string;
  aliases: string[];
  label: string;
  unit_ucum: string;
  category: PricingV2Category;
};

const METER_ALIAS_REGISTRY: MeterAlias[] = [
  {
    meter_id: 'seat',
    aliases: ['seat', 'seats', 'user', 'users', 'member', 'members', 'agent', 'agents'],
    label: 'Seat',
    unit_ucum: '1',
    category: 'team',
  },
  {
    meter_id: 'contact',
    aliases: ['contact', 'contacts', 'subscriber', 'subscribers', 'lead', 'leads'],
    label: 'Contact',
    unit_ucum: '{contact}',
    category: 'audience',
  },
  {
    meter_id: 'request',
    aliases: ['request', 'requests', 'api_call', 'api calls', 'api request', 'api requests'],
    label: 'Request',
    unit_ucum: '{request}',
    category: 'usage',
  },
  {
    meter_id: 'token',
    aliases: ['token', 'tokens'],
    label: 'Token',
    unit_ucum: '{token}',
    category: 'usage',
  },
  {
    meter_id: 'storage_bytes',
    aliases: ['gb', 'gib', 'storage', 'storage gb', 'bytes', 'by'],
    label: 'Storage',
    unit_ucum: 'By',
    category: 'resource',
  },
  {
    meter_id: 'hour',
    aliases: ['hour', 'hours', 'hr', 'hrs'],
    label: 'Hour',
    unit_ucum: 'h',
    category: 'usage',
  },
  {
    meter_id: 'ad_spend',
    aliases: ['ad_spend', 'ad spend', 'spend', 'media spend'],
    label: 'Ad Spend',
    unit_ucum: '{money}',
    category: 'money',
  },
];

const aliasMap = new Map<string, MeterAlias>();
for (const entry of METER_ALIAS_REGISTRY) {
  for (const alias of entry.aliases) {
    aliasMap.set(alias.toLowerCase(), entry);
  }
}

export function resolvePricingMeter(input: string | null | undefined): PricingV2Meter | null {
  if (!input) return null;
  const match = aliasMap.get(input.toLowerCase().trim());
  if (!match) return null;
  return {
    id: match.meter_id,
    label: match.label,
    unit_ucum: match.unit_ucum,
    category: match.category,
  };
}

export function getDefaultPricingMeters(): PricingV2Meter[] {
  return METER_ALIAS_REGISTRY.map((entry) => ({
    id: entry.meter_id,
    label: entry.label,
    unit_ucum: entry.unit_ucum,
    category: entry.category,
  }));
}
