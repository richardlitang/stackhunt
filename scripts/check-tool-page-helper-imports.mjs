import fs from 'node:fs';
import path from 'node:path';

const targetPath = path.resolve('src/pages/tool/[slug].astro');
const source = fs.readFileSync(targetPath, 'utf8');

const helperPattern = /\b(buildToolPage[A-Za-z0-9_]+)\b/g;
const allHelpers = new Set();
for (const match of source.matchAll(helperPattern)) {
  allHelpers.add(match[1]);
}

const lines = source.split('\n');
let inToolPageImport = false;
const toolPageImportLines = [];

for (const line of lines) {
  if (!inToolPageImport && line.trim() === 'import {') {
    inToolPageImport = true;
    toolPageImportLines.length = 0;
    continue;
  }

  if (inToolPageImport) {
    if (line.trim().startsWith('} from ')) {
      if (line.includes("} from '@/lib/tool-page';")) {
        break;
      }
      inToolPageImport = false;
      toolPageImportLines.length = 0;
      continue;
    }
    toolPageImportLines.push(line);
  }
}

if (toolPageImportLines.length === 0) {
  console.error('Could not find @/lib/tool-page named import block in src/pages/tool/[slug].astro');
  process.exit(1);
}

const importedHelpers = new Set(
  toolPageImportLines.join('\n')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.startsWith('buildToolPage'))
    .map((part) => part.replace(/\s+as\s+.*/, ''))
);

const missing = [...allHelpers].filter((name) => !importedHelpers.has(name)).sort();

if (missing.length > 0) {
  console.error('Missing buildToolPage helper imports in src/pages/tool/[slug].astro:');
  for (const name of missing) {
    console.error(`- ${name}`);
  }
  process.exit(1);
}

console.log('Tool page helper import check passed.');
