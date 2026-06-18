interface BuildToolPagePricingLinkTextInput {
  text: string;
}

export function buildToolPagePricingLinkText(input: BuildToolPagePricingLinkTextInput): string {
  return input.text.length > 120 ? `${input.text.slice(0, 117)}...` : input.text;
}
