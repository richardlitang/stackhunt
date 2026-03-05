const EXPORT_NAMED_BLOCK_WITH_SOURCE_PATTERN = /export\s*{([\s\S]*?)}\s*from\s*['"]([^'"]+)['"];?/g;

export function collectToolPageBarrelExports(source) {
  const exportMap = new Map();
  for (const match of source.matchAll(EXPORT_NAMED_BLOCK_WITH_SOURCE_PATTERN)) {
    const block = match[1] || '';
    const modulePath = match[2] || '';
    for (const part of block.split(',')) {
      const symbol = part.replace(/\s+as\s+.*/, '').trim();
      if (!symbol) continue;
      if (!exportMap.has(symbol)) exportMap.set(symbol, []);
      exportMap.get(symbol).push(modulePath);
    }
  }
  return exportMap;
}

export function findDuplicateToolPageBarrelExports(source) {
  const exportMap = collectToolPageBarrelExports(source);
  return [...exportMap.entries()]
    .filter(([, modules]) => modules.length > 1)
    .map(([symbol, modules]) => ({ symbol, modules }));
}
