import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import test from 'node:test';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWebServerEnv } from './playwright-env.mjs';

import {
  buildMigrationPlan,
  ExistingSupabaseStackError,
  inspectSupabaseStack,
  parseStatusEnv,
  parseHarnessArgs,
  prepareMigrations,
  redactSecrets,
  runHarness,
  shouldTeardown,
  statusToProcessEnv,
  SUPABASE_PORTS,
  SUPABASE_PROJECT_ID,
  HarnessCommandError,
} from './local-supabase.mjs';

const currentApiUrl = `http://127.0.0.1:${SUPABASE_PORTS.api}`;
const statusOutputFor = (apiUrl = currentApiUrl) => [
  `API_URL="${apiUrl}"`,
  'ANON_KEY="anon-secret"',
  'SERVICE_ROLE_KEY="service-secret"',
].join('\n');

test('web server environment excludes service and E2E credentials', () => {
  const webServerEnv = buildWebServerEnv({
    NODE_ENV: 'test',
    NEXT_PUBLIC_SUPABASE_URL: currentApiUrl,
    SUPABASE_SERVICE_ROLE_KEY: 'service-secret',
    E2E_LOCAL_SUPABASE: '1',
    E2E_AUTH_EMAIL: 'admin@test.com',
    OMITTED_OPTIONAL_VALUE: undefined,
  });

  assert.deepEqual(webServerEnv, {
    NODE_ENV: 'test',
    NEXT_PUBLIC_SUPABASE_URL: currentApiUrl,
  });
});

test('pre-existing Supabase stack is detected as not harness-owned', async () => {
  const statusOutput = `API_URL="${currentApiUrl}"\nANON_KEY="anon-secret"\n`;

  const stack = await inspectSupabaseStack(async () => statusOutput);

  assert.deepEqual(stack, { startedByHarness: false, statusOutput });
  assert.equal(shouldTeardown({ startedByHarness: stack.startedByHarness, preserve: false }).stopSupabase, false);
});

test('existing Supabase stack aborts without start, reset, or stop', async () => {
  const calls = [];
  const statusOutput = statusOutputFor();

  await assert.rejects(
    runHarness({
      prepare: async () => [],
      run: async (command, args) => {
        calls.push([command, ...args]);
        return statusOutput;
      },
      writeOutput: () => {},
      removeMigrations: async () => {},
    }),
    (error) => {
      assert.ok(error instanceof ExistingSupabaseStackError);
      assert.match(error.message, /already running/i);
      assert.match(error.message, /will not reset or stop/i);
      return true;
    },
  );

  assert.deepEqual(calls, [['supabase', 'status', '-o', 'env']]);
});

test('absent Supabase stack is treated as harness-owned after status fails', async () => {
  const stack = await inspectSupabaseStack(async () => {
    throw new HarnessCommandError('supabase status -o env', 1, 'stack is not running');
  });

  assert.deepEqual(stack, { startedByHarness: true, statusOutput: null });
});

test('another project on the default API port is not treated as the current stack', async () => {
  const stack = await inspectSupabaseStack(async () => statusOutputFor('http://127.0.0.1:54321'));

  assert.deepEqual(stack, { startedByHarness: true, statusOutput: null });
});

test('a status payload with a dedicated API but conflicting database port is not current', async () => {
  const stack = await inspectSupabaseStack(async () => `${statusOutputFor()}\nDB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"`);

  assert.deepEqual(stack, { startedByHarness: true, statusOutput: null });
});

test('absent Supabase stack runs owned lifecycle and stops after tests', async () => {
  const calls = [];
  const statusOutput = statusOutputFor();
  const run = async (command, args) => {
    calls.push([command, ...args]);
    if (command === 'supabase' && args[0] === 'status' && calls.length === 1) {
      throw new HarnessCommandError('supabase status -o env', 1, 'stack is not running');
    }
    if (command === 'supabase' && args[0] === 'status') return statusOutput;
    return '';
  };

  await runHarness({
    prepare: async () => [],
    run,
    writeOutput: () => {},
    removeMigrations: async () => {},
  });

  assert.deepEqual(calls, [
    ['supabase', 'status', '-o', 'env'],
    ['supabase', 'start'],
    ['supabase', 'status', '-o', 'env'],
    ['supabase', 'db', 'reset'],
    ['npm', 'run', 'build'],
    ['npm', 'run', 'test:e2e'],
    ['supabase', 'stop', '--project-id', SUPABASE_PROJECT_ID],
  ]);
});

