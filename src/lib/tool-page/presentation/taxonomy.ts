interface BuildToolPagePrimaryFunctionInput {
  specs: unknown;
}

export function buildToolPagePrimaryFunction(
  input: BuildToolPagePrimaryFunctionInput
): string | null {
  const specs = input.specs;
  if (!specs || typeof specs !== 'object') return null;

  const taxonomy = (specs as { taxonomy?: unknown }).taxonomy;
  if (!taxonomy || typeof taxonomy !== 'object') return null;

  const primaryFunction = (taxonomy as { primary_function?: unknown }).primary_function;
  if (typeof primaryFunction !== 'string') return null;

  const normalized = primaryFunction.trim();
  return normalized.length > 0 ? normalized : null;
}
