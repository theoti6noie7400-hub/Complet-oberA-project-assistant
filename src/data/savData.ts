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

// Jeu strictement fictif pour la recette du portail.
export const savData: { tickets: Ticket[]; contracts: Contract[] } = {
  tickets: [
    {
      id: "DEMO-SAV-001",
      createdAt: daysAgo(2),
      firstResponseAt: hoursAgo(30),
      closedAt: null,
      status: "open",
      category: "rafraichisseurs",
      model: "IC 22",
      serial: "DEMO-SN-001",
      clientId: "DEMO-CL-001",
      clientName: "CLIENT DEMO ALPHA",
      site: "SITE DEMO-001",
      severity: "high",
      cause: "DEMO : pompe de test à contrôler",
      resolutionChannel: "sav",
      reopened: false,
      feedback: null
    },
    {
      id: "DEMO-SAV-002",
      createdAt: daysAgo(5),
      firstResponseAt: daysAgo(4),
      closedAt: daysAgo(1),
      status: "closed",
      category: "depoussiereurs",
      model: "DUSTOMAT 4-10",
      serial: "DEMO-SN-002",
      clientId: "DEMO-CL-002",
      clientName: "CLIENT DEMO BETA",
      site: "SITE DEMO-002",
      severity: "medium",
      cause: "DEMO : filtre d'essai obstrué",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: "yes"
    },
    {
      id: "DEMO-SAV-003",
      createdAt: daysAgo(1),
      firstResponseAt: null,
      closedAt: null,
      status: "waiting_client",
      category: "purificateurs",
      model: "ePURBox",
      serial: "DEMO-SN-003",
      clientId: "DEMO-CL-003",
      clientName: "CLIENT DEMO GAMMA",
      site: "SITE DEMO-003",
      severity: "low",
      cause: "DEMO : baisse de débit fictive",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: null
    },
    {
      id: "DEMO-SAV-004",
      createdAt: daysAgo(7),
      firstResponseAt: daysAgo(6),
      closedAt: daysAgo(2),
      status: "closed",
      category: "purificateurs",
      model: "ePUR EX 1000",
      serial: "DEMO-SN-004",
      clientId: "DEMO-CL-004",
      clientName: "CLIENT DEMO DELTA",
      site: "SITE DEMO-004",
      severity: "high",
      cause: "DEMO : capteur de test en défaut",
      resolutionChannel: "sav",
      reopened: true,
      feedback: "no"
    },
    {
      id: "DEMO-SAV-005",
      createdAt: daysAgo(12),
      firstResponseAt: daysAgo(11),
      closedAt: null,
      status: "in_progress",
      category: "depoussiereurs",
      model: "DUSTOMAT 16M",
      serial: "DEMO-SN-005",
      clientId: "DEMO-CL-005",
      clientName: "CLIENT DEMO EPSILON",
      site: "SITE DEMO-005",
      severity: "medium",
      cause: "DEMO : pression de test élevée",
      resolutionChannel: "sav",
      reopened: false,
      feedback: null
    },
    {
      id: "DEMO-SAV-006",
      createdAt: daysAgo(18),
      firstResponseAt: daysAgo(17),
      closedAt: daysAgo(10),
      status: "closed",
      category: "rafraichisseurs",
      model: "ECOCLIM 30",
      serial: "DEMO-SN-006",
      clientId: "DEMO-CL-006",
      clientName: "CLIENT DEMO ZETA",
      site: "SITE DEMO-006",
      severity: "medium",
      cause: "DEMO : buse de test à nettoyer",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: "yes"
    },
    {
      id: "DEMO-SAV-007",
      createdAt: daysAgo(22),
      firstResponseAt: daysAgo(21),
      closedAt: null,
      status: "waiting_parts",
      category: "depoussiereurs",
      model: "DUSTOMAT DRY",
      serial: "DEMO-SN-007",
      clientId: "DEMO-CL-007",
      clientName: "CLIENT DEMO ETA",
      site: "SITE DEMO-007",
      severity: "high",
      cause: "DEMO : lecture de pression fictive",
      resolutionChannel: "sav",
      reopened: false,
      feedback: null
    },
    {
      id: "DEMO-SAV-008",
      createdAt: daysAgo(30),
      firstResponseAt: daysAgo(29),
      closedAt: daysAgo(25),
      status: "closed",
      category: "purificateurs",
      model: "ePUR 150",
      serial: "DEMO-SN-008",
      clientId: "DEMO-CL-008",
      clientName: "CLIENT DEMO THETA",
      site: "SITE DEMO-008",
      severity: "low",
      cause: "DEMO : filtre d'essai presque saturé",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: "yes"
    },
    {
      id: "DEMO-SAV-009",
      createdAt: daysAgo(40),
      firstResponseAt: daysAgo(39),
      closedAt: daysAgo(34),
      status: "closed",
      category: "rafraichisseurs",
      model: "VL 120",
      serial: "DEMO-SN-009",
      clientId: "DEMO-CL-009",
      clientName: "CLIENT DEMO IOTA",
      site: "SITE DEMO-009",
      severity: "medium",
      cause: "DEMO : appoint d'eau simulé",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: "yes"
    },
    {
      id: "DEMO-SAV-010",
      createdAt: daysAgo(3),
      firstResponseAt: hoursAgo(40),
      closedAt: null,
      status: "in_progress",
      category: "tables-aspirantes",
      model: "Table Aspirante (BAS-V)",
      serial: "DEMO-SN-010",
      clientId: "DEMO-CL-010",
      clientName: "CLIENT DEMO KAPPA",
      site: "SITE DEMO-010",
      severity: "high",
      cause: "DEMO : aspiration d'essai réduite",
      resolutionChannel: "sav",
      reopened: false,
      feedback: null
    },
    {
      id: "DEMO-SAV-011",
      createdAt: daysAgo(55),
      firstResponseAt: daysAgo(53),
      closedAt: daysAgo(50),
      status: "closed",
      category: "purificateurs",
      model: "Clearbox",
      serial: "DEMO-SN-011",
      clientId: "DEMO-CL-011",
      clientName: "CLIENT DEMO LAMBDA",
      site: "SITE DEMO-011",
      severity: "medium",
      cause: "DEMO : vibration fictive",
      resolutionChannel: "sav",
      reopened: true,
      feedback: "no"
    },
    {
      id: "DEMO-SAV-012",
      createdAt: daysAgo(75),
      firstResponseAt: daysAgo(73),
      closedAt: null,
      status: "open",
      category: "depoussiereurs",
      model: "DUSTMAC",
      serial: "DEMO-SN-012",
      clientId: "DEMO-CL-012",
      clientName: "CLIENT DEMO MU",
      site: "SITE DEMO-012",
      severity: "critical",
      cause: "DEMO : circuit électrique d'essai",
      resolutionChannel: "sav",
      reopened: false,
      feedback: null
    },
    {
      id: "DEMO-SAV-013",
      createdAt: daysAgo(90),
      firstResponseAt: daysAgo(89),
      closedAt: daysAgo(80),
      status: "closed",
      category: "depoussiereurs",
      model: "DUSTOMAT 10",
      serial: "DEMO-SN-013",
      clientId: "DEMO-CL-013",
      clientName: "CLIENT DEMO NU",
      site: "SITE DEMO-013",
      severity: "medium",
      cause: "DEMO : remplacement préventif simulé",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: "yes"
    },
    {
      id: "DEMO-SAV-014",
      createdAt: daysAgo(11),
      firstResponseAt: daysAgo(10),
      closedAt: null,
      status: "waiting_parts",
      category: "rafraichisseurs",
      model: "Fresh",
      serial: "DEMO-SN-014",
      clientId: "DEMO-CL-014",
      clientName: "CLIENT DEMO XI",
      site: "SITE DEMO-014",
      severity: "high",
      cause: "DEMO : pompe de test à contrôler",
      resolutionChannel: "sav",
      reopened: false,
      feedback: null
    },
    {
      id: "DEMO-SAV-015",
      createdAt: daysAgo(9),
      firstResponseAt: daysAgo(8),
      closedAt: daysAgo(6),
      status: "closed",
      category: "rafraichisseurs",
      model: "IC 12",
      serial: "DEMO-SN-015",
      clientId: "DEMO-CL-015",
      clientName: "CLIENT DEMO OMICRON",
      site: "SITE DEMO-015",
      severity: "low",
      cause: "DEMO : buse de test à nettoyer",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: "yes"
    },
    {
      id: "DEMO-SAV-016",
      createdAt: daysAgo(27),
      firstResponseAt: daysAgo(26),
      closedAt: null,
      status: "waiting_client",
      category: "purificateurs",
      model: "ePUR 100",
      serial: "DEMO-SN-016",
      clientId: "DEMO-CL-016",
      clientName: "CLIENT DEMO PI",
      site: "SITE DEMO-016",
      severity: "medium",
      cause: "DEMO : filtre d'essai partiellement saturé",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: null
    },
    {
      id: "DEMO-SAV-017",
      createdAt: daysAgo(3),
      firstResponseAt: hoursAgo(18),
      closedAt: null,
      status: "in_progress",
      category: "depoussiereurs",
      model: "DUSTOMAT 4-24",
      serial: "DEMO-SN-017",
      clientId: "DEMO-CL-017",
      clientName: "CLIENT DEMO RHO",
      site: "SITE DEMO-017",
      severity: "high",
      cause: "DEMO : pression de test élevée",
      resolutionChannel: "sav",
      reopened: false,
      feedback: null
    },
    {
      id: "DEMO-SAV-018",
      createdAt: daysAgo(150),
      firstResponseAt: daysAgo(149),
      closedAt: daysAgo(120),
      status: "closed",
      category: "depoussiereurs",
      model: "DUSTOMAT HYDRO",
      serial: "DEMO-SN-018",
      clientId: "DEMO-CL-018",
      clientName: "CLIENT DEMO SIGMA",
      site: "SITE DEMO-018",
      severity: "critical",
      cause: "DEMO : pompe de test à contrôler",
      resolutionChannel: "sav",
      reopened: false,
      feedback: "no"
    },
    {
      id: "DEMO-SAV-019",
      createdAt: daysAgo(6),
      firstResponseAt: hoursAgo(20),
      closedAt: null,
      status: "open",
      category: "purificateurs",
      model: "ePUR 50",
      serial: "DEMO-SN-019",
      clientId: "DEMO-CL-019",
      clientName: "CLIENT DEMO TAU",
      site: "SITE DEMO-019",
      severity: "low",
      cause: "DEMO : vibration fictive",
      resolutionChannel: "sav",
      reopened: false,
      feedback: null
    },
    {
      id: "DEMO-SAV-020",
      createdAt: daysAgo(4),
      firstResponseAt: hoursAgo(15),
      closedAt: null,
      status: "in_progress",
      category: "rafraichisseurs",
      model: "ECOCLIM 20",
      serial: "DEMO-SN-020",
      clientId: "DEMO-CL-020",
      clientName: "CLIENT DEMO UPSILON",
      site: "SITE DEMO-020",
      severity: "medium",
      cause: "DEMO : appoint d'eau simulé",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: null
    },
    {
      id: "DEMO-SAV-021",
      createdAt: daysAgo(33),
      firstResponseAt: daysAgo(32),
      closedAt: daysAgo(28),
      status: "closed",
      category: "tables-aspirantes",
      model: "Dosseret Aspirant",
      serial: "DEMO-SN-021",
      clientId: "DEMO-CL-021",
      clientName: "CLIENT DEMO PHI",
      site: "SITE DEMO-021",
      severity: "medium",
      cause: "DEMO : aspiration d'essai réduite",
      resolutionChannel: "sav",
      reopened: false,
      feedback: "yes"
    },
    {
      id: "DEMO-SAV-022",
      createdAt: daysAgo(14),
      firstResponseAt: daysAgo(13),
      closedAt: daysAgo(9),
      status: "closed",
      category: "purificateurs",
      model: "ePUR 140",
      serial: "DEMO-SN-022",
      clientId: "DEMO-CL-022",
      clientName: "CLIENT DEMO CHI",
      site: "SITE DEMO-022",
      severity: "medium",
      cause: "DEMO : filtre d'essai presque saturé",
      resolutionChannel: "assistant",
      reopened: false,
      feedback: "yes"
    }
  ],
  contracts: [
    {
      id: "DEMO-CTR-001",
      clientId: "DEMO-CL-001",
      clientName: "CLIENT DEMO ALPHA",
      siteAddress: "ADRESSE DEMO-001",
      siteCity: "VILLE DEMO-001",
      siteCountry: "DEMO",
      devices: [
        { model: "IC 22", qty: 3 },
        { model: "VL 120", qty: 2 }
      ],
      frequencyMonths: 6,
      startDate: daysAgo(400),
      endDate: daysFromNow(120),
      lastVisitDate: daysAgo(80),
      lastVisitTech: "TECHNICIEN DEMO 01",
      nextPlannedVisitDate: null,
      notes: "NOTE DEMO 001 : scénario de maintenance fictif.",
      visitHistory: [{ date: daysAgo(80), tech: "TECHNICIEN DEMO 01" }]
    },
    {
      id: "DEMO-CTR-002",
      clientId: "DEMO-CL-003",
      clientName: "CLIENT DEMO GAMMA",
      siteAddress: "ADRESSE DEMO-002",
      siteCity: "VILLE DEMO-002",
      siteCountry: "DEMO",
      devices: [{ model: "ePURBox", qty: 4 }],
      frequencyMonths: 12,
      startDate: daysAgo(500),
      endDate: daysFromNow(30),
      lastVisitDate: daysAgo(300),
      lastVisitTech: "TECHNICIEN DEMO 02",
      nextPlannedVisitDate: daysFromNow(10),
      notes: "NOTE DEMO 002 : scénario de maintenance fictif.",
      visitHistory: [{ date: daysAgo(300), tech: "TECHNICIEN DEMO 02" }]
    },
    {
      id: "DEMO-CTR-003",
      clientId: "DEMO-CL-002",
      clientName: "CLIENT DEMO BETA",
      siteAddress: "ADRESSE DEMO-003",
      siteCity: "VILLE DEMO-003",
      siteCountry: "DEMO",
      devices: [{ model: "DUSTOMAT 4-10", qty: 6 }],
      frequencyMonths: 6,
      startDate: daysAgo(300),
      endDate: daysFromNow(200),
      lastVisitDate: daysAgo(190),
      lastVisitTech: "TECHNICIEN DEMO 03",
      nextPlannedVisitDate: null,
      notes: "NOTE DEMO 003 : scénario de maintenance fictif.",
      visitHistory: [{ date: daysAgo(190), tech: "TECHNICIEN DEMO 03" }]
    },
    {
      id: "DEMO-CTR-004",
      clientId: "DEMO-CL-008",
      clientName: "CLIENT DEMO THETA",
      siteAddress: "ADRESSE DEMO-004",
      siteCity: "VILLE DEMO-004",
      siteCountry: "DEMO",
      devices: [
        { model: "ePUR 150", qty: 2 },
        { model: "ePUR 100", qty: 3 }
      ],
      frequencyMonths: 12,
      startDate: daysAgo(700),
      endDate: daysAgo(10),
      lastVisitDate: daysAgo(380),
      lastVisitTech: "TECHNICIEN DEMO 04",
      nextPlannedVisitDate: null,
      notes: "NOTE DEMO 004 : scénario de maintenance fictif.",
      visitHistory: [{ date: daysAgo(380), tech: "TECHNICIEN DEMO 04" }]
    },
    {
      id: "DEMO-CTR-005",
      clientId: "DEMO-CL-009",
      clientName: "CLIENT DEMO IOTA",
      siteAddress: "ADRESSE DEMO-005",
      siteCity: "VILLE DEMO-005",
      siteCountry: "DEMO",
      devices: [{ model: "VL 120", qty: 1 }],
      frequencyMonths: 6,
      startDate: daysAgo(200),
      endDate: daysFromNow(90),
      lastVisitDate: daysAgo(50),
      lastVisitTech: "TECHNICIEN DEMO 05",
      nextPlannedVisitDate: daysFromNow(10),
      notes: "",
      visitHistory: [{ date: daysAgo(50), tech: "TECHNICIEN DEMO 05" }]
    },
    {
      id: "DEMO-CTR-006",
      clientId: "DEMO-CL-010",
      clientName: "CLIENT DEMO KAPPA",
      siteAddress: "ADRESSE DEMO-006",
      siteCity: "VILLE DEMO-006",
      siteCountry: "DEMO",
      devices: [{ model: "Table Aspirante (BAS-V)", qty: 2 }],
      frequencyMonths: 12,
      startDate: daysAgo(350),
      endDate: daysFromNow(150),
      lastVisitDate: daysAgo(370),
      lastVisitTech: "TECHNICIEN DEMO 06",
      nextPlannedVisitDate: null,
      notes: "NOTE DEMO 006 : scénario de maintenance fictif.",
      visitHistory: [{ date: daysAgo(370), tech: "TECHNICIEN DEMO 06" }]
    },
    {
      id: "DEMO-CTR-007",
      clientId: "DEMO-CL-012",
      clientName: "CLIENT DEMO MU",
      siteAddress: "ADRESSE DEMO-007",
      siteCity: "VILLE DEMO-007",
      siteCountry: "DEMO",
      devices: [{ model: "DUSTMAC", qty: 1 }],
      frequencyMonths: 6,
      startDate: daysAgo(420),
      endDate: daysFromNow(40),
      lastVisitDate: daysAgo(220),
      lastVisitTech: "TECHNICIEN DEMO 01",
      nextPlannedVisitDate: null,
      notes: "",
      visitHistory: [{ date: daysAgo(220), tech: "TECHNICIEN DEMO 01" }]
    },
    {
      id: "DEMO-CTR-008",
      clientId: "DEMO-CL-006",
      clientName: "CLIENT DEMO ZETA",
      siteAddress: "ADRESSE DEMO-008",
      siteCity: "VILLE DEMO-008",
      siteCountry: "DEMO",
      devices: [
        { model: "ECOCLIM 30", qty: 2 },
        { model: "IC 12", qty: 1 }
      ],
      frequencyMonths: 6,
      startDate: daysAgo(250),
      endDate: daysFromNow(200),
      lastVisitDate: daysAgo(40),
      lastVisitTech: "TECHNICIEN DEMO 02",
      nextPlannedVisitDate: daysFromNow(140),
      notes: "NOTE DEMO 008 : scénario de maintenance fictif.",
      visitHistory: [{ date: daysAgo(40), tech: "TECHNICIEN DEMO 02" }]
    }
  ]
};
