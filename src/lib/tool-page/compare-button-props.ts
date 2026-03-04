interface BuildToolPageCompareButtonPropsInput {
  toolSlug: string;
  toolName: string;
  toolLogo: string | null;
  categorySlug: string | null;
  categoryName: string | null;
}

export function buildToolPageCompareButtonProps(
  input: BuildToolPageCompareButtonPropsInput
): BuildToolPageCompareButtonPropsInput {
  return input;
}
