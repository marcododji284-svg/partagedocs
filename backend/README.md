# PartageDocs — Backend API

API Node.js/Express + SQLite pour PartageDocs : comptes (avec système de
codes d'accès Admin / Super Admin à usage unique), classes & matières,
documents (upload de fichiers), candidatures enseignants.

## Installation

```bash
cd backend
npm install
cp .env.example .env
# Ouvrez .env et changez au minimum JWT_SECRET
npm start
```

Le serveur démarre sur `http://localhost:4000` (modifiable via `PORT` dans `.env`).
La base de données est un simple fichier `partagedocs.sqlite` créé automatiquement
au premier démarrage, avec les classes/matières par défaut (9ème, NS4) déjà en place.

Au tout premier démarrage, un code Super Admin de démarrage est créé et affiché
dans la console (`BOOTSTRAP_SUPERADMIN_CODE`, par défaut `SUP-INIT01`). Utilisez-le
une seule fois pour créer votre premier compte Super Admin via `/api/auth/signup`,
puis révoquez-le et générez-en un nouveau depuis l'espace Super Admin.

## Brancher le frontend existant

Les pages HTML actuelles (auth.html, admin.html, super-admin.html, candidature.html,
9eme.html, ns4.html, 9eme-document.html, ns4-document.html) fonctionnent aujourd'hui
avec des données simulées en JavaScript. Pour les connecter à cette API :

1. Remplacer les tableaux en mémoire (`DEMO_ACCESS_CODES`, `MATIERES`, `DOCS`,
   `CANDIDATURES`, `CODES`, `COMPTES`) par des appels `fetch()` vers les routes
   ci-dessous.
2. Stocker le jeton reçu à la connexion/inscription (`token`) et l'envoyer dans
   l'en-tête `Authorization: Bearer <token>` de chaque requête protégée.
3. Remplacer les `<input type="file">` simulés par un vrai envoi `multipart/form-data`
   vers `/api/documents` ou `/api/candidatures`.

Je peux faire cette intégration pour vous sur demande — dites-le simplement.

## Référence de l'API

### Authentification

| Méthode | Route              | Accès  | Description |
|---------|---------------------|--------|--------------|
| POST    | `/api/auth/signup`  | Public | `{ name, email, password, accessCode? }` → crée un compte. Le rôle dépend du code fourni. |
| POST    | `/api/auth/login`   | Public | `{ email, password }` → `{ token, user }` |
| GET     | `/api/auth/me`       | Connecté | Profil du compte connecté |

### Classes & matières

| Méthode | Route | Accès | Description |
|---------|-------|-------|--------------|
| GET     | `/api/classes` | Public | Liste des classes |
| POST    | `/api/classes` | Super Admin | `{ name }` → crée une classe |
| DELETE  | `/api/classes/:id` | Super Admin | Supprime une classe (cascade matières/documents) |
| GET     | `/api/classes/:classeId/matieres` | Public | Matières d'une classe |
| POST    | `/api/classes/:classeId/matieres` | Super Admin | `{ name, icon }` → crée une matière |
| DELETE  | `/api/matieres/:id` | Super Admin | Supprime une matière |

### Documents

| Méthode | Route | Accès | Description |
|---------|-------|-------|--------------|
| GET     | `/api/documents?classe=&matiere=&type=` | Public | Liste des documents publiés |
| GET     | `/api/documents/:id` | Public | Détail d'un document + ses fichiers |
| POST    | `/api/documents` | Admin / Super Admin | `multipart/form-data`: `classe, matiere, type, titre, description, statut, fichiers[]` |
| PATCH   | `/api/documents/:id/statut` | Admin / Super Admin | Bascule publié ↔ brouillon |
| DELETE  | `/api/documents/:id` | Admin / Super Admin | Supprime le document et ses fichiers |

Les fichiers uploadés sont accessibles publiquement sous `/uploads/documents/<nom-stocké>`.

### Codes d'accès

| Méthode | Route | Accès | Description |
|---------|-------|-------|--------------|
| GET     | `/api/codes` | Super Admin | Liste de tous les codes |
| POST    | `/api/codes` | Super Admin | `{ role: 'admin'\|'super-admin' }` → génère un code |
| POST    | `/api/codes/:code/revoke` | Super Admin | Révoque le code et rétrograde le compte lié en Membre |
| DELETE  | `/api/codes/:code` | Super Admin | Supprime un code jamais utilisé |

### Candidatures

| Méthode | Route | Accès | Description |
|---------|-------|-------|--------------|
| POST    | `/api/candidatures` | Public | `multipart/form-data`: `nom, email, telephone, diplome, classes (JSON), matieres (JSON), experience, motivation, cv` |
| GET     | `/api/candidatures` | Admin / Super Admin | Liste des candidatures |
| POST    | `/api/candidatures/:id/approve` | Super Admin | Génère un code Admin + renvoie `{ code, message }` prêt à copier/envoyer |
| POST    | `/api/candidatures/:id/reject` | Admin / Super Admin | Marque la candidature comme rejetée |

## Sécurité — à faire avant une mise en production réelle

- Changez `JWT_SECRET` pour une valeur longue et aléatoire.
- Servez l'API en HTTPS (via un reverse proxy comme Nginx/Caddy).
- Limitez `CORS_ORIGIN` au domaine réel du site (pas `*`).
- Ajoutez un rate-limiting sur `/api/auth/login` et `/api/auth/signup`
  (ex: `express-rate-limit`) pour empêcher le brute-force de mots de passe et de codes.
- Les CV et documents sont actuellement stockés sur le disque local du serveur ;
  pour un vrai déploiement, préférez un stockage objet (S3, Backblaze, etc.) et
  adaptez `src/routes/documents.js` / `src/routes/candidatures.js` en conséquence.
- Sauvegardez régulièrement le fichier `partagedocs.sqlite`.
- L'envoi du message de candidature approuvée est manuel (copier/coller) : pour
  l'automatiser, branchez un service d'e-mail transactionnel (SendGrid, Postmark,
  Resend...) dans la route `POST /api/candidatures/:id/approve`.
