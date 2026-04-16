# Assistant OberA + Calculateur Charbon Actif

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

### Version ultra simple (sans prise de tête)
1. Mets tes changements sur la branche `main`.
2. Fais `git push origin main`.
3. Va dans **Actions** et vérifie que **Deploy GitHub Pages** est en vert.
4. Ouvre ton site (Ctrl+F5 pour vider le cache).

Si tu veux lancer à la main :
- Actions → **Deploy GitHub Pages** → **Run workflow**
- Choisis la branche **main** uniquement.

## Variables d'environnement
Aucune.

## Tests rapides (checklist)
- [ ] Connexion client valide (ex: ID non vide + PIN 4 chiffres)
- [ ] Diagnostic : sélection d’une réponse + progression + résumé
- [ ] Bouton “Calculateur saturation charbon actif” -> `/charbon-actif`
- [ ] Calculateur : saisie poids + polluant -> saturation cohérente
