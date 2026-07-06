# PartageDocs — Guide de déploiement complet (production réelle)

Ce guide t'emmène de zéro à un site en ligne avec comptes, fichiers et e-mails
réellement persistants. Suis les étapes dans l'ordre — chaque étape donne une
valeur à copier dans `.env`.

---

## Étape 1 — Créer le projet Supabase (base de données + fichiers)

1. Va sur https://supabase.com → crée un compte gratuit → **New Project**.
2. Choisis un nom, un mot de passe de base de données (note-le), une région proche.
3. Une fois le projet créé, va dans **Project Settings → Database → Connection string**,
   onglet **URI**, mode **Transaction pooler** (port 6543). Copie cette chaîne →
   ce sera ta variable `DATABASE_URL`.
4. Va dans **Project Settings → API** :
   - **Project URL** → variable `SUPABASE_URL`
   - **service_role key** (clique "Reveal") → variable `SUPABASE_SERVICE_ROLE_KEY`
   ⚠️ Cette clé donne un accès total : ne la mets JAMAIS dans le frontend, seulement
   dans les variables d'environnement du backend.
5. Va dans **Storage** (menu de gauche) → crée deux buckets :
   - `documents` → coche **Public bucket** (les élèves doivent pouvoir les voir)
   - `cv` → laisse-le **privé** (décoché)

La base de données (tables) se crée automatiquement au premier démarrage du
serveur — tu n'as rien à faire de plus ici.

---

## Étape 2 — Créer le compte Google OAuth

1. Va sur https://console.cloud.google.com → crée un projet (ou utilise un existant).
2. **APIs & Services → OAuth consent screen** :
   - Type : External
   - Renseigne un nom d'app, ton e-mail, sauvegarde
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** :
   - Type d'application : **Web application**
   - **Authorized redirect URIs** → ajoute :
     `https://partagedocs-api.onrender.com/api/auth/google/callback`
     (remplace par ton URL Render réelle si différente — voir Étape 4)
4. Copie le **Client ID** → `GOOGLE_CLIENT_ID`
5. Copie le **Client Secret** → `GOOGLE_CLIENT_SECRET`

---

## Étape 3 — Créer l'app Facebook OAuth

1. Va sur https://developers.facebook.com → **Mes Apps → Créer une app**
   → type "Consumer" ou "Aucune" selon ce qui est proposé → donne un nom.
2. Dans le tableau de bord de l'app, ajoute le produit **Facebook Login**.
3. Dans **Facebook Login → Paramètres**, ajoute dans "URI de redirection OAuth valides" :
   `https://partagedocs-api.onrender.com/api/auth/facebook/callback`
4. Dans **Paramètres → Général** :
   - Copie l'**ID de l'app** → `FACEBOOK_APP_ID`
   - Copie la **Clé secrète** → `FACEBOOK_APP_SECRET`
5. Pense à passer l'app en mode **Live** (pas juste "En développement") une fois
   prêt, sinon seuls les testeurs ajoutés dans l'app pourront se connecter.

---

## Étape 4 — Déployer le backend sur Render

1. Crée un nouveau dépôt GitHub (ex: `partagedocs-backend`) et mets-y le contenu
   du dossier `backend/` de ce projet (pas `frontend/`).
2. Va sur https://render.com → connecte ton compte GitHub.
3. **New → Web Service** → choisis ton dépôt `partagedocs-backend`.
4. Configure :
   - **Name** : `partagedocs-api` (important : si tu choisis un autre nom,
     remplace `partagedocs-api.onrender.com` par le tien dans TOUS les fichiers
     du dossier `frontend/`, et dans les redirect URIs Google/Facebook ci-dessus)
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Plan** : Free
5. Dans **Environment**, ajoute toutes les variables de `.env.example` avec tes
   vraies valeurs (celles récoltées aux étapes 1-3), plus :
   - `OAUTH_REDIRECT_BASE` = `https://partagedocs-api.onrender.com`
   - `FRONTEND_URL` = l'URL GitHub Pages de l'étape 5 (tu peux la mettre à jour
     après coup si tu ne la connais pas encore)
   - `CORS_ORIGIN` = la même URL sans le chemin (ex: `https://tonpseudo.github.io`)
