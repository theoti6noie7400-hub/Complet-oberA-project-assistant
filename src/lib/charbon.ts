import { getCurrentLanguage } from "../i18n/language";

export const FILTER_REFERENCES = {
  EPUREX_1000: {
    id: "EPUREX_1000",
    label: "CHARBON EPUREX 1000",
    poidsNeufBrutKg: 7.1,
    poidsCharbonNetKg: 5.8,
    image: "/products/epurex1000.jpg"
  },
  EPUREX_MIXTE_HEPA_CH: {
    id: "EPUREX_MIXTE_HEPA_CH",
    label: "CHARBON EPUREX 1000 MIXTE",
    poidsNeufBrutKg: 7.3,
    poidsCharbonNetKg: 3.0,
    image: "/products/epurex1000-mixte.jpg"
  },
  EPUREX_5000_CHARBON: {
    id: "EPUREX_5000_CHARBON",
    label: "CHARBON EPUREX 5000",
    poidsNeufBrutKg: 18.7,
    poidsCharbonNetKg: 12.0,
    image: "/products/epurex5000.jpg"
  },
  CAN_1500: {
    id: "CAN_1500",
    label: "CAN 1500",
    poidsNeufBrutKg: 2.0,
    poidsCharbonNetKg: 1.2,
    image: "/products/can1500.jpg"
  },
  PURPLE_1500: {
    id: "PURPLE_1500",
    label: "CAN 1500 PURPLE",
    poidsNeufBrutKg: 3.0,
    poidsCharbonNetKg: 2.2,
    image: "/products/can1500-purple.jpg"
  },
  CAN_2600: {
    id: "CAN_2600",
    label: "CAN 2600",
    poidsNeufBrutKg: 3.5,
    poidsCharbonNetKg: 2.1,
    image: "/products/can2600.jpg"
  },
  PURPLE_2600: {
    id: "PURPLE_2600",
    label: "CAN 2600 PURPLE",
    poidsNeufBrutKg: 5.3,
    poidsCharbonNetKg: 3.9,
    image: "/products/can2600-purple.jpg"
  },
  CAN_9000: {
    id: "CAN_9000",
    label: "CAN 9000",
    poidsNeufBrutKg: 4.2,
    poidsCharbonNetKg: 2.4,
    image: "/products/can9000.jpg"
  },
  PURPLE_9000: {
    id: "PURPLE_9000",
    label: "CAN 9000 PURPLE",
    poidsNeufBrutKg: 7.0,
    poidsCharbonNetKg: 5.2,
    image: "/products/can9000-purple.jpg"
  }
} as const;

export type FilterRef = (typeof FILTER_REFERENCES)[keyof typeof FILTER_REFERENCES];

export const GROUPS = {
  "1": { label: "Groupe 1 - Tres haute adsorption", avg: 0.35 },
  "2": { label: "Groupe 2 - Forte adsorption", avg: 0.17 },
  "3": { label: "Groupe 3 - Faible adsorption", avg: 0.07 },
  "4": { label: "Groupe 4 - Mauvaise adsorption", avg: 0.0 }
} as const;

export type GroupKey = keyof typeof GROUPS;

export type Polluant = {
  id: string;
  label: string;
  name: string;
  formula?: string;
  group: GroupKey;
};

