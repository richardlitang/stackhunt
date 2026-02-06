import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, SourcePolicyRegistry } from '@/types/database';

export type SourcePolicyGate = Pick<
  SourcePolicyRegistry,
  | 'acquisition_mode'
  | 'llm_ingestion_allowed'
  | 'display_mode'
  | 'policy_version'
  | 'max_chars_ingested'
>;

type PolicyCacheEntry = SourcePolicyRegistry;

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

export class SourcePolicyService {
  private supabase: SupabaseClient<Database>;
  private cache: Map<string, PolicyCacheEntry> = new Map();
  private lastLoadedAt = 0;
  private cacheTtlMs: number;

  constructor(supabase: SupabaseClient<Database>, cacheTtlMs = DEFAULT_CACHE_TTL_MS) {
    this.supabase = supabase;
    this.cacheTtlMs = cacheTtlMs;
  }

  async getPolicyForUrl(url: string): Promise<SourcePolicyRegistry | null> {
    const domain = extractDomain(url);
    if (!domain) return null;

    const policies = await this.loadPolicies();
    if (!policies) return null;

    const base = this.cache.get(domain) || null;
    if (!base) return null;

    return applyPathOverrides(base, url);
  }

  async recordUnknownDomain(
    domain: string,
    sampleUrl?: string,
    sampleTitle?: string
  ): Promise<void> {
    const cleanedDomain = domain.toLowerCase();
    const { data, error } = await this.supabase
      .from('source_policy_review_queue')
      .select('count_seen, sample_urls, sample_titles')
      .eq('domain', cleanedDomain)
      .maybeSingle();

    if (error) return;

    const nextCount = (data?.count_seen || 0) + 1;
    const nextUrls = mergeSamples(data?.sample_urls, sampleUrl);
    const nextTitles = mergeSamples(data?.sample_titles, sampleTitle);

    await this.supabase
      .from('source_policy_review_queue')
      .upsert(
        {
          domain: cleanedDomain,
          count_seen: nextCount,
          last_seen_at: new Date().toISOString(),
          sample_urls: nextUrls,
          sample_titles: nextTitles,
        },
        { onConflict: 'domain' }
      );
  }

  async getPolicyGate(url: string): Promise<SourcePolicyGate | null> {
    const policy = await this.getPolicyForUrl(url);
    if (!policy) return null;
    return {
      acquisition_mode: policy.acquisition_mode,
      llm_ingestion_allowed: policy.llm_ingestion_allowed,
      display_mode: policy.display_mode,
      policy_version: policy.policy_version,
      max_chars_ingested: policy.max_chars_ingested,
    };
  }

  private async loadPolicies(): Promise<Map<string, PolicyCacheEntry> | null> {
    const now = Date.now();
    if (this.cache.size > 0 && now - this.lastLoadedAt < this.cacheTtlMs) {
      return this.cache;
    }

    const { data, error } = await this.supabase
      .from('source_policy_registry')
      .select('*');

    if (error) {
      return null;
    }

    this.cache.clear();
    for (const policy of data || []) {
      this.cache.set(policy.domain.toLowerCase(), policy);
    }
    this.lastLoadedAt = now;
    return this.cache;
  }
}

function extractDomain(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return host;
  } catch {
    return null;
  }
}

function applyPathOverrides(
  policy: SourcePolicyRegistry,
  url: string
): SourcePolicyRegistry {
  if (!policy.path_overrides || policy.path_overrides.length === 0) {
    return policy;
  }

  let pathname = '';
  try {
    pathname = new URL(url).pathname;
  } catch {
    return policy;
  }

  const override = policy.path_overrides.find((entry) =>
    pathname.startsWith(entry.path_prefix)
  );
  if (!override) return policy;

  return {
    ...policy,
    acquisition_mode: override.acquisition_mode || policy.acquisition_mode,
    llm_ingestion_allowed: override.llm_ingestion_allowed || policy.llm_ingestion_allowed,
    notes: override.notes || policy.notes,
  };
}

function mergeSamples(existing: string[] | null | undefined, next?: string): string[] | null {
  if (!next) return existing || null;
  const merged = [...(existing || [])];
  if (!merged.includes(next)) merged.push(next);
  return merged.slice(0, 5);
}
