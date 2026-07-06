# Guide Complet de Déploiement Gratuit - PartageDocs

Ce guide vous explique comment déployer PartageDocs **100% gratuitement** avec un domaine gratuit.

## Architecture du Déploiement Gratuit

- **Frontend** : GitHub Pages (gratuit)
- **Backend** : Render (plan gratuit)
- **Base de données** : Neon PostgreSQL (gratuit)
- **Stockage de fichiers** : AWS S3 (12 mois gratuit)
- **Domaine** : partagedocs.tk (gratuit)

---

## ÉTAPE 1 : Créer une Base de Données PostgreSQL Gratuite (Neon)

### 1.1 Créer un compte Neon

1. Allez sur https://neon.tech
2. Cliquez **"Sign up"**
3. Créez un compte avec votre email
4. Vérifiez votre email

### 1.2 Créer un projet

1. Cliquez **"New Project"**
2. Nommez-le `partagedocs`
3. Choisissez la région la plus proche de vous
4. Cliquez **"Create project"**

### 1.3 Récupérer la chaîne de connexion

1. Dans le dashboard, cliquez sur votre projet
2. Allez dans l'onglet **"Connection"**
3. Copiez l'URL PostgreSQL (elle ressemble à : `postgresql://user:password@host/partagedocs`)
4. **Notez-la** - vous en aurez besoin plus tard

---

## ÉTAPE 2 : Configurer AWS S3 (Stockage Gratuit)

### 2.1 Créer un compte AWS

1. Allez sur https://aws.amazon.com
2. Cliquez **"Create an AWS Account"**
3. Remplissez vos informations
4. Ajoutez une carte de crédit (gratuit pour 12 mois)
5. Vérifiez votre compte

### 2.2 Créer les buckets S3

1. Allez sur https://s3.console.aws.amazon.com
2. Cliquez **"Create bucket"**
3. Nommez-le `partagedocs-documents`
4. Choisissez la région `us-east-1`
5. **Décochez** "Block all public access" (pour que les documents soient publics)
6. Cliquez **"Create bucket"**
7. Répétez pour créer un deuxième bucket `partagedocs-cv` (gardez-le privé)

### 2.3 Créer les clés d'accès AWS

1. Allez sur https://console.aws.amazon.com
2. Cliquez sur votre nom d'utilisateur (en haut à droite) → **"Security credentials"**
3. Allez dans **"Access keys"**
4. Cliquez **"Create access key"**
5. Choisissez **"Command Line Interface (CLI)"**
6. Acceptez et cliquez **"Create access key"**
7. **Copiez et sauvegardez** :
   - Access Key ID
   - Secret Access Key

---

## ÉTAPE 3 : Déployer le Backend sur Render

### 3.1 Préparer le code

1. Allez sur votre dépôt GitHub : https://github.com/marcododji284-svg/partagedocs
2. Créez un dossier `backend-only` avec uniquement le contenu du dossier `backend/`
3. Créez un nouveau dépôt GitHub nommé `partagedocs-backend`
4. Poussez le contenu du dossier `backend/` dedans

**Ou plus simplement**, créez une branche `backend` :
```bash
git clone https://github.com/marcododji284-svg/partagedocs.git
cd partagedocs
git checkout -b backend
# Supprimez le dossier frontend
rm -rf frontend
git add .
git commit -m "Backend only"
git push origin backend
```

### 3.2 Déployer sur Render

1. Allez sur https://render.com
2. Cliquez **"New +"** → **"Web Service"**
3. Connectez votre compte GitHub
4. Cherchez le dépôt `partagedocs` et sélectionnez-le
5. Configurez :
   - **Name** : `partagedocs-api`
   - **Environment** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Plan** : Free (gratuit)

### 3.3 Ajouter les variables d'environnement

Dans Render, allez dans **"Environment"** et ajoutez :

