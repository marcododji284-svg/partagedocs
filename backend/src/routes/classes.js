const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { slugify } = require('../utils/codeGenerator');

const router = express.Router();

// GET /api/classes — public
router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM classes ORDER BY name');
  res.json({ classes: rows });
});

// POST /api/classes — Super Admin uniquement — body: { name }
router.post('/', requireAuth, requireRole('super-admin'), async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Le nom de la classe est requis.' });

  const id = slugify(name);
  const existing = await pool.query('SELECT id FROM classes WHERE id = $1', [id]);
  if (existing.rows.length > 0) return res.status(409).json({ error: 'Cette classe existe déjà.' });

  await pool.query('INSERT INTO classes (id, name) VALUES ($1, $2)', [id, name.trim()]);
  res.status(201).json({ classe: { id, name: name.trim() } });
});

// DELETE /api/classes/:id — Super Admin uniquement (cascade matières/documents)
router.delete('/:id', requireAuth, requireRole('super-admin'), async (req, res) => {
  const result = await pool.query('DELETE FROM classes WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Classe introuvable.' });
  res.json({ success: true });
});

module.exports = router;
