interface BuildToolPageSpecsPropsInput {
  displayCategorySpecificData: unknown;
  vipSpecifics: unknown;
  toolName: string;
  categoryName: string | null;
}

export function buildToolPageSpecsProps(input: BuildToolPageSpecsPropsInput): {
  categorySpecificData: unknown;
  specifics: unknown;
  toolName: string;
  categoryName: string | null;
} {
  return {
    categorySpecificData: input.displayCategorySpecificData,
    specifics: input.vipSpecifics,
    toolName: input.toolName,
    categoryName: input.categoryName,
  };
}
