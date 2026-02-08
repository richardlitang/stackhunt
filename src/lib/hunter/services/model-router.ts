/**
 * Gemini Model Router
 *
 * Provides tier-based model routing for Hunter stages with env overrides.
 *
 * @module hunter/services/model-router
 */

export type ModelTier = 'FAST_CHEAP' | 'QUALITY' | 'ESCALATION';

export type HunterModelStage =
  | 'research_extraction'
  | 'analysis_synthesis'
  | 'batch_cache'
  | 'batch_synthesis'
  | 'keyword_parser'
  | 'keyword_classifier'
  | 'tool_discovery'
  | 'defunct_detection';

const DEFAULT_MODELS: Record<ModelTier, string> = {
  FAST_CHEAP: 'gemini-2.5-flash',
  QUALITY: 'gemini-3-flash-preview',
  ESCALATION: 'gemini-2.5-pro',
};

const STAGE_TIERS: Record<HunterModelStage, ModelTier> = {
  research_extraction: 'FAST_CHEAP',
  analysis_synthesis: 'QUALITY',
  batch_cache: 'FAST_CHEAP',
  batch_synthesis: 'FAST_CHEAP',
  keyword_parser: 'FAST_CHEAP',
  keyword_classifier: 'FAST_CHEAP',
  tool_discovery: 'FAST_CHEAP',
  defunct_detection: 'FAST_CHEAP',
};

function getEnv(key: string): string | undefined {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const val = (import.meta.env as Record<string, string>)[key];
    if (val) return val;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

function stageToEnvKey(stage: HunterModelStage): string {
  return stage.toUpperCase();
}

export function getGeminiModelForTier(tier: ModelTier): string {
  return getEnv(`HUNTER_GEMINI_MODEL_${tier}`) || DEFAULT_MODELS[tier];
}

export function getGeminiModelForStage(stage: HunterModelStage): string {
  const stageOverride = getEnv(`HUNTER_GEMINI_MODEL_${stageToEnvKey(stage)}`);
  if (stageOverride) return stageOverride;
  return getGeminiModelForTier(STAGE_TIERS[stage]);
}

export function toCacheModelName(modelName: string): string {
  return modelName.startsWith('models/') ? modelName : `models/${modelName}`;
}
