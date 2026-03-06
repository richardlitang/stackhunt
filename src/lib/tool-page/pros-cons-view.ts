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
}

interface BuildToolPageProsConsViewInput {
  pros: Array<
    ToolPageEvidenceBulletLike & {
      sourceType?: 'official' | 'editorial' | 'community';
      claimType?: 'fact' | 'opinion';
      corroboratingSourceCount?: number;
    }
  >;
  cons: Array<
    ToolPageEvidenceBulletLike & {
      sourceType?: 'official' | 'editorial' | 'community';
      claimType?: 'fact' | 'opinion';
      corroboratingSourceCount?: number;
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
    })),
    cons: input.cons.map((entry) => ({
      text: entry.text,
      source_url: entry.sourceUrl,
      ...(entry.sourceType ? { source_type: entry.sourceType } : {}),
      ...(entry.claimType ? { claim_type: entry.claimType } : {}),
      ...(typeof entry.corroboratingSourceCount === 'number'
        ? { corroborating_source_count: entry.corroboratingSourceCount }
        : {}),
    })),
  };
}
