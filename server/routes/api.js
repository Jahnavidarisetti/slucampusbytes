const express = require('express');
const router = express.Router();

// Test GET route
router.get('/test', (req, res) => {
  res.json({ message: 'GET route working!' });
});

// Test POST route
router.post('/test', (req, res) => {
  const data = req.body;
  res.json({
    message: 'POST route working!',
    receivedData: data
  });
});

module.exports = router;