/**
 * Persistence Phase - Dedup + Save + Graph Links
 *
 * Phase 3 of the Hunter pipeline:
 * 1. Check for similar context (deduplication)
 * 2. Save tool to database with Knowledge Card metadata
 * 3. Create Knowledge Graph links (functions, audiences, platforms)
 * 4. Create or reuse context
 * 5. Create review linking tool to context
 *
 * @module hunter/phases/persistence
 */

import type {
  HunterContext,
  HunterDependencies,
  PersistenceOutput,
  ClaimWithSource,
} from '../types';
import { slugify, classifySourceType } from '../utils';
import { normalizeCategory } from '../../config/taxonomy';
import { ensureParentSuite } from '../utils/suite-manager';
import { updateNormalizedPricing } from '../../pricing/persist';

export interface DatabaseTypes {
  ToolInsert: Record<string, unknown>;
  ContextInsert: Record<string, unknown>;
  ReviewInsert: Record<string, unknown>;
  AffiliateOfferInsert: Record<string, unknown>;
}

/**
 * Infer target_market from pricing plans
 * Logic:
 * - Has business/enterprise plans → 'business'
 * - Only individual/free plans → 'consumer'
 * - Has both individual AND team/business → 'prosumer'
 */
function inferTargetMarket(plans: any[]): 'consumer' | 'prosumer' | 'business' | 'enterprise' {
  if (!plans || plans.length === 0) return 'business'; // Default for tools without pricing

  const audiences = plans.map((p) => p.target_audience).filter(Boolean);

  const hasEnterprise = audiences.includes('enterprise');
  const hasBusiness = audiences.includes('business');
  const hasTeam = audiences.includes('team');
  const hasIndividual = audiences.includes('individual');

  // Enterprise-focused tools
  if (hasEnterprise && !hasIndividual) return 'enterprise';

  // Business-focused tools
  if ((hasBusiness || hasEnterprise) && !hasIndividual) return 'business';

  // Prosumer tools (serve both individuals and businesses)
  if (hasIndividual && (hasTeam || hasBusiness || hasEnterprise)) return 'prosumer';

  // Consumer-only tools
  if (hasIndividual && !hasTeam && !hasBusiness && !hasEnterprise) return 'consumer';

  // Default to business if unclear
  return 'business';
}

const CONDITIONAL_MARKERS = /\b(if|when|unless|only if|as soon as|before|after)\b/i;
const NEGATIVE_CUES =
  /\b(no|not|lacks|lack|doesn't|cannot|can't|won't|avoid|veto|issue|problem|risk|limit|limited|slow|expensive|broken|bug|fails|failure)\b/i;

function isConditional(text: string): boolean {
  return CONDITIONAL_MARKERS.test(text);
}

function containsNegativeCue(text: string): boolean {
  return NEGATIVE_CUES.test(text);
}

function isBackedByClaims(text: string, claims: ClaimWithSource[]): boolean {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4);
  if (words.length === 0) return false;
  return claims.some((claim) => {
    const claimText = claim.text.toLowerCase();
    const matchCount = words.filter((w) => claimText.includes(w)).length;
    return matchCount >= words.length * 0.4;
  });
}

function filterConditionalList(
  items: string[] | undefined,
  label: string,
  deps: HunterDependencies
): string[] {
  if (!items || items.length === 0) return [];
  const filtered = items.filter((item) => isConditional(item));
  const dropped = items.length - filtered.length;
  if (dropped > 0) {
    deps.log(`[Guardrail] Filtered ${dropped} ${label} item(s) without conditional framing`);
  }
  deps.log(`[Guardrail] ${label}: kept ${filtered.length}/${items.length} (conditional framing)`);
  return filtered;
}

function buildDerivedVerdict(
  cons: ClaimWithSource[],
  pros: ClaimWithSource[],
  vetos: Array<{ condition: string; alternative: string }> | null
): string | null {
  if (vetos && vetos.length > 0) {
    const veto = vetos[0];
    return `Switch to ${veto.alternative} if ${veto.condition}.`;
  }
  if (cons.length > 0) {
    return `Veto if ${cons[0].text}.`;
  }
  if (pros.length > 0) {
    return `Best for teams that need ${pros[0].text}.`;
  }
  return null;
}

function buildDerivedSummary(
  cons: ClaimWithSource[],
  pros: ClaimWithSource[],
  vetos: Array<{ condition: string; alternative: string }> | null
): string | null {
  if (cons.length === 0 && pros.length === 0 && (!vetos || vetos.length === 0)) return null;

  const lines: string[] = [];
  if (cons.length > 0) {
    lines.push('**Hard limits**');
    lines.push(`- ${cons[0].text}`);
  }
  if (pros.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('**Best for**');
    lines.push(`- ${pros[0].text}`);
  }
  if (vetos && vetos.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('**Switch away when**');
    lines.push(`- Switch to ${vetos[0].alternative} if ${vetos[0].condition}.`);
  }

  return lines.join('\n');
}

/**
 * Execute the Persistence Phase
 *
 * Saves all data to database with deduplication and graph linking.
 * Skipped if ctx.skipPersistence is true.
 *
 * @param ctx - Hunter context with research and analysis data
 * @param deps - Injected dependencies
 * @returns Persistence output with IDs of created entities
 */
