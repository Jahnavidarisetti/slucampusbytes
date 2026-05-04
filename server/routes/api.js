const express = require('express');
const router = express.Router();
const { supabase, ensureDefaultUserId } = require('../config/supabaseClient');
const {
  isValidImageUrl,
  validateCreatePostPayload,
} = require('../utils/postValidation');
const {
  rewriteDescriptionWithGeminiFallback,
  validateRewriteDescriptionPayload,
} = require('../utils/aiRewrite');
const {
  buildOrganizationSummaries,
} = require('../utils/organizationMetrics');

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

router.get('/organizations', async (req, res) => {
  try {
    const currentUserId =
      typeof req.query.user_id === 'string' && req.query.user_id.trim()
        ? req.query.user_id.trim()
        : null;

    const [organizationsResult, followersResult, postsResult] = await Promise.all([
      supabase
        .from('organizations')
        .select('id, profile_id, username, name, description, logo_url, created_at'),
      supabase
        .from('organization_followers')
        .select('user_id, organization_id'),
      supabase
        .from('posts')
        .select('id, user_id, likes, comments'),
    ]);

    const firstError =
      organizationsResult.error || followersResult.error || postsResult.error;

    if (firstError) {
      return res.status(500).json({ ok: false, error: firstError.message });
    }

    const organizations = buildOrganizationSummaries({
      organizations: organizationsResult.data || [],
      followers: followersResult.data || [],
      posts: postsResult.data || [],
      currentUserId,
    });

    return res.json({ ok: true, organizations });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/ai/rewrite-description', async (req, res) => {
  const validation = validateRewriteDescriptionPayload(req.body || {});
  if (validation.error) {
    return res.status(400).json({ ok: false, error: validation.error });
  }

  try {
    const description = await rewriteDescriptionWithGeminiFallback({
      description: validation.normalizedDescription,
      tone: validation.normalizedTone,
    });

    return res.json({ ok: true, description });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

function normalizePost(post) {
  const profileSource = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
  const profile = profileSource && typeof profileSource === 'object' ? profileSource : null;
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
    user_id: post.user_id ?? null,
    title: typeof post.title === 'string' ? post.title : '',
    organization_name: organizationName,
    description:
      typeof post.description === 'string'
        ? post.description
        : typeof post.content === 'string'
          ? post.content
          : '',
    image_url: typeof post.image_url === 'string' ? post.image_url : null,
    avatar_url: typeof profile?.avatar_url === 'string' ? profile.avatar_url : null,
    role: typeof profile?.role === 'string' ? profile.role : null,
    content: typeof post.content === 'string' ? post.content : '',
    created_at: post.created_at,
    likes: Number(post.likes ?? 0),
    liked_by: Array.isArray(post.liked_by) ? post.liked_by : [],
    comments: Array.isArray(post.comments) ? post.comments : [],
  };
}

function schemaCompatibilityError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    (message.includes('column') && message.includes('does not exist')) ||
    message.includes('could not find a relationship') ||
    message.includes('schema cache') ||
    message.includes('is not an embedded resource in this request')
  );
}

async function selectPostsWithFallback({ id = null, limit = null } = {}) {
  const selectAttempts = [
    {
      selection:
        'id, user_id, content, title, description, image_url, created_at, likes, liked_by, comments, profiles(full_name, username, email, avatar_url, role)',
      sortBy: 'created_at',
    },
    {
      selection:
        'id, user_id, content, title, description, image_url, created_at, likes, liked_by, comments, profiles(username, email, avatar_url, role)',
      sortBy: 'created_at',
    },
    {
      selection: 'id, user_id, content, title, description, image_url, created_at, likes, liked_by, comments',
      sortBy: 'created_at',
    },
    {
      selection: 'id, user_id, content, title, description, image_url, created_at, likes',
      sortBy: 'created_at',
    },
    {
      selection: 'id, user_id, content, created_at, likes, comments',
      sortBy: 'created_at',
    },
    {
      selection: 'id, user_id, content, created_at, likes',
      sortBy: 'created_at',
    },
    {
      selection: 'id, user_id, content, created_at',
      sortBy: 'created_at',
    },
    {
      selection: 'id, user_id, content, likes, comments',
      sortBy: 'id',
    },
    {
      selection: 'id, user_id, content, likes, liked_by, comments',
      sortBy: 'id',
    },
    {
      selection: 'id, user_id, content, likes',
      sortBy: 'id',
    },
    {
      selection: 'id, user_id, content',
      sortBy: 'id',
    },
  ];

  let lastError = null;

  for (const attempt of selectAttempts) {
    let query = supabase.from('posts').select(attempt.selection);

    if (id) {
      query = query.eq('id', id).single();
    } else {
      query = query.order(attempt.sortBy, { ascending: false }).limit(limit ?? 20);
    }

    const { data, error } = await query;

    if (!error) {
      return { data, selection: attempt.selection };
    }

    if (schemaCompatibilityError(error)) {
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
    liked_by: [],
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
    delete next.liked_by;
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
    'id, user_id, content, title, description, image_url, created_at, likes, liked_by, comments, profiles(full_name, username, email, avatar_url, role)',
    'id, user_id, content, title, description, image_url, created_at, likes, liked_by, comments, profiles(username, email, avatar_url, role)',
    'id, user_id, content, title, description, image_url, created_at, likes, liked_by, comments',
    'id, user_id, content, title, description, image_url, created_at, likes',
    'id, user_id, content, created_at, likes, liked_by, comments',
    'id, user_id, content, created_at, likes',
    'id, user_id, content, created_at, likes, liked_by',
    'id, user_id, content, created_at',
    'id, user_id, content, likes, liked_by, comments',
    'id, user_id, content, likes',
    'id, user_id, content, liked_by',
    'id, user_id, content'
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

      if (schemaCompatibilityError(error)) {
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
    const payloadValidation = validateCreatePostPayload({
      title,
      description,
      content,
      imageUrl: image_url,
    });
    if (payloadValidation.error) {
      return res.status(400).json({ ok: false, error: payloadValidation.error });
    }

    const resolvedUserId = user_id || (await ensureDefaultUserId());

    const insertBody = buildInsertPayload({
      userId: resolvedUserId,
      content: payloadValidation.normalizedDescription,
      title: payloadValidation.normalizedTitle,
      description: payloadValidation.normalizedDescription,
      imageUrl: payloadValidation.normalizedImageUrl,
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
    const { likes, comments, liked_by, like_user_id, image_url } = req.body;

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

    if (image_url !== undefined) {
      if (!isValidImageUrl(image_url)) {
        return res.status(400).json({ ok: false, error: 'image_url must be a valid HTTP(S) URL.' });
      }
      updates.image_url =
        typeof image_url === 'string' && image_url.trim()
          ? image_url.trim()
          : null;
    }

    if (liked_by !== undefined) {
      if (!Array.isArray(liked_by)) {
        return res.status(400).json({ ok: false, error: 'liked_by must be an array.' });
      }
      const normalized = [...new Set(liked_by.filter((entry) => typeof entry === 'string' && entry.trim()))];
      updates.liked_by = normalized;
      updates.likes = normalized.length;
    }

    if (like_user_id !== undefined) {
      if (typeof like_user_id !== 'string' || !like_user_id.trim()) {
        return res.status(400).json({ ok: false, error: 'like_user_id must be a non-empty string.' });
      }

      const currentPostResult = await selectPostsWithFallback({ id });
      if (currentPostResult.error) {
        return res.status(500).json({ ok: false, error: currentPostResult.error.message });
      }

      const currentPost = currentPostResult.data;
      if (!currentPost) {
        return res.status(404).json({ ok: false, error: 'Post not found.' });
      }

      if (!Array.isArray(currentPost.liked_by)) {
        return res.status(500).json({
          ok: false,
          error:
            'Current database schema does not support per-user likes. Please add the liked_by column or rerun the latest migration.',
        });
      }

      const currentLikedBy = currentPost.liked_by.filter(
        (entry) => typeof entry === 'string' && entry.trim()
      );
      const currentLikes =
        typeof currentPost.likes === 'number' && Number.isFinite(currentPost.likes) && currentPost.likes >= 0
          ? currentPost.likes
          : currentLikedBy.length;
      const userId = like_user_id.trim();
      const userHasLiked = currentLikedBy.includes(userId);
      const nextLikedBy = userHasLiked
        ? currentLikedBy.filter((entry) => entry !== userId)
        : [...currentLikedBy, userId];
      const nextLikes = userHasLiked
        ? Math.max(currentLikes - 1, 0)
        : currentLikes + 1;

      updates.liked_by = nextLikedBy;
      updates.likes = nextLikes;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ ok: false, error: 'No valid fields to update.' });
    }

    let { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select('id, user_id, content, title, description, image_url, created_at, likes, liked_by, comments, profiles(full_name, username, email, avatar_url, role)')
      .single();

    if (error && schemaCompatibilityError(error)) {
      if (
        updates.comments !== undefined ||
        updates.liked_by !== undefined ||
        updates.image_url !== undefined
      ) {
        return res.status(500).json({
          ok: false,
          error: 'Current database schema does not support comments/image/per-user likes. Please add the needed columns or rerun the latest migration.',
        });
      }

      const fallback = await supabase
        .from('posts')
        .update({ likes: updates.likes })
        .eq('id', id)
        .select('id, user_id, content, created_at, likes')
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
