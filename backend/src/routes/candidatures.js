const express = require('express');
const multer = require('multer');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { generateAccessCode } = require('../utils/codeGenerator');
const { uploadCvFile, getSignedCvUrl } = require('../storage');
const { sendMail } = require('../mailer');

const router = express.Router();

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Format de CV non autorisé (PDF, DOC, DOCX uniquement).'));
    }
    cb(null, true);
  }
});

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/candidatures — public
router.post('/', upload.single('cv'), async (req, res) => {
  const { nom, email, telephone, diplome, classes, matieres, experience, motivation } = req.body;

  if (!nom || !nom.trim()) return res.status(400).json({ error: 'Le nom est requis.' });
  if (!email || !isValidEmail(email)) return res.status(400).json({ error: 'E-mail invalide.' });
  if (!telephone) return res.status(400).json({ error: 'Le téléphone est requis.' });
  if (!experience || !experience.trim()) return res.status(400).json({ error: "L'expérience est requise." });
  if (!req.file) return res.status(400).json({ error: 'Le CV est requis.' });

  let classesArr, matieresArr;
  try {
    classesArr = JSON.parse(classes || '[]');
    matieresArr = JSON.parse(matieres || '[]');
  } catch (e) {
    return res.status(400).json({ error: 'Format de classes/matières invalide.' });
  }
  if (classesArr.length === 0) return res.status(400).json({ error: 'Au moins une classe est requise.' });
  if (matieresArr.length === 0) return res.status(400).json({ error: 'Au moins une matière est requise.' });

  try {
    const { storagePath } = await uploadCvFile(req.file);

    const inserted = await pool.query(
      `INSERT INTO candidatures
        (nom, email, telephone, diplome, classes_json, matieres_json, experience, motivation, cv_original_name, cv_storage_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        nom.trim(), email, telephone, diplome || '',
        JSON.stringify(classesArr), JSON.stringify(matieresArr),
        experience.trim(), motivation || '', req.file.originalname, storagePath
      ]
    );

    res.status(201).json({ id: inserted.rows[0].id, message: 'Candidature envoyée avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Erreur lors de l'envoi de la candidature." });
  }
});

// GET /api/candidatures — admin/super-admin
router.get('/', requireAuth, requireRole('admin', 'super-admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM candidatures ORDER BY created_at DESC');
  const candidatures = rows.map((c) => ({
    ...c,
    classes: JSON.parse(c.classes_json),
    matieres: JSON.parse(c.matieres_json)
  }));
  res.json({ candidatures });
});

// GET /api/candidatures/:id/cv — lien signé temporaire (bucket privé)
router.get('/:id/cv', requireAuth, requireRole('admin', 'super-admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM candidatures WHERE id = $1', [req.params.id]);
  const candidature = rows[0];
  if (!candidature || !candidature.cv_storage_path) {
    return res.status(404).json({ error: 'CV introuvable.' });
  }
  const url = await getSignedCvUrl(candidature.cv_storage_path);
  res.redirect(url);
});

/**
 * POST /api/candidatures/:id/approve — Super Admin
 * Génère un code Admin, l'enregistre, ENVOIE un e-mail réel au candidat
 * (via Gmail SMTP), et renvoie aussi le message texte en secours/log.
 */
router.post('/:id/approve', requireAuth, requireRole('super-admin'), async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM candidatures WHERE id = $1', [req.params.id]);
  const candidature = rows[0];
  if (!candidature) return res.status(404).json({ error: 'Candidature introuvable.' });

  const code = generateAccessCode('admin');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO access_codes (code, role, status, created_by) VALUES ($1, $2, $3, $4)',
      [code, 'admin', 'disponible', req.user.id]
    );
    await client.query(
      "UPDATE candidatures SET statut = 'approuvee', generated_code = $1 WHERE id = $2",
      [code, candidature.id]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: "Erreur lors de l'approbation." });
  } finally {
    client.release();
  }

  const message =
    `Bonjour ${candidature.nom},\n\n` +
    `Nous avons le plaisir de vous informer que votre candidature pour rejoindre l'équipe pédagogique de PartageDocs a été acceptée.\n\n` +
    `Voici votre code d'accès administrateur, à saisir dans le champ "Code d'accès" lors de votre inscription :\n\n` +
    `${code}\n\n` +
    `Ce code est personnel et à usage unique : une fois utilisé, il restera lié à votre compte tant qu'il ne sera pas révoqué.\n\n` +
    `Rendez-vous sur la page d'inscription pour créer votre compte : ${process.env.FRONTEND_URL || ''}/auth.html\n\n` +
    `Bienvenue dans l'équipe !\nL'équipe PartageDocs`;

  const emailResult = await sendMail({
    to: candidature.email,
    subject: 'Votre candidature PartageDocs a été acceptée',
    text: message
  });

  res.json({ code, message, emailSent: emailResult.sent });
});

// POST /api/candidatures/:id/reject
router.post('/:id/reject', requireAuth, requireRole('admin', 'super-admin'), async (req, res) => {
  const result = await pool.query("UPDATE candidatures SET statut = 'rejetee' WHERE id = $1", [req.params.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Candidature introuvable.' });
  res.json({ success: true });
});

module.exports = router;