export async function executePersistencePhase(
  ctx: HunterContext,
  deps: HunterDependencies
): Promise<PersistenceOutput> {
  if (!ctx.research) {
    throw new Error('[Phase 3] Cannot persist without research data');
  }

  if (ctx.huntType === 'price_only') {
    return await updatePricingOnly(ctx, deps);
  }

  // Two-stage pipeline: If skipSynthesis is true, store research data only
  if (ctx.skipSynthesis) {
    return await persistResearchOnly(ctx, deps);
  }

  if (!ctx.analysis) {
    throw new Error('[Phase 3] Cannot persist without analysis data');
  }

  deps.log(`[Phase 3: Persistence] Starting for: ${ctx.toolName}`);

  const toolSlug = slugify(ctx.toolName);

  // Step 1: Find category (auto-map from taxonomy or use explicit categorySlug)
  let categoryId: string | null = null;
  const analysis = ctx.analysis.analysis;
  const knowledgeCard = ctx.research.knowledgeCard;

  if (ctx.categorySlug) {
    // Legacy: explicit category slug provided
    const { data: cat } = await deps.supabase
      .from('categories')
      .select('id')
      .eq('slug', ctx.categorySlug)
      .single();
    categoryId = cat?.id || null;
  } else if (knowledgeCard?.smp_taxonomy?.primary_function) {
    // Auto-map from extracted taxonomy
    const primaryFunction = knowledgeCard.smp_taxonomy.primary_function;
    deps.log(`[Category] Auto-mapping from taxonomy: "${primaryFunction}"`);

    // Map primary_function to category slug
    const funcToCategory: Record<string, string> = {
      'Project Management': 'project-management',
      Communication: 'communication',
      Notetaking: 'notetaking',
      'Note-Taking': 'notetaking',
      'Developer Tools': 'developer-tools',
      'Code Editor': 'developer-tools',
      Development: 'developer-tools',
      Design: 'design',
      CRM: 'crm-sales',
      Collaboration: 'collaboration',
      Productivity: 'productivity',
      'AI & Automation': 'ai-automation',
      'AI Code Assistant': 'ai-automation',
      'AI Tools': 'ai-automation',
      'AI Audio Platform': 'ai-automation',
      Analytics: 'seo-analytics',
      SEO: 'seo-analytics',
      'SEO Tools': 'seo-analytics',
      'Email Marketing': 'email-marketing',
      'Social Media': 'social-media',
      'Customer Support': 'customer-support',
      HR: 'hr-recruiting',
      'HR & Payroll': 'hr-recruiting',
      Accounting: 'accounting',
      'Accounting Software': 'accounting',
      Finance: 'accounting',
      'Spend Management': 'accounting',
      'Business Banking': 'payments',
      Payments: 'payments',
      'Video Editing': 'video-editing',
      'Practice Management': 'healthcare',
      'Dental Practice Management': 'healthcare',
      Automation: 'ai-automation',
      'Website Builder': 'no-code',
    };

    const categorySlug = funcToCategory[primaryFunction];
    if (categorySlug) {
      const { data: cat } = await deps.supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .eq('type', 'function')
        .maybeSingle();

      if (cat) {
        categoryId = cat.id;
        deps.log(`[Category] Mapped "${primaryFunction}" → ${categorySlug}`);
      } else {
        deps.log(`[Category] Warning: No category found for slug "${categorySlug}"`);
      }
    } else {
      deps.log(`[Category] Warning: No mapping for "${primaryFunction}"`);
    }
  }

  // Step 2: Upsert Item (with Knowledge Card + V2 fields)

  // Build V2/V3 specs from analysis + Knowledge Card
  const specs: Record<string, unknown> = {
    pricing_model: analysis.pricingType,
    platforms: analysis.graphTags?.platforms || [],
    integrations: knowledgeCard?.integrations || [],
  };

  // V3: Add SMP pricing data if extracted
  if (knowledgeCard?.smp_pricing) {
    specs.pricing_data = knowledgeCard.smp_pricing;
  }

  // V3: Add SMP taxonomy data if extracted (with normalization)
  if (knowledgeCard?.smp_taxonomy) {
    const rawFunction = knowledgeCard.smp_taxonomy.primary_function;
    const canonicalFunction = normalizeCategory(rawFunction);

    specs.taxonomy = {
      ...knowledgeCard.smp_taxonomy,
      primary_function: canonicalFunction,
    };

    // Preserve original label if normalized (for display purposes)
    if (canonicalFunction !== rawFunction) {
      specs.taxonomy.original_function = rawFunction;
      deps.log(`[Taxonomy] Normalized: "${rawFunction}" → "${canonicalFunction}"`);
    }
  }

  // V3: Add SMP portability data if extracted
  if (knowledgeCard?.smp_portability) {
    specs.portability = knowledgeCard.smp_portability;
  }

  // V4: Add constraints if extracted
  if (knowledgeCard?.constraints) {
    const constraints = knowledgeCard.constraints;

    // Resolve plan_name_match to plan_id
    if (constraints.hard_limits && knowledgeCard.smp_pricing?.plans) {
      const plans = knowledgeCard.smp_pricing.plans;
      const { resolvePlanId } = await import('@/lib/pricing/constraints.js');

      constraints.hard_limits = constraints.hard_limits.map((limit) => {
        const planId = resolvePlanId(limit.plan_name_match, plans);

        // Sanitize source_url or fall back to pricing_page_url
        let sourceUrl = limit.source_url;
        if (!sourceUrl || sourceUrl.includes('undefined')) {
          sourceUrl = knowledgeCard.smp_pricing?.pricing_page_url || knowledgeCard.website_url;
        }

        return {
          ...limit,
          plan_id: planId, // Resolved ID
          source_url: sourceUrl,
        };
      });
    }

    specs.constraints = constraints;
    deps.log(
      `[Persisted] Constraints: ${constraints.hard_limits?.length || 0} limits, ${constraints.hidden_costs?.length || 0} hidden costs`
    );
  }

  // V6: Cynical CTO - Add veto logic and reality checks (with source validation)
  const sources = ctx.research.scoutResult.sources;
  let vettedVetos: Array<{
    condition: string;
    alternative: string;
    reason: string;
    source_url: string;
  }> | null = null;

  if (analysis.vetoLogic && analysis.vetoLogic.length > 0) {
    const validatedVetos = analysis.vetoLogic.filter((veto: any) => {
      // Validate negative claims in veto reason
      const validation = validateNegativeClaim(
        {
          text: veto.reason,
          source_url: veto.source_url,
          source_type: 'community',
          claim_type: 'opinion',
        },
        sources
      );

      if (!validation.isValid) {
        const sourcesInfo =
          validation.corroboratingSources && validation.corroboratingSources.length > 0
            ? ` Sources found: ${validation.corroboratingSources.join(', ')}`
            : '';
        deps.log(
          `[Guardrail] Filtered veto: "${veto.reason.substring(0, 50)}..." - ${validation.warning}${sourcesInfo}`
        );
        return false;
      }
      return true;
    });

    if (validatedVetos.length > 0) {
      vettedVetos = validatedVetos;
      specs.vetoLogic = validatedVetos;
      deps.log(
        `[Persisted] Veto Logic: ${validatedVetos.length}/${analysis.vetoLogic.length} conditions (${analysis.vetoLogic.length - validatedVetos.length} filtered)`
      );
    } else {
      deps.log(
        `[Guardrail] All ${analysis.vetoLogic.length} veto conditions filtered due to insufficient corroboration`
      );
    }
  }

  if (analysis.realityChecks && analysis.realityChecks.length > 0) {
    const validatedChecks = analysis.realityChecks.filter((check: any) => {
      // Validate negative claims in reality field
      const validation = validateNegativeClaim(
        {
          text: check.reality,
          source_url: check.source_url,
          source_type: 'community',
          claim_type: 'opinion',
        },
        sources
      );

      if (!validation.isValid) {
        const sourcesInfo =
          validation.corroboratingSources && validation.corroboratingSources.length > 0
            ? ` Sources found: ${validation.corroboratingSources.join(', ')}`
            : '';
        deps.log(
          `[Guardrail] Filtered reality check: "${check.reality.substring(0, 50)}..." - ${validation.warning}${sourcesInfo}`
        );
        return false;
      }
      return true;
    });

    if (validatedChecks.length > 0) {
      specs.realityChecks = validatedChecks;
      deps.log(
        `[Persisted] Reality Checks: ${validatedChecks.length}/${analysis.realityChecks.length} checks (${analysis.realityChecks.length - validatedChecks.length} filtered)`
      );
    } else {
      deps.log(
        `[Guardrail] All ${analysis.realityChecks.length} reality checks filtered due to insufficient corroboration`
      );
    }
  }

  // V4: Smart Schema - Add category-specific extracted data
  if (analysis.categorySpecificData && Object.keys(analysis.categorySpecificData).length > 0) {
    specs.categorySpecificData = analysis.categorySpecificData;
    deps.log(
      `[Smart Schema] Saved ${Object.keys(analysis.categorySpecificData).length} category-specific fields`
    );
  }

  // V4: Tool Hints - Add VIP tool-specific data
  if (analysis.specifics && Object.keys(analysis.specifics).length > 0) {
    specs.specifics = analysis.specifics;
    deps.log(`[Tool Hints] Saved ${Object.keys(analysis.specifics).length} VIP-specific fields`);
  }

  // V4: Add pros/cons to item (not just contextual reviews)
  // This ensures every tool has pros/cons regardless of context
  const sourcesList = ctx.research.scoutResult.sources;
  let normalizedPros: ClaimWithSource[] = [];
  let validCons: ClaimWithSource[] = [];
  let filteredForMissingSource = 0;

  if (analysis.pros?.length || analysis.cons?.length) {
    // Normalize pros with source attribution
    const normalizedProsRaw = (analysis.pros || []).map((claim: string | ClaimWithSource) =>
      normalizeClaim(claim, sourcesList, analysis.websiteUrl)
    );

    // Normalize cons with source attribution and guardrail
    const rawNormalizedCons = (analysis.cons || []).map((claim: string | ClaimWithSource) =>
      normalizeClaim(claim, sourcesList, analysis.websiteUrl)
    );

    const normalizedProsFiltered = normalizedProsRaw.filter(Boolean) as ClaimWithSource[];
    filteredForMissingSource += normalizedProsRaw.length - normalizedProsFiltered.length;
    normalizedPros = normalizedProsFiltered;

    const normalizedConsCandidates = rawNormalizedCons.filter(Boolean) as ClaimWithSource[];
    filteredForMissingSource += rawNormalizedCons.length - normalizedConsCandidates.length;

    // Apply negative sentiment guardrail to cons
    for (const con of normalizedConsCandidates) {
      const validation = validateNegativeClaim(con, sourcesList);
      if (validation.isValid) {
        validCons.push(con);
      } else {
        deps.log(
          `[Item Guardrail] Filtered: "${con.text.substring(0, 40)}..." - insufficient sources`
        );
      }
    }

    specs.pros = normalizedPros;
    specs.cons = validCons;
    deps.log(`[Item Content] Saved ${normalizedPros.length} pros, ${validCons.length} cons`);
    if (filteredForMissingSource > 0) {
      deps.log(
        `[Guardrail] Filtered ${filteredForMissingSource} claim(s) missing a verifiable source URL`
      );
    }
    if (normalizedPros.length === 0) {
      deps.log('[Guardrail] No valid pros after source validation');
    }
    if (validCons.length === 0) {
      deps.log('[Guardrail] No valid cons after source validation');
    }
  }

  if (validCons.length === 0) {
    const derivedCons = buildDerivedConsFromConstraints(
      knowledgeCard,
      analysis.websiteUrl,
      sourcesList
    );
    const vettedDerived = derivedCons.filter(
      (con) => validateNegativeClaim(con, sourcesList).isValid
    );
    if (vettedDerived.length > 0) {
      validCons = vettedDerived;
      if (normalizedPros.length > 0) {
        specs.pros = normalizedPros;
      }
      specs.cons = validCons;
      deps.log(`[Guardrail] Added ${vettedDerived.length} derived cons from constraints/pricing`);
    } else if (derivedCons.length > 0) {
      deps.log('[Guardrail] Derived cons were filtered due to insufficient corroboration');
    }
  }

  // Prefer curated FAQs from analysis if present
  if (analysis.faqs && analysis.faqs.length > 0) {
    const inferFaqSource = (url?: string): 'paa' | 'forum' | 'reddit' | null => {
      if (!url) return null;
      const lower = url.toLowerCase();
      if (lower.includes('reddit.com')) return 'reddit';
      if (lower.includes('forum') || lower.includes('community') || lower.includes('discourse'))
        return 'forum';
      return 'paa';
    };
    knowledgeCard.faqs = analysis.faqs
      .map((faq) => ({
        question: faq.question,
        answer: faq.answer,
        source: faq.source || inferFaqSource(faq.source_url),
        source_url: faq.source_url,
      }))
      .filter((faq) => faq.source);
  }

  // Build V2 metadata (Knowledge Card + extended fields)
  const metadata: Record<string, unknown> = {
    ...knowledgeCard,
    // Space for company info and competitors to be added later
  };

  // Calculate data_confidence from Knowledge Card's data_quality
  // high=0.9, medium=0.7, low=0.5
  const dataConfidenceMap: Record<string, number> = {
    high: 0.9,
    medium: 0.7,
    low: 0.5,
  };
  const dataConfidence = dataConfidenceMap[knowledgeCard?.meta?.data_quality || 'low'] || 0.5;

  // Step 2.5: Handle suite bundling (parent/child relationship)
  let parentId: string | null = null;
  const bundledIn = knowledgeCard?.smp_pricing?.bundled_in;

  if (bundledIn) {
    deps.log(`[Suite] Tool is bundled in: ${bundledIn}`);
    try {
      parentId = await ensureParentSuite(deps.supabase, bundledIn);
      deps.log(`[Suite] Linked to parent suite (ID: ${parentId})`);
    } catch (error) {
      deps.log(`[Suite] Warning: Failed to link to parent suite: ${error}`);
      // Continue without parent link - non-fatal error
    }
  }

  const derivedVerdict = buildDerivedVerdict(validCons, normalizedPros, vettedVetos);
  if (!derivedVerdict) {
    deps.log('[Guardrail] Derived verdict unavailable (insufficient vetted claims)');
  }

  const itemData: Record<string, unknown> = {
    name: ctx.toolName,
    slug: toolSlug,
    website: analysis.websiteUrl || null,
    logo_path: ctx.analysis.logo?.path || null,
    logo_url: ctx.analysis.logo?.url || null,
    short_description: analysis.shortDescription || null,
    category_id: categoryId,
    pricing_type: analysis.pricingType,
    embedding: ctx.analysis.embedding,
    // V2: Enhanced fields
    metadata,
    specs,
    verdict: derivedVerdict || null, // Derived from vetted claims for legal safety
    // Video data from research
    video_id: ctx.research.video?.videoId || null,
    video_title: ctx.research.video?.title || null,
    // Migration 022: New fields
    data_confidence: dataConfidence,
    learning_curve: knowledgeCard?.learning_curve || null,
    // Migration 025: SMP pricing verification
    pricing_verified_at: knowledgeCard?.smp_pricing ? new Date().toISOString() : null,
    pricing_confidence: knowledgeCard?.smp_pricing?.confidence || null,
    // V3.1: Review Context (The "Human Touch" Layer)
    review_context: sanitizeReviewContext(analysis.reviewContext, validCons, deps),
    // V3.2: Parent/Child Relationship (Suite Bundling)
    parent_id: parentId,
    // Infer target_market from pricing plans
    target_market: inferTargetMarket(knowledgeCard?.smp_pricing?.plans || []),
  };

  const { data: item, error: itemError } = await deps.supabase
    .from('items')
    .upsert(itemData, { onConflict: 'slug' })
    .select('id')
    .single();

  if (itemError) throw new Error(`Failed to save item: ${itemError.message}`);

  deps.log(`Item saved: ${ctx.toolName} (id: ${item.id})`);

  // Update normalized pricing columns (for apples-to-apples comparison)
  const pricingResult = await updateNormalizedPricing(deps.supabase, item.id, specs);
  if (pricingResult.success) {
    deps.log(`✓ Normalized pricing computed`);
  } else {
    deps.log(`⚠️  Failed to compute normalized pricing: ${pricingResult.error}`);
  }

  // Log persisted SMP data for QA
  if (specs.pricing_data) {
    const pd = specs.pricing_data as Record<string, unknown>;
    deps.log(
      `[Persisted] SMP Pricing: model=${pd.model}, confidence=${pd.confidence}, plans=${(pd.plans as unknown[])?.length || 0}`
    );
  }
  if (specs.taxonomy) {
    deps.log(`[Persisted] SMP Taxonomy: saved`);
  }
  if (specs.portability) {
    deps.log(`[Persisted] SMP Portability: saved`);
  }
  if (specs.categorySpecificData) {
    const fields = Object.keys(specs.categorySpecificData as Record<string, unknown>);
    deps.log(
      `[Persisted] Category Data: ${fields.slice(0, 5).join(', ')}${fields.length > 5 ? '...' : ''}`
    );
  }
  if (specs.specifics) {
    const fields = Object.keys(specs.specifics as Record<string, unknown>);
    deps.log(`[Persisted] VIP Specifics: ${fields.join(', ')}`);
  }

  // Log persisted Review Context (V3.1: Human Touch Layer)
  if (analysis.reviewContext) {
    const rc = analysis.reviewContext;
    if (rc.humanVerdict) {
      deps.log(`[Persisted] Human Verdict: "${rc.humanVerdict}"`);
    }
    if (rc.budgetAnalyst) {
      const ba = rc.budgetAnalyst;
      deps.log(
        `[Persisted] Budget Analyst: ${ba.costDrivers.length} cost drivers, ${ba.oneTimeFees.length} one-time fees`
      );
    }
    if (rc.userAdvocate) {
      const ua = rc.userAdvocate;
      deps.log(
        `[Persisted] User Advocate: vibe="${ua.vibe || 'none'}", ${ua.idealFor.length} ideal-for, ${ua.avoidIf.length} avoid-if`
      );
      if (ua.powerTip) {
        deps.log(`[Persisted] Power Tip: "${ua.powerTip}"`);
      }
    }
  }

  // Step 3: Create Knowledge Graph links
  await createGraphLinks(item.id, ctx.analysis.analysis.graphTags, deps);

  // Step 4: Create default affiliate offer
  if (analysis.websiteUrl) {
    const offerData: Record<string, unknown> = {
      item_id: item.id,
      url: analysis.websiteUrl,
      cta_text: 'Visit Website',
      is_affiliate: false,
      is_primary: true,
    };

    await deps.supabase.from('affiliate_offers').upsert(offerData, {
      onConflict: 'item_id,is_primary',
      ignoreDuplicates: true,
    });
  }

  // Step 5: If no context, create a general/discovery review
  if (!ctx.contextTitle) {
    deps.log('[Discovery Hunt] Creating general review (no context)');

    // Extract sources from pros/cons
    const allClaims = [...normalizedPros, ...validCons];
    const sources = allClaims
      .filter((claim) => claim.source_url)
      .map((claim) => ({
        url: claim.source_url,
        domain: (() => {
          if (!claim.source_url) return null;
          try {
            return new URL(claim.source_url).hostname.replace(/^www\./, '');
          } catch {
            return null;
          }
        })(),
        type: claim.source_type,
      }));

    // Deduplicate sources
    const uniqueSources = Array.from(new Map(sources.map((s) => [s.url, s])).values());

    // Auto-publish if high quality and robust sources
    const dataQuality = knowledgeCard?.meta?.data_quality || 'medium';
    const shouldAutoPublish = dataQuality === 'high' && uniqueSources.length >= 2;
    const reviewStatus = shouldAutoPublish ? 'published' : 'draft';

    deps.log(
      `[Discovery Review] Quality: ${dataQuality}, Sources: ${uniqueSources.length}, Status: ${reviewStatus}`
    );

    // Create review with null context (discovery review)
    const { data: review, error: reviewError } = await deps.supabase
      .from('reviews')
      .insert({
        item_id: item.id,
        context_id: null, // Discovery review
        score: ctx.analysis.analysis?.score || null,
        pros: normalizedPros,
        cons: validCons,
        sources: uniqueSources,
        quality: dataQuality,
        status: reviewStatus,
      })
      .select('id')
      .single();

    if (reviewError) {
      deps.log(`[Discovery Review] Warning: Failed to create review: ${reviewError.message}`);
    } else {
      deps.log(`[Discovery Review] Created: ${review.id} (${reviewStatus})`);
    }

    await persistArticleInsights({
      deps,
      itemId: item.id,
      contextId: null,
      analysis,
    });

    const suggestedContexts = await suggestContextIdeas(ctx, analysis, deps);
    if (suggestedContexts.length > 0) {
      deps.log(
        `[Discovery Hunt] Suggested ${suggestedContexts.length} context ideas for gatekeeper`
      );
    }

    deps.log('[Phase 3] Complete - Discovery review created');
    return {
      toolId: item.id,
      contextId: null,
      reviewId: review?.id || null,
      wasReused: false,
    };
  }

  // Step 6: Check for similar context (deduplication)
  const similarContext = await findSimilarContext(ctx.contextTitle, deps);
  let contextId: string;
  let wasReused = false;

  if (similarContext) {
    deps.log(`Reusing existing context: "${similarContext.title}"`);
    contextId = similarContext.id;
    wasReused = true;
  } else {
    // Create new context
    contextId = await createNewContext(ctx.contextTitle, ctx.analysis.analysis, categoryId, deps);
    deps.log(`Created new context: ${ctx.contextTitle} (id: ${contextId})`);
  }

  // Step 7: Create Review (links item to context)
  const reviewId = await createReview(
    item.id,
    contextId,
    ctx.analysis.analysis,
    ctx.research.scoutResult.sources,
    ctx.research.knowledgeCard,
    deps
  );

  deps.log(`Review created: ${reviewId}`);
  await persistArticleInsights({
    deps,
    itemId: item.id,
    contextId,
    analysis,
  });
  deps.log(`[Phase 3] Complete`);

  return {
    toolId: item.id, // Keep as toolId for backward compat in return type
    contextId,
    reviewId,
    wasReused,
  };
}

