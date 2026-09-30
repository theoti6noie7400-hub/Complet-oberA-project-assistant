import { Navigate, Route, Routes } from "react-router-dom";
import AssistantOberaPage from "./pages/AssistantOberaPage";
import CharbonActifPage from "./pages/CharbonActifPage";
import PortalHomePage from "./pages/PortalHomePage";
import ServiceHubPage from "./pages/ServiceHubPage";
import ResellerSpacePage from "./pages/ResellerSpacePage";
import ExternalSpacePage from "./pages/ExternalSpacePage";
import AdminLoginPage from "./pages/AdminLoginPage";
import { AdminAuthProvider } from "./auth/adminAuth";
import RequireAdmin from "./components/RequireAdmin";
import AdminSessionBar from "./components/AdminSessionBar";
import {
  LanguageProvider,
  LanguageSwitcher,
  RuntimeTextTranslator
} from "./i18n/language";

export default function App() {
  return (
    <LanguageProvider>
      <AdminAuthProvider>
        <RuntimeTextTranslator />
        <LanguageSwitcher />
        <AdminSessionBar />
        <Routes>
          <Route path="/" element={<PortalHomePage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/client-space" element={<AssistantOberaPage />} />
          <Route path="/client-space/devices/:id" element={<ExternalSpacePage role="client" view="device" />} />
          <Route path="/client-space/diagnostic/:id" element={<ExternalSpacePage role="client" view="diagnostic" />} />
          <Route path="/client-space/requests/:id" element={<ExternalSpacePage role="client" view="request" />} />
          <Route path="/reseller-space" element={<ResellerSpacePage />} />
          <Route path="/reseller-space/requests/:id" element={<ResellerSpacePage />} />
          <Route
            path="/sav-maintenance"
            element={
              <RequireAdmin>
                <AssistantOberaPage forceAdmin />
              </RequireAdmin>
            }
          />
          <Route
            path="/charbon-actif"
            element={
              <RequireAdmin>
                <CharbonActifPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/service/:serviceKey"
            element={
              <RequireAdmin>
                <ServiceHubPage />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminAuthProvider>
    </LanguageProvider>
  );
}
