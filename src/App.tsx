import { Navigate, Route, Routes } from "react-router-dom";
import AssistantOberaPage from "./pages/AssistantOberaPage";
import CharbonActifPage from "./pages/CharbonActifPage";
import PortalHomePage from "./pages/PortalHomePage";
import ServiceHubPage from "./pages/ServiceHubPage";
import ResellerSpacePage from "./pages/ResellerSpacePage";
import ClientSpaceUnavailablePage from "./pages/ClientSpaceUnavailablePage";
import InternalClientParkPage from "./pages/InternalClientParkPage";
import InternalClientPreviewPage from "./pages/InternalClientPreviewPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import { AdminAuthProvider } from "./auth/adminAuth";
import RequireAdmin from "./components/RequireAdmin";
import AdminSessionBar from "./components/AdminSessionBar";
import LocalRecipeBanner from "./components/LocalRecipeBanner";
import {
  LanguageProvider,
  LanguageSwitcher,
  RuntimeTextTranslator
} from "./i18n/language";

export default function App() {
  const localRecipe = import.meta.env.DEV && import.meta.env.VITE_LOCAL_RECIPE === "1";
  return (
    <LanguageProvider>
      <AdminAuthProvider>
        {localRecipe && <LocalRecipeBanner><LanguageSwitcher /></LocalRecipeBanner>}
        <RuntimeTextTranslator />
        {!localRecipe && <LanguageSwitcher />}
        <AdminSessionBar />
        <Routes>
          <Route path="/" element={<PortalHomePage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/client-space/*" element={<ClientSpaceUnavailablePage />} />
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
          <Route path="/sav-maintenance/clients" element={<RequireAdmin><InternalClientParkPage /></RequireAdmin>} />
          <Route path="/sav-maintenance/client-preview" element={<RequireAdmin><InternalClientParkPage /></RequireAdmin>} />
          <Route path="/sav-maintenance/clients/:clientId/devices/:deviceId"
            element={<RequireAdmin><InternalClientPreviewPage /></RequireAdmin>} />
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
