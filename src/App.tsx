import { Navigate, Route, Routes } from "react-router-dom";
import AssistantOberaPage from "./pages/AssistantOberaPage";
import CharbonActifPage from "./pages/CharbonActifPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AssistantOberaPage />} />
      <Route path="/charbon-actif" element={<CharbonActifPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
