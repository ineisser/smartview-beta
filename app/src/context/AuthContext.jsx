import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailLink,
} from "firebase/auth";
import { get, onValue, ref, set, update } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, rtdb } from "../firebase";
import { avisoAvancePorDefecto } from "../robotAvance";

import { cerrarPresencia } from "../hooks/useDispositivosOrg";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const userRef = (uid) => ref(rtdb, `usuarios/${uid}`);
const orgRef = (codigo) => ref(rtdb, `organizaciones/${codigo}`);
const inviteRef = (token) => ref(rtdb, `invitaciones/${token}`);
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

// La cuenta escucha solo configuración; paros y presencia tienen sus propios lectores.
const ORG_METADATA = ['codigo','nombre','rubro','procesos','otrosRubro','empleados','personasPlanta','maquinas','salasRango','planta','prueba','miembros','avisosAvance','invitaciones'];
const readOrgMeta = async codigo => {
  const values = await Promise.all(ORG_METADATA.map(field=>readPath(ref(rtdb,`organizaciones/${codigo}/${field}`))));
  return values.some(value=>value!=null) ? {...Object.fromEntries(ORG_METADATA.map((field,i)=>[field,values[i]])),codigo} : null;
};
const watchOrgMeta = (codigo,onData) => {
  const meta={codigo}, loaded=new Set();
  const stops=ORG_METADATA.map(field=>onValue(ref(rtdb,`organizaciones/${codigo}/${field}`),snap=>{
    meta[field]=snap.val(); loaded.add(field);
    if(loaded.size===ORG_METADATA.length)onData({...meta,codigo});
  }));
  return ()=>stops.forEach(stop=>stop());
};

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
    codigo: org?.codigo || "",
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
    invitaciones: org?.invitaciones ?? {},
    avisosAvance: org?.avisosAvance ?? null,
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null), [profile, setProfile] = useState(null), [loading, setLoading] = useState(true), [dbError, setDbError] = useState('');
  const [plantas, setPlantas] = useState([]), [selected, setSelected] = useState('');
  const profileRef = useRef(null), identityRef = useRef(null), orgState = useRef(null), loadSequence = useRef(0);
  const settling = useRef(false), hasUser = useRef(false), loggingOut = useRef(false), freshLogin = useRef(false);
  const operation = async data => (await httpsCallable(getFunctions(auth.app, 'us-central1'), 'gestionarAcceso')(data)).data;
  const remember = (identity, org = orgState.current) => {
    orgState.current = org;
    const member = org?.miembros?.[identity?.uid];
    const privileged = ['superusuario', 'soporte'].includes(identity?.rolPlataforma);
    const permitted = Boolean(org) && (privileged || member?.estado === 'activo');
    const next = vista(identity ? { ...identity, rolTenant: org ? (permitted ? member?.rol || (privileged ? 'admin' : '') : '') : '', salasAsignadas: member?.salas || [], activo: permitted } : null, permitted ? org : null);
    profileRef.current = next; setProfile(next); return next;
  };
  const cargarOrganizacion = async codigo => {
    if (!codigo || !auth.currentUser) return null;
    const sequence = ++loadSequence.current;
    const uid = auth.currentUser.uid, org = await readOrgMeta(codigo);
    if (!org || (!['superusuario', 'soporte'].includes(identityRef.current?.rolPlataforma) && org.miembros?.[uid]?.estado !== 'activo')) throw new Error('No tienes acceso a esta planta.');
    if (auth.currentUser?.uid !== uid || sequence !== loadSequence.current) return null;
    remember(identityRef.current, org); localStorage.setItem(`smartview-planta:${uid}`, codigo); setSelected(codigo); return org;
  };

  const guardarOrg = async (codigo, patch, previa) => {
    const changes = {};
    if ('organizacion' in patch) changes.nombre = patch.organizacion;
    if ('salas' in patch && typeof patch.salas === 'string') changes.salasRango = patch.salas;
    for (const key of ['rubro', 'procesos', 'otrosRubro', 'empleados', 'personasPlanta', 'maquinas', 'planta']) if (key in patch) changes[key] = patch[key];
    await update(orgRef(codigo), changes); return { ...(previa || orgState.current || {}), codigo, ...changes };
  };
  const saveProfile = async (uid, data) => {
    if (uid !== auth.currentUser?.uid) throw new Error('Cuenta inválida.');
    const { org, usuario } = split(data);
    for (const key of ['tenantId', 'rolTenant', 'rolPlataforma', 'salasAsignadas', 'activo', 'miembros']) delete usuario[key];
    if (Object.keys(usuario).length) await update(userRef(uid), usuario);
    identityRef.current = { ...(identityRef.current || {}), ...usuario, uid };
    let plant = orgState.current;
    if (Object.keys(org).length) {
      if (!plant?.codigo) {
        const created = (await httpsCallable(getFunctions(auth.app, 'us-central1'), 'crearPlanta')({ nombre: org.organizacion || '', usuarioNombre: identityRef.current.nombre || '' })).data;
        plant = await readOrgMeta(created.codigo); setSelected(created.codigo);
      }
      plant = await guardarOrg(plant.codigo, org, plant);
    }
    return remember(identityRef.current, plant);
  };

  useEffect(() => onAuthStateChanged(auth, current => {
    identityRef.current = null; orgState.current = null; profileRef.current = null;
    setProfile(null); setPlantas([]); setSelected(''); setUser(current); setLoading(Boolean(current));
  }), []);
  useEffect(() => {
    if (!user?.uid) return undefined;
    const uid = user.uid;
    let identityReady = false, accessReady = false;
    const finish = () => { if (identityReady && accessReady) setLoading(false); };
    const stopUser = onValue(userRef(uid), snap => {
      identityRef.current = { ...(snap.val() || {}), uid, email: user.email || snap.val()?.email || '' };
      identityReady = true; remember(identityRef.current); finish();
    }, error => { setDbError(error.message); setLoading(false); });
    const stopAccess = onValue(ref(rtdb, `accesos/${uid}`), snap => {
      const list = Object.entries(snap.val() || {}).filter(([, m]) => m.estado === 'activo').map(([codigo, m]) => ({ ...m, codigo }));
      setPlantas(list); setSelected(previous => list.some(m => m.codigo === previous) ? previous : list.find(m => m.codigo === localStorage.getItem(`smartview-planta:${uid}`))?.codigo || list[0]?.codigo || '');
      accessReady = true; finish();
    }, error => { setDbError(error.message); accessReady = true; finish(); });
    return () => { stopUser(); stopAccess(); };
  }, [user?.uid]);
  useEffect(() => {
    if (!user?.uid || !selected) { if (identityRef.current) remember(identityRef.current, null); return undefined; }
    const uid = user.uid; remember(identityRef.current, null);
    return watchOrgMeta(selected, org => {
      if (auth.currentUser?.uid !== uid) return;
      remember(identityRef.current, org); localStorage.setItem(`smartview-planta:${uid}`, selected);
    });
  }, [user?.uid, selected]);

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
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    if (!await readPath(userRef(result.user.uid))) await set(userRef(result.user.uid), { nombre: result.user.displayName || '', email: result.user.email || '', photoURL: result.user.photoURL || '', proveedor: 'google', onboardingCompleto: false });
    return result.user;
  };

  const validarInvitacion = (invite) => {
    if (!invite) throw new Error("Esta invitación no existe.");
    if (invite.estado === "revocada") throw new Error("Esta invitación fue revocada.");
    if (invite.estado === "usada") throw new Error("Esta invitación ya se usó.");
    if (invite.expira < Date.now()) throw new Error("Esta invitación caducó.");
    return invite;
  };

  const crearInvitacion = data => operation({ ...data, action: 'crear' });
  const editarMiembro = data => operation({ ...data, action: 'editar' });
  const desactivarMiembro = data => operation({ ...data, action: 'editar', estado: 'inactivo' });
  const activarCuenta = data => operation({ ...data, action: 'editar', estado: 'activo' });
  const revocarClave = desactivarMiembro;
  const revocarInvitacion = token => operation({ action: 'revocar', token });

  const leerInvitacion = async (token) => {
    return (await httpsCallable(getFunctions(auth.app,'us-central1'),'consultarInvitacion')({token})).data;
  };

  const aceptarInvitacion = async token => {
    const invitation = await operation({ action: 'aceptar', token });
    identityRef.current = { ...(await readPath(userRef(auth.currentUser.uid))), uid: auth.currentUser.uid };
    if (invitation.tipo !== 'plataforma') await cargarOrganizacion(invitation.orgCodigo);
    return invitation;
  };
  const registrarInvitacion = async (token, { password, nombre }) => {
    const invitation = validarInvitacion(await readPath(inviteRef(token)));
    const credential = await createUserWithEmailAndPassword(auth, invitation.email, password);
    await set(userRef(credential.user.uid), { nombre: nombre || invitation.nombre || '', email: invitation.email, proveedor: 'password', onboardingCompleto: false });
    return aceptarInvitacion(token);
  };
  const entrarConEnlaceInvitacion = async (token, email, link) => {
    const invitation = validarInvitacion(await readPath(inviteRef(token)));
    if (email.trim().toLowerCase() !== invitation.email) throw new Error('Escribe el correo al que llegó la invitación.');
    const credential = await signInWithEmailLink(auth, email.trim().toLowerCase(), link);
    const existing = await readPath(userRef(credential.user.uid));
    if (!existing) await set(userRef(credential.user.uid), { nombre: invitation.nombre || '', email: invitation.email, proveedor: 'emailLink', onboardingCompleto: false });
    return aceptarInvitacion(token);
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
    const miembro = org?.miembros?.[uid];
    if (org?.codigo && miembro) {
      await update(ref(rtdb, `organizaciones/${org.codigo}/miembros/${uid}`), limpio);
    }
    const next = remember({ ...(profileRef.current || {}), ...limpio }, org);
    writeLocal(uid, next);
    return limpio;
  };

  const logout = async () => {
    await Promise.race([cerrarPresencia(), new Promise(resolve => setTimeout(resolve, 2000))]);
    loggingOut.current = true;
    if (user?.uid) clearLocal(user.uid);
    orgState.current = null;
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, plantas, loading, dbError, login, register, loginWithGoogle, logout, saveProfile, cargarOrganizacion, crearInvitacion, revocarInvitacion, leerInvitacion, aceptarInvitacion, registrarInvitacion, entrarConEnlaceInvitacion, editarMiembro, desactivarMiembro, activarCuenta, revocarClave, guardarAvisoAvance, guardarMisDatos }}>
      {children}
    </AuthContext.Provider>
  );
}
