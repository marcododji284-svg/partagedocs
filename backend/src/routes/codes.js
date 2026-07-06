const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { generateAccessCode } = require('../utils/codeGenerator');

const router = express.Router();

// GET /api/codes — Super Admin uniquement
router.get('/', requireAuth, requireRole('super-admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM access_codes ORDER BY created_at DESC');
  res.json({ codes: rows });
});

// POST /api/codes — Super Admin uniquement — body: { role }
router.post('/', requireAuth, requireRole('super-admin'), async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'super-admin'].includes(role)) {
    return res.status(400).json({ error: "Le rôle doit être 'admin' ou 'super-admin'." });
  }

  let code;
  let attempts = 0;
  let exists = true;
  while (exists && attempts < 10) {
    code = generateAccessCode(role);
    const check = await pool.query('SELECT 1 FROM access_codes WHERE code = $1', [code]);
    exists = check.rows.length > 0;
    attempts += 1;
  }

  await pool.query(
    'INSERT INTO access_codes (code, role, status, created_by) VALUES ($1, $2, $3, $4)',
    [code, role, 'disponible', req.user.id]
  );
  res.status(201).json({ code: { code, role, status: 'disponible' } });
});

// POST /api/codes/:code/revoke — révoque + rétrograde le compte lié
router.post('/:code/revoke', requireAuth, requireRole('super-admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM access_codes WHERE code = $1', [req.params.code]);
  const codeEntry = rows[0];
  if (!codeEntry) return res.status(404).json({ error: 'Code introuvable.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      "UPDATE access_codes SET status = 'revoque', account_email = NULL, revoked_at = now() WHERE code = $1",
      [req.params.code]
    );
    if (codeEntry.account_email) {
      await client.query(
        "UPDATE users SET role = 'membre', code_used = NULL WHERE email = $1",
        [codeEntry.account_email]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Erreur lors de la révocation.' });
  } finally {
    client.release();
  }
});

// DELETE /api/codes/:code — uniquement si jamais utilisé
router.delete('/:code', requireAuth, requireRole('super-admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM access_codes WHERE code = $1', [req.params.code]);
  const codeEntry = rows[0];
  if (!codeEntry) return res.status(404).json({ error: 'Code introuvable.' });
  if (codeEntry.status === 'utilise') {
    return res.status(400).json({ error: 'Impossible de supprimer un code utilisé : révoquez-le plutôt.' });
  }
  await pool.query('DELETE FROM access_codes WHERE code = $1', [req.params.code]);
  res.json({ success: true });
});

module.exports = router;
