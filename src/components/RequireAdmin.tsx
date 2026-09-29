import { Link, Navigate, useLocation } from "react-router-dom";
import { canUseInternalPath, useAdminAuth } from "../auth/adminAuth";

export default function RequireAdmin({ children }: { children: JSX.Element }) {
  const { isLoading, isAuthenticated, role } = useAdminAuth();
  const location = useLocation();

  if (isLoading) return <p role="status">Vérification de la session…</p>;

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/admin-login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (!canUseInternalPath(role, location.pathname)) {
    return <main className="portal-page p-8"><h1>Accès refusé</h1>
      <Link to="/">Retour Portail</Link></main>;
  }

  return children;
}
