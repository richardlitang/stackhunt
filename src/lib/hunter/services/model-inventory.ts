import type { RawSource } from '../types';

export interface ModelInventoryConfig {
  apiKeys?: Record<string, string | undefined>;
}

export interface ModelInventoryResult {
  provider: 'openai' | 'anthropic' | null;
  modelOptions: string[];
  snippets: string[];
  sourceUrls: string[];
}

type Provider = 'openai' | 'anthropic';

const REQUEST_TIMEOUT_MS = 8000;

export class ModelInventoryService {
  private apiKeys: Record<string, string | undefined>;

  constructor(config: ModelInventoryConfig) {
    this.apiKeys = config.apiKeys || {};
  }

  async fetchModelInventory(input: {
    toolName: string;
    websiteUrl?: string;
    rawSources?: RawSource[];
  }): Promise<ModelInventoryResult> {
    const provider = detectProvider(input.toolName, input.websiteUrl, input.rawSources || []);
    if (!provider) {
      return { provider: null, modelOptions: [], snippets: [], sourceUrls: [] };
    }

    if (provider === 'openai') {
      const apiModels = await this.fetchOpenAIModels();
      if (apiModels.length > 0) {
        return buildInventoryResult(provider, apiModels, ['https://api.openai.com/v1/models']);
      }
      const docsModels = await this.fetchOpenAIDocsModels();
      return buildInventoryResult(provider, docsModels.models, docsModels.sources);
    }

    const apiModels = await this.fetchAnthropicModels();
    if (apiModels.length > 0) {
      return buildInventoryResult(provider, apiModels, ['https://api.anthropic.com/v1/models']);
    }
    const docsModels = await this.fetchAnthropicDocsModels();
    return buildInventoryResult(provider, docsModels.models, docsModels.sources);
  }

