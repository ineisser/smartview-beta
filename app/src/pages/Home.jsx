import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PlantSetup from "./PlantSetup";

export default function Home() {
  const { profile } = useAuth();
  const [step, setStep] = useState({ fase: "nombre", sala: "" });
  const fase = profile?.planta?.fase || step.fase;
  const primera = profile?.planta?.salas?.[0];
  const codigoSala = primera?.codigo || `${(String(primera?.nombre || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z]/g, "").slice(0, 2) || "SA").toUpperCase()}01`;
  useEffect(() => {
    if (!profile?.planta?.fase || profile.planta.fase === "sistema" || profile.planta.fase === "lista") return;
    const sala = profile.planta.salas?.[profile.planta.salaIndex]?.nombre || "";
    setStep({ fase: profile.planta.fase, sala });
  }, [profile?.planta?.fase, profile?.planta?.salaIndex]);
  if (profile?.codigo && primera && (fase === "sistema" || fase === "lista" || fase === "nombre" || fase === "otra" || profile?.planta?.confirmada)) {
    return <Navigate to={`/${profile.codigo}/${codigoSala}`} replace />;
  }
  const enSala = ["cantidad", "maquinas", "motivosCantidad", "motivos", "turnos", "horarios"].includes(step.fase);
  return (
    <main className={`plant${enSala ? " has-footer" : ""}`}>
      <section className="plant-side">
        <p className="brand">Smart View</p>
        {enSala ? (
          <>
            <h1>Continuemos con la sala de {step.sala}</h1>
            <p className="lede">
              {step.fase === "cantidad" && "Indica cuántas máquinas hay. Si prefieres dejarlo para después, salta este paso."}
              {step.fase === "maquinas" && "Baja la lista, completa marca, modelo y serie, y cuando estés listo impórtala."}
              {step.fase === "motivos" && `Necesitamos la lista de motivos de paro de los telares de ${step.sala}. No es el historial de paros: son los motivos. Descarga el formato, cámbialo si hace falta y súbelo. Queda guardado en motivos.`}
              {(step.fase === "turnos" || step.fase === "horarios") && "Indica cuántos turnos trabajan y de qué hora a qué hora."}
            </p>
          </>
        ) : (
          <>
            <h1>Bienvenido</h1>
            <p className="lede">Tu organización quedó registrada. Continuamos con la configuración de tu planta.</p>
            <p className="summary">
              <strong>{profile?.organizacion || "Tu organización"}</strong>
              <br />
              {profile?.rubro || "Sin rubro"}
            </p>
          </>
        )}
      </section>
      <section className="plant-main">
        <PlantSetup onFase={setStep} />
      </section>
    </main>
  );
}
