const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const Module = require('node:module');

const rootDir = path.resolve(__dirname, '../../');
const serverRoot = path.resolve(rootDir, 'server');
const serverNodeModules = path.resolve(serverRoot, 'node_modules');
const serverRequire = Module.createRequire(path.resolve(serverRoot, 'package.json'));
const express = serverRequire('express');
const supabaseConfigPath = path.resolve(serverRoot, 'config', 'supabaseClient.js');
const supabaseRootPath = path.resolve(serverRoot, 'supabaseClient.js');
const postsRoutePath = path.resolve(serverRoot, 'routes', 'posts.js');

function clearModule(modulePath) {
  delete require.cache[modulePath];
}

function resolveServerModule(name) {
  return require.resolve(name, { paths: [serverNodeModules] });
}

function buildIoDouble() {
  return {
    emitted: [],
    emit(event, payload) {
      this.emitted.push({ event, payload });
    }
  };
}

async function startTestServer(router) {
  const app = express();
  app.use(express.json());
  app.use('/api/posts', router);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      )
  };
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function withEnv(envVars, fn) {
  const original = {};
  for (const key of Object.keys(envVars)) {
    original[key] = process.env[key];
    process.env[key] = envVars[key];
  }

  try {
    return fn();
  } finally {
    for (const key of Object.keys(envVars)) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  }
}

async function importServerRouteWithFakeSupabase(fakeSupabase) {
  clearModule(postsRoutePath);
  clearModule(supabaseRootPath);

  require.cache[supabaseRootPath] = {
    id: supabaseRootPath,
    filename: supabaseRootPath,
    loaded: true,
    exports: { supabase: fakeSupabase }
  };

  return require(postsRoutePath);
}

// Verify the server Supabase client is configured with the service role key from env
test('Supabase client config initializes with service role key', async () => {
  await withEnv(
    {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'super-secret-role-key'
    },
    async () => {
      const fakeCreateClientCalls = [];
      const fakeCreateClient = (url, key, options) => {
        fakeCreateClientCalls.push({ url, key, options });
        return { url, key, options };
      };

      const supabasePackagePath = resolveServerModule('@supabase/supabase-js');
      clearModule(supabasePackagePath);
      require.cache[supabasePackagePath] = {
        id: supabasePackagePath,
        filename: supabasePackagePath,
        loaded: true,
        exports: { createClient: fakeCreateClient }
      };
      clearModule(supabaseConfigPath);

      const config = require(supabaseConfigPath);

      assert.equal(fakeCreateClientCalls.length, 1);
      assert.deepEqual(fakeCreateClientCalls[0], {
        url: 'https://example.supabase.co',
        key: 'super-secret-role-key',
        options: { auth: { persistSession: false } }
      });
      assert.equal(config.supabase.url, 'https://example.supabase.co');
      assert.equal(config.supabase.key, 'super-secret-role-key');
      assert.equal(typeof config.ensureDefaultUserId, 'function');
    }
  );
});

// Verify the API route accepts valid frontend payloads, writes a post via Supabase, and responds within 2 seconds
test('POST /api/posts accepts valid payload and returns created post quickly', async () => {
  const inserted = [];
  const fakeSupabase = {
    from(table) {
      assert.equal(table, 'posts');
      return {
        insert(payload) {
          inserted.push(payload);
          return this;
        },
        select(selection) {
          assert.match(selection, /profiles\(email\)/);
          return this;
        },
        single() {
          return Promise.resolve({
            data: {
              id: 'created-post-42',
              content: 'Hello from frontend',
              created_at: '2026-03-31T20:00:00.000Z',
              user_id: 'user-42',
              profiles: { email: 'user42@example.com' }
            },
            error: null
          });
        }
      };
    }
  };

  const router = await importServerRouteWithFakeSupabase(fakeSupabase);
  const server = await startTestServer(router(buildIoDouble()));

  try {
    const start = Date.now();
    const response = await fetch(`${server.baseUrl}/api/posts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: '  Hello from frontend  ',
        user_id: 'user-42'
      })
    });
    const body = await response.json();
    const durationMs = Date.now() - start;

    assert.equal(response.status, 201);
    assert.equal(durationMs < 2000, true, `Expected response under 2 seconds, got ${durationMs}ms`);
    assert.deepEqual(inserted, [
      {
        user_id: 'user-42',
        content: 'Hello from frontend'
      }
    ]);
    assert.deepEqual(body, {
      id: 'created-post-42',
      author: 'user42',
      content: 'Hello from frontend',
      createdAt: '2026-03-31T20:00:00.000Z'
    });
  } finally {
    await server.close();
  }
});

async function run() {
  let failures = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`PASS ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${name}`);
      console.error(error);
    }
  }
  if (failures > 0) {
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${tests.length} tests`);
}

run();