6. Clique **Create Web Service**. Le déploiement démarre. Regarde les logs :
   tu dois voir `PartageDocs API démarrée sur le port ...` et le code Super Admin
   de démarrage affiché.

⚠️ Le plan gratuit Render met le service en veille après 15 minutes d'inactivité.
La première requête après une veille prend 30-60 secondes à répondre — c'est normal.

---

## Étape 5 — Héberger le frontend sur GitHub Pages

1. Crée un dépôt GitHub (ex: `partagedocs-site`), mets-y le contenu du dossier
   `frontend/` (à la racine du dépôt).
2. Dans le dépôt : **Settings → Pages** → Source : **Deploy from a branch**,
   branche `main`, dossier `/ (root)`. Sauvegarde.
3. Après 1-2 minutes, ton site est visible à :
   `https://tonpseudo.github.io/partagedocs-site/`
4. Retourne dans Render (Étape 4) et mets à jour `FRONTEND_URL` et `CORS_ORIGIN`
   avec cette vraie URL, puis redéploie (Render redéploie automatiquement si
   tu modifies une variable d'environnement).

---

## Étape 6 — Compte Gmail pour l'envoi d'e-mail

1. Sur le compte Gmail dédié : active la **validation en deux étapes**
   (Compte Google → Sécurité) si ce n'est pas déjà fait — obligatoire pour
   générer un mot de passe d'application.
2. Toujours dans Sécurité, cherche **Mots de passe des applications**
   (ou va directement sur https://myaccount.google.com/apppasswords).
3. Génère-en un pour "Mail" / "Autre" → copie le mot de passe généré (16 caractères)
   → variable `GMAIL_APP_PASSWORD` (PAS le mot de passe normal du compte).
4. `GMAIL_USER` = l'adresse Gmail elle-même.

---

## Étape 7 — Créer le premier compte Super Admin

1. Ouvre `auth.html` sur ton site GitHub Pages.
2. Onglet **Inscription** → remplis le formulaire → dans **Code d'accès**,
   mets le code affiché dans les logs Render au premier démarrage
   (`SUP-INIT01` par défaut, sauf si tu as changé `BOOTSTRAP_SUPERADMIN_CODE`).
3. Tu es redirigé vers `super-admin.html`, connecté en Super Admin.
4. Va dans **Codes d'accès** → révoque immédiatement `SUP-INIT01` et génère-en
   un nouveau pour toi-même à l'avenir (le code de démarrage ne doit servir
   qu'une fois, par sécurité).

---

## Vérifications finales

- [ ] `https://partagedocs-api.onrender.com/api/health` renvoie `{"status":"ok"}`
- [ ] L'inscription/connexion classique fonctionne
- [ ] Les boutons Google/Facebook redirigent bien et créent un compte "membre"
- [ ] Un document ajouté depuis `admin.html` apparaît réellement dans `9eme.html`/`ns4.html`
      et son fichier s'ouvre bien (hébergé sur Supabase Storage, donc persistant)
- [ ] Approuver une candidature envoie un vrai e-mail (vérifie aussi les spams)
- [ ] Après un redéploiement Render, les documents/comptes/candidatures sont
      toujours là (preuve que la persistance Supabase fonctionne — plus de
      dépendance au disque local)

## En cas de souci

- **CORS bloqué** (erreurs dans la console navigateur) → vérifie que `CORS_ORIGIN`
  sur Render correspond exactement à l'URL de ton GitHub Pages (sans slash final).
- **OAuth redirige vers une erreur** → vérifie que l'URI de callback dans Google
  Cloud Console / Facebook Developers correspond au caractère près à
  `OAUTH_REDIRECT_BASE` + `/api/auth/google/callback` (ou `/facebook/callback`).
- **Upload de fichier échoue** → vérifie que les buckets `documents` et `cv`
  existent bien dans Supabase Storage, avec les bons noms exacts.
- **E-mail non reçu** → vérifie `GMAIL_APP_PASSWORD` (pas le mot de passe normal),
  et que la validation en deux étapes est active sur le compte Gmail.
