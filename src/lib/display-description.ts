interface DisplayDescriptionInput {
  shortDescription?: string | null;
  summaryMarkdown?: string | null;
  categoryName?: string | null;
  pricingType?: string | null;
  itemType?: 'tool' | 'gear' | string | null;
}

function cleanText(value: string): string {
  return value
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(value: string, max = 140): string {
  if (value.length <= max) return value;
  const clipped = value
    .slice(0, max)
    .replace(/\s+\S*$/, '')
    .trim();
  return `${clipped}...`;
}

function humanizePricing(pricingType?: string | null): string | null {
  if (!pricingType) return null;
  const normalized = pricingType.replace(/_/g, ' ').trim().toLowerCase();
  if (!normalized) return null;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function getDisplayDescription(input: DisplayDescriptionInput): string {
  const shortDescription =
    typeof input.shortDescription === 'string' ? input.shortDescription.trim() : '';
  if (shortDescription) return shortDescription;

  const summaryMarkdown =
    typeof input.summaryMarkdown === 'string' ? input.summaryMarkdown.trim() : '';
  if (summaryMarkdown) {
    const summaryText = cleanText(summaryMarkdown);
    if (summaryText) return truncateText(summaryText);
  }

  const categoryName = typeof input.categoryName === 'string' ? input.categoryName.trim() : '';
  const pricing = humanizePricing(input.pricingType);
  const noun = input.itemType === 'gear' ? 'gear profile' : 'tool profile';

  if (categoryName && pricing) return `${categoryName} • ${pricing} • ${noun}`;
  if (categoryName) return `${categoryName} • ${noun}`;
  if (pricing) return `${pricing} • ${noun}`;
  return `StackHunt ${noun}`;
}
