import fs from 'node:fs';
import path from 'node:path';
import { findToolPagePrepReviewEvidenceTDZRisks } from './lib/tool-page-tdz-guard.mjs';

const targetPath = path.resolve('src/pages/tool/[slug].astro');
const source = fs.readFileSync(targetPath, 'utf8');
const findings = findToolPagePrepReviewEvidenceTDZRisks(source);

if (findings.length > 0) {
  console.error(
    'Potential tool-page TDZ risks found in src/pages/tool/[slug].astro (do not pass these identifiers in prep review evidenceContext):'
  );
  for (const finding of findings) {
    console.error(`- line ${finding.line}: ${finding.identifier}`);
  }
  process.exit(1);
}

console.log('Tool page TDZ guard check passed.');