function slugifyId(s: string): string {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\*/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

export function parsePolluantLabel(raw: string): {
  name: string;
  formula?: string;
  label: string;
} {
  const cleaned = raw.trim();
  if (!cleaned) return { name: "", label: "" };

  const parts = cleaned.split(/\s*\(([^()]*)\)\s*/g).filter((x) => x !== "");

  let base = parts[0]?.trim() ?? cleaned;
  const parens: string[] = [];

  for (let i = 1; i < parts.length; i += 2) {
    parens.push((parts[i] ?? "").trim());
    const tail = (parts[i + 1] ?? "").trim();
    if (tail) base = `${base} ${tail}`.trim();
  }

  const last = parens.length ? parens[parens.length - 1] : undefined;
  const looksLikeFormula = (s?: string) => {
    if (!s) return false;
    return /^[A-Za-z0-9]+$/.test(s) && /[A-Za-z]/.test(s);
  };

  const formula = looksLikeFormula(last) ? last : undefined;
  const nameExtra = formula ? parens.slice(0, -1) : parens;
  const name = nameExtra.length
    ? `${base} (${nameExtra.join(") (")})`.trim()
    : base;
  const label = formula ? `${name} (${formula})` : name;

  return { name, formula, label };
}

export const POLLUANTS_G1_RAW: string[] = [
  "Acetaldehyde (C2H4O)",
  "Acetonenitrile (C3H3NO)",
  "Acetylene (C2H2)",
  "Acetone (C3H6O)",
  "Acrolein (C3H4O)",
  "Alcohol",
  "Amines",
  "Ammonia (NH3)",
  "Anaesthetics",
  "Arsine",
  "Bromhydric acid",
  "Acetic acid (vinegar) (C2H4O2)",
  "Acetic anhydride (C4H6O3)",
  "Acrylic acid (acrylate) (C3H4O2)",
  "Acrylonitrile (vinylcyanide) (C3H3N)",
  "Adhesives",
  "Aldrin",
  "Allyl chloride (C3H5Cl)",
  "Aminotoluene",
  "Amyl acetate (isomers) (C7H14O2)",
  "Amyl alcohol (pentanol) (C5H12O)",
  "Amyl ether (C10H22O)",
  "Anniline",
  "Antiseptics",
  "Asphalt fumes",
  "Benzaldehyde",
  "Benzene (C6H6)",
  "Benzine",
  "Benzol",
  "Benzyl alcohol",
  "Benzyl chloride",
  "Bromine (Br2)",
  "Bromofluoromethane",
  "Bromoform",
  "Butaanzuur (Boterzuur)",
  "Butanone (MEK) (C4H8O)",
  "Butyl acetate (C6H12O2)",
  "Butyl alcohol (butanol) (C4H10O)",
  "Butyl cellosolve (C6H14O2)",
  "Butyl chloride (C14H9Cl)",
  "Butyl ether (C818O)",
  "Butyl glycol",
  "Butyl mercaptan",
  "Butyraldehyde (C4H8O)",
  "Butryic acid (C4H8O2)",
  "Camphor (C10H16O)",
  "Caproaldehyde",
  "Caprylic acid (C8H16O2)",
  "Carbolic acid (phenol) (C6H6O)",
  "Carbon disulfide (CS2)",
  "Carbon tetrachloride (CCl4)",
  "Cellosolve",
  "Cellosolve acetate (C6H12O)",
  "Chlorobenzene (phenylchloride) (Cl2)",
  "Chlorobutadiene (chloroprene) (C6H5Cl)",
  "Chloroform (trichloromethane) (CHCl3)",
  "Chloronitropropane (C3H6ClNO2)",
  "Chlorpicrine (CCl3NO2)",
  "Cigarette odor",
  "Citrus fruits",
  "Cleaning compounds",
  "Cooking odors",
  "Creosote",
  "Cresol (C21H24O3)",
  "Crotonaldehyde",
  "Cumene",
  "Cyclohexane (C6H12)",
  "Cyclohexanol (C6H12O)",
  "Cyclohexanone (C6H10O)",
  "Cyclohexene (C6H10)",
  "Cyclopentadiene",
  "Decane of higher hydrocarbons (C10H22)",
  "Degreasing Solvents",
  "Dichloro ethyl ether (C4H8Cl2O)",
  "Dichlorobenzene (C6H4Cl2)",
  "Dichloro-difloro-ethane",
  "Dichloro-difluoro-methane (CCl2F2)",
  "Dichloroethane (C2H4Cl2)",
  "Dichloroethylene (C2H2Cl2)",
  "Dichloronitroethane (C2H3Cl2NO2)",
  "Dichloroproane (C3H6Cl2)",
  "Dichlorotetrafluoro-ethane (C2ClF4)",
  "Diesel fumes",
  "Diethyl aceton",
  "Diethyl aniline",
  "Diethyl disulfide",
  "Dimethyl aniline (C8H11N)",
  "Dimethyl disulfide",
  "Dimethyl formamide",
  "Dimethyl sulfate (C2H6O4S)",
  "Fish/food/fruit odors",
  "Furfural",
  "Gasoline",
  "Glycerol",
  "Glyceryl triacetate",
  "Glycol",
  "Glycol chlorohydrine",
  "Heptane (C7H16)",
  "Heptylene (C7H14)",
  "Hexanol (C6H14O)",
  "Hexamethylene diisocyanate",
  "Hexanone (MIBK) (C6H12O)",
  "Hexyne",
  "Hospital odors",
  "Human odors",
  "Kerosine",
  "Kerosene",
  "Kitchen odors",
  "Lactic acid (C3H6O3)",
  "Leather",
  "Lubricating oils & greases",
  "Lysol",
  "Menthol (C10H20O)",
  "Mercaptans (large molecules) (C2H6S)",
  "N-amyl ether",
  "N-butanol",
  "N-propanol",
  "Naphta(lene) (C10H8)",
  "Naphtalene diisocyanate",
  "Nicotine (C10H14N2)",
  "Nitrobenzene (C6H5NO2)",
  "Nitroethane (C2H5NO2)",
  "Nitropropane (C3H7NO2)",
  "Nitrotoluene (C7H7NO2)",
  "Nonanes",
  "O-dichlorbenzene",
  "Octane (C8H18)",
  "Octene (C8H16)",
  "Oil fumes",
  "Ozone (O3)",
  "P-phenylene diamine",
  "Palamatic",
  "Palamatic acid (C16H32O2)",
  "Pyridine",
  "Rancid oils and fats",
  "Resins",
  "Rubber",
  "Silicon tetrachloride",
  "Stale odors",
  "Stable odors",
  "Styrene",
  "Stryene monomer (C8H8)",
  "Sulfuric anhydride",
  "Sulfurous compounds",
  "Tar fumes",
  "Tetrachloroethane (C2H2Cl4)",
  "Tetrachloroethene",
  "Tetrachloroethylene perchloroethylene (C2Cl4)",
  "Tetrahydrothiphene",
  "Tetrahydrofuran (C4H8O)",
  "Thiophene (C4H4S)",
  "Toilet odors",
  "Tolud",
  "Toluene (C7H8)",
  "Toluene diisocyanate (C9H6N2O)",
  "Toluidine",
  "Trichloroethane (C2H3Cl3)",
  "Trichloroethylene (C2HCl3)",
  "Triethanolamine",
  "Trimethylbenzeneallinsomers",
  "Trimethylphosphite",
  "Thrimethylhexamethylene diisocyanate",
  "Turpentine",
  "Undecane",
  "Urea (CH4N2O)",
  "Uric acid (C5H4N4O3)",
  "Valeric acid (C5H10O2)",
  "Valeric aldehyde (C5H10O)",
  "Varnish odors",
  "Ventilation systems",
  "Vinegar (acetic acid)"
];

export const POLLUANTS_G2_RAW: string[] = [
  "Acetone (C3H6O)",
  "Acrolein (C3H4O)",
  "Arsine",
  "Blood odor",
  "Butadiene (C4H6)",
  "Butanal",
  "Carbon bisulphide",
  "Chlorine (Cl2)",
  "Chloromethane (methylchloride) (CH3Cl)",
  "Combustion odors",
  "Cyanides incl. Hydrogen Cyanide",
  "Deodorizers",
  "Ethyl alcohol (C2H6O)",
  "Ethyl amine",
  "Ethyl ether",
  "Ethyl formate (C3H6O2)",
  "Formaldehyde",
  "Forrmic acid (CH2O2)",
  "I-valeric acid",
  "Isobutaan",
  "Isoprene",
  "Isopropanol",
  "Methanal",
  "Methyl acetate (C3H6O2)",
  "Methyl bromide (CH3Br)",
  "Methyl chloride (CH3Cl)",
  "Methyl cyanide",
  "Methyl formate (C4H4O2)",
  "Methylal",
  "Nitromethane (CH3NO2)",
  "Pentane (C5H12)",
  "Pentene (C5H10)",
  "Pentyne (C5H8)",
  "Phosgene (CCl2O)",
  "Products of incomplete combustions",
  "Propanal",
  "Propionaldehyde",
  "Propionic acid (C3H6O2)",
  "Propionic aldehyde",
  "Propyl aldehyde (C3H6O)",
  "Propylene",
  "Sewer odors",
  "Slaughter odors",
  "Sludge odor",
  "Solvents",
  "Sulfur dichloride",
  "Toxic gases",
  "Valeric"
];

export const POLLUANTS_G3_RAW: string[] = [
  "Acetaldehyde (C2H4O)",
  "Acetonenitrile (C3H3NO)",
  "Acetylene (C2H2)",
  "Alcohol",
  "Amines",
  "Bromhydric acid",
  "Butane (C4H10)",
  "Butene",
  "Butylene/butane (C4H8)",
  "Butyne",
  "Carbon dioxide (CO2)",
  "Carbonyl sulfide",
  "Corrosive gases",
  "Ethylene oxide (C2H4O)",
  "Fluortrichlormethane",
  "Hydrogen fluoride (FH)",
  "Hydrogen selenide (H2Se)",
  "Hydrogen sulfide (H2S)",
  "Methanol",
  "Methyl mercaptan (C6H12O)",
  "Sulfur dioxide (SO2)",
  "Sulfur gas",
  "Sulfur trioxide (SO3)",
  "Sulfuric acid (H2SO4)",
  "Tabacco smoke",
  "Trimethylanime",
  "Trifluorobromomethane"
];

export const POLLUANTS_G4_RAW: string[] = [
  "Ammonia (NH3)",
  "Carbon monoxide (CO)",
  "Carbonic acid",
  "Ethane (C2H6)",
  "Ethylene (C2H4)",
  "Hydrogen (H2)",
  "Hydrogen cyanide (HCN)",
  "Mercury fumes (Hg)",
  "Methane (CH4)",
  "Octylene"
];

export function buildPolluants(raw: string[], group: GroupKey): Polluant[] {
  return raw
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const { name, formula, label } = parsePolluantLabel(r);
      const id = `${slugifyId(label)}__g${group}`;
      return { id, label, name, formula, group };
    });
}

