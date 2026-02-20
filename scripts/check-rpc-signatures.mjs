#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const migrationsDir = path.join(repoRoot, 'supabase', 'migrations');
const expectedPath = path.join(repoRoot, 'scripts', 'rpc-signatures.expected.json');

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeArgType(rawArg) {
  if (!rawArg) return '';

  let arg = normalizeWhitespace(rawArg.toLowerCase());
  const defaultIndex = arg.indexOf(' default ');
  if (defaultIndex >= 0) arg = arg.slice(0, defaultIndex).trim();

  const tokens = arg.split(' ').filter(Boolean);
  if (tokens.length === 0) return '';

  const modeKeywords = new Set(['in', 'out', 'inout', 'variadic']);
  if (modeKeywords.has(tokens[0])) tokens.shift();

  if (tokens.length > 1 && /^[a-z_][a-z0-9_]*$/i.test(tokens[0])) {
    tokens.shift();
  }

  let normalized = tokens.join(' ');
  normalized = normalized
    .replace(/\bint\b/g, 'integer')
    .replace(/\bbool\b/g, 'boolean')
    .replace(/\bdouble precision\b/g, 'float8');

  return normalizeWhitespace(normalized);
}

function extractSignaturesFromSql(sql) {
  const signatures = new Set();
  const cleaned = stripSqlComments(sql);
  const regex = /create\s+(?:or\s+replace\s+)?function\s+([a-z0-9_."]+)\s*\(([\s\S]*?)\)\s*returns/gi;

  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    const rawName = match[1] || '';
    const rawArgs = match[2] || '';

    const name = rawName.replace(/"/g, '').split('.').pop()?.toLowerCase();
    if (!name) continue;

    const args = rawArgs
      .split(',')
      .map((segment) => normalizeArgType(segment))
      .filter(Boolean);

    signatures.add(`${name}(${args.join(',')})`);
  }

  return signatures;
}

function loadExpectedSignatures(expectedFilePath) {
  const raw = fs.readFileSync(expectedFilePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.requiredSignatures)) {
    throw new Error('scripts/rpc-signatures.expected.json must contain requiredSignatures[]');
  }
  return parsed.requiredSignatures.map((value) => String(value).toLowerCase().trim());
}

function collectMigrationSignatures(dir) {
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const signatures = new Set();
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    for (const signature of extractSignaturesFromSql(content)) {
      signatures.add(signature);
    }
  }
  return signatures;
}

function main() {
  const expected = loadExpectedSignatures(expectedPath);
  const found = collectMigrationSignatures(migrationsDir);
  const missing = expected.filter((signature) => !found.has(signature));

  if (missing.length > 0) {
    console.error('RPC signature check failed. Missing signatures:');
    for (const signature of missing) {
      console.error(`- ${signature}`);
    }
    process.exit(1);
  }

  console.log(`RPC signature check passed (${expected.length} required signatures found).`);
}

main();
