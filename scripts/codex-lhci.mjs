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

function stopPreviewServer(preview) {
  if (!preview || preview.pid == null) return;
  if (preview.exitCode !== null) return;

  if (process.platform === 'win32') {
    preview.kill('SIGTERM');
    return;
  }

  try {
    process.kill(-preview.pid, 'SIGTERM');
  } catch {
    preview.kill('SIGTERM');
  }
}

async function waitForServer(url, timeoutMs) {
  await runCommand(['npx', 'wait-on', url, '--timeout', String(timeoutMs)], 'Wait for preview');
}

async function startServerWithFallback() {
  const commonOptions = {
    stdio: 'inherit',
    env: process.env,
    detached: process.platform !== 'win32',
  };

  let preview = spawn('npm', ['run', 'codex:preview:serve'], commonOptions);
  try {
    await waitForServer('http://127.0.0.1:4321', 30_000);
    return preview;
  } catch (error) {
    stopPreviewServer(preview);
    console.warn('Preview server failed, falling back to dev server for LHCI.');

    preview = spawn('npm', ['run', 'dev', '--', '--port', '4321', '--host', '127.0.0.1'], commonOptions);
    await waitForServer('http://127.0.0.1:4321', 120_000);
    return preview;
  }
}

async function main() {
  let preview = null;

  const teardown = () => stopPreviewServer(preview);
  process.on('exit', teardown);
  process.on('SIGINT', () => {
    teardown();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    teardown();
    process.exit(143);
  });

  try {
    await runCommand(['npm', 'run', 'codex:build'], 'Build');
    preview = await startServerWithFallback();
    await runCommand(['lhci', 'autorun'], 'Lighthouse CI');
  } finally {
    teardown();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
