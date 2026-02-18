#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const HIGH_VOLATILITY_TERMS =
  /\b(price|pricing|cost|billing|plan|tier|trial|free tier|free trial|seat|availability|deprecated|model|version|quota|limit|token|security|compliance|soc ?2|hipaa|gdpr|sso)\b/i;
const MEDIUM_VOLATILITY_TERMS =
  /\b(feature|integration|api|support|export|import|performance|latency|uptime|setup)\b/i;

const CLAIM_VOLATILITY_TTL_DAYS = {
  high: 30,
  medium: 90,
  low: 180,
};

function classifyClaimVolatility(text, claimType = 'opinion') {
  if (HIGH_VOLATILITY_TERMS.test(text)) return 'high';
  if (MEDIUM_VOLATILITY_TERMS.test(text)) return 'medium';
  return claimType === 'fact' ? 'medium' : 'low';
}

function computeClaimRecheckBy(checkedAt, volatility) {
  if (!checkedAt) return null;
  const parsed = new Date(checkedAt);
  if (Number.isNaN(parsed.getTime())) return null;
  const next = new Date(parsed.getTime() + CLAIM_VOLATILITY_TTL_DAYS[volatility] * 86400000);
  return next.toISOString();
}

function inferClaimScope(text, sourceUrl) {
  const hints = [];
  if (/\benterprise|business|team|starter|pro\b/i.test(text)) hints.push('plan');
  if (/\bmonthly|annual|per seat|per user|billing\b/i.test(text)) hints.push('billing cadence');
  if (/\busd|eur|gbp|us|eu|uk|region|country\b/i.test(text)) hints.push('region/currency');
  if (sourceUrl && /\/(pricing|plans?|subscription)/i.test(sourceUrl)) hints.push('pricing page');
  if (hints.length === 0) return null;
  return Array.from(new Set(hints)).join(', ');
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function getArgValue(name) {
  const found = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!found) return null;
  return found.split('=').slice(1).join('=').trim();
}

function normalizeDomain(input) {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase().replace(/^www\./, '');
  return trimmed || null;
}

function domainFromUrl(url) {
  if (!url) return null;
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return null;
  }
}

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
}

function withUnique(values) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function shouldBackfill(row) {
  const value = row.value_json || {};
  const sourceUrls = toStringArray(value.source_urls);
  const checkedAt =
    typeof value.checked_at === 'string' && value.checked_at.trim()
      ? value.checked_at.trim()
      : null;
  const verificationMethod =
    typeof value.verification_method === 'string' && value.verification_method.trim()
      ? value.verification_method.trim()
      : null;
  const scope = typeof value.scope === 'string' && value.scope.trim() ? value.scope.trim() : null;
  const volatility =
    typeof value.volatility === 'string' && value.volatility.trim() ? value.volatility.trim() : null;
  const recheckBy =
    typeof value.recheck_by === 'string' && value.recheck_by.trim() ? value.recheck_by.trim() : null;

  return (
    sourceUrls.length === 0 ||
    !checkedAt ||
    !verificationMethod ||
    !scope ||
    !volatility ||
    !recheckBy ||
    !row.source_domain ||
    !row.policy_snapshot
  );
}

