# Assistant OberA + Calculateur Charbon Actif

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
