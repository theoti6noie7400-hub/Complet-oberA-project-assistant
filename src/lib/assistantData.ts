import { OBERA_PRODUCT_IMAGES } from "../assets/oberaProductImages";

export type CategoryId =
  | "rafraichisseurs"
  | "purificateurs"
  | "depoussiereurs"
  | "tables-aspirantes";

export type ProductCatalogItem = {
  id: string;
  name: string;
  category: CategoryId;
  noticeFile?: string;
  imageFile?: string;
};

export const CATEGORIES: { id: CategoryId; label: string; icon: string }[] = [
  { id: "rafraichisseurs", label: "Rafraichisseurs d'air", icon: "🧊" },
  { id: "purificateurs", label: "Purificateurs d'air", icon: "🍃" },
  { id: "depoussiereurs", label: "Depoussiereurs", icon: "🌪️" },
  { id: "tables-aspirantes", label: "Tables aspirantes", icon: "🛠️" }
];

export const PRODUCTS: ProductCatalogItem[] = [
  { id: "ic12", name: "IC 12", category: "rafraichisseurs", noticeFile: "FR NOTICE TECHNIQUE IC-12 .pdf" },
  { id: "vl120", name: "VL 120", category: "rafraichisseurs", noticeFile: "OberA FR NOTICE TECHNIQUE VL-120 .pdf" },
  { id: "ic22", name: "IC 22", category: "rafraichisseurs", noticeFile: "FR NOTICE TECHNIQUE IC-22 .pdf" },
  { id: "vl220", name: "VL 220", category: "rafraichisseurs", noticeFile: "OberA FR NOTICE TECHNIQUE VL-220 .pdf" },
  { id: "ic30", name: "IC 30", category: "rafraichisseurs", noticeFile: "FR NOTICE TECHNIQUE IC-30.pdf" },
  { id: "ic48", name: "IC 48", category: "rafraichisseurs" },
  { id: "vl300", name: "VL 300", category: "rafraichisseurs", noticeFile: "OberA FR NOTICE TECHNIQUE VL-300.pdf" },
  { id: "ecoclim12", name: "ECOCLIM 12", category: "rafraichisseurs", noticeFile: "NOTICE ECOCLIM12 - FR.pdf" },
  { id: "ecoclim20", name: "ECOCLIM 20", category: "rafraichisseurs", noticeFile: "NOTICE ECOCLIM 22 - FR.pdf" },
  { id: "ecoclim30", name: "ECOCLIM 30", category: "rafraichisseurs", noticeFile: "NOTICE EcoCLIM30 -FR.pdf" },
  { id: "fresh", name: "Fresh", category: "rafraichisseurs", noticeFile: "FR NOTICE TECHNIQUE ePUR 150 Fresh.pdf" },
  { id: "vl50", name: "VL 50", category: "rafraichisseurs", noticeFile: "FR OberA NOTICE TECHNIQUE VL-50.pdf" },

  { id: "epur10", name: "ePUR 10", category: "purificateurs", noticeFile: "Notice EPUR010 - FR.pdf" },
  { id: "epur50", name: "ePUR 50", category: "purificateurs", noticeFile: "NOTICE EPUR 050 - FR.pdf" },
  { id: "epur100", name: "ePUR 100", category: "purificateurs", noticeFile: "NOTICE ePUR100 - FR.pdf" },
  { id: "epur140", name: "ePUR 140", category: "purificateurs", noticeFile: "NOTICE TECHNIQUE ePUR 140 - FR.pdf" },
  { id: "epur150", name: "ePUR 150", category: "purificateurs", noticeFile: "FR NOTICE TECHNIQUE ePUR 150 Fresh.pdf" },
  { id: "filtower", name: "Filtower", category: "purificateurs" },
  { id: "epur-ex", name: "ePUR EX", category: "purificateurs", noticeFile: "FR - NOTICE D'UTILIATION EPUR EX 1000 2000.pdf" },
  { id: "epurbox-atex", name: "ePURBox ATEX", category: "purificateurs", noticeFile: "MANUEL EPURBOX ATEX OBERA.pdf" },
  { id: "epurbox", name: "ePURBox", category: "purificateurs", noticeFile: "NOTICE EPURBOX-2021.pdf" },
  { id: "clearbox", name: "Clearbox", category: "purificateurs" },

  { id: "dustomat-410", name: "DUSTOMAT 4-10", category: "depoussiereurs", noticeFile: "09730-57-VV_DUSTOMAT 4.pdf" },
  { id: "dustomat-424", name: "DUSTOMAT 4-24", category: "depoussiereurs", noticeFile: "09730-57-VV_DUSTOMAT 4.pdf" },
  { id: "dustomat-4-atex", name: "DUSTOMAT 4 ATEX", category: "depoussiereurs", noticeFile: "09732-57-VV_DUSTOMAT 4 ATEX-FR.pdf" },
  { id: "dustomat-10", name: "DUSTOMAT 10", category: "depoussiereurs", noticeFile: "09201-57-VV_DUSTOMAT 10-FR.pdf" },
  { id: "dustomat-16m", name: "DUSTOMAT 16M", category: "depoussiereurs", noticeFile: "09420-52-VV_DUSTOMAT-16 M.pdf" },
  { id: "dustomat-dry", name: "DUSTOMAT DRY", category: "depoussiereurs", noticeFile: "X09700-57-VV_DUSTOMAT DRY ATEX.pdf" },
  { id: "dustomat-dry-atex", name: "DUSTOMAT DRY ATEX", category: "depoussiereurs", noticeFile: "X09700-57-VV_DUSTOMAT DRY ATEX.pdf" },
  { id: "dustomat-hydro", name: "Dustomat HYDRO", category: "depoussiereurs", noticeFile: "x45901-57-VV_DUSTOMAT Hydro.pdf" },
  { id: "dustomat-hydro-atex", name: "DUSTOMAT HYDRO ATEX", category: "depoussiereurs", noticeFile: "x45901-57-VV_DUSTOMAT Hydro.pdf" },
  { id: "dustmac", name: "DUSTMAC", category: "depoussiereurs" },
  { id: "dustmac-atex", name: "DUSTMAC ATEX", category: "depoussiereurs" },
  { id: "jumbo", name: "Jumbo", category: "depoussiereurs" },
  { id: "epur-ex-1000", name: "ePUR EX 1000", category: "depoussiereurs", noticeFile: "FR - NOTICE D'UTILIATION EPUR EX 1000 2000.pdf" },
  { id: "epur-ex-2000", name: "ePUR EX 2000", category: "depoussiereurs", noticeFile: "FR - NOTICE D'UTILIATION EPUR EX 1000 2000.pdf" },
  { id: "epur-ex-3000", name: "ePUR EX 3000", category: "depoussiereurs", noticeFile: "FR - NOTICE EPUR EX 3000.pdf" },
  { id: "epur-ex-5000", name: "ePUR EX 5000", category: "depoussiereurs", noticeFile: "Notice ePUR EX 5000- FR.pdf" },
  { id: "epur-ex-1001", name: "ePUR EX 1001", category: "depoussiereurs", noticeFile: "NOTICE TECHNIQUE EPUR EX 1000 - FR.pdf" },
  { id: "epur-ex-3001", name: "ePUR EX 3001", category: "depoussiereurs", noticeFile: "FR - NOTICE EPUR EX 3000.pdf" },
  { id: "epur-ex-5001", name: "ePUR EX 5001", category: "depoussiereurs", noticeFile: "Notice ePUR EX 5000- FR.pdf" },

  { id: "table-aspirante", name: "Table Aspirante (BAS-V)", category: "tables-aspirantes", noticeFile: "NOTICE BAS-V - FR.pdf" },
  { id: "dosseret-aspirant", name: "Dosseret Aspirant", category: "tables-aspirantes" }
].map((p) => ({ ...p, imageFile: OBERA_PRODUCT_IMAGES[p.id] }));

