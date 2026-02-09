import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CATEGORIES,
  DIAGNOSTIC_NODES,
  PRODUCTS,
  getDiagnosticStartNode,
  getImageUrl,
  getNoticeUrl,
  resolveDynamicNext,
  type CategoryId,
  type DiagnosticNode,
  type DiagnosticTarget,
  type ProductCatalogItem
} from "../lib/assistantData";
import SavDashboard from "../dashboard/SavDashboard";
import { savData } from "../data/savData";

type AssistantOberaPageProps = {
  forceAdmin?: boolean;
};

type StepId =
  | "login"
  | "category"
  | "product"
  | "serial"
  | "diagnostic"
  | "summary"
  | "consumables"
  | "manual-sav"
  | "dashboard";

type DiagnosticOutcome = {
  id: "filter" | "sav" | "sav-pump" | "resolved";
  title: string;
  message: string;
};

const TARGET_OUTCOMES: Record<DiagnosticTarget, DiagnosticOutcome> = {
  filter: {
    id: "filter",
    title: "Pièce consommable à commander",
    message:
      "Le diagnostic indique un consommable en fin de vie. Ouvrez la demande de consommables."
  },
  sav: {
    id: "sav",
    title: "Prise en charge SAV recommandée",
    message:
      "Le diagnostic nécessite un contrôle technique. Contactez le SAV pour la suite."
  },
  "sav-pump": {
    id: "sav-pump",
    title: "Protocole pompe et contact SAV",
    message:
      "Le diagnostic indique un défaut probable de pompe. Un dossier SAV doit être ouvert."
  },
  resolved: {
    id: "resolved",
    title: "Diagnostic terminé",
    message: "Le guide n'indique pas de défaut critique."
  }
};

function buildOutcomeFromTarget(target: DiagnosticTarget, node?: DiagnosticNode): DiagnosticOutcome {
  const base = TARGET_OUTCOMES[target];
  if (!node || node.type !== "text") {
    return base;
  }
  return {
    id: base.id,
    title: node.title || base.title,
    message: node.body || base.message
  };
}

