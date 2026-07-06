const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users — Super Admin uniquement
router.get('/', requireAuth, requireRole('super-admin'), async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, code_used, oauth_provider, created_at FROM users ORDER BY created_at DESC'
  );
  res.json({ users: rows });
});

// POST /api/users/:id/demote — Super Admin uniquement
router.post('/:id/demote', requireAuth, requireRole('super-admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  const user = rows[0];
  if (!user) return res.status(404).json({ error: 'Compte introuvable.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("UPDATE users SET role = 'membre', code_used = NULL WHERE id = $1", [user.id]);
    if (user.code_used) {
      await client.query(
        "UPDATE access_codes SET status = 'revoque', account_email = NULL, revoked_at = now() WHERE code = $1",
        [user.code_used]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Erreur lors de la rétrogradation.' });
  } finally {
    client.release();
  }
});

module.exports = router;
