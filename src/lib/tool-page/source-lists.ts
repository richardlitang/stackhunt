interface ToolPageEvidenceLinkLike {
  url: string;
  title: string;
  domain: string;
  basis: string;
  quality: string;
  inclusionReason: string;
}

interface BuildToolPageSourceListsInput {
  evidenceLinks: ToolPageEvidenceLinkLike[];
  lowConfidenceEvidenceLinks: ToolPageEvidenceLinkLike[];
}

export interface ToolPageSourceListsView {
  methodologyLinks: ToolPageEvidenceLinkLike[];
  lowConfidenceLinks: ToolPageEvidenceLinkLike[];
}

export function buildToolPageSourceListsView(
  input: BuildToolPageSourceListsInput
): ToolPageSourceListsView {
  return {
    methodologyLinks: input.evidenceLinks.slice(0, 12),
    lowConfidenceLinks: input.lowConfidenceEvidenceLinks.slice(0, 6),
  };
}