async function persistArticleInsights({
  deps,
  itemId,
  contextId,
  analysis,
}: {
  deps: HunterDependencies;
  itemId: string;
  contextId: string | null;
  analysis: any;
}): Promise<void> {
  if (!analysis) return;

  const insights: Array<Record<string, unknown>> = [];

  if (analysis.verdict) {
    insights.push({
      insight_type: 'verdict',
      insight: analysis.verdict,
    });
  }

  const humanVerdict = analysis.reviewContext?.humanVerdict;
  if (humanVerdict) {
    insights.push({
      insight_type: 'human_verdict',
      insight: humanVerdict,
    });
  }

  if (Array.isArray(analysis.vetoLogic)) {
    for (const veto of analysis.vetoLogic) {
      if (!veto?.condition || !veto?.alternative || !veto?.reason) continue;
      insights.push({
        insight_type: 'veto',
        insight: `Switch to ${veto.alternative} if ${veto.condition}. ${veto.reason}`,
        source_url: veto.source_url || null,
      });
    }
  }

  if (Array.isArray(analysis.realityChecks)) {
    for (const check of analysis.realityChecks) {
      if (!check?.claim || !check?.reality) continue;
      const impact = check.impact ? ` Impact: ${check.impact}` : '';
      insights.push({
        insight_type: 'reality_check',
        insight: `Claim: ${check.claim}. Reality: ${check.reality}.${impact}`,
        source_url: check.source_url || null,
      });
    }
  }

  if (Array.isArray(analysis.dealbreakers)) {
    for (const dealbreaker of analysis.dealbreakers) {
      if (!dealbreaker) continue;
      insights.push({
        insight_type: 'dealbreaker',
        insight: dealbreaker,
      });
    }
  }

  if (Array.isArray(analysis.standoutFeatures)) {
    for (const feature of analysis.standoutFeatures) {
      if (!feature) continue;
      insights.push({
        insight_type: 'standout_feature',
        insight: feature,
      });
    }
  }

  if (insights.length === 0) return;

  const payload = insights.map((insight) => ({
    item_id: itemId,
    context_id: contextId,
    tags: [],
    ...insight,
  }));

  const { error } = await deps.supabase.from('article_insights').insert(payload);
  if (error) {
    deps.log(`[Insights] Warning: Failed to store article insights: ${error.message}`);
  } else {
    deps.log(`[Insights] Stored ${payload.length} article insights`);
  }
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function normalizeContextSlug(contextTitle: string): string {
  let slug = slugify(contextTitle);
  if (slug.startsWith('best-')) {
    slug = slug.replace(/^best-/, '');
  }
  return slug;
}

function buildContextCandidates(analysis: any): string[] {
  const rawNoun =
    typeof analysis?.titleParts?.noun === 'string' ? analysis.titleParts.noun.trim() : '';
  const functionTag = analysis?.graphTags?.functions?.[0];

  let noun = rawNoun;
  if (!noun && typeof functionTag === 'string' && functionTag.trim()) {
    noun = toTitleCase(functionTag.trim());
    if (!/(apps|software|tools|platforms|systems|suites)$/i.test(noun)) {
      noun = `${noun} Tools`;
    }
  }

  if (!noun) return [];

  const contexts = new Set<string>();
  contexts.add(`Best ${noun}`);

  const audiences = Array.isArray(analysis?.graphTags?.audiences)
    ? analysis.graphTags.audiences.filter((aud: string) => typeof aud === 'string' && aud.trim())
    : [];

  for (const audience of audiences.slice(0, 2)) {
    contexts.add(`Best ${noun} for ${toTitleCase(audience.trim())}`);
  }

  return Array.from(contexts).slice(0, 3);
}

async function suggestContextIdeas(
  ctx: HunterContext,
  analysis: any,
  deps: HunterDependencies
): Promise<string[]> {
  const candidates = buildContextCandidates(analysis);
  if (candidates.length === 0) return [];

  const candidateSlugs = candidates.map(normalizeContextSlug);

  const { data: existingContexts } = await deps.supabase
    .from('contexts')
    .select('slug')
    .in('slug', candidateSlugs)
    .limit(candidateSlugs.length);

  const existingContextSlugs = new Set((existingContexts || []).map((c) => c.slug));
  const remainingCandidates = candidates.filter(
    (candidate, index) => !existingContextSlugs.has(candidateSlugs[index])
  );

  if (remainingCandidates.length === 0) return [];

  const { data: ideasByContext } = await deps.supabase
    .from('content_ideas')
    .select('context_query')
    .in('context_query', remainingCandidates)
    .limit(remainingCandidates.length);

  const { data: ideasByKeyword } = await deps.supabase
    .from('content_ideas')
    .select('keyword')
    .in('keyword', remainingCandidates)
    .limit(remainingCandidates.length);

  const existingIdeaSet = new Set<string>([
    ...(ideasByContext || []).map((idea) => idea.context_query).filter(Boolean),
    ...(ideasByKeyword || []).map((idea) => idea.keyword).filter(Boolean),
  ]);

  const insertable = remainingCandidates.filter((candidate) => !existingIdeaSet.has(candidate));
  if (insertable.length === 0) return [];

  const { error: insertError } = await deps.supabase.from('content_ideas').insert(
    insertable.map((candidate) => ({
      keyword: candidate,
      tool_name: ctx.toolName,
      context_query: candidate,
      source: 'suggestion',
      notes: `Auto-suggested from discovery hunt (${ctx.toolName})`,
    }))
  );

  if (insertError) {
    deps.log(`[Discovery Hunt] Warning: Failed to insert context ideas: ${insertError.message}`);
    return [];
  }

  return insertable;
}

async function updatePricingOnly(
  ctx: HunterContext,
  deps: HunterDependencies
): Promise<PersistenceOutput> {
  deps.log(`[Phase 3: Persistence] price_only update for: ${ctx.toolName}`);

  const toolSlug = slugify(ctx.toolName);
  const knowledgeCard = ctx.research!.knowledgeCard;

  const { data: existingBySlug } = await deps.supabase
    .from('items')
    .select('id, specs')
    .eq('slug', toolSlug)
    .maybeSingle();

  let itemId = existingBySlug?.id as string | undefined;
  let specs = (existingBySlug?.specs as Record<string, unknown>) || {};

  if (!itemId) {
    const { data: existingByName } = await deps.supabase
      .from('items')
      .select('id, specs')
      .ilike('name', ctx.toolName)
      .limit(1)
      .maybeSingle();

    itemId = existingByName?.id as string | undefined;
    specs = (existingByName?.specs as Record<string, unknown>) || specs;
  }

  if (!itemId) {
    throw new Error(`[price_only] No existing item found for ${ctx.toolName}`);
  }

  if (knowledgeCard?.smp_pricing) {
    specs = { ...specs, pricing_data: knowledgeCard.smp_pricing };
  }

  let parentId: string | null = null;
  const bundledIn = knowledgeCard?.smp_pricing?.bundled_in;
  if (bundledIn) {
    try {
      parentId = await ensureParentSuite(deps.supabase, bundledIn);
      deps.log(`[Suite] Linked to parent suite (ID: ${parentId})`);
    } catch (error) {
      deps.log(`[Suite] Warning: Failed to link to parent suite: ${error}`);
    }
  }

  const { data: updated, error } = await deps.supabase
    .from('items')
    .update({
      specs,
      pricing_verified_at: knowledgeCard?.smp_pricing ? new Date().toISOString() : null,
      pricing_confidence: knowledgeCard?.smp_pricing?.confidence || null,
      parent_id: parentId,
    })
    .eq('id', itemId)
    .select('id')
    .single();

  if (error) throw new Error(`Failed to update pricing: ${error.message}`);

  deps.log(`[price_only] Pricing updated for item ${updated.id}`);

  return {
    toolId: updated.id,
    contextId: null,
    reviewId: null,
    wasReused: true,
  };
}

/**
 * Persist research data only (two-stage pipeline batch mode)
 *
 * Stores research data in the item's specs and updates queue status to 'research_complete'.
 * Used when skipSynthesis is true - synthesis will happen later in batch.
 */
async function persistResearchOnly(
  ctx: HunterContext,
  deps: HunterDependencies
): Promise<PersistenceOutput> {
  deps.log(`[Phase 3: Persistence] Research-only mode for: ${ctx.toolName}`);

  if (!ctx.research) {
    throw new Error('[Phase 3] Cannot persist without research data');
  }

  const toolSlug = slugify(ctx.toolName);
  const knowledgeCard = ctx.research.knowledgeCard;

  // Build minimal specs to store research data for later batch synthesis
  const specs: Record<string, unknown> = {
    // Store research data for batch synthesis (will be processed later)
    research_data: {
      scoutResult: {
        reviewsSnippets: ctx.research.scoutResult.reviewsSnippets,
        pricingSnippets: ctx.research.scoutResult.pricingSnippets,
        alternativesSnippets: ctx.research.scoutResult.alternativesSnippets,
        budgetAnalystSnippets: ctx.research.scoutResult.budgetAnalystSnippets,
        tribalKnowledgeSnippets: ctx.research.scoutResult.tribalKnowledgeSnippets,
        tribalDeepContent: ctx.research.scoutResult.tribalDeepContent,
        sources: ctx.research.scoutResult.sources,
      },
      knowledgeCard,
    },
    // Store category for reference
    detected_category: ctx.detectedCategory,
  };

  // Add pricing data if extracted
  if (knowledgeCard?.smp_pricing) {
    specs.pricing_data = knowledgeCard.smp_pricing;
  }

  // Add taxonomy data if extracted
  if (knowledgeCard?.smp_taxonomy) {
    const rawFunction = knowledgeCard.smp_taxonomy.primary_function;
    const canonicalFunction = normalizeCategory(rawFunction);
    specs.taxonomy = {
      ...knowledgeCard.smp_taxonomy,
      primary_function: canonicalFunction,
    };
  }

  // Build minimal metadata from Knowledge Card
  const metadata: Record<string, unknown> = {
    ...knowledgeCard,
  };

  // Calculate data_confidence from Knowledge Card's data_quality
  const dataConfidenceMap: Record<string, number> = {
    high: 0.9,
    medium: 0.7,
    low: 0.5,
  };
  const dataConfidence = dataConfidenceMap[knowledgeCard?.meta?.data_quality || 'low'] || 0.5;

  // Create or update item with research data
  const itemData: Record<string, unknown> = {
    name: ctx.toolName,
    slug: toolSlug,
    website: knowledgeCard?.website_url || null,
    short_description: null, // Will be filled in synthesis
    pricing_type: knowledgeCard?.smp_pricing?.model || null,
    metadata,
    specs,
    data_confidence: dataConfidence,
    learning_curve: knowledgeCard?.learning_curve || null,
    pricing_verified_at: knowledgeCard?.smp_pricing ? new Date().toISOString() : null,
    pricing_confidence: knowledgeCard?.smp_pricing?.confidence || null,
  };

  const { data: item, error: itemError } = await deps.supabase
    .from('items')
    .upsert(itemData, { onConflict: 'slug' })
    .select('id')
    .single();

  if (itemError) throw new Error(`Failed to save item: ${itemError.message}`);

  deps.log(`[Research Only] Item saved: ${ctx.toolName} (id: ${item.id})`);
  deps.log(`[Research Only] Research data stored for batch synthesis`);

  // Update queue item status to research_complete
  if (ctx.queueItemId) {
    const { error: queueError } = await deps.supabase
      .from('hunt_queue')
      .update({
        status: 'research_complete',
        detected_category: ctx.detectedCategory || null,
        research_completed_at: new Date().toISOString(),
      })
      .eq('id', ctx.queueItemId);

    if (queueError) {
      deps.log(`[Queue] Warning: Failed to update queue status: ${queueError.message}`);
    } else {
      deps.log(`[Queue] Status → research_complete (category: ${ctx.detectedCategory || 'none'})`);
    }
  }

  deps.log(`[Phase 3] Complete - Research stored, awaiting batch synthesis`);

  return {
    toolId: item.id,
    contextId: null,
    reviewId: null,
    wasReused: false,
  };
}

/**
 * Create Knowledge Graph links for an item
 */
async function createGraphLinks(
  itemId: string,
  graphTags: {
    functions: string[];
    audiences: string[];
    platforms: string[];
  },
  deps: HunterDependencies
): Promise<void> {
  deps.log('Creating Knowledge Graph links...');

  await deps.supabase.rpc('link_item_to_categories', {
    p_item_id: itemId,
    p_functions: graphTags.functions,
    p_audiences: graphTags.audiences,
    p_platforms: graphTags.platforms,
  });

  deps.log(
    `Linked ${graphTags.functions.length} functions, ${graphTags.audiences.length} audiences, ${graphTags.platforms.length} platforms`
  );
}

/**
 * Find similar context using Jaccard similarity
 */
async function findSimilarContext(
  contextTitle: string,
  deps: HunterDependencies,
  threshold = 0.9
): Promise<{ id: string; title: string } | null> {
  deps.log(`Checking for similar contexts: "${contextTitle}"`);

  const { data, error } = await deps.supabase.rpc('find_similar_context', {
    p_context_title: contextTitle,
    p_threshold: threshold,
  });

  if (error) {
    deps.log(`⚠️ Similar context lookup failed: ${error.message}`);
    return null;
  }

  if (data && data.length > 0) {
    const match = data[0];
    deps.log(
      `Found similar context: "${match.title}" (${(match.similarity * 100).toFixed(1)}% match)`
    );
    return { id: match.id, title: match.title };
  }

  return null;
}

/**
 * Create a new context
 */
async function createNewContext(
  contextTitle: string,
  analysis: any,
  categoryId: string | null,
  deps: HunterDependencies
): Promise<string> {
  // Remove "best" prefix from slug since route is already /best/
  let contextSlug = slugify(contextTitle);
  if (contextSlug.startsWith('best-')) {
    contextSlug = contextSlug.replace(/^best-/, '');
  }

  // Get category IDs for context graph relationships
  let functionCategoryId: string | null = null;
  let audienceCategoryId: string | null = null;

  if (analysis.graphTags.functions.length > 0) {
    const { data } = await deps.supabase
      .from('categories')
      .select('id')
      .eq('type', 'function')
      .ilike('name', analysis.graphTags.functions[0])
      .single();
    functionCategoryId = data?.id || null;
  }

  if (analysis.graphTags.audiences.length > 0) {
    const { data } = await deps.supabase
      .from('categories')
      .select('id')
      .eq('type', 'audience')
      .ilike('name', analysis.graphTags.audiences[0])
      .single();
    audienceCategoryId = data?.id || null;
  }

  // Build structured title parts
  const titleParts = analysis.titleParts || {
    noun: contextTitle.replace(/^best\s+/i, '').replace(/\s+for\s+.*$/i, ''),
    modifier: contextTitle.match(/for\s+(.+)$/i)?.[1]
      ? `for ${contextTitle.match(/for\s+(.+)$/i)![1]}`
      : undefined,
  };

  const contextData = {
    title: contextTitle,
    slug: contextSlug,
    category_id: categoryId,
    title_template: 'best' as const,
    title_noun: titleParts.noun,
    title_modifier: titleParts.modifier || null,
    function_category_id: functionCategoryId,
    audience_category_id: audienceCategoryId,
  };

  const { data: context, error: contextError } = await deps.supabase
    .from('contexts')
    .upsert(contextData, { onConflict: 'slug' })
    .select('id')
    .single();

  if (contextError) throw new Error(`Failed to save context: ${contextError.message}`);

  return context.id;
}

/**
 * Normalize a claim to ensure consistent format with source attribution
 *
 * Handles both legacy string claims and new enriched ClaimWithSource objects.
 * For legacy strings, attempts to find a matching source from the research.
 * Always adds a retrieved_at timestamp for time-bound defense.
 */
function normalizeClaim(
  claim: string | ClaimWithSource,
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
    domain: string;
    retrieved_at?: string;
    published_at?: string;
    time_since?: string;
  }>,
  toolWebsite?: string
): ClaimWithSource | null {
  // Current timestamp for time-bound defense
  const retrievedAt = new Date().toISOString();

  // Already enriched - validate and return with timestamp
  if (typeof claim === 'object' && 'text' in claim && 'source_url' in claim) {
    return {
      text: claim.text,
      source_url: claim.source_url,
      source_type: claim.source_type || classifySourceType(claim.source_url, toolWebsite),
      claim_type: claim.claim_type || 'opinion', // Default to opinion for safety
      retrieved_at: claim.retrieved_at || retrievedAt,
    };
  }

  // Legacy string - try to find a relevant source
  const claimText = typeof claim === 'string' ? claim : claim.text;

  // Try to match claim keywords to source snippets
  const claimWords = claimText.toLowerCase().split(/\s+/);
  let bestSource = sources[0]; // Fallback if any source matches
  let bestMatchScore = 0;

  for (const source of sources) {
    const sourceText = `${source.title} ${source.snippet}`.toLowerCase();
    let matchScore = 0;
    for (const word of claimWords) {
      if (word.length > 3 && sourceText.includes(word)) {
        matchScore++;
      }
    }
    if (matchScore > bestMatchScore) {
      bestMatchScore = matchScore;
      bestSource = source;
    }
  }

  if (!bestSource) {
    return null;
  }

  return {
    text: claimText,
    source_url: bestSource.url,
    source_type: classifySourceType(bestSource.url, toolWebsite),
    claim_type: 'opinion', // Assume opinion for legacy claims (safer)
    retrieved_at: retrievedAt,
  };
}

