interface ToolPageEvidenceBulletLike {
  text: string;
  sourceUrl: string | null;
}

export interface ToolPageProsConsEntry {
  text: string;
  source_url: string | null;
}

interface BuildToolPageProsConsViewInput {
  pros: ToolPageEvidenceBulletLike[];
  cons: ToolPageEvidenceBulletLike[];
}

export function buildToolPageProsConsView(
  input: BuildToolPageProsConsViewInput
): {
  pros: ToolPageProsConsEntry[];
  cons: ToolPageProsConsEntry[];
} {
  return {
    pros: input.pros.map((entry) => ({
      text: entry.text,
      source_url: entry.sourceUrl,
    })),
    cons: input.cons.map((entry) => ({
      text: entry.text,
      source_url: entry.sourceUrl,
    })),
  };
}