test('Playwright file, grep, and reporter args are forwarded after npm separator', async () => {
  const calls = [];
  const statusOutput = statusOutputFor();
  const run = async (command, args) => {
    calls.push([command, ...args]);
    if (command === 'supabase' && args[0] === 'status' && calls.length === 1) {
      throw new HarnessCommandError('supabase status -o env', 1, 'stack is not running');
    }
    if (command === 'supabase' && args[0] === 'status') return statusOutput;
    return '';
  };

  await runHarness({
    prepare: async () => [],
    playwrightArgs: ['e2e/auth.spec.ts', '--grep', 'QA-SIGN-001', '--reporter=line'],
    run,
    writeOutput: () => {},
    removeMigrations: async () => {},
  });

  assert.deepEqual(calls.at(-3), ['npm', 'run', 'build']);
  assert.deepEqual(calls.at(-2), [
    'npm',
    'run',
    'test:e2e',
    '--',
    'e2e/auth.spec.ts',
    '--grep',
    'QA-SIGN-001',
    '--reporter=line',
  ]);
});

test('owned Supabase stack stops and cleans migrations when tests fail', async () => {
  const calls = [];
  const cleanup = [];
  const errors = [];
  const statusOutput = statusOutputFor();
  const run = async (command, args) => {
    calls.push([command, ...args]);
    if (command === 'supabase' && args[0] === 'status' && calls.length === 1) {
      throw new HarnessCommandError('supabase status -o env', 1, 'stack is not running');
    }
    if (command === 'supabase' && args[0] === 'status') return statusOutput;
    if (command === 'npm' && args[1] === 'test:e2e') {
      throw new HarnessCommandError('npm run test:e2e', 1, 'test output anon-secret');
    }
    return '';
  };

  await assert.rejects(
    runHarness({
      prepare: async () => [],
      run,
      writeOutput: () => {},
      writeError: (message) => errors.push(message),
      removeMigrations: async () => cleanup.push('removed'),
    }),
    HarnessCommandError,
  );

  assert.deepEqual(calls.at(-1), ['supabase', 'stop', '--project-id', SUPABASE_PROJECT_ID]);
  assert.deepEqual(cleanup, ['removed']);
  assert.equal(errors.length, 1);
  assert.doesNotMatch(errors[0], /anon-secret/);
  assert.match(errors[0], /\[REDACTED\]/);
});

test('Supabase lifecycle output and failure errors never expose status credentials', async () => {
  const calls = [];
  const stdout = [];
  const stderr = [];
  const secrets = {
    anon: 'anon-key-arbitrary-value',
    serviceRole: 'service-role-arbitrary-value',
    jwt: 'jwt-secret-arbitrary-value',
    s3Access: 's3-access-arbitrary-value',
    s3Secret: 's3-secret-arbitrary-value',
    dbPassword: 'db-password-arbitrary-value',
  };
  const statusOutput = [
    `API_URL="${currentApiUrl}"`,
    `ANON_KEY="${secrets.anon}"`,
    `SERVICE_ROLE_KEY="${secrets.serviceRole}"`,
    `JWT_SECRET="${secrets.jwt}"`,
    `S3_PROTOCOL_ACCESS_KEY="${secrets.s3Access}"`,
    `S3_PROTOCOL_SECRET_KEY="${secrets.s3Secret}"`,
    `DB_URL="postgresql://postgres:${secrets.dbPassword}@127.0.0.1:${SUPABASE_PORTS.db}/postgres"`,
  ].join('\n');
  const humanStatusOutput = [
    `anon key: ${secrets.anon}`,
    `service_role key: ${secrets.serviceRole}`,
    `JWT secret: ${secrets.jwt}`,
    `DB URL: postgresql://postgres:${secrets.dbPassword}@127.0.0.1:${SUPABASE_PORTS.db}/postgres`,
  ].join('\n');
  const run = async (command, args, options = {}) => {
    calls.push({ command, args, options });
    if (command === 'supabase' && args[0] === 'status' && calls.filter(({ command: name, args: commandArgs }) => name === command && commandArgs[0] === 'status').length === 1) {
      throw new HarnessCommandError('supabase status -o env', 1, 'stack is not running');
    }
    if (command === 'supabase' && args[0] === 'start') {
      if (!options.capture) stdout.push(humanStatusOutput);
      return `started\n${humanStatusOutput}`;
    }
    if (command === 'supabase' && args[0] === 'status') return statusOutput;
    if (command === 'npm' && args[1] === 'test:e2e') {
      throw new HarnessCommandError('npm run test:e2e', 1, `e2e failed\n${statusOutput}\n${humanStatusOutput}`);
    }
    return '';
  };

  let failure;
  try {
    await runHarness({
      prepare: async () => [],
      run,
      writeOutput: (text) => stdout.push(text),
      writeError: (text) => stderr.push(text),
      removeMigrations: async () => {},
      allocatePort: async () => 55480,
    });
  } catch (error) {
    failure = error;
  }

  assert.ok(failure instanceof HarnessCommandError);
  assert.equal(calls.find(({ command, args }) => command === 'supabase' && args[0] === 'start').options.capture, true);
  assert.equal(calls.find(({ command, args }) => command === 'supabase' && args[0] === 'db' && args[1] === 'reset').options.capture, true);
  const observed = [stdout.join(''), stderr.join(''), failure.output, failure.message].join('\n');
  for (const secret of Object.values(secrets)) {
    assert.doesNotMatch(observed, new RegExp(secret));
  }
  assert.match(stderr.join(''), /\[REDACTED\]/);
});