```
DATABASE_URL=postgresql://user:password@host/partagedocs
PORT=4000
JWT_SECRET=votre-clé-secrète-très-longue-et-aléatoire
BOOTSTRAP_SUPERADMIN_CODE=SUP-INIT01
CORS_ORIGIN=https://partagedocs.tk
FRONTEND_URL=https://partagedocs.tk
OAUTH_REDIRECT_BASE=https://partagedocs-api.onrender.com
AWS_ACCESS_KEY_ID=votre-aws-access-key
AWS_SECRET_ACCESS_KEY=votre-aws-secret-key
AWS_REGION=us-east-1
AWS_DOCUMENTS_BUCKET=partagedocs-documents
AWS_CV_BUCKET=partagedocs-cv
GMAIL_USER=votre-email@gmail.com
GMAIL_APP_PASSWORD=votre-mot-de-passe-app-gmail
GOOGLE_CLIENT_ID=votre-google-client-id
GOOGLE_CLIENT_SECRET=votre-google-client-secret
FACEBOOK_APP_ID=votre-facebook-app-id
FACEBOOK_APP_SECRET=votre-facebook-app-secret
NODE_ENV=production
```

### 3.4 Déployer

Cliquez **"Create Web Service"** et attendez le déploiement (5-10 minutes).

Une fois terminé, vous aurez une URL comme : `https://partagedocs-api.onrender.com`

---

## ÉTAPE 4 : Déployer le Frontend sur GitHub Pages

### 4.1 Mettre à jour l'URL de l'API

1. Clonez votre dépôt localement :
```bash
git clone https://github.com/marcododji284-svg/partagedocs.git
cd partagedocs
```

2. Dans tous les fichiers HTML du dossier `frontend/`, remplacez :
```
https://partagedocs-api.onrender.com/api
```
par votre URL Render réelle (vous la trouverez dans le dashboard Render)

3. Committez et poussez :
```bash
git add frontend/
git commit -m "Update API URL for production"
git push origin main
```

### 4.2 Activer GitHub Pages

1. Allez sur https://github.com/marcododji284-svg/partagedocs
2. Cliquez **"Settings"** → **"Pages"**
3. Sous **"Source"**, sélectionnez **"Deploy from a branch"**
4. Branche : `main`
5. Dossier : `frontend`
6. Cliquez **"Save"**

Attendez 2-3 minutes. Votre site sera accessible à : `https://marcododji284-svg.github.io/partagedocs/`

---

## ÉTAPE 5 : Configurer le Domaine Gratuit (partagedocs.tk)

### 5.1 Créer le domaine

1. Allez sur https://www.freenom.com
2. Cliquez **"Find a domain"**
3. Tapez `partagedocs`
4. Choisissez `.tk` (gratuit)
5. Cliquez **"Checkout"**
6. Remplissez vos informations
7. Cliquez **"Complete Order"**

### 5.2 Configurer les DNS

1. Allez sur https://www.freenom.com/fr/clientarea.html
2. Cliquez **"My Domains"**
3. Cliquez **"Manage Domain"** pour `partagedocs.tk`
4. Allez dans **"Management Tools"** → **"Nameservers"**
5. Choisissez **"Use custom nameservers"**
6. Entrez les nameservers de Cloudflare (gratuit) :
   - `ns1.cloudflare.com`
   - `ns2.cloudflare.com`

### 5.3 Configurer Cloudflare (DNS gratuit)

