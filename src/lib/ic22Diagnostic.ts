import type { DiagnosticNode, DiagnosticTextNode } from "./assistantData.ts";

// One validated L1 graph for the IC 22 / KM 22 / VL 220 chassis.
// Keep model aliases in the catalogue layer; they must not fork this graph.
const q = (id: string, title: string, options: [string, string][]): DiagnosticNode => ({
  id, type: "question", title, maxSteps: 30,
  options: options.map(([label, next]) => ({ label, next }))
});
const t = (id: string, title: string, body: string, next?: string,
  target?: "sav" | "sav-pump" | "resolved", requiresActionConfirmation = false,
  traceSummary?: string): DiagnosticTextNode => ({
  id, type: "text", title, body, maxSteps: 30, requiresActionConfirmation,
  ...(traceSummary ? { traceSummary } : {}),
  ...(next ? { next } : { target: target ?? "sav" })
});
const action = (id: string, title: string, body: string, next: string): DiagnosticNode =>
  t(id, title, body, next, undefined, true);
const sav = (id: string, title: string, body: string): DiagnosticTextNode => t(id, title, body);
const yesNo = (yes: string, no: string): [string, string][] => [["Oui", yes], ["Non", no]];

export const IC22_START = "ic22-start";
export const IC22_CHASSIS_IDS = new Set(["ic22", "vl220"]);
export const IC22_OPENING_VIDEO_URL =
  "https://drive.google.com/file/d/1KxEqO7RjJyehCXrjPndr9MVHgGGw_fA2/view?usp=drive_link";
export const IC22_OPENING_NODES = new Set([
  "ic22-float-access", "ic22-circuit-access", "ic22-leak-panel-access", "ic22-leak-circuit-access",
  "ic22-swing-access"
]);
// Reuse the manually uploaded OberA image unchanged in both interfaces.
export const IC22_BASIN_IMAGE_NODE_IDS = new Set([
  "ic22-float-access", "ic22-circuit-access", "ic22-pump-visual-safety", "ic22-leak-circuit-access",
  "ic22-swing-access", "ic22-swing-reseat", "ic22-swing-visual-safety"
]);
export const IC22_BASIN_ANNOTATED_IMAGE_URL = "/assets/ic22-interieur-annote.png";

export const IC22_NOISE_TYPES = [
  "Frottement", "Claquement / vibration", "Bruit provenant du ventilateur",
  "Bruit provenant de la pompe", "Autre bruit"
];

export const IC22_ERROR_MEANINGS: Record<string, string> = {
  E01: "Protection contre une sous-tension", E02: "Protection contre une surtension",
  E03: "Protection contre une surintensité", E04: "Protection contre un court-circuit",
  E05: "Protection contre une perte de phase", E06: "Protection contre le blocage du moteur",
  E07: "Défaut matériel interne", E08: "Défaut matériel externe",
  E09: "Protection contre la surchauffe", E10: "Défaut du capteur de température",
  E11: "Défaut du potentiomètre", E12: "Défaut PFC / correction du facteur de puissance",
  E20: "Défaut de communication"
};

