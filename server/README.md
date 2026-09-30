# Backend du Portail OberA — bêta interne fictive

Ce serveur Fastify utilise PostgreSQL pour les comptes internes, les sessions et les dossiers SAV enregistrés. L'interface React, les routes, les diagnostics, les contrats et les KPI de démonstration restent distincts. Aucune donnée OberA réelle et aucune connexion Wavesoft ne sont prévues dans cette recette.

## Comptes internes et rôles

Les comptes de la bêta sont fournis exclusivement au serveur par `BETA_INTERNAL_ACCOUNTS` : un tableau JSON d'objets `{ "identifier": "<IDENTIFIANT>", "pin": "<CODE>", "role": "<ROLE>" }`. Seuls `global_admin`, `sav_manager` et `sav_technician` sont actifs. Les anciennes entrées Marketing/Sales/ADV/Logistique d'une configuration existante sont ignorées. Le code numérique doit contenir 4 à 12 chiffres. Chaque identifiant doit être individuel et unique. Ne commitez jamais les valeurs de cette variable ni les fichiers `.env` ; `server/.env.example` ne contient que les noms des variables.

Le serveur refuse de démarrer sans configuration de comptes. Après vérification du code côté serveur, `/api/login` lie l'identifiant à `users` et crée une session PostgreSQL de huit heures. Le navigateur reçoit uniquement un cookie `HttpOnly`, `SameSite=Lax`, `Secure` sous HTTPS. Le token est aléatoire et seul son haché est stocké en base. `/api/session` consulte la session et fournit le rôle ; `/api/logout` supprime la session en base et efface le cookie. Un changement de compte révoque l'ancien cookie. Les écritures exigent une origine exacte `PUBLIC_ORIGIN`. Les tentatives répétées sont limitées dans la mémoire du processus unique (5 par identifiant/IP et 10 par IP, sur 15 minutes).

L'ancienne URL `/api/recipe/session` renvoie `410`. La connexion Revendeur renvoie également `410` ; les autres API Revendeur restent en place pour compatibilité mais aucune session Revendeur n'est reconnue. `BETA_EXTERNAL_ACCOUNTS` doit contenir au moins un Client ; les anciennes entrées Revendeur sont ignorées. Au démarrage, seules les sessions des anciens rôles sont supprimées ; leurs utilisateurs, organisations, demandes, documents et audits sont conservés. Voir [le profil bêta externe](../deploy/beta/README.md).

## Lancement local fictif

Node.js 24 et une base PostgreSQL **vide et fictive** nommée `obera_recipe` sont requis. Ne renseignez jamais de compte ni de donnée réelle pour ces essais.

```bash
cd server
npm ci
DATABASE_URL='postgres://.../obera_recipe' npm run migrate
RECIPE_MODE=1 DATABASE_URL='postgres://.../obera_recipe' PUBLIC_ORIGIN='http://localhost:5173' BETA_INTERNAL_ACCOUNTS='<JSON_LOCAL_NON_COMMITÉ>' BETA_EXTERNAL_ACCOUNTS='<JSON_LOCAL_NON_COMMITÉ>' PRIVATE_DOCUMENT_ROOT='<DOSSIER_PRIVÉ>' npm start
```

Dans un autre terminal, à la racine du dépôt :

```bash
VITE_INTERNAL_API=1 npm run dev
```

Sur un hébergement bêta, `PUBLIC_ORIGIN` doit être l'origine HTTPS exacte du frontend et les requêtes `/api` doivent arriver au backend sur la même origine. Le backend écoute `127.0.0.1` derrière le frontal HTTPS. Exécuter `npm run migrate` avant le démarrage. Les secrets sont fournis à l'environnement du serveur, jamais via les variables `VITE_`.

## Autorisations effectivement servies

- `global_admin`, `sav_manager`, `sav_technician` : liste et détail de tous les dossiers SAV, création manuelle, lecture des contrats API ; les modifications techniques futures ne disposent pas encore d'endpoint.
- `marketing`, `sales`, `adv`, `logistics` : aucune nouvelle connexion et aucune session existante acceptée.
- Un client ou revendeur ne peut pas créer de session via cette connexion interne.
- `client` : profil limité à une organisation Client ; appareils de son parc, diagnostic du modèle, demandes SAV ou consommables via `portal_requests`, historique et documents avec audience `client` correspondant à cette organisation.
- `reseller` : connexion fermée ; demandes et documents antérieurs conservés comme archive interne.

Les réponses externes n'incluent que `id`, `model`, `serial` pour les appareils ; `id`, `request_type`, `device_id`, `subject`, `message`, `public_status`, `created_at` pour les demandes ; et `id`, `title`, `created_at` pour les documents. Les fichiers sont délivrés uniquement par un endpoint authentifié après contrôle de l'audience et de l'organisation, depuis `PRIVATE_DOCUMENT_ROOT`. `storage_key`, cause/action SAV et audits ne sont jamais dans les projections externes. La migration `004_external_portal.sql` ajoute le type de demande, le lien appareil sous contrainte d'organisation, l'idempotence et un lien nullable futur vers un dossier SAV interne. Aucun flux automatique de conversion SAV n'est livré.

Les contrôles de chaque requête SAV sont dans `src/app.ts` et `src/access.ts`. Les gardes React servent à la navigation, jamais à accorder l'accès aux données. Le mode simulation manuel reste séparé des dossiers PostgreSQL. Aucun repli automatique en simulation n'intervient après une erreur API.

## Avant production

Cette connexion par PIN reste temporaire : choisir et intégrer l'identité OIDC, organiser les comptes individuels et leur révocation, définir l'hébergement HTTPS, les sauvegardes et la supervision, puis terminer la recette navigateur et sécurité. Le verrouillage des tentatives est local à un seul processus ; une architecture à plusieurs instances nécessitera un contrôle partagé. Les sessions déjà ouvertes restent valides jusqu'à expiration ou révocation si un compte est retiré de la configuration : désactiver son utilisateur en base et révoquer ses sessions lors d'un retrait urgent.
