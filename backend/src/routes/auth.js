const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * POST /api/auth/signup
 * body: { name, email, password, accessCode? }
 * Le code est vérifié et marqué "utilisé" dans une transaction Postgres,
 * garantissant qu'il ne peut être consommé que par un seul compte.
 */
router.post('/signup', async (req, res) => {
  const { name, email, password, accessCode } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'Le nom est requis.' });
  if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'Adresse e-mail invalide.' });
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Un compte existe déjà avec cet e-mail.' });
    }

    const trimmedCode = (accessCode || '').trim().toUpperCase();
    let role = 'membre';

    if (trimmedCode) {
      const codeResult = await client.query(
        "SELECT * FROM access_codes WHERE code = $1 FOR UPDATE",
        [trimmedCode]
      );
      const codeEntry = codeResult.rows[0];
      if (!codeEntry || codeEntry.status !== 'disponible') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Ce code est invalide, déjà utilisé, ou a été révoqué.' });
      }
      role = codeEntry.role;
      await client.query(
        "UPDATE access_codes SET status = 'utilise', account_email = $1, used_at = now() WHERE code = $2",
        [email, trimmedCode]
      );
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const insertResult = await client.query(
      'INSERT INTO users (name, email, password_hash, role, code_used) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role',
      [name.trim(), email, passwordHash, role, trimmedCode || null]
    );

    await client.query('COMMIT');

    const user = insertResult.rows[0];
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la création du compte.' });
  } finally {
    client.release();
  }
});

// POST /api/auth/login — body: { email, password }
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'E-mail et mot de passe requis.' });

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];

  if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' });
  }

  res.json({
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Compte introuvable.' });
  res.json({ user: rows[0] });
});

module.exports = router;