export const IC22_DIAGNOSTIC_NODES: Record<string, DiagnosticNode> = {
  "ic22-start": q("ic22-start", "Quel problème constatez-vous sur votre appareil ?", [
    ["L’appareil ne fait pas de froid", "ic22-cold-air"],
    ["L’appareil ne s’allume pas", "ic22-power-check"],
    ["L’appareil ne souffle pas ou souffle faiblement", "ic22-airflow"],
    ["L’appareil fuit", "ic22-leak-origin"],
    ["L’oscillation ne fonctionne pas", "ic22-swing-access"],
    ["L’appareil fait un bruit anormal", "ic22-noise-type"],
    ["Un code d’erreur s’affiche", "ic22-error-code"],
    ["L’appareil dégage une mauvaise odeur", "ic22-odor-new"],
    ["Autre problème", "ic22-other-sav"]
  ]),
  "ic22-cold-air": q("ic22-cold-air", "L’appareil souffle-t-il de l’air ?", yesNo("ic22-cooling-enabled", "ic22-no-air-power")),
  "ic22-cooling-enabled": q("ic22-cooling-enabled", "Le refroidissement est-il activé ?",
    yesNo("ic22-cooling-light", "ic22-enable-cooling")),
  "ic22-enable-cooling": action("ic22-enable-cooling", "Activer le refroidissement",
    "Utilisez la commande de refroidissement de l’appareil, sans modifier de réglage interne.", "ic22-enable-result"),
  "ic22-enable-result": q("ic22-enable-result", "Avez-vous pu activer le refroidissement ?",
    yesNo("ic22-cooling-light", "ic22-cooling-command-sav")),
  "ic22-cooling-command-sav": sav("ic22-cooling-command-sav", "Contacter le SAV",
    "La commande de refroidissement ne s’active pas. Aucune cause interne n’est présumée."),
  "ic22-cooling-light": q("ic22-cooling-light", "Quel est l’état du voyant de refroidissement ?", [
    ["Il clignote", "ic22-water-level"], ["Il reste fixe", "ic22-circuit-access"],
    ["Autre / impossible à déterminer", "ic22-light-sav"]
  ]),
  "ic22-light-sav": sav("ic22-light-sav", "Contacter le SAV", "L’état du voyant de refroidissement n’a pas pu être identifié."),

  "ic22-water-level": q("ic22-water-level", "Le niveau d’eau est-il suffisant ?",
    yesNo("ic22-float-access", "ic22-fill-water")),
  "ic22-fill-water": action("ic22-fill-water", "Compléter le niveau d’eau",
    "Arrêtez l’appareil, remplissez la cuve jusqu’à un niveau suffisant, remettez en service et observez le voyant et le froid.",
    "ic22-after-fill"),
  "ic22-after-fill": q("ic22-after-fill", "Quel est le résultat après remplissage ?", [
    ["Voyant normal et froid revenu", "ic22-cooling-restored"],
    ["Voyant normal mais toujours pas de froid", "ic22-circuit-access"],
    ["Le voyant clignote toujours", "ic22-float-access"]
  ]),
  "ic22-cooling-restored": t("ic22-cooling-restored", "Refroidissement rétabli",
    "Le froid est revenu après le contrôle effectué.", undefined, "resolved"),
  "ic22-float-access": action("ic22-float-access", "Contrôler visuellement le flotteur de niveau",
    "Arrêtez et débranchez l’appareil. Ouvrez-le avec la vidéo validée. Contrôlez visuellement si le flotteur/capteur de niveau est bloqué, mal positionné ou manifestement inversé. Ne touchez à aucun élément électrique. Si l’élément n’est pas identifiable avec certitude, contactez le SAV.",
    "ic22-float-state"),
  "ic22-float-state": q("ic22-float-state", "Une anomalie simple et évidente du flotteur est-elle visible ?", [
    ["Oui : bloqué, mal positionné ou inversé", "ic22-float-correct"],
    ["Non / je ne peux pas l’identifier sûrement", "ic22-float-sav"]
  ]),
  "ic22-float-correct": action("ic22-float-correct", "Correction simple du flotteur",
    "Uniquement appareil arrêté et débranché, dégagez ou repositionnez le flotteur si le défaut est évident et l’accès simple. Ne débranchez aucun câble. Refermez complètement l’appareil, remettez-le en service et observez le voyant et le froid.",
    "ic22-float-retest"),
  "ic22-float-retest": q("ic22-float-retest", "Quel est le résultat après ce contrôle ?", [
    ["Voyant normal et froid revenu", "ic22-cooling-restored"],
    ["Voyant normal mais toujours pas de froid", "ic22-circuit-access"],
    ["Voyant toujours clignotant / doute", "ic22-float-sav"]
  ]),
  "ic22-float-sav": sav("ic22-float-sav", "Contacter le SAV",
    "Le contrôle du flotteur n’a pas confirmé de correction simple. Aucune panne du capteur n’est affirmée."),

  "ic22-circuit-access": action("ic22-circuit-access", "Vérifier le circuit d’eau visible",
    "Arrêtez et débranchez l’appareil avant l’ouverture. Avec la vidéo validée, inspectez sans intervention électrique les tuyaux et raccordements visibles : tuyau déboîté, pincé, tendu, abîmé, raccord cassé, circuit encrassé ou connecteur visiblement anormal. Ne manipulez pas le connecteur. Si un élément est difficile à identifier, contactez le SAV.",
    "ic22-circuit-state"),
  "ic22-circuit-state": q("ic22-circuit-state", "Que constatez-vous sur le circuit visible ?", [
    ["Un tuyau simplement déboîté", "ic22-reseat-hose"],
    ["Tuyau abîmé, trop court, raccord cassé ou circuit encrassé", "ic22-circuit-sav"],
    ["Tuyaux et connecteur visiblement raccordés, aucune anomalie simple", "ic22-pump-visual-safety"],
    ["Connecteur anormal ou non identifiable", "ic22-circuit-sav"],
    ["Je ne peux pas le déterminer", "ic22-circuit-sav"]
  ]),
  "ic22-reseat-hose": action("ic22-reseat-hose", "Remettre un tuyau déboîté en place",
    "Appareil arrêté et débranché, remettez uniquement le tuyau clairement déboîté sur son raccord accessible. Si le raccord est cassé ou la réparation incertaine, contactez le SAV. Refermez complètement, remettez en service puis vérifiez l’arrivée d’eau et le froid.",
    "ic22-hose-retest"),
  "ic22-hose-retest": q("ic22-hose-retest", "L’eau circule-t-elle et le froid est-il revenu ?",
    yesNo("ic22-cooling-restored", "ic22-pump-visual-safety")),
  "ic22-circuit-sav": sav("ic22-circuit-sav", "Contacter le SAV",
    "Le circuit présente un défaut qui ne relève pas d’une remise en place simple et certaine."),

  "ic22-pump-unchecked-sav": sav("ic22-pump-unchecked-sav", "Contacter le SAV",
    "Le contrôle visuel sous tension n’a pas pu être effectué en respectant les précautions. Aucune panne de pompe n’est affirmée."),
  "ic22-pump-visual-safety": t("ic22-pump-visual-safety", "Contrôle visuel de la pompe sous tension",
    "Pour vérifier le fonctionnement de la pompe, l’appareil doit être en fonctionnement. Ce contrôle est uniquement visuel. Ne mettez pas les mains dans l’appareil ; ne touchez ni à la pompe, ni aux tuyaux, ni aux câbles, ni aux connecteurs ; ne mettez aucun outil ou objet à l’intérieur. Gardez cheveux, vêtements amples et accessoires éloignés des pièces en mouvement. Observez simplement si la pompe fonctionne et si l’eau remonte correctement. Toute manipulation doit être réalisée appareil arrêté et débranché.",
    "ic22-pump-visual-consent"),
  "ic22-pump-visual-consent": q("ic22-pump-visual-consent",
    "Pouvez-vous effectuer ce contrôle visuel sous tension en respectant ces précautions ?", [
      ["Oui, continuer", "ic22-pump-observation"], ["Non, contacter le SAV", "ic22-pump-unchecked-sav"]
    ]),
  "ic22-pump-observation": q("ic22-pump-observation", "Que montre l’observation visuelle de la pompe ?", [
    ["La pompe ne fonctionne pas", "ic22-pump-replace"],
    ["Elle fonctionne, mais le débit est clairement insuffisant", "ic22-pump-replace"],
    ["La pompe et le débit sont corrects", "ic22-panel-state"],
    ["Impossible à déterminer", "ic22-pump-ambiguous-sav"]
  ]),
  "ic22-pump-ambiguous-sav": sav("ic22-pump-ambiguous-sav", "Contacter le SAV",
    "Observation visuelle de la pompe non concluante. Aucune panne de pompe n’est affirmée."),
  "ic22-pump-replace": t("ic22-pump-replace", "Pompe à remplacer",
    "Le remplacement de la pompe peut être réalisé directement sur site. C’est la solution recommandée pour réduire le délai d’intervention et l’immobilisation de l’appareil. Le remplacement doit être réalisé par une personne capable de suivre la procédure de remplacement transmise par OberA.",
    undefined, "sav-pump"),

  "ic22-panel-state": q("ic22-panel-state", "L’eau arrive-t-elle, mais le panneau absorbe ou répartit-il mal l’eau ?", [
    ["Oui, même sans dépôt important", "ic22-panel-replace"],
    ["Le panneau est très usé ou fortement entartré", "ic22-panel-replace"],
    ["Non, les panneaux semblent corrects", "ic22-environment"],
    ["Je ne peux pas le déterminer", "ic22-panel-sav"]
  ]),
  "ic22-panel-replace": t("ic22-panel-replace", "Panneau vieillissant à remplacer",
    "Le panneau absorbe ou répartit mal l’eau, ou il est fortement usé/entartré. Prévoyez son remplacement ; ne le lavez pas pour le réutiliser. En présence de calcaire, la qualité de l’eau et des vidanges plus fréquentes devront être examinées avec OberA, sans traitement ni fréquence improvisés.",
    "ic22-panel-retest"),
  "ic22-panel-retest": q("ic22-panel-retest", "Après remplacement du panneau, le rafraîchissement est-il satisfaisant ?",
    yesNo("ic22-cooling-restored", "ic22-environment")),
  "ic22-panel-sav": sav("ic22-panel-sav", "Contacter le SAV", "L’état des panneaux ne peut pas être établi avec certitude."),
  "ic22-environment": q("ic22-environment", "Le local permet-il une entrée et une sortie d’air pendant l’utilisation ?",
    yesNo("ic22-environment-sav", "ic22-environment-advice")),
  "ic22-environment-advice": action("ic22-environment-advice", "Améliorer le renouvellement d’air",
    "Le rafraîchisseur évaporatif a besoin d’une entrée et d’une sortie d’air. Si possible, améliorez leur circulation dans le local, puis observez le rafraîchissement. Cela ne signifie pas que l’appareil est en panne.",
    "ic22-environment-retest"),
  "ic22-environment-retest": q("ic22-environment-retest", "Le rafraîchissement est-il désormais satisfaisant ?",
    yesNo("ic22-cooling-restored", "ic22-environment-sav")),
  "ic22-environment-sav": sav("ic22-environment-sav", "Contacter le SAV",
    "Les contrôles de premier niveau n’ont pas identifié une cause simple au manque de froid."),

  "ic22-airflow": q("ic22-airflow", "L’appareil ne souffle-t-il aucun air, ou le débit est-il faible ?", [
    ["Aucun souffle", "ic22-no-air-power"], ["Débit d’air faible", "ic22-filter-test"]
  ]),
  "ic22-no-air-power": q("ic22-no-air-power", "L’appareil est-il correctement alimenté ?", [
    ["Oui", "ic22-no-air-sav"], ["Non", "ic22-power-check"], ["Je ne sais pas", "ic22-power-check"]
  ]),
  "ic22-no-air-sav": sav("ic22-no-air-sav", "Contacter le SAV",
    "L’appareil est alimenté mais ne souffle pas. Aucune panne de moteur ou de carte n’est déduite."),
  "ic22-filter-test": action("ic22-filter-test", "Essai court sans filtres",
    "Utilisez la commande de vitesse de ventilation au maximum. Arrêtez et débranchez l’appareil, retirez les filtres accessibles, puis effectuez un essai court sans filtres seulement si la configuration reste sûre. N’utilisez pas l’appareil durablement sans filtres. Si l’essai est impossible en sécurité, contactez le SAV.",
    "ic22-filter-result"),
  "ic22-filter-result": q("ic22-filter-result", "Le débit d’air est-il redevenu normal après avoir retiré les filtres ?", [
    ["Oui", "ic22-filter-replace"], ["Non", "ic22-filter-sav"],
    ["Essai impossible en sécurité", "ic22-filter-sav"]
  ]),
  "ic22-filter-replace": t("ic22-filter-replace", "Filtres saturés : remplacement",
    "Le test confirme que les filtres réduisent le débit. Ils sont jetables : remplacez-les. Ne les lavez pas et ne les nettoyez pas pour les réutiliser. Remontez correctement avant l’utilisation normale.",
    "ic22-filter-retest"),
  "ic22-filter-retest": q("ic22-filter-retest", "Après remplacement, le débit est-il normal ?",
    yesNo("ic22-filter-restored", "ic22-filter-sav")),
  "ic22-filter-restored": t("ic22-filter-restored", "Débit d’air rétabli", "Le débit est redevenu normal avec les filtres remplacés.", undefined, "resolved"),
  "ic22-filter-sav": sav("ic22-filter-sav", "Contacter le SAV",
    "Le test des filtres n’a pas rétabli le débit ou ne peut pas être effectué en sécurité. La cause du problème de ventilation reste indéterminée."),

  "ic22-power-check": action("ic22-power-check", "Contrôler l’alimentation extérieure",
    "Vérifiez que la prise utilisée fonctionne, que le câble d’alimentation est correctement branché et qu’il ne présente pas de dommage visible. Si l’installation électrique du site est protégée par un disjoncteur, vérifiez qu’il n’a pas déclenché. N’ouvrez pas l’appareil et ne faites aucune mesure électrique.",
    "ic22-power-result"),
  "ic22-power-result": q("ic22-power-result", "Que constatez-vous après ces contrôles ?", [
    ["Câble/prise abîmés, chauffe, fonte, brûlé ou disjonction", "ic22-power-danger"],
    ["L’appareil fonctionne à nouveau", "ic22-power-restored"],
    ["Il ne s’allume toujours pas / doute", "ic22-power-sav"]
  ]),
  "ic22-power-danger": sav("ic22-power-danger", "Arrêter et contacter le SAV",
    "Arrêtez et débranchez l’appareil. Ne répétez pas l’essai en présence d’un dommage, d’une chauffe, d’une odeur de brûlé ou d’une disjonction."),
  "ic22-power-restored": t("ic22-power-restored", "Alimentation rétablie", "L’appareil fonctionne à nouveau après les contrôles extérieurs.", undefined, "resolved"),
  "ic22-power-sav": sav("ic22-power-sav", "Contacter le SAV", "L’appareil ne s’allume toujours pas après les contrôles extérieurs."),

  "ic22-leak-origin": q("ic22-leak-origin", "D’où semble venir l’eau ?", [
    ["Panneau alvéolaire", "ic22-leak-panel-access"],
    ["Tuyau / circuit interne", "ic22-leak-circuit-access"],
    ["Remplissage", "ic22-leak-other-sav"], ["Vidange / bouchon", "ic22-leak-other-sav"],
    ["Réservoir / cuve", "ic22-leak-other-sav"], ["Pompe", "ic22-leak-other-sav"],
    ["Autre", "ic22-leak-other-sav"], ["Je ne sais pas", "ic22-leak-other-sav"]
  ]),
  "ic22-leak-panel-access": action("ic22-leak-panel-access", "Test de retournement du panneau",
    "Arrêtez et débranchez l’appareil. Avec la vidéo validée, démontez le panneau alvéolaire accessible, retournez-le pour utiliser son autre face, remontez correctement puis remettez en service. Observez si le ruissellement ou la fuite persiste. Ce retournement est un test, pas une réparation définitive.",
    "ic22-leak-panel-result"),
  "ic22-leak-panel-result": q("ic22-leak-panel-result", "La fuite a-t-elle disparu après avoir retourné le panneau ?",
    yesNo("ic22-leak-panel-positive", "ic22-leak-panel-sav")),
  "ic22-leak-panel-positive": t("ic22-leak-panel-positive", "Test positif : panneau vieillissant",
    "La fuite a disparu pendant ce test. Le panneau commence probablement à vieillir : son remplacement est à prévoir. Le diagnostic initial peut se terminer sans attendre ce remplacement. Le retournement n’est pas une réparation définitive.",
    undefined, "resolved"),
  "ic22-leak-panel-sav": sav("ic22-leak-panel-sav", "Contacter le SAV", "La fuite persiste après le test du panneau."),
  "ic22-leak-circuit-access": action("ic22-leak-circuit-access", "Contrôler une fuite du circuit visible",
    "Arrêtez et débranchez l’appareil. Avec la vidéo validée, observez les tuyaux et raccords visibles. Si un tuyau est simplement déboîté et le raccord intact, il peut être remis en place appareil hors tension. Un tuyau abîmé, trop court, un raccord cassé ou une réparation incertaine relèvent du SAV.",
    "ic22-leak-circuit-state"),
  "ic22-leak-circuit-state": q("ic22-leak-circuit-state", "Que constatez-vous ?", [
    ["Tuyau simplement déboîté", "ic22-leak-reseat"],
    ["Tuyau/raccord abîmé ou cause incertaine", "ic22-leak-other-sav"]
  ]),
  "ic22-leak-reseat": action("ic22-leak-reseat", "Remettre le tuyau en place",
    "Appareil débranché, remettez uniquement le tuyau clairement déboîté sur son raccord intact. Refermez complètement, remettez en service puis observez la fuite.",
    "ic22-leak-retest"),
  "ic22-leak-retest": q("ic22-leak-retest", "La fuite a-t-elle disparu ?",
    yesNo("ic22-leak-restored", "ic22-leak-other-sav")),
  "ic22-leak-restored": t("ic22-leak-restored", "Fuite disparue", "La fuite a disparu après la remise en place du tuyau.", undefined, "resolved"),
  "ic22-leak-other-sav": sav("ic22-leak-other-sav", "Contacter le SAV",
    "La provenance ou la réparation de la fuite nécessite une vérification SAV. Aucune cause précise n’est affirmée."),

  "ic22-swing-access": action("ic22-swing-access", "Vérifier la liaison du swing",
    "Arrêtez et débranchez l’appareil avant de l’ouvrir.\n\nRepérez la barre horizontale qui relie les pales du swing et la tige du moteur swing.\n\nLa tige du moteur doit être correctement emboîtée dans la barre.",
    "ic22-swing-link"),
  "ic22-swing-link": q("ic22-swing-link", "Que constatez-vous ?", [
    ["La tige est correctement emboîtée", "ic22-swing-visual-safety"],
    ["La tige est déboîtée mais peut être remise en place", "ic22-swing-reseat"],
    ["La liaison est cassée ou endommagée", "ic22-swing-broken-sav"]
  ]),
  "ic22-swing-reseat": action("ic22-swing-reseat", "Remettre la liaison en place",
    "Appareil arrêté et débranché, remettez la tige du moteur swing dans son logement sur la barre horizontale.\n\nNe démontez pas le moteur et ne forcez pas sur le mécanisme.\n\nRefermez ensuite l’appareil et remettez-le en service.",
    "ic22-swing-retest"),
  "ic22-swing-retest": q("ic22-swing-retest", "Le swing fonctionne-t-il à nouveau ?",
    yesNo("ic22-swing-restored", "ic22-swing-visual-safety")),
  "ic22-swing-restored": t("ic22-swing-restored", "Swing rétabli",
    "Le swing fonctionne à nouveau après la remise en place de la liaison mécanique.", undefined, "resolved"),
  "ic22-swing-broken-sav": t("ic22-swing-broken-sav", "Contacter le SAV",
    "Liaison mécanique du swing cassée ou endommagée.", undefined, "sav", false,
    "Liaison mécanique du swing cassée ou endommagée."),
  "ic22-swing-visual-safety": t("ic22-swing-visual-safety", "Contrôle visuel du moteur swing sous tension",
    "Pour vérifier le fonctionnement du moteur swing, l’appareil doit être en fonctionnement.\n\nCe contrôle est uniquement visuel.\n\nNe mettez pas les mains dans l’appareil.\nNe touchez ni au moteur swing, ni à la barre, ni aux pales, ni aux câbles.\nN’utilisez aucun outil ou objet à l’intérieur.\nGardez cheveux, vêtements amples et accessoires éloignés des pièces en mouvement.\n\nObservez uniquement si le moteur swing tourne.\n\nToute manipulation doit être réalisée appareil arrêté et débranché.",
    "ic22-swing-observation"),
  "ic22-swing-observation": q("ic22-swing-observation", "Que constatez-vous ?", [
    ["Le moteur swing tourne", "ic22-swing-turning-sav"],
    ["Le moteur swing ne tourne pas", "ic22-swing-stopped-sav"]
  ]),
  "ic22-swing-turning-sav": t("ic22-swing-turning-sav", "Contacter le SAV",
    "Liaison mécanique correctement emboîtée. Le moteur swing tourne visuellement mais le swing ne fonctionne pas correctement.",
    undefined, "sav", false,
    "Liaison mécanique correctement emboîtée. Le moteur swing tourne visuellement mais le swing ne fonctionne pas correctement."),
  "ic22-swing-stopped-sav": t("ic22-swing-stopped-sav", "Contacter le SAV",
    "Liaison mécanique correctement emboîtée. Aucun mouvement visible du moteur swing.",
    undefined, "sav", false,
    "Liaison mécanique correctement emboîtée. Aucun mouvement visible du moteur swing."),
  "ic22-noise-type": q("ic22-noise-type", "Quel type de bruit constatez-vous ?",
    IC22_NOISE_TYPES.map(label => [label, "ic22-noise-sav"])),
  "ic22-noise-sav": sav("ic22-noise-sav", "Contacter le SAV",
    "Le type de bruit sélectionné sera repris dans le formulaire SAV. Aucune cause mécanique n’est déduite automatiquement."),
  "ic22-error-code": q("ic22-error-code", "Quel code d’erreur s’affiche ?", [
    ...Object.keys(IC22_ERROR_MEANINGS).map(code => [code, `ic22-code-${code.toLowerCase()}`] as [string, string]),
    ["Autre code / illisible", "ic22-code-other"]
  ]),
  ...Object.fromEntries(Object.entries(IC22_ERROR_MEANINGS).map(([code, meaning]) => [
    `ic22-code-${code.toLowerCase()}`,
    sav(`ic22-code-${code.toLowerCase()}`, `${code} — ${meaning}`,
      `Code ${code} : ${meaning}. Contactez le SAV sans intervention technique ni déduction de pièce à remplacer.`)
  ])),
  "ic22-code-other": sav("ic22-code-other", "Contacter le SAV",
    "Le code est différent ou illisible. Indiquez ce qui apparaît dans le commentaire du formulaire."),

  "ic22-odor-new": q("ic22-odor-new", "Les panneaux alvéolaires sont-ils neufs ou ont-ils été remplacés récemment ?",
    yesNo("ic22-odor-new-info", "ic22-odor-drains")),
  "ic22-odor-new-info": t("ic22-odor-new-info", "Odeur des panneaux récents",
    "Les panneaux neufs peuvent dégager une odeur liée à leur traitement pendant les premières heures de fonctionnement. Observez son évolution après plusieurs heures.",
    "ic22-odor-new-result"),
  "ic22-odor-new-result": q("ic22-odor-new-result", "Après plusieurs heures, l’odeur a-t-elle disparu ou nettement diminué ?",
    yesNo("ic22-odor-restored", "ic22-odor-probioway-sav")),
  "ic22-odor-restored": t("ic22-odor-restored", "Odeur disparue", "L’odeur des panneaux récents s’est dissipée.", undefined, "resolved"),
  "ic22-odor-probioway-sav": sav("ic22-odor-probioway-sav", "Contacter le SAV",
    "Odeur persistante de panneaux récents ; traitement/nettoyage Probioway à envisager par le SAV. Aucun dosage ni traitement n’est proposé au Client."),
  "ic22-odor-drains": q("ic22-odor-drains", "Les vidanges de l’appareil sont-elles réalisées régulièrement ?",
    yesNo("ic22-odor-panel-age", "ic22-odor-drain-advice")),
  "ic22-odor-drain-advice": action("ic22-odor-drain-advice", "Effectuer une vidange",
    "Selon l’environnement et les conditions d’utilisation, effectuez 1 à 3 vidanges par semaine. Effectuez une vidange complète, remplissez avec de l’eau propre puis refaites un essai.",
    "ic22-odor-drain-result"),
  "ic22-odor-drain-result": q("ic22-odor-drain-result", "L’odeur a-t-elle disparu ?",
    yesNo("ic22-odor-restored", "ic22-odor-panel-age")),
  "ic22-odor-panel-age": q("ic22-odor-panel-age", "Le panneau alvéolaire a-t-il plus d’un an ?", [
    ["Oui", "ic22-odor-panel-replace"], ["Non", "ic22-odor-environment"],
    ["Je ne sais pas", "ic22-odor-unknown-sav"]
  ]),
  "ic22-odor-panel-replace": t("ic22-odor-panel-replace", "Remplacement du panneau conseillé",
    "Un panneau de plus d’un an peut progressivement perdre en capacité d’absorption et de répartition de l’eau. Son remplacement est conseillé.",
    undefined, undefined, false, "Odeur persistante — panneau de plus d’un an — remplacement conseillé."),
  "ic22-odor-unknown-sav": sav("ic22-odor-unknown-sav", "Contacter le SAV",
    "L’âge du panneau n’a pas pu être établi et l’odeur persiste."),
  "ic22-odor-environment": q("ic22-odor-environment", "L’air aspiré par l’appareil présente-t-il déjà une odeur particulière ?", [
    ["Oui", "ic22-odor-ambient"], ["Non", "ic22-odor-probioway-sav"]
  ]),
  "ic22-odor-ambient": t("ic22-odor-ambient", "Odeur de l’air ambiant",
    "L’air ambiant peut contribuer à l’odeur perçue. Si l’odeur reste anormale ou gênante, contactez le SAV.",
    "ic22-odor-ambient-result"),
  "ic22-odor-ambient-result": q("ic22-odor-ambient-result", "L’odeur reste-t-elle anormale ou gênante ?",
    yesNo("ic22-odor-general-sav", "ic22-odor-restored")),
  "ic22-odor-general-sav": sav("ic22-odor-general-sav", "Contacter le SAV", "L’odeur persiste après les contrôles de premier niveau."),
  "ic22-other-sav": {
    ...sav("ic22-other-sav", "Autre problème",
      "Aucun diagnostic technique n’est déduit d’un cas particulier. Transmettez votre description au SAV."),
    freeTextPrompt: "Décrivez le problème rencontré avec votre appareil."
  }
};

// The positive panel-flip test closes the initial diagnostic but schedules a
// replacement; it is not a permanent repair. Other positive nodes follow a check.
export const IC22_CONFIRMED_TERMINALS = new Set([
  "ic22-cooling-restored", "ic22-filter-restored", "ic22-power-restored",
  "ic22-leak-panel-positive", "ic22-leak-restored", "ic22-odor-restored", "ic22-swing-restored"
]);

export const IC22_PANEL_INFO =
  "Avec le temps, le panneau peut moins bien absorber et répartir l’eau. Cela peut réduire l’efficacité du rafraîchissement, favoriser le ruissellement et contribuer à l’apparition d’odeurs.";
export const IC22_PANEL_INFO_NODES = new Set([
  "ic22-panel-replace", "ic22-leak-panel-access", "ic22-leak-panel-positive", "ic22-odor-panel-replace"
]);
