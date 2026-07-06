const express = require('express');
const multer = require('multer');
const { pool } = require('../db');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const { uploadDocumentFile, deleteDocumentFile } = require('../storage');

const router = express.Router();

const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo

// En mémoire (pas de disque local persistant sur Render) : le buffer est
// envoyé directement vers Supabase Storage dans la route ci-dessous.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Type de fichier non autorisé (PDF, JPG, PNG, WEBP uniquement).'));
    }
    cb(null, true);
  }
});

async function attachFiles(doc) {
  const { rows } = await pool.query('SELECT * FROM document_files WHERE document_id = $1', [doc.id]);
  return { ...doc, fichiers: rows };
}

/**
 * GET /api/documents?classe=9eme&matiere=3&type=lecons
 * Public, mais montre aussi les brouillons si le requérant est admin/super-admin.
 */
router.get('/', optionalAuth, async (req, res) => {
  const { classe, matiere, type } = req.query;
  const isStaff = req.user && ['admin', 'super-admin'].includes(req.user.role);

  let sql = `
    SELECT documents.*, matieres.name AS matiere_name, matieres.slug AS matiere_slug, classes.name AS classe_name
    FROM documents
    JOIN matieres ON matieres.id = documents.matiere_id
    JOIN classes ON classes.id = documents.classe_id
    WHERE 1=1
  `;
  const args = [];

  if (classe) { args.push(classe); sql += ` AND documents.classe_id = $${args.length}`; }
  if (matiere) { args.push(matiere); sql += ` AND documents.matiere_id = $${args.length}`; }
  if (type) { args.push(type); sql += ` AND documents.type = $${args.length}`; }
  if (!isStaff) sql += " AND documents.statut = 'publie'";
  sql += ' ORDER BY documents.created_at DESC';

  const { rows } = await pool.query(sql, args);
  const withFiles = await Promise.all(rows.map(attachFiles));
  res.json({ documents: withFiles });
});

// GET /api/documents/:id
router.get('/:id', optionalAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT documents.*, matieres.name AS matiere_name, matieres.slug AS matiere_slug, classes.name AS classe_name
     FROM documents
     JOIN matieres ON matieres.id = documents.matiere_id
     JOIN classes ON classes.id = documents.classe_id
     WHERE documents.id = $1`,
    [req.params.id]
  );
  const doc = rows[0];
  if (!doc) return res.status(404).json({ error: 'Document introuvable.' });

  const isStaff = req.user && ['admin', 'super-admin'].includes(req.user.role);
  if (doc.statut !== 'publie' && !isStaff) return res.status(404).json({ error: 'Document introuvable.' });

  res.json({ document: await attachFiles(doc) });
});

/**
 * POST /api/documents — Admin ou Super Admin
 * multipart/form-data: classe, matiere, type, titre, description, statut, fichiers(1..5)
 */
router.post('/', requireAuth, requireRole('admin', 'super-admin'), upload.array('fichiers', 5), async (req, res) => {
  const { classe, matiere, type, titre, description, statut } = req.body;

  if (!classe || !matiere || !type || !titre) {
    return res.status(400).json({ error: 'Classe, matière, type et titre sont requis.' });
  }
  if (!['lecons', 'exercices', 'corriges'].includes(type)) {
    return res.status(400).json({ error: 'Type de contenu invalide.' });
  }
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Au moins un fichier est requis.' });
  }

  const matiereCheck = await pool.query(
    'SELECT * FROM matieres WHERE id = $1 AND classe_id = $2',
    [matiere, classe]
  );
  if (matiereCheck.rows.length === 0) {
    return res.status(400).json({ error: 'Matière invalide pour cette classe.' });
  }

  try {
    const docResult = await pool.query(
      `INSERT INTO documents (classe_id, matiere_id, type, titre, description, statut, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [classe, matiere, type, titre.trim(), description || '', statut === 'brouillon' ? 'brouillon' : 'publie', req.user.id]
    );
    const doc = docResult.rows[0];

    for (const file of req.files) {
      const { storagePath, publicUrl } = await uploadDocumentFile(file);
      await pool.query(
        `INSERT INTO document_files (document_id, original_name, storage_path, public_url, mime_type, size_bytes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [doc.id, file.originalname, storagePath, publicUrl, file.mimetype, file.size]
      );
    }

    res.status(201).json({ document: await attachFiles(doc) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Erreur lors de l'ajout du document." });
  }
});

// PATCH /api/documents/:id/statut — bascule publié/brouillon
router.patch('/:id/statut', requireAuth, requireRole('admin', 'super-admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
  const doc = rows[0];
  if (!doc) return res.status(404).json({ error: 'Document introuvable.' });

  const nextStatut = doc.statut === 'publie' ? 'brouillon' : 'publie';
  await pool.query('UPDATE documents SET statut = $1 WHERE id = $2', [nextStatut, doc.id]);
  res.json({ statut: nextStatut });
});

// DELETE /api/documents/:id — supprime aussi les fichiers dans Supabase Storage
router.delete('/:id', requireAuth, requireRole('admin', 'super-admin'), async (req, res) => {
  const { rows: files } = await pool.query('SELECT * FROM document_files WHERE document_id = $1', [req.params.id]);
  for (const f of files) {
    await deleteDocumentFile(f.storage_path).catch(() => {});
  }

  const result = await pool.query('DELETE FROM documents WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Document introuvable.' });
  res.json({ success: true });
});

module.exports = router;
