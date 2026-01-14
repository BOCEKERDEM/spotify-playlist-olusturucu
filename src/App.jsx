import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Callback from "./pages/Callback";
import Choose from "./pages/Choose";
import Builder from "./pages/Builder";
import Export from "./pages/Export";
import Done from "./pages/Done";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/callback" element={<Callback />} />

      {/* Login sonrası seçim ekranı */}
      <Route path="/choose" element={<Choose />} />

      {/* Import / Export ekranları */}
      <Route path="/builder" element={<Builder />} />
      <Route path="/export" element={<Export />} />

      {/* Sonuç ekranı */}
      <Route path="/done" element={<Done />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
