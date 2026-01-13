import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Callback from "./pages/Callback";
import Builder from "./pages/Builder";
import Done from "./pages/Done";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/callback" element={<Callback />} />
      <Route path="/builder" element={<Builder />} />
      <Route path="/done" element={<Done />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
