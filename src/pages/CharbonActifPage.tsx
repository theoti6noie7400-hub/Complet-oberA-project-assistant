import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  HelpCircle,
  RefreshCw,
  Sparkles
} from "lucide-react";
import {
  DUPLICATE_NAMES,
  FILTER_REFERENCES,
  GROUPS,
  MIX_PRESETS,
  POLLUANTS,
  buildReportText,
  calcMixSaturation,
  calcMonoSaturation,
  clamp,
  displayPolluant,
  formatKg,
  formatPct,
  parseNumberLoose,
  pickRepresentativePolluantsForGroups,
  statusFromSaturation,
  tryCopyText,
  type FilterRef,
  type GroupKey,
  type MixItem,
  type ModePolluant,
  type Polluant
} from "../lib/charbon";

const statusIconMap = {
  alert: AlertTriangle,
  check: CheckCircle2,
  help: HelpCircle
} as const;

function buttonClass(variant: "default" | "outline" | "destructive" = "default") {
  const base =
    "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-2xl transition";
  if (variant === "outline") {
    return `${base} border border-stone-300 text-stone-700 hover:bg-stone-100`;
  }
  if (variant === "destructive") {
    return `${base} bg-red-600 text-white hover:bg-red-700`;
  }
  return `${base} obera-blue text-white hover:opacity-95`;
}

function badgeClass(variant: "default" | "outline" | "destructive" | "secondary") {
  const base = "inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-medium";
  if (variant === "destructive") return `${base} bg-red-100 text-red-700`;
  if (variant === "outline") return `${base} border border-yellow-300 text-yellow-700`;
  if (variant === "secondary") return `${base} bg-stone-200 text-stone-600`;
  return `${base} bg-green-100 text-green-700`;
}

