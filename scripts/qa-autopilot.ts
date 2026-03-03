#!/usr/bin/env npx tsx

import { spawnSync } from 'node:child_process';

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function getArgValue(name: string): string | null {
  const found = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!found) return null;
  return found.split('=').slice(1).join('=').trim();
}

type StepResult = {
  title: string;
  output: string;
};

function runStep(title: string, args: string[]): StepResult {
  console.log(`\n=== ${title} ===`);
  console.log(`$ npm ${args.join(' ')}`);
  const result = spawnSync('npm', args, {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`Step failed: ${title}`);
  }
  return { title, output };
}

function extractFirstNumber(output: string, pattern: RegExp): number {
  const match = output.match(pattern);
  if (!match) return 0;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractFirstNullableNumber(output: string, pattern: RegExp): number | null {
  const match = output.match(pattern);
  if (!match) return null;
  const raw = match[1]?.trim().toLowerCase();
  if (!raw || raw === 'n/a' || raw === 'na') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

async function postWebhookNotifications(payload: {
  ok: boolean;
  message: string;
  details: string[];
}) {
  const discord = process.env.DISCORD_WEBHOOK_URL;
  const slack = process.env.SLACK_WEBHOOK_URL;
  const detailText = payload.details.length > 0 ? payload.details.join('\n') : 'No details.';

  if (discord) {
    const body = {
      embeds: [
        {
          title: payload.ok ? 'QA Autopilot Completed' : 'QA Autopilot Failed',
          description: payload.message,
          color: payload.ok ? 3066993 : 15158332,
          fields: [
            {
              name: 'Details',
              value: detailText.slice(0, 1000),
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };
    await fetch(discord, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  if (slack) {
    const text = `${payload.ok ? '✅' : '❌'} ${payload.message}\n${detailText}`;
    await fetch(slack, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  }
}

async function main() {
  const dryRun = hasFlag('dry-run');
  const skipWorker = hasFlag('skip-worker');

  const recomputeLimit = getArgValue('recompute-limit') || '800';
  const gatesLimit = getArgValue('gates-limit') || '120';
  const maxPublish = getArgValue('max-publish') || '40';
  const ideasLimit = getArgValue('ideas-limit') || '10';
  const refreshLimit = getArgValue('refresh-limit') || '50';
  const refreshPriority = getArgValue('refresh-priority') || '95';
  const blockedLimit = getArgValue('blocked-limit') || '20';
  const blockedPriority = getArgValue('blocked-priority') || '92';
  const blockedReasons =
    getArgValue('blocked-reasons') ||
    'missing_required_sections,mvup_incomplete,authoritative_sources_low,authoritative_domains_low';
  const workerBatch = getArgValue('worker-batch') || '5';
  const renderedSample = getArgValue('rendered-sample') || '15';
  const maxMissingActionabilityArg = Number(getArgValue('max-missing-actionability') || '0');
  const maxMissingActionability = Number.isFinite(maxMissingActionabilityArg)
    ? Math.max(0, Math.floor(maxMissingActionabilityArg))
    : 0;
  const maxCopyBelowThresholdArg = Number(getArgValue('max-copy-below-threshold') || '0');
  const maxCopyBelowThreshold = Number.isFinite(maxCopyBelowThresholdArg)
    ? Math.max(0, Math.floor(maxCopyBelowThresholdArg))
    : 0;
  const maxCopyMissingScenarioArg = Number(getArgValue('max-copy-missing-scenario') || '0');
  const maxCopyMissingScenario = Number.isFinite(maxCopyMissingScenarioArg)
    ? Math.max(0, Math.floor(maxCopyMissingScenarioArg))
    : 0;

  console.log('\nQA Autopilot');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}`);

  const details: string[] = [];

  try {
    runStep('Typecheck', ['run', 'typecheck']);
    runStep('Rendered tool pages gate', [
      'run',
      'qa:rendered-tool-pages',
      '--',
      `--sample=${renderedSample}`,
    ]);

    const recomputeArgs = ['run', 'qa:recompute-quality', '--', `--limit=${recomputeLimit}`];
    if (!dryRun) recomputeArgs.push('--apply');
    const recomputeResult = runStep('Recompute quality snapshots', recomputeArgs);
    const changedSnapshots = extractFirstNumber(
      recomputeResult.output,
      /Items with changed quality snapshot:\s*(\d+)/i
    );
    details.push(`Changed snapshots: ${changedSnapshots}`);

    const gatesArgs = [
      'run',
      'qa:gates',
      '--',
      `--limit=${gatesLimit}`,
      '--min-reviews=0',
      '--publish-safe',
      `--max-publish=${maxPublish}`,
    ];
    if (!dryRun) gatesArgs.push('--apply');
    const gatesResult = runStep('Audit gate blockers and publish safe drafts', gatesArgs);
    const publishedCount = extractFirstNumber(gatesResult.output, /Published\s+(\d+)\s+review\(s\)/i);
    const actionabilityMin = extractFirstNumber(gatesResult.output, /min threshold:\s*(\d+)/i);
    const actionabilityAvg = extractFirstNullableNumber(
      gatesResult.output,
      /average score:\s*([0-9.]+|n\/a)/i
    );
    const actionabilityBelow = extractFirstNumber(gatesResult.output, /below threshold:\s*(\d+)/i);
    const actionabilityMissing = extractFirstNumber(gatesResult.output, /missing score:\s*(\d+)/i);
    const missingActionabilityBlockers = extractFirstNumber(
      gatesResult.output,
      /(\d+)x\s+missing_actionability_score/i
    );
    details.push(`Published safe drafts: ${publishedCount}`);
    details.push(
      `Actionability: min=${actionabilityMin || 'n/a'} avg=${
        actionabilityAvg === null ? 'n/a' : actionabilityAvg.toFixed(1)
      } below=${actionabilityBelow} missing=${actionabilityMissing}`
    );
    details.push(
      `Actionability blockers: missing_actionability_score=${missingActionabilityBlockers} (max ${maxMissingActionability})`
    );
    const copyQualityMin = extractFirstNumber(gatesResult.output, /Copy quality metrics:[\s\S]*?min threshold:\s*(\d+)/i);
    const copyQualityAvg = extractFirstNullableNumber(
      gatesResult.output,
      /Copy quality metrics:[\s\S]*?average score:\s*([0-9.]+|n\/a)/i
    );
    const copyQualityBelow = extractFirstNumber(
      gatesResult.output,
      /Copy quality metrics:[\s\S]*?below threshold:\s*(\d+)/i
    );
    const copyMissingScenario = extractFirstNumber(
      gatesResult.output,
      /Copy quality metrics:[\s\S]*?missing scenario recos:\s*(\d+)/i
    );
    const copyGenericHits = extractFirstNumber(
      gatesResult.output,
      /Copy quality metrics:[\s\S]*?generic phrase hits \(total\):\s*(\d+)/i
    );
    details.push(
      `Copy quality: min=${copyQualityMin || 'n/a'} avg=${
        copyQualityAvg === null ? 'n/a' : copyQualityAvg.toFixed(1)
      } below=${copyQualityBelow} missing_scenario=${copyMissingScenario} generic_hits=${copyGenericHits}`
    );
    details.push(
      `Copy blockers: below_threshold=${copyQualityBelow} (max ${maxCopyBelowThreshold}) missing_scenario=${copyMissingScenario} (max ${maxCopyMissingScenario})`
    );
    if (missingActionabilityBlockers > maxMissingActionability) {
      throw new Error(
        `Fail-fast: missing_actionability_score=${missingActionabilityBlockers} exceeds max=${maxMissingActionability}`
      );
    }
    if (copyQualityBelow > maxCopyBelowThreshold) {
      throw new Error(
        `Fail-fast: copy_below_threshold=${copyQualityBelow} exceeds max=${maxCopyBelowThreshold}`
      );
    }
    if (copyMissingScenario > maxCopyMissingScenario) {
      throw new Error(
        `Fail-fast: copy_missing_scenario=${copyMissingScenario} exceeds max=${maxCopyMissingScenario}`
      );
    }

    if (!dryRun) {
      const ideasResult = runStep('Queue new content ideas', [
        'run',
        'queue-ideas',
        '--',
        '--all',
        '--min-priority',
        '0',
        '--limit',
        ideasLimit,
      ]);
      const queuedIdeas = extractFirstNumber(ideasResult.output, /Queued:\s*(\d+)/i);
      details.push(`New ideas queued: ${queuedIdeas}`);
    } else {
      console.log('\nSkipping queue-ideas step in dry run mode.');
      details.push('New ideas queue skipped (dry run)');
    }

    const blockedArgs = [
      'run',
      'qa:queue-blocked-rehunt',
      '--',
      `--limit=${blockedLimit}`,
      `--priority=${blockedPriority}`,
      `--reasons=${blockedReasons}`,
      '--cooldown-hours=168',
    ];
    if (!dryRun) blockedArgs.push('--apply');
    const blockedResult = runStep('Queue blocked drafts for full re-hunt', blockedArgs);
    const blockedQueued = extractFirstNumber(blockedResult.output, /Enqueued\s+(\d+)\s+full re-hunt job/i);
    details.push(`Blocked re-hunts queued: ${blockedQueued}`);

    const refreshArgs = [
      'run',
      'qa:queue-volatile-refresh',
      '--',
      `--limit=${refreshLimit}`,
      `--priority=${refreshPriority}`,
      '--cooldown-hours=168',
    ];
    if (!dryRun) refreshArgs.push('--apply');
    const refreshResult = runStep('Queue volatile refresh jobs', refreshArgs);
    const volatileQueued = extractFirstNumber(refreshResult.output, /Enqueued\s+(\d+)\s+price_only refresh job/i);
    details.push(`Volatile refresh queued: ${volatileQueued}`);

    if (!skipWorker && !dryRun) {
      const workerResult = runStep('Process queue batch', [
        'run',
        'queue:worker',
        '--',
        '--once',
        `--batch=${workerBatch}`,
      ]);
      const processed = extractFirstNumber(workerResult.output, /Results:\s*(\d+)\s+processed/i);
      details.push(`Queue processed: ${processed}`);
    } else {
      console.log('\nSkipping queue worker step.');
      details.push('Queue worker skipped');
    }

    console.log('\nQA autopilot complete.');
    await postWebhookNotifications({
      ok: true,
      message: `Mode=${dryRun ? 'DRY RUN' : 'APPLY'} QA autopilot finished.`,
      details,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    await postWebhookNotifications({
      ok: false,
      message: `QA autopilot failed: ${message}`,
      details,
    });
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unexpected error');
  process.exit(1);
});
