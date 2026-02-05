import React, { useMemo, useState } from "react";
import { savData } from "../data/savData";
import type { Contract, Ticket } from "../data/savData";
import {
  computeContractStatus,
  computeKPIs,
  computeNextVisit,
  filterContracts,
  filterTickets,
  formatDate,
  formatHours,
  formatPercent,
  formatTicketStatus,
  groupByCause,
  groupByModel,
  groupByStatus,
  rangeToDays,
  topEntries,
  type ContractFilters,
  type TicketFilters,
  type TimeRange
} from "./savUtils";

type TabKey = "stats" | "contracts";

const DEFAULT_TICKET_FILTERS: TicketFilters = {
  range: "90d",
  category: "",
  model: "",
  client: ""
};

const DEFAULT_CONTRACT_FILTERS: ContractFilters = {
  category: "",
  model: "",
  client: "",
  query: ""
};

function KpiCard({
  label,
  value,
  sub
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-2xl font-semibold text-stone-800">{value}</div>
      {sub && <div className="text-xs text-stone-500 mt-1">{sub}</div>}
    </div>
  );
}

function BarList({ items }: { items: { label: string; value: number }[] }) {
  const max = items.reduce((acc, item) => Math.max(acc, item.value), 1);
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-40 text-xs text-stone-600 truncate">{item.label}</div>
          <div className="flex-1">
            <div className="h-2 rounded-full bg-stone-200">
              <div
                className="h-2 rounded-full bg-[#1a3668]"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-xs text-stone-500 w-10 text-right">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function StatusList({ counts }: { counts: Record<string, number> }) {
  const items = Object.entries(counts);
  const max = items.reduce((acc, item) => Math.max(acc, item[1]), 1);
  return (
    <div className="space-y-2">
      {items.map(([label, value]) => (
        <div key={label} className="flex items-center gap-3">
          <div className="w-40 text-xs text-stone-600">{label}</div>
          <div className="flex-1">
            <div className="h-2 rounded-full bg-stone-200">
              <div
                className="h-2 rounded-full bg-[#8bc53f]"
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-xs text-stone-500 w-10 text-right">{value}</div>
        </div>
      ))}
    </div>
  );
}

