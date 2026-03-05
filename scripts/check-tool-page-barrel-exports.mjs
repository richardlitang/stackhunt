import fs from 'node:fs';
import path from 'node:path';
import { findDuplicateToolPageBarrelExports } from './lib/tool-page-barrel-guard.mjs';

const targetPath = path.resolve('src/lib/tool-page/index.ts');
const source = fs.readFileSync(targetPath, 'utf8');
const duplicates = findDuplicateToolPageBarrelExports(source);

if (duplicates.length > 0) {
  console.error('Duplicate exports found in src/lib/tool-page/index.ts:');
  for (const duplicate of duplicates) {
    console.error(`- ${duplicate.symbol}: ${duplicate.modules.join(', ')}`);
  }
  process.exit(1);
}

console.log('Tool page barrel export uniqueness check passed.');
