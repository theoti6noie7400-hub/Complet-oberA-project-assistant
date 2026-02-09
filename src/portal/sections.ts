export type ServiceMenuItem = {
  title: string;
  description: string;
  status?: string;
};

export type ServiceSection = {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  menu: ServiceMenuItem[];
  highlight?: ServiceMenuItem;
};

export const INTERNAL_SECTIONS: ServiceSection[] = [
  {
    id: "marketing",
    title: "Marketing",
    description: "Supports, contenus et actions marketing OberA.",
    icon: "📣",
    route: "/service/marketing",
    menu: [
      { title: "Campagnes", description: "Planification et calendrier campagnes." },
      { title: "Contenus & branding", description: "Bibliotheque et guidelines visuelles." },
      { title: "Site & SEO", description: "Pages, articles et optimisation." },
      { title: "Social & Ads", description: "Publications, campagnes paid." },
      { title: "Events", description: "Salons et activations." },
      { title: "Reporting", description: "Performances et KPIs." }
    ]
  },
  {
    id: "commercial",
    title: "Commercial",
    description: "Pilotage commercial, offres et suivi clients.",
    icon: "🤝",
    route: "/service/commercial",
    menu: [
      { title: "Leads & CRM", description: "Suivi prospects et pipeline." },
      { title: "Devis / Offres", description: "Creation et validation." },
      { title: "Opportunites", description: "Suivi des deals." },
      { title: "Relances", description: "Suivi client et relances." },
      { title: "Reporting", description: "Chiffres et previsions." }
    ]
  },
  {
    id: "adv",
    title: "ADV",
    description: "Administration des ventes et suivi administratif.",
    icon: "🧾",
    route: "/service/adv",
    menu: [
      { title: "Commandes", description: "Pilotage commandes et statuts." },
      { title: "Facturation", description: "Emission et suivi." },
      { title: "Avoirs & litiges", description: "Gestion des incidents." },
      { title: "Documents client", description: "Archivage et partage." }
    ]
  },
  {
    id: "logistique",
    title: "Logistique",
    description: "Flux, expeditions et coordination logistique.",
    icon: "🚚",
    route: "/service/logistique",
    menu: [
      { title: "Stocks", description: "Niveaux et alertes." },
      { title: "Expeditions", description: "Preparation et suivi." },
      { title: "Receptions", description: "Controle et entree stock." },
      { title: "Inventaires", description: "Campagnes et audits." }
    ]
  }
];

export const CLIENT_SECTION = {
  id: "espace-client",
  title: "Espace Client",
  description: "Acces client au parc machines et documents.",
  icon: "🏭",
  route: "/client-space"
};

export const RESELLER_SECTION = {
  id: "espace-revendeur",
  title: "Espace Revendeur",
  description: "Commandes de pieces et suivi revendeur.",
  icon: "📦",
  route: "/reseller-space"
};