function buildDerivedConsFromConstraints(
  knowledgeCard: any,
  toolWebsite?: string,
  allSources?: Array<{
    url: string;
    title: string;
    snippet: string;
    domain: string;
    retrieved_at?: string;
    published_at?: string;
    time_since?: string;
  }>
): ClaimWithSource[] {
  const derived: ClaimWithSource[] = [];
  const sources = allSources || [];
  const pricingUrl: string | undefined = knowledgeCard?.smp_pricing?.pricing_page_url || undefined;
  const toolHost = (() => {
    if (!toolWebsite) return null;
    try {
      return new URL(toolWebsite).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return null;
    }
  })();

  const fallbackPricingUrl = (() => {
    if (!toolHost || sources.length === 0) return undefined;
    const candidates = sources.filter((source) => {
      const domain = source.domain?.toLowerCase();
      const url = source.url?.toLowerCase() || '';
      const title = source.title?.toLowerCase() || '';
      return domain === toolHost || domain?.endsWith(`.${toolHost}`) || url.includes(toolHost);
    });
    const pricingCandidate = candidates.find((source) => {
      const url = source.url?.toLowerCase() || '';
      const title = source.title?.toLowerCase() || '';
      const snippet = source.snippet?.toLowerCase() || '';
      return (
        url.includes('pricing') ||
        url.includes('plans') ||
        title.includes('pricing') ||
        title.includes('plans') ||
        snippet.includes('pricing') ||
        snippet.includes('plans')
      );
    });
    return pricingCandidate?.url || candidates[0]?.url;
  })();

  const pricingSourceUrl = pricingUrl || fallbackPricingUrl;

  const addDerivedCon = (text: string, sourceUrl?: string) => {
    if (!sourceUrl) return;
    const retrieved_at = sources.find((s) => s.url === sourceUrl)?.retrieved_at;
    derived.push({
      text,
      source_url: sourceUrl,
      source_type: classifySourceType(sourceUrl, toolWebsite),
      claim_type: 'fact',
      retrieved_at,
    });
  };

  const hardLimits = knowledgeCard?.constraints?.hard_limits || [];
  for (const limit of hardLimits) {
    const sourceUrl = limit.source_url || undefined;
    if (!sourceUrl) continue;
    const description = limit.description
      ? `Usage limits apply: ${limit.description}`
      : `Usage limits apply to ${limit.type}: ${limit.value} (${limit.consequence})`;
    addDerivedCon(description, sourceUrl);
  }

  if (pricingSourceUrl) {
    const minSeats = knowledgeCard?.smp_pricing?.min_seats;
    if (typeof minSeats === 'number' && minSeats > 1) {
      addDerivedCon(`Minimum seat requirement: ${minSeats} seats`, pricingSourceUrl);
    }

    const implementationFee = knowledgeCard?.smp_pricing?.implementation_fee;
    if (typeof implementationFee === 'number' && implementationFee > 0) {
      addDerivedCon(`Implementation fee required (${implementationFee})`, pricingSourceUrl);
    }

    const billingCycles = knowledgeCard?.smp_pricing?.billing_cycles || [];
    if (billingCycles.length === 1 && billingCycles[0] === 'annual') {
      addDerivedCon('Annual billing only', pricingSourceUrl);
    }

    if (knowledgeCard?.smp_pricing?.model === 'contact_sales') {
      addDerivedCon('Pricing requires contacting sales', pricingSourceUrl);
    }

    const hasFreeTier = knowledgeCard?.pricing?.has_free_tier;
    if (hasFreeTier === false) {
      addDerivedCon('No free tier', pricingSourceUrl);
    }

    const hasFreeTrial = knowledgeCard?.pricing?.has_free_trial;
    if (hasFreeTrial === false) {
      addDerivedCon('No free trial', pricingSourceUrl);
    }
  }

  return derived.slice(0, 2);
}

