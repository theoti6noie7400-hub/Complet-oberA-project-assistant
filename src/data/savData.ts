export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_client"
  | "waiting_parts"
  | "closed";

export type TicketSeverity = "low" | "medium" | "high" | "critical";
export type ResolutionChannel = "assistant" | "sav";
export type FeedbackValue = "yes" | "no" | null;

export type Ticket = {
  id: string;
  createdAt: string;
  firstResponseAt: string | null;
  closedAt: string | null;
  status: TicketStatus;
  category: string;
  model: string;
  serial: string;
  clientId: string;
  clientName: string;
  site: string;
  severity: TicketSeverity;
  cause: string;
  resolutionChannel: ResolutionChannel;
  reopened: boolean;
  feedback: FeedbackValue;
};

export type ContractDevice = {
  model: string;
  qty: number;
};

export type Contract = {
  id: string;
  clientId: string;
  clientName: string;
  siteAddress: string;
  siteCity: string;
  siteCountry: string;
  devices: ContractDevice[];
  frequencyMonths: 6 | 12;
  startDate: string;
  endDate: string;
  lastVisitDate: string | null;
  lastVisitTech: string | null;
  nextPlannedVisitDate?: string | null;
  notes?: string;
  visitHistory?: { date: string; tech?: string }[];
};

const now = new Date();

const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);
const daysFromNow = (d: number) =>
  new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString();

