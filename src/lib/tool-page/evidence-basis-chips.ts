interface ToolPageEvidenceBasisLike {
  label: string;
  count: number;
}

interface BuildToolPageEvidenceBasisChipsInput {
  evidenceBasis: ToolPageEvidenceBasisLike[];
}

export interface ToolPageEvidenceBasisChipView {
  text: string;
}

export function buildToolPageEvidenceBasisChips(
  input: BuildToolPageEvidenceBasisChipsInput
): ToolPageEvidenceBasisChipView[] {
  return input.evidenceBasis.map((chip) => ({
    text: `${chip.label} (${chip.count})`,
  }));
}
