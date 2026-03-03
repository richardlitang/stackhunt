/**
 * Analysis Phase - Synthesize + Embed + Logo
 *
 * Phase 2 of the Hunter pipeline:
 * 1. Synthesize contextual review with Knowledge Graph tags (Pass 2 - The Architect)
 * 2. Generate embedding vector for semantic search
 * 3. Fetch and upload tool logo
 *
 * @module hunter/phases/analysis
 */

import type { HunterContext, HunterDependencies, AnalysisOutput } from '../types';
import {
  buildFactSummary,
  interpolateTemplate,
  classifySourceType,
  buildSnippetBucketsFromScout,
  isLlmEligibleScoutSource,
} from '../utils';
import {
  SYNTHESIS_PROMPT,
  buildCategoryExtractionFields,
  getPersonaContext,
  buildAdaptiveSpecificsPrompt,
} from '../services/prompts';
import { generateDecisionEvidence, generateDecisionIntro } from '@/lib/tool-page-intro';
import { getCategoryDefinition } from '../schemas';
import { guardFaqVolatileFacts } from '../validation/faq-volatile-guard';
import { resolveDetectedCategory } from '../category-resolver';

/**
 * Execute the Analysis Phase
 *
 * Synthesizes a contextual review, generates embeddings, and fetches logos.
 * Skipped if ctx.skipAnalysis is true (duplicate detected).
 *
 * @param ctx - Hunter context with research data
 * @param deps - Injected dependencies
 * @returns Analysis output with review, embedding, and logo
 */
