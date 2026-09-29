import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { canUseInternalPath, useAdminAuth, type InternalRole } from "../auth/adminAuth";

function withBase(path: string): string {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${path.replace(/^\/+/, "")}`;
}

export default function AdminLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const logoSrc = useMemo(() => withBase("obera-logo.png"), []);
  const [logoFailed, setLogoFailed] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const next = searchParams.get("next") || "/sav-maintenance";
  const [submitting, setSubmitting] = useState(false);

  const homeForRole: Record<InternalRole, string> = {
    global_admin: "/sav-maintenance", sav_manager: "/sav-maintenance",
    sav_technician: "/sav-maintenance", marketing: "/service/marketing",
    sales: "/service/commercial", adv: "/service/adv", logistics: "/service/logistique"
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const verifiedRole = await login(adminId, pin);
    setSubmitting(false);
    setPin("");
    if (!verifiedRole) {
      setError(true);
      return;
    }
    setError(false);
    navigate(canUseInternalPath(verifiedRole, next) ? next : homeForRole[verifiedRole], { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-stone-100">
      <div className="w-full max-w-md rounded-xl bg-white shadow-lg p-8">
        <div className="text-center mb-8">
          {!logoFailed ? (
            <img
              src={logoSrc}
              alt="OberA"
              className="logo-img mx-auto"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <div className="logo-fallback">
              ober<span className="logo-fallback-accent">A</span>
            </div>
          )}
          <p className="mt-3 text-sm text-stone-500">Connexion interne</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="internal-id" className="block text-sm font-medium text-stone-700 mb-1">
              Identifiant interne
            </label>
            <input
              type="text"
              id="internal-id"
              className="w-full p-3 rounded-md border border-stone-300"
              placeholder="Votre identifiant"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="internal-pin" className="block text-sm font-medium text-stone-700 mb-1">
              Code PIN
            </label>
            <input
              type="password"
              id="internal-pin"
              className="w-full p-3 rounded-md border border-stone-300"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              inputMode="numeric"
              maxLength={12}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">
              Connexion refusée. Vérifiez vos informations ou réessayez plus tard.
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 text-white rounded-lg shadow-md transition obera-blue obera-blue-hover"
          >
            {submitting ? "Vérification…" : "Acceder"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link to="/" className="text-sm text-stone-600 hover:underline">
            Retour Portail
          </Link>
        </div>
      </div>
    </div>
  );
}
