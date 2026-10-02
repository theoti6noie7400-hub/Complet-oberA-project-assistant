import {
  DIAGNOSTIC_NODES,
  resolveDynamicNext,
  type CategoryId,
  type DiagnosticNode
} from "./assistantData";

export const COMMERCIAL_EXCLUDED_PRODUCT_IDS = new Set([
  "filtower",
  "jumbo",
  "epur-ex-2000",
  "ecoclim20",
  "epur150",
  "dosseret-aspirant"
]);

export const COMMERCIAL_CATEGORY_LABELS: Record<CategoryId, string> = {
  rafraichisseurs: "Rafraîchisseurs d'air",
  purificateurs: "Purificateurs d'air",
  depoussiereurs: "Dépoussiéreurs",
  "tables-aspirantes": "Tables aspirantes"
};

// Ressource technique OberA fournie pour la V1 interne. Le fichier n'est pas
// commité dans le portail ; le lien Drive permet de garder la vidéo hors du build.
export const IC22_KM22_DISMANTLING_VIDEO_URL =
  "https://drive.google.com/file/d/1KxEqO7RjJyehCXrjPndr9MVHgGGw_fA2/view?usp=drive_link";

const GLOBAL_OVERRIDES: Record<string, DiagnosticNode> = {
  "no-power": {
    id: "no-power",
    type: "question",
    maxSteps: 4,
    title: "L'alimentation électrique de l'appareil a-t-elle déjà été vérifiée ?",
    options: [
      { label: "Oui", next: "no-power-internal" },
      { label: "Non", next: "power-check-advice" }
    ]
  },
  "power-check-advice": {
    id: "power-check-advice",
    type: "text",
    maxSteps: 4,
    title: "Vérification de l'alimentation",
    body: "Vérifiez que la prise utilisée fonctionne, que le câble d'alimentation est correctement branché et qu'il ne présente pas de dommage visible. Si l'installation électrique du site est protégée par un disjoncteur, vérifiez qu'il n'a pas déclenché.",
    next: "power-check-result"
  },
  "power-check-result": {
    id: "power-check-result",
    type: "question",
    maxSteps: 4,
    title: "Après ces vérifications, l'appareil s'allume-t-il ?",
    options: [
      { label: "Oui", next: "power-restored" },
      { label: "Non", next: "no-power-internal" }
    ]
  },
  "power-restored": {
    id: "power-restored",
    type: "text",
    maxSteps: 4,
    title: "Problème résolu",
    body: "L'appareil s'allume après la vérification de son alimentation électrique.",
    target: "resolved"
  },
  "full-tank": {
    id: "full-tank",
    type: "question",
    maxSteps: 10,
    title: "Le réservoir contient-il suffisamment d'eau ?",
    options: [
      { label: "Oui", next: "pump-connections-access" },
      { label: "Non", next: "pump-fill-water" }
    ]
  },
  "pump-fill-water": {
    id: "pump-fill-water",
    type: "text",
    maxSteps: 10,
    title: "Remplir le réservoir",
    body: "Ajoutez suffisamment d'eau dans le réservoir puis remettez l'appareil en fonctionnement.",
    next: "pump-after-fill"
  },
  "pump-after-fill": {
    id: "pump-after-fill",
    type: "question",
    maxSteps: 10,
    title: "Après remplissage et remise en service, l'appareil produit-il à nouveau de l'air rafraîchi ?",
    options: [
      { label: "Oui", next: "pump-cooling-restored" },
      { label: "Non", next: "pump-connections-access" }
    ]
  },
  "pump-connections-access": {
    id: "pump-connections-access",
    type: "text",
    maxSteps: 10,
    title: "Contrôle du raccordement de la pompe",
    body: "Éteignez et débranchez l'appareil avant de l'ouvrir. Accédez à la pompe puis vérifiez que son connecteur électrique est correctement enfiché et que les tuyaux sont correctement raccordés, sans raccord visiblement débranché.",
    next: "pump-connections-ok"
  },
  "pump-connections-ok": {
    id: "pump-connections-ok",
    type: "question",
    maxSteps: 10,
    title: "Les raccordements électriques et hydrauliques de la pompe sont-ils corrects ?",
    options: [
      { label: "Oui", next: "pump-live-safety" },
      { label: "Non", next: "pump-reconnect" }
    ]
  },
  "pump-reconnect": {
    id: "pump-reconnect",
    type: "text",
    maxSteps: 10,
    title: "Remettre les raccordements en place",
    body: "Appareil débranché, remettez correctement en place le connecteur électrique et/ou les tuyaux concernés. Refermez complètement l'appareil avant de le rebrancher, puis remettez-le en service.",
    next: "pump-after-reconnect"
  },
  "pump-after-reconnect": {
    id: "pump-after-reconnect",
    type: "question",
    maxSteps: 10,
    title: "Après remontage et remise en service, le refroidissement fonctionne-t-il correctement ?",
    options: [
      { label: "Oui", next: "pump-cooling-restored" },
      { label: "Non", next: "pump-live-safety" }
    ]
  },
  "pump-live-safety": {
    id: "pump-live-safety",
    type: "text",
    maxSteps: 10,
    title: "Contrôle sous tension — sécuriser la zone",
    body: "Pour observer la pompe en fonctionnement, l'appareil devra rester ouvert et alimenté. Avant de le rebrancher, sécurisez complètement la zone : personne ne doit pouvoir accéder à l'intérieur de l'appareil ; ne mettez jamais les mains, un outil ou un objet dans l'appareil lorsqu'il est alimenté ; éloignez cheveux, vêtements et objets des pièces en mouvement. Une fois la zone sécurisée, remettez l'appareil en fonctionnement et restez uniquement en observation.",
    next: "pump-running-observation"
  },
  "pump-running-observation": {
    id: "pump-running-observation",
    type: "question",
    maxSteps: 10,
    title: "La pompe fonctionne-t-elle lorsque l'appareil est en marche ?",
    options: [
      { label: "Oui", next: "pump-runs-still-no-cooling" },
      { label: "Non", next: "pump-not-running" }
    ]
  },
  "pump-not-running": {
    id: "pump-not-running",
    type: "text",
    maxSteps: 10,
    title: "Pompe non fonctionnelle",
    body: "Arrêtez puis débranchez l'appareil. La pompe ne fonctionne pas malgré des raccordements corrects : une prise en charge SAV est nécessaire.",
    target: "sav-pump"
  },
  "pump-runs-still-no-cooling": {
    id: "pump-runs-still-no-cooling",
    type: "text",
    maxSteps: 10,
    title: "Pompe en fonctionnement",
    body: "La pompe fonctionne et le circuit d'eau a déjà été contrôlé. Si le refroidissement reste insuffisant, la cause peut venir des panneaux évaporatifs ou des conditions d'utilisation et de l'environnement. Contactez le SAV pour conseil.",
    target: "sav"
  },
  "pump-cooling-restored": {
    id: "pump-cooling-restored",
    type: "text",
    maxSteps: 10,
    title: "Problème résolu",
    body: "Le refroidissement fonctionne à nouveau après la vérification du niveau d'eau ou des raccordements de la pompe.",
    target: "resolved"
  }
};

