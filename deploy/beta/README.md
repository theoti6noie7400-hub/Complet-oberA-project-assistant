# Profil portable de bêta interne HTTPS

Ce profil Docker Compose est distinct du déploiement GitHub Pages et des routes de démonstration. Il sert React à la racine du domaine, transfère `/api/` à Fastify sur le réseau interne et garde PostgreSQL sans port publié. La terminaison TLS est assurée par Nginx. Aucun compte ni dossier réel n'est livré avec les images.

**Point bloquant avant ouverture de la bêta :** `index.html` charge encore Tailwind depuis `cdn.tailwindcss.com` et `src/styles.css` charge une police Google. Le rendu dépend donc de services tiers exécutés ou contactés par le navigateur. Il faut empaqueter les styles localement et contrôler le rendu dans Edge avant d'autoriser l'accès bêta, sans modifier les écrans ni les règles métier. Cette correction visuelle n'est pas incluse dans ce profil d'infrastructure.

Les notices historiques présentes dans `public/notices/` restent des fichiers statiques publics, indépendants des nouveaux documents privés. Avant une ouverture externe, confirmer qu'elles sont toutes autorisées à la publication ; leur retrait ou leur protection nécessiterait un lot séparé pour ne pas casser les liens des diagnostics existants.

Les espaces Client et Revendeur utilisent désormais `/api/client/*` et `/api/reseller/*`. Aucun PIN externe n'est embarqué dans le frontend. Les comptes sont fournis uniquement par `BETA_EXTERNAL_ACCOUNTS`, séparé des comptes internes. Chaque entrée est `{ "identifier": "...", "pin": "...", "role": "client|reseller", "organizationId": "<UUID>" }`. Le serveur vérifie le rôle et l'organisation de chaque compte avant de lui ouvrir une session. `PRIVATE_DOCUMENT_ROOT` doit pointer vers un répertoire privé, jamais vers `public/` ni le dossier web.

## Prérequis et configuration