function withBase(path: string): string {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${path.replace(/^\/+/, "")}`;
}

const CATEGORY_ICONS: Record<CategoryId, string> = {
  rafraichisseurs: "🧊",
  purificateurs: "🍃",
  depoussiereurs: "🌪️",
  "tables-aspirantes": "🛠️"
};

function DeviceThumb({
  src,
  name,
  category
}: {
  src?: string | null;
  name: string;
  category?: CategoryId;
}) {
  const [hasError, setHasError] = useState(false);
  if (!src || hasError) {
    const icon = category ? CATEGORY_ICONS[category] : "📦";
    const label = category ? category.replace("-", " ") : "appareil";
    return (
      <div className="product-thumb product-thumb-placeholder">
        <span className="thumb-icon">{icon}</span>
        <span className="thumb-label">{label}</span>
      </div>
    );
  }
  return (
    <div className="product-thumb">
      <img src={src} alt={`Photo ${name}`} onError={() => setHasError(true)} />
    </div>
  );
}

export default function AssistantOberaPage({
  forceAdmin = false
}: AssistantOberaPageProps) {
  const logoSrc = useMemo(() => withBase("obera-logo.png"), []);
  const [logoFailed, setLogoFailed] = useState(false);
  const [activeStep, setActiveStep] = useState<StepId>(forceAdmin ? "category" : "login");
  const [clientId, setClientId] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(forceAdmin);

  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductCatalogItem | null>(null);
  const [serialNumber, setSerialNumber] = useState("");
  const [serialError, setSerialError] = useState("");

  const [diagStack, setDiagStack] = useState<string[]>([]);
  const [diagOutcome, setDiagOutcome] = useState<DiagnosticOutcome | null>(null);
  const [feedbackState, setFeedbackState] = useState<"idle" | "yes" | "no">("idle");
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [diagnosticError, setDiagnosticError] = useState("");
  const [fallbackWarning, setFallbackWarning] = useState(false);

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactComment, setContactComment] = useState("");
  const [contactFormVisible, setContactFormVisible] = useState(false);

  const [consName, setConsName] = useState("");
  const [consEmail, setConsEmail] = useState("");
  const [consProduct, setConsProduct] = useState("");
  const [consSerial, setConsSerial] = useState("");
  const [consMessage, setConsMessage] = useState("");

  const [manualSavSaved, setManualSavSaved] = useState(false);
  const [manualSavId, setManualSavId] = useState<string | null>(null);
  const [manualSavRef, setManualSavRef] = useState("");
  const [manualSavAppareil, setManualSavAppareil] = useState("");
  const [manualSavClient, setManualSavClient] = useState("");
  const [manualSavSite, setManualSavSite] = useState("");
  const [manualSavProbleme, setManualSavProbleme] = useState("");
  const [manualSavCause, setManualSavCause] = useState("");
  const [manualSavAction, setManualSavAction] = useState("");
  const [manualSavType, setManualSavType] = useState("technique");

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return PRODUCTS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  const currentDiagNode = useMemo(() => {
    if (!diagStack.length) return null;
    return DIAGNOSTIC_NODES[diagStack[diagStack.length - 1]] ?? null;
  }, [diagStack]);

  const progressPct = useMemo(() => {
    if (!currentDiagNode) return 0;
    const total = currentDiagNode.maxSteps || 1;
    const step = Math.min(diagStack.length, total);
    return Math.min(100, (step / total) * 100);
  }, [currentDiagNode, diagStack.length]);

  const progressText = useMemo(() => {
    if (!currentDiagNode) return "";
    const total = currentDiagNode.maxSteps || 1;
    const step = Math.min(diagStack.length, total);
    return `Etape ${step} / ${total}`;
  }, [currentDiagNode, diagStack.length]);

  const showHeader = activeStep !== "login";

  useEffect(() => {
    setSelectedOptionIdx(null);
    setDiagnosticError("");
  }, [currentDiagNode?.id]);

  const resetAll = () => {
    setActiveStep(forceAdmin ? "category" : "login");
    setClientId("");
    setPin("");
    setLoginError(false);
    setIsAdmin(forceAdmin);
    setSelectedCategory(null);
    setSelectedProduct(null);
    setSerialNumber("");
    setSerialError("");
    setDiagStack([]);
    setDiagOutcome(null);
    setFeedbackState("idle");
    setSelectedOptionIdx(null);
    setDiagnosticError("");
    setFallbackWarning(false);
    setContactName("");
    setContactEmail("");
    setContactComment("");
    setContactFormVisible(false);
    setConsName("");
    setConsEmail("");
    setConsProduct("");
    setConsSerial("");
    setConsMessage("");
    setManualSavSaved(false);
    setManualSavRef("");
    setManualSavAppareil("");
    setManualSavClient("");
    setManualSavSite("");
    setManualSavProbleme("");
    setManualSavCause("");
    setManualSavAction("");
    setManualSavType("technique");
  };

  const handleLogin = () => {
    const cleanId = clientId.trim();
    const cleanPin = pin.trim();
    const pinOk = /^\d{4}$/.test(cleanPin);

    if (!cleanId || !pinOk) {
      setLoginError(true);
      return;
    }

    if (forceAdmin) {
      setLoginError(true);
      return;
    }

    const isClient = cleanId.toUpperCase() === "OBERACLIENT" && cleanPin === "1234";
    if (!isClient) {
      setLoginError(true);
      return;
    }

    setLoginError(false);
    setIsAdmin(false);
    setActiveStep("category");
  };

  const startDiagnostic = () => {
    const serial = serialNumber.trim();
    if (!selectedProduct) {
      setSerialError("Sélectionnez un appareil avant de démarrer le diagnostic.");
      return;
    }
    if (!serial) {
      setSerialError("Le numéro de série est requis pour lancer le diagnostic.");
      return;
    }

    setSerialNumber(serial);
    setSerialError("");
    const startNode = getDiagnosticStartNode(selectedProduct.id);
    setDiagStack([startNode]);
    setFallbackWarning(
      startNode === "start" && selectedProduct.category !== "rafraichisseurs"
    );
    setDiagOutcome(null);
    setFeedbackState("idle");
    setContactFormVisible(false);
    setDiagnosticError("");
    setActiveStep("diagnostic");
  };

  const goToSummary = (outcome: DiagnosticOutcome) => {
    setDiagOutcome(outcome);
    setFeedbackState(outcome.id === "resolved" ? "idle" : "no");
    setContactFormVisible(outcome.id === "sav" || outcome.id === "sav-pump");
    setActiveStep("summary");
  };

  const handleDiagnosticNext = (nextId: string) => {
    const resolved = resolveDynamicNext(nextId, selectedProduct?.id ?? "");
    setDiagStack((prev) => [...prev, resolved]);
  };

  const handleDiagnosticBack = () => {
    if (diagStack.length <= 1) {
      setActiveStep("serial");
      return;
    }
    setDiagStack((prev) => prev.slice(0, -1));
  };

  const openConsumablesFromSummary = () => {
    setConsProduct(selectedProduct?.name ?? "");
    setConsSerial(serialNumber);
    setActiveStep("consumables");
  };

  const buildContactMessage = () => {
    const base = diagOutcome?.message ?? "";
    return `${base}\n\nAppareil: ${selectedProduct?.name ?? "-"}\nNuméro de série: ${serialNumber || "-"}`;
  };

  const sendMail = (subject: string, body: string) => {
    const recipient = "sav@obera.fr";
    const url = `mailto:${recipient}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  const submitContact = (e: React.FormEvent) => {
    e.preventDefault();
    const subject =
      diagOutcome?.id === "sav-pump"
        ? `Demande SAV pompe - ${selectedProduct?.name ?? "Appareil"}`
        : `Demande SAV - ${selectedProduct?.name ?? "Appareil"}`;
    const body = [
      `Nom: ${contactName}`,
      `Email: ${contactEmail}`,
      `Appareil: ${selectedProduct?.name ?? "-"}`,
      `Numéro de série: ${serialNumber || "-"}`,
      `Message: ${buildContactMessage()}`,
      `Commentaire: ${contactComment || "-"}`
    ].join("\n");
    sendMail(subject, body);
  };

  const submitConsumables = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = `Demande consommables - ${consProduct || "Appareil"}`;
    const body = [
      `Nom: ${consName}`,
      `Email: ${consEmail}`,
      `Appareil: ${consProduct || "-"}`,
      `Numéro de série: ${consSerial || "-"}`,
      `Consommables: ${consMessage}`
    ].join("\n");
    sendMail(subject, body);
  };

  const submitManualSav = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const year = now.getFullYear();
    const suffix = String(Date.now()).slice(-5);
    const ticketId = `SAV-${year}-${suffix}`;
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const modelRaw = manualSavAppareil.trim();
    const n = normalize(modelRaw);
    let category: CategoryId = "rafraichisseurs";
    if (/(table|dosseret)/i.test(modelRaw)) category = "tables-aspirantes";
    else if (/(dustomat|dust|jumbo)/i.test(modelRaw)) category = "depoussiereurs";
    else if (/(epur|clearbox|filtower)/i.test(modelRaw)) category = "purificateurs";
    else if (/(eco|ic|vl|fresh)/i.test(modelRaw) || n.startsWith("ic") || n.startsWith("vl")) {
      category = "rafraichisseurs";
    }

    savData.tickets.unshift({
      id: ticketId,
      createdAt: now.toISOString(),
      firstResponseAt: null,
      closedAt: null,
      status: "open",
      category,
      model: modelRaw || "Appareil inconnu",
      serial: manualSavRef || serialNumber || "-",
      clientId: "MANUAL",
      clientName: manualSavClient || "Client non renseigne",
      site: manualSavSite || "-",
      severity: "medium",
      cause: manualSavCause || "Non renseigne",
      resolutionChannel: "sav",
      reopened: false,
      feedback: null
    });

    setManualSavSaved(true);
    setManualSavId(ticketId);
  };

  const goToDashboard = () => {
    if (isAdmin) setActiveStep("dashboard");
  };

  const renderLogo = (clickable: boolean) => {
    const logoContent = logoFailed ? (
      <span className="logo-fallback">
        ober<span className="logo-fallback-accent">A</span>
      </span>
    ) : (
      <img
        src={logoSrc}
        alt="oberA"
        className="logo-img"
        onError={() => setLogoFailed(true)}
      />
    );
    if (!clickable) return logoContent;
    return (
      <button id="logo-btn" className="logo-button" onClick={goToDashboard} type="button">
        {logoContent}
      </button>
    );
  };

  return (
    <div className="bg-stone-100 min-h-screen flex items-center justify-center p-4">
      <div className="container mx-auto p-8 bg-white rounded-xl shadow-lg obera-shell">
        {showHeader && (
          <header className="text-center mb-10 obera-header" id="main-header">
            <div className="obera-header-logo">{renderLogo(isAdmin)}</div>
            <div className="obera-header-text">
              <p className="mt-1 text-sm text-stone-500">Garant de la qualité de votre air</p>
              <p className="mt-4 text-lg text-stone-600" id="header-subtitle">
                Diagnostiquez votre appareil ou commandez des consommables.
              </p>
              {isAdmin && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg text-sm text-white obera-red obera-red-hover shadow-md"
                    onClick={goToDashboard}
                  >
                    Dashboard SAV
                  </button>
                </div>
              )}
            </div>
          </header>
        )}

        <div
          id="step-login"
          className={`step-container ${activeStep === "login" ? "active" : ""}`}
        >
          <div className="text-center mb-10">
            <div className="flex justify-center">
              {renderLogo(false)}
            </div>
            <p className="mt-1 text-sm text-stone-500">Garant de la qualité de votre air</p>
          </div>

          <h2 className="text-2xl font-semibold text-stone-600 mb-6">
            Accès Sécurisé Client
          </h2>
          <div className="w-full max-w-sm">
            <div className="mb-4">
              <label
                htmlFor="client-id-input"
                className="block text-sm font-medium text-stone-600 text-left"
              >
                Numéro Client
              </label>
              <input
                type="text"
                id="client-id-input"
                className="w-full p-3 mt-1 rounded-md border border-stone-300 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: OBERACLIENT ou SAV"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>
            <div className="mb-6">
              <label
                htmlFor="pin-input"
                className="block text-sm font-medium text-stone-600 text-left"
              >
                Code PIN (4 chiffres)
              </label>
              <input
                type="password"
                id="pin-input"
                className="w-full p-3 mt-1 rounded-md border border-stone-300 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••"
                maxLength={4}
                inputMode="numeric"
                pattern="\\d{4}"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </div>

            {loginError && (
              <p id="login-error-msg" className="text-red-500 text-sm mb-4">
                Numéro client ou Code PIN incorrect.
              </p>
            )}

            <button
              id="login-btn"
              className="w-full px-6 py-3 text-white rounded-lg shadow-md transition obera-blue obera-blue-hover"
              onClick={handleLogin}
              type="button"
            >
              Connexion
            </button>
          </div>
        </div>

        <div
          id="step-product-category"
          className={`step-container ${activeStep === "category" ? "active" : ""}`}
        >
          <h2 className="text-2xl font-semibold text-stone-600 mb-6">
            Que souhaitez-vous faire ?
          </h2>
          <div className="category-grid" id="category-grid-container">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className="category-btn p-6 rounded-lg shadow-md transition"
                data-category={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedProduct(null);
                  setActiveStep("product");
                }}
                type="button"
              >
                <span className="text-4xl">{cat.icon}</span>
                <p className="mt-2 text-stone-700 font-medium">{cat.label}</p>
              </button>
            ))}

            <button
              id="consumables-btn"
              className="p-6 rounded-lg shadow-md transition text-white flex items-center justify-center gap-3 obera-green obera-green-hover consumables-button"
              type="button"
              onClick={() => setActiveStep("consumables")}
            >
              <span className="text-2xl">🔧</span>
              <p className="font-medium">Commander des consommables (Filtres, etc.)</p>
            </button>
          </div>

          <div className="w-full mt-6 flex justify-center">
            <Link
              to="/charbon-actif"
              className="px-6 py-3 rounded-lg shadow-md transition text-white obera-blue obera-blue-hover"
            >
              Calculateur saturation charbon actif
            </Link>
          </div>
          {isAdmin && (
            <div className="w-full mt-4 flex justify-center">
              <button
                type="button"
                className="px-6 py-3 rounded-lg shadow-md transition text-white obera-red obera-red-hover"
                onClick={() => setActiveStep("dashboard")}
              >
                Dashboard SAV
              </button>
            </div>
          )}
        </div>

        <div
          id="step-product-selection"
          className={`step-container ${activeStep === "product" ? "active" : ""}`}
        >
          <h2 className="text-2xl font-semibold text-stone-600 mb-6">
            Sélectionnez votre appareil
          </h2>
          <p className="text-sm text-stone-500 mb-4">
            Notice disponible via le bouton "Notice PDF" lorsqu'elle est disponible.
          </p>
          <div
            id="product-list"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full"
          >
            {filteredProducts.map((product) => {
              const noticeUrl = getNoticeUrl(product.noticeFile);
              const imageUrl = getImageUrl(product.imageFile);
              return (
                <div key={product.id} className="product-item">
                  <DeviceThumb src={imageUrl} name={product.name} category={product.category} />
                  <div className="product-details">
                    <button
                      className="product-btn-text"
                      type="button"
                      onClick={() => {
                        setSelectedProduct(product);
                        setActiveStep("serial");
                      }}
                    >
                      {product.name}
                    </button>
                    <div className="product-meta">
                      {noticeUrl ? (
                        <button
                          type="button"
                          className="product-link"
                          onClick={() => window.open(noticeUrl, "_blank")}
                        >
                          Notice PDF
                        </button>
                      ) : (
                        <span className="product-link disabled">Notice manquante</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-stone-400 mt-4">
            Photos et notices peuvent etre ajoutees dans <strong>/public/products/devices</strong>{" "}
            et <strong>/public/notices</strong>.
          </p>
          <p className="text-sm text-stone-500 mt-6" id="appareil-non-trouve-container">
            Vous ne trouvez pas votre appareil ?{" "}
            <button
              id="appareil-non-trouve"
              className="font-medium obera-blue-text hover:underline"
              type="button"
              onClick={() => {
                const outcome = {
                  ...TARGET_OUTCOMES.sav,
                  message:
                    "Appareil non trouvé dans la liste. Merci de nous contacter pour une prise en charge."
                };
                setSelectedProduct(null);
                setDiagOutcome(outcome);
                setFeedbackState("no");
                setContactFormVisible(true);
                setActiveStep("summary");
              }}
            >
              Contactez-nous directement
            </button>
          </p>
          <button
            id="back-to-category"
            className="mt-8 px-6 py-2 text-stone-500 rounded-lg border border-stone-300 hover:bg-stone-200 transition"
            type="button"
            onClick={() => setActiveStep("category")}
          >
            Retour aux catégories
          </button>
        </div>

        <div
          id="step-serial-number"
          className={`step-container ${activeStep === "serial" ? "active" : ""}`}
        >
          <h2 className="text-2xl font-semibold text-stone-600 mb-6">Numéro de série</h2>
          <p className="mb-4 text-stone-500" id="serial-number-info">
            Veuillez entrer le numéro de série de votre appareil pour un diagnostic précis.
          </p>
          <div className="w-full max-w-sm" id="serial-input-container">
            <input
              type="text"
              id="serial-number-input"
              className="w-full p-3 mb-6 rounded-md border border-stone-300 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Entrez le numéro de série"
              value={serialNumber}
              onChange={(e) => {
                setSerialNumber(e.target.value);
                setSerialError("");
              }}
            />
            {serialError && (
              <p className="text-sm text-red-600 text-left -mt-4 mb-4">{serialError}</p>
            )}
            <select
              id="serial-number-select"
              className="w-full p-3 mb-6 rounded-md border border-stone-300 focus:ring-blue-500 focus:border-blue-500 hidden"
            />
          </div>

          <button
            id="start-diagnostic-btn"
            className="px-6 py-2 text-white rounded-lg shadow-md transition obera-blue obera-blue-hover"
            type="button"
            onClick={startDiagnostic}
          >
            Démarrer le diagnostic
          </button>
          <button
            id="back-to-product-selection"
            className="mt-4 px-6 py-2 text-stone-500 rounded-lg border border-stone-300 hover:bg-stone-200 transition"
            type="button"
            onClick={() => setActiveStep("product")}
          >
            Retour aux appareils
          </button>
        </div>

        <div
          id="step-diagnostic"
          className={`step-container ${activeStep === "diagnostic" ? "active" : ""}`}
        >
          <h2 className="text-2xl font-semibold text-stone-600 mb-6" id="diagnostic-title">
            Diagnostic
          </h2>
          <div id="progress-container" className="w-full">
            <div
              id="progress-bar"
              className="h-2.5 rounded-full transition-all duration-300 obera-blue"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p id="progress-text" className="w-full text-left text-sm text-stone-600 mb-4">
            {progressText}
          </p>

          <div id="diagnostic-content" className="w-full text-left">
            {fallbackWarning && (
              <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                Aucun arbre de diagnostic specifique n'est disponible pour ce modele. Un guide
                standard sera applique.
              </div>
            )}
            {currentDiagNode ? (
              currentDiagNode.type === "question" ? (
                <div className="space-y-4">
                  <p className="text-base font-medium text-stone-700">
                    {currentDiagNode.title}
                  </p>
                  <div className="space-y-2">
                    {currentDiagNode.options.map((opt, idx) => (
                      <label
                        key={`${currentDiagNode.id}-${idx}`}
                        className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 cursor-pointer hover:bg-stone-50"
                      >
                        <input
                          type="radio"
                          name="diagnostic-option"
                          checked={selectedOptionIdx === idx}
                          onChange={() => {
                            setSelectedOptionIdx(idx);
                            setDiagnosticError("");
                          }}
                        />
                        <span className="text-stone-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-base font-semibold text-stone-700">
                    {currentDiagNode.title}
                  </p>
                  <p className="text-sm text-stone-600 whitespace-pre-line">
                    {currentDiagNode.body}
                  </p>
                </div>
              )
            ) : (
              <p className="text-sm text-stone-500">Diagnostic en attente.</p>
            )}
            {diagnosticError && (
              <p className="text-sm text-red-600 mt-3">{diagnosticError}</p>
            )}
          </div>
          <div className="w-full flex justify-between items-center mt-8">
            <button
              id="diagnostic-back"
              className="px-6 py-2 text-stone-500 rounded-lg border border-stone-300 hover:bg-stone-200 transition"
              type="button"
              onClick={handleDiagnosticBack}
            >
              Précédent
            </button>
            <button
              id="change-device-diag"
              className="px-6 py-2 rounded-lg transition obera-blue-text obera-blue-text-hover"
              type="button"
              onClick={() => setActiveStep("product")}
            >
              Changer d'appareil
            </button>
            <button
              id="diagnostic-next"
              className="px-6 py-2 text-white rounded-lg shadow-md transition obera-blue obera-blue-hover"
              type="button"
              onClick={() => {
                if (!currentDiagNode) {
                  setDiagnosticError("Diagnostic indisponible.");
                  return;
                }
                if (currentDiagNode.type === "question") {
                  if (selectedOptionIdx === null) {
                    setDiagnosticError("Sélectionnez une réponse pour continuer.");
                    return;
                  }
                  const opt = currentDiagNode.options[selectedOptionIdx];
                  handleDiagnosticNext(opt.next);
                  return;
                }
                if (currentDiagNode.target) {
                  goToSummary(buildOutcomeFromTarget(currentDiagNode.target, currentDiagNode));
                  return;
                }
                if (currentDiagNode.next) {
                  handleDiagnosticNext(currentDiagNode.next);
                  return;
                }
                goToSummary(buildOutcomeFromTarget("resolved", currentDiagNode));
              }}
            >
              {currentDiagNode?.type === "text" && currentDiagNode.target
                ? "Terminer"
                : "Suivant"}
            </button>
          </div>
        </div>

        <div
          id="step-summary"
          className={`step-container ${activeStep === "summary" ? "active" : ""}`}
        >
          <h2 className="text-2xl font-semibold text-stone-600 mb-6" id="summary-title">
            {diagOutcome?.title ?? "Diagnostic terminé"}
          </h2>

          {diagOutcome?.id === "resolved" && feedbackState === "idle" && (
            <div id="feedback-container" className="w-full mb-6">
              <p className="text-lg text-stone-700 mb-4">
                Ce guide vous a-t-il permis de résoudre le problème ?
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  id="feedback-yes"
                  className="px-6 py-2 text-white rounded-lg shadow-md transition obera-green obera-green-hover"
                  type="button"
                  onClick={() => setFeedbackState("yes")}
                >
                  Oui, problème résolu !
                </button>
                <button
                  id="feedback-no"
                  className="px-6 py-2 text-white rounded-lg shadow-md transition obera-red obera-red-hover"
                  type="button"
                  onClick={() => {
                    setFeedbackState("no");
                    setContactFormVisible(true);
                  }}
                >
                  Non, j'ai besoin d'aide
                </button>
              </div>
            </div>
          )}

          {feedbackState === "yes" && (
            <div
              id="feedback-thanks"
              className="w-full mb-6 p-4 bg-green-100 text-green-800 rounded-lg"
            >
              <p>Merci pour votre retour ! Nous sommes ravis d'avoir pu vous aider.</p>
            </div>
          )}

          {(feedbackState === "no" || (diagOutcome && diagOutcome.id !== "resolved")) && (
            <div
              id="summary-content"
              className="w-full p-4 bg-stone-50 rounded-lg text-left"
            >
              <p className="text-stone-700 mb-2">{diagOutcome?.message}</p>
              <p className="text-sm text-stone-500">
                Appareil : {selectedProduct?.name ?? "-"} · Numéro de série :{" "}
                {serialNumber || "-"}
              </p>
            </div>
          )}

          {diagOutcome?.id === "filter" && (
            <div
              id="contact-buttons-container"
              className="w-full mt-8 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <button
                className="px-6 py-2 text-white rounded-lg shadow-md transition obera-green obera-green-hover"
                type="button"
                onClick={openConsumablesFromSummary}
              >
                Commander des consommables
              </button>
            </div>
          )}

          {contactFormVisible && (
            <form
              id="contact-form"
              className="mt-4 p-6 bg-stone-100 rounded-lg shadow-md w-full"
              onSubmit={submitContact}
            >
              <h3 id="form-title" className="text-lg font-semibold mb-4 text-stone-700">
                Formulaire de contact
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-600 text-left">Nom</label>
                <input
                  type="text"
                  id="contact-name"
                  className="mt-1 p-2 w-full rounded-md border border-stone-300 focus:ring-blue-500 focus:border-blue-500"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-600 text-left">Email</label>
                <input
                  type="email"
                  id="contact-email"
                  className="mt-1 p-2 w-full rounded-md border border-stone-300 focus:ring-blue-500 focus:border-blue-500"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-600 text-left">
                  Appareil
                </label>
                <input
                  type="text"
                  id="contact-product"
                  className="mt-1 p-2 w-full rounded-md border border-stone-300 bg-stone-200"
                  readOnly
                  value={selectedProduct?.name ?? ""}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-600 text-left">
                  Numéro de série
                </label>
                <input
                  type="text"
                  id="contact-serial"
                  className="mt-1 p-2 w-full rounded-md border border-stone-300 bg-stone-200"
                  readOnly
                  value={serialNumber}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-600 text-left">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={4}
                  className="mt-1 p-2 w-full rounded-md border border-stone-300 bg-stone-200"
                  readOnly
                  value={buildContactMessage()}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-600 text-left">
                  Ajouter un commentaire
                </label>
                <textarea
                  id="contact-comment"
                  rows={2}
                  className="mt-1 p-2 w-full rounded-md border border-stone-300"
                  placeholder="Précisez votre demande ici..."
                  value={contactComment}
                  onChange={(e) => setContactComment(e.target.value)}
                />
              </div>
              <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-700 rounded-r-lg text-left">
                <p className="text-sm">
                  <strong>Pièces jointes :</strong> Pour joindre des photos, veuillez les{" "}
                  <strong>ajouter manuellement</strong> à l'e-mail qui s'ouvrira après avoir
                  cliqué sur "Envoyer".
                </p>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 text-white font-medium rounded-lg transition obera-blue obera-blue-hover"
              >
                Envoyer
              </button>
              <button
                type="button"
                id="cancel-form-btn"
                className="w-full mt-2 px-4 py-2 bg-stone-400 text-white font-medium rounded-lg hover:bg-stone-500 transition"
                onClick={() => setContactFormVisible(false)}
              >
                Annuler
              </button>
            </form>
          )}

          <div className="w-full flex justify-center items-center gap-4 mt-8">
            <button
              id="start-over"
              className="px-6 py-2 text-stone-500 rounded-lg border border-stone-300 hover:bg-stone-200 transition"
              type="button"
              onClick={resetAll}
            >
              Se déconnecter
            </button>
            <button
              id="change-device-summary"
              className="px-6 py-2 rounded-lg transition obera-blue-text obera-blue-text-hover"
              type="button"
              onClick={() => setActiveStep("product")}
            >
              Changer d'appareil
            </button>
          </div>
        </div>

        <div
          id="step-consumables"
          className={`step-container ${activeStep === "consumables" ? "active" : ""}`}
        >
          <h2 className="text-2xl font-semibold text-stone-600 mb-6">
            Commander des consommables
          </h2>
          <p className="mb-6 text-stone-500">
            Pour commander des filtres ou d'autres consommables, veuillez remplir ce formulaire.
            <br />
            Votre demande sera envoyée à notre service dédié.
          </p>

          <form
            id="consumables-form"
            className="p-6 bg-stone-100 rounded-lg shadow-md w-full"
            onSubmit={submitConsumables}
          >
            <h3 id="consumables-form-title" className="text-lg font-semibold mb-4 text-stone-700">
              Demande de consommables (Service commercial)
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-600 text-left">Nom</label>
              <input
                type="text"
                id="consumables-name"
                className="mt-1 p-2 w-full rounded-md border border-stone-300"
                required
                value={consName}
                onChange={(e) => setConsName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-600 text-left">Email</label>
              <input
                type="email"
                id="consumables-email"
                className="mt-1 p-2 w-full rounded-md border border-stone-300"
                required
                value={consEmail}
                onChange={(e) => setConsEmail(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-600 text-left">
                Appareil (Ex: DUSTOMAT 10)
              </label>
              <input
                type="text"
                id="consumables-product"
                className="mt-1 p-2 w-full rounded-md border border-stone-300"
                value={consProduct}
                onChange={(e) => setConsProduct(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-600 text-left">
                Numéro de série (si connu)
              </label>
              <input
                type="text"
                id="consumables-serial"
                className="mt-1 p-2 w-full rounded-md border border-stone-300"
                value={consSerial}
                onChange={(e) => setConsSerial(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-600 text-left">
                Consommable(s) demandé(s)
              </label>
              <textarea
                id="consumables-message"
                rows={3}
                className="mt-1 p-2 w-full rounded-md border border-stone-300"
                placeholder="Ex: 1x Filtre principal H13, 3x Sacs collecteurs..."
                required
                value={consMessage}
                onChange={(e) => setConsMessage(e.target.value)}
              />
            </div>
            <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-700 rounded-r-lg text-left">
              <p className="text-sm">
                Pour joindre des photos (ex: étiquette filtre), veuillez les{" "}
                <strong>ajouter manuellement</strong> à l'e-mail qui s'ouvrira.
              </p>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 text-white font-medium rounded-lg transition obera-green obera-green-hover"
            >
              Envoyer la demande
            </button>
          </form>

          <button
            id="back-to-category-consumables"
            className="mt-8 px-6 py-2 text-stone-500 rounded-lg border border-stone-300 hover:bg-stone-200 transition"
            type="button"
            onClick={() => setActiveStep("category")}
          >
            Retour à l'accueil
          </button>
        </div>

        <div
          id="step-manual-sav"
          className={`step-container ${activeStep === "manual-sav" ? "active" : ""}`}
        >
          <h2 className="text-2xl font-semibold text-stone-600 mb-6">
            Saisie Manuelle d'Intervention (Mode SAV)
          </h2>
          <p className="mb-6 text-stone-500">
            Enregistrez un nouveau dossier ou mettez à jour les informations SAV.
          </p>

          <form
            id="manual-sav-form"
            className="p-6 bg-stone-100 rounded-lg shadow-md w-full max-w-lg"
            onSubmit={submitManualSav}
          >
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-600 text-left">
                Référence SAV (Ex: SAV1202)
              </label>
              <input
                type="text"
                id="manual-sav-ref"
                className="mt-1 p-2 w-full rounded-md border border-stone-300"
                placeholder="N° de dossier"
                value={manualSavRef}
                onChange={(e) => setManualSavRef(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-600 text-left">
                Appareil
              </label>
              <input
                type="text"
                id="manual-sav-appareil"
                className="mt-1 p-2 w-full rounded-md border border-stone-300"
                placeholder="Ex: Ecoclim 22"
                value={manualSavAppareil}
                onChange={(e) => setManualSavAppareil(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-600 text-left">
                Client / Numéro Client
              </label>
              <input
                type="text"
                id="manual-sav-client"
                className="mt-1 p-2 w-full rounded-md border border-stone-300"
                placeholder="Ex: SLEEVER INTERNATIONAL / CL11549"
                value={manualSavClient}
                onChange={(e) => setManualSavClient(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-600 text-left">
                Site / Localisation
              </label>
              <input
                type="text"
                id="manual-sav-site"
                className="mt-1 p-2 w-full rounded-md border border-stone-300"
                placeholder="Ex: Lyon, FR"
                value={manualSavSite}
                onChange={(e) => setManualSavSite(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-600 text-left">
                Problème rencontré
              </label>
              <textarea
                id="manual-sav-probleme"
                rows={2}
                className="mt-1 p-2 w-full rounded-md border border-stone-300"
                placeholder="Description courte du symptôme"
                required
                value={manualSavProbleme}
                onChange={(e) => setManualSavProbleme(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-600 text-left">
                Cause (Diagnostic)
              </label>
              <textarea
                id="manual-sav-cause"
                rows={2}
                className="mt-1 p-2 w-full rounded-md border border-stone-300"
                placeholder="Ex: Pompe HS / Filtre colmaté"
                required
                value={manualSavCause}
                onChange={(e) => setManualSavCause(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-600 text-left">
                Action SAV (Résolution)
              </label>
              <textarea
                id="manual-sav-action"
                rows={2}
                className="mt-1 p-2 w-full rounded-md border border-stone-300"
                placeholder="Ex: Remplacement pompe"
                required
                value={manualSavAction}
                onChange={(e) => setManualSavAction(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-600 text-left">
                Type SAV
              </label>
              <select
                id="manual-sav-type"
                className="w-full p-2 mt-1 rounded-md border border-stone-300"
                value={manualSavType}
                onChange={(e) => setManualSavType(e.target.value)}
              >
                <option value="technique">SAV Technique</option>
                <option value="usure">SAV Usure Normale</option>
                <option value="fournisseur">Défaut Fournisseur</option>
                <option value="casse">Casse Client</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 text-white font-medium rounded-lg transition obera-blue obera-blue-hover"
            >
              Enregistrer l'Intervention
            </button>
            {manualSavSaved && (
              <p className="mt-3 text-sm text-green-700">
                Intervention enregistrée (simulation){manualSavId ? ` - ${manualSavId}` : ""}.
              </p>
            )}
          </form>

          <button
            id="back-to-dashboard"
            className="mt-8 px-6 py-2 text-stone-500 rounded-lg border border-stone-300 hover:bg-stone-200 transition"
            type="button"
            onClick={() => setActiveStep("dashboard")}
          >
            Retour au Tableau de Bord
          </button>
        </div>

        <div
          id="step-dashboard"
          className={`step-container ${activeStep === "dashboard" ? "active" : ""}`}
        >
          <SavDashboard onOpenManualSav={() => setActiveStep("manual-sav")} />

          <button
            id="back-to-category-dashboard"
            className="mt-8 px-6 py-2 text-stone-500 rounded-lg border border-stone-300 hover:bg-stone-200 transition"
            type="button"
            onClick={() => setActiveStep("category")}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
}
