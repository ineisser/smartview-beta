// Fuente de demostración aislada: sustituir este módulo al incorporar presencia real.
// No detecta equipos, no obtiene MAC del navegador y no escribe en Firebase.
const ahora = Date.now();
const registro = (id, tipo, nombre, usuario, estado, minutos, mac) => ({
  id, tipo, nombre, usuario, estado, mac, ultima: ahora - minutos * 60000,
  historial: [0, 3, 8, 15, 24, 40, 60].map((offset) => ahora - (minutos + offset) * 60000),
});
export const dispositivosDemo = [
  registro('demo-movil', 'movil', 'Móvil de supervisión', 'Supervisor', 'Conectado', 2, 'A4:7B:9D:21:4F:10'),
  registro('demo-tablet', 'tablet', 'Tablet Planta', 'Jefe de planta', 'Conectado', 5, '7C:2A:31:88:B0:42'),
  registro('demo-laptop', 'laptop', 'Laptop Administración', 'Administrador', 'Conectado', 8, '18:65:90:3C:77:AD'),
  registro('demo-desktop', 'desktop', 'PC Sala de Control', 'Owner', 'Desconectado', 36 * 1440, 'D0:11:E5:62:09:BC'),
  registro('demo-iot', 'iot', 'ESP32 Telar 01', 'Sistema', 'Conectado', 1, '24:6F:28:AA:10:01'),
];
export const contarConectados = (dispositivos) => dispositivos.filter((item) => item.estado === 'Conectado').length;
