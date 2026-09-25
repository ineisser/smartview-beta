import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Boot from "./Boot";

export default function Continue() {
  const { user, profile, loading } = useAuth();
  if (loading) return <Boot />;
  if (!user) return <Navigate to="/login" replace />;
  const pendiente = sessionStorage.getItem("smartview-invitacion");
  if (pendiente) return <Navigate to={`/invitar/${pendiente}`} replace />;
  if (profile?.rolPlataforma) return <Navigate to="/plataforma" replace />;
  const lista = profile?.onboardingCompleto || profile?.rolTenant || profile?.organizacion || profile?.planta;
  if (lista && profile?.codigo) {
    const sala = profile?.planta?.salas?.[0];
    const codigoSala = sala?.codigo;
    if (codigoSala) return <Navigate to={`/${profile.codigo}/${codigoSala}`} replace />;
    if (profile.organizacion || profile.planta) return <Navigate to="/inicio" replace />;
  }
  if (!profile?.telefono && !lista) return <Navigate to="/telefono" replace />;
  if (!profile?.onboardingCompleto && !lista) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/inicio" replace />;
}
