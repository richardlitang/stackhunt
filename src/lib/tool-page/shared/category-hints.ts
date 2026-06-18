export function isToolPagePaymentsCategoryHint(
  categorySlug: string | null | undefined,
  taxonomyPrimaryFunction: string | null | undefined
): boolean {
  const taxonomyPrimary =
    typeof taxonomyPrimaryFunction === 'string' ? taxonomyPrimaryFunction.toLowerCase() : '';
  const categoryHint = `${categorySlug || ''} ${taxonomyPrimary}`.toLowerCase();
  return /\b(payment|payments|bank|banking|finance|accounting|treasury|billing)\b/.test(
    categoryHint
  );
}
