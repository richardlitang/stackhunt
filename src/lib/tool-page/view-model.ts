export type ReviewLens = 'general' | 'personal' | 'startup' | 'enterprise';
export type ReviewFocusKey =
  | 'verdict'
  | 'pricing'
  | 'setup'
  | 'capabilities'
  | 'integrations'
  | 'trust';

export interface ToolPageViewModelInput {
  activeReviewLens: ReviewLens;
  hasVerdict: boolean;
  showProceduralVerdict: boolean;
  showPricingSection: boolean;
  hasGettingStarted: boolean;
  hasFeatures: boolean;
  hasSpecs: boolean;
  showProceduralSpecs: boolean;
  hasPlatform: boolean;
  hasAlternatives: boolean;
}

export interface LensPriorityLink {
  href: string;
  label: string;
}

export interface ToolPageViewModel {
  focusSwitchOptions: Record<ReviewFocusKey, boolean>;
  lensDefaultFocus: ReviewFocusKey | 'all';
  showFocusSwitch: boolean;
  lensPriorityLinks: LensPriorityLink[];
}

export function buildToolPageViewModel(input: ToolPageViewModelInput): ToolPageViewModel {
  const focusSwitchOptions: Record<ReviewFocusKey, boolean> = {
    verdict: input.hasVerdict || input.showProceduralVerdict,
    pricing: input.showPricingSection,
    setup: input.hasGettingStarted,
    capabilities: input.hasFeatures || input.hasSpecs || input.showProceduralSpecs,
    integrations: input.hasPlatform,
    trust: true,
  };

  const lensDefaultFocusByLens: Record<ReviewLens, ReviewFocusKey | 'all'> = {
    general: 'all',
    personal: input.hasGettingStarted ? 'setup' : input.showPricingSection ? 'pricing' : 'verdict',
    startup: input.showPricingSection ? 'pricing' : input.hasPlatform ? 'integrations' : 'verdict',
    enterprise: 'trust',
  };

  const lensPriorityCatalog = {
    verdict: {
      href: '#verdict',
      label: 'Verdict',
      visible: input.hasVerdict || input.showProceduralVerdict,
    },
    setup: {
      href: '#getting-started',
      label: 'Getting started',
      visible: input.hasGettingStarted,
    },
    pricing: {
      href: '#pricing-plans',
      label: 'Pricing',
      visible: input.showPricingSection,
    },
    capabilities: {
      href: input.hasFeatures ? '#features' : input.hasSpecs ? '#specs' : '#platform-integrations',
      label: input.hasFeatures ? 'Capabilities' : input.hasSpecs ? 'Specs' : 'Platform',
      visible: input.hasFeatures || input.hasSpecs || input.hasPlatform,
    },
    integrations: {
      href: '#platform-integrations',
      label: 'Integrations',
      visible: input.hasPlatform,
    },
    trust: {
      href: '#how-we-evaluate',
      label: 'Trust details',
      visible: true,
    },
    alternatives: {
      href: '#alternatives',
      label: 'Alternatives',
      visible: input.hasAlternatives,
    },
  } as const;

  const lensPriorityOrder: Record<ReviewLens, Array<keyof typeof lensPriorityCatalog>> = {
    general: ['verdict', 'pricing', 'capabilities', 'alternatives'],
    personal: ['setup', 'pricing', 'verdict', 'alternatives'],
    startup: ['pricing', 'integrations', 'verdict', 'setup'],
    enterprise: ['trust', 'pricing', 'integrations', 'verdict'],
  };

  const enabledFocusOptionCount = Object.values(focusSwitchOptions).filter(Boolean).length;

  return {
    focusSwitchOptions,
    lensDefaultFocus: lensDefaultFocusByLens[input.activeReviewLens],
    showFocusSwitch: enabledFocusOptionCount >= 2,
    lensPriorityLinks: lensPriorityOrder[input.activeReviewLens]
      .map((key) => lensPriorityCatalog[key])
      .filter((item) => item.visible)
      .slice(0, 4)
      .map((item) => ({ href: item.href, label: item.label })),
  };
}
