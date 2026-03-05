#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function resolveBaseRef() {
  const fallback = 'origin/main';
  let upstream = fallback;
  try {
    upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  } catch {
    upstream = fallback;
  }
  try {
    return git(['merge-base', 'HEAD', upstream]);
  } catch {
    return git(['rev-parse', 'HEAD~1']);
  }
}

const baseRef = resolveBaseRef();

function collectGitPaths(args) {
  try {
    return git(args)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const changedSinceBase = collectGitPaths([
  'diff',
  '--name-only',
  '--diff-filter=ACMR',
  `${baseRef}..HEAD`,
]);
const changedInWorkingTree = collectGitPaths(['diff', '--name-only', '--diff-filter=ACMR']);
const changedInIndex = collectGitPaths(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
const untracked = collectGitPaths(['ls-files', '--others', '--exclude-standard']);
const changed = Array.from(
  new Set([...changedSinceBase, ...changedInWorkingTree, ...changedInIndex, ...untracked])
);

const prettierExt = /\.(astro|css|json|md|ya?ml|[cm]?[jt]sx?)$/i;
const targets = changed.filter((file) => prettierExt.test(file) && fs.existsSync(file));

if (targets.length === 0) {
  console.log('No changed files require Prettier checks.');
  process.exit(0);
}

const run = spawnSync('npx', ['prettier', '--check', ...targets], {
  stdio: 'inherit',
});

process.exit(run.status ?? 1);
