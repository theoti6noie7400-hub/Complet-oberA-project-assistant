import { Navigate, Route, Routes } from "react-router-dom";
import AssistantOberaPage from "./pages/AssistantOberaPage";
import CharbonActifPage from "./pages/CharbonActifPage";
import PortalHomePage from "./pages/PortalHomePage";
import ServicePlaceholderPage from "./pages/ServicePlaceholderPage";
import {
  LanguageProvider,
  LanguageSwitcher,
  RuntimeTextTranslator
} from "./i18n/language";

export default function App() {
  return (
    <LanguageProvider>
      <RuntimeTextTranslator />
      <LanguageSwitcher />
      <Routes>
        <Route path="/" element={<PortalHomePage />} />
        <Route path="/sav-maintenance" element={<AssistantOberaPage />} />
        <Route path="/charbon-actif" element={<CharbonActifPage />} />
        <Route path="/service/:serviceKey" element={<ServicePlaceholderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LanguageProvider>
  );
}
