# Socle backend OberA (étape de préparation)

Ce dossier contient le serveur API de préparation. Dans un **mode de recette local explicite**, le formulaire manuel SAV et l'onglet distinct « Dossiers SAV enregistrés » peuvent lui parler. Les statistiques, graphiques et contrats restent sur le prototype. Il **ne doit pas être publié comme portail de production**. Aucun jeu SAV embarqué dans le frontend n'est importé. L'authentification OIDC attend la confirmation de l'environnement de comptes OberA ; hors recette locale, aucun endpoint de connexion de démonstration n'est disponible.

## Contenu

- `src/access.ts` : rôles et vérification explicite des ressources ; aucune vue SAV transverse Commercial/ADV/Logistique tant que ses champs n'ont pas été approuvés.
- `src/session.ts` : consultation/révocation d'une session PostgreSQL, cookie sécurisé, fonction interne de création réservée à un futur callback d'identité vérifié.
- `src/app.ts` : premières API internes (`/api/session`, `/api/logout`, `/api/sav/cases`, `/api/sav/cases/:id`, `/api/sav/contracts`). La création manuelle de dossier est transactionnelle, journalisée et rejouable sans doublon avec `submissionKey`. Aucun endpoint client/revendeur n'expose les données SAV internes.
- `migrations/001_initial.sql` et `002_manual_sav_fields.sql` : schéma versionné ; la référence SAV saisie, la série, le nom et le numéro client, le type, le problème, la cause et l'action sont des champs distincts. Le UUID est technique et aucune référence métier n'est générée automatiquement par la nouvelle API. `src/migrate.ts` applique les migrations une seule fois.

## Développement isolé, uniquement avec données fictives

Node.js 24 et une instance PostgreSQL de test sont nécessaires.

```bash
cd server
npm ci
npm test
npm run typecheck
DATABASE_URL='postgres://.../obera_fictif' npm run migrate
DATABASE_URL='postgres://.../obera_fictif' PUBLIC_ORIGIN='https://portail-test.example.invalid' npm start
```

Ne jamais utiliser une base contenant des données OberA réelles dans cette phase. `PUBLIC_ORIGIN` est l'origine HTTPS exacte autorisée pour les requêtes d'écriture. Le serveur écoute seulement `127.0.0.1:3000` ; son exposition ultérieure passera par l'hébergement HTTPS retenu. La future connexion OIDC liera une identité vérifiée (`issuer`, `subject`) à un utilisateur et ses droits dans la base ; la présence d'une ligne `users` seule ne connecte personne.

### Mode de recette local, fictif uniquement

Créer une base PostgreSQL **vide** nommée `obera_recipe` avec un compte de test, puis lancer :

```bash
cd server
DATABASE_URL='postgres://.../obera_recipe' npm run migrate
RECIPE_MODE=1 DATABASE_URL='postgres://.../obera_recipe' npm run seed:recipe
RECIPE_MODE=1 DATABASE_URL='postgres://.../obera_recipe' PUBLIC_ORIGIN='http://localhost:5173' npm start
```

Dans un autre terminal, à la racine du dépôt :

```bash
VITE_SAV_RECIPE_API=1 npm run dev
```

Ouvrir l'URL Vite locale, accéder au formulaire SAV existant, choisir « Enregistrement partagé (API de recette) », puis « Ouvrir la session fictive SAV ». La simulation reste sélectionnable séparément. Dans le dashboard SAV interne, l'onglet « Dossiers SAV enregistrés » relit la liste et le détail via l'API ; il ne modifie pas les statistiques ni la liste de démonstration. L'API renvoie au maximum 100 dossiers récents et l'onglet signale cette limite lorsqu'elle est atteinte. La route `/api/recipe/session` et son compte fictif n'existent que si `RECIPE_MODE=1`, avec la base `obera_recipe` et l'origine locale ci-dessus. Le mode de recette ne transforme pas la connexion PIN du prototype en authentification de production. Aucun repli en simulation n'est déclenché après erreur API. Un UUID de dossier n'est jamais affiché comme référence métier.

Les migrations, la création, la relecture et l'audit ont été vérifiés sur PostgreSQL réel avec des identités fictives. Une sauvegarde/restauration à froid du socle avait également été vérifiée avant le raccordement. Les sauvegardes automatiques et leur fréquence finale relèvent de l'hébergeur, à confirmer selon la perte de données acceptable. Aucun hébergeur, stockage de fichiers ou fournisseur d'identité n'est choisi à ce stade.

## Raccordement ultérieur

Avant d'utiliser ce socle en production : confirmer l'IdP et l'hébergement Node 24, intégrer OIDC, mettre en place le stockage privé et les sauvegardes, compléter les projections client/revendeur, retirer les données SAV privées du bundle React, puis rejouer la recette validée de l'étape 0 sur deux sessions et une base fictive. La référence SAV métier reste exactement celle saisie (`sav_reference`) et ne se confond pas avec l'UUID ni avec `serial_number`. Le numéro client reste une donnée distincte, sans appel Wavesoft.
