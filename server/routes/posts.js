const express = require('express');
const { supabase } = require('../supabaseClient');
const { emitNewPost } = require('../sockets/postHandler');

function authorFromProfile(profile) {
  if (!profile || typeof profile !== 'object') return 'Member';
  const email = profile.email;
  if (email && typeof email === 'string') {
    const local = email.split('@')[0];
    return local || email;
  }
  return 'Member';
}

function readIntEnv(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

const MAX_POSTS_LIMIT = readIntEnv('POSTS_FEED_MAX_LIMIT', 100);
const DEFAULT_POSTS_LIMIT = Math.min(
  readIntEnv('POSTS_FEED_DEFAULT_LIMIT', 50),
  MAX_POSTS_LIMIT
);

function parseFeedPagination(query = {}) {
  let limit = parseInt(query.limit, 10);
  if (Number.isNaN(limit) || limit < 1) {
    limit = DEFAULT_POSTS_LIMIT;
  }
  if (limit > MAX_POSTS_LIMIT) {
    limit = MAX_POSTS_LIMIT;
  }

  let offset = parseInt(query.offset, 10);
  if (Number.isNaN(offset) || offset < 0) {
    offset = 0;
  }

  return { limit, offset };
}

function mapRow(row) {
  const profile = row.profiles;
  return {
    id: row.id,
    author: authorFromProfile(profile),
    content: row.content,
    createdAt:
      typeof row.created_at === 'string'
        ? row.created_at
        : new Date(row.created_at).toISOString()
  };
}

function createPostsRouter(io) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const { limit, offset } = parseFeedPagination(req.query);
      const rangeEnd = offset + limit;

      const { data, error } = await supabase
        .from('posts')
        .select('id, content, created_at, user_id, profiles(email)')
        .order('created_at', { ascending: false })
        .range(offset, rangeEnd);

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      const rows = data || [];
      const hasMore = rows.length > limit;
      const pageRows = hasMore ? rows.slice(0, limit) : rows;
      const items = pageRows.map(mapRow);

      res.setHeader('X-Feed-Limit', String(limit));
      res.setHeader('X-Feed-Offset', String(offset));
      res.setHeader('X-Feed-Count', String(items.length));
      res.setHeader('X-Feed-Has-More', hasMore ? 'true' : 'false');
      return res.status(200).json(items);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  router.post('/', async (req, res) => {
    const { content, user_id: bodyUserId } = req.body || {};

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        message: 'Invalid payload. "content" is required.'
      });
    }

    const userId =
      (bodyUserId && typeof bodyUserId === 'string' && bodyUserId.trim()) ||
      (process.env.ADMIN_POST_USER_ID &&
        String(process.env.ADMIN_POST_USER_ID).trim()) ||
      null;

    if (!userId) {
      return res.status(400).json({
        message:
          'Invalid payload. "user_id" is required (existing profile UUID), or set ADMIN_POST_USER_ID on the server.'
      });
    }

    const postContent = content.trim();

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: userId,
          content: postContent
        })
        .select('id, content, created_at, user_id, profiles(email)')
        .single();

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      const newPost = mapRow(data);
      emitNewPost(io, newPost);
      return res.status(201).json(newPost);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  return router;
}

module.exports = createPostsRouter;