  private async fetchOpenAIModels(): Promise<string[]> {
    const apiKey = this.apiKeys.openai;
    if (!apiKey) return [];
    const response = await fetchWithTimeout('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response?.ok) return [];

    const payload = (await response.json()) as { data?: Array<{ id?: string }> };
    const ids = (payload.data || [])
      .map((model) => model.id || '')
      .filter(Boolean)
      .filter((id) => /^(gpt|o\d|codex|chatgpt)/i.test(id))
      .filter((id) => !/(embedding|tts|transcribe|realtime|moderation|whisper|image|omni-moderation)/i.test(id));

    return normalizeAndRank(ids);
  }

  private async fetchAnthropicModels(): Promise<string[]> {
    const apiKey = this.apiKeys.anthropic;
    if (!apiKey) return [];
    const response = await fetchWithTimeout('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });
    if (!response?.ok) return [];

    const payload = (await response.json()) as { data?: Array<{ id?: string }> };
    const ids = (payload.data || [])
      .map((model) => model.id || '')
      .filter(Boolean)
      .filter((id) => /^claude-/i.test(id));

    return normalizeAndRank(ids);
  }

  private async fetchOpenAIDocsModels(): Promise<{ models: string[]; sources: string[] }> {
    const source = 'https://platform.openai.com/docs/models';
    const html = await this.fetchText(source);
    if (!html) return { models: [], sources: [source] };

    const candidates = extractModelCandidates(html, [
      /\b(gpt-[a-z0-9.-]+)\b/gi,
      /\b(o[0-9][a-z0-9.-]*)\b/gi,
      /\b(codex(?:-[a-z0-9.-]+)?)\b/gi,
    ]).filter((id) => !/(embedding|tts|transcribe|moderation|whisper|omni|realtime|image)/i.test(id));

    return { models: normalizeAndRank(candidates), sources: [source] };
  }

  private async fetchAnthropicDocsModels(): Promise<{ models: string[]; sources: string[] }> {
    const sources = [
      'https://platform.claude.com/docs/en/about-claude/models/overview',
      'https://platform.claude.com/docs/en/about-claude/models/choosing-a-model',
      'https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-6',
      'https://platform.claude.com/docs/en/about-claude/models/model-deprecations',
      'https://platform.claude.com/docs/en/about-claude/models/pricing',
    ];

    const contents = await Promise.all(sources.map((url) => this.fetchText(url)));
    const combined = contents.filter(Boolean).join('\n');
    if (!combined) return { models: [], sources };

    const candidates = extractModelCandidates(combined, [
      /\b(claude-[a-z0-9.-]+)\b/gi,
      /\b(Claude\s+(?:Opus|Sonnet|Haiku)\s*[0-9.]+)\b/gi,
    ]);

    return { models: normalizeAndRank(candidates), sources };
  }

  private async fetchText(url: string): Promise<string | null> {
    const response = await fetchWithTimeout(url, {});
    if (!response?.ok) return null;
    try {
      return await response.text();
    } catch {
      return null;
    }
  }
}

function detectProvider(toolName: string, websiteUrl: string | undefined, rawSources: RawSource[]): Provider | null {
  const tokens = [toolName, websiteUrl || '', ...rawSources.slice(0, 25).map((s) => s.domain)].join(' ').toLowerCase();
  if (
    /(openai|chatgpt|platform\.openai\.com|openai\.com|chatgpt\.com)/.test(tokens)
  ) {
    return 'openai';
  }
  if (/(anthropic|claude|claude\.ai|anthropic\.com)/.test(tokens)) {
    return 'anthropic';
  }
  return null;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeAndRank(ids: string[]): string[] {
  const bestByLabel = new Map<string, { id: string; label: string; score: number }>();
  for (const id of ids) {
    const label = prettifyModelId(id);
    const score = scoreModel(id, label);
    const current = bestByLabel.get(label);
    if (!current || score > current.score) {
      bestByLabel.set(label, { id, label, score });
    }
  }

  return Array.from(bestByLabel.values())
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, 8)
    .map((entry) => entry.label);
}

function extractModelCandidates(text: string, patterns: RegExp[]): string[] {
  const out: string[] = [];
  for (const pattern of patterns) {
    const matches = text.match(pattern) || [];
    for (const m of matches) {
      const cleaned = m.replace(/\s+/g, ' ').trim();
      if (cleaned.length < 2 || cleaned.length > 60) continue;
      out.push(cleaned);
    }
  }
  return out;
}

function prettifyModelId(id: string): string {
  const anthropic = prettifyAnthropicModelId(id);
  if (anthropic) return anthropic;

  let label = id
    .replace(/^claude-/, 'Claude ')
    .replace(/^gpt-/, 'GPT-')
    .replace(/^o(\d)/, 'o$1')
    .replace(/^codex-/, 'Codex ')
    .replace(/-/g, ' ')
    .trim();

  label = label
    .replace(/\b(haiku|sonnet|opus|max|mini|nano|instant|thinking|pro|codex)\b/gi, (m) =>
      m.charAt(0).toUpperCase() + m.slice(1).toLowerCase()
    )
    .replace(/\bclaude\b/i, 'Claude')
    .replace(/\bgpt\b/i, 'GPT');

  return label;
}

function prettifyAnthropicModelId(id: string): string | null {
  const source = id.trim();

  let match = source.match(/^claude-(opus|sonnet|haiku)-(\d+)-(\d{8})$/i);
  if (match) {
    const family = capitalizeWord(match[1]);
    const major = match[2];
    return `Claude ${family} ${major}`;
  }

  match = source.match(/^claude-(opus|sonnet|haiku)-(\d+)-(\d{1,2})(?:-(\d{8}))?$/i);
  if (match) {
    const family = capitalizeWord(match[1]);
    const major = match[2];
    const minor = match[3];
    return `Claude ${family} ${major}.${minor}`;
  }

  match = source.match(/^claude-(opus|sonnet|haiku)-(\d+)(?:-(\d{8}))?$/i);
  if (match) {
    const family = capitalizeWord(match[1]);
    const major = match[2];
    return `Claude ${family} ${major}`;
  }

  match = source.match(/^claude-(\d+)-(\d+)-(opus|sonnet|haiku)(?:-(\d{8}))?$/i);
  if (match) {
    const major = match[1];
    const minor = match[2];
    const family = capitalizeWord(match[3]);
    return `Claude ${major}.${minor} ${family}`;
  }

  match = source.match(/^claude-(\d+)-(opus|sonnet|haiku)(?:-(\d{8}))?$/i);
  if (match) {
    const major = match[1];
    const family = capitalizeWord(match[2]);
    return `Claude ${major} ${family}`;
  }

  return null;
}

function capitalizeWord(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function scoreModel(id: string, label?: string): number {
  let score = 0;
  if (/gpt-5|claude-opus-4|claude-sonnet-4|codex/i.test(id)) score += 100;
  if (/gpt-4o|o1|o3|claude-3-7|claude-3-5/i.test(id)) score += 60;
  if (/mini|instant|nano/i.test(id)) score -= 10;
  if (/\b4\.5\b/.test(label || '')) score += 40;
  if (/\b4\.1\b/.test(label || '')) score += 25;
  const dateMatch = id.match(/(\d{4})(\d{2})(\d{2})$/);
  if (dateMatch) {
    const yyyymmdd = Number(dateMatch[0]);
    score += Math.floor(yyyymmdd / 1000); // strong recency bump
  }
  return score;
}

function buildInventoryResult(
  provider: Provider,
  modelOptions: string[],
  sourceUrls: string[]
): ModelInventoryResult {
  if (modelOptions.length === 0) {
    return { provider, modelOptions: [], snippets: [], sourceUrls };
  }

  const snippet = `[${sourceUrls[0] || 'official-source'}] Official model inventory (${provider}): ${modelOptions.join(', ')}`;
  return {
    provider,
    modelOptions,
    snippets: [snippet],
    sourceUrls,
  };
}