/**
 * Negative Sentiment Guardrail
 *
 * For legal protection, negative opinion claims require corroboration from 2+ sources.
 * This prevents single-source defamatory claims from being published.
 *
 * @param claim - The normalized claim
 * @param allSources - All research sources to check for corroboration
 * @returns Object with isValid flag and optional warning
 */
function validateNegativeClaim(
  claim: ClaimWithSource,
  allSources: Array<{
    url: string;
    title: string;
    snippet: string;
    domain: string;
    retrieved_at?: string;
    published_at?: string;
    time_since?: string;
  }>
): {
  isValid: boolean;
  warning?: string;
  corroboratingSourceCount: number;
  corroboratingSources?: string[];
} {
  if (!claim.source_url) {
    return {
      isValid: false,
      warning: 'Missing source URL for negative claim.',
      corroboratingSourceCount: 0,
    };
  }
  // Only apply guardrail to negative opinions from community sources
  // Facts from official sources don't need this check
  if (claim.claim_type === 'fact' && claim.source_type === 'official') {
    return { isValid: true, corroboratingSourceCount: 1 };
  }

  // For opinions (especially from community), count corroborating sources
  const claimWords = claim.text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4);

  let corroboratingCount = 0;
  const matchedDomains = new Set<string>();
  const corroboratingSources: string[] = [];

  for (const source of allSources) {
    const sourceText = `${source.title} ${source.snippet}`.toLowerCase();
    // Count how many significant claim words appear in this source
    const matchingWords = claimWords.filter((w) => sourceText.includes(w));

    // If 40%+ of claim words match, this source corroborates
    if (matchingWords.length >= claimWords.length * 0.4) {
      // Don't count multiple pages from same domain as separate corroboration
      if (!matchedDomains.has(source.domain)) {
        matchedDomains.add(source.domain);
        corroboratingCount++;
        corroboratingSources.push(source.url);
      }
    }
  }

  // Require 2+ independent sources for community-sourced opinions
  if (claim.source_type === 'community' && claim.claim_type === 'opinion') {
    if (corroboratingCount < 2) {
      return {
        isValid: false,
        warning: `Negative opinion only corroborated by ${corroboratingCount} source(s). Requires 2+ for legal protection.`,
        corroboratingSourceCount: corroboratingCount,
        corroboratingSources,
      };
    }
  }

  // Editorial sources get slightly more trust, but still flag single-source opinions
  if (claim.source_type === 'editorial' && claim.claim_type === 'opinion') {
    if (corroboratingCount < 1) {
      return {
        isValid: false,
        warning: `Editorial opinion has no corroborating sources.`,
        corroboratingSourceCount: corroboratingCount,
        corroboratingSources,
      };
    }
  }

  return { isValid: true, corroboratingSourceCount: corroboratingCount, corroboratingSources };
}

