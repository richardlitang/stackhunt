interface BuildToolPageAddToStackPropsInput {
  toolSlug: string;
  toolName: string;
  toolLogo: string | null;
  pricingStartingPrice: number | null;
  pricingModel: string | null;
  pricingPlans: unknown;
}

export function buildToolPageAddToStackProps(input: BuildToolPageAddToStackPropsInput): {
  toolSlug: string;
  toolName: string;
  toolLogo: string | null;
  pricing: {
    starting_price: number | null;
    model: string | null;
  };
  plans: unknown;
} {
  return {
    toolSlug: input.toolSlug,
    toolName: input.toolName,
    toolLogo: input.toolLogo,
    pricing: {
      starting_price: input.pricingStartingPrice,
      model: input.pricingModel,
    },
    plans: input.pricingPlans,
  };
}
