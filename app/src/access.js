export const codigoOrganizacion = (uid) => `SV${String(uid || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16).toUpperCase()}`;

export const DIAS_INVITACION = 7;

export const PERFILES_TENANT = [
  { id: "owner", label: "Propietario" },
  { id: "admin", label: "Administrador" },
  { id: "jefe", label: "Jefe" },
  { id: "operario", label: "Operario" },
];

export const PERFILES_INVITACION = PERFILES_TENANT.filter((item) => item.id !== "owner");

export const esOwner = (rol) => rol === "owner" || rol === "superusuario";
export const esAdmin = (rol) => rol === "admin";
export const esPlanta = (rol) => esOwner(rol) || esAdmin(rol);

export const etiquetaPerfil = (rol) => {
  if (rol === "plataforma") return "Superusuario";
  if (rol === "soporte") return "Soporte";
  if (esOwner(rol)) return "Propietario";
  return PERFILES_TENANT.find((item) => item.id === rol)?.label || "Soporte";
};

export const descripcionPerfil = (rol) => {
  if (rol === "plataforma") return "Acceso total a la plataforma y a las organizaciones.";
  if (esOwner(rol)) return "Ve y administra toda la organización, las salas, los usuarios y la facturación.";
  if (rol === "admin") return "Mismos accesos que el propietario: planta, salas y usuarios. La facturación llega al propietario.";
  if (rol === "jefe") return "Ve el historial y las estadísticas, y comenta paros en las salas asignadas. No invita usuarios.";
  if (rol === "operario") return "Carga paros y marca enterado en las salas asignadas. No ve eficiencia.";
  if (rol === "soporte") return "Da soporte a las organizaciones y puede editar la planta.";
  return "Acceso a la plataforma.";
};

export const correoValido = (valor) => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(String(valor || "").trim());

const plataforma = (profile) => profile?.rolPlataforma === "superusuario" || profile?.rolPlataforma === "soporte";

export function permisos(profile) {
  const plat = profile?.rolPlataforma || "";
  const tenant = profile?.rolTenant || "";
  const esPlatSuper = plat === "superusuario";
  const esSoporte = plat === "soporte";
  const planta = esPlanta(tenant);
  return {
    facturacion: esPlatSuper || planta,
    invitar: esPlatSuper || planta,
    invitarSoporte: esPlatSuper,
    editarPlanta: esPlatSuper || esSoporte || planta,
    cargarParo: esPlatSuper || planta || tenant === "operario" || tenant === "jefe",
    comentar: esPlatSuper || esSoporte || planta || tenant === "jefe" || tenant === "operario",
    estadistica: tenant !== "operario",
    enterado: tenant === "operario" || tenant === "jefe",
    verSalas: plataforma(profile) || Boolean(tenant),
    salasDe(salas) {
      if (esPlatSuper || esSoporte || esOwner(tenant)) return salas;
      const asignadas = new Set(profile?.salasAsignadas || []);
      if (esAdmin(tenant) && asignadas.size === 0) return salas;
      return (salas || []).filter((sala) => asignadas.has(sala.codigo));
    },
  };
}