async function main() {
  const apply = hasFlag('apply');
  const batchArg = Number(getArgValue('batch') || 250);
  const limitArg = Number(getArgValue('limit') || 2000);
  const batchSize = Number.isFinite(batchArg) ? Math.max(50, Math.min(batchArg, 1000)) : 250;
  const hardLimit = Number.isFinite(limitArg) ? Math.max(1, Math.min(limitArg, 100000)) : 2000;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  console.log('\nClaim Metadata Backfill');
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Batch size: ${batchSize}`);
  console.log(`Max rows: ${hardLimit}`);

  let offset = 0;
  let scanned = 0;
  let candidates = 0;
  let updated = 0;
  let failed = 0;

  while (scanned < hardLimit) {
    const end = Math.min(offset + batchSize - 1, hardLimit - 1);
    const { data, error } = await supabase
      .from('claims')
      .select('id, source_url, source_domain, value_json, policy_snapshot, extracted_at')
      .order('extracted_at', { ascending: true })
      .range(offset, end);

    if (error) {
      console.error(`Failed to fetch claims batch at offset ${offset}: ${error.message}`);
      process.exit(1);
    }

    const rows = data || [];
    if (rows.length === 0) break;

    scanned += rows.length;
    offset += rows.length;

    for (const row of rows) {
      if (!shouldBackfill(row)) continue;
      candidates += 1;

      const value = { ...(row.value_json || {}) };
      const text = typeof value.text === 'string' ? value.text.trim() : '';
      const claimType =
        value.claim_type === 'fact' || value.claim_type === 'opinion' ? value.claim_type : 'opinion';

      const sourceUrl =
        (typeof value.source_url === 'string' && value.source_url.trim()) || row.source_url || null;
      const sourceUrls = withUnique([...toStringArray(value.source_urls), ...(sourceUrl ? [sourceUrl] : [])]);

      const checkedAt =
        (typeof value.checked_at === 'string' && value.checked_at.trim()) ||
        (typeof value.retrieved_at === 'string' && value.retrieved_at.trim()) ||
        (typeof row.policy_snapshot?.retrieved_at === 'string'
          ? row.policy_snapshot.retrieved_at.trim()
          : '') ||
        row.extracted_at ||
        new Date().toISOString();

      const volatility =
        value.volatility === 'high' || value.volatility === 'medium' || value.volatility === 'low'
          ? value.volatility
          : classifyClaimVolatility(text, claimType);
      const scope =
        (typeof value.scope === 'string' && value.scope.trim()) ||
        inferClaimScope(text, sourceUrl) ||
        null;
      const verificationMethod =
        (typeof value.verification_method === 'string' && value.verification_method.trim()) ||
        (sourceUrls.length > 1 ? 'cross_source' : 'source_presence');
      const recheckBy =
        (typeof value.recheck_by === 'string' && value.recheck_by.trim()) ||
        computeClaimRecheckBy(checkedAt, volatility) ||
        null;

      const sourceDomain = row.source_domain || domainFromUrl(sourceUrl);
      const nextPolicySnapshot = {
        ...(row.policy_snapshot || {}),
        ...(checkedAt ? { checked_at: checkedAt } : {}),
        ...(volatility ? { volatility } : {}),
        ...(recheckBy ? { recheck_by: recheckBy } : {}),
      };
      if (!nextPolicySnapshot.retrieved_at && checkedAt) {
        nextPolicySnapshot.retrieved_at = checkedAt;
      }

      const nextValueJson = {
        ...value,
        ...(sourceUrls.length > 0 ? { source_urls: sourceUrls } : {}),
        ...(checkedAt ? { checked_at: checkedAt } : {}),
        ...(verificationMethod ? { verification_method: verificationMethod } : {}),
        ...(scope ? { scope } : {}),
        ...(volatility ? { volatility } : {}),
        ...(recheckBy ? { recheck_by: recheckBy } : {}),
      };

      if (!apply) continue;

      const { error: updateError } = await supabase
        .from('claims')
        .update({
          value_json: nextValueJson,
          source_domain: sourceDomain,
          policy_snapshot: nextPolicySnapshot,
        })
        .eq('id', row.id);

      if (updateError) {
        failed += 1;
        console.error(`Failed to update claim ${row.id}: ${updateError.message}`);
      } else {
        updated += 1;
      }
    }

    if (rows.length < batchSize) break;
  }

  console.log('\nSummary');
  console.log(`Scanned: ${scanned}`);
  console.log(`Needs backfill: ${candidates}`);
  if (apply) {
    console.log(`Updated: ${updated}`);
    console.log(`Failed: ${failed}`);
  } else {
    console.log('No updates applied. Re-run with --apply to persist changes.');
  }

  if (apply && failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
