require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { initSchema } = require('./src/db');

const authRoutes = require('./src/routes/auth');
const oauthRoutes = require('./src/routes/oauth');
const classesRoutes = require('./src/routes/classes');
const matieresRoutes = require('./src/routes/matieres');
const documentsRoutes = require('./src/routes/documents');
const codesRoutes = require('./src/routes/codes');
const candidaturesRoutes = require('./src/routes/candidatures');
const usersRoutes = require('./src/routes/users');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/auth', oauthRoutes); // ajoute /api/auth/google, /api/auth/facebook (+ callbacks)
app.use('/api/classes', classesRoutes);
app.use('/api', matieresRoutes); // /api/classes/:classeId/matieres + /api/matieres/:id
app.use('/api/documents', documentsRoutes);
app.use('/api/codes', codesRoutes);
app.use('/api/candidatures', candidaturesRoutes);
app.use('/api/users', usersRoutes);

// Gestion d'erreurs (Multer, etc.)
app.use((err, req, res, next) => {
  if (err && err.message) return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

const PORT = process.env.PORT || 4000;

initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`PartageDocs API démarrée sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Impossible d\'initialiser la base de données :', err.message);
    console.error('Vérifiez DATABASE_URL dans vos variables d\'environnement.');
    process.exit(1);
  });