test('harness allocates one loopback web port and disables stale Playwright server reuse', async () => {
  const invocations = [];
  const statusOutput = statusOutputFor();
  const run = async (command, args, options = {}) => {
    invocations.push({ command, args, options });
    if (command === 'supabase' && args[0] === 'status' && invocations.length === 1) {
      throw new HarnessCommandError('supabase status -o env', 1, 'stack is not running');
    }
    if (command === 'supabase' && args[0] === 'status') return statusOutput;
    return '';
  };

  await runHarness({
    prepare: async () => [],
    run,
    writeOutput: () => {},
    removeMigrations: async () => {},
    env: { CI: '', SERVICE_ROLE_KEY: 'service-secret', E2E_LOCAL_SUPABASE: '1' },
  });

  const build = invocations.find(({ command, args }) => command === 'npm' && args[1] === 'build');
  const e2e = invocations.find(({ command, args }) => command === 'npm' && args[1] === 'test:e2e');
  assert.ok(build);
  assert.ok(e2e);
  assert.equal(build.options.env.PLAYWRIGHT_REUSE_SERVER, '0');
  assert.equal(e2e.options.env.PLAYWRIGHT_REUSE_SERVER, '0');
  assert.match(build.options.env.PLAYWRIGHT_BASE_URL, /^http:\/\/127\.0\.0\.1:\d+$/);
  assert.equal(e2e.options.env.PLAYWRIGHT_BASE_URL, build.options.env.PLAYWRIGHT_BASE_URL);
  assert.equal(
    e2e.options.env.PLAYWRIGHT_WEB_SERVER_COMMAND,
    `npm run start -- --hostname 127.0.0.1 --port ${new URL(build.options.env.PLAYWRIGHT_BASE_URL).port}`,
  );
  assert.equal(e2e.options.env.SUPABASE_SERVICE_ROLE_KEY, 'service-secret');
});

test('a partially started stack is cleaned up only within the harness project', async () => {
  const calls = [];
  const run = async (command, args) => {
    calls.push([command, ...args]);
    if (command === 'supabase' && args[0] === 'status') {
      throw new HarnessCommandError('supabase status -o env', 1, 'stack is not running');
    }
    if (command === 'supabase' && args[0] === 'start') {
      throw new HarnessCommandError('supabase start', 1, 'partial stack');
    }
    return '';
  };

  await assert.rejects(
    runHarness({ prepare: async () => [], run, writeOutput: () => {}, removeMigrations: async () => {} }),
    HarnessCommandError,
  );

  assert.deepEqual(calls, [
    ['supabase', 'status', '-o', 'env'],
    ['supabase', 'start'],
    ['supabase', 'stop', '--project-id', SUPABASE_PROJECT_ID],
  ]);
});

test('Supabase config reserves a unique high port range and leaves default ports unused', async () => {
  const config = await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/config.toml'), 'utf8');
  assert.match(config, /^project_id = "funcommute-e2e"$/m);

  const configuredPorts = [...config.matchAll(/^(?:port|shadow_port|smtp_port|pop3_port|vector_port|inspector_port)\s*=\s*(\d+)$/gm)]
    .map(([, port]) => Number.parseInt(port, 10));
  const expectedPorts = Object.values(SUPABASE_PORTS).sort((left, right) => left - right);
  assert.deepEqual(configuredPorts.sort((left, right) => left - right), expectedPorts);
  assert.equal(new Set(configuredPorts).size, configuredPorts.length);
  for (const defaultPort of [54320, 54321, 54322, 54323, 54324, 54325, 54326, 54327, 54328, 54329]) {
    assert.equal(configuredPorts.includes(defaultPort), false, `default port ${defaultPort} must remain unused`);
  }
});

