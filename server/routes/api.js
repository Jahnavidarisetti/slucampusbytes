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
  return {
    id: post.id,
    content: post.content,
    created_at: post.created_at,
    likes: Number(post.likes ?? 0),
    comments: Array.isArray(post.comments) ? post.comments : [],
  };
}

function missingColumnError(error, columnName) {
  return error?.message?.toLowerCase().includes(columnName);
}

// Fetch posts from Supabase
router.get('/posts', async (req, res) => {
  try {
    let { data, error } = await supabase
      .from('posts')
      .select('id, content, created_at, likes, comments')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error && missingColumnError(error, 'comments')) {
      const fallback = await supabase
        .from('posts')
        .select('id, content, created_at, likes')
        .order('created_at', { ascending: false })
        .limit(20);

      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, posts: data.map(normalizePost) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Create a new post in Supabase
router.post('/posts', async (req, res) => {
  try {
    const { content, user_id } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ ok: false, error: 'Post content is required.' });
    }

    const resolvedUserId = user_id || (await ensureDefaultUserId());

    let insertBody = {
      user_id: resolvedUserId,
      content,
      likes: 0,
      comments: [],
    };

    let query = supabase
      .from('posts')
      .insert([insertBody])
      .select('id, content, created_at, likes, comments');

    let { data, error } = await query;

    if (error && missingColumnError(error, 'comments')) {
      insertBody = {
        user_id: resolvedUserId,
        content,
        likes: 0,
      };
      const fallback = await supabase
        .from('posts')
        .insert([insertBody])
        .select('id, content, created_at, likes');
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(201).json({ ok: true, post: normalizePost(data[0]) });
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
      .select('id, content, created_at, likes, comments')
      .single();

    if (error && missingColumnError(error, 'comments')) {
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
        .select('id, content, created_at, likes')
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
