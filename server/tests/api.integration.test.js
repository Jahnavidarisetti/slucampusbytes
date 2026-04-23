const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const path = require('node:path');

const apiRoutePath = path.resolve(__dirname, '../routes/api.js');
const supabaseClientPath = path.resolve(__dirname, '../config/supabaseClient.js');

function clearModule(modulePath) {
  delete require.cache[modulePath];
}

function createInMemorySupabase() {
  const state = {
    posts: [],
  };

  function selectColumns(record, selection) {
    if (!selection || selection.includes('*')) return { ...record };
    const columns = selection
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((column) => column.split('(')[0].trim());
    const result = {};
    for (const column of columns) {
      if (Object.prototype.hasOwnProperty.call(record, column)) {
        result[column] = record[column];
      }
    }
    return result;
  }

  return {
    from(table) {
      if (table === 'profiles') {
        return {
          select() {
            return {
              limit() {
                return Promise.resolve({ data: [{ id: 'profile-1' }], error: null });
              },
            };
          },
        };
      }

      if (table !== 'posts') {
        throw new Error(`Unexpected table ${table}`);
      }

      const context = {
        action: 'select',
        selection: null,
        row: null,
        updates: null,
        filter: null,
      };

      return {
        select(selection) {
          context.selection = selection;
          return this;
        },
        insert(rows) {
          context.action = 'insert';
          context.row = rows?.[0] ?? null;
          return this;
        },
        update(updates) {
          context.action = 'update';
          context.updates = updates;
          return this;
        },
        eq(column, value) {
          context.filter = { column, value };
          return this;
        },
        order() {
          return this;
        },
        limit() {
          if (context.action === 'select' && !context.filter) {
            const rows = state.posts.map((post) => selectColumns(post, context.selection));
            return Promise.resolve({ data: rows, error: null });
          }
          return this;
        },
        single() {
          if (context.action === 'insert') {
            const created = {
              id: `post-${state.posts.length + 1}`,
              user_id: context.row.user_id,
              content: context.row.content,
              title: context.row.title || '',
              description: context.row.description || context.row.content,
              image_url: context.row.image_url ?? null,
              likes: context.row.likes ?? 0,
              liked_by: context.row.liked_by ?? [],
              comments: context.row.comments ?? [],
              created_at: new Date().toISOString(),
            };
            state.posts.unshift(created);
            return Promise.resolve({
              data: selectColumns(created, context.selection),
              error: null,
            });
          }

          if (context.action === 'update') {
            const target = state.posts.find(
              (post) => String(post[context.filter.column]) === String(context.filter.value)
            );
            if (!target) {
              return Promise.resolve({ data: null, error: { message: 'Not found' } });
            }

            Object.assign(target, context.updates);
            return Promise.resolve({
              data: selectColumns(target, context.selection),
              error: null,
            });
          }

          const target = state.posts.find(
            (post) => String(post[context.filter.column]) === String(context.filter.value)
          );
          if (!target) {
            return Promise.resolve({ data: null, error: { message: 'Not found' } });
          }

          return Promise.resolve({
            data: selectColumns(target, context.selection),
            error: null,
          });
        },
      };
    },
  };
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

async function run() {
  const supabase = createInMemorySupabase();
  const router = loadApiRouter({ supabase });
  const server = await startTestServer(router);

  try {
    const createResponse = await fetch(`${server.baseUrl}/api/posts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        user_id: 'org-1',
        title: 'Integration Post',
        description: 'Integration content',
        image_url: 'https://example.com/post.png',
      }),
    });
    const createBody = await createResponse.json();

    assert.equal(createResponse.status, 201);
    assert.equal(createBody.ok, true);
    assert.equal(createBody.post.title, 'Integration Post');

    const postId = createBody.post.id;

    const likeResponse = await fetch(`${server.baseUrl}/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        like_user_id: 'org-1',
      }),
    });
    const likeBody = await likeResponse.json();

    assert.equal(likeResponse.status, 200);
    assert.equal(likeBody.post.likes, 1);

    const commentResponse = await fetch(`${server.baseUrl}/api/posts/${postId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        comments: [{ id: 'comment-1', text: 'Saved comment' }],
      }),
    });
    const commentBody = await commentResponse.json();

    assert.equal(commentResponse.status, 200);
    assert.equal(commentBody.post.comments.length, 1);
    assert.equal(commentBody.post.comments[0].text, 'Saved comment');

    console.log('PASS API integration test');
  } catch (error) {
    console.error('FAIL API integration test');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await server.close();
  }
}

run();

