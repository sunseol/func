import { spawn } from 'node:child_process';
import { copyFile, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, '../..');
export const CANONICAL_MIGRATIONS_DIR = path.join(REPOSITORY_ROOT, 'database', 'migrations');
export const GENERATED_MIGRATIONS_DIR = path.join(REPOSITORY_ROOT, 'supabase', 'migrations');
export const SUPABASE_PROJECT_ID = 'funcommute-e2e';
export const SUPABASE_PORTS = Object.freeze({
  shadow: 55420,
  api: 55421,
  db: 55422,
  studio: 55423,
  inbucket: 55424,
  inbucketSmtp: 55425,
  inbucketPop3: 55426,
  analytics: 55427,
  analyticsVector: 55428,
  pooler: 55429,
  edgeInspector: 55430,
});
const LOOPBACK_HOST = '127.0.0.1';
const MIGRATION_FILE_PATTERN = /^(\d+)_([A-Za-z0-9][A-Za-z0-9._-]*)\.sql$/;
const STATUS_PORT_KEYS = Object.freeze([
  ['API_URL', SUPABASE_PORTS.api],
  ['DB_URL', SUPABASE_PORTS.db],
  ['STUDIO_URL', SUPABASE_PORTS.studio],
  ['INBUCKET_URL', SUPABASE_PORTS.inbucket],
  ['ANALYTICS_URL', SUPABASE_PORTS.analytics],
  ['POOLER_URL', SUPABASE_PORTS.pooler],
]);
const SENSITIVE_OUTPUT_KEY_PATTERN = /((?<![A-Z0-9_])["']?(?:[A-Z0-9_]*(?:ANON_KEY|SERVICE_ROLE_KEY|JWT_SECRET|JWT|TOKEN|PASSWORD|PASSWD|SECRET_KEY|SECRET|API_KEY|ACCESS_KEY|PRIVATE_KEY|DB_URL|DATABASE_URL|POSTGRES_URL|CONNECTION_STRING)|ANON\s+KEY|SERVICE(?:[_\s]+)ROLE\s+KEY|JWT\s+SECRET|(?:DB|DATABASE)\s+URL)["']?\s*(?::|=)\s*)(?:"(?:\\.|[^"\\])*"|'(?:''|[^'])*'|[^,\s}\n]+)/gi;
const URL_CREDENTIAL_PATTERN = /([A-Za-z][A-Za-z0-9+.-]*:\/\/[^/\s:@]+:)[^@\s]+(@)/g;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const SENSITIVE_ENV_KEY_PATTERN = /(?:KEY|TOKEN|PASSWORD|PASSWD|SECRET|CREDENTIAL|PRIVATE)/i;
export function parseHarnessArgs(args = []) {
  const playwrightArgs = [];
  let prepareOnly = false;
  let preserve = false;

  for (const arg of args) {
    switch (arg) {
      case '--prepare-only':
        prepareOnly = true;
        break;
      case '--keep-supabase':
        preserve = true;
        break;
      default:
        playwrightArgs.push(arg);
        break;
    }
  }

  return { prepareOnly, preserve, playwrightArgs };
}

export class HarnessCommandError extends Error {
  constructor(command, code, output, secrets = []) {
    const safeCommand = redactCommandOutput(command, secrets);
    super(`Command failed (${code}): ${safeCommand}`);
    this.name = 'HarnessCommandError';
    this.command = safeCommand;
    this.code = code;
    this.output = redactCommandOutput(output, secrets);
  }
}

export class ExistingSupabaseStackError extends Error {
  constructor() {
    super(
      'A Supabase stack is already running outside this harness. Stop the existing stack before running local E2E tests; the harness will not reset or stop it.',
    );
    this.name = 'ExistingSupabaseStackError';
  }
}

function migrationSortKey(file) {
  const match = MIGRATION_FILE_PATTERN.exec(file);
  if (!match) {
    throw new Error(`Canonical migration has an invalid name: ${file}`);
  }
  return { source: file, number: Number.parseInt(match[1], 10) };
}

/**
 * Return a deterministic, lexicographically ordered mapping for Supabase.
 * The generated sequence is intentionally independent of source prefixes so
 * duplicate canonical numbers (currently two 014 migrations) remain unique.
 */
export function buildMigrationPlan(files) {
  const ordered = [...files]
    .filter((file) => file.endsWith('.sql'))
    .map(migrationSortKey)
    .sort((left, right) => left.number - right.number || left.source.localeCompare(right.source));

  return ordered.map(({ source }, index) => ({
    source,
    target: `${String(index + 1).padStart(14, '0')}_${source}`,
  }));
}

export async function prepareMigrations({
  sourceDir = CANONICAL_MIGRATIONS_DIR,
  targetDir = GENERATED_MIGRATIONS_DIR,
} = {}) {
  const files = (await readdir(sourceDir)).filter((file) => MIGRATION_FILE_PATTERN.test(file));
  const plan = buildMigrationPlan(files);
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });
  await Promise.all(plan.map(({ source, target }) => copyFile(path.join(sourceDir, source), path.join(targetDir, target))));
  return plan;
}

