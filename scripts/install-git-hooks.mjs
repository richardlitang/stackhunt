#!/usr/bin/env node
/* global process, console */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const hooksDir = path.join(root, '.git', 'hooks');
const hookPath = path.join(hooksDir, 'pre-push');
const marker = '# stackhunt-managed-pre-push';
const hookBody = `#!/bin/sh
${marker}
set -e
echo "Running StackHunt pre-push checks..."
npm run qa:prepush
`;

if (!fs.existsSync(path.join(root, '.git'))) {
  console.log('No .git directory found, skipping hook installation.');
  process.exit(0);
}

fs.mkdirSync(hooksDir, { recursive: true });

if (fs.existsSync(hookPath)) {
  const existing = fs.readFileSync(hookPath, 'utf8');
  if (!existing.includes(marker)) {
    const backupPath = `${hookPath}.bak`;
    fs.copyFileSync(hookPath, backupPath);
    console.log(`Existing pre-push hook backed up to ${backupPath}`);
  }
}

fs.writeFileSync(hookPath, hookBody, { encoding: 'utf8' });
fs.chmodSync(hookPath, 0o755);

console.log('Installed .git/hooks/pre-push to run `npm run qa:prepush`.');
