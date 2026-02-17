#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const TOOL_COMMANDS = {
  gate_check: {
    command: ['npm', 'run', 'codex:check'],
    description: 'Run baseline correctness checks (typecheck, lint, unit tests).',
  },
  gate_build: {
    command: ['npm', 'run', 'codex:build'],
    description: 'Run production build verification.',
  },
  gate_e2e: {
    command: ['npm', 'run', 'codex:e2e'],
    description: 'Run Playwright end-to-end test suite.',
  },
  gate_content: {
    command: ['npm', 'run', 'codex:verify:content'],
    description: 'Run content quality gate checks.',
  },
  gate_links: {
    command: ['npm', 'run', 'codex:verify:links'],
    description: 'Run affiliate and correction link verification checks.',
  },
  gate_lhci: {
    command: ['npm', 'run', 'codex:lhci'],
    description: 'Run Lighthouse CI assertions for performance, SEO, and accessibility.',
  },
  gate_design_pass: {
    command: ['npm', 'run', 'design:pass'],
    description:
      'Run frontend design pass (Playwright UI screenshot audit + Lighthouse CI assertions).',
  },
  format_fix: {
    command: ['npm', 'run', 'codex:format'],
    description: 'Apply repository formatting fixes.',
  },
};

const MAX_OUTPUT_CHARS = 24_000;

function truncate(value) {
  if (value.length <= MAX_OUTPUT_CHARS) return value;
  return `${value.slice(0, MAX_OUTPUT_CHARS)}\n...<truncated>`;
}

function executeAllowedCommand(command) {
  return new Promise((resolve) => {
    const [cmd, ...args] = command;
    const child = spawn(cmd, args, {
      env: process.env,
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      stderr += `\nFailed to run command: ${error.message}`;
      resolve({
        exitCode: -1,
        stdout,
        stderr,
      });
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code ?? -1,
        stdout,
        stderr,
      });
    });
  });
}

function formatResult(command, result) {
  const parts = [
    `command: ${command.join(' ')}`,
    `exit_code: ${result.exitCode}`,
    `stdout:\n${truncate(result.stdout.trim() || '<empty>')}`,
    `stderr:\n${truncate(result.stderr.trim() || '<empty>')}`,
  ];
  return parts.join('\n\n');
}

async function main() {
  const server = new McpServer({
    name: 'stackhunt-gates',
    version: '1.0.0',
  });

  for (const [toolName, config] of Object.entries(TOOL_COMMANDS)) {
    server.registerTool(
      toolName,
      {
        description: config.description,
      },
      async () => {
        const result = await executeAllowedCommand(config.command);
        return {
          content: [{ type: 'text', text: formatResult(config.command, result) }],
          isError: result.exitCode !== 0,
        };
      }
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
