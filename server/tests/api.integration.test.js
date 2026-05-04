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
    organizations: [
      {
        id: 'organization-1',
        profile_id: 'org-profile-1',
        username: 'acm',
        name: 'ACM',
        description: 'Computer science events',
        logo_url: 'https://example.com/acm.png',
        created_at: '2026-04-01T12:00:00.000Z',
      },
      {
        id: 'organization-2',
        profile_id: 'org-profile-2',
        username: 'robotics',
        name: 'Robotics Club',
        description: 'Build nights',
        logo_url: null,
        created_at: '2026-04-02T12:00:00.000Z',
      },
    ],
    organization_followers: [
      { user_id: 'student-1', organization_id: 'organization-1' },
      { user_id: 'student-2', organization_id: 'organization-1' },
    ],
    posts: [
      {
        id: 'seed-post-1',
        user_id: 'org-profile-1',
        content: 'Welcome',
        title: 'Welcome',
        description: 'Welcome to ACM',
        image_url: null,
        likes: 6,
        liked_by: [],
        comments: [{ id: 'comment-1', text: 'Nice' }, { id: 'comment-2', text: 'See you' }],
        created_at: '2026-04-03T12:00:00.000Z',
      },
    ],
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

      if (table === 'organizations' || table === 'organization_followers') {
        return {
          select(selection) {
            const rows = state[table].map((record) =>
              selectColumns(record, selection)
            );

            return Promise.resolve({ data: rows, error: null });
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
        then(resolve, reject) {
          if (context.action === 'select' && !context.filter) {
            const rows = state.posts.map((post) => selectColumns(post, context.selection));
            return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
          }

          return Promise.resolve({ data: null, error: null }).then(resolve, reject);
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

    const rewriteResponse = await fetch(`${server.baseUrl}/api/ai/rewrite-description`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        description: 'Bring your resume to the career fair at 2 PM in Busch Hall',
        tone: 'professional',
      }),
    });
    const rewriteBody = await rewriteResponse.json();

    assert.equal(rewriteResponse.status, 200);
    assert.equal(rewriteBody.ok, true);
    assert.equal(typeof rewriteBody.description, 'string');
    assert.ok(rewriteBody.description.length > 0);

    const organizationsResponse = await fetch(
      `${server.baseUrl}/api/organizations?user_id=student-1`
    );
    const organizationsBody = await organizationsResponse.json();
    const acm = organizationsBody.organizations.find(
      (organization) => organization.id === 'organization-1'
    );

    assert.equal(organizationsResponse.status, 200);
    assert.equal(organizationsBody.ok, true);
    assert.equal(organizationsBody.organizations.length, 2);
    assert.equal(acm.followers_count, 2);
    assert.equal(acm.posts_count, 1);
    assert.equal(acm.likes_count, 6);
    assert.equal(acm.comments_count, 2);
    assert.equal(acm.is_following, true);

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

