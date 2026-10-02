import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PortalTopBar from "../components/PortalTopBar";
import { ClientDevicePhoto } from "../components/ClientPark";
import {
  CATEGORIES,
  DIAGNOSTIC_NODES,
  PRODUCTS,
  getDiagnosticStartNode,
  resolveDynamicNext,
  type DiagnosticNode,
  type ProductCatalogItem
} from "../lib/assistantData";

type Step = { nodeId: string; optionIndex?: number; confirmed?: boolean; continued?: boolean };

function CatalogDiagnostic({ product, onBack }: { product: ProductCatalogItem; onBack: () => void }) {
  const [history, setHistory] = useState<Step[]>([{ nodeId: getDiagnosticStartNode(product.id) }]);
  const node: DiagnosticNode | null = history.length ? DIAGNOSTIC_NODES[history[history.length - 1].nodeId] ?? null : null;

  useEffect(() => {
    setHistory([{ nodeId: getDiagnosticStartNode(product.id) }]);
  }, [product.id]);

  return <section className="obera-panel p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold">MODE DIAGNOSTIC CLIENT — USAGE INTERNE OBERA</p>
        <h2 className="text-2xl font-semibold">{product.name}</h2>
      </div>
      <button className="obera-btn-outline" type="button" onClick={onBack}>Changer d’appareil</button>
    </div>
    <ClientDevicePhoto model={product.name} detail />
    {!node && <p role="alert">Diagnostic indisponible pour ce modèle.</p>}
    {node && <>
      <h3 className="text-xl font-semibold">{node.title}</h3>
      {node.type === "question" ? <div className="flex flex-wrap gap-2">
        {node.options.map((option, index) => <button className="obera-btn-outline" type="button" key={option.label}
          onClick={() => setHistory(value => [...value.slice(0, -1),
            { ...value[value.length - 1], optionIndex: index },
            { nodeId: resolveDynamicNext(option.next, product.id) }])}>
          {option.label}
        </button>)}
      </div> : <>
        <p>{node.body}</p>
        <label className="flex gap-2 items-center text-sm"><input type="checkbox"
          checked={history[history.length - 1].confirmed === true}
          onChange={event => setHistory(value => [...value.slice(0, -1),
            { ...value[value.length - 1], confirmed: event.target.checked }])} />
          Je confirme avoir effectué le contrôle proposé, s'il s'applique à cette étape.
        </label>
        {node.next ? <button className="obera-btn-outline" type="button"
          onClick={() => setHistory(value => [...value.slice(0, -1),
            { ...value[value.length - 1], continued: true },
            { nodeId: resolveDynamicNext(node.next!, product.id) }])}>
          Continuer
        </button> : <p role="status" className="font-semibold">
          Fin du parcours guidé. Si le problème persiste, transmettre le cas au SAV.
        </p>}
      </>}
    </>}
    {history.length > 1 && <button className="obera-btn-outline" type="button" onClick={() => setHistory(value => value.slice(0, -1))}>
      Étape précédente
    </button>}
  </section>;
}

export default function CommercialDiagnosticPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ProductCatalogItem | null>(null);
  const [noticeModels, setNoticeModels] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    fetch("/api/internal/catalog/notices", { credentials: "same-origin", cache: "no-store" })
      .then(async response => response.ok ? response.json() as Promise<{ models: string[] }> : { models: [] })
      .then(data => { if (active) setNoticeModels(new Set(data.models)); })
      .catch(() => { if (active) setNoticeModels(new Set()); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return PRODUCTS.filter(product => !normalized || product.name.toLocaleLowerCase("fr").includes(normalized));
  }, [query]);

  return <div className="portal-page">
    <PortalTopBar subtitle="Assistant diagnostic — commercial" showInternalLink={false} />
    <main className="portal-main space-y-5">
      <Link className="underline" to="/">Retour au portail</Link>
      {selected ? <CatalogDiagnostic product={selected} onBack={() => setSelected(null)} /> : <>
        <section className="obera-panel p-5 space-y-3">
          <p className="font-semibold">MODE DIAGNOSTIC CLIENT — USAGE INTERNE OBERA</p>
          <h1 className="text-2xl font-semibold">Assistant diagnostic</h1>
          <p>Choisissez directement le modèle dont vous parle le client. Cet espace n’affiche aucune donnée Client, aucun parc et aucun numéro de série.</p>
          <label className="block">Rechercher un appareil
            <input className="block w-full max-w-lg p-2 border rounded" value={query}
              onChange={event => setQuery(event.target.value)} placeholder="Ex. IC 22, Clearbox, DUSTOMAT…" />
          </label>
        </section>
        {CATEGORIES.map(category => {
          const products = filtered.filter(product => product.category === category.id);
          if (!products.length) return null;
          return <section className="obera-panel p-5 space-y-4" key={category.id}>
            <h2 className="text-xl font-semibold">{category.icon} {category.label}</h2>
            <ul className="client-device-grid">{products.map(product => <li className="client-device-card" key={product.id}>
              <ClientDevicePhoto model={product.name} />
              <div className="space-y-2 min-w-0">
                <h3 className="font-semibold text-lg">{product.name}</h3>
                <div className="client-device-actions">
                  <button className="obera-btn-primary" type="button" onClick={() => setSelected(product)}>Lancer le diagnostic</button>
                  {noticeModels.has(product.name) ? <a className="obera-btn-outline"
                    href={`/api/internal/catalog/notices/${encodeURIComponent(product.name)}`}>Télécharger la notice</a> :
                    <span className="text-sm text-slate-600">Notice indisponible</span>}
                </div>
              </div>
            </li>)}</ul>
          </section>;
        })}
        {filtered.length === 0 && <p className="obera-panel p-5">Aucun appareil trouvé.</p>}
      </>}
    </main>
  </div>;
}