export type DiagnosticTarget = "sav" | "sav-pump" | "filter" | "resolved";

export type DiagnosticQuestionNode = {
  id: string;
  type: "question";
  title: string;
  maxSteps: number;
  options: { label: string; next: string }[];
};

export type DiagnosticTextNode = {
  id: string;
  type: "text";
  title: string;
  body: string;
  maxSteps: number;
  target?: DiagnosticTarget;
  next?: string;
};

export type DiagnosticNode = DiagnosticQuestionNode | DiagnosticTextNode;

const COMPLEX_DUST_DIRECT = new Set([
  "jumbo",
  "dustomat-hydro",
  "dustomat-hydro-atex",
  "dustmac",
  "dustmac-atex"
]);
const DRY_START_MODELS = new Set([
  "dustomat-dry",
  "dustomat-dry-atex",
  "dustomat-410",
  "dustomat-424",
  "dustomat-4-atex"
]);
const EPUR_EX_MODELS = new Set([
  "epur-ex",
  "epur-ex-1000",
  "epur-ex-2000",
  "epur-ex-1001",
  "epur-ex-3000",
  "epur-ex-3001",
  "epur-ex-5000",
  "epur-ex-5001"
]);
const EPURBOX_MODELS = new Set([
  "epurbox",
  "epurbox-atex",
  "clearbox",
  "epur10",
  "epur50",
  "epur100",
  "epur140",
  "epur150"
]);
const RAFRAICHISSEURS_GENERAL = new Set([
  "ic12",
  "ic22",
  "ic30",
  "ic48",
  "ecoclim12",
  "ecoclim20",
  "ecoclim30",
  "fresh",
  "vl120",
  "vl220",
  "vl300"
]);