export const POLLUANTS: Polluant[] = [
  ...buildPolluants(POLLUANTS_G1_RAW, "1"),
  ...buildPolluants(POLLUANTS_G2_RAW, "2"),
  ...buildPolluants(POLLUANTS_G3_RAW, "3"),
  ...buildPolluants(POLLUANTS_G4_RAW, "4")
].sort((a, b) =>
  a.group === b.group
    ? a.label.localeCompare(b.label, "en", { sensitivity: "base" })
    : Number(a.group) - Number(b.group)
);

export const DUPLICATE_NAMES = (() => {
  const counts = new Map<string, number>();
  for (const p of POLLUANTS) {
    counts.set(p.name, (counts.get(p.name) ?? 0) + 1);
  }
  return new Set<string>(
    [...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n)
  );
})();

export function displayPolluant(p: Polluant): string {
  if (!DUPLICATE_NAMES.has(p.name)) return p.label;
  return `${p.label} — ${GROUPS[p.group].label}`;
}

(function selfTest() {
  console.assert(POLLUANTS.length > 50, "Expected many polluants to be loaded.");
  console.assert(POLLUANTS.some((x) => x.id.endsWith("__g1")), "Expected group 1 ids.");
  console.assert(POLLUANTS.some((x) => x.id.endsWith("__g2")), "Expected group 2 ids.");
  console.assert(POLLUANTS.some((x) => x.id.endsWith("__g3")), "Expected group 3 ids.");
  console.assert(POLLUANTS.some((x) => x.id.endsWith("__g4")), "Expected group 4 ids.");

  const p2 = parsePolluantLabel("Acetic acid (vinegar) (C2H4O2)");
  console.assert(p2.formula === "C2H4O2", "Expected last parentheses as formula.");

  const nh3 = POLLUANTS.filter(
    (p) => p.label.includes("Ammonia") && (p.formula ?? "").includes("NH3")
  );
  console.assert(
    nh3.length >= 2,
    "Expected NH3 to appear at least twice (different groups)."
  );

  const g1 = POLLUANTS.filter((p) => p.group === "1").map((p) => p.label);
  for (let i = 1; i < g1.length; i += 1) {
    console.assert(
      g1[i - 1].localeCompare(g1[i], "en", { sensitivity: "base" }) <= 0,
      "Group 1 should be sorted."
    );
  }

  const refs = Object.values(FILTER_REFERENCES);
  console.assert(refs.length >= 6, "Expected filter references.");
})();

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function formatKg(x: number): string {
  if (!Number.isFinite(x)) return "-";
  return `${x.toFixed(2)} kg`;
}

