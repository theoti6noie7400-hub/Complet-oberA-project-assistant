import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../auth/adminAuth";

export default function RequireAdmin({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAdminAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/admin-login?next=${encodeURIComponent(next)}`} replace />;
  }

  return children;
}

