import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../auth/adminAuth";

export default function AdminSessionBar() {
  const { isAuthenticated, logout, role } = useAdminAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState(false);

  if (!isAuthenticated) return null;

  const roleLabel = role === "global_admin" ? "Admin global" : role ?? "Compte interne";

  return (
    <div className="fixed right-4 bottom-4 z-[1190] flex flex-col items-end gap-2" title={roleLabel}>
      <button
        type="button"
        className="obera-btn-outline bg-white shadow-lg"
        onClick={async () => {
          if (await logout()) navigate("/admin-login", { replace: true });
          else setLogoutError(true);
        }}
      >
        Déconnexion
      </button>
      {logoutError && <span role="alert" className="rounded bg-white px-3 py-2 text-sm shadow-lg">Déconnexion impossible. Réessayez.</span>}
    </div>
  );
}
