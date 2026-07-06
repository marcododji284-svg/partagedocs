const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, role, name }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Jeton invalide ou expiré.' });
  }
}

// Autorise seulement les rôles listés (ex: requireRole('admin', 'super-admin'))
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé : rôle insuffisant.' });
    }
    next();
  };
}

// Comme requireAuth, mais ne bloque pas si absent/invalide : req.user reste undefined.
// Utile pour des routes publiques dont le comportement change légèrement si connecté.
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    // jeton invalide : on ignore simplement, la route reste accessible en mode public
  }
  next();
}

module.exports = { requireAuth, requireRole, optionalAuth };
