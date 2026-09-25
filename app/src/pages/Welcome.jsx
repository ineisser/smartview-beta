import { useNavigate } from "react-router-dom";
import Screen from "../components/Screen";

export default function Welcome() {
  const navigate = useNavigate();
  return (
    <Screen title="Bienvenido" lede="Entra a Smart View o crea tu cuenta.">
      <div className="actions">
        <button className="btn btn-primary" onClick={() => navigate("/login")}>Entrar</button>
        <button className="btn btn-ghost" onClick={() => navigate("/registro")}>Crear cuenta</button>
      </div>
    </Screen>
  );
}
