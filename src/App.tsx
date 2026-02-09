import { Navigate, Route, Routes } from "react-router-dom";
import AssistantOberaPage from "./pages/AssistantOberaPage";
import CharbonActifPage from "./pages/CharbonActifPage";
import PortalHomePage from "./pages/PortalHomePage";
import ServicePlaceholderPage from "./pages/ServicePlaceholderPage";
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
                <ServicePlaceholderPage />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminAuthProvider>
    </LanguageProvider>
  );
}