test('migration preparation removes stale output and ignores AppleDouble files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'local-supabase-test-'));
  const sourceDir = path.join(root, 'database', 'migrations');
  const targetDir = path.join(root, 'supabase', 'migrations');
  await mkdir(sourceDir, { recursive: true });
  await mkdir(targetDir, { recursive: true });
  await writeFile(path.join(sourceDir, '001_schema.sql'), 'select 1;');
  await writeFile(path.join(sourceDir, '._001_schema.sql'), 'AppleDouble metadata');
  await writeFile(path.join(targetDir, 'stale.sql'), 'stale');

  try {
    const plan = await prepareMigrations({ sourceDir, targetDir });
    assert.deepEqual(plan.map(({ source, target }) => ({ source, target })), [
      { source: '001_schema.sql', target: '00000000000001_001_schema.sql' },
    ]);
    assert.deepEqual(Array.from(await readdir(targetDir)), ['00000000000001_001_schema.sql']);
    assert.equal(await readFile(path.join(targetDir, '00000000000001_001_schema.sql'), 'utf8'), 'select 1;');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('migration plan gives duplicate canonical versions unique ordered targets', () => {
  const plan = buildMigrationPlan([
    '015_approve.sql',
    '014_disable.sql',
    '014_summaries.sql',
    '001_schema.sql',
  ]);

  assert.deepEqual(
    plan.map(({ source, target }) => ({ source, target })),
    [
      { source: '001_schema.sql', target: '00000000000001_001_schema.sql' },
      { source: '014_disable.sql', target: '00000000000002_014_disable.sql' },
      { source: '014_summaries.sql', target: '00000000000003_014_summaries.sql' },
      { source: '015_approve.sql', target: '00000000000004_015_approve.sql' },
    ],
  );
  assert.equal(new Set(plan.map(({ target }) => target)).size, plan.length);
});

test('status env parser keeps values private and redaction removes secrets', () => {
  const status = [
    'API_URL="http://127.0.0.1:54321"',
    'ANON_KEY="anon-secret"',
    'SERVICE_ROLE_KEY="service-secret"',
    'DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"',
  ].join('\n');

  const parsed = parseStatusEnv(status);
  assert.equal(parsed.API_URL, 'http://127.0.0.1:54321');
  assert.equal(parsed.ANON_KEY, 'anon-secret');
  assert.equal(parsed.SERVICE_ROLE_KEY, 'service-secret');

  const safe = redactSecrets(`status\n${status}`, [parsed.ANON_KEY, parsed.SERVICE_ROLE_KEY]);
  assert.doesNotMatch(safe, /anon-secret|service-secret/);
  assert.match(safe, /\[REDACTED\]/);
});

test('local harness process env opts into audit account seeding', () => {
  const env = statusToProcessEnv(parseStatusEnv(statusOutputFor()), { E2E_LOCAL_SUPABASE: '0' });

  assert.equal(env.E2E_LOCAL_SUPABASE, '1');
});

test('harness flags are removed while Playwright args are preserved', () => {
  assert.deepEqual(
    parseHarnessArgs(['--prepare-only', '--grep', 'QA-SIGN-001', '--keep-supabase', '--reporter=line', 'e2e/auth.spec.ts']),
    {
      prepareOnly: true,
      preserve: true,
      playwrightArgs: ['--grep', 'QA-SIGN-001', '--reporter=line', 'e2e/auth.spec.ts'],
    },
  );
});

test('prepare-only still stops before lifecycle commands', async () => {
  const calls = [];

  await runHarness({
    prepareOnly: true,
    prepare: async () => [],
    run: async (command, args) => calls.push([command, ...args]),
    writeOutput: () => {},
    removeMigrations: async () => {},
  });

  assert.deepEqual(calls, []);
});

test('teardown only stops a Supabase instance owned by the harness', () => {
  assert.deepEqual(shouldTeardown({ startedByHarness: true, preserve: false }), {
    stopSupabase: true,
    removeGeneratedMigrations: true,
  });
  assert.deepEqual(shouldTeardown({ startedByHarness: false, preserve: false }), {
    stopSupabase: false,
    removeGeneratedMigrations: true,
  });
  assert.deepEqual(shouldTeardown({ startedByHarness: true, preserve: true }), {
    stopSupabase: false,
    removeGeneratedMigrations: false,
  });
});