function TicketDrawer({
  ticket,
  onClose
}: {
  ticket: Ticket | null;
  onClose: () => void;
}) {
  if (!ticket) return null;
  const history = [
    { label: "Demande creee", date: ticket.createdAt },
    ticket.firstResponseAt ? { label: "1er contact", date: ticket.firstResponseAt } : null,
    ticket.closedAt ? { label: "Ticket clos", date: ticket.closedAt } : null
  ].filter(Boolean) as { label: string; date: string }[];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="h-full w-full max-w-md bg-white shadow-xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold text-stone-800">{ticket.id}</div>
          <button
            type="button"
            className="text-sm text-stone-500 hover:text-stone-800"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
        <div className="space-y-3 text-sm text-stone-700">
          <div>
            <div className="text-xs text-stone-500">Client</div>
            <div>{ticket.clientName} ({ticket.clientId})</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Site</div>
            <div>{ticket.site}</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Appareil</div>
            <div>{ticket.model} · {ticket.serial}</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Statut</div>
            <div>{formatTicketStatus(ticket.status)}</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Gravite</div>
            <div>{ticket.severity}</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Cause</div>
            <div>{ticket.cause}</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Canal</div>
            <div>{ticket.resolutionChannel}</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Feedback</div>
            <div>{ticket.feedback ?? "-"}</div>
          </div>
        </div>
        <div className="mt-6">
          <div className="text-sm font-medium text-stone-700 mb-2">Historique</div>
          <div className="space-y-2">
            {history.length === 0 && (
              <div className="text-xs text-stone-500">Aucun historique disponible.</div>
            )}
            {history.map((item) => (
              <div key={item.label} className="flex justify-between text-xs text-stone-600">
                <span>{item.label}</span>
                <span>{formatDate(item.date)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractDrawer({
  contract,
  onClose
}: {
  contract: Contract | null;
  onClose: () => void;
}) {
  if (!contract) return null;
  const status = computeContractStatus(contract);
  const nextVisit = status.nextVisit ? status.nextVisit.toLocaleDateString("fr-FR") : "A planifier";
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="h-full w-full max-w-md bg-white shadow-xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold text-stone-800">{contract.id}</div>
          <button
            type="button"
            className="text-sm text-stone-500 hover:text-stone-800"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
        <div className="space-y-3 text-sm text-stone-700">
          <div>
            <div className="text-xs text-stone-500">Client</div>
            <div>{contract.clientName} ({contract.clientId})</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Site</div>
            <div>{contract.siteAddress}, {contract.siteCity} ({contract.siteCountry})</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Appareils</div>
            <div>
              {contract.devices.map((d) => `${d.model} x${d.qty}`).join(" · ")}
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Frequence</div>
            <div>{contract.frequencyMonths} mois</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Derniere visite</div>
            <div>{formatDate(contract.lastVisitDate)} {contract.lastVisitTech ? `(${contract.lastVisitTech})` : ""}</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Prochaine visite</div>
            <div>{nextVisit}</div>
          </div>
          <div>
            <div className="text-xs text-stone-500">Statut planif</div>
            <div>{status.planStatus}</div>
          </div>
          {contract.notes && (
            <div>
              <div className="text-xs text-stone-500">Notes</div>
              <div>{contract.notes}</div>
            </div>
          )}
        </div>
        <div className="mt-6">
          <div className="text-sm font-medium text-stone-700 mb-2">Historique des visites</div>
          <div className="space-y-2">
            {contract.visitHistory?.length ? (
              contract.visitHistory.map((visit) => (
                <div key={visit.date} className="flex justify-between text-xs text-stone-600">
                  <span>{formatDate(visit.date)}</span>
                  <span>{visit.tech ?? "-"}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-stone-500">Aucune visite enregistree.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SavDashboard({
  onOpenManualSav
}: {
  onOpenManualSav: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("stats");
  const [ticketFilters, setTicketFilters] = useState<TicketFilters>(DEFAULT_TICKET_FILTERS);
  const [contractFilters, setContractFilters] = useState<ContractFilters>(DEFAULT_CONTRACT_FILTERS);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [slaHours, setSlaHours] = useState(24);

  const ticketOptions = useMemo(() => {
    const categories = Array.from(new Set(savData.tickets.map((t) => t.category))).sort();
    const models = Array.from(new Set(savData.tickets.map((t) => t.model))).sort();
    const clients = Array.from(new Set(savData.tickets.map((t) => t.clientName))).sort();
    return { categories, models, clients };
  }, []);

  const contractOptions = useMemo(() => {
    const models = Array.from(
      new Set(savData.contracts.flatMap((c) => c.devices.map((d) => d.model)))
    ).sort();
    const categories = Array.from(new Set(savData.tickets.map((t) => t.category))).sort();
    const clients = Array.from(new Set(savData.contracts.map((c) => c.clientName))).sort();
    return { categories, models, clients };
  }, []);

  const filteredTickets = useMemo(() => {
    return filterTickets(savData.tickets, ticketFilters);
  }, [ticketFilters]);

  const ticketStats = useMemo(() => {
    try {
      return { data: computeKPIs(filteredTickets, slaHours), error: null as string | null };
    } catch (err) {
      return { data: null, error: "Erreur de calcul des statistiques." };
    }
  }, [filteredTickets, slaHours]);

  const statusCounts = useMemo(() => groupByStatus(filteredTickets), [filteredTickets]);
  const topModels = useMemo(() => topEntries(groupByModel(filteredTickets)), [filteredTickets]);
  const topCauses = useMemo(() => topEntries(groupByCause(filteredTickets)), [filteredTickets]);

  const lastTickets = useMemo(() => {
    return [...filteredTickets]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [filteredTickets]);

  const filteredContracts = useMemo(() => {
    return filterContracts(savData.contracts, contractFilters);
  }, [contractFilters]);

  const emptyTickets = filteredTickets.length === 0;
  const emptyContracts = filteredContracts.length === 0;

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-stone-700">Dashboard SAV</h2>
          <p className="text-sm text-stone-500">
            Centre de pilotage simple et lisible.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border border-stone-300 text-sm text-stone-700 hover:bg-stone-100"
            onClick={onOpenManualSav}
          >
            + Saisie manuelle SAV
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className={`px-4 py-2 rounded-lg text-sm ${tab === "stats" ? "bg-[#1a3668] text-white" : "border border-stone-300 text-stone-600"}`}
          onClick={() => setTab("stats")}
        >
          Statistiques
        </button>
        <button
          type="button"
          className={`px-4 py-2 rounded-lg text-sm ${tab === "contracts" ? "bg-[#1a3668] text-white" : "border border-stone-300 text-stone-600"}`}
          onClick={() => setTab("contracts")}
        >
          Contrats de maintenance
        </button>
      </div>

      {tab === "stats" && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-2">
              {(Object.keys(rangeToDays) as TimeRange[]).map((range) => (
                <button
                  key={range}
                  type="button"
                  className={`px-3 py-2 rounded-lg text-xs ${
                    ticketFilters.range === range
                      ? "bg-stone-800 text-white"
                      : "border border-stone-300 text-stone-600"
                  }`}
                  onClick={() => setTicketFilters((prev) => ({ ...prev, range }))}
                >
                  {range === "7d" ? "7j" : range === "30d" ? "30j" : range === "90d" ? "90j" : "12 mois"}
                </button>
              ))}
            </div>
            <select
              className="rounded-lg border border-stone-300 px-3 py-2 text-xs"
              value={ticketFilters.category}
              onChange={(e) => setTicketFilters((prev) => ({ ...prev, category: e.target.value }))}
            >
              <option value="">Toutes categories</option>
              {ticketOptions.categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              className="rounded-lg border border-stone-300 px-3 py-2 text-xs"
              value={ticketFilters.model}
              onChange={(e) => setTicketFilters((prev) => ({ ...prev, model: e.target.value }))}
            >
              <option value="">Tous modeles</option>
              {ticketOptions.models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              className="rounded-lg border border-stone-300 px-3 py-2 text-xs"
              value={ticketFilters.client}
              onChange={(e) => setTicketFilters((prev) => ({ ...prev, client: e.target.value }))}
            >
              <option value="">Tous clients</option>
              {ticketOptions.clients.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              SLA
              <input
                className="w-16 rounded-lg border border-stone-300 px-2 py-1 text-xs"
                value={slaHours}
                onChange={(e) => setSlaHours(Number(e.target.value))}
                type="number"
                min={1}
              />
              h
            </div>
          </div>

          {ticketStats.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {ticketStats.error}
            </div>
          )}

          {ticketStats.data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard label="Demandes totales" value={`${ticketStats.data.total}`} />
                <KpiCard label="Demandes en cours" value={`${ticketStats.data.open}`} />
                <KpiCard label="Demandes closes" value={`${ticketStats.data.closed}`} />
                <KpiCard
                  label="Delai 1er contact"
                  value={`${formatHours(ticketStats.data.responseMedianHours)}`}
                  sub={`Moy: ${formatHours(ticketStats.data.responseAvgHours)}`}
                />
                <KpiCard
                  label="Delai resolution"
                  value={`${formatHours(ticketStats.data.resolutionMedianHours)}`}
                  sub={`Moy: ${formatHours(ticketStats.data.resolutionAvgHours)}`}
                />
                <KpiCard
                  label="Resolution auto"
                  value={formatPercent(ticketStats.data.autoResolutionRate)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard
                  label={`Backlog SLA > ${slaHours}h`}
                  value={formatPercent(ticketStats.data.backlogSlaRate)}
                  sub={`${ticketStats.data.backlogSlaCount} tickets`}
                />
                <KpiCard
                  label="Taux de reouverture"
                  value={formatPercent(ticketStats.data.reopenRate)}
                />
                <KpiCard
                  label="Satisfaction"
                  value={`Oui ${formatPercent(ticketStats.data.satisfactionYesRate)}`}
                  sub={`Non ${formatPercent(ticketStats.data.satisfactionNoRate)}`}
                />
              </div>
            </>
          )}

          {!emptyTickets && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-medium text-stone-700 mb-3">Repartition par statut</div>
                <StatusList
                  counts={{
                    Ouvert: statusCounts.open,
                    "En cours": statusCounts.in_progress,
                    "Attente client": statusCounts.waiting_client,
                    "Attente pieces": statusCounts.waiting_parts,
                    Clos: statusCounts.closed
                  }}
                />
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-medium text-stone-700 mb-3">Top 5 modeles</div>
                <BarList items={topModels} />
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm md:col-span-2">
                <div className="text-sm font-medium text-stone-700 mb-3">Top 5 causes</div>
                <BarList items={topCauses} />
              </div>
            </div>
          )}

          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-medium text-stone-700 mb-3">Dernieres demandes</div>
            {emptyTickets ? (
              <div className="text-sm text-stone-500">Aucune demande sur la periode.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs text-stone-500">
                    <tr className="border-b">
                      <th className="py-2 text-left">Date</th>
                      <th className="py-2 text-left">Client</th>
                      <th className="py-2 text-left">Appareil</th>
                      <th className="py-2 text-left">Statut</th>
                      <th className="py-2 text-left">Gravite</th>
                      <th className="py-2 text-left">1er contact</th>
                      <th className="py-2 text-left">Resolution</th>
                    </tr>
                  </thead>
                  <tbody className="text-stone-700">
                    {lastTickets.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b hover:bg-stone-50 cursor-pointer"
                        onClick={() => setSelectedTicket(t)}
                      >
                        <td className="py-2">{formatDate(t.createdAt)}</td>
                        <td className="py-2">{t.clientName}</td>
                        <td className="py-2">{t.model}</td>
                        <td className="py-2">{formatTicketStatus(t.status)}</td>
                        <td className="py-2">{t.severity}</td>
                        <td className="py-2">
                          {formatHours(
                            t.firstResponseAt
                              ? (new Date(t.firstResponseAt).getTime() -
                                  new Date(t.createdAt).getTime()) /
                                  (1000 * 60 * 60)
                              : null
                          )}
                        </td>
                        <td className="py-2">
                          {formatHours(
                            t.closedAt
                              ? (new Date(t.closedAt).getTime() -
                                  new Date(t.createdAt).getTime()) /
                                  (1000 * 60 * 60)
                              : null
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "contracts" && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              className="rounded-lg border border-stone-300 px-3 py-2 text-xs"
              value={contractFilters.category}
              onChange={(e) =>
                setContractFilters((prev) => ({ ...prev, category: e.target.value }))
              }
            >
              <option value="">Toutes categories</option>
              {contractOptions.categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              className="rounded-lg border border-stone-300 px-3 py-2 text-xs"
              value={contractFilters.model}
              onChange={(e) =>
                setContractFilters((prev) => ({ ...prev, model: e.target.value }))
              }
            >
              <option value="">Tous modeles</option>
              {contractOptions.models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              className="rounded-lg border border-stone-300 px-3 py-2 text-xs"
              value={contractFilters.client}
              onChange={(e) =>
                setContractFilters((prev) => ({ ...prev, client: e.target.value }))
              }
            >
              <option value="">Tous clients</option>
              {contractOptions.clients.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              className="rounded-lg border border-stone-300 px-3 py-2 text-xs"
              placeholder="Recherche (site, ville)"
              value={contractFilters.query}
              onChange={(e) =>
                setContractFilters((prev) => ({ ...prev, query: e.target.value }))
              }
            />
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-stone-300 text-xs text-stone-600"
            >
              Exporter CSV
            </button>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-medium text-stone-700 mb-3">
              Contrats de maintenance
            </div>
            {emptyContracts ? (
              <div className="text-sm text-stone-500">Aucun contrat ne correspond aux filtres.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs text-stone-500">
                    <tr className="border-b">
                      <th className="py-2 text-left">Client</th>
                      <th className="py-2 text-left">Site</th>
                      <th className="py-2 text-left">Appareils</th>
                      <th className="py-2 text-left">Frequence</th>
                      <th className="py-2 text-left">Duree</th>
                      <th className="py-2 text-left">Derniere visite</th>
                      <th className="py-2 text-left">Prochaine visite</th>
                      <th className="py-2 text-left">Planification</th>
                    </tr>
                  </thead>
                  <tbody className="text-stone-700">
                    {filteredContracts.map((c) => {
                      const status = computeContractStatus(c);
                      const nextVisit = status.nextVisit
                        ? status.nextVisit.toLocaleDateString("fr-FR")
                        : "A planifier";
                      return (
                        <tr
                          key={c.id}
                          className="border-b hover:bg-stone-50 cursor-pointer"
                          onClick={() => setSelectedContract(c)}
                        >
                          <td className="py-2">{c.clientName}</td>
                          <td className="py-2">{c.siteCity}</td>
                          <td className="py-2">
                            {c.devices.map((d) => `${d.model} x${d.qty}`).join(" · ")}
                          </td>
                          <td className="py-2">{c.frequencyMonths} mois</td>
                          <td className="py-2">
                            {formatDate(c.startDate)} → {formatDate(c.endDate)}
                          </td>
                          <td className="py-2">
                            {formatDate(c.lastVisitDate)}
                          </td>
                          <td className="py-2">{nextVisit}</td>
                          <td className="py-2">{status.planStatus}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <TicketDrawer ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      <ContractDrawer contract={selectedContract} onClose={() => setSelectedContract(null)} />
    </div>
  );
}