1. Allez sur https://www.cloudflare.com
2. Cliquez **"Sign up"**
3. Créez un compte
4. Ajoutez votre site : `partagedocs.tk`
5. Copiez les nameservers Cloudflare (vous les aurez à l'écran)
6. Mettez-les à jour sur Freenom (voir étape 5.2)

### 5.4 Créer les enregistrements DNS dans Cloudflare

1. Allez sur le dashboard Cloudflare
2. Cliquez sur `partagedocs.tk`
3. Allez dans **"DNS"**
4. Créez les enregistrements suivants :

**Pour le frontend (GitHub Pages) :**
```
Type: CNAME
Name: www
Target: marcododji284-svg.github.io
```

**Pour le backend (Render) :**
```
Type: CNAME
Name: api
Target: partagedocs-api.onrender.com
```

**Pour le domaine racine :**
```
Type: A
Name: @
Target: 185.199.108.153
```

### 5.5 Attendre la propagation DNS

Les DNS peuvent prendre 24-48 heures à se propager. Pendant ce temps :
- `https://www.partagedocs.tk` → Frontend
- `https://api.partagedocs.tk` → Backend

---

## ÉTAPE 6 : Mettre à Jour les URLs dans le Code

### 6.1 Mettre à jour le frontend

Dans tous les fichiers HTML du dossier `frontend/`, remplacez :
```javascript
const API_BASE_URL = 'https://partagedocs-api.onrender.com/api';
```
par :
```javascript
const API_BASE_URL = 'https://api.partagedocs.tk/api';
```

### 6.2 Mettre à jour le backend

Dans Render, mettez à jour les variables d'environnement :
```
CORS_ORIGIN=https://www.partagedocs.tk
FRONTEND_URL=https://www.partagedocs.tk
OAUTH_REDIRECT_BASE=https://api.partagedocs.tk
```

---

## ÉTAPE 7 : Créer le Premier Compte Super Admin

1. Ouvrez `https://www.partagedocs.tk/auth.html`
2. Allez dans l'onglet **"Inscription"**
3. Remplissez le formulaire
4. Dans **"Code d'accès"**, entrez : `SUP-INIT01`
5. Cliquez **"S'inscrire"**
6. Vous êtes maintenant Super Admin !

---

## ÉTAPE 8 : Configuration Optionnelle (OAuth, Email)

### Gmail (pour l'envoi d'emails)

1. Créez un compte Gmail dédié
2. Activez la **validation en deux étapes**
3. Allez sur https://myaccount.google.com/apppasswords
4. Générez un mot de passe d'application
5. Mettez-le à jour dans Render : `GMAIL_APP_PASSWORD`

### Google OAuth

1. Allez sur https://console.cloud.google.com
2. Créez un nouveau projet
3. Allez dans **"APIs & Services"** → **"OAuth consent screen"**
4. Configurez votre application
5. Allez dans **"Credentials"** → **"Create OAuth Client ID"**
6. Type : **Web application**
7. Authorized redirect URIs : `https://api.partagedocs.tk/api/auth/google/callback`
8. Copiez le Client ID et Secret
9. Mettez-les à jour dans Render

---

## Vérifications Finales

- [ ] `https://api.partagedocs.tk/api/health` répond avec `{"status":"ok"}`
- [ ] `https://www.partagedocs.tk` affiche le site
- [ ] L'inscription/connexion fonctionne
- [ ] Les documents s'uploadent
- [ ] Les fichiers sont stockés sur S3

---

## Troubleshooting

### Le site est lent
- C'est normal avec le plan gratuit Render (il se met en veille après 15 min)
- La première requête après une veille prend 30-60 secondes

### CORS bloqué
- Vérifiez que `CORS_ORIGIN` dans Render correspond à votre domaine

### Les fichiers ne s'uploadent pas
- Vérifiez que les clés AWS sont correctes
- Vérifiez que les buckets S3 existent

### Les DNS ne fonctionnent pas
- Attendez 24-48 heures
- Vérifiez les enregistrements DNS dans Cloudflare

---

## Coûts

- **Neon PostgreSQL** : Gratuit (avec limite)
- **AWS S3** : Gratuit (12 mois, puis ~$0.023/GB)
- **Render** : Gratuit (plan Free)
- **GitHub Pages** : Gratuit
- **Domaine .tk** : Gratuit
- **Cloudflare DNS** : Gratuit

**Total : 0€/mois** (pendant 12 mois)

---

## Besoin d'aide ?

Consultez les documentations officielles :
- Neon : https://neon.tech/docs
- AWS S3 : https://docs.aws.amazon.com/s3/
- Render : https://render.com/docs
- GitHub Pages : https://pages.github.com
- Cloudflare : https://developers.cloudflare.com