export const savData: { tickets: Ticket[]; contracts: Contract[] } = {
  tickets: [
    {
      id: "SAV-2026-001",
      createdAt: daysAgo(2),
      firstResponseAt: hoursAgo(30),
      closedAt: null,
      status: "open",
      category: "rafraichisseurs",
      model: "IC 22",
      serial: "IC22-78451",
      clientId: "CL15397",
      clientName: "REFRESCO France",
      site: "Lyon, FR",
      severity: "high",
      cause: "Pompe HS",
      resolutionChannel: "sav",
      reopened: false,
      feedback: null
    },
    {
      id: "SAV-2026-002",
      createdAt: daysAgo(5),
      firstResponseAt: daysAgo(4),
      closedAt: daysAgo(1),
      status: "closed",
      category: "depoussiereurs",
      model: "DUSTOMAT 4-10",
      serial: "D4-10-22191",
      clientId: "CL11614",
      clientName: "3 MA Group",
      site: "Lille, FR",
      severity: "medium",
      cause: "Filtre colmate",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: "yes"
    },
    {
      id: "SAV-2026-003",
      createdAt: daysAgo(1),
      firstResponseAt: null,
      closedAt: null,
      status: "waiting_client",
      category: "purificateurs",
      model: "ePURBox",
      serial: "EPB-30211",
      clientId: "CL14447",
      clientName: "TEOS",
      site: "Paris, FR",
      severity: "low",
      cause: "Colmatage filtre",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: null
    },
    {
      id: "SAV-2026-004",
      createdAt: daysAgo(7),
      firstResponseAt: daysAgo(6),
      closedAt: daysAgo(2),
      status: "closed",
      category: "purificateurs",
      model: "ePUR EX 1000",
      serial: "EX1000-99420",
      clientId: "CL12001",
      clientName: "ALPHA TECH",
      site: "Nancy, FR",
      severity: "high",
      cause: "Erreur capteur",
      resolutionChannel: "sav",
      reopened: true,
      feedback: "no"
    },
    {
      id: "SAV-2026-005",
      createdAt: daysAgo(12),
      firstResponseAt: daysAgo(11),
      closedAt: null,
      status: "in_progress",
      category: "depoussiereurs",
      model: "DUSTOMAT 16M",
      serial: "D16M-61031",
      clientId: "CL17702",
      clientName: "NOVAPROD",
      site: "Rouen, FR",
      severity: "medium",
      cause: "Pression diff haute",
      resolutionChannel: "sav",
      reopened: false,
      feedback: null
    },
    {
      id: "SAV-2026-006",
      createdAt: daysAgo(18),
      firstResponseAt: daysAgo(17),
      closedAt: daysAgo(10),
      status: "closed",
      category: "rafraichisseurs",
      model: "ECOCLIM 30",
      serial: "ECO30-33190",
      clientId: "CL13221",
      clientName: "ARCADIA",
      site: "Marseille, FR",
      severity: "medium",
      cause: "Buse encrassee",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: "yes"
    },
    {
      id: "SAV-2026-007",
      createdAt: daysAgo(22),
      firstResponseAt: daysAgo(21),
      closedAt: null,
      status: "waiting_parts",
      category: "depoussiereurs",
      model: "DUSTOMAT DRY",
      serial: "DRY-44011",
      clientId: "CL15443",
      clientName: "GLOBE METAL",
      site: "Dijon, FR",
      severity: "high",
      cause: "Capteur pression",
      resolutionChannel: "sav",
      reopened: false,
      feedback: null
    },
    {
      id: "SAV-2026-008",
      createdAt: daysAgo(30),
      firstResponseAt: daysAgo(29),
      closedAt: daysAgo(25),
      status: "closed",
      category: "purificateurs",
      model: "ePUR 150",
      serial: "EP150-22110",
      clientId: "CL17009",
      clientName: "AROMA",
      site: "Bordeaux, FR",
      severity: "low",
      cause: "Filtre plein 95%",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: "yes"
    },
    {
      id: "SAV-2026-009",
      createdAt: daysAgo(40),
      firstResponseAt: daysAgo(39),
      closedAt: daysAgo(34),
      status: "closed",
      category: "rafraichisseurs",
      model: "VL 120",
      serial: "VL120-77812",
      clientId: "CL19002",
      clientName: "CITYFOOD",
      site: "Toulouse, FR",
      severity: "medium",
      cause: "Niveau eau bas",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: "yes"
    },
    {
      id: "SAV-2026-010",
      createdAt: daysAgo(3),
      firstResponseAt: hoursAgo(40),
      closedAt: null,
      status: "in_progress",
      category: "tables-aspirantes",
      model: "Table Aspirante (BAS-V)",
      serial: "BASV-56009",
      clientId: "CL15021",
      clientName: "METALFORM",
      site: "Nantes, FR",
      severity: "high",
      cause: "Blocage aspiration",
      resolutionChannel: "sav",
      reopened: false,
      feedback: null
    },
    {
      id: "SAV-2026-011",
      createdAt: daysAgo(55),
      firstResponseAt: daysAgo(53),
      closedAt: daysAgo(50),
      status: "closed",
      category: "purificateurs",
      model: "Clearbox",
      serial: "CLB-33119",
      clientId: "CL14320",
      clientName: "MEDILAB",
      site: "Lille, FR",
      severity: "medium",
      cause: "Bruit anormal",
      resolutionChannel: "sav",
      reopened: true,
      feedback: "no"
    },
    {
      id: "SAV-2026-012",
      createdAt: daysAgo(75),
      firstResponseAt: daysAgo(73),
      closedAt: null,
      status: "open",
      category: "depoussiereurs",
      model: "DUSTMAC",
      serial: "DM-99102",
      clientId: "CL16555",
      clientName: "ORBITAL",
      site: "Strasbourg, FR",
      severity: "critical",
      cause: "Alimentation",
      resolutionChannel: "sav",
      reopened: false,
      feedback: null
    },
    {
      id: "SAV-2026-013",
      createdAt: daysAgo(90),
      firstResponseAt: daysAgo(89),
      closedAt: daysAgo(80),
      status: "closed",
      category: "depoussiereurs",
      model: "DUSTOMAT 10",
      serial: "D10-11881",
      clientId: "CL11209",
      clientName: "NEXON",
      site: "Grenoble, FR",
      severity: "medium",
      cause: "Filtre a remplacer",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: "yes"
    },
    {
      id: "SAV-2026-014",
      createdAt: daysAgo(11),
      firstResponseAt: daysAgo(10),
      closedAt: null,
      status: "waiting_parts",
      category: "rafraichisseurs",
      model: "Fresh",
      serial: "FRESH-22191",
      clientId: "CL19902",
      clientName: "EVENTS CO",
      site: "Paris, FR",
      severity: "high",
      cause: "Pompe HS",
      resolutionChannel: "sav",
      reopened: false,
      feedback: null
    },
    {
      id: "SAV-2026-015",
      createdAt: daysAgo(9),
      firstResponseAt: daysAgo(8),
      closedAt: daysAgo(6),
      status: "closed",
      category: "rafraichisseurs",
      model: "IC 12",
      serial: "IC12-40331",
      clientId: "CL14410",
      clientName: "BETA LOG",
      site: "Reims, FR",
      severity: "low",
      cause: "Buse encrassee",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: "yes"
    },
    {
      id: "SAV-2026-016",
      createdAt: daysAgo(27),
      firstResponseAt: daysAgo(26),
      closedAt: null,
      status: "waiting_client",
      category: "purificateurs",
      model: "ePUR 100",
      serial: "EP100-99110",
      clientId: "CL18880",
      clientName: "BIOCARE",
      site: "Nice, FR",
      severity: "medium",
      cause: "Filtre plein 80%",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: null
    },
    {
      id: "SAV-2026-017",
      createdAt: daysAgo(3),
      firstResponseAt: hoursAgo(18),
      closedAt: null,
      status: "in_progress",
      category: "depoussiereurs",
      model: "DUSTOMAT 4-24",
      serial: "D4-24-77411",
      clientId: "CL13320",
      clientName: "STEELPRO",
      site: "Metz, FR",
      severity: "high",
      cause: "Pression diff haute",
      resolutionChannel: "sav",
      reopened: false,
      feedback: null
    },
    {
      id: "SAV-2026-018",
      createdAt: daysAgo(150),
      firstResponseAt: daysAgo(149),
      closedAt: daysAgo(120),
      status: "closed",
      category: "depoussiereurs",
      model: "DUSTOMAT HYDRO",
      serial: "HYD-00221",
      clientId: "CL10220",
      clientName: "HYDROTECH",
      site: "Lyon, FR",
      severity: "critical",
      cause: "Pompe HS",
      resolutionChannel: "sav",
      reopened: false,
      feedback: "no"
    },
    {
      id: "SAV-2026-019",
      createdAt: daysAgo(6),
      firstResponseAt: hoursAgo(20),
      closedAt: null,
      status: "open",
      category: "purificateurs",
      model: "ePUR 50",
      serial: "EP50-88412",
      clientId: "CL12121",
      clientName: "OMEGA",
      site: "Paris, FR",
      severity: "low",
      cause: "Bruit anormal",
      resolutionChannel: "sav",
      reopened: false,
      feedback: null
    },
    {
      id: "SAV-2026-020",
      createdAt: daysAgo(4),
      firstResponseAt: hoursAgo(15),
      closedAt: null,
      status: "in_progress",
      category: "rafraichisseurs",
      model: "ECOCLIM 20",
      serial: "ECO20-66390",
      clientId: "CL17221",
      clientName: "FOODLAB",
      site: "Bordeaux, FR",
      severity: "medium",
      cause: "Niveau eau bas",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: null
    },
    {
      id: "SAV-2026-021",
      createdAt: daysAgo(33),
      firstResponseAt: daysAgo(32),
      closedAt: daysAgo(28),
      status: "closed",
      category: "tables-aspirantes",
      model: "Dosseret Aspirant",
      serial: "DOSA-01921",
      clientId: "CL19001",
      clientName: "ATELIER PRO",
      site: "Nantes, FR",
      severity: "medium",
      cause: "Blocage aspiration",
      resolutionChannel: "sav",
      reopened: false,
      feedback: "yes"
    },
    {
      id: "SAV-2026-022",
      createdAt: daysAgo(14),
      firstResponseAt: daysAgo(13),
      closedAt: daysAgo(9),
      status: "closed",
      category: "purificateurs",
      model: "ePUR 140",
      serial: "EP140-23019",
      clientId: "CL14550",
      clientName: "CLINIQUE OUEST",
      site: "Tours, FR",
      severity: "medium",
      cause: "Filtre plein 95%",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: "yes"
    }
  ],
  contracts: [
    {
      id: "CTR-2026-001",
      clientId: "CL15397",
      clientName: "REFRESCO France",
      siteAddress: "12 rue des Forges",
      siteCity: "Lyon",
      siteCountry: "FR",
      devices: [
        { model: "IC 22", qty: 3 },
        { model: "VL 120", qty: 2 }
      ],
      frequencyMonths: 6,
      startDate: daysAgo(400),
      endDate: daysFromNow(120),
      lastVisitDate: daysAgo(80),
      lastVisitTech: "A. Martin",
      nextPlannedVisitDate: null,
      notes: "Site prioritaire l'été.",
      visitHistory: [{ date: daysAgo(80), tech: "A. Martin" }]
    },
    {
      id: "CTR-2026-002",
      clientId: "CL14447",
      clientName: "TEOS",
      siteAddress: "5 avenue Centrale",
      siteCity: "Paris",
      siteCountry: "FR",
      devices: [{ model: "ePURBox", qty: 4 }],
      frequencyMonths: 12,
      startDate: daysAgo(500),
      endDate: daysFromNow(30),
      lastVisitDate: daysAgo(300),
      lastVisitTech: "L. Petit",
      nextPlannedVisitDate: daysFromNow(10),
      notes: "Interventions en horaires de nuit.",
      visitHistory: [{ date: daysAgo(300), tech: "L. Petit" }]
    },
    {
      id: "CTR-2026-003",
      clientId: "CL11614",
      clientName: "3 MA Group",
      siteAddress: "Zone Industrielle Nord",
      siteCity: "Lille",
      siteCountry: "FR",
      devices: [{ model: "DUSTOMAT 4-10", qty: 6 }],
      frequencyMonths: 6,
      startDate: daysAgo(300),
      endDate: daysFromNow(200),
      lastVisitDate: daysAgo(190),
      lastVisitTech: "C. Legrand",
      nextPlannedVisitDate: null,
      notes: "Filtres à prévoir en stock.",
      visitHistory: [{ date: daysAgo(190), tech: "C. Legrand" }]
    },
    {
      id: "CTR-2026-004",
      clientId: "CL17009",
      clientName: "AROMA",
      siteAddress: "27 boulevard Sud",
      siteCity: "Bordeaux",
      siteCountry: "FR",
      devices: [
        { model: "ePUR 150", qty: 2 },
        { model: "ePUR 100", qty: 3 }
      ],
      frequencyMonths: 12,
      startDate: daysAgo(700),
      endDate: daysAgo(10),
      lastVisitDate: daysAgo(380),
      lastVisitTech: "M. Diallo",
      nextPlannedVisitDate: null,
      notes: "Contrat a renouveler.",
      visitHistory: [{ date: daysAgo(380), tech: "M. Diallo" }]
    },
    {
      id: "CTR-2026-005",
      clientId: "CL19002",
      clientName: "CITYFOOD",
      siteAddress: "9 rue du Port",
      siteCity: "Toulouse",
      siteCountry: "FR",
      devices: [{ model: "VL 120", qty: 1 }],
      frequencyMonths: 6,
      startDate: daysAgo(200),
      endDate: daysFromNow(90),
      lastVisitDate: daysAgo(50),
      lastVisitTech: "S. Bernard",
      nextPlannedVisitDate: daysFromNow(10),
      notes: "",
      visitHistory: [{ date: daysAgo(50), tech: "S. Bernard" }]
    },
    {
      id: "CTR-2026-006",
      clientId: "CL15021",
      clientName: "METALFORM",
      siteAddress: "2 route de l'Est",
      siteCity: "Nantes",
      siteCountry: "FR",
      devices: [{ model: "Table Aspirante (BAS-V)", qty: 2 }],
      frequencyMonths: 12,
      startDate: daysAgo(350),
      endDate: daysFromNow(150),
      lastVisitDate: daysAgo(370),
      lastVisitTech: "J. Morel",
      nextPlannedVisitDate: null,
      notes: "Visites à planifier.",
      visitHistory: [{ date: daysAgo(370), tech: "J. Morel" }]
    },
    {
      id: "CTR-2026-007",
      clientId: "CL16555",
      clientName: "ORBITAL",
      siteAddress: "10 quai des Champs",
      siteCity: "Strasbourg",
      siteCountry: "FR",
      devices: [{ model: "DUSTMAC", qty: 1 }],
      frequencyMonths: 6,
      startDate: daysAgo(420),
      endDate: daysFromNow(40),
      lastVisitDate: daysAgo(220),
      lastVisitTech: "A. Martin",
      nextPlannedVisitDate: null,
      notes: "",
      visitHistory: [{ date: daysAgo(220), tech: "A. Martin" }]
    },
    {
      id: "CTR-2026-008",
      clientId: "CL13221",
      clientName: "ARCADIA",
      siteAddress: "55 rue du Parc",
      siteCity: "Marseille",
      siteCountry: "FR",
      devices: [
        { model: "ECOCLIM 30", qty: 2 },
        { model: "IC 12", qty: 1 }
      ],
      frequencyMonths: 6,
      startDate: daysAgo(250),
      endDate: daysFromNow(200),
      lastVisitDate: daysAgo(40),
      lastVisitTech: "L. Petit",
      nextPlannedVisitDate: daysFromNow(140),
      notes: "Accès sécurité obligatoire.",
      visitHistory: [{ date: daysAgo(40), tech: "L. Petit" }]
    }
  ]
};