export function formatPct(x: number): string {
  if (!Number.isFinite(x)) return "-";
  return `${x.toFixed(0)} %`;
}

export function parseNumberLoose(s: string): number {
  const v = Number(String(s ?? "").trim().replace(",", "."));
  return Number.isFinite(v) ? v : NaN;
}

export type SaturationResult = {
  capaciteMaxKg: number;
  saturationPct: number;
  avgUsed: number;
};

export function calcMonoSaturation(
  gainKg: number,
  charbonNetKg: number,
  groupAvg: number
): SaturationResult {
  const capaciteMaxKg = charbonNetKg * groupAvg;
  const saturationPct =
    Number.isFinite(gainKg) &&
    Number.isFinite(capaciteMaxKg) &&
    capaciteMaxKg > 0
      ? (gainKg / capaciteMaxKg) * 100
      : NaN;
  return { capaciteMaxKg, saturationPct, avgUsed: groupAvg };
}

export function calcMixSaturation(
  gainKg: number,
  charbonNetKg: number,
  items: { avg: number; share01?: number }[]
): { estimated: SaturationResult; conservative: SaturationResult } {
  const valid = items.filter((x) => Number.isFinite(x.avg) && x.avg >= 0);
  const nonZero = valid.filter((x) => x.avg > 0);

  let worstPct = NaN;
  let worstAvg = NaN;
  for (const x of nonZero) {
    const r = calcMonoSaturation(gainKg, charbonNetKg, x.avg);
    if (!Number.isFinite(r.saturationPct)) continue;
    if (!Number.isFinite(worstPct) || r.saturationPct > worstPct) {
      worstPct = r.saturationPct;
      worstAvg = x.avg;
    }
  }
  const conservative: SaturationResult = {
    capaciteMaxKg: Number.isFinite(worstAvg) ? charbonNetKg * worstAvg : NaN,
    saturationPct: worstPct,
    avgUsed: worstAvg
  };

  const shares = valid.map((x) =>
    Number.isFinite(x.share01 ?? NaN) ? (x.share01 as number) : NaN
  );
  const sumShares = shares.reduce(
    (acc, v) => (Number.isFinite(v) ? acc + v : acc),
    0
  );

  let avgMix = NaN;
  if (valid.length === 0) {
    avgMix = NaN;
  } else if (sumShares > 0) {
    avgMix = valid.reduce((acc, x, i) => {
      const w = Number.isFinite(shares[i]) ? (shares[i] as number) / sumShares : 0;
      return acc + w * x.avg;
    }, 0);
  } else {
    const w = 1 / valid.length;
    avgMix = valid.reduce((acc, x) => acc + w * x.avg, 0);
  }

  const estimated = calcMonoSaturation(gainKg, charbonNetKg, avgMix);
  return { estimated, conservative };
}

