const express = require('express');
const router = express.Router();
const { supabase, ensureDefaultUserId } = require('../config/supabaseClient');

// Test GET route
router.get('/test', (req, res) => {
  res.json({ message: 'GET route working!' });
});

// Test POST route
router.post('/test', (req, res) => {
  const data = req.body;
  res.json({
    message: 'POST route working!',
    receivedData: data,
  });
});

// Supabase connection test (server-side, service role)
router.get('/supabase/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, rows: data.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

function normalizePost(post) {
  const profile = post.profiles && typeof post.profiles === 'object' ? post.profiles : null;
  const profileEmail =
    typeof profile?.email === 'string' ? profile.email.trim().toLowerCase() : '';
  const emailName = profileEmail ? profileEmail.split('@')[0] : '';

  const organizationName =
    (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
    (typeof profile?.username === 'string' && profile.username.trim()) ||
    emailName ||
    'CampusConnect';

  return {
    id: post.id,
    title: typeof post.title === 'string' ? post.title : '',
    organization_name: organizationName,
    description:
      typeof post.description === 'string'
        ? post.description
        : typeof post.content === 'string'
          ? post.content
          : '',
    image_url: typeof post.image_url === 'string' ? post.image_url : null,
    content: typeof post.content === 'string' ? post.content : '',
    created_at: post.created_at,
    likes: Number(post.likes ?? 0),
    comments: Array.isArray(post.comments) ? post.comments : [],
  };
}

function missingColumnError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') && message.includes('does not exist');
}

async function selectPostsWithFallback({ id = null, limit = null } = {}) {
  const selectAttempts = [
    'id, content, title, description, image_url, created_at, likes, comments, profiles(full_name, username, email)',
    'id, content, title, description, image_url, created_at, likes, comments, profiles(username, email)',
    'id, content, title, description, image_url, created_at, likes, comments',
    'id, content, title, description, image_url, created_at, likes',
    'id, content, created_at, likes, comments',
    'id, content, created_at, likes',
    'id, content, created_at'
  ];

  let lastError = null;

  for (const selection of selectAttempts) {
    let query = supabase.from('posts').select(selection);

    if (id) {
      query = query.eq('id', id).single();
    } else {
      query = query.order('created_at', { ascending: false }).limit(limit ?? 20);
    }

    const { data, error } = await query;

    if (!error) {
      return { data, selection };
    }

    if (missingColumnError(error)) {
      lastError = error;
      continue;
    }

    return { error };
  }

  return { error: lastError || new Error('Unable to query posts table.') };
}

function buildInsertPayload({ userId, content, title, description, imageUrl }) {
  const payload = {
    user_id: userId,
    content,
    title,
    description,
    image_url: imageUrl,
    likes: 0,
    comments: [],
  };

  return payload;
}

function compactInsertPayload(payload, level) {
  if (level === 0) return payload;

  const next = { ...payload };

  if (level >= 1) {
    delete next.comments;
  }

  if (level >= 2) {
    delete next.likes;
  }

  if (level >= 3) {
    delete next.title;
    delete next.description;
    delete next.image_url;
  }

  return next;
}

async function insertPostWithFallback(payload) {
  const selectAttempts = [
    'id, content, title, description, image_url, created_at, likes, comments, profiles(full_name, username, email)',
    'id, content, title, description, image_url, created_at, likes, comments, profiles(username, email)',
    'id, content, title, description, image_url, created_at, likes, comments',
    'id, content, title, description, image_url, created_at, likes',
    'id, content, created_at, likes, comments',
    'id, content, created_at, likes',
    'id, content, created_at'
  ];

  let lastError = null;

  for (let compactLevel = 0; compactLevel <= 3; compactLevel += 1) {
    const insertBody = compactInsertPayload(payload, compactLevel);

    for (const selection of selectAttempts) {
      const { data, error } = await supabase
        .from('posts')
        .insert([insertBody])
        .select(selection)
        .single();

      if (!error) {
        return { data };
      }

      if (missingColumnError(error)) {
        lastError = error;
        continue;
      }

      return { error };
    }
  }

  return { error: lastError || new Error('Unable to insert into posts table.') };
}

// Fetch posts from Supabase
router.get('/posts', async (_req, res) => {
  try {
    const { data, error } = await selectPostsWithFallback({ limit: 20 });

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, posts: (data || []).map(normalizePost) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Create a new post in Supabase
router.post('/posts', async (req, res) => {
  try {
    const {
      content,
      user_id,
      title,
      description,
      image_url,
    } = req.body || {};

    const normalizedTitle = typeof title === 'string' ? title.trim() : '';
    const normalizedDescription =
      typeof description === 'string' && description.trim()
        ? description.trim()
        : typeof content === 'string'
          ? content.trim()
          : '';

    if (!normalizedDescription) {
      return res.status(400).json({ ok: false, error: 'Post description/content is required.' });
    }

    const resolvedUserId = user_id || (await ensureDefaultUserId());

    const insertBody = buildInsertPayload({
      userId: resolvedUserId,
      content: normalizedDescription,
      title: normalizedTitle,
      description: normalizedDescription,
      imageUrl: typeof image_url === 'string' && image_url.trim() ? image_url.trim() : null,
    });

    const { data, error } = await insertPostWithFallback(insertBody);

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(201).json({ ok: true, post: normalizePost(data) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Update post likes or comments
router.patch('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    const { likes, comments } = req.body;

    if (likes !== undefined) {
      if (typeof likes !== 'number' || likes < 0) {
        return res.status(400).json({ ok: false, error: 'Likes must be a non-negative number.' });
      }
      updates.likes = likes;
    }

    if (comments !== undefined) {
      if (!Array.isArray(comments)) {
        return res.status(400).json({ ok: false, error: 'Comments must be an array.' });
      }
      updates.comments = comments;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ ok: false, error: 'No valid fields to update.' });
    }

    let { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select('id, content, title, description, image_url, created_at, likes, comments, profiles(full_name, username, email)')
      .single();

    if (error && missingColumnError(error)) {
      if (updates.comments !== undefined) {
        return res.status(500).json({
          ok: false,
          error: 'Current database schema does not support post comments. Please add the comments column or rerun the latest migration.',
        });
      }

      const fallback = await supabase
        .from('posts')
        .update({ likes: updates.likes })
        .eq('id', id)
        .select('id, content, created_at, likes, profiles(username, email)')
        .single();

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, post: normalizePost(data) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
