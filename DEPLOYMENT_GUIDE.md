# Guide de Déploiement Permanent - PartageDocs

Ce guide vous aide à déployer PartageDocs en production avec une architecture permanente.

## Architecture

- **Frontend** : HTML/CSS/JavaScript statique
- **Backend** : Node.js/Express
- **Base de données** : PostgreSQL (TiDB ou autre service)
- **Stockage** : AWS S3
- **Hébergement** : Service cloud (Render, Railway, Heroku, etc.)

## Étapes de Déploiement

### 1. Préparer la Base de Données PostgreSQL

1. Créez un projet PostgreSQL sur un service cloud (Supabase, Railway, AWS RDS, etc.)
2. Notez la chaîne de connexion (`DATABASE_URL`)
3. Exemple : `postgresql://user:password@host:5432/partagedocs`

### 2. Configurer AWS S3

1. Créez deux buckets S3 :
   - `partagedocs-documents` (public pour les documents)
   - `partagedocs-cv` (privé pour les CV)

2. Créez des clés d'accès AWS IAM avec les permissions S3
3. Notez :
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`

### 3. Configurer les Variables d'Environnement

Créez un fichier `.env` dans le dossier `backend/` avec :

```env
DATABASE_URL=postgresql://user:password@host:5432/partagedocs
PORT=4000
JWT_SECRET=your-very-secure-random-key
BOOTSTRAP_SUPERADMIN_CODE=SUP-INIT01
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
OAUTH_REDIRECT_BASE=https://api.yourdomain.com
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_DOCUMENTS_BUCKET=partagedocs-documents
AWS_CV_BUCKET=partagedocs-cv
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
GOOGLE_CLIENT_ID=your-google-id
GOOGLE_CLIENT_SECRET=your-google-secret
FACEBOOK_APP_ID=your-facebook-id
FACEBOOK_APP_SECRET=your-facebook-secret
NODE_ENV=production
```

### 4. Déployer le Backend

#### Option A : Render (Recommandé)

1. Créez un dépôt GitHub avec le contenu du dossier `backend/`
2. Allez sur https://render.com
3. Créez un nouveau **Web Service**
4. Connectez votre dépôt GitHub
5. Configurez :
   - **Name** : `partagedocs-api`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Plan** : Standard (ou Free pour tester)
6. Ajoutez les variables d'environnement dans **Environment**
7. Déployez

#### Option B : Railway

1. Créez un dépôt GitHub avec le contenu du dossier `backend/`
2. Allez sur https://railway.app
3. Créez un nouveau projet
4. Connectez votre dépôt GitHub
5. Ajoutez une base de données PostgreSQL
6. Configurez les variables d'environnement
7. Déployez

### 5. Déployer le Frontend

1. Mettez à jour l'URL de l'API dans tous les fichiers HTML du dossier `frontend/`
   - Remplacez `https://partagedocs-api.onrender.com/api` par votre URL réelle
   - Exemple : `https://api.yourdomain.com/api`

2. Déployez les fichiers statiques :
   - **GitHub Pages** : Créez un dépôt, mettez les fichiers HTML, activez Pages
   - **Netlify** : Connectez votre dépôt GitHub
   - **Vercel** : Connectez votre dépôt GitHub
   - **AWS S3 + CloudFront** : Uploadez les fichiers et configurez CloudFront

### 6. Configurer un Domaine Personnalisé

1. Achetez un domaine (Namecheap, GoDaddy, etc.)
2. Configurez les DNS :
   - `api.yourdomain.com` → Pointe vers le backend (Render, Railway, etc.)
   - `yourdomain.com` → Pointe vers le frontend (GitHub Pages, Netlify, etc.)
3. Mettez à jour les variables d'environnement avec vos URLs

### 7. Créer le Premier Compte Super Admin

1. Ouvrez votre site frontend
2. Allez sur la page d'authentification (`auth.html`)
3. Cliquez sur **Inscription**
4. Entrez le code d'accès : `SUP-INIT01`
5. Créez votre compte Super Admin
6. Allez sur `super-admin.html` et révoquez immédiatement le code `SUP-INIT01`
7. Générez un nouveau code pour vous-même

## Vérifications Finales

- [ ] L'API répond sur `https://api.yourdomain.com/api/health`
- [ ] L'inscription/connexion fonctionne
- [ ] Les documents s'uploadent et s'affichent correctement
- [ ] Les fichiers sont stockés sur S3
- [ ] Les e-mails de candidature sont envoyés
- [ ] OAuth Google/Facebook fonctionne (si configuré)
- [ ] Les données persistent après un redéploiement

## Troubleshooting

### CORS bloqué
- Vérifiez que `CORS_ORIGIN` correspond exactement à votre URL frontend

### OAuth échoue
- Vérifiez les URIs de callback dans Google Cloud Console / Facebook Developers
- Assurez-vous que `OAUTH_REDIRECT_BASE` est correct

### Upload de fichier échoue
- Vérifiez que les buckets S3 existent et que les permissions sont correctes
- Vérifiez les clés AWS

### E-mails non reçus
- Vérifiez que `GMAIL_APP_PASSWORD` est correct (pas le mot de passe normal)
- Assurez-vous que la validation en deux étapes est activée sur Gmail

## Support

Pour toute question, consultez la documentation originale dans `DEPLOIEMENT.md`.
