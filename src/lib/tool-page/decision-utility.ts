import type { ReviewLens } from '@/lib/tool-page/view-model';
import {
  resolveToolPageProductArchetype,
  type ToolPageProductArchetype,
} from '@/lib/tool-page/product-archetype';

export interface ToolPageDecisionUtilitySetup {
  title: string;
  body: string;
  verificationLabel?: string;
  costTrigger?: {
    text: string;
    evidenceHref?: string;
  };
}

export interface BuildToolPageDecisionUtilityInput {
  toolName: string;
  categorySlug: string | null;
  pricingType?: string | null;
  resolvedSubjectType?: 'product' | 'product_surface' | 'plan_family' | 'deployment_mode' | null;
  resolvedEntityScope?:
    | 'core'
    | 'copilot'
    | 'actions'
    | 'enterprise_cloud'
    | 'enterprise_server'
    | null;
  activeReviewLens: ReviewLens;
  hasApi: boolean;
  hasParentTool: boolean;
  hasEnterpriseSignals: boolean;
  lensBestFitLine: string;
  lensWeakFitLine: string;
  lensTradeoffLine: string;
  hardLimitText: string | null;
  pricingEvidenceSourceUrl?: string | null;
  pricingEvidenceSummary?: string | null;
  lowConfidenceMode?: boolean;
}

export interface ToolPageDecisionUtilityState {
  decisionUseIf: string;
  decisionAvoidIf: string;
  decisionWatchOut: string;
  decisionUpgradeTrigger: string;
  hasDecisionBullets: boolean;
  verdictLeadOverride: string;
  testChecklistTitle: string;
  testChecklistItems: string[];
  pricingMentalModelItems: Array<{
    text: string;
    evidenceHref?: string;
  }>;
  commonSetupsTitle: string;
  commonSetups: ToolPageDecisionUtilitySetup[];
  practicalOutcomesTitle: string;
  practicalOutcomes: Array<{
    outcome: string;
    verifyInDemo: string;
    planDependency: string;
  }>;
  hasEvidenceAnchoredUtility: boolean;
}

function isCrmCategory(categorySlug: string | null): boolean {
  const slug = (categorySlug || '').toLowerCase();
  return slug.includes('crm') || slug.includes('sales');
}

function buildCrmChecklist(lens: ReviewLens): string[] {
  const base = [
    'Import a sample CSV (50 to 200 contacts), then check duplicate detection and merge behavior.',
    'Create one pipeline and one custom field, verify field visibility by role.',
    'Run one real automation path (capture, route, follow-up), confirm trigger timing and ownership.',
    'Validate team permissions against your actual org shape before rollout.',
    'Check reporting for your core KPIs (pipeline coverage, conversion, activity).',
  ];
  if (lens === 'enterprise') {
    return [
      ...base,
      'Verify SSO, SCIM, auditability, and admin event logging in the active plan or in procurement docs.',
    ];
  }
  if (lens === 'startup') {
    return [
      ...base,
      'Add a second team member and confirm what changes at the first paid-seat threshold.',
    ];
  }
  if (lens === 'personal') {
    return [
      ...base,
      'Verify solo workflow speed, then re-check role and handoff setup before inviting a second user.',
    ];
  }
  return base;
}

function buildGenericChecklist(toolName: string): string[] {
  return [
    `Run one complete high-frequency workflow in ${toolName}, from setup to final output.`,
    'Check permissions, admin ownership, and rollback paths before wider rollout.',
    'Validate one integration that your team depends on daily.',
    'Verify reporting or visibility needed for operational decisions.',
    'Confirm what feature or usage threshold triggers a paid upgrade.',
  ];
}

