#!/usr/bin/env node

import { spawn } from 'node:child_process';

const port = process.env.PLAYWRIGHT_PORT || '4322';
const baseUrl = `http://127.0.0.1:${port}`;
const playwrightArgs = process.argv.slice(2);

function runCommand(command, label, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command;
    console.log(`\n=== ${label} ===`);
    console.log(`$ ${cmd} ${args.join(' ')}`);

    const child = spawn(cmd, args, {
      stdio: 'inherit',
      env: { ...process.env, ...extraEnv },
    });

    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} failed with exit code ${code ?? 'unknown'}`));
    });
  });
}

function stopDevServer(devServer) {
  if (!devServer || devServer.pid == null) return;
  if (devServer.exitCode !== null) return;
  devServer.kill('SIGTERM');
}

async function waitForServer(timeoutMs, label) {
  await runCommand(['npx', 'wait-on', baseUrl, '--timeout', String(timeoutMs)], label);
}

async function startServerWithFallback() {
  const spawnOptions = {
    stdio: 'inherit',
    env: process.env,
  };

  let server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', port], spawnOptions);
  try {
    await waitForServer(45_000, 'Wait for preview server');
    return server;
  } catch {
    stopDevServer(server);
    console.warn('Preview startup failed; falling back to dev server for E2E.');

    server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', port], spawnOptions);
    await waitForServer(120_000, 'Wait for dev server');
    return server;
  }
}

async function main() {
  let devServer = null;
  const teardown = () => stopDevServer(devServer);

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
    await runCommand(['npm', 'run', 'codex:build'], 'Build for E2E');
    devServer = await startServerWithFallback();

    await runCommand(['npx', 'playwright', 'test', ...playwrightArgs], 'Playwright E2E', {
      PLAYWRIGHT_EXTERNAL_SERVER: '1',
      PLAYWRIGHT_PORT: port,
    });
  } finally {
    teardown();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
