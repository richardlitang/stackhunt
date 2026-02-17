#!/usr/bin/env node

import { spawn } from 'node:child_process';

function runCommand(command, label) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command;
    console.log(`\n=== ${label} ===`);
    console.log(`$ ${cmd} ${args.join(' ')}`);

    const child = spawn(cmd, args, {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} failed with exit code ${code ?? 'unknown'}`));
    });
  });
}

async function main() {
  console.log('\nDesign pass');
  console.log('Runs visual screenshot audit + Lighthouse CI checks.');

  await runCommand(
    ['node', 'scripts/run-e2e.mjs', 'tests/e2e/ui-audit.spec.ts'],
    'Playwright UI audit screenshots'
  );

  await runCommand(['npm', 'run', 'codex:lhci'], 'Lighthouse CI');

  console.log('\nDesign pass complete.');
  console.log('Screenshots: tests/e2e/screenshots/');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
