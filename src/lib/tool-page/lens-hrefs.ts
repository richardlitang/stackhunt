export type ToolPageReviewLens = 'general' | 'personal' | 'startup' | 'enterprise';

export function buildToolPageLensHrefs(
  pathname: string,
  searchParams: URLSearchParams
): Record<ToolPageReviewLens, string> {
  const buildLensHref = (lens: ToolPageReviewLens): string => {
    const params = new URLSearchParams(searchParams);
    if (lens === 'general') {
      params.delete('lens');
    } else {
      params.set('lens', lens);
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return {
    general: buildLensHref('general'),
    personal: buildLensHref('personal'),
    startup: buildLensHref('startup'),
    enterprise: buildLensHref('enterprise'),
  };
}
