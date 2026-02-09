import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "fr" | "en";

const STORAGE_KEY = "obera_app_language";
let currentLanguage: AppLanguage = "fr";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (value: AppLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const EXACT_TEXT_EN: Record<string, string> = {
  "Portail OberA": "OberA Portal",
  "Acces centralise aux outils et services": "Centralized access to tools and services",
  "SAV / Maintenance": "After-sales / Maintenance",
  Portail: "Portal",
  "Bientot disponible": "Coming soon",
  Marketing: "Marketing",
  Commercial: "Sales",
  ADV: "Sales Admin",
  Logistique: "Logistics",
  "Espace Client": "Client Space",
  "Espace Revendeur": "Reseller Space",
  "Retour Portail": "Back to Portal",
  "Aller au SAV / Maintenance": "Go to After-sales / Maintenance",
  Acceder: "Open",
  "Garant de la qualité de votre air": "Guaranteeing your air quality",
  "Diagnostiquez votre appareil ou commandez des consommables.":
    "Diagnose your unit or order consumables.",
  "Dashboard SAV": "After-sales Dashboard",
  "Accès Sécurisé Client": "Secure Client Access",
  "Numéro Client": "Client ID",
  "Code PIN (4 chiffres)": "PIN code (4 digits)",
  "Connexion administrateur": "Administrator sign in",
  "Identifiant admin": "Admin ID",
  "Code PIN": "PIN code",
  "Identifiant admin ou code PIN incorrect.": "Invalid admin ID or PIN.",
  Connexion: "Sign in",
  "Numéro client ou Code PIN incorrect.": "Incorrect client ID or PIN code.",
  "Que souhaitez-vous faire ?": "What do you want to do?",
  "Rafraichisseurs d'air": "Air coolers",
  "Purificateurs d'air": "Air purifiers",
  Depoussiereurs: "Dust collectors",
  "Tables aspirantes": "Downdraft tables",
  "Commander des consommables (Filtres, etc.)": "Order consumables (filters, etc.)",
  "Calculateur saturation charbon actif": "Activated carbon saturation calculator",
  "Sélectionnez votre appareil": "Select your unit",
  'Notice disponible via le bouton "Notice PDF" lorsqu\'elle est disponible.':
    'Manual available through the "PDF Manual" button when available.',
  Selectionner: "Select",
  "Notice PDF": "PDF Manual",
  "Notice indisponible": "Manual unavailable",
  "Vous ne trouvez pas votre appareil ?": "Cannot find your unit?",
  "Contactez-nous directement": "Contact us directly",
  "Retour aux catégories": "Back to categories",
  "Numéro de série": "Serial number",
  "Veuillez entrer le numéro de série de votre appareil pour un diagnostic précis.":
    "Please enter your unit serial number for an accurate diagnosis.",
  "Entrez le numéro de série": "Enter serial number",
  "Démarrer le diagnostic": "Start diagnosis",
  "Retour aux appareils": "Back to units",
  Diagnostic: "Diagnosis",
  Précédent: "Previous",
  Suivant: "Next",
  Terminer: "Finish",
  "Changer d'appareil": "Change unit",
  "Diagnostic terminé": "Diagnosis completed",
  "Ce guide vous a-t-il permis de résoudre le problème?":
    "Did this guide help you solve the issue?",
  "Oui, problème résolu !": "Yes, issue solved!",
  "Non, j'ai besoin d'aide": "No, I need help",
  "Merci pour votre retour ! Nous sommes ravis d'avoir pu vous aider.":
    "Thanks for your feedback. Glad we could help.",
  "Appareil :": "Unit:",
  "Numéro de série :": "Serial number:",
  "Formulaire de contact": "Contact form",
  Nom: "Name",
  Email: "Email",
  Appareil: "Unit",
  Message: "Message",
  "Ajouter un commentaire": "Add a comment",
  "Précisez votre demande ici...": "Please specify your request...",
  "Pièces jointes :": "Attachments:",
  "ajouter manuellement": "add manually",
  Envoyer: "Send",
  Annuler: "Cancel",
  "Se déconnecter": "Sign out",
  "Commander des consommables": "Order consumables",
  "Pour commander des filtres ou d'autres consommables, veuillez remplir ce formulaire.":
    "To order filters or other consumables, please fill in this form.",
  "Votre demande sera envoyée à notre service dédié.":
    "Your request will be sent to our dedicated team.",
  "Demande de consommables (Service commercial)":
    "Consumables request (Sales team)",
  "Appareil (Ex: DUSTOMAT 10)": "Unit (e.g. DUSTOMAT 10)",
  "Numéro de série (si connu)": "Serial number (if known)",
  "Consommable(s) demandé(s)": "Requested consumable(s)",
  "Envoyer la demande": "Send request",
  "Retour à l'accueil": "Back to home",
  "Saisie Manuelle d'Intervention (Mode SAV)": "Manual intervention entry (After-sales mode)",
  "Enregistrez un nouveau dossier ou mettez à jour les informations SAV.":
    "Create a new case or update after-sales information.",
  "Référence SAV (Ex: SAV1202)": "After-sales reference (e.g. SAV1202)",
  "Client / Numéro Client": "Client / Client ID",
  "Site / Localisation": "Site / Location",
  "Problème rencontré": "Issue observed",
  "Cause (Diagnostic)": "Cause (Diagnosis)",
  "Action SAV (Résolution)": "After-sales action (Resolution)",
  "Type SAV": "After-sales type",
  "SAV Technique": "Technical after-sales",
  "SAV Usure Normale": "Normal wear",
  "Défaut Fournisseur": "Supplier defect",
  "Casse Client": "Client damage",
  Autre: "Other",
  "Enregistrer l'Intervention": "Save intervention",
  "Intervention enregistrée (simulation)": "Intervention saved (simulation)",
  "Retour au Tableau de Bord": "Back to Dashboard",
  "Centre de pilotage simple et lisible.": "Simple and readable control center.",
  Statistiques: "Statistics",
  "Contrats de maintenance": "Maintenance contracts",
  Periode: "Period",
  "Toutes categories": "All categories",
  "Tous modeles": "All models",
  "Tous clients": "All clients",
  "Demandes totales": "Total requests",
  "Demandes en cours": "Open requests",
  "Demandes closes": "Closed requests",
  "Delai 1er contact": "First response time",
  "Delai resolution": "Resolution time",
  "Resolution auto": "Automatic resolution",
  "Taux de reouverture": "Reopen rate",
  Satisfaction: "Satisfaction",
  tickets: "tickets",
  "Repartition par statut": "Status breakdown",
  "En cours": "In progress",
  "Attente client": "Waiting on client",
  "Attente pieces": "Waiting on parts",
  Clos: "Closed",
  "Top 5 modeles": "Top 5 models",
  "Top 5 causes": "Top 5 causes",
  "Dernieres demandes": "Latest requests",
  "Aucune demande sur la periode.": "No requests for this period.",
  Date: "Date",
  Client: "Client",
  Statut: "Status",
  Gravite: "Severity",
  Resolution: "Resolution",
  Fermer: "Close",
  "Aucun historique disponible.": "No history available.",
  "Historique des visites": "Visit history",
  "Aucune visite enregistree.": "No visit recorded.",
  Frequence: "Frequency",
  Duree: "Duration",
  "Derniere visite": "Last visit",
  "Prochaine visite": "Next visit",
  Planification: "Planning",
  "A planifier": "To schedule",
  "Recherche (site, ville)": "Search (site, city)",
  "Exporter CSV": "Export CSV",
  "Aucun contrat ne correspond aux filtres.": "No contract matches filters.",
  "Calculateur de saturation du charbon actif":
    "Activated carbon saturation calculator",
  "Selectionne le polluant (ou melange), la reference, puis saisis le poids brut mesure.":
    "Select pollutant (or mixture), reference, then enter measured gross weight.",
  "Retour assistant": "Back to assistant",
  "Rapport (copie manuelle)": "Report (manual copy)",
  "Retenter copie": "Retry copy",
  "Si la copie automatique est bloquee, clique dans le champ (selectionne tout), puis Ctrl+C.":
    "If automatic copy is blocked, click the field (select all), then Ctrl+C.",
  "Reference filtre": "Filter reference",
  Mode: "Mode",
  "1 polluant": "1 pollutant",
  "Melange de polluants": "Pollutant mixture",
  "Recherche polluant": "Pollutant search",
  "Tous les groupes": "All groups",
  "Groupe 1": "Group 1",
  "Groupe 2": "Group 2",
  "Groupe 3": "Group 3",
  "Groupe 4": "Group 4",
  Polluant: "Pollutant",
  "Je ne sais pas (profil)": "I don't know (profile)",
  Appliquer: "Apply",
  Retirer: "Remove",
  "Ajouter un polluant": "Add pollutant",
  "Effacer les %": "Clear %",
  "Poids brut mesure (kg)": "Measured gross weight (kg)",
  "Saisie acceptee avec virgule ou point.": "Input accepts comma or dot.",
  "Humidite (%)": "Humidity (%)",
  "Temperature (C)": "Temperature (C)",
  Optionnel: "Optional",
  "Infos rapport (optionnel)": "Report info (optional)",
  "Nom du client": "Client name",
  "Site client": "Client site",
  Operateur: "Operator",
  "SN appareil": "Unit serial",
  "Date (YYYY-MM-DD)": "Date (YYYY-MM-DD)",
  "Ces champs sont inclus dans le rapport si renseignes.":
    "These fields are included in the report if provided.",
  "Gain (adsorption)": "Gain (adsorption)",
  "Capacite max (pour decision)": "Max capacity (for decision)",
  "Saturation (pour decision)": "Saturation (for decision)",
  "Details melange": "Mixture details",
  Estimation: "Estimate",
  Conservateur: "Conservative",
  "Points d'attention": "Warnings",
  "Copier rapport": "Copy report",
  "Copie OK": "Copy OK",
  "Copie bloquee - champ manuel affiche": "Copy blocked - manual field shown",
  Reinitialiser: "Reset",
  "A remplacer": "Replace",
  "A surveiller": "Monitor",
  Sature: "Saturated",
  "Erreur de calcul des statistiques.": "Statistics calculation error."
  ,
  "Etape": "Step",
  "Quel est le problème principal ?": "What is the main issue?",
  "L'appareil ne fait pas de froid": "The unit is not cooling",
  "L'appareil ne s'allume pas": "The unit does not power on",
  "Bruit anormal": "Abnormal noise",
  "J'ai un autre problème": "I have another issue",
  "Le ventilateur tourne mais l'air reste chaud ?":
    "Is the fan running but air still warm?",
  "Quel est l'etat du voyant COOL ?": "What is the COOL indicator status?",
  "COOL clignote": "COOL is blinking",
  "COOL fixe": "COOL is steady",
  "Voyez-vous de l'eau circuler dans les tuyaux transparents ?":
    "Do you see water flowing in transparent pipes?",
  "Non, pas du tout": "No, not at all",
  "Oui, mais tres faiblement": "Yes, but very weakly",
  "Oui, debit normal": "Yes, normal flow",
  "Controle du niveau d'eau": "Water level check",
  "Remplissez le reservoir puis relancez l'appareil. Verifiez aussi la vidange.":
    "Fill the tank then restart the unit. Also check the drain.",
  "Le reservoir est-il plein ?": "Is the tank full?",
  "Apres nettoyage des buses, le probleme persiste ?":
    "After nozzle cleaning, does the issue remain?",
  "Nettoyez les buses et verifiez l'ecrou du robinet de vidange.":
    "Clean nozzles and check the drain valve nut.",
  "La pompe tourne-t-elle correctement ?": "Is the pump running correctly?",
  "Controlez la pompe et l'alimentation hydraulique, puis testez a nouveau.":
    "Check the pump and hydraulic supply, then test again.",
  "Defaut pompe": "Pump fault",
  "Le protocole indique une panne probable de pompe.":
    "Protocol indicates a probable pump failure.",
  "Defaut pompe (Fresh)": "Pump fault (Fresh)",
  "Le modele Fresh indique une panne probable de pompe.":
    "Fresh model indicates a probable pump failure.",
  "Alimentation externe verifiee (prise/disjoncteur/cable) ?":
    "External power checked (plug/breaker/cable)?",
  "Verification alimentation": "Power supply check",
  "Verifiez la prise, le disjoncteur et le cable d'alimentation.":
    "Check plug, breaker and power cable.",
  "Defaut interne probable": "Probable internal fault",
  "L'appareil ne demarre pas malgre une alimentation conforme.":
    "Unit does not start despite valid power.",
  "Bruit anormal detecte": "Abnormal noise detected",
  "Le symptome impose un controle SAV.": "Symptom requires after-sales support.",
  "Assistance SAV": "After-sales support",
  "Le cas necessite une prise en charge par le SAV.":
    "Case requires after-sales handling.",
  "Quel symptome principal observez-vous ?": "Which main symptom do you observe?",
  "Faible aspiration / colmatage (A) allume":
    "Low suction / clogging indicator (A) on",
  "Ne s'allume pas": "Does not power on",
  "Avez-vous verifie prise, disjoncteur, interrupteur et fusible ?":
    "Did you check plug, breaker, switch and fuse?",
  "Controlez la chaine d'alimentation avant nouvel essai.":
    "Check the full power chain before retrying.",
  "Le systeme reste inactif apres verification d'alimentation.":
    "System remains inactive after power checks.",
  "Le filtre semble en fin de vie.": "Filter seems at end of life.",
  "Prise en charge SAV requise": "After-sales handling required",
  "Un controle technique est recommande.": "Technical support is recommended.",
  "Quel message apparait sur l'ePUR EX ?": "Which message appears on ePUR EX?",
  "Filtre plein 80% (jaune)": "Filter full 80% (yellow)",
  "Filtre plein 95/98% (rouge)": "Filter full 95/98% (red)",
  "Erreur capteur VOC/Particules": "VOC/Particles sensor error",
  "STOP Technique": "Technical STOP",
  "Aucun message": "No message",
  "Filtre a remplacer": "Filter to replace",
  "Le remplacement des consommables est recommande.":
    "Consumable replacement is recommended.",
  "Filtre a remplacer en urgence": "Filter replacement urgent",
  "Le seuil critique filtre est atteint.": "Critical filter threshold reached.",
  "Erreur capteur": "Sensor error",
  "Un diagnostic SAV est requis pour le capteur VOC/particules.":
    "After-sales diagnosis is required for VOC/particles sensor.",
  "Verification demarrage": "Startup verification",
  "L'appareil signale un arret technique.": "Unit reports a technical stop.",
  "Sans message erreur, quel symptome observez-vous ?":
    "Without an error message, which symptom do you observe?",
  "Avez-vous verifie l'alimentation, les fusibles F1/F2 et le capot ?":
    "Did you check power, F1/F2 fuses and cover?",
  "Controlez alimentation, fusibles et fermeture capot puis relancez.":
    "Check power, fuses and cover closure then restart.",
  "Le non-demarrage persiste apres controles.":
    "No-start issue persists after checks.",
  "Faible aspiration persistante": "Persistent low suction",
  "Le diagnostic impose une intervention SAV.": "Diagnosis requires after-sales intervention.",
  "Prise en charge Filtower": "Filtower direct handling",
  "Le Filtower est traite en prise en charge SAV directe.":
    "Filtower is handled by direct after-sales support.",
  "Modele depoussiereur complexe": "Complex dust collector model",
  "Ce modele est traite en prise en charge SAV directe.":
    "This model is handled by direct after-sales support.",
  "Faible aspiration": "Low suction",
  "Alarme filtre / pression diff haute": "Filter alarm / high differential pressure",
  "Ne demarre pas": "Does not start",
  "Bruit anormal depoussiereur": "Abnormal dust collector noise",
  "Collecteur et filtres visuellement conformes ?":
    "Collector and filters visually compliant?",
  "Controle collecteur/filtres": "Collector/filter check",
  "Videz le collecteur et verifiez l'etat des filtres.":
    "Empty collector and check filter condition.",
  "Deflecteur correctement positionne ?": "Deflector correctly positioned?",
  "Ajustement deflecteur": "Deflector adjustment",
  "Repositionnez le deflecteur puis retestez.":
    "Reposition deflector then retest.",
  "Le conduit est-il degage ?": "Is duct clear?",
  "Debouchage conduit": "Duct unclogging",
  "Supprimez tout blocage dans le reseau d'aspiration.":
    "Remove any blockage in suction network.",
  "La pression pneumatique est-elle entre 4 et 6 bar ?":
    "Is pneumatic pressure between 4 and 6 bar?",
  "Reglage pression": "Pressure adjustment",
  "Ajustez la pression de service puis relancez le cycle.":
    "Adjust service pressure then restart cycle.",
  "Filtre possiblement colmate": "Filter likely clogged",
  "Un controle SAV est necessaire.": "After-sales check is required.",
  "L'alarme persiste apres 5 minutes ?": "Does alarm persist after 5 minutes?",
  Decolmatage: "Cleaning cycle",
  "Lancez un cycle de decolmatage et recontrolez la pression.":
    "Run cleaning cycle and recheck pressure.",
  "Pression pneumatique conforme ?": "Pneumatic pressure compliant?",
  "Controle capteur/tuyaux": "Sensor/pipes check",
  "Recontrolez capteur et tuyaux; si le signal persiste, remplacez le filtre.":
    "Recheck sensor and pipes; if signal persists, replace filter.",
  "Probleme resolu": "Issue solved",
  "Le nettoyage des tuyaux capteur a resolu l'alarme.":
    "Sensor pipe cleaning resolved alarm.",
  "Alimentation et rearmement verifies ?": "Power and motor reset checked?",
  "Controlez l'alimentation et rearmez la protection moteur.":
    "Check power supply and reset motor protection.",
  "Defaut de demarrage": "Startup fault",
  "Un controle SAV est requis.": "After-sales support is required.",
  "Aspiration trop faible (mano rouge)": "Suction too low (red gauge)",
  "Le decolmatage a manivelle a-t-il ete fait ?":
    "Was manual cleaning by crank done?",
  "Decolmatage manuel": "Manual cleaning",
  "Effectuez un cycle complet de decolmatage manuel.":
    "Perform a full manual cleaning cycle.",
  "Le deflecteur est-il correctement positionne ?":
    "Is deflector correctly positioned?",
  "Repositionnez le deflecteur et testez a nouveau.":
    "Reposition deflector and test again.",
  "Conduit d'aspiration degage ?": "Suction duct clear?",
  "Nettoyage conduit": "Duct cleaning",
  "Eliminez l'obstruction dans le reseau d'aspiration.":
    "Remove obstruction in suction network.",
  "Protection moteur rearmable et alimentation verifiees ?":
    "Motor protection reset and power checked?",
  "Controlez les elements d'alimentation puis relancez l'appareil.":
    "Check power elements then restart the unit.",
  "Faible aspiration / signal pressostat": "Low suction / pressure switch signal",
  "Le nettoyage pneumatique a ete realise ?":
    "Has pneumatic cleaning been performed?",
  "Nettoyage pneumatique": "Pneumatic cleaning",
  "Effectuez un cycle complet de nettoyage pneumatique.":
    "Run a full pneumatic cleaning cycle.",
  "La pression de service est-elle correcte ?":
    "Is service pressure correct?",
  "Collecteur et conduit sont-ils conformes ?":
    "Are collector and duct compliant?",
  "Nettoyage reseau": "Network cleaning",
  "Nettoyez collecteur et circuit d'aspiration.":
    "Clean collector and suction circuit.",
  "Prise en charge table aspirante": "Downdraft table direct support",
  "Ce produit est traite en diagnostic SAV direct.":
    "This product is handled by direct after-sales diagnosis.",
  "Pièce consommable à commander": "Consumable part to order",
  "Le diagnostic indique un consommable en fin de vie. Ouvrez la demande de consommables.":
    "Diagnosis indicates an end-of-life consumable. Open consumables request.",
  "Prise en charge SAV recommandée": "After-sales support recommended",
  "Le diagnostic nécessite un contrôle technique. Contactez le SAV pour la suite.":
    "Diagnosis requires technical check. Contact after-sales for next steps.",
  "Protocole pompe et contact SAV": "Pump protocol and after-sales contact",
  "Le diagnostic indique un défaut probable de pompe. Un dossier SAV doit être ouvert.":
    "Diagnosis indicates probable pump defect. An after-sales case must be opened.",
  "Le guide n'indique pas de défaut critique.": "Guide does not indicate a critical fault.",
  "Poids brut mesuré invalide : utilisez un nombre (virgule ou point).":
    "Invalid measured gross weight: use a number (comma or dot).",
  "Humidité invalide : utilisez un nombre.": "Invalid humidity: use a number.",
  "Humidité hors plage 0-100% : vérifiez la saisie.":
    "Humidity out of 0-100% range: check input.",
  "Température invalide : utilisez un nombre.": "Invalid temperature: use a number.",
  "Humidite > 70% : adsorption potentiellement degradee.":
    "Humidity > 70%: adsorption may be degraded.",
  "Temperature > 60C : adsorption potentiellement degradee.":
    "Temperature > 60C: adsorption may be degraded.",
  "Poids mesure inferieur au poids neuf : verifier la saisie ou l'etat du filtre.":
    "Measured weight lower than new weight: check input or filter condition.",
  "Saturation > 250% : possible erreur de saisie (kg/g) ou mesure.":
    "Saturation > 250%: possible input (kg/g) or measurement error.",
  "Polluant groupe 4 : adsorption nulle ou quasi nulle (calcul % peu pertinent).":
    "Group 4 pollutant: zero or near-zero adsorption (percent calculation less relevant).",
  "Ce polluant existe dans plusieurs groupes dans la doc. Verifier le type de charbon (standard vs impregne/traite).":
    "This pollutant appears in multiple groups in docs. Check carbon type (standard vs impregnated/treated).",
  "Melange contient un polluant groupe 4 : la decision est basee sur un calcul conservateur. Si ce polluant domine, le charbon standard peut etre inefficace.":
    "Mixture contains a group 4 pollutant: decision is based on conservative calculation. If dominant, standard carbon may be ineffective.",
  "Une ou plusieurs proportions melange (%) sont invalides.":
    "One or more mixture proportions (%) are invalid.",
  "Les proportions melange hors plage 0-100% sont limitees automatiquement.":
    "Mixture proportions outside 0-100% are automatically clamped.",
  "Proportions melange non renseignees : estimation a parts egales + decision conservatrice (pire cas).":
    "Mixture proportions not provided: equal-part estimate + conservative decision (worst case)."
};

const FR_TO_EN_REPLACEMENTS: Array<[string, string]> = [
  ["Numéro de série", "Serial number"],
  ["Numéro Client", "Client ID"],
  ["Retour à l'accueil", "Back to home"],
  ["Retour aux catégories", "Back to categories"],
  ["Retour aux appareils", "Back to units"],
  ["Retour assistant", "Back to assistant"],
  ["Retour Portail", "Back to Portal"],
  ["Retour au Tableau de Bord", "Back to Dashboard"],
  ["Retour à l'accueil", "Back to home"],
  ["Demande SAV", "After-sales request"],
  ["consommables", "consumables"],
  ["Appareil", "Unit"],
  ["Problème", "Issue"],
  ["Résolution", "Resolution"],
  ["SAV", "After-sales"],
  ["Pièce", "Part"],
  ["Pièces", "Parts"],
  ["Diagnostiquez", "Diagnose"],
  ["Diagnostic", "Diagnosis"],
  ["Filtres", "Filters"],
  ["filtre", "filter"],
  ["Fichier", "File"],
  ["contact", "contact"],
  ["température", "temperature"],
  ["Humidité", "Humidity"],
  ["Oui", "Yes"],
  ["Non", "No"],
  ["Autre", "Other"],
  ["Aucune", "No"],
  ["Aucun", "No"],
  ["Bientôt disponible", "Coming soon"]
];

const textNodeOriginals = new WeakMap<Text, string>();
const attrOriginals = new WeakMap<Element, Map<string, string>>();

function normalizeInput(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toEnglish(input: string): string {
  const trimmed = normalizeInput(input);
  if (!trimmed) return input;

  if (Object.prototype.hasOwnProperty.call(EXACT_TEXT_EN, trimmed)) {
    const translated = EXACT_TEXT_EN[trimmed];
    if (input === trimmed) return translated;
    return input.replace(trimmed, translated);
  }

  let out = input;
  FR_TO_EN_REPLACEMENTS.forEach(([from, to]) => {
    if (out.includes(from)) out = out.split(from).join(to);
  });
  return out;
}

function shouldSkipNode(node: Node): boolean {
  const parent = node.parentElement;
  if (!parent) return true;
  if (parent.closest("[data-no-i18n='true']")) return true;
  const tag = parent.tagName;
  return tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT";
}

function transformTextNode(node: Text, lang: AppLanguage): void {
  if (shouldSkipNode(node)) return;
  const raw = textNodeOriginals.has(node) ? textNodeOriginals.get(node)! : node.nodeValue ?? "";
  if (!textNodeOriginals.has(node)) textNodeOriginals.set(node, raw);
  const next = lang === "en" ? toEnglish(raw) : raw;
  if (node.nodeValue !== next) node.nodeValue = next;
}

function transformAttributes(el: Element, lang: AppLanguage): void {
  if (el.closest("[data-no-i18n='true']")) return;
  const attrs = ["placeholder", "title", "aria-label"];
  const originals = attrOriginals.get(el) ?? new Map<string, string>();
  attrs.forEach((attr) => {
    const current = el.getAttribute(attr);
    if (current === null) return;
    if (!originals.has(attr)) originals.set(attr, current);
    const raw = originals.get(attr)!;
    const next = lang === "en" ? toEnglish(raw) : raw;
    if (current !== next) el.setAttribute(attr, next);
  });

  if (el instanceof HTMLInputElement) {
    const isLabelButton =
      el.type === "submit" || el.type === "button" || el.type === "reset";
    if (isLabelButton) {
      if (!originals.has("value")) originals.set("value", el.value);
      const raw = originals.get("value") ?? el.value;
      const next = lang === "en" ? toEnglish(raw) : raw;
      if (el.value !== next) el.value = next;
    }
  }

  if (!attrOriginals.has(el)) attrOriginals.set(el, originals);
}

function transformTree(root: Node, lang: AppLanguage): void {
  if (root instanceof Text) {
    transformTextNode(root, lang);
    return;
  }

  if (!(root instanceof Element || root instanceof Document || root instanceof DocumentFragment)) {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL);
  let current: Node | null = walker.currentNode;
  while (current) {
    if (current instanceof Text) {
      transformTextNode(current, lang);
    } else if (current instanceof Element) {
      transformAttributes(current, lang);
    }
    current = walker.nextNode();
  }
}

export function getCurrentLanguage(): AppLanguage {
  return currentLanguage;
}

export function translateInline(text: string): string {
  return currentLanguage === "en" ? toEnglish(text) : text;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    if (typeof window === "undefined") return "fr";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "en" ? "en" : "fr";
  });

  useEffect(() => {
    currentLanguage = language;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, language);
      document.documentElement.lang = language;
    }
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: (next) => setLanguageState(next)
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return ctx;
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="language-switcher" data-no-i18n="true">
      <button
        type="button"
        className={`language-chip ${language === "fr" ? "is-active" : ""}`}
        onClick={() => setLanguage("fr")}
      >
        FR
      </button>
      <button
        type="button"
        className={`language-chip ${language === "en" ? "is-active" : ""}`}
        onClick={() => setLanguage("en")}
      >
        EN
      </button>
    </div>
  );
}

export function RuntimeTextTranslator() {
  const { language } = useLanguage();

  useEffect(() => {
    transformTree(document.body, language);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData" && mutation.target instanceof Text) {
          transformTextNode(mutation.target, language);
        }
        mutation.addedNodes.forEach((node) => {
          transformTree(node, language);
        });
        if (
          mutation.type === "attributes" &&
          mutation.target instanceof Element
        ) {
          transformAttributes(mutation.target, language);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label", "value"]
    });

    return () => observer.disconnect();
  }, [language]);

  return null;
}
