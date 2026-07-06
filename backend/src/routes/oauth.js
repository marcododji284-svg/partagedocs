const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// URL de la page frontend qui réceptionne le jeton après connexion (voir oauth-callback.html)
function callbackFrontendUrl(token, user) {
  const base = process.env.FRONTEND_URL || 'http://localhost:5500';
  const params = new URLSearchParams({
    token,
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });
  return `${base}/oauth-callback.html?${params.toString()}`;
}

/**
 * Trouve un compte par e-mail, ou le crée (rôle "membre" par défaut : la connexion
 * sociale ne permet pas d'obtenir un rôle admin/super-admin, seul un code le permet).
 */
async function findOrCreateOAuthUser({ name, email, provider }) {
  const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (existing.rows[0]) return existing.rows[0];

  const inserted = await pool.query(
    'INSERT INTO users (name, email, oauth_provider, role) VALUES ($1, $2, $3, $4) RETURNING *',
    [name || email, email, provider, 'membre']
  );
  return inserted.rows[0];
}

/* ================================ GOOGLE ================================ */

// GET /api/auth/google — redirige vers l'écran de consentement Google
router.get('/google', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.OAUTH_REDIRECT_BASE}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account'
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GET /api/auth/google/callback — échange le code contre un profil, connecte/crée le compte
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Code OAuth Google manquant.');

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.OAUTH_REDIRECT_BASE}/api/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    });
    const tokenBody = await tokenRes.json();
    if (!tokenBody.access_token) throw new Error('Échange de code Google échoué.');

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` }
    });
    const profile = await profileRes.json();

    const user = await findOrCreateOAuthUser({
      name: profile.name,
      email: profile.email,
      provider: 'google'
    });

    res.redirect(callbackFrontendUrl(signToken(user), user));
  } catch (err) {
    console.error('Erreur OAuth Google :', err.message);
    res.redirect((process.env.FRONTEND_URL || '') + '/auth.html?oauth_error=google');
  }
});

/* =============================== FACEBOOK ================================ */

// GET /api/auth/facebook — redirige vers l'écran de consentement Facebook
router.get('/facebook', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID,
    redirect_uri: `${process.env.OAUTH_REDIRECT_BASE}/api/auth/facebook/callback`,
    scope: 'email public_profile',
    response_type: 'code'
  });
  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`);
});

// GET /api/auth/facebook/callback
router.get('/facebook/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Code OAuth Facebook manquant.');

  try {
    const tokenParams = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      redirect_uri: `${process.env.OAUTH_REDIRECT_BASE}/api/auth/facebook/callback`,
      code
    });
    const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams.toString()}`);
    const tokenBody = await tokenRes.json();
    if (!tokenBody.access_token) throw new Error('Échange de code Facebook échoué.');

    const profileRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${tokenBody.access_token}`
    );
    const profile = await profileRes.json();

    if (!profile.email) {
      throw new Error("Facebook n'a pas fourni d'adresse e-mail (compte sans e-mail vérifié).");
    }

    const user = await findOrCreateOAuthUser({
      name: profile.name,
      email: profile.email,
      provider: 'facebook'
    });

    res.redirect(callbackFrontendUrl(signToken(user), user));
  } catch (err) {
    console.error('Erreur OAuth Facebook :', err.message);
    res.redirect((process.env.FRONTEND_URL || '') + '/auth.html?oauth_error=facebook');
  }
});

module.exports = router;
