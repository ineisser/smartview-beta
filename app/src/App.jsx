import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Phone from "./pages/Phone";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Shell from "./pages/Shell";
import Continue from "./pages/Continue";
import Platform from "./pages/Platform";
import Invite from "./pages/Invite";
import Boot from "./pages/Boot";

function Guest({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Boot />;
  if (user) return <Navigate to="/continuar" replace />;
  return children;
}

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Boot />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Guest><Welcome /></Guest>} />
      <Route path="/login" element={<Guest><Login /></Guest>} />
      <Route path="/registro" element={<Guest><Register /></Guest>} />
      <Route path="/telefono" element={<Private><Phone /></Private>} />
      <Route path="/onboarding" element={<Private><Onboarding /></Private>} />
      <Route path="/inicio" element={<Private><Home /></Private>} />
      <Route path="/plataforma" element={<Private><Platform /></Private>} />
      <Route path="/invitar/:token" element={<Invite />} />
      <Route path="/:orgCodigo/configuracion" element={<Private><Shell /></Private>} />
      <Route path="/:orgCodigo/ficha" element={<Private><Shell /></Private>} />
      <Route path="/:orgCodigo/notificaciones" element={<Private><Shell /></Private>} />
      <Route path="/:orgCodigo/mensajes" element={<Private><Shell /></Private>} />
      <Route path="/:orgCodigo/:salaCodigo/setup" element={<Private><Shell /></Private>} />
      <Route path="/:orgCodigo/:salaCodigo" element={<Private><Shell /></Private>} />
      <Route path="/app" element={<Navigate to="/inicio" replace />} />
      <Route path="/continuar" element={<Continue />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
