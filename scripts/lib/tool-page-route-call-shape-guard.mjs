const MALFORMED_ROUTE_CALL_PATTERN =
  /\b(buildToolPage[A-Za-z0-9_]+FromRoute)\(\s*\{\s*(buildToolPage[A-Za-z0-9_]+)/g;
const INVALID_RUNTIME_ASSEMBLY_CHAIN_PATTERN =
  /\bbuildToolPageRuntimeAssemblyFromRoute\s*\(\s*buildToolPageRuntimeAssemblyInputBundleFromPageContext\s*\(/g;

function getLineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

function preserveNewlinesAsSpaces(text) {
  return text.replace(/[^\n]/g, ' ');
}

function stripToolPageRouteCallNoise(source) {
  const blockCommentStripped = source.replace(/\/\*[\s\S]*?\*\//g, (match) =>
    preserveNewlinesAsSpaces(match)
  );
  const lineCommentStripped = blockCommentStripped.replace(/\/\/[^\n\r]*/g, (match) =>
    preserveNewlinesAsSpaces(match)
  );
  const stringStripped = lineCommentStripped.replace(
    /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g,
    (match) => preserveNewlinesAsSpaces(match)
  );
  return stringStripped;
}

export function findMalformedToolPageRouteCallWrappers(source) {
  const scanSource = stripToolPageRouteCallNoise(source);
  return [...scanSource.matchAll(MALFORMED_ROUTE_CALL_PATTERN)].map((match) => ({
    routeHelper: match[1] || null,
    nestedHelper: match[2] || null,
    line: getLineNumber(scanSource, match.index ?? 0),
    excerpt: match[0] || null,
  }));
}

export function findInvalidToolPageRuntimeAssemblyChains(source) {
  const scanSource = stripToolPageRouteCallNoise(source);
  return [...scanSource.matchAll(INVALID_RUNTIME_ASSEMBLY_CHAIN_PATTERN)].map((match) => ({
    line: getLineNumber(scanSource, match.index ?? 0),
    excerpt: match[0] || null,
  }));
}
