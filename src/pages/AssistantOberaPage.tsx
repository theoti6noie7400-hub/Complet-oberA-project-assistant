import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

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

type CategoryId =
  | "purificateurs"
  | "depoussiereurs"
  | "rafraichisseurs"
  | "tables-aspirantes";

type Product = {
  id: string;
  label: string;
  category: CategoryId;
  manualUrl?: string;
};

const CATEGORIES: { id: CategoryId; label: string; icon: string }[] = [
  { id: "purificateurs", label: "Purificateurs d'air", icon: "🍃" },
  { id: "depoussiereurs", label: "Dépoussiéreurs", icon: "🌪️" },
  { id: "rafraichisseurs", label: "Rafraîchisseurs d'air", icon: "🧊" },
  { id: "tables-aspirantes", label: "Tables Aspirantes", icon: "🛠️" }
];

const PRODUCTS: Product[] = [
  { id: "epurex-1000", label: "EpurEx 1000", category: "purificateurs" },
  { id: "epurbox", label: "ePURBOX / ePUR", category: "purificateurs" },
  { id: "dustomat-4-24", label: "DUSTOMAT 4-24", category: "depoussiereurs" },
  { id: "ecoclim-22", label: "Ecoclim 22 / IC 22", category: "rafraichisseurs" },
  { id: "tables-aspirantes", label: "Tables Aspirantes", category: "tables-aspirantes" }
];

type DiagnosticOption = {
  label: string;
  next?: string;
  result?: "filter" | "sav" | "resolved";
};

type DiagnosticStep = {
  id: string;
  question: string;
  options: DiagnosticOption[];
};

const DIAGNOSTIC_STEPS: Record<string, DiagnosticStep> = {
  power: {
    id: "power",
    question: "L'appareil s'allume-t-il ?",
    options: [
      { label: "Oui", next: "airflow" },
      { label: "Non", result: "sav" }
    ]
  },
  airflow: {
    id: "airflow",
    question: "Le débit d'air vous semble-t-il faible ?",
    options: [
      { label: "Oui", result: "filter" },
      { label: "Non", next: "noise" }
    ]
  },
  noise: {
    id: "noise",
    question: "Entendez-vous un bruit anormal ?",
    options: [
      { label: "Oui", result: "sav" },
      { label: "Non", result: "resolved" }
    ]
  }
};

const DIAGNOSTIC_ORDER = ["power", "airflow", "noise"];

type DiagnosticOutcome = {
  id: "filter" | "sav" | "resolved";
  title: string;
  message: string;
};

const DIAGNOSTIC_OUTCOMES: Record<DiagnosticOutcome["id"], DiagnosticOutcome> = {
  filter: {
    id: "filter",
    title: "Suspicion de filtre saturé",
    message:
      "Le comportement indique un filtre possiblement colmaté. Un remplacement est recommandé."
  },
  sav: {
    id: "sav",
    title: "Assistance SAV recommandée",
    message:
      "Le diagnostic suggère un contrôle technique. Contactez notre service SAV pour une prise en charge."
  },
  resolved: {
    id: "resolved",
    title: "Contrôle terminé",
    message: "Aucun défaut critique détecté."
  }
};

