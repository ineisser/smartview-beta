import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { useEffect, useState } from 'react';
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
import { useRegistrarPresencia } from "./hooks/useDispositivosOrg";

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

function PlantShell() {
  const { orgCodigo } = useParams();
  const { profile, plantas, cargarOrganizacion, user } = useAuth();
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true; setError('');
    cargarOrganizacion(orgCodigo).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [orgCodigo, user?.uid]);
  if (error) return <main><p role="alert">{error}</p><a href="/inicio">Volver a mis plantas</a></main>;
  if (profile && !['superusuario', 'soporte'].includes(profile.rolPlataforma) && !plantas.some(p => p.codigo === orgCodigo)) return <main><p role="alert">No tienes acceso activo a esta planta.</p><a href="/inicio">Volver a mis plantas</a></main>;
  if (profile?.codigo !== orgCodigo || !profile?.activo || !profile?.planta) return <Boot />;
  return <Shell key={orgCodigo} />;
}

export default function App() {
  const { user, profile } = useAuth();
  const presenciaError = useRegistrarPresencia(profile?.activo ? profile?.codigo : '', user, profile);
  return (
    <>
    {presenciaError && <p role="alert">{presenciaError}</p>}
    <Routes>
      <Route path="/" element={<Guest><Welcome /></Guest>} />
      <Route path="/login" element={<Guest><Login /></Guest>} />
      <Route path="/registro" element={<Guest><Register /></Guest>} />
      <Route path="/telefono" element={<Private><Phone /></Private>} />
      <Route path="/onboarding" element={<Private><Onboarding /></Private>} />
      <Route path="/inicio" element={<Private><Home /></Private>} />
      <Route path="/plataforma" element={<Private><Platform /></Private>} />
      <Route path="/invitar/:token" element={<Invite />} />
      <Route path="/:orgCodigo/analisis" element={<Private><PlantShell /></Private>} />
      <Route path="/:orgCodigo/configuracion" element={<Private><PlantShell /></Private>} />
      <Route path="/:orgCodigo/dispositivos" element={<Private><PlantShell /></Private>} />
      <Route path="/:orgCodigo/ficha" element={<Private><PlantShell /></Private>} />
      <Route path="/:orgCodigo/notificaciones" element={<Private><PlantShell /></Private>} />
      <Route path="/:orgCodigo/mensajes" element={<Private><PlantShell /></Private>} />
      <Route path="/:orgCodigo/laboratorio" element={<Private><PlantShell /></Private>} />
      <Route path="/:orgCodigo/:salaCodigo/analisis" element={<Private><PlantShell /></Private>} />
      <Route path="/:orgCodigo/:salaCodigo/setup" element={<Private><PlantShell /></Private>} />
      <Route path="/:orgCodigo/:salaCodigo" element={<Private><PlantShell /></Private>} />
      <Route path="/app" element={<Navigate to="/inicio" replace />} />
      <Route path="/continuar" element={<Continue />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
