import fs from 'node:fs';
import path from 'node:path';
import {
  findMissingToolPageImports,
  findUnboundToolPageHelperCalls,
} from './lib/tool-page-helper-import-guard.mjs';

const targetPath = path.resolve('src/pages/tool/[slug].astro');
const source = fs.readFileSync(targetPath, 'utf8');
const missing = findMissingToolPageImports(source);
const unboundCalls = findUnboundToolPageHelperCalls(source);

if (missing.length > 0) {
  console.error('Missing tool-page helper imports in src/pages/tool/[slug].astro:');
  for (const name of missing) {
    console.error(`- ${name}`);
  }
  process.exit(1);
}

if (unboundCalls.length > 0) {
  console.error('Unbound tool-page helper calls in src/pages/tool/[slug].astro:');
  for (const name of unboundCalls) {
    console.error(`- ${name}`);
  }
  process.exit(1);
}

console.log('Tool page helper import check passed.');
