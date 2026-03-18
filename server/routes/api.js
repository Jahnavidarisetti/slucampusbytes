const express = require('express');
const router = express.Router();
const { supabase } = require('../supabaseClient');

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

// Supabase connection test (server-side, service role)
router.get('/supabase/health', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, rows: data.length });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
