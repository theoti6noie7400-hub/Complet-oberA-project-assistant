import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

function withBase(path: string): string {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${path.replace(/^\/+/, "")}`;
}

type PortalTopBarProps = {
  subtitle?: string;
};

export default function PortalTopBar({ subtitle }: PortalTopBarProps) {
  const logoSrc = useMemo(() => withBase("obera-logo.png"), []);
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <header className="portal-topbar">
      <div className="portal-topbar-inner">
        <Link to="/" className="portal-brand">
          {!logoFailed ? (
            <img
              src={logoSrc}
              alt="OberA"
              className="portal-brand-logo"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="portal-brand-fallback" aria-label="OberA">
              ober<span className="portal-brand-fallback-accent">A</span>
            </span>
          )}
          <div className="portal-brand-text">
            <p className="portal-brand-title">Portail OberA</p>
            {subtitle ? <p className="portal-brand-subtitle">{subtitle}</p> : null}
          </div>
        </Link>

        <nav className="portal-topnav" aria-label="Navigation Portail">
          <Link to="/" className="portal-nav-link">
            Portail
          </Link>
          <Link to="/sav-maintenance" className="portal-nav-link">
            SAV / Maintenance
          </Link>
        </nav>
      </div>
    </header>
  );
}