function parseStatusValue(raw) {
  const value = raw.trim();
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replaceAll('\\"', '"').replaceAll('\\\\', '\\');
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  return value;
}

export function parseStatusEnv(output) {
  const parsed = {};
  for (const line of output.split(/\r?\n/)) {
    const match = /^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line.trim());
    if (!match) continue;
    parsed[match[1]] = parseStatusValue(match[2]);
  }
  return parsed;
}

export function isCurrentSupabaseStack(statusOutput) {
  const status = parseStatusEnv(statusOutput);
  return STATUS_PORT_KEYS.every(([key, expectedPort]) => {
    const value = status[key];
    if (!value) return key !== 'API_URL';
    try {
      return new URL(value).port === String(expectedPort);
    } catch {
      return false;
    }
  });
}

export function redactSecrets(text, secrets = []) {
  const value = typeof text === 'string' ? text : String(text ?? '');
  return [...new Set(secrets.filter((secret) => typeof secret === 'string' && secret.length > 0))]
    .sort((left, right) => right.length - left.length)
    .reduce((result, secret) => result.replaceAll(secret, '[REDACTED]'), value);
}

export function redactCommandOutput(text, secrets = []) {
  const value = typeof text === 'string' ? text : String(text ?? '');
  const redactedFields = value.replace(SENSITIVE_OUTPUT_KEY_PATTERN, '$1[REDACTED]');
  const redactedUrls = redactedFields.replace(URL_CREDENTIAL_PATTERN, '$1[REDACTED]$2');
  const redactedBearerTokens = redactedUrls.replace(BEARER_TOKEN_PATTERN, 'Bearer [REDACTED]');
  return redactSecrets(redactedBearerTokens, secrets);
}

function sensitiveEnvValues(env) {
  return Object.entries(env)
    .filter(([name]) => SENSITIVE_ENV_KEY_PATTERN.test(name))
    .map(([, value]) => value)
    .filter((value) => typeof value === 'string' && value.length > 0);
}

export function statusToProcessEnv(status, baseEnv = process.env) {
  const url = status.API_URL;
  const anonKey = status.ANON_KEY;
  const serviceRoleKey = status.SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    const missing = [
      ['API_URL', url],
      ['ANON_KEY', anonKey],
      ['SERVICE_ROLE_KEY', serviceRoleKey],
    ].filter(([, value]) => !value).map(([name]) => name);
    throw new Error(`Supabase status did not provide required values: ${missing.join(', ')}`);
  }
  return {
    ...baseEnv,
    E2E_LOCAL_SUPABASE: '1',
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  };
}

export function shouldTeardown({ startedByHarness, preserve }) {
  return {
    stopSupabase: startedByHarness && !preserve,
    removeGeneratedMigrations: !preserve,
  };
}

export async function allocateLoopbackPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({ host: LOOPBACK_HOST, port: 0 }, resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    throw new Error('Unable to determine the allocated loopback port');
  }

  const port = address.port;
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  return port;
}

export function buildPlaywrightWebServerCommand(port) {
  return `npm run start -- --hostname ${LOOPBACK_HOST} --port ${port}`;
}

function runCommand(command, args, { cwd = REPOSITORY_ROOT, env = process.env, capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    });
    const output = [];
    if (capture) {
      child.stdout.on('data', (chunk) => output.push(chunk.toString()));
      child.stderr.on('data', (chunk) => output.push(chunk.toString()));
    }
    child.on('error', (error) => reject(error));
    child.on('close', (code, signal) => {
      const text = output.join('');
      if (code === 0) {
        resolve(text);
        return;
      }
      reject(new HarnessCommandError([command, ...args].join(' '), code ?? signal ?? 'unknown', text, sensitiveEnvValues(env)));
    });
  });
}

export async function inspectSupabaseStack(
  runStatus = () => runCommand('supabase', ['status', '-o', 'env'], { capture: true }),
) {
  try {
    const statusOutput = await runStatus();
    return isCurrentSupabaseStack(statusOutput)
      ? { startedByHarness: false, statusOutput }
      : { startedByHarness: true, statusOutput: null };
  } catch (error) {
    if (error instanceof HarnessCommandError) {
      return { startedByHarness: true, statusOutput: null };
    }
    throw error;
  }
}

