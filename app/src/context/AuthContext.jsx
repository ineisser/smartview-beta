import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { get, onValue, ref, set, update } from "firebase/database";
import { auth, rtdb } from "../firebase";
import { codigoOrganizacion, DIAS_INVITACION, esOwner } from "../access";
import { avisoAvancePorDefecto } from "../robotAvance";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const userRef = (uid) => ref(rtdb, `usuarios/${uid}`);
const orgRef = (codigo) => ref(rtdb, `organizaciones/${codigo}`);
const legacyRef = (uid) => ref(rtdb, `onboarding/${uid}`);
const inviteRef = (token) => ref(rtdb, `invitaciones/${token}`);
const platformRef = ref(rtdb, "plataforma/superusuario");
const localKey = (uid) => `smartview-usuario:${uid}`;

const ORG_KEYS = ["organizacion", "rubro", "procesos", "otrosRubro", "empleados", "personasPlanta", "maquinas", "salas", "planta"];

const readLocal = (uid) => {
  try {
    const raw = localStorage.getItem(localKey(uid)) || localStorage.getItem(`smartview-onboarding:${uid}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeLocal = (uid, data) => {
  try { localStorage.setItem(localKey(uid), JSON.stringify(data)); } catch { /* el navegador puede rechazar el almacenamiento */ }
};

const clearLocal = (uid) => {
  try {
    localStorage.removeItem(localKey(uid));
    localStorage.removeItem(`smartview-onboarding:${uid}`);
  } catch { /* nada que limpiar */ }
};

const readPath = (node) => Promise.race([
  get(node).then((snap) => (snap.exists() ? snap.val() : null)),
  new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
]);

const split = (data) => {
  const org = {};
  const usuario = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    if (ORG_KEYS.includes(key)) org[key] = value;
    else if (key !== "codigo" && key !== "prueba") usuario[key] = value;
  });
  return { org, usuario };
};

const vista = (usuario, org) => {
  if (!usuario) return null;
  return {
    ...usuario,
    codigo: org?.codigo || usuario.tenantId || "",
    organizacion: org?.nombre ?? usuario.organizacion ?? "",
    rubro: org?.rubro ?? "",
    procesos: org?.procesos ?? [],
    otrosRubro: org?.otrosRubro ?? "",
    empleados: org?.empleados ?? "",
    personasPlanta: org?.personasPlanta ?? "",
    maquinas: org?.maquinas ?? "",
    salas: org?.salasRango ?? "",
    planta: org?.planta ?? null,
    prueba: Boolean(org?.prueba),
    miembros: org?.miembros ?? {},
    avisosAvance: org?.avisosAvance ?? null,
  };
};

const orgDesdeLegacy = (codigo, legacy) => ({
  codigo,
  nombre: legacy.organizacion || "",
  rubro: legacy.rubro || "",
  procesos: legacy.procesos || [],
  otrosRubro: legacy.otrosRubro || "",
  empleados: legacy.empleados || "",
  personasPlanta: legacy.personasPlanta || "",
  maquinas: legacy.maquinas || "",
  salasRango: typeof legacy.salas === "string" ? legacy.salas : "",
  planta: legacy.planta || null,
  prueba: true,
});

const fichaMiembro = (datos) => ({
  uid: datos.uid || "",
  nombre: datos.nombre || "",
  email: String(datos.email || "").trim().toLowerCase(),
  telefono: datos.telefono || "",
  rol: datos.rol === "superusuario" ? "owner" : (datos.rol || "operario"),
  estado: datos.estado || "activo",
  salas: datos.salas || [],
  photoURL: datos.photoURL || "",
  token: datos.token || "",
  creadoEn: datos.creadoEn || Date.now(),
});

const encontrarMiembro = (org, usuario) => {
  const miembros = org?.miembros || {};
  const uid = usuario?.uid || "";
  const email = String(usuario?.email || "").trim().toLowerCase();
  if (uid && miembros[uid]) return { clave: uid, ...miembros[uid] };
  const lista = Object.entries(miembros);
  const porUid = lista.find(([, item]) => item?.uid && item.uid === uid);
  if (porUid) return { clave: porUid[0], ...porUid[1] };
  const porEmail = lista.find(([, item]) => item?.email && item.email === email);
  if (porEmail) return { clave: porEmail[0], ...porEmail[1] };
  return null;
};

const aplicarRolDeMiembro = (usuario, org) => {
  if (!usuario) return usuario;
  const miembro = encontrarMiembro(org, usuario);
  if (!miembro || miembro.estado === "inactivo" || miembro.estado === "revocada") return usuario;
  return {
    ...usuario,
    nombre: miembro.nombre || usuario.nombre,
    rolTenant: miembro.rol || usuario.rolTenant,
    salasAsignadas: Array.isArray(miembro.salas) ? miembro.salas : (usuario.salasAsignadas || []),
  };
};

const uidDeMiembro = (clave, previo = {}, uid) => {
  if (uid) return uid;
  if (previo.uid) return previo.uid;
  if (clave && clave !== "owner" && clave !== previo.token) return clave;
  return "";
};

const asegurarOwnerEnOrg = async (codigo, uid, usuario, org) => {
  if (!codigo || !uid) return org;
  const miembros = org?.miembros || {};
  const next = {};
  let cambio = false;
  Object.entries(miembros).forEach(([clave, item]) => {
    if (item?.rol === "superusuario") {
      next[clave] = { ...item, rol: "owner" };
      cambio = true;
    } else {
      next[clave] = item;
    }
  });
  if (!Object.values(next).some((item) => esOwner(item?.rol))) {
    next[uid] = fichaMiembro({
      uid,
      nombre: usuario?.nombre || "",
      email: usuario?.email || "",
      rol: "owner",
      estado: "activo",
      salas: [],
    });
    cambio = true;
  }
  if (!cambio) return org;
  const parche = {};
  Object.entries(next).forEach(([clave, item]) => {
    parche[`miembros/${clave}`] = item;
  });
  await update(orgRef(codigo), parche);
  return { ...(org || {}), codigo, miembros: next };
};

const miembroEnOrg = (org, usuario) => {
  const miembros = org?.miembros || {};
  const uid = usuario?.uid || "";
  const email = String(usuario?.email || "").trim().toLowerCase();
  return Object.values(miembros).find((item) => {
    if (!item || item.estado === "inactivo" || item.estado === "revocada") return false;
    if (uid && item.uid && item.uid === uid) return true;
    return Boolean(email && item.email && String(item.email).trim().toLowerCase() === email);
  }) || null;
};

const buscarOrgDeMiembro = async (usuario) => {
  const todas = await readPath(ref(rtdb, "organizaciones")).catch(() => null);
  if (!todas) return null;
  for (const [codigo, org] of Object.entries(todas)) {
    if (miembroEnOrg(org, usuario)) return { ...org, codigo };
  }
  return null;
};

const atarAOrganizacion = async (uid, usuario, org) => {
  if (!uid || !org?.codigo) return usuario;
  const miembro = miembroEnOrg(org, { ...usuario, uid });
  const siguiente = {
    ...usuario,
    uid,
    tenantId: org.codigo,
    rolTenant: miembro?.rol || usuario.rolTenant || "operario",
    salasAsignadas: Array.isArray(miembro?.salas) ? miembro.salas : (usuario.salasAsignadas || []),
    onboardingCompleto: true,
    nombre: miembro?.nombre || usuario.nombre || "",
  };
  if (usuario.tenantId !== siguiente.tenantId || usuario.rolTenant !== siguiente.rolTenant) {
    await update(userRef(uid), {
      tenantId: siguiente.tenantId,
      rolTenant: siguiente.rolTenant,
      salasAsignadas: siguiente.salasAsignadas,
      onboardingCompleto: true,
      nombre: siguiente.nombre,
    });
  }
  return siguiente;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");
  const profileRef = useRef(null);
  const orgState = useRef(null);
  const settling = useRef(false);
  const hasUser = useRef(false);
  const loggingOut = useRef(false);
  const freshLogin = useRef(false);

  const remember = (usuario, org = orgState.current) => {
    orgState.current = org;
    const next = vista(usuario, org);
    profileRef.current = next;
    setProfile(next);
    return next;
  };

  const cargarOrganizacion = async (codigo) => {
    if (!codigo) return null;
    const org = await readPath(orgRef(codigo));
    if (!org) return null;
    const usuario = { ...(profileRef.current || {}) };
    delete usuario.planta;
    remember(usuario, { ...org, codigo });
    if (user?.uid) writeLocal(user.uid, vista(usuario, { ...org, codigo }));
    return org;
  };

  const guardarOrg = async (codigo, patch, previa) => {
    const base = previa || orgState.current || { codigo };
    const next = { ...base, codigo };
    if ("organizacion" in patch) next.nombre = patch.organizacion;
    if ("salas" in patch && typeof patch.salas === "string") next.salasRango = patch.salas;
    ["rubro", "procesos", "otrosRubro", "empleados", "personasPlanta", "maquinas", "planta"].forEach((key) => {
      if (key in patch) next[key] = patch[key];
    });
    await update(orgRef(codigo), next);
    return next;
  };

  const saveProfile = async (uid, data) => {
    setDbError("");
    const { org, usuario } = split(data);
    const actual = profileRef.current || {};
    const usuarioNext = { ...actual, ...usuario };
    delete usuarioNext.planta;
    delete usuarioNext.organizacion;
    delete usuarioNext.rubro;
    delete usuarioNext.procesos;
    delete usuarioNext.otrosRubro;
    delete usuarioNext.empleados;
    delete usuarioNext.personasPlanta;
    delete usuarioNext.maquinas;
    delete usuarioNext.salas;
    delete usuarioNext.codigo;
    delete usuarioNext.prueba;
    let orgNext = orgState.current;
    try {
      if (Object.keys(usuario).length) await update(userRef(uid), usuario);
      if (Object.keys(org).length) {
        const codigo = orgNext?.codigo || usuarioNext.tenantId || actual.codigo || codigoOrganizacion(uid);
        if (!usuarioNext.rolPlataforma && !usuarioNext.tenantId) {
          usuarioNext.tenantId = codigo;
          usuarioNext.rolTenant = "owner";
          usuarioNext.salasAsignadas = [];
          await update(userRef(uid), { tenantId: codigo, rolTenant: "owner", salasAsignadas: [] });
        }
        orgNext = await guardarOrg(codigo, org, orgNext);
        if (esOwner(usuarioNext.rolTenant)) {
          orgNext = await asegurarOwnerEnOrg(codigo, uid, usuarioNext, orgNext);
        }
      }
      const next = remember(usuarioNext, orgNext);
      writeLocal(uid, next);
      return next;
    } catch (err) {
      setDbError("No se pudo guardar.");
      throw err;
    }
  };

  const migrar = async (uid, legacy) => {
    const identidad = {
      nombre: legacy.nombre || "",
      telefono: legacy.telefono || "",
      email: legacy.email || "",
      proveedor: legacy.proveedor || "",
      photoURL: legacy.photoURL || "",
      paso: legacy.paso || 0,
      pasos: legacy.pasos || {},
      onboardingCompleto: Boolean(legacy.onboardingCompleto),
      rolPlataforma: "",
      tenantId: "",
      rolTenant: "",
      salasAsignadas: [],
    };
    let org = null;
    if (legacy.organizacion || legacy.planta) {
      const codigo = legacy.codigo || codigoOrganizacion(uid);
      const marcado = await readPath(platformRef);
      if (!marcado) {
        identidad.rolPlataforma = "superusuario";
        await set(platformRef, uid);
      } else if (marcado === uid) {
        identidad.rolPlataforma = "superusuario";
      } else {
        identidad.tenantId = codigo;
        identidad.rolTenant = "owner";
      }
      org = orgDesdeLegacy(codigo, legacy);
      const ya = await readPath(orgRef(codigo));
      if (!ya) await set(orgRef(codigo), org);
      else org = { ...ya, codigo };
      if (esOwner(identidad.rolTenant)) {
        org = await asegurarOwnerEnOrg(codigo, uid, identidad, org);
      }
    }
    await set(userRef(uid), identidad);
    return { identidad, org };
  };

  useEffect(() => {
    return onAuthStateChanged(auth, async (current) => {
      if (!current && hasUser.current && !loggingOut.current) return;
      setUser(current);
      if (!current) {
        hasUser.current = false;
        loggingOut.current = false;
        orgState.current = null;
        remember(null, null);
        setLoading(false);
        return;
      }
      hasUser.current = true;
      if (settling.current) return;
      const local = readLocal(current.uid);
      if (local && !freshLogin.current && (local.rolPlataforma || local.rolTenant || local.tenantId)) {
        remember(local, local.codigo ? { codigo: local.codigo, nombre: local.organizacion, planta: local.planta, rubro: local.rubro, procesos: local.procesos, otrosRubro: local.otrosRubro, empleados: local.empleados, personasPlanta: local.personasPlanta, maquinas: local.maquinas, salasRango: local.salas, prueba: local.prueba } : null);
        setLoading(false);
      }
      freshLogin.current = false;
      try {
        let usuario = await readPath(userRef(current.uid));
        let org = null;
        const legacy = await readPath(legacyRef(current.uid));
        if (!usuario || (!usuario.rolPlataforma && !usuario.rolTenant && !usuario.tenantId && (legacy?.organizacion || legacy?.planta))) {
          if (legacy) {
            const migrado = await migrar(current.uid, { ...legacy, telefono: usuario?.telefono || legacy.telefono || "", photoURL: usuario?.photoURL || legacy.photoURL || "" });
            usuario = migrado.identidad;
            org = migrado.org;
          }
        } else if (usuario.rolPlataforma === "superusuario") {
          const codigo = codigoOrganizacion(current.uid);
          org = await readPath(orgRef(codigo));
          if (org) org = { ...org, codigo };
        }
        const identidad = { ...usuario, uid: current.uid, email: usuario?.email || current.email };
        const porMiembro = usuario?.rolPlataforma ? null : await buscarOrgDeMiembro(identidad);
        if (porMiembro) {
          org = porMiembro;
          usuario = await atarAOrganizacion(current.uid, identidad, porMiembro);
        } else if (usuario?.tenantId) {
          org = await readPath(orgRef(usuario.tenantId));
          if (org) org = { ...org, codigo: usuario.tenantId };
        }
        if (usuario?.rolTenant === "superusuario") {
          usuario = { ...usuario, rolTenant: "owner" };
          await update(userRef(current.uid), { rolTenant: "owner" }).catch(() => {});
        }
        if (org?.codigo && esOwner(usuario?.rolTenant)) {
          org = await asegurarOwnerEnOrg(org.codigo, current.uid, usuario, org);
        }
        if (org?.planta && (usuario.onboardingCompleto || legacy?.onboardingCompleto) && !org.planta.confirmada && (org.planta.salas || []).length) {
          org = { ...org, planta: { ...org.planta, confirmada: true, fase: org.planta.fase === "nombre" ? org.planta.fase : "sistema" } };
          if (org.planta.fase === "sistema") await update(orgRef(org.codigo), { planta: org.planta }).catch(() => {});
        }
        if (!settling.current && usuario) {
          const aplicado = aplicarRolDeMiembro({ ...usuario, uid: current.uid, email: usuario.email || current.email }, org);
          if (aplicado.rolTenant && aplicado.rolTenant !== usuario.rolTenant) {
            await update(userRef(current.uid), { rolTenant: aplicado.rolTenant, salasAsignadas: aplicado.salasAsignadas || [] }).catch(() => {});
          }
          const next = remember(aplicado, org);
          writeLocal(current.uid, next);
        } else if (!settling.current && local) {
          remember(local, orgState.current);
        }
      } catch {
        if (local) remember(local, orgState.current);
        else setDbError("No se pudo leer la cuenta.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!user?.uid) return undefined;
    const uid = user.uid;
    let offOrg = () => {};
    let orgCodigo = "";
    const escucharOrg = (codigo) => {
      if (!codigo || orgCodigo === codigo) return;
      offOrg();
      orgCodigo = codigo;
      offOrg = onValue(orgRef(codigo), (snap) => {
        if (!snap.exists() || settling.current || loggingOut.current) return;
        const org = { ...snap.val(), codigo };
        const base = { ...(profileRef.current || {}), uid, email: profileRef.current?.email || user.email };
        const aplicado = aplicarRolDeMiembro(base, org);
        const next = remember(aplicado, org);
        writeLocal(uid, next);
        if (aplicado.rolTenant && aplicado.rolTenant !== base.rolTenant) {
          update(userRef(uid), {
            nombre: aplicado.nombre,
            rolTenant: aplicado.rolTenant,
            salasAsignadas: aplicado.salasAsignadas || [],
          }).catch(() => {});
        }
      });
    };
    const offUser = onValue(userRef(uid), (snap) => {
      if (!snap.exists() || settling.current || loggingOut.current) return;
      const crudo = { ...snap.val(), uid };
      if (crudo.tenantId) escucharOrg(crudo.tenantId);
      const aplicado = aplicarRolDeMiembro(crudo, orgState.current);
      const next = remember(aplicado, orgState.current);
      writeLocal(uid, next);
    });
    if (profileRef.current?.tenantId || profileRef.current?.codigo) {
      escucharOrg(profileRef.current.tenantId || profileRef.current.codigo);
    }
    return () => {
      offUser();
      offOrg();
    };
  }, [user]);

  const login = async (email, password) => {
    freshLogin.current = true;
    setLoading(true);
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const register = async ({ nombre, telefono, email, password }) => {
    settling.current = true;
    setLoading(true);
    try {
      freshLogin.current = true;
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      hasUser.current = true;
      setUser(cred.user);
      await saveProfile(cred.user.uid, {
        nombre,
        telefono,
        email,
        proveedor: "password",
        paso: 0,
        pasos: { cuenta: true, telefono: true },
        onboardingCompleto: false,
      });
      return cred.user;
    } finally {
      settling.current = false;
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    settling.current = true;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      freshLogin.current = true;
      const result = await signInWithPopup(auth, provider);
      hasUser.current = true;
      setUser(result.user);
      const foto = result.user.photoURL || "";
      const existing = await readPath(userRef(result.user.uid)).catch(() => null);
      if (!existing) {
        const legacy = await readPath(legacyRef(result.user.uid)).catch(() => null);
        if (legacy?.organizacion || legacy?.planta) {
          const migrado = await migrar(result.user.uid, { ...legacy, photoURL: foto || legacy.photoURL || "" });
          remember(migrado.identidad, migrado.org);
          writeLocal(result.user.uid, vista(migrado.identidad, migrado.org));
          if (foto) await update(userRef(result.user.uid), { photoURL: foto });
        } else {
          const invitada = await buscarOrgDeMiembro({ uid: result.user.uid, email: result.user.email });
          if (invitada) {
            const atada = await atarAOrganizacion(result.user.uid, { nombre: result.user.displayName || "", email: result.user.email || "", photoURL: foto, proveedor: "google" }, invitada);
            const next = remember({ ...atada, photoURL: foto }, invitada);
            writeLocal(result.user.uid, next);
          } else {
            await saveProfile(result.user.uid, {
              nombre: result.user.displayName || "",
              email: result.user.email || "",
              telefono: "",
              photoURL: foto,
              proveedor: "google",
              paso: 0,
              pasos: { cuenta: true },
              onboardingCompleto: false,
            });
          }
        }
      } else if (!existing.rolPlataforma) {
        const invitada = await buscarOrgDeMiembro({ uid: result.user.uid, email: result.user.email || existing.email });
        if (invitada) {
          const atada = await atarAOrganizacion(result.user.uid, { ...existing, photoURL: foto || existing.photoURL || "" }, invitada);
          const next = remember(atada, invitada);
          writeLocal(result.user.uid, next);
        } else {
          const org = existing.tenantId ? await readPath(orgRef(existing.tenantId)) : null;
          const next = remember({ ...existing, photoURL: foto || existing.photoURL || "" }, org ? { ...org, codigo: existing.tenantId } : null);
          writeLocal(result.user.uid, next);
        }
      } else {
        const org = existing.tenantId ? await readPath(orgRef(existing.tenantId)) : null;
        const usuario = { ...existing, photoURL: foto || existing.photoURL || "" };
        if (foto) await update(userRef(result.user.uid), { photoURL: foto }).catch(() => {});
        const next = remember(usuario, org ? { ...org, codigo: existing.tenantId } : null);
        writeLocal(result.user.uid, next);
      }
      return result.user;
    } finally {
      settling.current = false;
      setLoading(false);
    }
  };

  const validarInvitacion = (invite) => {
    if (!invite) throw new Error("Esta invitación no existe.");
    if (invite.estado === "revocada") throw new Error("Esta invitación fue revocada.");
    if (invite.estado === "usada") throw new Error("Esta invitación ya se usó.");
    if (invite.expira < Date.now()) throw new Error("Esta invitación caducó.");
    return invite;
  };

  const activarMiembro = async (invite, token, uid, extra) => {
    if (invite.tipo === "plataforma" || !invite.orgCodigo) return;
    await update(orgRef(invite.orgCodigo), {
      [`miembros/${uid}`]: fichaMiembro({
        uid,
        nombre: extra.nombre || invite.nombre || "",
        email: extra.email || invite.email,
        rol: invite.rol,
        estado: "activo",
        salas: invite.salas || [],
        creadoEn: invite.creadoEn,
      }),
      [`miembros/${token}`]: null,
    });
  };

  const pintarMiembros = (codigo, miembros) => {
    orgState.current = { ...(orgState.current || {}), codigo, miembros };
    if (profileRef.current) remember(profileRef.current, orgState.current);
  };

  const parcheMiembro = async (codigo, clave, datos) => {
    const actual = orgState.current?.miembros || {};
    const siguiente = fichaMiembro({ ...actual[clave], ...datos });
    await update(orgRef(codigo), { [`miembros/${clave}`]: siguiente });
    pintarMiembros(codigo, { ...actual, [clave]: siguiente });
    return siguiente;
  };

  const crearInvitacion = async ({ email, nombre, rol, tipo, orgCodigo, salas, orgNombre, claveMiembro }) => {
    const token = crypto.randomUUID().replace(/-/g, "");
    const expira = Date.now() + DIAS_INVITACION * 24 * 60 * 60 * 1000;
    const data = {
      email: String(email || "").trim().toLowerCase(),
      nombre: String(nombre || "").trim(),
      rol,
      tipo,
      orgCodigo: orgCodigo || "",
      orgNombre: orgNombre || "",
      salas: salas || [],
      expira,
      estado: "pendiente",
      creadoEn: Date.now(),
      creadoPor: user?.uid || "",
    };
    await set(inviteRef(token), data);
    if (tipo !== "plataforma" && orgCodigo) {
      const actual = orgState.current?.miembros || {};
      const clave = claveMiembro || token;
      const previo = actual[clave] || {};
      const miembro = fichaMiembro({
        ...previo,
        nombre: data.nombre || previo.nombre,
        email: data.email || previo.email,
        rol: data.rol || previo.rol,
        estado: previo.estado && previo.estado !== "revocada" ? previo.estado : (claveMiembro ? previo.estado || "activo" : "espera"),
        salas: data.salas.length ? data.salas : (previo.salas || []),
        token,
        uid: previo.uid || "",
        creadoEn: previo.creadoEn || data.creadoEn,
      });
      await update(orgRef(orgCodigo), { [`miembros/${clave}`]: miembro });
      pintarMiembros(orgCodigo, { ...actual, [clave]: miembro });
    }
    return { token, ...data };
  };

  const editarMiembro = async ({ orgCodigo, clave, uid, nombre, telefono, rol, salas }) => {
    const actual = orgState.current?.miembros || {};
    const previo = actual[clave] || {};
    const destino = uidDeMiembro(clave, previo, uid);
    const siguiente = await parcheMiembro(orgCodigo, clave, {
      nombre,
      telefono,
      rol,
      salas,
      uid: destino || previo.uid || "",
    });
    if (destino) {
      await update(userRef(destino), {
        nombre,
        telefono: telefono || "",
        rolTenant: rol,
        salasAsignadas: salas || [],
      }).catch(() => {});
    }
    return siguiente;
  };

  const desactivarMiembro = async ({ orgCodigo, clave, uid }) => {
    const siguiente = await parcheMiembro(orgCodigo, clave, { estado: "inactivo" });
    if (uid) await update(userRef(uid), { activo: false }).catch(() => {});
    return siguiente;
  };

  const activarCuenta = async ({ orgCodigo, clave, uid }) => {
    const siguiente = await parcheMiembro(orgCodigo, clave, { estado: "activo" });
    if (uid) await update(userRef(uid), { activo: true }).catch(() => {});
    return siguiente;
  };

  const revocarClave = async ({ orgCodigo, clave, email, nombre, rol, salas, orgNombre }) => {
    const invite = await crearInvitacion({
      email,
      nombre,
      rol,
      tipo: "reingreso",
      orgCodigo,
      salas,
      orgNombre,
      claveMiembro: clave,
    });
    await parcheMiembro(orgCodigo, clave, { estado: "espera", token: invite.token });
    await sendPasswordResetEmail(auth, email).catch(() => {});
    return invite;
  };

  const revocarInvitacion = async (token) => {
    const invite = await readPath(inviteRef(token));
    await update(inviteRef(token), { estado: "revocada" });
    if (invite?.orgCodigo) {
      await update(orgRef(invite.orgCodigo), { [`miembros/${token}`]: null }).catch(() => {});
    }
  };

  const leerInvitacion = async (token) => {
    const invite = await readPath(inviteRef(token));
    return invite ? { token, ...invite } : null;
  };

  const aceptarInvitacion = async (token) => {
    const invite = validarInvitacion(await readPath(inviteRef(token)));
    const correo = String(user?.email || profileRef.current?.email || "").toLowerCase();
    if (invite.email && correo && invite.email !== correo) throw new Error("Entra con el correo de la invitación.");
    const actual = profileRef.current || {};
    if (invite.tipo === "plataforma") {
      if (actual.rolPlataforma) throw new Error("Esta cuenta ya es de plataforma.");
      await update(userRef(user.uid), { rolPlataforma: invite.rol, email: correo || invite.email });
      await update(inviteRef(token), { estado: "usada", usadaPor: user.uid });
      remember({ ...actual, rolPlataforma: invite.rol, email: correo || invite.email }, orgState.current);
      return invite;
    }
    if (actual.tenantId && actual.tenantId !== invite.orgCodigo && esOwner(actual.rolTenant) && !invite.email) {
      throw new Error("Esta cuenta ya pertenece a una organización.");
    }
    const nombre = invite.nombre || actual.nombre || "";
    await update(userRef(user.uid), {
      tenantId: invite.orgCodigo,
      rolTenant: invite.rol,
      salasAsignadas: invite.salas || [],
      onboardingCompleto: true,
      email: correo || invite.email,
      nombre,
    });
    await update(inviteRef(token), { estado: "usada", usadaPor: user.uid });
    await activarMiembro(invite, token, user.uid, { nombre, email: correo || invite.email });
    const org = await readPath(orgRef(invite.orgCodigo));
    remember({
      ...actual,
      nombre,
      tenantId: invite.orgCodigo,
      rolTenant: invite.rol,
      salasAsignadas: invite.salas || [],
      onboardingCompleto: true,
      email: correo || invite.email,
    }, org ? { ...org, codigo: invite.orgCodigo } : null);
    return invite;
  };

  const registrarInvitacion = async (token, { password, nombre }) => {
    const invite = validarInvitacion(await readPath(inviteRef(token)));
    if (invite.tipo === "plataforma") throw new Error("Esta invitación es de plataforma. Entra con tu cuenta.");
    settling.current = true;
    setLoading(true);
    try {
      freshLogin.current = true;
      const cred = await createUserWithEmailAndPassword(auth, invite.email, password);
      hasUser.current = true;
      setUser(cred.user);
      const nombreFinal = String(nombre || invite.nombre || "").trim();
      await set(userRef(cred.user.uid), {
        nombre: nombreFinal,
        email: invite.email,
        telefono: "",
        proveedor: "password",
        tenantId: invite.orgCodigo,
        rolTenant: invite.rol,
        salasAsignadas: invite.salas || [],
        onboardingCompleto: true,
      });
      await update(inviteRef(token), { estado: "usada", usadaPor: cred.user.uid });
      await activarMiembro(invite, token, cred.user.uid, { nombre: nombreFinal, email: invite.email });
      const org = await readPath(orgRef(invite.orgCodigo));
      remember({
        nombre: nombreFinal,
        email: invite.email,
        telefono: "",
        proveedor: "password",
        tenantId: invite.orgCodigo,
        rolTenant: invite.rol,
        salasAsignadas: invite.salas || [],
        onboardingCompleto: true,
      }, org ? { ...org, codigo: invite.orgCodigo } : null);
      return invite;
    } finally {
      settling.current = false;
      setLoading(false);
    }
  };

  const guardarAvisoAvance = async (codigo, datos) => {
    if (!codigo) return null;
    const actual = orgState.current?.avisosAvance || {};
    const next = { ...avisoAvancePorDefecto(), ...actual, ...datos, ultimo: actual.ultimo || 0 };
    await update(orgRef(codigo), { avisosAvance: next });
    orgState.current = { ...(orgState.current || {}), codigo, avisosAvance: next };
    if (profileRef.current) remember(profileRef.current, orgState.current);
    return next;
  };

  const guardarMisDatos = async ({ nombre, telefono }) => {
    const uid = user?.uid;
    if (!uid) return null;
    const limpio = {
      nombre: String(nombre || "").trim(),
      telefono: String(telefono || "").trim(),
    };
    await update(userRef(uid), limpio);
    const org = orgState.current;
    const miembro = encontrarMiembro(org, { uid, email: profileRef.current?.email });
    if (org?.codigo && miembro?.clave) {
      await parcheMiembro(org.codigo, miembro.clave, limpio);
    }
    const next = remember({ ...(profileRef.current || {}), ...limpio }, org);
    writeLocal(uid, next);
    return limpio;
  };

  const logout = () => {
    loggingOut.current = true;
    if (user?.uid) clearLocal(user.uid);
    orgState.current = null;
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, dbError, login, register, loginWithGoogle, logout, saveProfile, cargarOrganizacion, crearInvitacion, revocarInvitacion, leerInvitacion, aceptarInvitacion, registrarInvitacion, editarMiembro, desactivarMiembro, activarCuenta, revocarClave, guardarAvisoAvance, guardarMisDatos }}>
      {children}
    </AuthContext.Provider>
  );
}