- Hôte administré avec Docker Engine et Compose v2, résolution DNS et port 443 entrant. Docker et Nginx ne sont pas disponibles dans l'environnement de développement utilisé pour préparer ce profil : la validation intégrale de ces conteneurs reste à faire sur l'hôte choisi.
- Certificat et clé PEM pour le domaine bêta dans `certs/fullchain.pem` et `certs/privkey.pem`, fournis par l'exploitant. Le dossier `certs/` n'est pas commité. Le renouvellement dépend de l'infrastructure TLS retenue.
- Copier `.env.example` en `.env.beta`, renseigner **uniquement des identifiants et données fictifs**. `PUBLIC_ORIGIN` doit valoir exactement `https://<domaine-beta>` sans chemin ni slash final. `DATABASE_URL` doit pointer vers `db:5432/<POSTGRES_DB>` avec les mêmes identifiants que `POSTGRES_USER` / `POSTGRES_PASSWORD` (encoder les caractères spéciaux dans l'URL). Les sept rôles sont configurés dans `BETA_INTERNAL_ACCOUNTS` comme documenté dans `server/README.md`. Ce fichier local n'est pas commité. Protéger son accès sur l'hôte et préférer un gestionnaire de secrets si l'hébergement le fournit.
- Aucun `VITE_` ne contient de secret. Le build bêta fixe uniquement `VITE_INTERNAL_API=1` et `VITE_BETA_DEPLOY=1` ; le build historique GitHub Pages conserve son chemin actuel.
- Pour la recette fictive, créer une base **neuve** `obera_beta_demo` et renseigner `POSTGRES_DB`, `DATABASE_URL` et les deux configurations de comptes. `BETA_EXTERNAL_ACCOUNTS` doit utiliser les identifiants `DEMO-CLIENT-A`, `DEMO-CLIENT-B`, `DEMO-CLIENT-A2`, `DEMO-RESELLER-A`, `DEMO-RESELLER-B` avec les UUID d'organisations indiqués dans `server/src/seed-external-demo.ts`. Choisir des PIN d'essai côté serveur, sans les commiter. Les noms de comptes et d'organisations sont strictement DEMO.

Depuis ce dossier, après contrôle de la base fictive et des secrets locaux :

```bash
docker compose --env-file .env.beta -f compose.yaml config --quiet
docker compose --env-file .env.beta -f compose.yaml up --build -d
docker compose --env-file .env.beta -f compose.yaml ps
docker compose --profile demo --env-file .env.beta -f compose.yaml run --rm seed-demo
```

`migrate` attend PostgreSQL, applique les migrations de manière transactionnelle et doit se terminer avec succès avant le démarrage de l'API. `api` attend ensuite une réponse `/api/ready` qui vérifie aussi PostgreSQL ; `web` attend que l'API soit prête. `/api/health` reste un contrôle de processus. Fastify écrit des logs structurés sur stdout en mode production ; ne pas journaliser les corps de requête contenant les PIN. Les chemins profonds React reviennent à `index.html`. Les réponses `/api/` reçoivent `Cache-Control: no-store` au proxy. Ne pas exposer les ports internes 3000 et 5432 via un autre équipement réseau.

La commande de seed est volontairement optionnelle (`profile: demo`) et refuse toute base autre que `obera_beta_demo`. Elle écrit les documents fictifs dans `private-documents/`, monté en lecture seule par l'API et jamais par le conteneur web. Elle doit être exécutée avant la première recette externe ; elle peut être rejouée sans dupliquer ses quatre organisations, appareils, demandes ou documents. Le profil de seed est le seul conteneur autorisé à écrire dans ce répertoire dans cette version.

Les commandes `up` / `down` n'effacent pas le volume PostgreSQL. Ne pas utiliser `down --volumes` sur une base à conserver. Avant une montée de version, prévoir une fenêtre de maintenance, une sauvegarde vérifiée et une stratégie de retour arrière ; reconstruire les images et recréer `migrate` afin que les nouvelles migrations soient exécutées avant la nouvelle API. Le certificat doit être renouvelé par l'exploitant avant expiration.

## Sauvegarde et restauration

`bash backup.sh` crée une paire `pg_dump` au format personnalisé et archive des documents privés dans `backups/`, avec permissions privées. Les documents de cette bêta sont des fichiers fictifs fixes, écrits seulement lors du seed. Copier la paire vers un stockage externe chiffré et restreint : le volume ou le même hôte seul n'est pas une sauvegarde suffisante. Planifier l'exécution quotidienne comme **objectif initial**, une conservation cible de 30 jours et une restauration d'essai régulière ; rendre fréquence et rétention configurables selon la perte de données acceptable. Ni la planification ni la purge ne sont automatiques dans ce profil.

`bash restore-test.sh backups/<archive>.dump obera_test_restore` crée une base **distincte**, restaure la paire de documents dans `backups/restored-obera_test_restore-documents`, et refuse de restaurer dans `POSTGRES_DB` ou dans une base existante. Une restauration échouée laisse la base d'essai en place pour analyse. Vérifier ensuite le nombre de dossiers, contrats, demandes, audits et documents, et documenter la date et le temps de restauration. La restauration par les scripts Compose doit encore être exécutée sur l'hôte choisi.

## Décisions avant mise en ligne

1. **Hôte et exploitation** : machine ou service compatible Docker Compose, capacité de stockage, surveillance, accès d'administration et responsable des mises à jour. Aucun fournisseur n'est présupposé par ce profil.
2. **Domaine et certificat** : nom DNS bêta, obtention et renouvellement du certificat, filtrage des accès internes (VPN ou accès réseau choisi) ; renseigner ensuite `PUBLIC_ORIGIN`.
3. **Objectifs de reprise** : perte de données et durée d'indisponibilité acceptables, emplacement externe des sauvegardes et durée de rétention définitive. Ces choix déterminent la fréquence des sauvegardes et les alertes.

Ce profil ne réactive ni Client ni Revendeur et ne contient aucune connexion Wavesoft. Une recette Edge complète, un essai de restauration sur l'hôte retenu et une vérification du certificat précèdent tout usage de la bêta.