async function stopSupabase(statusSecrets, run = runCommand, writeError = (text) => process.stderr.write(text)) {
  try {
    await run('supabase', ['stop', '--project-id', SUPABASE_PROJECT_ID], { capture: true });
  } catch (error) {
    if (error instanceof HarnessCommandError) {
      writeError(redactCommandOutput(error.output, statusSecrets));
    }
    throw error;
  }
}

export async function runHarness({
  prepare = prepareMigrations,
  prepareOnly = false,
  preserve = false,
  playwrightArgs = [],
  skipSupabase = false,
  run = runCommand,
  inspectStack,
  removeMigrations = () => rm(GENERATED_MIGRATIONS_DIR, { recursive: true, force: true }),
  writeOutput = (text) => process.stdout.write(text),
  writeError = (text) => process.stderr.write(text),
  env = process.env,
  allocatePort = allocateLoopbackPort,
} = {}) {
  const plan = await prepare();
  writeOutput(`Prepared ${plan.length} local migrations in ${path.relative(REPOSITORY_ROOT, GENERATED_MIGRATIONS_DIR)}\n`);
  if (prepareOnly) return;

  const inspect = inspectStack ?? (() => inspectSupabaseStack(() => run('supabase', ['status', '-o', 'env'], { capture: true })));

  let startedByHarness = false;
  let statusSecrets = [];
  let failure;
  try {
    let childEnv = { ...env };
    if (!skipSupabase) {
      const stack = await inspect();
      if (!stack.startedByHarness) {
        throw new ExistingSupabaseStackError();
      }
      // Mark ownership before starting so a partially-started CLI invocation
      // is still followed by a best-effort stop in the finally block.
      startedByHarness = true;
      await run('supabase', ['start'], { capture: true });
      const statusOutput = stack.statusOutput ?? await run('supabase', ['status', '-o', 'env'], { capture: true });
      const status = parseStatusEnv(statusOutput);
      statusSecrets = [status.ANON_KEY, status.SERVICE_ROLE_KEY, status.JWT_SECRET, status.DB_URL].filter(Boolean);
      childEnv = statusToProcessEnv(status, childEnv);
      await run('supabase', ['db', 'reset'], { capture: true });
    }
    const webServerPort = await allocatePort();
    const webServerBaseUrl = `http://${LOOPBACK_HOST}:${webServerPort}`;
    if (!env.CI && !childEnv.PLAYWRIGHT_CHANNEL) childEnv.PLAYWRIGHT_CHANNEL = 'chrome';
    childEnv.PLAYWRIGHT_BASE_URL = webServerBaseUrl;
    childEnv.PLAYWRIGHT_WEB_SERVER_COMMAND = buildPlaywrightWebServerCommand(webServerPort);
    childEnv.PLAYWRIGHT_REUSE_SERVER = '0';
    if (env.E2E_LIVE_AI !== '1') delete childEnv.GROQ_API_KEY;
    await run('npm', ['run', 'build'], { env: childEnv });
    const testArgs = ['run', 'test:e2e'];
    if (playwrightArgs.length > 0) testArgs.push('--', ...playwrightArgs);
    await run('npm', testArgs, { env: childEnv });
  } catch (error) {
    failure = error;
    if (error instanceof HarnessCommandError && error.output) {
      error.output = redactCommandOutput(error.output, statusSecrets);
      writeError(error.output);
    }
  } finally {
    const decision = shouldTeardown({ startedByHarness, preserve });
    if (decision.stopSupabase) {
      try {
        await stopSupabase(statusSecrets, run, writeError);
      } catch (error) {
        if (!failure) failure = error;
      }
    }
    if (decision.removeGeneratedMigrations) {
      await removeMigrations();
    }
  }
  if (failure) throw failure;
}

async function main() {
  const { prepareOnly, preserve, playwrightArgs } = parseHarnessArgs(process.argv.slice(2));
  await runHarness({
    prepareOnly,
    preserve: preserve || process.env.E2E_KEEP_SUPABASE === '1',
    playwrightArgs,
    skipSupabase: process.env.E2E_SKIP_SUPABASE === '1',
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    if (error instanceof HarnessCommandError) {
      process.stderr.write(`${error.message}\n`);
    } else if (error instanceof Error) {
      process.stderr.write(`${error.message}\n`);
    } else {
      process.stderr.write('E2E harness failed\n');
    }
    process.exitCode = 1;
  });
}
