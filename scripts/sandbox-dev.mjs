#!/usr/bin/env node
/**
 * Sandbox /dev helpers for chaos + burst exercises (DEV-01…03).
 *
 * Usage:
 *   npm run sandbox:reset
 *   npm run sandbox:chaos-off
 *   npm run sandbox:chaos -- --rate 0.3 --latency 3000 --hold 20
 *   npm run sandbox:burst
 *
 * Requires gitignored `.env` with:
 *   SANDBOX_EMAIL=...
 *   SANDBOX_PASSWORD=...
 * Optional:
 *   EXPO_PUBLIC_API_BASE_URL=https://sandbox3.staging.iamwarpspeed.com/v1
 *
 * Always restores chaos to 0 after a timed chaos hold (AS-24).
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DEFAULT_BASE = 'https://sandbox3.staging.iamwarpspeed.com/v1';

function loadEnvFile() {
  const path = resolve(ROOT, '.env');
  if (!existsSync(path)) {
    return;
  }
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

async function api(baseUrl, path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    const message = json?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`${method} ${path} failed: ${message}`);
  }
  return json;
}

async function login(baseUrl, email, password) {
  const json = await api(baseUrl, '/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  const accessToken = json?.data?.accessToken;
  if (!accessToken) {
    throw new Error('Login succeeded but accessToken missing from envelope.');
  }
  return accessToken;
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function main() {
  loadEnvFile();
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const baseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');
  const email = process.env.SANDBOX_EMAIL;
  const password = process.env.SANDBOX_PASSWORD;

  if (!command || args.help) {
    console.log(`Commands: reset | chaos | chaos-off | burst
Examples:
  npm run sandbox:reset
  npm run sandbox:chaos -- --rate 0.3 --latency 3000 --hold 20
  npm run sandbox:chaos-off
  npm run sandbox:burst`);
    process.exit(command ? 0 : 1);
  }

  if (!email || !password) {
    console.error(
      'Missing SANDBOX_EMAIL / SANDBOX_PASSWORD in environment or gitignored .env.\n' +
        'Live /dev calls are blocked until credentials are supplied (ENV-04).',
    );
    process.exit(2);
  }

  console.log(`Using API ${baseUrl}`);
  const token = await login(baseUrl, email, password);
  console.log('Authenticated.');

  if (command === 'reset') {
    await api(baseUrl, '/dev/reset', { method: 'POST', token });
    console.log('Reset complete.');
    return;
  }

  if (command === 'chaos-off' || command === 'off') {
    await api(baseUrl, '/dev/chaos', {
      method: 'POST',
      token,
      body: { failureRate: 0, latencyMs: 0 },
    });
    console.log('Chaos restored to failureRate=0, latencyMs=0.');
    return;
  }

  if (command === 'burst') {
    await api(baseUrl, '/dev/burst', { method: 'POST', token });
    console.log('Burst triggered (~200 threads / ~10s). Observe the inbox + sync.');
    return;
  }

  if (command === 'chaos') {
    const failureRate = Number(args.rate ?? 0.3);
    const latencyMs = Number(args.latency ?? 3000);
    const holdSeconds = Number(args.hold ?? 20);
    if (!(failureRate >= 0 && failureRate <= 1) || !(latencyMs >= 0) || !(holdSeconds >= 0)) {
      throw new Error('Invalid --rate / --latency / --hold values.');
    }

    console.log(`Enabling chaos failureRate=${failureRate} latencyMs=${latencyMs}`);
    await api(baseUrl, '/dev/chaos', {
      method: 'POST',
      token,
      body: { failureRate, latencyMs },
    });

    try {
      console.log(`Holding for ${holdSeconds}s — exercise the app now, then chaos will turn off.`);
      await sleep(holdSeconds * 1000);
    } finally {
      await api(baseUrl, '/dev/chaos', {
        method: 'POST',
        token,
        body: { failureRate: 0, latencyMs: 0 },
      });
      console.log('Chaos restored to failureRate=0, latencyMs=0.');
    }
    console.log('Record observations in docs/chaos-observations.md');
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
