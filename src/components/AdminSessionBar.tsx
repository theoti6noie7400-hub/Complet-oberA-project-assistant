import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../auth/adminAuth";

export default function AdminSessionBar() {
  const { isAuthenticated, logout, role, displayName, serviceKey } = useAdminAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) return null;

  const roleLabel =
    role === "global"
      ? "Admin global"
      : serviceKey
        ? `Admin ${displayName ?? serviceKey}`
        : "Admin service";

  return (
    <div className="admin-session-bar" title={roleLabel}>
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