(function mixMathTests() {
  const gainKg = 1;
  const charbon = 10;
  const a = 0.35;
  const b = 0.07;
  const r = calcMixSaturation(gainKg, charbon, [
    { avg: a, share01: 0.5 },
    { avg: b, share01: 0.5 }
  ]);
  console.assert(Math.abs(r.estimated.avgUsed - 0.21) < 1e-9, "Mix avg should be weighted.");
  console.assert(Math.abs(r.estimated.capaciteMaxKg - 2.1) < 1e-9, "Mix capacity should match.");
  console.assert(
    Number.isFinite(r.conservative.saturationPct) && Number.isFinite(r.estimated.saturationPct)
      ? r.conservative.saturationPct >= r.estimated.saturationPct
      : true,
    "Conservative should be >= estimated."
  );

  const r2 = calcMixSaturation(1, 10, [{ avg: 0 }, { avg: 0 }]);
  console.assert(
    !Number.isFinite(r2.conservative.saturationPct),
    "Conservative should be NaN when no adsorption."
  );
})();

export function statusFromSaturation(satPct: number) {
  const en = getCurrentLanguage() === "en";
  if (!Number.isFinite(satPct)) {
    return { label: "-", tone: "secondary" as const, icon: "help" as const };
  }
  if (satPct >= 100) {
    return {
      label: en ? "Saturated" : "Sature",
      tone: "destructive" as const,
      icon: "alert" as const
    };
  }
  if (satPct >= 75) {
    return {
      label: en ? "Replace" : "A remplacer",
      tone: "destructive" as const,
      icon: "alert" as const
    };
  }
  if (satPct >= 70) {
    return {
      label: en ? "Monitor" : "A surveiller",
      tone: "outline" as const,
      icon: "alert" as const
    };
  }
  return { label: "OK", tone: "default" as const, icon: "check" as const };
}

