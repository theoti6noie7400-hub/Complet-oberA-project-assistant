import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../auth/adminAuth";

export default function AdminSessionBar() {
  const { isAuthenticated, logout, role } = useAdminAuth();
  const navigate = useNavigate();
  const [logoutError, setLogoutError] = useState(false);

  if (!isAuthenticated) return null;

  const roleLabel = role === "global_admin" ? "Admin global" : role ?? "Compte interne";

  return (
    <div className="admin-session-bar" title={roleLabel}>
      <Link to="/" className="admin-session-link">
        Portail
      </Link>
      <button
        type="button"
        className="admin-session-logout"
        onClick={async () => {
          if (await logout()) navigate("/admin-login", { replace: true });
          else setLogoutError(true);
        }}
      >
        Deconnexion
      </button>
      {logoutError && <span role="alert">Déconnexion impossible. Réessayez.</span>}
    </div>
  );
}
