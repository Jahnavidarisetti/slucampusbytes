const express = require('express');
const { emitNewPost } = require('../sockets/postHandler');

// In-memory store as the initial database foundation.
const postsStore = [];

function createPostsRouter(io) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.status(200).json(postsStore);
  });

  router.post('/', (req, res) => {
    const { author, content } = req.body || {};

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        message: 'Invalid payload. "content" is required.'
      });
    }

    const newPost = {
      id: Date.now().toString(),
      author: author && typeof author === 'string' ? author : 'Admin',
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    postsStore.unshift(newPost);

    emitNewPost(io, newPost);

    return res.status(201).json(newPost);
  });

  return router;
}

module.exports = createPostsRouter;