function withBase(path: string): string {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${path.replace(/^\/+/, "")}`;
}

export function getNoticeUrl(noticeFile?: string): string | null {
  if (!noticeFile) return null;
  return withBase(`notices/${encodeURIComponent(noticeFile)}`);
}

export function getImageUrl(imageFile?: string): string | null {
  if (!imageFile) return null;
  if (/^https?:\/\//i.test(imageFile)) return imageFile;
  return withBase(imageFile);
}

export function getDiagnosticStartNode(productId: string): string {
  if (COMPLEX_DUST_DIRECT.has(productId)) return "complex-dust-direct";
  if (productId === "filtower") return "filtower-direct";
  if (productId === "table-aspirante" || productId === "dosseret-aspirant") return "table-direct-sav";
  if (productId === "vl50") return "vl50-direct";
  if (DRY_START_MODELS.has(productId)) return "dry-start";
  if (productId === "dustomat-10") return "manual-dust-start";
  if (productId === "dustomat-16m") return "manual-pneumatic-start";
  if (EPUR_EX_MODELS.has(productId)) return "epur-ex-start";
  if (EPURBOX_MODELS.has(productId)) return "epurbox-start";
  if (RAFRAICHISSEURS_GENERAL.has(productId)) return "start";
  return "start";
}

export function resolveDynamicNext(next: string, productId: string): string {
  if (next !== "water-check-branch") return next;
  return productId === "fresh" ? "visual-water-check" : "check-cool-light";
}

export const DIAGNOSTIC_NODES: Record<string, DiagnosticNode> = {
  start: {
    id: "start",
    type: "question",
    maxSteps: 5,
    title: "Quel est le problème principal ?",
    options: [
      { label: "L'appareil ne fait pas de froid", next: "no-cold" },
      { label: "L'appareil ne s'allume pas", next: "no-power" },
      { label: "Bruit anormal", next: "unusual-noise" },
      { label: "J'ai un autre problème", next: "contact-sav-general" }
    ]
  },
  "vl50-direct": {
    id: "vl50-direct",
    type: "text",
    maxSteps: 1,
    title: "Prise en charge SAV requise",
    body: "Le modèle VL 50 est traité en prise en charge directe par le SAV.",
    target: "sav"
  },
  "no-cold": {
    id: "no-cold",
    type: "question",
    maxSteps: 5,
    title: "Le ventilateur tourne mais l'air reste chaud ?",
    options: [
      { label: "Oui", next: "water-check-branch" },
      { label: "Non", next: "no-power" }
    ]
  },
  "check-cool-light": {
    id: "check-cool-light",
    type: "question",
    maxSteps: 5,
    title: "Quel est l'etat du voyant COOL ?",
    options: [
      { label: "COOL clignote", next: "low-level-fix" },
      { label: "COOL fixe", next: "full-tank" }
    ]
  },
  "visual-water-check": {
    id: "visual-water-check",
    type: "question",
    maxSteps: 5,
    title: "Voyez-vous de l'eau circuler dans les tuyaux transparents ?",
    options: [
      { label: "Non, pas du tout", next: "pump-issue-fresh" },
      { label: "Oui, mais tres faiblement", next: "check-nozzles" },
      { label: "Oui, debit normal", next: "contact-sav-general" }
    ]
  },
  "low-level-fix": {
    id: "low-level-fix",
    type: "text",
    maxSteps: 5,
    title: "Controle du niveau d'eau",
    body: "Remplissez le reservoir puis relancez l'appareil. Verifiez aussi la vidange.",
    target: "resolved"
  },
  "full-tank": {
    id: "full-tank",
    type: "question",
    maxSteps: 5,
    title: "Le reservoir est-il plein ?",
    options: [
      { label: "Oui, mais tres faiblement", next: "check-nozzles" },
      { label: "Non", next: "check-pump" }
    ]
  },
  "check-nozzles": {
    id: "check-nozzles",
    type: "question",
    maxSteps: 5,
    title: "Apres nettoyage des buses, le probleme persiste ?",
    options: [
      { label: "Oui", next: "check-pump" },
      { label: "Non", next: "clean-nozzles-advice" }
    ]
  },
  "clean-nozzles-advice": {
    id: "clean-nozzles-advice",
    type: "text",
    maxSteps: 5,
    title: "Nettoyage realise",
    body: "Nettoyez les buses et verifiez l'ecrou du robinet de vidange.",
    target: "resolved"
  },
  "check-pump": {
    id: "check-pump",
    type: "question",
    maxSteps: 5,
    title: "La pompe tourne-t-elle correctement ?",
    options: [
      { label: "Non, bruit anormal / ne tourne pas", next: "pump-issue" },
      { label: "Oui", next: "pump-check-advice" }
    ]
  },
  "pump-check-advice": {
    id: "pump-check-advice",
    type: "text",
    maxSteps: 5,
    title: "Controle de pompe",
    body: "Controlez la pompe et l'alimentation hydraulique, puis testez a nouveau.",
    target: "resolved"
  },
  "pump-issue": {
    id: "pump-issue",
    type: "text",
    maxSteps: 5,
    title: "Defaut pompe",
    body: "Le protocole indique une panne probable de pompe.",
    target: "sav-pump"
  },
  "pump-issue-fresh": {
    id: "pump-issue-fresh",
    type: "text",
    maxSteps: 5,
    title: "Defaut pompe (Fresh)",
    body: "Le modele Fresh indique une panne probable de pompe.",
    target: "sav-pump"
  },
  "no-power": {
    id: "no-power",
    type: "question",
    maxSteps: 3,
    title: "Alimentation externe verifiee (prise/disjoncteur/cable) ?",
    options: [
      { label: "Oui", next: "no-power-internal" },
      { label: "Non", next: "power-check-advice" }
    ]
  },
  "power-check-advice": {
    id: "power-check-advice",
    type: "text",
    maxSteps: 3,
    title: "Verification alimentation",
    body: "Verifiez la prise, le disjoncteur et le cable d'alimentation.",
    target: "resolved"
  },
  "no-power-internal": {
    id: "no-power-internal",
    type: "text",
    maxSteps: 3,
    title: "Defaut interne probable",
    body: "L'appareil ne demarre pas malgre une alimentation conforme.",
    target: "sav"
  },
  "unusual-noise": {
    id: "unusual-noise",
    type: "text",
    maxSteps: 2,
    title: "Bruit anormal detecte",
    body: "Un controle technique est recommande.",
    target: "sav"
  },
  "contact-sav-general": {
    id: "contact-sav-general",
    type: "text",
    maxSteps: 2,
    title: "Assistance SAV",
    body: "Le cas necessite une prise en charge par le SAV.",
    target: "sav"
  },

  "epurbox-start": {
    id: "epurbox-start",
    type: "question",
    maxSteps: 3,
    title: "Quel symptome observez-vous ?",
    options: [
      { label: "Ne s'allume pas", next: "epurbox-no-power" },
      { label: "Faible aspiration / colmatage (A) allume", next: "epurbox-low-suction" },
      { label: "Bruit anormal", next: "unusual-noise-purif" },
      { label: "Autre", next: "contact-sav-general" }
    ]
  },
  "epurbox-no-power": {
    id: "epurbox-no-power",
    type: "question",
    maxSteps: 3,
    title: "Avez-vous verifie prise, disjoncteur, interrupteur et fusible ?",
    options: [
      { label: "Oui", next: "no-power-internal-purif" },
      { label: "Non", next: "epurbox-power-advice" }
    ]
  },
  "epurbox-power-advice": {
    id: "epurbox-power-advice",
    type: "text",
    maxSteps: 3,
    title: "Verification alimentation",
    body: "Verifiez les elements d'alimentation puis relancez l'appareil.",
    target: "resolved"
  },
  "epurbox-low-suction": {
    id: "epurbox-low-suction",
    type: "text",
    maxSteps: 3,
    title: "Filtre possiblement colmate",
    body: "Le remplacement des consommables est recommande.",
    target: "filter"
  },
  "no-power-internal-purif": {
    id: "no-power-internal-purif",
    type: "text",
    maxSteps: 3,
    title: "Defaut interne probable",
    body: "Le systeme reste inactif apres verification d'alimentation.",
    target: "sav"
  },
  "unusual-noise-purif": {
    id: "unusual-noise-purif",
    type: "text",
    maxSteps: 2,
    title: "Bruit anormal detecte",
    body: "Un controle SAV est necessaire.",
    target: "sav"
  },
  "epur-ex-start": {
    id: "epur-ex-start",
    type: "question",
    maxSteps: 4,
    title: "Quel message apparait sur l'ePUR EX ?",
    options: [
      { label: "Filtre plein 80% (jaune)", next: "filter-issue-ex" },
      { label: "Filtre plein 95/98% (rouge)", next: "filter-issue-ex-urgent" },
      { label: "Erreur capteur VOC/Particules", next: "sensor-issue-ex" },
      { label: "STOP Technique", next: "technical-stop-ex" },
      { label: "Aucun message", next: "epur-ex-no-error" }
    ]
  },
  "filter-issue-ex": {
    id: "filter-issue-ex",
    type: "text",
    maxSteps: 3,
    title: "Filtre a remplacer",
    body: "L'etat filtre atteint le seuil de remplacement.",
    target: "filter"
  },
  "filter-issue-ex-urgent": {
    id: "filter-issue-ex-urgent",
    type: "text",
    maxSteps: 2,
    title: "Filtre a remplacer en urgence",
    body: "Le seuil critique filtre est atteint.",
    target: "filter"
  },
  "sensor-issue-ex": {
    id: "sensor-issue-ex",
    type: "text",
    maxSteps: 2,
    title: "Erreur capteur",
    body: "Un diagnostic SAV est requis pour le capteur VOC/particules.",
    target: "sav"
  },
  "technical-stop-ex": {
    id: "technical-stop-ex",
    type: "text",
    maxSteps: 2,
    title: "STOP technique",
    body: "L'appareil signale un arret technique.",
    target: "sav"
  },
  "epur-ex-no-error": {
    id: "epur-ex-no-error",
    type: "question",
    maxSteps: 4,
    title: "Sans message erreur, quel symptome observez-vous ?",
    options: [
      { label: "Ne s'allume pas", next: "epur-ex-no-power" },
      { label: "Faible aspiration", next: "low-suction-ex" },
      { label: "Bruit anormal", next: "unusual-noise-purif" },
      { label: "Autre", next: "contact-sav-general" }
    ]
  },
  "epur-ex-no-power": {
    id: "epur-ex-no-power",
    type: "question",
    maxSteps: 4,
    title: "Avez-vous verifie l'alimentation, les fusibles F1/F2 et le capot ?",
    options: [
      { label: "Oui", next: "no-power-internal-purif" },
      { label: "Non", next: "epur-ex-power-advice" }
    ]
  },
  "epur-ex-power-advice": {
    id: "epur-ex-power-advice",
    type: "text",
    maxSteps: 4,
    title: "Verification alimentation",
    body: "Controlez alimentation, fusibles et fermeture capot puis relancez.",
    target: "resolved"
  },
  "low-suction-ex": {
    id: "low-suction-ex",
    type: "text",
    maxSteps: 3,
    title: "Faible aspiration",
    body: "Le symptome impose un controle SAV.",
    target: "sav"
  },
  "filtower-direct": {
    id: "filtower-direct",
    type: "text",
    maxSteps: 1,
    title: "Prise en charge Filtower",
    body: "Le Filtower est traite en prise en charge SAV directe.",
    target: "sav"
  },

  "complex-dust-direct": {
    id: "complex-dust-direct",
    type: "text",
    maxSteps: 1,
    title: "Modele depoussiereur complexe",
    body: "Ce modele est traite en prise en charge SAV directe.",
    target: "sav"
  },
  "dry-start": {
    id: "dry-start",
    type: "question",
    maxSteps: 6,
    title: "Quel symptome principal observez-vous ?",
    options: [
      { label: "Faible aspiration", next: "dry-low-suction" },
      { label: "Alarme filtre / pression diff haute", next: "dry-filter-alarm" },
      { label: "Ne demarre pas", next: "dry-no-power" },
      { label: "Bruit anormal", next: "unusual-noise-dep" },
      { label: "Autre", next: "contact-sav-general" }
    ]
  },
  "dry-low-suction": {
    id: "dry-low-suction",
    type: "question",
    maxSteps: 6,
    title: "Collecteur et filtres visuellement conformes ?",
    options: [
      { label: "Oui", next: "dry-check-deflector" },
      { label: "Non", next: "dry-bag-filter-advice" }
    ]
  },
  "dry-bag-filter-advice": {
    id: "dry-bag-filter-advice",
    type: "text",
    maxSteps: 6,
    title: "Controle collecteur/filtres",
    body: "Videz le collecteur et verifiez l'etat des filtres.",
    target: "resolved"
  },
  "dry-check-deflector": {
    id: "dry-check-deflector",
    type: "question",
    maxSteps: 6,
    title: "Le deflecteur est-il correctement positionne ?",
    options: [
      { label: "Oui", next: "dry-check-blockage" },
      { label: "Non", next: "dry-deflector-advice" }
    ]
  },
  "dry-deflector-advice": {
    id: "dry-deflector-advice",
    type: "text",
    maxSteps: 6,
    title: "Ajustement deflecteur",
    body: "Repositionnez le deflecteur et testez a nouveau.",
    target: "resolved"
  },
  "dry-check-blockage": {
    id: "dry-check-blockage",
    type: "question",
    maxSteps: 6,
    title: "Conduit d'aspiration degage ?",
    options: [
      { label: "Oui", next: "dry-check-pressure" },
      { label: "Non", next: "dry-blockage-advice" }
    ]
  },
  "dry-blockage-advice": {
    id: "dry-blockage-advice",
    type: "text",
    maxSteps: 6,
    title: "Debouchage conduit",
    body: "Supprimez tout blocage dans le reseau d'aspiration.",
    target: "resolved"
  },
  "dry-check-pressure": {
    id: "dry-check-pressure",
    type: "question",
    maxSteps: 6,
    title: "La pression pneumatique est-elle entre 4 et 6 bar ?",
    options: [
      { label: "Oui", next: "dry-suction-sav" },
      { label: "Non", next: "dry-pressure-advice" }
    ]
  },
  "dry-pressure-advice": {
    id: "dry-pressure-advice",
    type: "text",
    maxSteps: 6,
    title: "Reglage pression",
    body: "Ajustez la pression de service puis relancez le cycle.",
    target: "resolved"
  },
  "dry-suction-sav": {
    id: "dry-suction-sav",
    type: "text",
    maxSteps: 6,
    title: "Faible aspiration persistante",
    body: "Le diagnostic impose une intervention SAV.",
    target: "sav"
  },
  "dry-filter-alarm": {
    id: "dry-filter-alarm",
    type: "question",
    maxSteps: 4,
    title: "L'alarme persiste apres 5 minutes ?",
    options: [
      { label: "Oui", next: "dry-check-pressure-alarm" },
      { label: "Non", next: "dry-decolmatage-advice" }
    ]
  },
  "dry-decolmatage-advice": {
    id: "dry-decolmatage-advice",
    type: "text",
    maxSteps: 4,
    title: "Decolmatage",
    body: "Lancez un cycle de decolmatage et recontrolez la pression.",
    target: "resolved"
  },
  "dry-check-pressure-alarm": {
    id: "dry-check-pressure-alarm",
    type: "question",
    maxSteps: 4,
    title: "Pression pneumatique conforme ?",
    options: [
      { label: "Oui", next: "dry-check-sensor-tuyaux" },
      { label: "Non", next: "dry-pressure-advice" }
    ]
  },
  "dry-check-sensor-tuyaux": {
    id: "dry-check-sensor-tuyaux",
    type: "question",
    maxSteps: 5,
    title: "Apres soufflage des tuyaux capteur, probleme resolu ?",
    options: [
      { label: "Oui", next: "dry-sensor-tuyaux-resolved" },
      { label: "Non", next: "dry-sensor-tuyaux-advice" }
    ]
  },
  "dry-sensor-tuyaux-advice": {
    id: "dry-sensor-tuyaux-advice",
    type: "text",
    maxSteps: 5,
    title: "Controle capteur/tuyaux",
    body: "Recontrolez capteur et tuyaux; si le signal persiste, remplacez le filtre.",
    next: "dry-filter-issue"
  },
  "dry-sensor-tuyaux-resolved": {
    id: "dry-sensor-tuyaux-resolved",
    type: "text",
    maxSteps: 5,
    title: "Probleme resolu",
    body: "Le nettoyage des tuyaux capteur a resolu l'alarme.",
    target: "resolved"
  },
  "dry-filter-issue": {
    id: "dry-filter-issue",
    type: "text",
    maxSteps: 5,
    title: "Filtre a remplacer",
    body: "Le filtre est probablement en fin de vie.",
    target: "filter"
  },
  "dry-no-power": {
    id: "dry-no-power",
    type: "question",
    maxSteps: 3,
    title: "Protection moteur rearmable et alimentation verifiees ?",
    options: [
      { label: "Oui", next: "dry-power-sav" },
      { label: "Non", next: "dry-power-advice" }
    ]
  },
  "dry-power-advice": {
    id: "dry-power-advice",
    type: "text",
    maxSteps: 3,
    title: "Verification demarrage",
    body: "Controlez l'alimentation et rearmez la protection moteur.",
    target: "resolved"
  },
  "dry-power-sav": {
    id: "dry-power-sav",
    type: "text",
    maxSteps: 3,
    title: "Defaut de demarrage",
    body: "Le non-demarrage persiste apres controles.",
    target: "sav"
  },
  "unusual-noise-dep": {
    id: "unusual-noise-dep",
    type: "text",
    maxSteps: 2,
    title: "Bruit anormal depoussiereur",
    body: "Un controle SAV est requis.",
    target: "sav"
  },
  "manual-dust-start": {
    id: "manual-dust-start",
    type: "question",
    maxSteps: 5,
    title: "Quel symptome principal observez-vous ?",
    options: [
      { label: "Aspiration trop faible (mano rouge)", next: "manual-low-suction" },
      { label: "Alarme filtre / pression diff haute", next: "dry-filter-alarm" },
      { label: "Ne demarre pas", next: "manual-no-power" },
      { label: "Bruit anormal", next: "unusual-noise-dep" },
      { label: "Autre", next: "contact-sav-general" }
    ]
  },
  "manual-low-suction": {
    id: "manual-low-suction",
    type: "question",
    maxSteps: 5,
    title: "Le decolmatage a manivelle a-t-il ete fait ?",
    options: [
      { label: "Oui", next: "manual-check-deflector" },
      { label: "Non", next: "manual-decolmatage-advice" }
    ]
  },
  "manual-decolmatage-advice": {
    id: "manual-decolmatage-advice",
    type: "text",
    maxSteps: 5,
    title: "Decolmatage manuel",
    body: "Effectuez un cycle complet de decolmatage manuel.",
    target: "resolved"
  },
  "manual-check-deflector": {
    id: "manual-check-deflector",
    type: "question",
    maxSteps: 5,
    title: "Deflecteur correctement positionne ?",
    options: [
      { label: "Oui", next: "manual-check-conduit" },
      { label: "Non", next: "manual-deflector-advice" }
    ]
  },
  "manual-deflector-advice": {
    id: "manual-deflector-advice",
    type: "text",
    maxSteps: 5,
    title: "Ajustement deflecteur",
    body: "Repositionnez le deflecteur puis retestez.",
    target: "resolved"
  },
  "manual-check-conduit": {
    id: "manual-check-conduit",
    type: "question",
    maxSteps: 5,
    title: "Le conduit est-il degage ?",
    options: [
      { label: "Oui", next: "manual-filter-issue" },
      { label: "Non", next: "manual-clear-advice" }
    ]
  },
  "manual-clear-advice": {
    id: "manual-clear-advice",
    type: "text",
    maxSteps: 5,
    title: "Nettoyage conduit",
    body: "Eliminez l'obstruction dans le reseau d'aspiration.",
    target: "resolved"
  },
  "manual-filter-issue": {
    id: "manual-filter-issue",
    type: "text",
    maxSteps: 5,
    title: "Filtre a remplacer",
    body: "Le filtre semble en fin de vie.",
    target: "filter"
  },
  "manual-no-power": {
    id: "manual-no-power",
    type: "question",
    maxSteps: 3,
    title: "Alimentation et rearmement verifies ?",
    options: [
      { label: "Oui", next: "dry-power-sav" },
      { label: "Non", next: "manual-power-advice" }
    ]
  },
  "manual-power-advice": {
    id: "manual-power-advice",
    type: "text",
    maxSteps: 3,
    title: "Verification alimentation",
    body: "Controlez la chaine d'alimentation avant nouvel essai.",
    target: "resolved"
  },
  "manual-pneumatic-start": {
    id: "manual-pneumatic-start",
    type: "question",
    maxSteps: 5,
    title: "Quel symptome principal observez-vous ?",
    options: [
      { label: "Faible aspiration / signal pressostat", next: "mp-low-suction-signal" },
      { label: "Ne demarre pas", next: "mp-no-power" },
      { label: "Bruit anormal", next: "unusual-noise-dep" },
      { label: "Autre", next: "contact-sav-general" }
    ]
  },
  "mp-low-suction-signal": {
    id: "mp-low-suction-signal",
    type: "question",
    maxSteps: 5,
    title: "Le nettoyage pneumatique a ete realise ?",
    options: [
      { label: "Oui", next: "mp-check-pressure-again" },
      { label: "Non", next: "mp-cleaning-advice" }
    ]
  },
  "mp-cleaning-advice": {
    id: "mp-cleaning-advice",
    type: "text",
    maxSteps: 5,
    title: "Nettoyage pneumatique",
    body: "Effectuez un cycle complet de nettoyage pneumatique.",
    target: "resolved"
  },
  "mp-check-pressure-again": {
    id: "mp-check-pressure-again",
    type: "question",
    maxSteps: 5,
    title: "La pression de service est-elle correcte ?",
    options: [
      { label: "Oui", next: "mp-check-container" },
      { label: "Non / pas sur", next: "mp-pressure-advice" }
    ]
  },
  "mp-pressure-advice": {
    id: "mp-pressure-advice",
    type: "text",
    maxSteps: 5,
    title: "Reglage pression",
    body: "Corrigez la pression pneumatique puis relancez l'essai.",
    target: "resolved"
  },
  "mp-check-container": {
    id: "mp-check-container",
    type: "question",
    maxSteps: 5,
    title: "Collecteur et conduit sont-ils conformes ?",
    options: [
      { label: "Oui", next: "mp-filter-issue" },
      { label: "Non", next: "mp-clear-advice" }
    ]
  },
  "mp-clear-advice": {
    id: "mp-clear-advice",
    type: "text",
    maxSteps: 5,
    title: "Nettoyage reseau",
    body: "Nettoyez collecteur et circuit d'aspiration.",
    target: "resolved"
  },
  "mp-filter-issue": {
    id: "mp-filter-issue",
    type: "text",
    maxSteps: 5,
    title: "Filtre a remplacer",
    body: "Le filtre est probablement en saturation.",
    target: "filter"
  },
  "mp-no-power": {
    id: "mp-no-power",
    type: "question",
    maxSteps: 3,
    title: "Alimentation et securites verifiees ?",
    options: [
      { label: "Oui", next: "dry-power-sav" },
      { label: "Non", next: "mp-power-advice" }
    ]
  },
  "mp-power-advice": {
    id: "mp-power-advice",
    type: "text",
    maxSteps: 3,
    title: "Verification alimentation",
    body: "Controlez la ligne d'alimentation et les securites.",
    target: "resolved"
  },

  "table-direct-sav": {
    id: "table-direct-sav",
    type: "text",
    maxSteps: 1,
    title: "Prise en charge table aspirante",
    body: "Ce produit est traite en diagnostic SAV direct.",
    target: "sav"
  }
};

export function getTargetLabel(target: DiagnosticTarget): string {
  if (target === "filter") return "Consommables";
  if (target === "sav-pump") return "SAV pompe";
  if (target === "sav") return "SAV";
  return "Resolue";
}
