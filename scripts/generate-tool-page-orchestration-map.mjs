#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import prettier from 'prettier';
import { generateToolPageOrchestrationMapMarkdown } from './lib/tool-page-orchestration-map.mjs';

const root = process.cwd();
const outPath = path.join(root, 'docs/TOOL_PAGE_ORCHESTRATION_MAP.md');
const markdown = generateToolPageOrchestrationMapMarkdown(root);
const formatted = await prettier.format(markdown, { parser: 'markdown' });
fs.writeFileSync(outPath, formatted, 'utf8');
console.log(`Wrote ${path.relative(root, outPath)}`);
