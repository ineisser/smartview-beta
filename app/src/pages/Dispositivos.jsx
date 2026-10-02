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
  const conectados = dispositivos.filter((item) => item.estado === "Conectado").length;

  return (
    <section className="config-section">
      <div className="config-section-head">
        <h2>Dispositivos</h2>
        <span className="section-count">{conectados}</span>
      </div>
      <div className="sheet is-small">
        <table>
          <thead>
            <tr>
              <th>Dispositivo</th>
              <th>MAC</th>
              <th>Usuario</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {dispositivos.map((item) => {
              const Icono = iconos[item.tipo] || Cpu;
              const conectado = item.estado === "Conectado";
              return (
                <tr key={item.id} className={conectado ? "" : "is-off"}>
                  <td>
                    <span className="estado-fila">
                      <Icono size={18} />
                      {item.nombre}
                    </span>
                  </td>
                  <td className="col-correo">{item.mac}</td>
                  <td>{item.usuario}</td>
                  <td>
                    <span className="estado-fila">
                      {item.estado}
                      {conectado ? <i className="estado-punto" aria-hidden="true" /> : null}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
