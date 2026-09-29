import { expect, it } from "vitest";
import { savData } from "./savData";
import {
  computeContractStatus,
  computeKPIs,
  filterTickets,
  groupByStatus,
  type TimeRange
} from "../dashboard/savUtils";

it("contient uniquement des identités et références marquées DEMO, avec les liens contrat/client", () => {
  const { tickets, contracts } = savData;
  expect(tickets).toHaveLength(22);
  expect(contracts).toHaveLength(8);
  expect(new Set(tickets.map((t) => t.id)).size).toBe(22);
  expect(new Set(tickets.map((t) => t.serial)).size).toBe(22);
  expect(new Set(contracts.map((c) => c.id)).size).toBe(8);

  const clientNames = new Map(tickets.map((t) => [t.clientId, t.clientName]));
  for (const ticket of tickets) {
    expect(ticket.id).toMatch(/^DEMO-SAV-\d{3}$/);
    expect(ticket.serial).toMatch(/^DEMO-SN-\d{3}$/);
    expect(ticket.clientId).toMatch(/^DEMO-CL-\d{3}$/);
    expect(ticket.clientName).toMatch(/^CLIENT DEMO [A-Z]+$/);
    expect(ticket.site).toMatch(/^SITE DEMO-\d{3}$/);
    expect(ticket.cause).toMatch(/^DEMO : /);
  }

  for (const contract of contracts) {
    expect(contract.id).toMatch(/^DEMO-CTR-\d{3}$/);
    expect(contract.clientId).toMatch(/^DEMO-CL-\d{3}$/);
    expect(contract.clientName).toBe(clientNames.get(contract.clientId));
    expect(contract.siteAddress).toMatch(/^ADRESSE DEMO-\d{3}$/);
    expect(contract.siteCity).toMatch(/^VILLE DEMO-\d{3}$/);
    expect(contract.siteCountry).toBe("DEMO");
    expect(contract.lastVisitTech).toMatch(/^TECHNICIEN DEMO \d{2}$/);
    for (const visit of contract.visitHistory ?? []) {
      expect(visit.tech).toMatch(/^TECHNICIEN DEMO \d{2}$/);
    }
    if (contract.notes) expect(contract.notes).toMatch(/^NOTE DEMO \d{3} : /);
  }
});

it("préserve les répartitions, périodes et KPI du tableau de bord de référence", () => {
  const { tickets } = savData;
  expect(groupByStatus(tickets)).toEqual({
    open: 3, in_progress: 4, waiting_client: 2, waiting_parts: 2, closed: 11
  });
  expect(tickets.reduce<Record<string, number>>((counts, ticket) => {
    counts[ticket.category] = (counts[ticket.category] ?? 0) + 1;
    return counts;
  }, {})).toEqual({ rafraichisseurs: 6, depoussiereurs: 7, purificateurs: 7, "tables-aspirantes": 2 });
  expect(tickets.filter((t) => t.severity === "critical")).toHaveLength(2);
  expect(tickets.filter((t) => t.severity === "high")).toHaveLength(6);
  expect(tickets.filter((t) => t.severity === "medium")).toHaveLength(10);
  expect(tickets.filter((t) => t.severity === "low")).toHaveLength(4);
  expect(tickets.filter((t) => t.resolutionChannel === "assistant")).toHaveLength(10);
  expect(tickets.filter((t) => t.reopened)).toHaveLength(2);
  expect(tickets.filter((t) => t.feedback === "yes")).toHaveLength(8);
  expect(tickets.filter((t) => t.feedback === "no")).toHaveLength(3);
  expect(tickets.filter((t) => !t.firstResponseAt)).toHaveLength(1);

  const expected: Record<TimeRange, [number, number, number, number]> = {
    "7d": [7, 6, 1, 5],
    "30d": [15, 10, 5, 5],
    "90d": [20, 11, 9, 7],
    "12m": [22, 11, 11, 7]
  };
  for (const range of Object.keys(expected) as TimeRange[]) {
    const filtered = filterTickets(tickets, { range, category: "", model: "", client: "" });
    const kpi = computeKPIs(filtered, 24);
    expect([kpi.total, kpi.open, kpi.closed, kpi.backlogSlaCount]).toEqual(expected[range]);
  }
  const kpi = computeKPIs(tickets, 24);
  expect(kpi.responseMedianHours).toBe(24);
  expect(kpi.resolutionMedianHours).toBe(120);
  expect(kpi.autoResolutionRate).toBeCloseTo(45.45, 2);
  expect(kpi.reopenRate).toBeCloseTo(18.18, 2);
  expect(kpi.satisfactionYesRate).toBeCloseTo(72.73, 2);
});

it("conserve les scénarios de contrats expirés, proches expiration et visites planifiées", () => {
  const { contracts } = savData;
  expect(contracts.filter((c) => c.frequencyMonths === 6)).toHaveLength(5);
  expect(contracts.filter((c) => c.nextPlannedVisitDate)).toHaveLength(3);
  expect(contracts.filter((c) => c.notes)).toHaveLength(6);
  expect(contracts.flatMap((c) => c.visitHistory ?? [])).toHaveLength(8);
  expect(contracts.filter((c) => computeContractStatus(c).badge === "Expire")).toHaveLength(1);
  expect(contracts.filter((c) => computeContractStatus(c).badge === "Expire bientot")).toHaveLength(2);
});
