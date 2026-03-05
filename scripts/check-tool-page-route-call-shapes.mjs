import fs from 'node:fs';
import path from 'node:path';
import {
  findInvalidToolPageRuntimeAssemblyChains,
  findMalformedToolPageRouteCallWrappers,
} from './lib/tool-page-route-call-shape-guard.mjs';

const targetPath = path.resolve('src/pages/tool/[slug].astro');
const source = fs.readFileSync(targetPath, 'utf8');

const matches = findMalformedToolPageRouteCallWrappers(source);
const invalidRuntimeChains = findInvalidToolPageRuntimeAssemblyChains(source);

if (matches.length > 0) {
  console.error(
    'Malformed tool-page route call shapes found in src/pages/tool/[slug].astro (remove extra object wrapper around helper call):'
  );
  for (const match of matches) {
    console.error(
      `- line ${match.line}: ${match.routeHelper} wrapped with object before ${match.nestedHelper}`
    );
  }
  process.exit(1);
}

if (invalidRuntimeChains.length > 0) {
  console.error(
    'Invalid runtime assembly chaining found in src/pages/tool/[slug].astro (do not call buildToolPageRuntimeAssemblyFromRoute with buildToolPageRuntimeAssemblyInputBundleFromPageContext):'
  );
  for (const match of invalidRuntimeChains) {
    console.error(`- line ${match.line}: ${match.excerpt}`);
  }
  process.exit(1);
}

console.log('Tool page route call shape check passed.');
