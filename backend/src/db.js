const { Pool } = require('pg');

// DATABASE_URL vient de la base de données persistante
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      oauth_provider TEXT,
      role          TEXT NOT NULL DEFAULT 'membre' CHECK (role IN ('membre', 'admin', 'super-admin')),
      code_used     TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS access_codes (
      code            TEXT PRIMARY KEY,
      role            TEXT NOT NULL CHECK (role IN ('admin', 'super-admin')),
      status          TEXT NOT NULL DEFAULT 'disponible' CHECK (status IN ('disponible', 'utilise', 'revoque')),
      account_email   TEXT,
      created_by      INTEGER,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      used_at         TIMESTAMPTZ,
      revoked_at      TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS classes (
      id    TEXT PRIMARY KEY,
      name  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS matieres (
      id         SERIAL PRIMARY KEY,
      classe_id  TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      slug       TEXT NOT NULL,
      name       TEXT NOT NULL,
      icon       TEXT NOT NULL DEFAULT '📘',
      UNIQUE(classe_id, slug)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id           SERIAL PRIMARY KEY,
      classe_id    TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      matiere_id   INTEGER NOT NULL REFERENCES matieres(id) ON DELETE CASCADE,
      type         TEXT NOT NULL CHECK (type IN ('lecons', 'exercices', 'corriges')),
      titre        TEXT NOT NULL,
      description  TEXT DEFAULT '',
      statut       TEXT NOT NULL DEFAULT 'publie' CHECK (statut IN ('publie', 'brouillon')),
      created_by   INTEGER REFERENCES users(id),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS document_files (
      id               SERIAL PRIMARY KEY,
      document_id      INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      original_name    TEXT NOT NULL,
      storage_path     TEXT NOT NULL,
      public_url       TEXT NOT NULL,
      mime_type        TEXT,
      size_bytes       INTEGER,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS candidatures (
      id                 SERIAL PRIMARY KEY,
      nom                TEXT NOT NULL,
      email              TEXT NOT NULL,
      telephone          TEXT,
      diplome            TEXT,
      classes_json       TEXT NOT NULL DEFAULT '[]',
      matieres_json      TEXT NOT NULL DEFAULT '[]',
      experience         TEXT,
      motivation         TEXT,
      cv_original_name   TEXT,
      cv_storage_path    TEXT,
      statut             TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'approuvee', 'rejetee')),
      generated_code     TEXT,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const { rows: classeRows } = await pool.query('SELECT COUNT(*)::int AS n FROM classes');
  if (classeRows[0].n === 0) {
    await pool.query(
      "INSERT INTO classes (id, name) VALUES ('9eme', '9ème'), ('ns4', 'NS4')"
    );
    const matieres = [
      ['9eme', 'mathematiques', 'Mathématiques', '∑'],
      ['9eme', 'francais', 'Français', '📖'],
      ['9eme', 'sciences', 'Sciences', '🔬'],
      ['9eme', 'histoire-geo', 'Histoire-Géographie', '🌍'],
      ['ns4', 'mathematiques', 'Mathématiques', '∑'],
      ['ns4', 'physique', 'Physique', '⚛'],
      ['ns4', 'chimie', 'Chimie', '🧪'],
      ['ns4', 'philosophie', 'Philosophie', '💭']
    ];
    for (const m of matieres) {
      await pool.query(
        'INSERT INTO matieres (classe_id, slug, name, icon) VALUES ($1, $2, $3, $4)',
        m
      );
    }
  }

  const { rows: codeRows } = await pool.query('SELECT COUNT(*)::int AS n FROM access_codes');
  if (codeRows[0].n === 0) {
    const bootstrapCode = process.env.BOOTSTRAP_SUPERADMIN_CODE || 'SUP-INIT01';
    await pool.query(
      "INSERT INTO access_codes (code, role, status) VALUES ($1, 'super-admin', 'disponible')",
      [bootstrapCode]
    );
    console.log(`Code Super Admin de démarrage créé : ${bootstrapCode}`);
    console.log('Utilisez-le une seule fois, puis révoquez-le et générez-en un nouveau depuis super-admin.html.');
  }
}

module.exports = { pool, initSchema };
