const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const path = require('node:path');

const postsRoutePath = path.resolve(__dirname, '../routes/posts.js');
const supabaseClientPath = path.resolve(__dirname, '../supabaseClient.js');
const postHandlerPath = path.resolve(__dirname, '../sockets/postHandler.js');

function clearModule(modulePath) {
  delete require.cache[modulePath];
}

function buildIoDouble() {
  return {
    emitted: [],
    emit(event, payload) {
      this.emitted.push({ event, payload });
    }
  };
}

function buildSocketHarness() {
  const events = new Map();

  return {
    id: 'socket-test-1',
    on(event, handler) {
      events.set(event, handler);
    },
    trigger(event) {
      const handler = events.get(event);
      if (handler) handler();
    },
    hasHandler(event) {
      return events.has(event);
    }
  };
}

function loadPostsRouter({ supabase, emitNewPost }) {
  clearModule(postsRoutePath);
  clearModule(supabaseClientPath);
  clearModule(postHandlerPath);

  require.cache[supabaseClientPath] = {
    id: supabaseClientPath,
    filename: supabaseClientPath,
    loaded: true,
    exports: { supabase }
  };

  require.cache[postHandlerPath] = {
    id: postHandlerPath,
    filename: postHandlerPath,
    loaded: true,
    exports: {
      emitNewPost,
      setupSocketHandlers: () => {}
    }
  };

  return require(postsRoutePath);
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

test('GET /api/posts returns historical feed data latest first', async () => {
  const supabase = {
    from(table) {
      assert.equal(table, 'posts');
      return {
        select(selection) {
          assert.match(selection, /created_at/);
          return this;
        },
        order() {
          return this;
        },
        range(start, end) {
          assert.equal(start, 0);
          assert.equal(end, 50);

          return Promise.resolve({
            data: [
              {
                id: 'older-post',
                content: 'Older content',
                created_at: '2026-03-29T12:00:00.000Z',
                profiles: { email: 'older@example.com' }
              },
              {
                id: 'newer-post',
                content: 'Newer content',
                created_at: '2026-03-31T12:00:00.000Z',
                profiles: { email: 'newer@example.com' }
              }
            ],
            error: null
          });
        }
      };
    }
  };

  const io = buildIoDouble();
  const createPostsRouter = loadPostsRouter({
    supabase,
    emitNewPost: (targetIo, post) => targetIo.emit('new_post', post)
  });
  const server = await startTestServer(createPostsRouter(io));

  try {
    const response = await fetch(`${server.baseUrl}/api/posts`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.length, 2);
    assert.deepEqual(
      body.map((item) => item.id),
      ['newer-post', 'older-post']
    );
    assert.deepEqual(body[0], {
      id: 'newer-post',
      author: 'newer',
      content: 'Newer content',
      createdAt: '2026-03-31T12:00:00.000Z'
    });
    assert.equal(response.headers.get('x-feed-has-more'), 'false');
    assert.equal(io.emitted.length, 0);
  } finally {
    await server.close();
  }
});

test('POST /api/posts rejects payloads without content', async () => {
  const supabase = {
    from() {
      throw new Error('supabase should not be called for invalid payloads');
    }
  };

  const io = buildIoDouble();
  const createPostsRouter = loadPostsRouter({
    supabase,
    emitNewPost: (targetIo, post) => targetIo.emit('new_post', post)
  });
  const server = await startTestServer(createPostsRouter(io));

  try {
    const response = await fetch(`${server.baseUrl}/api/posts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: '   ', user_id: 'admin-123' })
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.message, /content/i);
    assert.equal(io.emitted.length, 0);
  } finally {
    await server.close();
  }
});

test('POST /api/posts creates a post and broadcasts new_post', async () => {
  let insertedPayload = null;

  const supabase = {
    from(table) {
      assert.equal(table, 'posts');
      return {
        insert(payload) {
          insertedPayload = payload;
          return this;
        },
        select(selection) {
          assert.match(selection, /profiles\(email\)/);
          return this;
        },
        single() {
          return Promise.resolve({
            data: {
              id: 'created-post-1',
              content: 'Admin announcement',
              created_at: '2026-03-31T18:45:00.000Z',
              user_id: 'admin-123',
              profiles: { email: 'admin@example.com' }
            },
            error: null
          });
        }
      };
    }
  };

  const io = buildIoDouble();
  const broadcastCalls = [];
  const createPostsRouter = loadPostsRouter({
    supabase,
    emitNewPost: (targetIo, post) => {
      broadcastCalls.push({ targetIo, post });
      targetIo.emit('new_post', post);
    }
  });
  const server = await startTestServer(createPostsRouter(io));

  try {
    const response = await fetch(`${server.baseUrl}/api/posts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: '  Admin announcement  ',
        user_id: 'admin-123'
      })
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.deepEqual(insertedPayload, {
      user_id: 'admin-123',
      content: 'Admin announcement'
    });
    assert.deepEqual(body, {
      id: 'created-post-1',
      author: 'admin',
      content: 'Admin announcement',
      createdAt: '2026-03-31T18:45:00.000Z'
    });
    assert.equal(broadcastCalls.length, 1);
    assert.equal(broadcastCalls[0].targetIo, io);
    assert.deepEqual(io.emitted, [
      {
        event: 'new_post',
        payload: body
      }
    ]);
  } finally {
    await server.close();
  }
});

test('setupSocketHandlers registers connection and disconnect listeners', () => {
  clearModule(postHandlerPath);
  const { setupSocketHandlers } = require('../sockets/postHandler');
  const socket = buildSocketHarness();
  let connectionHandler = null;

  const io = {
    on(event, handler) {
      assert.equal(event, 'connection');
      connectionHandler = handler;
    }
  };

  setupSocketHandlers(io);

  assert.equal(typeof connectionHandler, 'function');
  connectionHandler(socket);
  assert.equal(socket.hasHandler('disconnect'), true);
});

test('emitNewPost broadcasts new_post to all connected clients', () => {
  clearModule(postHandlerPath);
  const { emitNewPost } = require('../sockets/postHandler');
  const io = buildIoDouble();
  const post = {
    id: 'created-post-2',
    author: 'admin',
    content: 'Broadcast message',
    createdAt: '2026-03-31T19:00:00.000Z'
  };

  emitNewPost(io, post);

  assert.deepEqual(io.emitted, [
    {
      event: 'new_post',
      payload: post
    }
  ]);
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
