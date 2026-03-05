const TOOL_PAGE_HELPER_PATTERN = /\b((?:build|derive|apply|get|has|is)ToolPage[A-Za-z0-9_]+)\b/g;
const TOOL_PAGE_HELPER_IMPORT_PATTERN = /^(?:build|derive|apply|get|has|is)ToolPage[A-Za-z0-9_]+$/;
const TOOL_PAGE_HELPER_CALL_PATTERN =
  /\b((?:build|derive|apply|get|has|is)ToolPage[A-Za-z0-9_]+)\s*\(/g;
const IMPORT_NAMED_BLOCK_PATTERN = /import\s*{([\s\S]*?)}\s*from\s*['"][^'"]+['"];?/g;
const IMPORT_NAMED_BLOCK_WITH_SOURCE_PATTERN = /import\s*{([\s\S]*?)}\s*from\s*['"]([^'"]+)['"];?/g;
const LOCAL_FUNCTION_DECL_PATTERN =
  /\b(?:const|let|var)\s+((?:build|derive|apply|get|has|is)ToolPage[A-Za-z0-9_]+)\s*=|(?:function)\s+((?:build|derive|apply|get|has|is)ToolPage[A-Za-z0-9_]+)/g;

function preserveNewlinesAsSpaces(text) {
  return text.replace(/[^\n]/g, ' ');
}

function stripToolPageHelperNoise(source) {
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

export function collectToolPageHelperUsages(source) {
  const scanSource = stripToolPageHelperNoise(source);
  const helpers = new Set();
  for (const match of scanSource.matchAll(TOOL_PAGE_HELPER_PATTERN)) {
    if (match[1]) {
      helpers.add(match[1]);
    }
  }
  return helpers;
}

export function collectToolPageImportsFromBlock(source) {
  let toolPageImportBlock = null;
  for (const match of source.matchAll(IMPORT_NAMED_BLOCK_WITH_SOURCE_PATTERN)) {
    const modulePath = match[2];
    if (modulePath === '@/lib/tool-page') {
      toolPageImportBlock = match[1] || null;
      break;
    }
  }

  if (!toolPageImportBlock) {
    throw new Error(
      'Could not find @/lib/tool-page named import block in src/pages/tool/[slug].astro'
    );
  }

  return new Set(
    toolPageImportBlock
      .split(',')
      .map((part) => part.trim())
      .filter((part) => TOOL_PAGE_HELPER_IMPORT_PATTERN.test(part))
      .map((part) => part.replace(/\s+as\s+.*/, ''))
  );
}

export function findMissingToolPageImports(source) {
  const used = collectToolPageHelperUsages(source);
  const imported = collectToolPageImportsFromBlock(source);
  return [...used].filter((name) => !imported.has(name)).sort();
}

export function collectToolPageHelperCallSites(source) {
  const scanSource = stripToolPageHelperNoise(source);
  const helpers = new Set();
  for (const match of scanSource.matchAll(TOOL_PAGE_HELPER_CALL_PATTERN)) {
    if (match[1]) {
      helpers.add(match[1]);
    }
  }
  return helpers;
}

export function collectNamedImports(source) {
  const imported = new Set();
  for (const match of source.matchAll(IMPORT_NAMED_BLOCK_PATTERN)) {
    const block = match[1] || '';
    for (const part of block.split(',')) {
      const name = part.trim();
      if (!name) continue;
      const base = name.replace(/\s+as\s+.*/, '').trim();
      if (base) imported.add(base);
    }
  }
  return imported;
}

export function collectToolPageLocalDeclarations(source) {
  const scanSource = stripToolPageHelperNoise(source);
  const declared = new Set();
  for (const match of scanSource.matchAll(LOCAL_FUNCTION_DECL_PATTERN)) {
    const name = match[1] || match[2];
    if (name) {
      declared.add(name);
    }
  }
  return declared;
}

export function findUnboundToolPageHelperCalls(source) {
  const called = collectToolPageHelperCallSites(source);
  const imported = collectNamedImports(source);
  const declared = collectToolPageLocalDeclarations(source);
  return [...called].filter((name) => !imported.has(name) && !declared.has(name)).sort();
}