function buildArchetypeChecklist(
  archetype: ToolPageProductArchetype,
  toolName: string,
  lens: ReviewLens
): string[] {
  if (archetype === 'api_first_devtool') {
    return [
      `Run one production-like API workflow in ${toolName}, then measure latency and output quality.`,
      'Validate auth, key rotation, and usage-limit behavior before rollout.',
      'Confirm one integration path your engineers depend on daily.',
      'Check how plan limits affect usage spikes and team expansion.',
      lens === 'enterprise'
        ? 'Verify governance controls, auditability, and procurement constraints in writing.'
        : 'Verify the first upgrade trigger by team size or required capability.',
    ];
  }
  if (archetype === 'product_family_platform') {
    return [
      `Choose one product surface in ${toolName} first, then validate end-to-end value before expanding.`,
      'Test how data and permissions carry across product surfaces.',
      'Confirm billing boundaries across plan families and workspace/account structure.',
      'Validate one reporting path used for operational decisions.',
      'Document the first upgrade trigger for your current team shape.',
    ];
  }
  return buildGenericChecklist(toolName);
}

function buildSubjectSpecificChecklist(input: {
  subjectType: 'product' | 'product_surface' | 'plan_family' | 'deployment_mode';
  entityScope: 'core' | 'copilot' | 'actions' | 'enterprise_cloud' | 'enterprise_server' | null;
  toolName: string;
  lens: ReviewLens;
}): string[] | null {
  if (input.subjectType === 'product_surface') {
    return [
      `Validate one end-to-end workflow in ${input.toolName} for this surface only, before evaluating adjacent products.`,
      `Confirm where this surface starts and stops, then document what still needs a different tool or module.`,
      'Check permissions, billing, and rollout ownership at the surface boundary, not suite-wide assumptions.',
      input.lens === 'enterprise'
        ? 'Verify governance controls and auditability for this specific surface in procurement docs.'
        : 'Verify the first paid threshold that unlocks required surface-level capabilities.',
    ];
  }
  if (input.subjectType === 'plan_family') {
    return [
      `Map required capabilities to exact plans in ${input.toolName}, then verify no critical feature is assumed across all tiers.`,
      'Confirm seat minimums, annual commitments, and procurement constraints before rollout planning.',
      'Run one pilot workflow on the intended target tier, not on a higher internal test tier.',
      'Document the downgrade and rollback path if plan assumptions break after onboarding.',
    ];
  }
  if (input.subjectType === 'deployment_mode') {
    const deploymentLabel =
      input.entityScope === 'enterprise_server'
        ? 'self-hosted/server deployment'
        : 'cloud deployment';
    return [
      `Validate one production-like workflow in the selected ${deploymentLabel} mode for ${input.toolName}.`,
      'Confirm identity, networking, backup, and upgrade responsibilities for this deployment mode.',
      'Check operational ownership boundaries between your team and vendor support.',
      'Run one incident drill (access loss or rollout rollback) before expansion.',
    ];
  }
  return null;
}

function buildSubjectSpecificPricingMentalModelItems(input: {
  subjectType: 'product' | 'product_surface' | 'plan_family' | 'deployment_mode';
  entityScope: 'core' | 'copilot' | 'actions' | 'enterprise_cloud' | 'enterprise_server' | null;
  lens: ReviewLens;
}): string[] | null {
  if (input.subjectType === 'product_surface') {
    return [
      'Price and limits should be validated for this exact product surface, not inferred from adjacent suite products.',
      'Model the first paid threshold for the surface-level workflow your team will run first.',
      'Confirm which permissions, automation depth, and support controls are tied to this surface only.',
    ];
  }
  if (input.subjectType === 'plan_family') {
    return [
      'Primary budget risk is plan mismatch, map required capabilities to exact tiers before rollout.',
      'Validate seat minimums, annual commitments, and plan-level gating in writing.',
      'Model upgrade timing around compliance and governance requirements, not only headcount growth.',
    ];
  }
  if (input.subjectType === 'deployment_mode') {
    const deploymentLabel =
      input.entityScope === 'enterprise_server'
        ? 'self-hosted/server deployment'
        : 'cloud deployment';
    return [
      `Total cost should include operational ownership for the selected ${deploymentLabel}.`,
      'Confirm who owns identity, networking, backup, and upgrade operations before expansion.',
      input.lens === 'enterprise'
        ? 'Procurement and governance controls should be validated for this deployment mode before commitment.'
        : 'Model when operational overhead outweighs the initial licensing or seat savings.',
    ];
  }
  return null;
}

