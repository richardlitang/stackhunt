import type { ReviewLens } from '@/lib/tool-page/view-model';

export interface ToolPageDecisionUtilitySetup {
  title: string;
  body: string;
  verificationLabel?: string;
}

export interface BuildToolPageDecisionUtilityInput {
  toolName: string;
  categorySlug: string | null;
  activeReviewLens: ReviewLens;
  lensBestFitLine: string;
  lensWeakFitLine: string;
  lensTradeoffLine: string;
  hardLimitText: string | null;
}

export interface ToolPageDecisionUtilityState {
  decisionUseIf: string;
  decisionAvoidIf: string;
  decisionWatchOut: string;
  verdictLeadOverride: string;
  testChecklistTitle: string;
  testChecklistItems: string[];
  pricingMentalModelItems: Array<{
    text: string;
    status: 'Source-backed' | 'Needs confirmation';
    evidenceHref?: string;
  }>;
  commonSetupsTitle: string;
  commonSetups: ToolPageDecisionUtilitySetup[];
  practicalOutcomesTitle: string;
  practicalOutcomes: Array<{
    outcome: string;
    verifyInDemo: string;
    planDependency: string;
    planDependencyStatus: 'Source-backed' | 'Needs confirmation';
  }>;
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

export function buildToolPageDecisionUtilityState(
  input: BuildToolPageDecisionUtilityInput
): ToolPageDecisionUtilityState {
  const useIf =
    input.lensBestFitLine || 'Use when source-backed capabilities match your daily workflow.';
  const avoidIf = input.lensWeakFitLine || 'Avoid when core rollout needs are still unconfirmed.';
  const watchOut =
    input.hardLimitText ||
    input.lensTradeoffLine ||
    'Watch out for plan limits and rollout dependencies.';

  const isCrm = isCrmCategory(input.categorySlug);
  const testChecklistItems = isCrm
    ? buildCrmChecklist(input.activeReviewLens)
    : buildGenericChecklist(input.toolName);

  const basePricingMentalModelItems =
    input.activeReviewLens === 'startup'
      ? [
          'Cost normally scales with seats, workspace count, and plan tier.',
          'Expect upgrades when team size or required automation depth grows.',
          'Model 6 to 12 month seat growth before committing migration effort.',
        ]
      : input.activeReviewLens === 'enterprise'
        ? [
            'Budget risk usually comes from seat volume, workspace policy, and enterprise controls.',
            'Confirm procurement features early (identity, governance, auditability) to avoid rework.',
            'Treat contract terms as part of implementation scope, not just finance scope.',
          ]
        : [
            'Primary cost drivers are seats, workspace count, and plan tier.',
            'The first paid threshold is usually headcount or feature-gating, not usage volume alone.',
            'Confirm billing behavior before rollout so team growth does not surprise budget owners.',
          ];
  const pricingMentalModelItems: ToolPageDecisionUtilityState['pricingMentalModelItems'] = [
    ...(input.hardLimitText
      ? [
          {
            text: input.hardLimitText,
            status: 'Source-backed' as const,
            evidenceHref: '#verdict',
          },
        ]
      : []),
    ...basePricingMentalModelItems.map((text) => ({
      text,
      status: 'Needs confirmation' as const,
    })),
  ];

  const commonSetups = isCrm
    ? [
        {
          title: '2 to 3 person founder-led sales',
          body: 'Week one is usually pipeline setup, contact hygiene rules, and one outbound motion. Seat caps or role limits often surface first.',
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
        },
        {
          title: 'Functional team rollout',
          body: 'Define roles, permissions, and integration ownership before adding broad access.',
        },
        {
          title: 'Cross-functional rollout',
          body: 'Confirm governance and support model first to avoid operational drift during scale.',
        },
      ];

  const verdictLeadOverride = (() => {
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
    verdictLeadOverride,
    testChecklistTitle: isCrm ? 'What to test in 30 minutes' : 'What to test before rollout',
    testChecklistItems,
    pricingMentalModelItems,
    commonSetupsTitle: 'Common setups',
    commonSetups,
    practicalOutcomesTitle: 'What it does in practice',
    practicalOutcomes: isCrm
      ? [
          {
            outcome:
              'Capture leads, enrich records, route ownership, and start follow-up sequences.',
            verifyInDemo: 'Run one inbound and one outbound lead path end-to-end.',
            planDependency:
              'Automation depth and sequencing can be plan-gated, verify before rollout.',
            planDependencyStatus: 'Needs confirmation',
          },
          {
            outcome:
              'Keep pipeline clean with dedupe rules, enrichment checks, and required fields.',
            verifyInDemo:
              'Import duplicate contacts and inspect merge behavior plus field governance.',
            planDependency: 'Data quality controls can vary by plan and admin role.',
            planDependencyStatus: 'Needs confirmation',
          },
          {
            outcome: 'Track forecasting and activity quality for sales operations.',
            verifyInDemo:
              'Confirm pipeline, conversion, and activity reports with your real definitions.',
            planDependency: 'Reporting scope and retention rules may vary by plan.',
            planDependencyStatus: 'Needs confirmation',
          },
        ]
      : [
          {
            outcome: `Turn ${input.toolName} into a repeatable core workflow for your team.`,
            verifyInDemo: 'Run one representative task from setup through output validation.',
            planDependency: 'Advanced workflow controls can be plan-gated.',
            planDependencyStatus: 'Needs confirmation',
          },
          {
            outcome: 'Reduce rework with clearer ownership and operating constraints.',
            verifyInDemo: 'Test permissions and role handoff paths with two different users.',
            planDependency: 'Admin and governance controls vary by plan.',
            planDependencyStatus: 'Needs confirmation',
          },
        ],
  };
}
