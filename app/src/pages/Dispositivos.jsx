import { Cpu, Laptop, Monitor, Smartphone, Tablet } from "lucide-react";

const dispositivos = [
  { id: 1, tipo: "movil", nombre: "Moto G22", mac: "A4:7B:9D:21:4F:10", usuario: "Operario 01", estado: "Conectado" },
  { id: 2, tipo: "tablet", nombre: "Tablet Planta", mac: "7C:2A:31:88:B0:42", usuario: "Jefe de planta", estado: "Conectado" },
  { id: 3, tipo: "laptop", nombre: "Laptop Administración", mac: "18:65:90:3C:77:AD", usuario: "Administrador", estado: "Conectado" },
  { id: 4, tipo: "pc", nombre: "PC Sala de Control", mac: "D0:11:E5:62:09:BC", usuario: "Owner", estado: "Desconectado" },
  { id: 5, tipo: "iot", nombre: "ESP32 Telar 01", mac: "24:6F:28:AA:10:01", usuario: "Sistema", estado: "Conectado" },
];

const iconos = { movil: Smartphone, tablet: Tablet, laptop: Laptop, pc: Monitor, iot: Cpu };

export default function Dispositivos() {
  return (
    <div className="config-page">
      <section className="config-section">
        <div className="section-label">
          <span>Dispositivos conectados</span>
          <span className="section-count">{dispositivos.filter((item) => item.estado === "Conectado").length}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Dispositivo</th><th>MAC</th><th>Usuario</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {dispositivos.map((item) => {
                const Icono = iconos[item.tipo] || Cpu;
                const conectado = item.estado === "Conectado";
                return (
                  <tr key={item.id}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                        <Icono size={19} />
                        <strong>{item.nombre}</strong>
                      </span>
                    </td>
                    <td><span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{item.mac}</span></td>
                    <td>{item.usuario}</td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <i aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: conectado ? "#10b981" : "currentColor", opacity: conectado ? 1 : .35 }} />
                        <span style={conectado ? undefined : { opacity: .55 }}>{item.estado}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
