import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../auth/adminAuth";

export default function AdminSessionBar() {
  const { isAuthenticated, logout } = useAdminAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) return null;

  return (
    <div className="admin-session-bar" data-no-i18n="true">
      <Link to="/" className="admin-session-link">
        Portail
      </Link>
      <button
        type="button"
        className="admin-session-logout"
        onClick={() => {
          logout();
          navigate("/", { replace: true });
        }}
      >
        Deconnexion
      </button>
    </div>
  );
}