function sanitizeReviewContext(
  reviewContext: any,
  validCons: ClaimWithSource[],
  deps: HunterDependencies
): any | null {
  if (!reviewContext) return null;

  const sanitized = { ...reviewContext };

  if (sanitized.humanVerdict) {
    const verdictText = String(sanitized.humanVerdict);
    if (containsNegativeCue(verdictText) && !isBackedByClaims(verdictText, validCons)) {
      deps.log('[Guardrail] Dropped humanVerdict with negative cues lacking corroboration');
      sanitized.humanVerdict = null;
    }
  }

  if (sanitized.userAdvocate) {
    const ua = { ...sanitized.userAdvocate };
    const avoidIfFiltered = filterConditionalList(ua.avoidIf, 'avoidIf', deps);
    const frustrationsFiltered = filterConditionalList(ua.frustrations, 'frustrations', deps);

    const avoidIfBacked = avoidIfFiltered.filter((item) => isBackedByClaims(item, validCons));
    const frustrationsBacked = frustrationsFiltered.filter((item) =>
      isBackedByClaims(item, validCons)
    );

    const avoidIfDropped = avoidIfFiltered.length - avoidIfBacked.length;
    const frustrationsDropped = frustrationsFiltered.length - frustrationsBacked.length;

    if (avoidIfDropped > 0) {
      deps.log(`[Guardrail] Filtered ${avoidIfDropped} avoidIf item(s) without corroborating cons`);
    }
    if (frustrationsDropped > 0) {
      deps.log(
        `[Guardrail] Filtered ${frustrationsDropped} frustrations item(s) without corroborating cons`
      );
    }

    ua.avoidIf = avoidIfBacked;
    ua.frustrations = frustrationsBacked;
    sanitized.userAdvocate = ua;
  }

  return sanitized;
}

