const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { slugify } = require('../utils/codeGenerator');

const router = express.Router();

// GET /api/classes/:classeId/matieres — public
router.get('/classes/:classeId/matieres', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM matieres WHERE classe_id = $1 ORDER BY name',
    [req.params.classeId]
  );
  res.json({ matieres: rows });
});

// POST /api/classes/:classeId/matieres — Super Admin uniquement — body: { name, icon }
router.post('/classes/:classeId/matieres', requireAuth, requireRole('super-admin'), async (req, res) => {
  const { name, icon } = req.body;
  const classeId = req.params.classeId;

  const classe = await pool.query('SELECT id FROM classes WHERE id = $1', [classeId]);
  if (classe.rows.length === 0) return res.status(404).json({ error: 'Classe introuvable.' });
  if (!name || !name.trim()) return res.status(400).json({ error: 'Le nom de la matière est requis.' });

  const slug = slugify(name);
  const existing = await pool.query(
    'SELECT id FROM matieres WHERE classe_id = $1 AND slug = $2',
    [classeId, slug]
  );
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Cette matière existe déjà pour cette classe.' });
  }

  const inserted = await pool.query(
    'INSERT INTO matieres (classe_id, slug, name, icon) VALUES ($1, $2, $3, $4) RETURNING *',
    [classeId, slug, name.trim(), icon || '📘']
  );
  res.status(201).json({ matiere: inserted.rows[0] });
});

// DELETE /api/matieres/:id — Super Admin uniquement
router.delete('/matieres/:id', requireAuth, requireRole('super-admin'), async (req, res) => {
  const result = await pool.query('DELETE FROM matieres WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Matière introuvable.' });
  res.json({ success: true });
});

module.exports = router;
