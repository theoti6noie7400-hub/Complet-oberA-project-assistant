import { PRODUCTS } from "../lib/assistantData";
import type { Contract, Ticket, TicketStatus } from "../data/savData";

export type TimeRange = "7d" | "30d" | "90d" | "12m";

export type TicketFilters = {
  range: TimeRange;
  category: string;
  model: string;
  client: string;
};

export type ContractFilters = {
  category: string;
  model: string;
  client: string;
  query: string;
};

export type KPIs = {
  total: number;
  open: number;
  closed: number;
  responseMedianHours: number | null;
  responseAvgHours: number | null;
  resolutionMedianHours: number | null;
  resolutionAvgHours: number | null;
  autoResolutionRate: number | null;
  backlogSlaRate: number | null;
  backlogSlaCount: number;
  reopenRate: number | null;
  satisfactionYesRate: number | null;
  satisfactionNoRate: number | null;
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  waiting_client: "En attente client",
  waiting_parts: "En attente pièces",
  closed: "Clos"
};

const MODEL_CATEGORY_MAP = (() => {
  const map = new Map<string, string>();
  PRODUCTS.forEach((p) => {
    map.set(p.id.toLowerCase(), p.category);
    map.set(p.name.toLowerCase(), p.category);
  });
  return map;
})();

export const rangeToDays: Record<TimeRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "12m": 365
};

export function getCategoryForModel(model: string): string | null {
  if (!model) return null;
  return MODEL_CATEGORY_MAP.get(model.toLowerCase()) ?? null;
}

