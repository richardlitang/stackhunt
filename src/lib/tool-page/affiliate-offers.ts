interface ToolPageAffiliateOfferLike {
  url: string;
  cta_text: string;
  is_affiliate?: boolean | null;
}

interface BuildToolPageAffiliateOffersViewInput {
  offers: ToolPageAffiliateOfferLike[] | null | undefined;
}

export interface ToolPageAffiliateOfferView {
  url: string;
  ctaText: string;
  rel: string;
}

export interface ToolPageAffiliateOffersView {
  shouldShow: boolean;
  offers: ToolPageAffiliateOfferView[];
}

export function buildToolPageAffiliateOffersView(
  input: BuildToolPageAffiliateOffersViewInput
): ToolPageAffiliateOffersView {
  const offers = Array.isArray(input.offers) ? input.offers : [];

  return {
    shouldShow: offers.length > 1,
    offers: offers.map((offer) => ({
      url: offer.url,
      ctaText: offer.cta_text,
      rel: offer.is_affiliate ? 'nofollow sponsored noopener noreferrer' : 'noopener noreferrer',
    })),
  };
}
