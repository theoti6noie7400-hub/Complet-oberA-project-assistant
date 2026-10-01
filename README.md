# Assistant OberA + Calculateur Charbon Actif

## Recette métier locale sur Windows (données fictives uniquement)

Avec Node.js 24 portable, ouvrir PowerShell et exécuter ces deux commandes :

```powershell
cd "C:\Users\ThéoBanchonpanith\Documents\VSCODE GIT OBERA\Complet-oberA-project-assistant"
& "C:\Users\ThéoBanchonpanith\Downloads\node-v24.21.0-win-x64\node-v24.21.0-win-x64\npm.cmd" run recette
```

La première exécution installe les dépendances dans le dossier du projet si nécessaire. Ouvrir **http://127.0.0.1:5173/** dans Edge ; arrêter avec **Ctrl+C**. Si le port 5173 est occupé, arrêter l'ancien serveur avant de relancer. Aucun droit administrateur, Docker ou PostgreSQL local n'est nécessaire.

| Parcours | Identifiant | PIN fictif |
| --- | --- | --- |
| Client Alpha (IC 22 et DUSTOMAT 4-24) | `DEMO-CLIENT-A` | `1234` |
| SAV administrateur | `DEMO-STAFF` | `1789` |
| SAV responsable (contrôle des droits) | `DEMO-SAV-MANAGER` | `1789` |
| SAV technicien (lecture seulement des demandes) | `DEMO-SAV-TECH` | `1789` |

Un second compte `DEMO-CLIENT-B` / `1234` et son parc distinct permettent de vérifier l'isolation. Le bandeau **MODE RECETTE LOCALE — DONNÉES FICTIVES** reste visible et contient **Réinitialiser les données DEMO**. Les demandes et leurs statuts sont conservés dans `.local-recipe/data.json` après rechargement et redémarrage ; ce dossier est ignoré par Git. La réinitialisation efface ces demandes, les changements de statut et les sessions locales. N'entrer que des données fictives pendant la recette.

Le diagnostic affiché utilise les arbres métier actuels du frontend et son résumé est validé par la même fonction de parcours que l'API réelle. Les écrans, photos, KPI et calculs restent ceux du portail. Les demandes et sessions sont **simulées** par un serveur local distinct, sans PostgreSQL. Les deux notices officielles IC 22 et DUSTOMAT 4-24 sont téléchargées depuis le stockage privé local lorsqu'elles ont été importées et vérifiées ; sans import, « Notice indisponible » s'affiche. Les statistiques SAV historiques restent des fixtures, séparées des demandes créées. La saisie manuelle SAV reste en mode simulation non persistante. Le rattachement à un dossier SAV réel, les autres documents privés, l'authentification et les garanties de sécurité du backend PostgreSQL se testent dans l'environnement complet, pas dans ce mode local.

Le serveur de recette écoute uniquement sur `127.0.0.1`. Il ne s'active que par `npm.cmd run recette` : `npm run dev`, le build standard, le backend Fastify et les migrations PostgreSQL ne chargent pas ce module. Le bandeau et les identifiants DEMO sont absents du build normal.

### Installer les deux notices officielles pour la recette locale

Télécharger les deux PDF officiels joints dans votre dossier **Téléchargements**, en conservant exactement leurs noms : `FR  NOTICE TECHNIQUE IC-22 .pdf` et `FR  NOTICE DUSTOMAT 4.pdf`. Fermer l'ancien serveur de recette avec Ctrl+C, puis, depuis le dossier du projet, exécuter :

```powershell
& "C:\Users\ThéoBanchonpanith\Downloads\node-v24.21.0-win-x64\node-v24.21.0-win-x64\npm.cmd" run recette:import-notices
& "C:\Users\ThéoBanchonpanith\Downloads\node-v24.21.0-win-x64\node-v24.21.0-win-x64\npm.cmd" run recette
```

Si les PDF se trouvent ailleurs, ajouter `-- "C:\chemin\vers\le\dossier"` à la commande `recette:import-notices`. L'import vérifie le SHA-256 des deux fichiers **avant** de les copier dans `C:\Users\ThéoBanchonpanith\.obera-local-recipe\private-documents\client-notices`. Ce dossier privé est hors du projet, hors de Git et hors des fichiers servis par Vite. Les PDF restent inchangés. Le bouton de réinitialisation DEMO efface les demandes et sessions de recette, **pas** les notices importées. Si l'un des PDF manque ou diffère, la notice reste indisponible et l'import explique l'erreur.

## Bêta interne

Les connexions internes, Client et Revendeur passent par le backend Fastify et PostgreSQL. Les demandes externes sont séparées des dossiers SAV internes et filtrées par organisation côté serveur. Le build frontend seul (Docker statique ou GitHub Pages) ne peut pas authentifier les utilisateurs : il faut servir `/api` sur la même origine avec un backend configuré. Voir [server/README.md](server/README.md) pour les comptes fictifs et [deploy/beta/README.md](deploy/beta/README.md) pour le profil HTTPS portable, les migrations et les sauvegardes. Ne pas utiliser de données réelles dans cette recette.

Intégration propre des deux modules fournis :
- Assistant OberA (diagnostic + consommables + SAV)
- Calculateur de saturation du charbon actif (route `/charbon-actif`)

## Structure
```
.
├── Dockerfile
├── Dockerfile.dev
├── docker-compose.yml
├── index.html
├── nginx.conf
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── src
    ├── App.tsx
    ├── main.tsx
    ├── styles.css
    ├── lib
    │   ├── charbon.ts
    │   └── charbon.test.ts
    └── pages
        ├── AssistantOberaPage.tsx
        └── CharbonActifPage.tsx
```

## Installation
```
npm install
```

## Lancer en local (dev)
```
npm run dev
```
Ouvrir `http://localhost:5173`

## Build
```
npm run build
```

## Preview (build local)
```
npm run preview
```
Ouvrir `http://localhost:4173`

## Tests
```
npm run test
```

## Docker (dev)
```
docker compose up --build
```
Ouvrir `http://localhost:5173`

## Docker (prod)
```
docker build -t obera-app .
docker run --rm -p 8080:80 obera-app
```
Ouvrir `http://localhost:8080`

## Déploiement GitHub Pages (automatique)
Le workflow `.github/workflows/deploy.yml` construit et déploie sur GitHub Pages à chaque `push` sur `main`.

Dans GitHub :
- Settings → Pages
- Source: **GitHub Actions**

## Variables d'environnement
`VITE_INTERNAL_API=1` active le raccordement SAV partagé côté frontend. Les comptes et PIN sont configurés uniquement côté serveur via `BETA_INTERNAL_ACCOUNTS`, jamais dans une variable `VITE_`.

## Tests rapides (checklist)
- [ ] Connexion interne validée par `/api/session` ; Client et Revendeur affichent l'indisponibilité temporaire
- [ ] Diagnostic : sélection d’une réponse + progression + résumé
- [ ] Bouton “Calculateur saturation charbon actif” -> `/charbon-actif`
- [ ] Calculateur : saisie poids + polluant -> saturation cohérente