function ImageThumb({ src, alt, size = 44 }: { src?: string; alt: string; size?: number }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      className="rounded-xl border object-cover bg-background"
      style={{ width: size, height: size }}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

export default function CharbonActifPage() {
  const [filterId, setFilterId] = useState<FilterRef["id"]>(
    FILTER_REFERENCES.EPUREX_1000.id
  );
  const [mode, setMode] = useState<ModePolluant>("mono");
  const [polluantId, setPolluantId] = useState<string>(POLLUANTS[0]?.id ?? "");
  const [polluantSearch, setPolluantSearch] = useState<string>("");
  const [groupFilter, setGroupFilter] = useState<GroupKey | "ALL">("ALL");
  const [mixPresetId, setMixPresetId] = useState<string>(MIX_PRESETS[0]?.id ?? "");
  const [mixItems, setMixItems] = useState<MixItem[]>([
    { polluantId: POLLUANTS[0]?.id ?? "", sharePct: "" },
    { polluantId: POLLUANTS[1]?.id ?? POLLUANTS[0]?.id ?? "", sharePct: "" }
  ]);
  const [poidsMesureStr, setPoidsMesureStr] = useState<string>("");
  const [humiditeStr, setHumiditeStr] = useState<string>("");
  const [temperatureStr, setTemperatureStr] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");
  const [operatorName, setOperatorName] = useState<string>("");
  const [deviceSerial, setDeviceSerial] = useState<string>("");
  const [reportDate, setReportDate] = useState<string>("");
  const [copiedState, setCopiedState] = useState<"idle" | "copied" | "failed">(
    "idle"
  );
  const [reportPreview, setReportPreview] = useState<string>("");
  const [showReportPreview, setShowReportPreview] = useState<boolean>(false);

  const filter = useMemo(() => {
    const f = Object.values(FILTER_REFERENCES).find((x) => x.id === filterId);
    return f ?? FILTER_REFERENCES.EPUREX_1000;
  }, [filterId]);

  const supportKg = useMemo(() => {
    const s = filter.poidsNeufBrutKg - filter.poidsCharbonNetKg;
    return Number.isFinite(s) ? Math.max(0, s) : NaN;
  }, [filter.poidsNeufBrutKg, filter.poidsCharbonNetKg]);

  const polluant = useMemo(() => {
    return POLLUANTS.find((p) => p.id === polluantId) ?? POLLUANTS[0];
  }, [polluantId]);

  const filteredPolluants = useMemo(() => {
    const q = polluantSearch.trim();
    const norm = (s: string) =>
      s
        .toLowerCase()
        .replace(/\([^)]*\)/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    const base =
      groupFilter === "ALL" ? POLLUANTS : POLLUANTS.filter((p) => p.group === groupFilter);
    if (!q) return base;
    const nq = norm(q);
    return base.filter(
      (p) =>
        norm(p.label).includes(nq) ||
        norm(p.name).includes(nq) ||
        norm(GROUPS[p.group].label).includes(nq)
    );
  }, [polluantSearch, groupFilter]);

  const poidsMesure = useMemo(
    () => parseNumberLoose(poidsMesureStr),
    [poidsMesureStr]
  );
  const humidite = useMemo(() => parseNumberLoose(humiditeStr), [humiditeStr]);
  const temperature = useMemo(
    () => parseNumberLoose(temperatureStr),
    [temperatureStr]
  );

  const gain = useMemo(() => {
    if (!Number.isFinite(poidsMesure)) return NaN;
    return poidsMesure - filter.poidsNeufBrutKg;
  }, [poidsMesure, filter.poidsNeufBrutKg]);

  const monoResult = useMemo(() => {
    const g = GROUPS[polluant.group];
    return calcMonoSaturation(gain, filter.poidsCharbonNetKg, g.avg);
  }, [gain, filter.poidsCharbonNetKg, polluant.group]);

  const mixResult = useMemo(() => {
    const items = mixItems
      .map((it) => {
        const p = POLLUANTS.find((x) => x.id === it.polluantId);
        const avg = p ? GROUPS[p.group].avg : NaN;
        const sharePct = parseNumberLoose(it.sharePct);
        const share01 = Number.isFinite(sharePct)
          ? clamp(sharePct, 0, 100) / 100
          : undefined;
        return {
          avg,
          share01
        };
      })
      .filter((x) => Number.isFinite(x.avg));

    return calcMixSaturation(gain, filter.poidsCharbonNetKg, items);
  }, [mixItems, gain, filter.poidsCharbonNetKg]);

  const activeCapaciteMax =
    mode === "mono" ? monoResult.capaciteMaxKg : mixResult.conservative.capaciteMaxKg;
  const activeSaturation =
    mode === "mono" ? monoResult.saturationPct : mixResult.conservative.saturationPct;

  const saturationClamped = useMemo(() => {
    return Number.isFinite(activeSaturation) ? clamp(activeSaturation, 0, 500) : NaN;
  }, [activeSaturation]);

  const status = statusFromSaturation(saturationClamped);
  const StatusIcon = statusIconMap[status.icon];

  const warnings = useMemo(() => {
    const w: string[] = [];
    if (poidsMesureStr.trim().length > 0 && !Number.isFinite(poidsMesure)) {
      w.push("Poids brut mesuré invalide : utilisez un nombre (virgule ou point).");
    }
    if (humiditeStr.trim().length > 0) {
      if (!Number.isFinite(humidite)) {
        w.push("Humidité invalide : utilisez un nombre.");
      } else if (humidite < 0 || humidite > 100) {
        w.push("Humidité hors plage 0-100% : vérifiez la saisie.");
      }
    }
    if (temperatureStr.trim().length > 0 && !Number.isFinite(temperature)) {
      w.push("Température invalide : utilisez un nombre.");
    }
    if (Number.isFinite(humidite) && humidite > 70) {
      w.push("Humidite > 70% : adsorption potentiellement degradee.");
    }
    if (Number.isFinite(temperature) && temperature > 60) {
      w.push("Temperature > 60C : adsorption potentiellement degradee.");
    }
    if (Number.isFinite(gain) && gain < 0) {
      w.push("Poids mesure inferieur au poids neuf : verifier la saisie ou l'etat du filtre.");
    }

    if (
      Number.isFinite(gain) &&
      Number.isFinite(activeCapaciteMax) &&
      activeCapaciteMax > 0
    ) {
      const pct = (gain / activeCapaciteMax) * 100;
      if (pct > 250) {
        w.push("Saturation > 250% : possible erreur de saisie (kg/g) ou mesure.");
      }
    }

    if (mode === "mono") {
      if (polluant.group === "4") {
        w.push(
          "Polluant groupe 4 : adsorption nulle ou quasi nulle (calcul % peu pertinent)."
        );
      }
      if (DUPLICATE_NAMES.has(polluant.name)) {
        w.push(
          "Ce polluant existe dans plusieurs groupes dans la doc. Verifier le type de charbon (standard vs impregne/traite)."
        );
      }
    } else {
      const selectedPolluants = mixItems
        .map((it) => POLLUANTS.find((p) => p.id === it.polluantId))
        .filter(Boolean) as Polluant[];
      const hasInvalidShare = mixItems.some((it) => {
        if (!it.sharePct.trim()) return false;
        return !Number.isFinite(parseNumberLoose(it.sharePct));
      });
      const hasOutOfRangeShare = mixItems.some((it) => {
        const parsed = parseNumberLoose(it.sharePct);
        return Number.isFinite(parsed) && (parsed < 0 || parsed > 100);
      });

      if (selectedPolluants.some((p) => p.group === "4")) {
        w.push(
          "Melange contient un polluant groupe 4 : la decision est basee sur un calcul conservateur. Si ce polluant domine, le charbon standard peut etre inefficace."
        );
      }
      if (hasInvalidShare) {
        w.push("Une ou plusieurs proportions melange (%) sont invalides.");
      }
      if (hasOutOfRangeShare) {
        w.push("Les proportions melange hors plage 0-100% sont limitees automatiquement.");
      }
      const anyShare = mixItems.some((it) => it.sharePct.trim().length > 0);
      if (!anyShare) {
        w.push(
          "Proportions melange non renseignees : estimation a parts egales + decision conservatrice (pire cas)."
        );
      }
    }

    return w;
  }, [poidsMesureStr, poidsMesure, humiditeStr, humidite, temperatureStr, temperature, gain, mode, polluant.group, polluant.name, mixItems, activeCapaciteMax]);

  const polluantsForSelect = useMemo(() => {
    return groupFilter === "ALL" ? POLLUANTS : POLLUANTS.filter((p) => p.group === groupFilter);
  }, [groupFilter]);

  const reset = () => {
    setFilterId(FILTER_REFERENCES.EPUREX_1000.id);
    setMode("mono");
    setPolluantId(POLLUANTS[0]?.id ?? "");
    setPolluantSearch("");
    setGroupFilter("ALL");
    setMixPresetId(MIX_PRESETS[0]?.id ?? "");
    setMixItems([
      { polluantId: POLLUANTS[0]?.id ?? "", sharePct: "" },
      { polluantId: POLLUANTS[1]?.id ?? POLLUANTS[0]?.id ?? "", sharePct: "" }
    ]);
    setPoidsMesureStr("");
    setHumiditeStr("");
    setTemperatureStr("");
    setClientName("");
    setOperatorName("");
    setDeviceSerial("");
    setReportDate("");
    setCopiedState("idle");
    setReportPreview("");
    setShowReportPreview(false);
  };

  const applyPreset = () => {
    const preset = MIX_PRESETS.find((p) => p.id === mixPresetId) ?? MIX_PRESETS[0];
    const picked = pickRepresentativePolluantsForGroups(preset.groups, POLLUANTS);
    if (picked.length === 0) return;
    setMode("melange");
    setMixItems(picked.map((p) => ({ polluantId: p.id, sharePct: "" })));
    setPolluantSearch("");
    setGroupFilter("ALL");
  };

  const buildCurrentReport = () => {
    const dateIso = new Date().toISOString();

    const polluants =
      mode === "mono"
        ? [polluant]
        : (mixItems
            .map((it) => POLLUANTS.find((p) => p.id === it.polluantId))
            .filter(Boolean) as Polluant[]);

    const shares = mode === "mono" ? [undefined] : mixItems.map((it) => it.sharePct);

    return buildReportText({
      dateIso,
      dateClient: reportDate,
      clientName,
      operatorName,
      deviceSerial,
      mode,
      reference: filter,
      polluants,
      shares,
      poidsMesureKg: poidsMesure,
      gainKg: gain,
      charbonNetKg: filter.poidsCharbonNetKg,
      supportKg,
      resultDecision: {
        capaciteMaxKg: activeCapaciteMax,
        saturationPct: saturationClamped
      },
      resultEstimated:
        mode === "melange"
          ? {
              capaciteMaxKg: mixResult.estimated.capaciteMaxKg,
              saturationPct: clamp(mixResult.estimated.saturationPct, 0, 500),
              avgUsed: mixResult.estimated.avgUsed
            }
          : undefined,
      resultConservative:
        mode === "melange"
          ? {
              capaciteMaxKg: mixResult.conservative.capaciteMaxKg,
              saturationPct: clamp(mixResult.conservative.saturationPct, 0, 500),
              avgUsed: mixResult.conservative.avgUsed
            }
          : undefined,
      humidite,
      temperature
    });
  };

  const copyReport = async () => {
    const report = buildCurrentReport();
    setReportPreview(report);
    setCopiedState("idle");
    setShowReportPreview(false);

    const ok = await tryCopyText(report);
    if (ok) {
      setCopiedState("copied");
      setShowReportPreview(false);
      window.setTimeout(() => setCopiedState("idle"), 2500);
    } else {
      setCopiedState("failed");
      setShowReportPreview(true);
    }
  };

  return (
    <div className="min-h-screen w-full bg-stone-100 p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Calculateur de saturation du charbon actif
            </h1>
            <p className="text-sm text-stone-500">
              Selectionne le polluant (ou melange), la reference, puis saisis le poids brut mesure.
            </p>
          </div>
          <Link to="/" className={buttonClass("outline")}>
            Retour assistant
          </Link>
        </div>

        {showReportPreview && (
          <div className="rounded-2xl border bg-white shadow-sm p-4 md:p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Rapport (copie manuelle)</div>
              <button
                type="button"
                className={buttonClass("outline")}
                onClick={async () => {
                  const ok = await tryCopyText(reportPreview);
                  setCopiedState(ok ? "copied" : "failed");
                  if (ok) setShowReportPreview(false);
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Retenter copie
              </button>
            </div>
            <div className="text-xs text-stone-500">
              Si la copie automatique est bloquee, clique dans le champ (selectionne tout), puis Ctrl+C.
            </div>
            <textarea
              className="w-full min-h-[220px] rounded-2xl border bg-white p-3 text-xs"
              value={reportPreview}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
        )}

        <div className="rounded-2xl bg-white shadow-sm p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference filtre</label>
              <select
                value={filterId}
                onChange={(e) => setFilterId(e.target.value as FilterRef["id"])}
                className="w-full rounded-2xl border p-2"
              >
                {Object.values(FILTER_REFERENCES).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>

              <div className="mt-2 flex items-start gap-3">
                <ImageThumb src={filter.image} alt={filter.label} size={56} />
                <div className="text-xs text-stone-500">
                  <div className="font-medium text-stone-700">{filter.label}</div>
                  Poids neuf brut:{" "}
                  <span className="font-medium">{filter.poidsNeufBrutKg.toFixed(2)} kg</span> · Charbon net:{" "}
                  <span className="font-medium">{filter.poidsCharbonNetKg.toFixed(2)} kg</span> · Support:{" "}
                  <span className="font-medium">{formatKg(supportKg)}</span>
                </div>
              </div>

              <div className="text-xs text-stone-500">
                Images: place-les dans <span className="font-medium">/public/products/</span> (ex: can1500.jpg). Si une image manque, elle se masque.
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as ModePolluant)}
                className="w-full rounded-2xl border p-2"
              >
                <option value="mono">1 polluant</option>
                <option value="melange">Melange de polluants</option>
              </select>
              <div className="text-xs text-stone-500">
                En mode melange, la decision est basee sur le calcul <span className="font-medium">conservateur</span>.
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Recherche polluant</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="md:col-span-1">
                  <select
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value as GroupKey | "ALL")}
                    className="w-full rounded-2xl border p-2"
                  >
                    <option value="ALL">Tous les groupes</option>
                    <option value="1">Groupe 1</option>
                    <option value="2">Groupe 2</option>
                    <option value="3">Groupe 3</option>
                    <option value="4">Groupe 4</option>
                  </select>
                </div>

                <div className="md:col-span-2 relative">
                  <input
                    className="w-full rounded-2xl border p-2"
                    placeholder="Rechercher un polluant..."
                    value={polluantSearch}
                    onChange={(e) => setPolluantSearch(e.target.value)}
                  />

                  {polluantSearch.trim().length > 0 && (
                    <div className="absolute z-50 mt-2 w-full rounded-2xl border bg-white shadow-sm overflow-hidden">
                      {filteredPolluants.length === 0 ? (
                        <div className="p-3 text-sm text-stone-500">Aucun resultat</div>
                      ) : (
                        <div className="max-h-64 overflow-auto">
                          {filteredPolluants.slice(0, 12).map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-stone-100"
                              onClick={() => {
                                if (mode === "mono") {
                                  setPolluantId(p.id);
                                } else {
                                  setMixItems((prev) => {
                                    const next = [...prev];
                                    const emptyIdx = next.findIndex((x) => !x.polluantId);
                                    if (emptyIdx >= 0) {
                                      next[emptyIdx] = { ...next[emptyIdx], polluantId: p.id };
                                    } else {
                                      next[next.length - 1] = {
                                        ...next[next.length - 1],
                                        polluantId: p.id
                                      };
                                    }
                                    return next;
                                  });
                                }
                                setPolluantSearch("");
                              }}
                            >
                              <div className="font-medium">{displayPolluant(p)}</div>
                              <div className="text-xs text-stone-500">
                                {(GROUPS[p.group].avg * 100).toFixed(0)}% · {GROUPS[p.group].label}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {mode === "mono" ? (
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Polluant</label>
                <select
                  value={polluantId}
                  onChange={(e) => setPolluantId(e.target.value)}
                  className="w-full rounded-2xl border p-2"
                >
                  {polluantsForSelect.map((p) => (
                    <option key={p.id} value={p.id}>
                      {`G${p.group} - ${displayPolluant(p)}`}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-stone-500">
                  {GROUPS[polluant.group].label} · capacite moyenne appliquee:{" "}
                  <span className="font-medium">{(GROUPS[polluant.group].avg * 100).toFixed(0)}%</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 md:col-span-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Melange (option: % de chaque polluant)</label>
                  <div className="text-xs text-stone-500">
                    Si les % sont vides, on suppose des parts egales. La decision de remplacement utilise le <span className="font-medium">pire cas</span>.
                  </div>
                </div>

                <div className="rounded-2xl border p-4 space-y-2">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Je ne sais pas (profil)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="md:col-span-2">
                      <select
                        value={mixPresetId}
                        onChange={(e) => setMixPresetId(e.target.value)}
                        className="w-full rounded-2xl border p-2"
                      >
                        {MIX_PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="button" className={buttonClass()} onClick={applyPreset}>
                      Appliquer
                    </button>
                  </div>
                  <div className="text-xs text-stone-500">
                    {MIX_PRESETS.find((p) => p.id === mixPresetId)?.note ?? ""}
                  </div>
                </div>

                <div className="space-y-2">
                  {mixItems.map((it, idx) => {
                    const p = POLLUANTS.find((x) => x.id === it.polluantId) ?? null;
                    return (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                        <div className="md:col-span-4">
                          <select
                            value={it.polluantId}
                            onChange={(e) =>
                              setMixItems((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], polluantId: e.target.value };
                                return next;
                              })
                            }
                            className="w-full rounded-2xl border p-2"
                          >
                            {polluantsForSelect.map((pp) => (
                              <option key={`${pp.id}__${idx}`} value={pp.id}>
                                {`G${pp.group} - ${displayPolluant(pp)}`}
                              </option>
                            ))}
                          </select>
                          {p && (
                            <div className="text-xs text-stone-500 mt-1">
                              {GROUPS[p.group].label} · {(GROUPS[p.group].avg * 100).toFixed(0)}%
                            </div>
                          )}
                        </div>

                        <div className="md:col-span-1">
                          <input
                            className="w-full rounded-2xl border p-2"
                            inputMode="decimal"
                            placeholder="%"
                            value={it.sharePct}
                            onChange={(e) =>
                              setMixItems((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], sharePct: e.target.value };
                                return next;
                              })
                            }
                          />
                        </div>

                        <div className="md:col-span-1 flex gap-2 justify-end">
                          <button
                            type="button"
                            className={buttonClass("outline")}
                            onClick={() => setMixItems((prev) => prev.filter((_, i) => i !== idx))}
                            disabled={mixItems.length <= 1}
                          >
                            Retirer
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={buttonClass("outline")}
                      onClick={() => setMixItems((prev) => [...prev, { polluantId: "", sharePct: "" }])}
                    >
                      Ajouter un polluant
                    </button>
                    <button
                      type="button"
                      className={buttonClass("outline")}
                      onClick={() =>
                        setMixItems((prev) => prev.map((x) => ({ ...x, sharePct: "" })))
                      }
                    >
                      Effacer les %
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Poids brut mesure (kg)</label>
              <input
                className="w-full rounded-2xl border p-2"
                inputMode="decimal"
                placeholder="Ex: 8,30"
                value={poidsMesureStr}
                onChange={(e) => setPoidsMesureStr(e.target.value)}
              />
              <div className="text-xs text-stone-500">Saisie acceptee avec virgule ou point.</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Humidite (%)</label>
                <input
                  className="w-full rounded-2xl border p-2"
                  inputMode="decimal"
                  placeholder="Optionnel"
                  value={humiditeStr}
                  onChange={(e) => setHumiditeStr(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Temperature (C)</label>
                <input
                  className="w-full rounded-2xl border p-2"
                  inputMode="decimal"
                  placeholder="Optionnel"
                  value={temperatureStr}
                  onChange={(e) => setTemperatureStr(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Infos rapport (optionnel)</label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input
                  className="w-full rounded-2xl border p-2"
                  placeholder="Nom du client"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
                <input
                  className="w-full rounded-2xl border p-2"
                  placeholder="Operateur"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                />
                <input
                  className="w-full rounded-2xl border p-2"
                  placeholder="SN appareil"
                  value={deviceSerial}
                  onChange={(e) => setDeviceSerial(e.target.value)}
                />
                <input
                  className="w-full rounded-2xl border p-2"
                  placeholder="Date (YYYY-MM-DD)"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                />
              </div>
              <div className="text-xs text-stone-500">Ces champs sont inclus dans le rapport si renseignes.</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border p-4">
              <div className="text-xs text-stone-500">Gain (adsorption)</div>
              <div className="text-2xl font-semibold">{formatKg(gain)}</div>
              <div className="text-xs text-stone-500 mt-1">gain = poids mesure - poids neuf</div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="text-xs text-stone-500">Capacite max (pour decision)</div>
              <div className="text-2xl font-semibold">{formatKg(activeCapaciteMax)}</div>
              <div className="text-xs text-stone-500 mt-1">
                {mode === "mono" ? "charbon net x capacite moyenne" : "charbon net x capacite (pire cas)"}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-stone-500">Saturation (pour decision)</div>
                  <div className="text-2xl font-semibold">{formatPct(saturationClamped)}</div>
                </div>
                <span className={badgeClass(status.tone)}>
                  <StatusIcon className="h-4 w-4" />
                  {status.label}
                </span>
              </div>
              <div className="text-xs text-stone-500 mt-1">(gain / capacite max) x 100</div>
            </div>
          </div>

          {mode === "melange" && (
            <div className="rounded-2xl border p-4 space-y-2">
              <div className="text-sm font-medium">Details melange</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-stone-500">Estimation (parts / %)</div>
                  <div className="text-lg font-semibold">
                    {formatPct(clamp(mixResult.estimated.saturationPct, 0, 500))}
                  </div>
                  <div className="text-xs text-stone-500">
                    avg utilise: {(mixResult.estimated.avgUsed * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-stone-500">
                    capacite: {formatKg(mixResult.estimated.capaciteMaxKg)}
                  </div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-stone-500">Conservateur (pire cas)</div>
                  <div className="text-lg font-semibold">
                    {formatPct(clamp(mixResult.conservative.saturationPct, 0, 500))}
                  </div>
                  <div className="text-xs text-stone-500">
                    avg critique: {(mixResult.conservative.avgUsed * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-stone-500">
                    capacite: {formatKg(mixResult.conservative.capaciteMaxKg)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-stone-500">
                La valeur "Conservateur" est celle utilisee pour le badge et la decision (c'est la plus sure).
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-2xl border border-yellow-500/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                Points d'attention
              </div>
              <ul className="list-disc pl-5 text-sm text-stone-500 space-y-1">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
            <div className="text-xs text-stone-500">
              Seuils recommandes: OK &lt; 70% · A surveiller 70-75% · A remplacer a partir de 75% · Sature a partir de 100%
            </div>
            <div className="flex gap-2 items-center">
              <button className={buttonClass("outline")} onClick={copyReport}>
                <Copy className="h-4 w-4 mr-2" />
                Copier rapport
              </button>
              {copiedState === "copied" && (
                <span className="text-xs text-stone-500">Copie OK</span>
              )}
              {copiedState === "failed" && (
                <span className="text-xs text-stone-500">Copie bloquee - champ manuel affiche</span>
              )}
              <button className={buttonClass("outline")} onClick={reset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reinitialiser
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm p-4 md:p-6 space-y-2">
          <div className="text-sm font-medium">Ameliorations possibles</div>
          <ul className="list-disc pl-5 text-sm text-stone-500 space-y-1">
            <li>Ajouter numero de serie / site client / operateur pour fiabiliser le rapport.</li>
            <li>Ajouter un export fichier (TXT/PDF) si l'environnement le permet.</li>
            <li>Ajouter un indicateur d'humidite de fonctionnement (si capteur dispo) pour mieux expliquer les ecarts.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