const GENERIC_UTILITY_COPY_PATTERNS = [
  /\bsupports core workflows\b.*\bplan limits\b.*\bfeature constraints\b.*\bdocumented in (?:the )?source\b/i,
  /\bbest for teams that need supports\b/i,
];

function sanitizeUtilityCopy(value: string | null | undefined): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  if (GENERIC_UTILITY_COPY_PATTERNS.some((pattern) => pattern.test(text))) return '';
  return text;
}

export function buildToolPageDecisionUtilityState(
  input: BuildToolPageDecisionUtilityInput
): ToolPageDecisionUtilityState {
  const lowConfidenceMode = Boolean(input.lowConfidenceMode);
  const pricingType = (input.pricingType || '').toLowerCase();
  const hasFreeOrFreemiumPlan = pricingType.includes('free') || pricingType.includes('freemium');
  const hasStrongUtilitySourceAnchor = Boolean(
    input.hardLimitText || input.pricingEvidenceSourceUrl
  );
  const hasEvidenceAnchoredUtility = Boolean(
    input.hardLimitText || input.pricingEvidenceSourceUrl || input.pricingEvidenceSummary
  );
  const shouldSuppressGenericUtility = lowConfidenceMode && !hasEvidenceAnchoredUtility;
  const productArchetype = resolveToolPageProductArchetype({
    categorySlug: input.categorySlug,
    hasApi: input.hasApi,
    hasParentTool: input.hasParentTool,
    hasEnterpriseSignals: input.hasEnterpriseSignals,
  });
  const useIfBase = sanitizeUtilityCopy(input.lensBestFitLine);
  const avoidIfBase = sanitizeUtilityCopy(input.lensWeakFitLine);
  const watchOutBase =
    sanitizeUtilityCopy(input.hardLimitText) || sanitizeUtilityCopy(input.lensTradeoffLine);
  const useIf = useIfBase;
  const avoidIf = avoidIfBase;
  const watchOut = watchOutBase;

  const isCrm = isCrmCategory(input.categorySlug);
  const subjectSpecificChecklist = input.resolvedSubjectType
    ? buildSubjectSpecificChecklist({
        subjectType: input.resolvedSubjectType,
        entityScope: input.resolvedEntityScope || null,
        toolName: input.toolName,
        lens: input.activeReviewLens,
      })
    : null;
  const testChecklistItems = hasEvidenceAnchoredUtility
    ? subjectSpecificChecklist
      ? subjectSpecificChecklist
      : isCrm
        ? buildCrmChecklist(input.activeReviewLens)
        : buildArchetypeChecklist(productArchetype, input.toolName, input.activeReviewLens)
    : [];

  const subjectSpecificPricingMentalModelItems = input.resolvedSubjectType
    ? buildSubjectSpecificPricingMentalModelItems({
        subjectType: input.resolvedSubjectType,
        entityScope: input.resolvedEntityScope || null,
        lens: input.activeReviewLens,
      })
    : null;
  const basePricingMentalModelItems =
    subjectSpecificPricingMentalModelItems ||
    (input.activeReviewLens === 'startup'
      ? [
          hasFreeOrFreemiumPlan
            ? 'Free or entry tier is usually enough only until the first live workflow needs deeper automation, approvals, or admin control.'
            : 'Entry-tier fit should be judged on the first live workflow, not on feature-list breadth.',
          'Expect the first serious upgrade when team size, automation depth, or permissions become operational blockers.',
          'Model 6 to 12 month team growth before committing migration effort or tool-switching cost.',
        ]
      : input.activeReviewLens === 'enterprise'
        ? [
            'Budget risk usually starts when governance, procurement controls, or multi-team policy move you into enterprise packaging.',
            'Confirm identity, governance, auditability, and admin boundaries early to avoid rollout rework.',
            'Treat contract terms, seat minimums, and support model as implementation scope, not finance-only detail.',
          ]
        : [
            hasFreeOrFreemiumPlan
              ? 'Free is usually enough until seat count, approvals, or automation depth start blocking the real workflow.'
              : 'Primary cost fit usually depends on seats, plan tier, and required controls.',
            'The first serious upgrade usually comes from plan gating or team complexity, not usage volume alone.',
            'Confirm billing mechanics before rollout so user growth, entity growth, or workspace sprawl do not surprise budget owners.',
          ]);
  const decisionUpgradeTriggerBase =
    sanitizeUtilityCopy(input.hardLimitText) || sanitizeUtilityCopy(input.pricingEvidenceSummary);
  const decisionUpgradeTrigger = decisionUpgradeTriggerBase;
  const hasDecisionBullets =
    useIf.length > 0 ||
    avoidIf.length > 0 ||
    watchOut.length > 0 ||
    decisionUpgradeTrigger.length > 0;
  const pricingMentalModelItemsRaw: ToolPageDecisionUtilityState['pricingMentalModelItems'] = [
    ...(sanitizeUtilityCopy(input.hardLimitText)
      ? [
          {
            text: sanitizeUtilityCopy(input.hardLimitText),
            evidenceHref: '#verdict',
          },
        ]
      : []),
    ...(sanitizeUtilityCopy(input.pricingEvidenceSummary)
      ? [
          {
            text: sanitizeUtilityCopy(input.pricingEvidenceSummary),
            evidenceHref: '#pricing',
          },
        ]
      : []),
    ...(hasStrongUtilitySourceAnchor
      ? basePricingMentalModelItems.map((text) => ({
          text,
          evidenceHref: '#pricing',
        }))
      : []),
  ];
  const seenPricingMentalModelKeys = new Set<string>();
  const normalizePricingMentalModelKey = (value: string): string =>
    value
      .toLowerCase()
      .replace(/^[-\s]+/, '')
      .replace(/[.:;!?]+$/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const pricingMentalModelItems = pricingMentalModelItemsRaw.filter((item) => {
    const key = normalizePricingMentalModelKey(item.text);
    if (!sanitizeUtilityCopy(item.text)) return false;
    if (!key || seenPricingMentalModelKeys.has(key)) return false;
    seenPricingMentalModelKeys.add(key);
    return true;
  });

  const commonSetups = shouldSuppressGenericUtility
    ? []
    : hasEvidenceAnchoredUtility
      ? isCrm
        ? [
            {
              title: '2 to 3 person founder-led sales',
              body: 'Week one is usually pipeline setup, contact hygiene rules, and one outbound motion. Seat caps or role limits often surface first.',
              ...(input.hardLimitText
                ? {
                    costTrigger: {
                      text: input.hardLimitText,
                      evidenceHref: '#pricing',
                    },
                  }
                : {}),
            },
            {
              title: '5 to 10 person SDR and AE split',
              body: 'Expect to define role ownership, handoff rules, and reporting cadence before scale. Pipeline and field governance become mandatory.',
            },
            {
              title: 'Enterprise pilot',
              body: 'Validate identity controls, audit expectations, and rollout governance before expansion.',
              verificationLabel: 'Verify plan and procurement requirements from official sources.',
            },
          ]
        : [
            {
              title: 'Small team rollout',
              body: 'Start with one owner and one success metric, then expand only after a full workflow passes.',
              ...(input.hardLimitText
                ? {
                    costTrigger: {
                      text: input.hardLimitText,
                      evidenceHref: '#pricing',
                    },
                  }
                : {}),
            },
            {
              title: 'Functional team rollout',
              body: 'Define roles, permissions, and integration ownership before adding broad access.',
            },
            {
              title: 'Cross-functional rollout',
              body: 'Confirm governance and support model first to avoid operational drift during scale.',
            },
          ]
      : [];

  const verdictLeadOverride = (() => {
    if (shouldSuppressGenericUtility) {
      return `${input.toolName} has early signals, but subject-specific evidence is still too thin for reliable rollout guidance.`;
    }
    if (input.resolvedSubjectType === 'product_surface') {
      return `${input.toolName} should be evaluated as a specific product surface, not as a full suite verdict.`;
    }
    if (input.resolvedSubjectType === 'plan_family') {
      return `${input.toolName} should be judged on exact plan fit and upgrade constraints, not on broad feature impressions.`;
    }
    if (input.resolvedSubjectType === 'deployment_mode') {
      return `${input.toolName} should be evaluated in the selected deployment mode first, with operations and governance validated before expansion.`;
    }
    if (input.activeReviewLens === 'startup') {
      return `${input.toolName} fits startups that can own CRM operations and iterate quickly on pipeline and data model.`;
    }
    if (input.activeReviewLens === 'enterprise') {
      return `${input.toolName} should be evaluated against governance, rollout control, and cross-team reporting requirements first.`;
    }
    if (input.activeReviewLens === 'personal') {
      return `${input.toolName} works best when an individual operator needs flexibility now and can accept added setup work later.`;
    }
    return isCrm
      ? `${input.toolName} should be judged on operational rollout fit, not feature volume alone.`
      : `${input.toolName} should be evaluated by workflow outcomes, rollout friction, and cost triggers.`;
  })();

  return {
    decisionUseIf: useIf,
    decisionAvoidIf: avoidIf,
    decisionWatchOut: watchOut,
    decisionUpgradeTrigger,
    hasDecisionBullets,
    verdictLeadOverride,
    testChecklistTitle: isCrm ? 'What to test in 30 minutes' : 'What to test before rollout',
    testChecklistItems,
    pricingMentalModelItems: shouldSuppressGenericUtility ? [] : pricingMentalModelItems,
    commonSetupsTitle: 'Common setups',
    commonSetups,
    practicalOutcomesTitle: 'What it does in practice',
    practicalOutcomes: shouldSuppressGenericUtility
      ? []
      : hasEvidenceAnchoredUtility && hasStrongUtilitySourceAnchor
        ? isCrm
          ? [
              {
                outcome:
                  'Capture leads, enrich records, route ownership, and start follow-up sequences.',
                verifyInDemo: 'Run one inbound and one outbound lead path end-to-end.',
                planDependency:
                  'Automation depth and sequencing can be plan-gated, verify before rollout.',
              },
              {
                outcome:
                  'Keep pipeline clean with dedupe rules, enrichment checks, and required fields.',
                verifyInDemo:
                  'Import duplicate contacts and inspect merge behavior plus field governance.',
                planDependency: 'Data quality controls can vary by plan and admin role.',
              },
              {
                outcome: 'Track forecasting and activity quality for sales operations.',
                verifyInDemo:
                  'Confirm pipeline, conversion, and activity reports with your real definitions.',
                planDependency: 'Reporting scope and retention rules may vary by plan.',
              },
            ]
          : [
              {
                outcome: `Turn ${input.toolName} into a repeatable core workflow for your team.`,
                verifyInDemo: 'Run one representative task from setup through output validation.',
                planDependency: 'Advanced workflow controls can be plan-gated.',
              },
              {
                outcome: 'Reduce rework with clearer ownership and operating constraints.',
                verifyInDemo: 'Test permissions and role handoff paths with two different users.',
                planDependency: 'Admin and governance controls vary by plan.',
              },
            ]
        : [],
    hasEvidenceAnchoredUtility,
  };
}