export type ModePolluant = "mono" | "melange";

export type MixItem = {
  polluantId: string;
  sharePct: string;
};

export type MixPreset = {
  id: string;
  label: string;
  groups: GroupKey[];
  note: string;
};

export const MIX_PRESETS: MixPreset[] = [
  {
    id: "solvants_peinture",
    label: "Solvants / peinture / vernis",
    groups: ["1", "1", "2", "2", "2"],
    note: "Profil oriente solvants et VOC (forte charge)."
  },
  {
    id: "colles_resines",
    label: "Colles / resines",
    groups: ["1", "1", "1", "2"],
    note: "Tres haute adsorption attendue (odeurs fortes)."
  },
  {
    id: "diesel_essence",
    label: "Diesel / essence / carburants",
    groups: ["1", "1", "2"],
    note: "Hydrocarbures + odeurs carburant."
  },
  {
    id: "fumee_combustion",
    label: "Fumee / combustion",
    groups: ["2", "2", "3"],
    note: "Produits de combustion, odeurs persistantes."
  },
  {
    id: "cuisine_odeurs",
    label: "Cuisine / graisses / odeurs alimentaires",
    groups: ["1", "1", "2"],
    note: "Odeurs organiques souvent bien adsorbees."
  },
  {
    id: "tabac",
    label: "Tabac",
    groups: ["1", "2", "3"],
    note: "Melange d'odeurs et composes divers."
  },
  {
    id: "hopital",
    label: "Milieu hospitalier",
    groups: ["1", "2"],
    note: "Odeurs complexes (desinfectants, solvants)."
  },
  {
    id: "atelier_general",
    label: "Atelier / industrie (general)",
    groups: ["1", "2", "2", "3"],
    note: "Profil polyvalent si la source exacte est inconnue."
  },
  {
    id: "gaz_difficiles",
    label: "Gaz difficiles (ex: NH3 / H2S)",
    groups: ["4", "3"],
    note: "Attention: charbon standard parfois inefficace. Utiliser un media adapte."
  }
];