const IC22_OVERRIDES: Record<string, DiagnosticNode> = {
  "ic22-water-level": {
    id: "ic22-water-level",
    type: "question",
    maxSteps: 7,
    title: "Le niveau d'eau dans la cuve est-il suffisant ?",
    options: [
      { label: "Oui", next: "ic22-level-sensor-access" },
      { label: "Non", next: "ic22-fill-water" }
    ]
  },
  "ic22-fill-water": {
    id: "ic22-fill-water",
    type: "text",
    maxSteps: 7,
    title: "Remplir la cuve",
    body: "Remplissez la cuve jusqu'à un niveau suffisant, puis remettez l'appareil en fonctionnement.",
    next: "ic22-after-fill"
  },
  "ic22-after-fill": {
    id: "ic22-after-fill",
    type: "question",
    maxSteps: 7,
    title: "Après remplissage et remise en service, le voyant COOL clignote-t-il toujours ?",
    options: [
      { label: "Oui", next: "ic22-level-sensor-access" },
      { label: "Non", next: "ic22-problem-resolved" }
    ]
  },
  "ic22-level-sensor-access": {
    id: "ic22-level-sensor-access",
    type: "text",
    maxSteps: 7,
    title: "Accéder au capteur de niveau d'eau",
    body: "Éteignez et débranchez l'appareil avant de l'ouvrir. Accédez ensuite à l'intérieur de l'appareil pour contrôler la position du capteur de niveau d'eau.",
    next: "ic22-level-sensor-position"
  },
  "ic22-level-sensor-position": {
    id: "ic22-level-sensor-position",
    type: "question",
    maxSteps: 7,
    title: "Le capteur de niveau d'eau est-il monté dans le bon sens, de façon à ce que son flotteur puisse remonter avec le niveau d'eau ?",
    options: [
      { label: "Oui", next: "contact-sav-general" },
      { label: "Non / il est à l'envers", next: "ic22-reposition-level-sensor" }
    ]
  },
  "ic22-reposition-level-sensor": {
    id: "ic22-reposition-level-sensor",
    type: "text",
    maxSteps: 7,
    title: "Repositionner le capteur",
    body: "Remettez le capteur de niveau d'eau dans le bon sens. Refermez complètement l'appareil avant de le rebrancher, puis remettez-le en service.",
    next: "ic22-after-sensor"
  },
  "ic22-after-sensor": {
    id: "ic22-after-sensor",
    type: "question",
    maxSteps: 7,
    title: "Après remontage et remise en service, le voyant COOL clignote-t-il toujours ?",
    options: [
      { label: "Oui", next: "contact-sav-general" },
      { label: "Non", next: "ic22-problem-resolved" }
    ]
  },
  "ic22-problem-resolved": {
    id: "ic22-problem-resolved",
    type: "text",
    maxSteps: 7,
    title: "Problème résolu",
    body: "Le voyant COOL ne clignote plus. Le défaut est résolu.",
    target: "resolved"
  }
};

export const FINAL_RESOLVED_NODE_IDS = new Set([
  "power-restored",
  "ic22-problem-resolved",
  "pump-cooling-restored"
]);

// La vidéo sert uniquement à montrer comment ouvrir l'appareil. Une fois l'accès
// interne effectué, elle ne doit pas être répétée sur les étapes suivantes.
export const IC22_VIDEO_HELP_NODE_IDS = new Set([
  "ic22-level-sensor-access",
  "pump-connections-access"
]);

export function commercialDiagnosticNode(nodeId: string, productId: string): DiagnosticNode | null {
  if (productId === "ic22" && IC22_OVERRIDES[nodeId]) return IC22_OVERRIDES[nodeId];
  return GLOBAL_OVERRIDES[nodeId] ?? DIAGNOSTIC_NODES[nodeId] ?? null;
}

export function resolveCommercialNext(currentNodeId: string, next: string, productId: string): string {
  if (productId === "ic22" && currentNodeId === "check-cool-light" && next === "low-level-fix")
    return "ic22-water-level";
  return resolveDynamicNext(next, productId);
}
