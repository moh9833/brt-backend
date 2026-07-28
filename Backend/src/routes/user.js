const express = require('express');
const sheetsClient = require('../sheetsClient');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/register  { name, email }
router.post('/register', async (req, res) => {
  const { name, email } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ ok: false, error: 'Name is required.' });
  }
  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return res.status(400).json({ ok: false, error: 'A valid email is required.' });
  }

  try {
    await sheetsClient.upsertUser({ name: name.trim(), email: email.trim().toLowerCase() });
    return res.json({ ok: true, user: { name: name.trim(), email: email.trim().toLowerCase() } });
  } catch (err) {
    console.error('[register] failed:', err.message);
    return res.status(500).json({ ok: false, error: 'Could not save your registration right now.' });
  }
});

// GET /api/user/:email  - used to validate a LocalStorage login on return visits
router.get('/user/:email', async (req, res) => {
  const email = String(req.params.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email.' });
  }
  try {
    const result = await sheetsClient.findUser(email);
    return res.json(result);
  } catch (err) {
    console.error('[user lookup] failed:', err.message);
    return res.status(500).json({ ok: false, error: 'Lookup failed.' });
  }
});

module.exports = router;