export function pickRepresentativePolluantsForGroups(
  groups: GroupKey[],
  pool: Polluant[]
): Polluant[] {
  const byGroup: Record<GroupKey, Polluant[]> = {
    "1": pool.filter((p) => p.group === "1"),
    "2": pool.filter((p) => p.group === "2"),
    "3": pool.filter((p) => p.group === "3"),
    "4": pool.filter((p) => p.group === "4")
  };

  const idx: Record<GroupKey, number> = { "1": 0, "2": 0, "3": 0, "4": 0 };
  const out: Polluant[] = [];

  for (const g of groups) {
    const list = byGroup[g];
    if (list.length === 0) continue;
    const i = idx[g] % list.length;
    out.push(list[i]);
    idx[g] += 1;
  }

  const seen = new Set<string>();
  return out.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export function buildReportText(args: {
  dateIso: string;
  dateClient?: string;
  clientName?: string;
  clientSite?: string;
  operatorName?: string;
  deviceSerial?: string;
  mode: ModePolluant;
  reference: FilterRef;
  polluants: Polluant[];
  shares: (string | undefined)[];
  poidsMesureKg: number;
  gainKg: number;
  charbonNetKg: number;
  supportKg: number;
  resultDecision: { capaciteMaxKg: number; saturationPct: number };
  resultEstimated?: { capaciteMaxKg: number; saturationPct: number; avgUsed: number };
  resultConservative?: { capaciteMaxKg: number; saturationPct: number; avgUsed: number };
  humidite?: number;
  temperature?: number;
}): string {
  const en = getCurrentLanguage() === "en";
  const lines: string[] = [];
  lines.push(en ? "REPORT - Activated carbon saturation" : "RAPPORT - Saturation charbon actif");

  const dateLine = args.dateClient && args.dateClient.trim() ? args.dateClient.trim() : args.dateIso;
  lines.push(`${en ? "Date" : "Date"}: ${dateLine}`);
  if (args.clientName && args.clientName.trim())
    lines.push(`${en ? "Client" : "Client"}: ${args.clientName.trim()}`);
  if (args.clientSite && args.clientSite.trim())
    lines.push(`${en ? "Client site" : "Site client"}: ${args.clientSite.trim()}`);
  if (args.operatorName && args.operatorName.trim())
    lines.push(`${en ? "Operator" : "Operateur"}: ${args.operatorName.trim()}`);
  if (args.deviceSerial && args.deviceSerial.trim())
    lines.push(`${en ? "Unit serial" : "SN appareil"}: ${args.deviceSerial.trim()}`);

  lines.push("---");
  lines.push(`${en ? "Reference" : "Reference"}: ${args.reference.label}`);
  lines.push(
    `${en ? "New gross weight" : "Poids neuf brut"}: ${args.reference.poidsNeufBrutKg.toFixed(2)} kg`
  );
  lines.push(
    `${en ? "Net carbon (new)" : "Charbon net (neuf)"}: ${args.charbonNetKg.toFixed(2)} kg`
  );
  lines.push(`${en ? "Support (estimated)" : "Support (estime)"}: ${args.supportKg.toFixed(2)} kg`);
  lines.push(
    `${en ? "Measured gross weight" : "Poids brut mesure"}: ${
      Number.isFinite(args.poidsMesureKg) ? args.poidsMesureKg.toFixed(2) : "-"
    } kg`
  );
  lines.push(
    `${en ? "Gain (adsorption)" : "Gain (adsorption)"}: ${
      Number.isFinite(args.gainKg) ? args.gainKg.toFixed(2) : "-"
    } kg`
  );
  if (Number.isFinite(args.humidite ?? NaN))
    lines.push(`${en ? "Humidity" : "Humidite"}: ${(args.humidite as number).toFixed(0)} %`);
  if (Number.isFinite(args.temperature ?? NaN))
    lines.push(`${en ? "Temperature" : "Temperature"}: ${(args.temperature as number).toFixed(0)} C`);

  lines.push("---");
  lines.push(`Mode: ${args.mode === "mono" ? (en ? "1 pollutant" : "1 polluant") : en ? "Mixture" : "Melange"}`);

  args.polluants.forEach((p, i) => {
    const share = args.shares[i];
    const shareTxt = share && share.trim() ? ` (${share.trim()}%)` : "";
    lines.push(`- ${displayPolluant(p)}${shareTxt}`);
  });

  lines.push("---");
  lines.push(en ? "RESULT (decision)" : "RESULTAT (decision)");
  lines.push(
    `${en ? "Used max capacity" : "Capacite max utilisee"}: ${
      Number.isFinite(args.resultDecision.capaciteMaxKg)
        ? args.resultDecision.capaciteMaxKg.toFixed(2)
        : "-"
    } kg`
  );
  lines.push(
    `${en ? "Saturation (decision)" : "Saturation (decision)"}: ${
      Number.isFinite(args.resultDecision.saturationPct)
        ? args.resultDecision.saturationPct.toFixed(0)
        : "-"
    } %`
  );

  if (args.mode === "melange" && args.resultEstimated && args.resultConservative) {
    lines.push("---");
    lines.push(en ? "MIXTURE DETAILS" : "DETAILS MELANGE");
    lines.push(
      `${en ? "Estimate" : "Estimation"}: ${
        Number.isFinite(args.resultEstimated.saturationPct)
          ? args.resultEstimated.saturationPct.toFixed(0)
          : "-"
      } % (avg ${(args.resultEstimated.avgUsed * 100).toFixed(1)}%)`
    );
    lines.push(
      `${en ? "Conservative" : "Conservateur"}: ${
        Number.isFinite(args.resultConservative.saturationPct)
          ? args.resultConservative.saturationPct.toFixed(0)
          : "-"
      } % (avg ${(args.resultConservative.avgUsed * 100).toFixed(1)}%)`
    );
  }

  lines.push("---");
  lines.push(
    en
      ? "Thresholds: OK < 70% | Monitor 70-75% | Replace >= 75% | Saturated >= 100%"
      : "Seuils: OK < 70% | Surveiller 70-75% | Remplacer >= 75% | Sature >= 100%"
  );
  return lines.join("\n");
}

export function isSecureClipboardAvailable(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      (window.isSecureContext ?? false) &&
      typeof navigator !== "undefined" &&
      !!(navigator as any).clipboard &&
      typeof (navigator as any).clipboard.writeText === "function"
    );
  } catch {
    return false;
  }
}

export async function tryCopyText(text: string): Promise<boolean> {
  if (isSecureClipboardAvailable()) {
    try {
      await (navigator as any).clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