export function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function diffHours(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function average(values: number[]): number | null {
  if (!values.length) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

export function filterTickets(tickets: Ticket[], filters: TicketFilters): Ticket[] {
  const days = rangeToDays[filters.range];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const category = filters.category.toLowerCase();
  const model = filters.model.toLowerCase();
  const client = filters.client.toLowerCase();

  return tickets.filter((t) => {
    const createdAt = parseDate(t.createdAt);
    if (!createdAt || createdAt < cutoff) return false;
    if (category && t.category.toLowerCase() !== category) return false;
    if (model && t.model.toLowerCase() !== model) return false;
    if (client && t.clientName.toLowerCase() !== client) return false;
    return true;
  });
}

export function filterContracts(contracts: Contract[], filters: ContractFilters): Contract[] {
  const category = filters.category.toLowerCase();
  const model = filters.model.toLowerCase();
  const client = filters.client.toLowerCase();
  const query = filters.query.toLowerCase();

  return contracts.filter((c) => {
    if (client && c.clientName.toLowerCase() !== client) return false;
    if (query) {
      const haystack = `${c.clientName} ${c.siteCity} ${c.siteCountry} ${c.siteAddress}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    const deviceModels = c.devices.map((d) => d.model.toLowerCase());
    if (model && !deviceModels.includes(model)) return false;
    if (category) {
      const matchesCategory = c.devices.some((d) => {
        const deviceCategory = getCategoryForModel(d.model);
        return deviceCategory ? deviceCategory.toLowerCase() === category : false;
      });
      if (!matchesCategory) return false;
    }
    return true;
  });
}

export function computeKPIs(tickets: Ticket[], slaHours = 24): KPIs {
  const total = tickets.length;
  const closed = tickets.filter((t) => t.status === "closed").length;
  const open = total - closed;

  const responseTimes: number[] = [];
  const resolutionTimes: number[] = [];
  const backlogTickets: Ticket[] = [];
  const autoResolved = tickets.filter((t) => t.resolutionChannel === "assistant").length;
  const reopened = tickets.filter((t) => t.reopened).length;
  const feedbackYes = tickets.filter((t) => t.feedback === "yes").length;
  const feedbackNo = tickets.filter((t) => t.feedback === "no").length;

  const now = new Date();
  tickets.forEach((t) => {
    const createdAt = parseDate(t.createdAt);
    const firstResponseAt = parseDate(t.firstResponseAt);
    const closedAt = parseDate(t.closedAt);

    const response = diffHours(createdAt, firstResponseAt);
    if (response !== null) responseTimes.push(response);
    const resolution = diffHours(createdAt, closedAt);
    if (resolution !== null) resolutionTimes.push(resolution);

    if (createdAt) {
      const diff = response ?? diffHours(createdAt, now);
      if (diff !== null && diff > slaHours) {
        backlogTickets.push(t);
      }
    }
  });

  const backlogSlaCount = backlogTickets.length;
  const backlogSlaRate = total ? (backlogSlaCount / total) * 100 : null;
  const autoResolutionRate = total ? (autoResolved / total) * 100 : null;
  const reopenRate = closed ? (reopened / closed) * 100 : null;
  const satisfactionYesRate =
    feedbackYes + feedbackNo ? (feedbackYes / (feedbackYes + feedbackNo)) * 100 : null;
  const satisfactionNoRate =
    feedbackYes + feedbackNo ? (feedbackNo / (feedbackYes + feedbackNo)) * 100 : null;

  return {
    total,
    open,
    closed,
    responseMedianHours: median(responseTimes),
    responseAvgHours: average(responseTimes),
    resolutionMedianHours: median(resolutionTimes),
    resolutionAvgHours: average(resolutionTimes),
    autoResolutionRate,
    backlogSlaRate,
    backlogSlaCount,
    reopenRate,
    satisfactionYesRate,
    satisfactionNoRate
  };
}

export function groupByStatus(tickets: Ticket[]) {
  const counts: Record<TicketStatus, number> = {
    open: 0,
    in_progress: 0,
    waiting_client: 0,
    waiting_parts: 0,
    closed: 0
  };
  tickets.forEach((t) => {
    counts[t.status] += 1;
  });
  return counts;
}

export function groupByModel(tickets: Ticket[]) {
  const map = new Map<string, number>();
  tickets.forEach((t) => {
    map.set(t.model, (map.get(t.model) ?? 0) + 1);
  });
  return map;
}

export function groupByCause(tickets: Ticket[]) {
  const map = new Map<string, number>();
  tickets.forEach((t) => {
    map.set(t.cause, (map.get(t.cause) ?? 0) + 1);
  });
  return map;
}

export function topEntries(map: Map<string, number>, limit = 5) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

export function formatDate(value: string | null) {
  if (!value) return "-";
  const d = parseDate(value);
  if (!d) return "-";
  return d.toLocaleDateString("fr-FR");
}

export function formatHours(value: number | null) {
  if (value === null || Number.isNaN(value)) return "-";
  if (value >= 24) {
    const days = value / 24;
    return `${days.toFixed(1)} j`;
  }
  return `${value.toFixed(1)} h`;
}

export function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return "-";
  return `${value.toFixed(0)} %`;
}

export function formatTicketStatus(status: TicketStatus) {
  return STATUS_LABELS[status] ?? status;
}

export function computeNextVisit(contract: Contract): Date | null {
  if (contract.nextPlannedVisitDate) {
    const planned = parseDate(contract.nextPlannedVisitDate);
    if (planned) return planned;
  }
  if (!contract.lastVisitDate) return null;
  const last = parseDate(contract.lastVisitDate);
  if (!last) return null;
  const next = new Date(last);
  next.setMonth(next.getMonth() + contract.frequencyMonths);
  return next;
}

export function computeContractStatus(contract: Contract, now = new Date()) {
  const endDate = parseDate(contract.endDate);
  const nextVisit = computeNextVisit(contract);
  const isExpired = endDate ? endDate < now : false;
  const expiresSoon = endDate ? endDate.getTime() - now.getTime() < 60 * 24 * 60 * 60 * 1000 : false;
  const overdue = nextVisit ? nextVisit < now : false;
  const toPlan = !contract.nextPlannedVisitDate;

  const planStatus = isExpired
    ? "Expire"
    : expiresSoon
      ? "Expire bientot"
      : overdue
        ? "En retard"
        : toPlan
          ? "A planifier"
          : "OK";

  let badge = "Actif";
  if (isExpired) badge = "Expire";
  else if (expiresSoon) badge = "Expire bientot";
  else if (overdue) badge = "En retard";
  else if (toPlan) badge = "A planifier";

  return { planStatus, badge, nextVisit };
}