/**
 * Create a review linking item to context
 *
 * Includes full source attribution for legal protection:
 * - Normalizes all claims to include source_url, source_type, claim_type
 * - Applies negative sentiment guardrail (2+ sources for negative opinions)
 * - Stores research sources for audit trail
 * - Records generation timestamp
 * - Auto-publishes if high confidence (quality="high", score 70+, minimal filtered claims)
 */
async function createReview(
  itemId: string,
  contextId: string,
  analysis: any,
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
    domain: string;
    retrieved_at?: string;
    published_at?: string;
    time_since?: string;
  }>,
  knowledgeCard: any,
  deps: HunterDependencies
): Promise<string> {
  // Normalize pros and cons with source attribution
  const normalizedProsRaw = analysis.pros.map((claim: string | ClaimWithSource) =>
    normalizeClaim(claim, sources, analysis.websiteUrl)
  );
  const rawNormalizedCons = analysis.cons.map((claim: string | ClaimWithSource) =>
    normalizeClaim(claim, sources, analysis.websiteUrl)
  );

  const normalizedPros = normalizedProsRaw.filter(Boolean) as ClaimWithSource[];
  const normalizedConsCandidates = rawNormalizedCons.filter(Boolean) as ClaimWithSource[];
  const missingSourceCount =
    normalizedProsRaw.length -
    normalizedPros.length +
    (rawNormalizedCons.length - normalizedConsCandidates.length);
  if (missingSourceCount > 0) {
    deps.log(`[Guardrail] Filtered ${missingSourceCount} review claim(s) missing source URLs`);
  }

  // Apply negative sentiment guardrail to cons
  // Filter out cons that don't meet the 2+ source requirement for opinions
  const normalizedCons: ClaimWithSource[] = [];
  const filteredCons: Array<{ claim: ClaimWithSource; reason: string }> = [];

  for (const con of normalizedConsCandidates) {
    const validation = validateNegativeClaim(con, sources);
    if (validation.isValid) {
      normalizedCons.push(con);
    } else {
      filteredCons.push({ claim: con, reason: validation.warning || 'Failed validation' });
      const sourcesInfo =
        validation.corroboratingSources && validation.corroboratingSources.length > 0
          ? ` Sources found: ${validation.corroboratingSources.join(', ')}`
          : '';
      deps.log(
        `[Guardrail] Filtered con: "${con.text.substring(0, 50)}..." - ${validation.warning}${sourcesInfo}`
      );
    }
  }

  // Log if any cons were filtered
  if (filteredCons.length > 0) {
    deps.log(
      `[Guardrail] Filtered ${filteredCons.length} negative claim(s) due to insufficient source corroboration`
    );
  }

  const conditionalDealbreakers = filterConditionalList(
    analysis.dealbreakers || [],
    'dealbreakers',
    deps
  ).filter((item: string) => isBackedByClaims(item, normalizedCons));
  if ((analysis.dealbreakers || []).length > 0) {
    deps.log(
      `[Guardrail] dealbreakers: kept ${conditionalDealbreakers.length}/${analysis.dealbreakers.length} (conditional + corroborated)`
    );
  }

  const vettedVetosForSummary = (analysis.vetoLogic || []).filter((v: any) => {
    if (!v?.source_url) return false;
    const validation = validateNegativeClaim(
      {
        text: v.reason || v.condition,
        source_url: v.source_url,
        source_type: 'community',
        claim_type: 'opinion',
        retrieved_at: new Date().toISOString(),
      },
      sources
    );
    return validation.isValid;
  });

  const derivedSummary = buildDerivedSummary(
    normalizedCons,
    normalizedPros,
    vettedVetosForSummary.length > 0 ? vettedVetosForSummary : null
  );
  if (!derivedSummary) {
    deps.log('[Guardrail] Derived summary unavailable (insufficient vetted claims)');
  }

  const legalIssues: string[] = [];
  if (missingSourceCount > 0) legalIssues.push('claims_missing_sources');
  if (derivedSummary === null) legalIssues.push('summary_unavailable');

  const reviewData: Record<string, unknown> = {
    item_id: itemId, // V2: renamed from tool_id
    context_id: contextId,
    score: analysis.score,
    summary_markdown: derivedSummary,
    pros: normalizedPros,
    cons: normalizedCons,
    sentiment_tags: analysis.sentimentTags,
    // Migration 022: Context-specific review fields
    fit_score: analysis.fitScore || null,
    value_rating: analysis.valueRating || null,
    standout_features: analysis.standoutFeatures || [],
    dealbreakers: conditionalDealbreakers,
    switching_from: analysis.switchingFrom || [],
  };

  // Add sources if provided (for audit trail)
  if (sources && sources.length > 0) {
    reviewData.sources = sources;
  }

  // AUTO-PUBLISH LOGIC: High-confidence reviews go live immediately
  // Criteria:
  // 1. High data quality (verified facts from official sources)
  // 2. Good score (70+)
  // 3. Minimal legal risk (≤1 filtered con, ≥2 valid cons remaining)
  const isHighConfidence =
    knowledgeCard.meta.data_quality === 'high' &&
    analysis.score >= 70 &&
    filteredCons.length <= 1 &&
    normalizedCons.length >= 2 &&
    legalIssues.length === 0;

  if (isHighConfidence && deps.config.isDraftMode !== false) {
    reviewData.status = 'published';
    deps.log(
      `[Auto-publish] High confidence review (quality=${knowledgeCard.meta.data_quality}, score=${analysis.score}, ${filteredCons.length} filtered, ${normalizedCons.length} valid cons)`
    );
  } else if (deps.config.isDraftMode) {
    reviewData.status = 'draft';
    if (!isHighConfidence) {
      deps.log(
        `[Draft] Review needs manual review (quality=${knowledgeCard.meta.data_quality}, score=${analysis.score}, ${filteredCons.length} filtered, ${normalizedCons.length} valid cons)`
      );
      if (legalIssues.length > 0) {
        deps.log(`[Draft] Legal guardrail issues: ${legalIssues.join(', ')}`);
      }
    }
  }

  const { data: review, error: reviewError } = await deps.supabase
    .from('reviews')
    .upsert(reviewData, { onConflict: 'item_id,context_id' })
    .select('id')
    .single();

  if (reviewError) throw new Error(`Failed to save review: ${reviewError.message}`);

  return review.id;
}