export async function executeAnalysisPhase(
  ctx: HunterContext,
  deps: HunterDependencies
): Promise<AnalysisOutput> {
  if (!ctx.research) {
    throw new Error('[Phase 2] Cannot analyze without research data');
  }

  deps.log(`[Phase 2: Analysis] Starting for: ${ctx.toolName}`);

  const inferFaqSource = (url?: string): 'paa' | 'forum' | 'reddit' | null => {
    if (!url) return null;
    const lower = url.toLowerCase();
    if (lower.includes('reddit.com')) return 'reddit';
    if (lower.includes('forum') || lower.includes('community') || lower.includes('discourse'))
      return 'forum';
    return 'paa';
  };

  // Step 1: Fetch existing categories for Knowledge Graph
  const existingCategories = await getExistingCategories(deps);
  deps.log(
    `Loaded ${existingCategories.functions.length} functions, ${existingCategories.audiences.length} audiences, ${existingCategories.platforms.length} platforms`
  );

  // Step 2: Detect category for smart schema extraction
  const categorySlug = detectToolCategory(ctx, deps);
  if (categorySlug) {
    const categoryDef = getCategoryDefinition(categorySlug);
    deps.log(`[Smart Schema] Using category: ${categoryDef?.name || categorySlug}`);
  } else {
    deps.log('[Smart Schema] No category detected, using base schema');
  }

  // Step 3: Build category-specific prompt additions
  const categoryFields = buildCategoryExtractionFields(categorySlug);
  const personaContext = getPersonaContext(categorySlug);

  // Step 4: Build adaptive tool-specific discovery prompt
  const adaptiveSpecificsPrompt = buildAdaptiveSpecificsPrompt();

  // Step 5: Use in-code synthesis prompt with category + adaptive discovery
  const promptTemplate =
    SYNTHESIS_PROMPT + categoryFields + personaContext + adaptiveSpecificsPrompt;

  // Step 6: Build fact summary from Knowledge Card
  const factSummary = buildFactSummary(ctx.research.knowledgeCard);
  const existingContentBaseline = await buildExistingContentBaseline(ctx, deps);
  const faqCandidates = (ctx.research.scoutResult.faqs || [])
    .map((faq) =>
      [
        `- question: ${faq.question}`,
        `  answer: ${faq.answer}`,
        faq.source_url ? `  question_source_url: ${faq.source_url}` : '  question_source_url: null',
        `  question_source: ${faq.source}`,
      ].join('\n')
    )
    .join('\n');
  const faqSourcePool = (ctx.research.scoutResult.raw_sources || [])
    .slice(0, 20)
    .map((source) =>
      [
        `- url: ${source.url}`,
        `  title: ${source.title}`,
        `  snippet: ${source.snippet}`,
        `  source_type: ${classifySourceType(
          source.url,
          ctx.research?.knowledgeCard?.website_url ?? undefined
        )}`,
      ].join('\n')
    )
    .join('\n');

  const curatedUrls = new Set(
    Object.values(ctx.research.scoutResult.curated_sources || {})
      .flat()
      .map((entry) => entry.url)
  );
  const policyEligibleSources = (ctx.research.scoutResult.raw_sources || []).filter(
    (source) => isLlmEligibleScoutSource(source)
  );
  const synthesisSources = policyEligibleSources.filter((source) => curatedUrls.has(source.url));
  const baselineSources = synthesisSources.length > 0 ? synthesisSources : policyEligibleSources;
  const officialSupplement = policyEligibleSources.filter((source) =>
    ['official', 'docs', 'support', 'legal'].includes(source.source_type)
  );
  const synthesisInputSources = Array.from(
    new Map(
      [...baselineSources, ...officialSupplement].map((source) => [source.url, source])
    ).values()
  );
  const inventoryApiResult = await deps.inventory.fetchModelInventory({
    toolName: ctx.toolName,
    websiteUrl: ctx.research.knowledgeCard.website_url || undefined,
    rawSources: synthesisInputSources,
  });
  const snippetBuckets = buildSnippetBucketsFromScout(synthesisInputSources);
  const inventorySources = synthesisInputSources
    .filter(
      (source) =>
        ['official', 'docs', 'support', 'legal'].includes(source.source_type) &&
        /(\/pricing|\/plans|\/docs|\/reference|\/models|\/changelog|\/release|\/limits|\/deprecat)/i.test(
          source.url
        )
    )
    .slice(0, 12);
  const inventorySourceSnippets = inventorySources.map(
    (source) => `[${source.url}] ${source.title}: ${source.snippet}`
  );
  const inventorySnippets = [...inventorySourceSnippets, ...inventoryApiResult.snippets].join('\n');

  // Step 7: Interpolate prompt variables
  const interpolatedPrompt = interpolateTemplate(promptTemplate, {
    toolName: ctx.toolName,
    contextTitle: ctx.contextTitle || '',
    existingFunctions: existingCategories.functions.join(', ') || 'None yet',
    existingAudiences: existingCategories.audiences.join(', ') || 'None yet',
    existingPlatforms: existingCategories.platforms.join(', ') || 'None yet',
    reviewsSnippets: snippetBuckets.reviewsSnippets.join('\n'),
    pricingSnippets: snippetBuckets.pricingSnippets.join('\n'),
    alternativesSnippets: snippetBuckets.alternativesSnippets.join('\n'),
    budgetAnalystSnippets: snippetBuckets.budgetAnalystSnippets.join('\n'),
    tribalKnowledgeSnippets: snippetBuckets.tribalKnowledgeSnippets.join('\n'),
    tribalDeepContent: '',
    knowledgeCardFacts: factSummary,
    existingContentBaseline: existingContentBaseline || 'None',
    faqCandidates: faqCandidates || 'None',
    faqSourcePool: faqSourcePool || 'None',
    inventorySnippets: inventorySnippets || 'None',
  });
  const promptWithAdminInstructions = ctx.specialInstructions?.trim()
    ? `${interpolatedPrompt}\n\n## Admin Instructions\n${ctx.specialInstructions.trim()}\n\nPrioritize these instructions unless they conflict with source evidence or policy guardrails.`
    : interpolatedPrompt;

  // Step 8: Synthesize analysis (Pass 2 - The Architect + Human Context Roles)
  const { analysis, tokensUsed: synthesisTokens, generationQuality } = await deps.gemini.synthesize(
    {
      toolName: ctx.toolName,
      contextTitle: ctx.contextTitle,
      reviewsSnippets: snippetBuckets.reviewsSnippets,
      pricingSnippets: snippetBuckets.pricingSnippets,
      alternativesSnippets: snippetBuckets.alternativesSnippets,
      budgetAnalystSnippets: snippetBuckets.budgetAnalystSnippets,
      tribalKnowledgeSnippets: snippetBuckets.tribalKnowledgeSnippets,
      tribalDeepContent: undefined,
      knowledgeCardFacts: factSummary,
      existingCategories,
      promptTemplate: promptWithAdminInstructions,
    },
    deps.withRetry
  );
  if (generationQuality.stage1Enabled) {
    deps.log(
      `[Pass 2] Generation quality: mean_confidence=${(generationQuality.meanConfidence ?? 0).toFixed(2)} low_conf_ratio=${(generationQuality.lowConfidenceRatio ?? 0).toFixed(2)} official=${generationQuality.officialClaims ?? 0} non_official=${generationQuality.nonOfficialClaims ?? 0} domains=${generationQuality.distinctDomains ?? 0} actionability=${generationQuality.actionabilityScore ?? 0} reader_utility=${generationQuality.readerUtilityScore ?? 0}`
    );
    if (generationQuality.abstainedFields.length > 0) {
      deps.log(
        `[Pass 2] Auto-abstained fields: ${generationQuality.abstainedFields.join(', ')}`
      );
    }
  }

  sanitizeModelOptions(
    analysis,
    [
      ...inventorySources,
      ...inventoryApiResult.snippets.map((snippet: string, i: number) => ({
        url: inventoryApiResult.sourceUrls[i] || inventoryApiResult.sourceUrls[0] || '',
        title: `Official ${inventoryApiResult.provider || 'inventory'} API models`,
        snippet,
      })),
    ],
    deps.log
  );
  applyAuthoritativeModelInventory(analysis, inventoryApiResult.modelOptions, deps.log);
  applyCanonicalSetupTracks(analysis, ctx.research.knowledgeCard);

  // Attach Knowledge Card to analysis
  analysis.knowledgeCard = ctx.research.knowledgeCard;
  const synthesizedDecisionIntro =
    (analysis.reviewContext?.decisionIntro as Record<string, unknown> | undefined) ||
    (analysis.reviewContext?.decision_intro as Record<string, unknown> | undefined);
  if (!analysis.reviewContext) {
    analysis.reviewContext = {};
  }
  if (!synthesizedDecisionIntro) {
    const proClaims = extractClaimEvidence(analysis.pros);
    const conClaims = extractClaimEvidence(analysis.cons);
    const generatedDecisionIntro = generateDecisionIntro({
      toolName: ctx.toolName,
      shortDescription: analysis.shortDescription,
      pros: Array.isArray(analysis.pros)
        ? analysis.pros
            .map((claim: any) => (typeof claim === 'string' ? claim : claim?.text))
            .filter((text: unknown): text is string => typeof text === 'string' && text.trim().length > 0)
        : [],
      cons: Array.isArray(analysis.cons)
        ? analysis.cons
            .map((claim: any) => (typeof claim === 'string' ? claim : claim?.text))
            .filter((text: unknown): text is string => typeof text === 'string' && text.trim().length > 0)
        : [],
      proClaims,
      conClaims,
    });
    analysis.reviewContext.decisionIntro = generatedDecisionIntro;
    analysis.reviewContext.decision_intro = generatedDecisionIntro;
    deps.log('[Pass 2] Decision intro generated from synthesized claims');
  }
  const synthesizedDecisionEvidence =
    (analysis.reviewContext?.decisionEvidence as Record<string, unknown> | undefined) ||
    (analysis.reviewContext?.decision_evidence as Record<string, unknown> | undefined);
  if (!synthesizedDecisionEvidence) {
    const prosEvidence = Array.isArray(analysis.pros)
      ? analysis.pros
          .map((claim: any) =>
            typeof claim === 'string'
              ? null
              : {
                  text: claim?.text,
                  source_url: claim?.source_url || claim?.source,
                  source_type: claim?.source_type,
                  claim_type: claim?.claim_type,
                }
          )
          .filter(Boolean)
      : [];
    const consEvidence = Array.isArray(analysis.cons)
      ? analysis.cons
          .map((claim: any) =>
            typeof claim === 'string'
              ? null
              : {
                  text: claim?.text,
                  source_url: claim?.source_url || claim?.source,
                  source_type: claim?.source_type,
                  claim_type: claim?.claim_type,
                }
          )
          .filter(Boolean)
      : [];
    const generatedDecisionEvidence = generateDecisionEvidence(prosEvidence, consEvidence);
    analysis.reviewContext.decisionEvidence = generatedDecisionEvidence;
    analysis.reviewContext.decision_evidence = generatedDecisionEvidence;
    deps.log('[Pass 2] Decision evidence generated from sourced claims');
  }
  if (analysis.faqs && analysis.faqs.length > 0) {
    const mappedFaqs = analysis.faqs
      .filter((faq: any) => !!faq.answer_source_url)
      .map((faq: any) => ({
        question: faq.question,
        answer: faq.answer,
        question_source: faq.question_source || inferFaqSource(faq.question_source_url),
        question_source_url: faq.question_source_url,
        answer_source_url: faq.answer_source_url,
        answer_source_type:
          faq.answer_source_type ||
          classifySourceType(
            faq.answer_source_url,
            ctx.research?.knowledgeCard?.website_url ?? undefined
          ),
      }))
      .filter((faq: any) => faq.question_source && faq.answer_source_url);
    const canonicalModels = analysis.canonicalFacts?.latest_models_comparison || [];
    const faqGuard = guardFaqVolatileFacts(mappedFaqs, canonicalModels);
    if (faqGuard.dropped.length > 0) {
      deps.log(`[FAQ Guard] Dropped ${faqGuard.dropped.length} volatile FAQ(s) during analysis`);
    }
    if (faqGuard.conflictsCount > 0) {
      deps.log(`[FAQ Guard] Found ${faqGuard.conflictsCount} canonical model conflict(s)`);
    }
    ctx.research.knowledgeCard.faqs = faqGuard.accepted.filter(
      (
        faq
      ): faq is {
        question: string;
        answer: string;
        question_source: 'paa' | 'forum' | 'reddit';
        question_source_url?: string;
        answer_source_url: string;
        answer_source_type: 'official' | 'editorial' | 'community';
      } => !!faq.question_source && !!faq.answer_source_url && !!faq.answer_source_type
    );
    analysis.canonicalFacts = {
      ...analysis.canonicalFacts,
      quality: {
        ...analysis.canonicalFacts?.quality,
        conflicts_count: faqGuard.conflictsCount,
      },
    };
  }

  deps.log(`[Pass 2] Analysis complete - Score: ${analysis.score}/100`);
  deps.log(
    `Graph tags: functions=[${analysis.graphTags.functions.join(', ')}], audiences=[${analysis.graphTags.audiences.join(', ')}], platforms=[${analysis.graphTags.platforms.join(', ')}]`
  );

  // Step 8.5: Validate analysis output
  const { validateAnalysis, formatValidationReport } =
    await import('../validation/schema-validator.js');
  let analysisValidation = validateAnalysis(analysis);
  deps.log(formatValidationReport(analysisValidation, 'Analysis'));

  const hasNarrativeQualityBlockers = analysisValidation.validations.some((validation) => {
    if (validation.field.startsWith('reviewContext.decisionIntro')) return true;
    if (
      validation.field === 'verdict' &&
      validation.message.toLowerCase().includes('generic')
    ) {
      return true;
    }
    return false;
  });
  if (!analysisValidation.shouldPublish && hasNarrativeQualityBlockers) {
    const repaired = repairNarrativeQuality(analysis, ctx.toolName);
    if (repaired) {
      analysisValidation = validateAnalysis(analysis);
      deps.log('[Pass 2] Applied deterministic narrative regeneration before persistence');
      deps.log(formatValidationReport(analysisValidation, 'Analysis (Post-Repair)'));
    }
  }

  // Store analysis validation metrics
  if (ctx.queueItemId) {
    await deps.supabase.rpc('log_metric', {
      p_metric_type: 'analysis_qa_score',
      p_metric_value: analysisValidation.score,
      p_tags: {
        phase: 'analysis',
        tool_name: ctx.toolName,
        is_valid: analysisValidation.isValid,
        score: analysis.score,
        pros_count: analysis.pros.length,
        cons_count: analysis.cons.length,
      },
    });
  }

  // Step 9: Generate embedding for semantic search
  // Use "Functional Anchor" strategy: embed the SPEC not just the VIBE
  // This prevents "semantic smudge" where Slack ≈ HubSpot due to generic B2B language
  const kc = ctx.research.knowledgeCard;
  const taxonomy = kc.smp_taxonomy;
  const features = kc.features;
  const competitive = kc.competitive;

  const embeddingParts = [
    `Tool: ${ctx.toolName}`,
    // Include suite relationship for better semantic search
    kc.smp_pricing?.bundled_in ? `Part of the ${kc.smp_pricing.bundled_in} suite` : '',
    taxonomy?.primary_function ? `Category: ${taxonomy.primary_function}` : '',
    taxonomy?.secondary_functions?.length ? `Also: ${taxonomy.secondary_functions.join(', ')}` : '',
    taxonomy?.likely_departments?.length
      ? `Department: ${taxonomy.likely_departments.join(', ')}`
      : '',
    features?.core?.length ? `Core Features: ${features.core.slice(0, 5).join(', ')}` : '',
    features?.unique?.length ? `Unique: ${features.unique.slice(0, 3).join(', ')}` : '',
    competitive?.main_alternatives?.length
      ? `Alternatives: ${competitive.main_alternatives.slice(0, 3).join(', ')}`
      : '',
    analysis.graphTags.functions.length
      ? `Functions: ${analysis.graphTags.functions.join(', ')}`
      : '',
    analysis.graphTags.audiences.length
      ? `Audience: ${analysis.graphTags.audiences.join(', ')}`
      : '',
    `Summary: ${analysis.summary.slice(0, 500)}`, // Truncate summary to leave room for anchors
  ]
    .filter(Boolean)
    .join('\n');

  deps.log(`[Embedding] Anchored text: ${embeddingParts.split('\n').slice(0, 4).join(' | ')}...`);

  const embedding = await deps.gemini.generateEmbedding(embeddingParts, deps.withRetry);
  deps.log(`Embedding generated (${embedding.length} dimensions)`);

  // Step 10: Fetch and upload logo
  const logo = await deps.logo.fetchAndUpload(
    ctx.toolName,
    analysis.websiteUrl || ctx.research.knowledgeCard.website_url || undefined,
    deps.log
  );

  if (logo) {
    deps.log(`Logo uploaded: ${logo.url}`);
  } else {
    deps.log('No logo available');
  }

  deps.log(`[Phase 2] Complete - ${synthesisTokens} tokens used`);

  return {
    analysis,
    embedding,
    logo,
    tokensUsed: synthesisTokens,
    generationQuality,
  };
}

