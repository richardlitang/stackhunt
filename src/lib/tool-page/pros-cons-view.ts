interface ToolPageEvidenceBulletLike {
  text: string;
  sourceUrl: string | null;
}

export interface ToolPageProsConsEntry {
  text: string;
  source_url: string | null;
  source_type?: 'official' | 'editorial' | 'community';
  claim_type?: 'fact' | 'opinion';
  corroborating_source_count?: number;
  claim_confidence_tier?: 'high' | 'medium' | 'low';
  claim_confidence_score?: number;
}

interface BuildToolPageProsConsViewInput {
  pros: Array<
    ToolPageEvidenceBulletLike & {
      sourceType?: 'official' | 'editorial' | 'community';
      claimType?: 'fact' | 'opinion';
      corroboratingSourceCount?: number;
      claimConfidenceTier?: 'high' | 'medium' | 'low';
      claimConfidenceScore?: number;
    }
  >;
  cons: Array<
    ToolPageEvidenceBulletLike & {
      sourceType?: 'official' | 'editorial' | 'community';
      claimType?: 'fact' | 'opinion';
      corroboratingSourceCount?: number;
      claimConfidenceTier?: 'high' | 'medium' | 'low';
      claimConfidenceScore?: number;
    }
  >;
}

export function buildToolPageProsConsView(input: BuildToolPageProsConsViewInput): {
  pros: ToolPageProsConsEntry[];
  cons: ToolPageProsConsEntry[];
} {
  return {
    pros: input.pros.map((entry) => ({
      text: entry.text,
      source_url: entry.sourceUrl,
      ...(entry.sourceType ? { source_type: entry.sourceType } : {}),
      ...(entry.claimType ? { claim_type: entry.claimType } : {}),
      ...(typeof entry.corroboratingSourceCount === 'number'
        ? { corroborating_source_count: entry.corroboratingSourceCount }
        : {}),
      ...(entry.claimConfidenceTier ? { claim_confidence_tier: entry.claimConfidenceTier } : {}),
      ...(typeof entry.claimConfidenceScore === 'number'
        ? { claim_confidence_score: entry.claimConfidenceScore }
        : {}),
    })),
    cons: input.cons.map((entry) => ({
      text: entry.text,
      source_url: entry.sourceUrl,
      ...(entry.sourceType ? { source_type: entry.sourceType } : {}),
      ...(entry.claimType ? { claim_type: entry.claimType } : {}),
      ...(typeof entry.corroboratingSourceCount === 'number'
        ? { corroborating_source_count: entry.corroboratingSourceCount }
        : {}),
      ...(entry.claimConfidenceTier ? { claim_confidence_tier: entry.claimConfidenceTier } : {}),
      ...(typeof entry.claimConfidenceScore === 'number'
        ? { claim_confidence_score: entry.claimConfidenceScore }
        : {}),
    })),
  };
}
