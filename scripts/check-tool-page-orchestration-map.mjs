#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import prettier from 'prettier';
import { generateToolPageOrchestrationMapMarkdown } from './lib/tool-page-orchestration-map.mjs';

const root = process.cwd();
const mapPath = path.join(root, 'docs/TOOL_PAGE_ORCHESTRATION_MAP.md');

if (!fs.existsSync(mapPath)) {
  console.error('Missing docs/TOOL_PAGE_ORCHESTRATION_MAP.md');
  process.exit(1);
}

const expectedRaw = generateToolPageOrchestrationMapMarkdown(root);
const expected = await prettier.format(expectedRaw, { parser: 'markdown' });
const currentRaw = fs.readFileSync(mapPath, 'utf8');
const current = await prettier.format(currentRaw, { parser: 'markdown' });

if (expected !== current) {
  console.error(
    'docs/TOOL_PAGE_ORCHESTRATION_MAP.md is stale. Run `npm run docs:tool-page-map` and commit the updated doc.'
  );
  process.exit(1);
}

console.log('Tool page orchestration map freshness check passed.');