const GENERIC_NARRATIVE_PATTERNS = [
  /\bworth shortlisting\b/i,
  /\brobust and powerful solution\b/i,
  /\bbest-in-class capabilities\b/i,
  /\bstrong option(?: based on)?(?: the)? current source-backed evidence\b/i,
  /\bsolid choice for modern teams\b/i,
];

function extractClaimTexts(claims: unknown): string[] {
  if (!Array.isArray(claims)) return [];
  return claims
    .map((claim) => (typeof claim === 'string' ? claim : (claim as any)?.text))
    .filter((text: unknown): text is string => typeof text === 'string' && text.trim().length > 0)
    .map((text) => text.trim());
}

function extractClaimEvidence(claims: unknown): Array<{
  text?: string | null;
  source_url?: string | null;
  source_type?: string | null;
  claim_type?: string | null;
}> {
  if (!Array.isArray(claims)) return [];
  const evidence: Array<{
    text?: string | null;
    source_url?: string | null;
    source_type?: string | null;
    claim_type?: string | null;
  }> = [];
  for (const claim of claims) {
    if (typeof claim === 'string') continue;
    evidence.push({
      text: (claim as any)?.text,
      source_url: (claim as any)?.source_url || (claim as any)?.source,
      source_type: (claim as any)?.source_type,
      claim_type: (claim as any)?.claim_type,
    });
  }
  return evidence;
}