export default function AssistantOberaPage() {
  const [activeStep, setActiveStep] = useState<StepId>("login");
  const [clientId, setClientId] = useState("");
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [serialNumber, setSerialNumber] = useState("");

  const [diagStack, setDiagStack] = useState<string[]>([]);
  const [diagOutcome, setDiagOutcome] = useState<DiagnosticOutcome | null>(null);
  const [feedbackState, setFeedbackState] = useState<"idle" | "yes" | "no">("idle");
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);

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
  const [manualSavRef, setManualSavRef] = useState("");
  const [manualSavAppareil, setManualSavAppareil] = useState("");
  const [manualSavClient, setManualSavClient] = useState("");
  const [manualSavProbleme, setManualSavProbleme] = useState("");
  const [manualSavCause, setManualSavCause] = useState("");
  const [manualSavAction, setManualSavAction] = useState("");
  const [manualSavType, setManualSavType] = useState("technique");

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return PRODUCTS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  const currentDiagStep = diagStack.length
    ? DIAGNOSTIC_STEPS[diagStack[diagStack.length - 1]]
    : null;

  const progressPct = useMemo(() => {
    if (!currentDiagStep) return 0;
    const idx = DIAGNOSTIC_ORDER.indexOf(currentDiagStep.id);
    if (idx < 0) return 0;
    return ((idx + 1) / DIAGNOSTIC_ORDER.length) * 100;
  }, [currentDiagStep]);

  const progressText = useMemo(() => {
    if (!currentDiagStep) return "";
    const idx = DIAGNOSTIC_ORDER.indexOf(currentDiagStep.id);
    return `Etape ${idx + 1} / ${DIAGNOSTIC_ORDER.length}`;
  }, [currentDiagStep]);

  const showHeader = activeStep !== "login";

  useEffect(() => {
    setSelectedOptionIdx(null);
  }, [currentDiagStep?.id]);

  const resetAll = () => {
    setActiveStep("login");
    setClientId("");
    setPin("");
    setLoginError(false);
    setIsAdmin(false);
    setSelectedCategory(null);
    setSelectedProduct(null);
    setSerialNumber("");
    setDiagStack([]);
    setDiagOutcome(null);
    setFeedbackState("idle");
    setSelectedOptionIdx(null);
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

    setLoginError(false);
    const admin = cleanId.toUpperCase() === "SAV" && cleanPin === "1789";
    setIsAdmin(admin);
    setActiveStep("category");
  };

  const startDiagnostic = () => {
    setDiagStack(["power"]);
    setDiagOutcome(null);
    setFeedbackState("idle");
    setContactFormVisible(false);
    setActiveStep("diagnostic");
  };

  const goToSummary = (outcome: DiagnosticOutcome) => {
    setDiagOutcome(outcome);
    setFeedbackState(outcome.id === "resolved" ? "idle" : "no");
    setContactFormVisible(outcome.id === "sav");
    setActiveStep("summary");
  };

  const handleDiagnosticOption = (opt: DiagnosticOption) => {
    if (opt.result) {
      goToSummary(DIAGNOSTIC_OUTCOMES[opt.result]);
      return;
    }
    if (opt.next) {
      setDiagStack((prev) => [...prev, opt.next!]);
    }
  };

  const handleDiagnosticBack = () => {
    if (diagStack.length <= 1) {
      setActiveStep("serial");
      return;
    }
    setDiagStack((prev) => prev.slice(0, -1));
  };

  const openConsumablesFromSummary = () => {
    setConsProduct(selectedProduct?.label ?? "");
    setConsSerial(serialNumber);
    setActiveStep("consumables");
  };

  const openContactForm = () => {
    setContactFormVisible(true);
  };

  const buildContactMessage = () => {
    const base = diagOutcome?.message ?? "";
    return `${base}\n\nAppareil: ${selectedProduct?.label ?? "-"}\nNuméro de série: ${serialNumber || "-"}`;
  };

  const sendMail = (subject: string, body: string) => {
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  const submitContact = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = `Demande SAV - ${selectedProduct?.label ?? "Appareil"}`;
    const body = [
      `Nom: ${contactName}`,
      `Email: ${contactEmail}`,
      `Appareil: ${selectedProduct?.label ?? "-"}`,
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
    setManualSavSaved(true);
  };

  const goToDashboard = () => {
    if (isAdmin) setActiveStep("dashboard");
  };

  return (
    <div className="bg-stone-100 min-h-screen flex items-center justify-center p-4">
      <div className="container mx-auto p-8 bg-white rounded-xl shadow-lg">
        {showHeader && (
          <header className="text-center mb-10" id="main-header">
            <div className="text-4xl font-bold" style={{ color: "#1a3668" }}>
              <button
                id="logo-btn"
                className="cursor-pointer"
                onClick={goToDashboard}
                type="button"
              >
                ober
              </button>
              <button
                id="logo-btn-a"
                className="cursor-pointer"
                style={{ color: "#8bc53f" }}
                onClick={goToDashboard}
                type="button"
              >
                A
              </button>
            </div>
            <p className="mt-1 text-sm text-stone-500">Garant de la qualité de votre air</p>
            <p className="mt-4 text-lg text-stone-600" id="header-subtitle">
              Diagnostiquez votre appareil ou commandez des consommables.
            </p>
          </header>
        )}

        <div
          id="step-login"
          className={`step-container ${activeStep === "login" ? "active" : ""}`}
        >
          <div className="text-center mb-10">
            <div className="text-4xl font-bold" style={{ color: "#1a3668" }}>
              ober<span style={{ color: "#8bc53f" }}>A</span>
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
                className="category-btn p-6 bg-stone-50 rounded-lg shadow-md hover:bg-stone-200 transition"
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
        </div>

        <div
          id="step-product-selection"
          className={`step-container ${activeStep === "product" ? "active" : ""}`}
        >
          <h2 className="text-2xl font-semibold text-stone-600 mb-6">
            Sélectionnez votre appareil
          </h2>
          <p className="text-sm text-stone-500 mb-4">
            (Cliquez sur <span className="font-bold text-blue-600 info-btn">i</span> pour
            télécharger la notice)
          </p>
          <div
            id="product-list"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full"
          >
            {filteredProducts.map((product) => (
              <div key={product.id} className="product-item">
                <button
                  className="product-btn-text"
                  type="button"
                  onClick={() => {
                    setSelectedProduct(product);
                    setActiveStep("serial");
                  }}
                >
                  {product.label}
                </button>
                <button
                  className="info-btn"
                  type="button"
                  onClick={() => {
                    if (product.manualUrl) {
                      window.open(product.manualUrl, "_blank");
                    }
                  }}
                  aria-label="Télécharger la notice"
                >
                  i
                </button>
              </div>
            ))}
          </div>
          <p className="text-sm text-stone-500 mt-6" id="appareil-non-trouve-container">
            Vous ne trouvez pas votre appareil ?{" "}
            <button
              id="appareil-non-trouve"
              className="font-medium obera-blue-text hover:underline"
              type="button"
              onClick={() => {
                const outcome = {
                  ...DIAGNOSTIC_OUTCOMES.sav,
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
              onChange={(e) => setSerialNumber(e.target.value)}
            />
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
            {currentDiagStep ? (
              <div className="space-y-4">
                <p className="text-base font-medium text-stone-700">{currentDiagStep.question}</p>
                <div className="space-y-2">
                  {currentDiagStep.options.map((opt, idx) => (
                    <label
                      key={`${currentDiagStep.id}-${idx}`}
                      className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 cursor-pointer hover:bg-stone-50"
                    >
                      <input
                        type="radio"
                        name="diagnostic-option"
                        checked={selectedOptionIdx === idx}
                        onChange={() => setSelectedOptionIdx(idx)}
                      />
                      <span className="text-stone-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-stone-500">Diagnostic en attente.</p>
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
                if (!currentDiagStep || selectedOptionIdx === null) return;
                handleDiagnosticOption(currentDiagStep.options[selectedOptionIdx]);
              }}
            >
              Suivant
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
                Appareil : {selectedProduct?.label ?? "-"} · Numéro de série :{" "}
                {serialNumber || "-"}
              </p>
            </div>
          )}

          {(feedbackState === "no" || (diagOutcome && diagOutcome.id !== "resolved")) && (
            <div
              id="contact-buttons-container"
              className="w-full mt-8 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {diagOutcome?.id === "filter" ? (
                <button
                  className="px-6 py-2 text-white rounded-lg shadow-md transition obera-green obera-green-hover"
                  type="button"
                  onClick={openConsumablesFromSummary}
                >
                  Commander des consommables
                </button>
              ) : (
                <button
                  className="px-6 py-2 text-white rounded-lg shadow-md transition obera-blue obera-blue-hover"
                  type="button"
                  onClick={openContactForm}
                >
                  Contacter le SAV
                </button>
              )}
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
                  value={selectedProduct?.label ?? ""}
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
                  **Pièces jointes :** Pour joindre des photos, veuillez les **ajouter
                  manuellement** à l'e-mail qui s'ouvrira après avoir cliqué sur 'Envoyer'.
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
                Pour joindre des photos (ex: étiquette filtre), veuillez les **ajouter
                manuellement** à l'e-mail qui s'ouvrira.
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
                Intervention enregistrée (simulation).
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
          <h2 className="text-2xl font-semibold text-stone-600 mb-6">
            Tableau de Bord SAV (Simulation)
          </h2>
          <p className="text-stone-500 mb-6">
            Données clés basées sur l'historique des interventions (Simulation).
          </p>

          <button
            id="open-manual-sav"
            className="px-6 py-2 text-white rounded-lg shadow-md transition obera-red obera-red-hover mb-6"
            type="button"
            onClick={() => setActiveStep("manual-sav")}
          >
            + Saisie Manuelle d'Intervention
          </button>

          <div className="w-full p-6 bg-white rounded-xl shadow-lg text-left space-y-8">
            <div>
              <h3 className="font-bold text-xl obera-blue-text mb-4 border-b pb-2 border-stone-200">
                1. Synthèse Globale des Opérations (Derniers 90 jours)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="kpi-card">
                  <div className="text-2xl font-bold text-blue-600">4.5h</div>
                  <div className="text-xs text-stone-500 mt-1">
                    Tps Réponse (1er contact)
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="text-2xl font-bold text-green-600">3.2 jours</div>
                  <div className="text-xs text-stone-500 mt-1">
                    Tps Moyen de Résolution
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="text-2xl font-bold text-red-600">650 €</div>
                  <div className="text-xs text-stone-500 mt-1">
                    Coût M. SAV Technique
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="text-2xl font-bold obera-green">88%</div>
                  <div className="text-xs text-stone-500 mt-1">Taux de Résolution Global</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-xl obera-blue-text mb-4 border-b pb-2 border-stone-200">
                2. Analyse des Pannes et des Pièces Défaillantes
              </h3>

              <h4 className="font-semibold text-base text-stone-700 mt-4 mb-2">
                Type de Panne le Plus Fréquent (Base CSV Sovelor)
              </h4>
              <div className="space-y-3 p-3 bg-stone-50 rounded-lg">
                <div className="flex items-center">
                  <span className="w-40 text-sm font-medium text-stone-600">
                    Pompe HS (Rafraîchisseurs)
                  </span>
                  <div className="w-full bg-stone-200 rounded-full h-4 ml-2">
                    <div
                      className="chart-bar h-4 rounded-full bg-red-500"
                      style={{ width: "55%" }}
                    >
                      55% (52 cas/75 Sovelor 2023)
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="w-40 text-sm font-medium text-stone-600">
                    Filtre Colmaté (Dépoussiéreurs)
                  </span>
                  <div className="w-full bg-stone-200 rounded-full h-4 ml-2">
                    <div className="chart-bar h-4 rounded-full" style={{ width: "35%" }}>
                      35% (Pression Diff. Haute)
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="w-40 text-sm font-medium text-stone-600">
                    Problème Alimentation (Purificateurs)
                  </span>
                  <div className="w-full bg-stone-200 rounded-full h-4 ml-2">
                    <div className="chart-bar h-4 rounded-full" style={{ width: "10%" }}>
                      10% (Erreur fusible/carte)
                    </div>
                  </div>
                </div>
              </div>

              <h4 className="font-semibold text-base text-stone-700 mt-4 mb-2">
                Pièces Détachées les Plus Défaillantes (Global)
              </h4>
              <div className="space-y-1 text-sm p-3 bg-stone-50 rounded-lg">
                <p className="text-stone-600">
                  **1. Pompe** (Rafraîchisseurs) : 59% des remplacements de pièces hors filtres.
                </p>
                <p className="text-stone-600">
                  **2. Carte électronique/Mère** : 18% (Souvent lié à une absence d'allumage).
                </p>
                <p className="text-stone-600">
                  **3. Vérin/Actionneur** : 11% (Dépoussiéreurs, Epur Box - Voir SAV1012).
                </p>
              </div>

              <h4 className="font-semibold text-base text-stone-700 mt-4 mb-2">
                Filtres les Plus Utilisés / Demandés
              </h4>
              <div className="space-y-1 text-sm p-3 bg-stone-50 rounded-lg">
                <p className="text-stone-600">
                  **1. Filtre H13** : 45% (Tous Purificateurs et Dépoussiéreurs Haute Efficacité).
                </p>
                <p className="text-stone-600">
                  **2. Sac Collecteur** : 30% (DUSTOMAT 4, 10, 16M).
                </p>
                <p className="text-stone-600">
                  **3. Panneau Alvéolaire** : 15% (Rafraîchisseurs - Usure et casse).
                </p>
              </div>

              <h4 className="font-semibold text-base text-stone-700 mt-4 mb-2">
                Type d'Appareil le Plus Sollicité (Total Cas)
              </h4>
              <div className="space-y-1 text-sm p-3 bg-stone-50 rounded-lg">
                <p className="text-stone-600">
                  **1. Ecoclim 22 / IC 22** : 24% des dossiers (65 cas dans l'historique).
                </p>
                <p className="text-stone-600">
                  **2. DUSTOMAT 4-24** : 15% des dossiers (24 cas dans l'historique).
                </p>
                <p className="text-stone-600">
                  **3. ePURBOX / ePUR** : 12% des dossiers.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-xl obera-blue-text mb-4 border-b pb-2 border-stone-200">
                3. Efficacité de l'Application (Simulée)
              </h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-green-100 rounded-lg">
                  <div className="text-3xl font-bold text-green-700">65%</div>
                  <div className="text-sm text-green-600">
                    Taux de Résolution via App ("Oui")
                  </div>
                </div>
                <div className="p-4 bg-red-100 rounded-lg">
                  <div className="text-3xl font-bold text-red-700">35%</div>
                  <div className="text-sm text-red-600">Taux Contact SAV ("Non")</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-xl obera-blue-text mb-4 border-b pb-2 border-stone-200">
                4. Dernières Connexions Clients
              </h3>
              <div className="space-y-3 text-sm p-3 bg-stone-50 rounded-lg">
                <div className="border-b pb-2">
                  <p className="font-semibold text-stone-700">
                    CL15397 - REFRESCO France (05/03 - 10h15)
                  </p>
                  <p className="text-stone-600 italic">
                    Appareil : **Ecoclim 22**. Étapes : Catégorie{" -> "}Sélection produit
                    {" -> "}Saisie S/N{" -> "}Diagnostic (pump-issue). **Fin : Contact SAV.**
                  </p>
                </div>
                <div className="border-b pb-2">
                  <p className="font-semibold text-stone-700">CL14447 - TEOS (05/03 - 09h50)</p>
                  <p className="text-stone-600 italic">
                    Appareil : **EpurEx 1000**. Étapes : Catégorie{" -> "}Diagnostic
                    (filter-issue-ex). **Fin : Commande Consommable (Tube Plongeur).**
                  </p>
                </div>
                <div className="border-b pb-2">
                  <p className="font-semibold text-stone-700">
                    CL11614 - 3 MA Group (04/03 - 16h20)
                  </p>
                  <p className="text-stone-600 italic">
                    Appareil : **DUSTOMAT 4-10**. Étapes : Catégorie{" -> "}Diagnostic
                    (dry-sensor-tuyaux-advice). **Fin : Résolu (Feedback "Oui").**
                  </p>
                </div>
                <div className="border-b pb-2">
                  <p className="font-semibold text-stone-700">OBERACLIENT (04/03 - 14h00)</p>
                  <p className="text-stone-600 italic">
                    Appareil : **IC 12**. Étapes : Catégorie{" -> "}Sélection produit. **Fin :
                    Abandon (Sans Diagnostic).**
                  </p>
                </div>
              </div>
            </div>
          </div>

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
