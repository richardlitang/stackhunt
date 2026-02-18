#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targetDirs = ['src/pages', 'src/components'];
const allowedExtensions = new Set(['.astro', '.tsx', '.ts', '.md']);
const excludedPathFragments = ['/admin/', '/api/'];

const bannedRules = [
  { reason: 'legacy wording: "Evidence grade"', pattern: /\bEvidence grade\b/i },
  { reason: 'legacy wording: "Weighted score"', pattern: /\bWeighted score\b/i },
  { reason: 'legacy wording: "Procurement pending"', pattern: /\bProcurement pending\b/i },
  { reason: 'legacy wording: "Verified on [Date]"', pattern: /\bVerified on \[Date\]\b/i },
  { reason: 'copy lint: "verified claim"', pattern: /\bverified claim\b/i },
  { reason: 'copy lint: "guaranteed"', pattern: /\bguaranteed\b/i },
  { reason: 'copy lint: "best choice"', pattern: /\bbest choice\b/i },
];

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(absolute, out);
      continue;
    }
    const ext = path.extname(entry.name);
    if (allowedExtensions.has(ext)) out.push(absolute);
  }
  return out;
}

function isPublicFile(relativePath) {
  return !excludedPathFragments.some((fragment) => relativePath.includes(fragment));
}

function evaluateNoFreeTierPolicy(line) {
  if (!/\bno free tier\b/i.test(line)) return null;
  if (/\bself-serve\b/i.test(line) && /\b(listed|pricing page|as of)\b/i.test(line)) return null;
  return 'copy lint: "no free tier" must include scope (e.g. self-serve + listed/as-of context)';
}

function evaluateFile(filePath) {
  const relativePath = path.relative(root, filePath).replace(/\\/g, '/');
  if (!isPublicFile(relativePath)) return [];

  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  const violations = [];

  lines.forEach((line, index) => {
    for (const rule of bannedRules) {
      if (rule.pattern.test(line)) {
        violations.push({
          file: relativePath,
          line: index + 1,
          reason: rule.reason,
          snippet: line.trim(),
        });
      }
    }

    const noFreeTierViolation = evaluateNoFreeTierPolicy(line);
    if (noFreeTierViolation) {
      violations.push({
        file: relativePath,
        line: index + 1,
        reason: noFreeTierViolation,
        snippet: line.trim(),
      });
    }
  });

  return violations;
}

function checkRequiredToolPageMarkers() {
  const toolPage = path.join(root, 'src/pages/tool/[slug].astro');
  const text = fs.readFileSync(toolPage, 'utf8');
  const requiredMarkers = [
    { marker: 'How We Evaluate', reason: 'missing "How We Evaluate" section on tool page' },
    { marker: 'Evaluation depth:', reason: 'missing evaluation depth label on tool page' },
    { marker: 'href="/disclosure"', reason: 'missing disclosure link on tool page' },
  ];

  return requiredMarkers
    .filter((item) => !text.includes(item.marker))
    .map((item) => `src/pages/tool/[slug].astro: ${item.reason}`);
}

function main() {
  const files = targetDirs.flatMap((dir) => walk(path.join(root, dir)));
  const violations = files.flatMap((file) => evaluateFile(file));
  const requiredMarkerErrors = checkRequiredToolPageMarkers();

  if (violations.length === 0 && requiredMarkerErrors.length === 0) {
    console.log('content-policy-gates: PASS');
    return;
  }

  console.error('content-policy-gates: FAIL\n');
  for (const error of requiredMarkerErrors) {
    console.error(`- ${error}`);
  }
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} ${violation.reason}\n    ${violation.snippet}`
    );
  }
  process.exit(1);
}

main();