function hasGenericNarrative(text?: string | null): boolean {
  if (!text || text.trim().length === 0) return false;
  return GENERIC_NARRATIVE_PATTERNS.some((pattern) => pattern.test(text));
}

function buildDeterministicVerdict(pros: string[], cons: string[]): string | null {
  const pro = pros[0];
  const con = cons[0];
  if (pro && con) return `Choose when ${pro}. Skip when ${con}.`;
  if (pro) return `Choose when ${pro}.`;
  if (con) return `Skip when ${con}.`;
  return null;
}

function repairNarrativeQuality(
  analysis: {
    shortDescription?: string;
    verdict?: string;
    pros: unknown;
    cons: unknown;
    reviewContext?: Record<string, unknown>;
  },
  toolName: string
): boolean {
  const pros = extractClaimTexts(analysis.pros);
  const cons = extractClaimTexts(analysis.cons);
  const prosEvidence = extractClaimEvidence(analysis.pros);
  const consEvidence = extractClaimEvidence(analysis.cons);
  const generatedDecisionIntro = generateDecisionIntro({
    toolName,
    shortDescription: analysis.shortDescription,
    pros,
    cons,
    proClaims: prosEvidence,
    conClaims: consEvidence,
  });

  if (!analysis.reviewContext || typeof analysis.reviewContext !== 'object') {
    analysis.reviewContext = {};
  }

  const currentDecisionIntro =
    ((analysis.reviewContext.decisionIntro as Record<string, unknown> | undefined) ||
      (analysis.reviewContext.decision_intro as Record<string, unknown> | undefined) ||
      {}) as Record<string, unknown>;
  const decisionFields = ['what_it_is', 'best_for', 'not_for', 'main_tradeoff'] as const;
  let updated = false;
  const repairedDecisionIntro: Record<string, unknown> = { ...currentDecisionIntro };

  for (const field of decisionFields) {
    const currentValue =
      typeof currentDecisionIntro[field] === 'string' ? String(currentDecisionIntro[field]).trim() : '';
    if (currentValue.length < 24 || hasGenericNarrative(currentValue)) {
      repairedDecisionIntro[field] = generatedDecisionIntro[field];
      updated = true;
    }
  }
  repairedDecisionIntro.summary = [
    repairedDecisionIntro.what_it_is,
    repairedDecisionIntro.best_for,
    repairedDecisionIntro.not_for,
    repairedDecisionIntro.main_tradeoff,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .trim();
  analysis.reviewContext.decisionIntro = repairedDecisionIntro;
  analysis.reviewContext.decision_intro = repairedDecisionIntro;
  const generatedDecisionEvidence = generateDecisionEvidence(prosEvidence, consEvidence);
  if (Object.keys(generatedDecisionEvidence).length > 0) {
    analysis.reviewContext.decisionEvidence = generatedDecisionEvidence;
    analysis.reviewContext.decision_evidence = generatedDecisionEvidence;
  }

  const currentVerdict = typeof analysis.verdict === 'string' ? analysis.verdict.trim() : '';
  if (!currentVerdict || hasGenericNarrative(currentVerdict)) {
    const generatedVerdict = buildDeterministicVerdict(pros, cons);
    if (generatedVerdict) {
      analysis.verdict = generatedVerdict;
      updated = true;
    }
  }

  return updated;
}

function sanitizeModelOptions(
  analysis: { categorySpecificData?: Record<string, unknown> },
  inventorySources: Array<{ url: string; title: string; snippet: string }>,
  log: (message: string) => void
): void {
  const categoryData = analysis.categorySpecificData;
  if (!categoryData || !Array.isArray(categoryData.model_options)) return;

  const rawOptions = categoryData.model_options
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
  if (rawOptions.length === 0) {
    categoryData.model_options = null;
    return;
  }

  if (inventorySources.length === 0) {
    log('[Recency] model_options removed: no official inventory sources available');
    categoryData.model_options = null;
    return;
  }

  const corpus = inventorySources
    .map((source) => `${source.url}\n${source.title}\n${source.snippet}`.toLowerCase())
    .join('\n');
  const supported = rawOptions.filter((option) => corpus.includes(option.toLowerCase()));
  const deduped = Array.from(new Set(supported));

  if (deduped.length === 0) {
    log('[Recency] model_options removed: no options were source-backed in official inventory');
    categoryData.model_options = null;
    return;
  }

  if (deduped.length !== rawOptions.length) {
    log(
      `[Recency] model_options pruned: kept ${deduped.length}/${rawOptions.length} source-backed entries`
    );
  }
  categoryData.model_options = deduped;
}

function applyAuthoritativeModelInventory(
  analysis: {
    categorySpecificData?: Record<string, unknown>;
    canonicalFacts?: Record<string, unknown>;
  },
  modelOptions: string[],
  log: (message: string) => void
): void {
  if (modelOptions.length === 0) return;

  const rawInventory = Array.from(
    new Set(modelOptions.map((entry) => entry.trim()).filter((entry) => entry.length > 0))
  );
  const latestComparison = curateLatestModelsComparison(rawInventory);

  analysis.canonicalFacts = {
    ...analysis.canonicalFacts,
    model_inventory_raw: rawInventory,
    latest_models_comparison: latestComparison,
  };

  if (!analysis.categorySpecificData) {
    analysis.categorySpecificData = {};
  }
  analysis.categorySpecificData.model_options = latestComparison;
  log(
    `[Recency] model_options set from authoritative inventory API (${latestComparison.length}/${rawInventory.length} curated models)`
  );
}

function applyCanonicalSetupTracks(
  analysis: {
    canonicalFacts?: {
      setup_tracks?: {
        dev?: Array<{ step: number; action: string; command?: string; description?: string }>;
        non_dev?: Array<{ step: number; action: string; command?: string; description?: string }>;
      };
    };
  },
  knowledgeCard: Record<string, any>
): void {
  const steps = Array.isArray(knowledgeCard?.setup_complexity?.steps)
    ? knowledgeCard.setup_complexity.steps
    : [];
  if (steps.length === 0) return;

  const normalizeStep = (step: any, index: number) => ({
    step: typeof step?.step === 'number' ? step.step : index + 1,
    action: String(step?.action || '').trim(),
    command: typeof step?.command === 'string' ? step.command.trim() : undefined,
    description: typeof step?.description === 'string' ? step.description.trim() : undefined,
  });

  const normalized = steps.map(normalizeStep).filter((step: any) => step.action.length > 0);
  if (normalized.length === 0) return;

  const dev = normalized.filter((step: any) => step.command);
  const nonDev = normalized.filter((step: any) => !step.command);

  analysis.canonicalFacts = {
    ...analysis.canonicalFacts,
    setup_tracks: {
      dev: dev.length > 0 ? dev : undefined,
      non_dev: nonDev.length > 0 ? nonDev : undefined,
    },
  };
}

function curateLatestModelsComparison(rawModels: string[]): string[] {
  if (rawModels.length === 0) return [];

  const familyPattern = /\b(gpt|claude|codex|chatgpt|o[1-9])\b/i;
  const normalized = rawModels
    .map((model) => normalizeComparisonModelName(model))
    .filter((model): model is string => Boolean(model))
    .filter((model) => familyPattern.test(model));

  const deduped = Array.from(new Set(normalized.map((entry) => entry.trim())));
  return deduped.slice(0, 6);
}

function normalizeComparisonModelName(rawModel: string): string | null {
  if (!rawModel || typeof rawModel !== 'string') return null;

  const cleaned = rawModel
    .replace(/\b(19|20)\d{2}[- ]?(0[1-9]|1[0-2])[- ]?(0[1-9]|[12]\d|3[01])\b/g, '')
    .replace(/\b\d{6,8}\b/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;

  const byFamilyFirst = cleaned.match(/^claude\s+(opus|sonnet|haiku)\s+(\d+)(?:[.\s]+(\d+))?$/i);
  if (byFamilyFirst) {
    const family = capitalizeToken(byFamilyFirst[1]);
    const major = byFamilyFirst[2];
    const minor = byFamilyFirst[3];
    return minor ? `Claude ${family} ${major}.${minor}` : `Claude ${family} ${major}`;
  }

  const byVersionFirst = cleaned.match(/^claude\s+(\d+)(?:[.\s]+(\d+))?\s+(opus|sonnet|haiku)$/i);
  if (byVersionFirst) {
    const major = byVersionFirst[1];
    const minor = byVersionFirst[2];
    const family = capitalizeToken(byVersionFirst[3]);
    return minor ? `Claude ${family} ${major}.${minor}` : `Claude ${family} ${major}`;
  }

  return cleaned
    .replace(/\b(gpt)\b/gi, 'GPT')
    .replace(/\b(chatgpt)\b/gi, 'ChatGPT')
    .replace(/\b(codex)\b/gi, 'Codex')
    .replace(/\bo([1-9])\b/g, 'o$1');
}

function capitalizeToken(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/**
 * Fetch existing categories for Knowledge Graph tag recommendations
 */
async function getExistingCategories(deps: HunterDependencies): Promise<{
  functions: string[];
  audiences: string[];
  platforms: string[];
}> {
  const { data } = await deps.supabase.from('categories').select('name, type').order('name');

  const result = {
    functions: [] as string[],
    audiences: [] as string[],
    platforms: [] as string[],
  };

  for (const cat of data || []) {
    if (cat.type === 'function') result.functions.push(cat.name);
    else if (cat.type === 'audience') result.audiences.push(cat.name);
    else if (cat.type === 'platform') result.platforms.push(cat.name);
  }

  return result;
}

// Prompts are stored in code (no DB access required).

async function buildExistingContentBaseline(
  ctx: HunterContext,
  deps: HunterDependencies
): Promise<string> {
  const existingToolId = ctx.research?.existingToolId;
  if (!existingToolId) return 'None';

  const truncate = (value: string, max = 420) =>
    value.length > max ? `${value.slice(0, max - 3)}...` : value;
  const formatList = (items?: string[] | null, maxItems = 6) =>
    items && items.length ? items.slice(0, maxItems).join('; ') : null;

  const { data: item, error: itemError } = await deps.supabase
    .from('items')
    .select('name, short_description, verdict, review_context, pricing_type')
    .eq('id', existingToolId)
    .maybeSingle();

  if (itemError) {
    deps.log(`⚠️ Existing item fetch failed: ${itemError.message}`);
    return 'None';
  }

  const { data: review, error: reviewError } = await deps.supabase
    .from('reviews')
    .select(
      'summary_markdown, pros, cons, sentiment_tags, fit_score, value_rating, standout_features, dealbreakers, switching_from, updated_at'
    )
    .eq('item_id', existingToolId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reviewError) {
    deps.log(`⚠️ Existing review fetch failed: ${reviewError.message}`);
  }

  const lines: string[] = [];
  lines.push(`tool_id: ${existingToolId}`);
  if (item?.name) lines.push(`name: ${item.name}`);
  if (item?.short_description)
    lines.push(`short_description: ${truncate(item.short_description, 320)}`);
  if (item?.verdict) lines.push(`verdict: ${truncate(item.verdict, 320)}`);
  if (item?.pricing_type) lines.push(`pricing_type: ${item.pricing_type}`);

  const reviewContext = item?.review_context as
    | {
        humanVerdict?: string;
        decisionIntro?: {
          what_it_is?: string;
          best_for?: string;
          not_for?: string;
          main_tradeoff?: string;
        };
        decision_intro?: {
          what_it_is?: string;
          best_for?: string;
          not_for?: string;
          main_tradeoff?: string;
        };
        userAdvocate?: {
          vibe?: string;
          idealFor?: string[];
          avoidIf?: string[];
          powerTip?: string;
        };
      }
    | undefined;

  if (reviewContext?.humanVerdict) {
    lines.push(`human_verdict: ${truncate(reviewContext.humanVerdict, 360)}`);
  }
  const decisionIntro =
    reviewContext?.decisionIntro || reviewContext?.decision_intro || undefined;
  if (decisionIntro?.what_it_is) {
    lines.push(`decision_what_it_is: ${truncate(decisionIntro.what_it_is, 240)}`);
  }
  if (decisionIntro?.best_for) {
    lines.push(`decision_best_for: ${truncate(decisionIntro.best_for, 240)}`);
  }
  if (decisionIntro?.not_for) {
    lines.push(`decision_not_for: ${truncate(decisionIntro.not_for, 240)}`);
  }
  if (decisionIntro?.main_tradeoff) {
    lines.push(`decision_main_tradeoff: ${truncate(decisionIntro.main_tradeoff, 240)}`);
  }
  if (reviewContext?.userAdvocate?.vibe) {
    lines.push(`user_vibe: ${reviewContext.userAdvocate.vibe}`);
  }
  if (reviewContext?.userAdvocate?.idealFor?.length) {
    lines.push(`ideal_for: ${formatList(reviewContext.userAdvocate.idealFor)}`);
  }
  if (reviewContext?.userAdvocate?.avoidIf?.length) {
    lines.push(`avoid_if: ${formatList(reviewContext.userAdvocate.avoidIf)}`);
  }
  if (reviewContext?.userAdvocate?.powerTip) {
    lines.push(`power_tip: ${truncate(reviewContext.userAdvocate.powerTip, 240)}`);
  }

  if (review?.summary_markdown) {
    lines.push(`latest_review_summary: ${truncate(review.summary_markdown, 520)}`);
  }
  if (review?.pros?.length) lines.push(`latest_review_pros: ${formatList(review.pros)}`);
  if (review?.cons?.length) lines.push(`latest_review_cons: ${formatList(review.cons)}`);
  if (review?.sentiment_tags?.length)
    lines.push(`sentiment_tags: ${formatList(review.sentiment_tags, 8)}`);
  if (review?.standout_features?.length)
    lines.push(`standout_features: ${formatList(review.standout_features)}`);
  if (review?.dealbreakers?.length) lines.push(`dealbreakers: ${formatList(review.dealbreakers)}`);
  if (review?.switching_from?.length)
    lines.push(`switching_from: ${formatList(review.switching_from)}`);

  if (lines.length === 0) return 'None';
  return lines.join('\n');
}

/**
 * Detect tool category from context or knowledge card.
 *
 * Priority:
 * 1. Explicit categorySlug in context
 * 2. Infer from knowledge card taxonomy
 * 3. Match from context title keywords
 *
 * Exported for use in research phase (batch synthesis grouping)
 */
export function detectToolCategory(
  ctx: HunterContext,
  deps: HunterDependencies
): string | undefined {
  const resolved = resolveDetectedCategory({
    explicitCategorySlug: ctx.categorySlug,
    taxonomyPrimaryFunction: ctx.research?.knowledgeCard?.smp_taxonomy?.primary_function,
    contextTitle: ctx.contextTitle,
  });
  if (resolved && resolved !== ctx.categorySlug) {
    deps.log(`[Smart Schema] Resolved category: ${resolved}`);
  }
  return resolved;
}
