import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PortalTopBar from "../components/PortalTopBar";
import { ClientDevicePhoto } from "../components/ClientPark";
import {
  CATEGORIES,
  PRODUCTS,
  getDiagnosticStartNode,
  type ProductCatalogItem
} from "../lib/assistantData";
import {
  COMMERCIAL_CATEGORY_LABELS,
  COMMERCIAL_EXCLUDED_PRODUCT_IDS,
  FINAL_RESOLVED_NODE_IDS,
  IC22_KM22_DISMANTLING_VIDEO_URL,
  IC22_VIDEO_HELP_NODE_IDS,
  commercialDiagnosticNode,
  commercialProductLabel,
  commercialProductMatchesQuery,
  resolveCommercialNext
} from "../lib/commercialDiagnosticOverrides";

type Step = { nodeId: string; optionIndex?: number; confirmed?: boolean; continued?: boolean };

type ContactFormProps = {
  product: ProductCatalogItem;
  history: Step[];
  onClose?: () => void;
};

function ContactSavForm({ product, history, onClose }: ContactFormProps) {
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const displayName = commercialProductLabel(product);

  const trace = useMemo(() => history.map((step) => {
    const node = commercialDiagnosticNode(step.nodeId, product.id);
    if (!node) return null;
    if (node.type === "question") {
      const answer = step.optionIndex === undefined ? null : node.options[step.optionIndex]?.label;
      return answer ? `${node.title} — Réponse : ${answer}` : node.title;
    }
    return `${node.title} — ${node.body}${step.confirmed ? " — contrôle effectué" : ""}`;
  }).filter(Boolean).join("\n"), [history, product.id]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!company.trim() || !contactName.trim()) {
      setError("Renseignez au minimum la société et le nom du contact.");
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setError("Renseignez au moins un téléphone ou un e-mail.");
      return;
    }
    setError("");
    const subject = `Transmission diagnostic - ${displayName} - ${company.trim()}`;
    const body = [
      `Société : ${company.trim()}`,
      `Contact : ${contactName.trim()}`,
      `Téléphone : ${phone.trim() || "-"}`,
      `E-mail : ${email.trim() || "-"}`,
      `Appareil : ${displayName}`,
      "",
      "Parcours diagnostic :",
      trace || "Aucune étape enregistrée.",
      "",
      `Commentaire : ${comment.trim() || "-"}`
    ].join("\n");
    window.location.href = `mailto:sav@obera.fr?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return <form onSubmit={submit} className="border-t pt-4 space-y-3" aria-label="Contacter le SAV">
    <div>
      <h4 className="text-lg font-semibold">Contacter le SAV</h4>
      <p className="text-sm text-slate-600">Si vous préférez ne pas poursuivre le diagnostic, vous pouvez transmettre directement la demande. Le parcours déjà effectué sera ajouté au message.</p>
    </div>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="block">Société / client
        <input className="block w-full p-2 border rounded" value={company} onChange={event => setCompany(event.target.value)} maxLength={200} required />
      </label>
      <label className="block">Nom du contact
        <input className="block w-full p-2 border rounded" value={contactName} onChange={event => setContactName(event.target.value)} maxLength={200} required />
      </label>
      <label className="block">Téléphone
        <input className="block w-full p-2 border rounded" value={phone} onChange={event => setPhone(event.target.value)} maxLength={80} />
      </label>
      <label className="block">E-mail
        <input className="block w-full p-2 border rounded" type="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={200} />
      </label>
    </div>
    <label className="block">Commentaire complémentaire
      <textarea className="block w-full p-2 border rounded min-h-24" value={comment}
        onChange={event => setComment(event.target.value)} maxLength={2000} />
    </label>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button className="obera-btn-primary" type="submit">Préparer le message au SAV</button>
      {onClose && <button className="obera-btn-outline" type="button" onClick={onClose}>Revenir au diagnostic</button>}
    </div>
  </form>;
}

function CatalogDiagnostic({ product, onBack }: { product: ProductCatalogItem; onBack: () => void }) {
  const [history, setHistory] = useState<Step[]>([{ nodeId: getDiagnosticStartNode(product.id) }]);
  const [contactVisible, setContactVisible] = useState(false);
  const [resolved, setResolved] = useState(false);
  const current = history[history.length - 1];
  const node = current ? commercialDiagnosticNode(current.nodeId, product.id) : null;
  const displayName = commercialProductLabel(product);

  useEffect(() => {
    setHistory([{ nodeId: getDiagnosticStartNode(product.id) }]);
    setContactVisible(false);
    setResolved(false);
  }, [product.id]);

  const goNext = (next: string) => {
    if (!node) return;
    setContactVisible(false);
    setResolved(false);
    setHistory(value => [...value.slice(0, -1),
      { ...value[value.length - 1], continued: true },
      { nodeId: resolveCommercialNext(node.id, next, product.id) }]);
  };

  const choose = (next: string, index: number) => {
    if (!node) return;
    setContactVisible(false);
    setResolved(false);
    setHistory(value => [...value.slice(0, -1),
      { ...value[value.length - 1], optionIndex: index },
      { nodeId: resolveCommercialNext(node.id, next, product.id) }]);
  };

  const confirmed = current?.confirmed === true;
  const showVideo = product.id === "ic22" && node && IC22_VIDEO_HELP_NODE_IDS.has(node.id);
  const terminalResolved = node?.type === "text" && !node.next && node.target === "resolved";
  const alreadyResolved = Boolean(node && FINAL_RESOLVED_NODE_IDS.has(node.id));
  const terminalNeedsSav = node?.type === "text" && !node.next && node.target !== "resolved";
  const terminalSavMessage = node?.id === "pump-runs-still-no-cooling"
    ? "Le circuit d’eau et la pompe ont déjà été contrôlés. Contactez le SAV pour conseil sur les panneaux évaporatifs ou les conditions d’utilisation."
    : "Le problème nécessite une prise en charge par le SAV.";

  return <section className="obera-panel p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold">MODE DIAGNOSTIC CLIENT — USAGE INTERNE OBERA</p>
        <h2 className="text-2xl font-semibold">{displayName}</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="obera-btn-outline" type="button" onClick={() => setContactVisible(true)}>Contacter le SAV</button>
        <button className="obera-btn-outline" type="button" onClick={onBack}>Changer d’appareil</button>
      </div>
    </div>
    <p className="text-sm text-slate-600">Le diagnostic permet souvent de remettre l’appareil en service rapidement. Le formulaire SAV reste accessible à tout moment si vous préférez transmettre directement la demande.</p>
    <ClientDevicePhoto model={product.name} detail />
    {!node && <p role="alert">Diagnostic indisponible pour ce modèle.</p>}
    {node && <>
      <h3 className="text-xl font-semibold">{node.title}</h3>
      {node.type === "question" ? <div className="flex flex-wrap gap-2">
        {node.options.map((option, index) => <button className="obera-btn-outline" type="button" key={option.label}
          onClick={() => choose(option.next, index)}>{option.label}</button>)}
      </div> : <>
        <p>{node.body}</p>
        {showVideo && <a className="obera-btn-outline inline-flex" href={IC22_KM22_DISMANTLING_VIDEO_URL}
          target="_blank" rel="noreferrer">Voir la vidéo de démontage IC22 / KM22</a>}

        {node.next && <>
          <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={confirmed}
            onChange={event => setHistory(value => [...value.slice(0, -1),
              { ...value[value.length - 1], confirmed: event.target.checked }])} />
            Je confirme avoir effectué le contrôle proposé.
          </label>
          <button className="obera-btn-outline" type="button" disabled={!confirmed}
            onClick={() => goNext(node.next!)}>Continuer</button>
        </>}

        {terminalResolved && alreadyResolved && <p role="status" className="font-semibold text-green-700">Problème résolu.</p>}

        {terminalResolved && !alreadyResolved && <>
          <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={confirmed}
            onChange={event => setHistory(value => [...value.slice(0, -1),
              { ...value[value.length - 1], confirmed: event.target.checked }])} />
            Je confirme avoir effectué le contrôle proposé.
          </label>
          {confirmed && !resolved && !contactVisible && <div className="space-y-2">
            <p className="font-semibold">Après ce contrôle, le problème est-il résolu ?</p>
            <div className="flex flex-wrap gap-2">
              <button className="obera-btn-primary" type="button" onClick={() => setResolved(true)}>Oui, le problème est résolu</button>
              <button className="obera-btn-outline" type="button" onClick={() => setContactVisible(true)}>Non, le problème persiste</button>
            </div>
          </div>}
          {resolved && <p role="status" className="font-semibold text-green-700">Problème résolu.</p>}
        </>}

        {terminalNeedsSav && !contactVisible && <div className="space-y-2">
          <p className="font-semibold">{terminalSavMessage}</p>
          <button className="obera-btn-primary" type="button" onClick={() => setContactVisible(true)}>Contacter le SAV</button>
        </div>}
      </>}
    </>}
    {contactVisible && <ContactSavForm product={product} history={history} onClose={() => setContactVisible(false)} />}
    {history.length > 1 && <button className="obera-btn-outline" type="button" onClick={() => {
      setContactVisible(false); setResolved(false); setHistory(value => value.slice(0, -1));
    }}>Étape précédente</button>}
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
    return PRODUCTS.filter(product => !COMMERCIAL_EXCLUDED_PRODUCT_IDS.has(product.id))
      .filter(product => commercialProductMatchesQuery(product, query));
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
              onChange={event => setQuery(event.target.value)} placeholder="Ex. IC 22, KM 22, VL 220, Clearbox…" />
          </label>
        </section>
        {CATEGORIES.map(category => {
          const products = filtered.filter(product => product.category === category.id);
          if (!products.length) return null;
          return <section className="obera-panel p-5 space-y-4" key={category.id}>
            <h2 className="text-xl font-semibold">{category.icon} {COMMERCIAL_CATEGORY_LABELS[category.id]}</h2>
            <ul className="client-device-grid">{products.map(product => <li className="client-device-card" key={product.id}>
              <ClientDevicePhoto model={product.name} />
              <div className="space-y-2 min-w-0">
                <h3 className="font-semibold text-lg">{commercialProductLabel(product)}</h3>
                <div className="client-device-actions">
                  <button className="obera-btn-primary" type="button" onClick={() => setSelected(product)}>Lancer le diagnostic</button>
                  {noticeModels.has(product.name) && <a className="obera-btn-outline"
                    href={`/api/internal/catalog/notices/${encodeURIComponent(product.name)}`}>Télécharger la notice</a>}
                </div>
                {!noticeModels.has(product.name) && <p className="text-sm text-slate-600">Notice indisponible</p>}
              </div>
            </li>)}</ul>
          </section>;
        })}
        {filtered.length === 0 && <p className="obera-panel p-5">Aucun appareil trouvé.</p>}
      </>}
    </main>
  </div>;
}
