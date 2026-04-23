const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const path = require('node:path');

const apiRoutePath = path.resolve(__dirname, '../routes/api.js');
const supabaseClientPath = path.resolve(__dirname, '../config/supabaseClient.js');

function clearModule(modulePath) {
  delete require.cache[modulePath];
}

function loadApiRouter({ supabase, ensureDefaultUserId }) {
  clearModule(apiRoutePath);
  clearModule(supabaseClientPath);

  require.cache[supabaseClientPath] = {
    id: supabaseClientPath,
    filename: supabaseClientPath,
    loaded: true,
    exports: {
      supabase,
      ensureDefaultUserId:
        ensureDefaultUserId || (async () => 'default-user-id'),
    },
  };

  return require(apiRoutePath);
}

async function startTestServer(router) {
  const app = express();
  app.use(express.json());
  app.use('/api', router);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      ),
  };
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('POST /api/posts rejects title above max length', async () => {
  const supabase = {
    from() {
      throw new Error('supabase insert should not execute for invalid payload');
    },
  };

  const router = loadApiRouter({ supabase });
  const server = await startTestServer(router);

  try {
    const response = await fetch(`${server.baseUrl}/api/posts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        user_id: 'user-1',
        title: 'x'.repeat(201),
        description: 'valid description',
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.error, /title/i);
  } finally {
    await server.close();
  }
});

test('POST /api/posts rejects invalid image_url', async () => {
  const supabase = {
    from() {
      throw new Error('supabase insert should not execute for invalid payload');
    },
  };

  const router = loadApiRouter({ supabase });
  const server = await startTestServer(router);

  try {
    const response = await fetch(`${server.baseUrl}/api/posts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        user_id: 'user-1',
        title: 'Valid title',
        description: 'Valid description',
        image_url: 'not-a-url',
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.error, /image_url/i);
  } finally {
    await server.close();
  }
});

test('PATCH /api/posts/:id rejects invalid image_url', async () => {
  const supabase = {
    from() {
      throw new Error('supabase update should not execute for invalid payload');
    },
  };

  const router = loadApiRouter({ supabase });
  const server = await startTestServer(router);

  try {
    const response = await fetch(`${server.baseUrl}/api/posts/post-1`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        image_url: 'ftp://bad-url',
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.error, /image_url/i);
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

