#!/usr/bin/env node

const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const { resolve } = require('node:path');

require('dotenv').config({
  path: resolve(__dirname, '../.env'),
  quiet: true,
});

const LEVEL_PRIORITY = {
  DEBUG: 10,
  INFO: 20,
  WARNING: 30,
  ERROR: 40,
};

function getLogLevel() {
  const value = String(process.env.LOG_LEVEL ?? 'INFO').toUpperCase();

  if (value === 'DEBUG' || value === 'INFO' || value === 'WARNING' || value === 'ERROR') {
    return value;
  }

  return 'INFO';
}

function shouldLog(level) {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[getLogLevel()];
}

function writeJsonLog(level, message, metadata = {}) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context: 'StartupScript',
    ...metadata,
  };

  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function pipeStructuredLines(stream, level, metadata) {
  const reader = createInterface({ input: stream });

  reader.on('line', (line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return;
    }

    try {
      JSON.parse(trimmed);
      process.stdout.write(`${trimmed}\n`);
    } catch {
      writeJsonLog(level, trimmed, metadata);
    }
  });
}

function runProcess(command, args, metadata, levels = { stdout: 'INFO', stderr: 'ERROR' }) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: resolve(__dirname, '..'),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    pipeStructuredLines(child.stdout, levels.stdout, metadata);
    pipeStructuredLines(child.stderr, levels.stderr, metadata);

    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`));
    });

    child.on('error', rejectPromise);
  });
}

async function main() {
  writeJsonLog('INFO', 'Starting backend container bootstrap', {
    logLevel: getLogLevel(),
    authEnabled: process.env.AUTH_ENABLED === 'true',
  });

  writeJsonLog('INFO', 'Applying Prisma migrations', {
    source: 'prisma-migrate',
  });

  const prismaCliPath = require.resolve('prisma/build/index.js');
  await runProcess(
    process.execPath,
    [prismaCliPath, 'migrate', 'deploy'],
    {
      source: 'prisma-migrate',
    },
    {
      stdout: 'INFO',
      stderr: 'INFO',
    },
  );

  writeJsonLog('INFO', 'Prisma migrations applied', {
    source: 'prisma-migrate',
  });

  writeJsonLog('INFO', 'Starting backend HTTP process', {
    source: 'backend-process',
  });

  await runProcess(process.execPath, [resolve(__dirname, '../dist/main.js')], {
    source: 'backend-process',
  });
}

main().catch((error) => {
  writeJsonLog('ERROR', 'Backend startup script failed', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });
  process.exit(1);
});
