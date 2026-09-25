import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";

export default function AppHome() {
  const { profile } = useAuth();
  return (
    <Screen title={profile?.organizacion || "Smart View"} lede="Ya estás dentro. La sesión sigue abierta.">
      <p className="summary">
        {profile?.rubro || "Sin rubro"} · {profile?.maquinas || "—"} máquinas · {profile?.salas || "—"} salas
      </p>
    </Screen>
  );
}
