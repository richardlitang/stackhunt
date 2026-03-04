interface BuildToolPagePriceVerificationPropsInput {
  toolId: string;
  toolName: string;
  currentPrice: number | null;
  pricingType: string | null;
  verificationCount: number | null | undefined;
}

export function buildToolPagePriceVerificationProps(
  input: BuildToolPagePriceVerificationPropsInput
): {
  toolId: string;
  toolName: string;
  currentPrice: number | null;
  pricingType: string | null;
  verificationCount: number;
  variant: 'inline';
} {
  return {
    toolId: input.toolId,
    toolName: input.toolName,
    currentPrice: input.currentPrice,
    pricingType: input.pricingType,
    verificationCount: input.verificationCount || 0,
    variant: 'inline',
  };
}
