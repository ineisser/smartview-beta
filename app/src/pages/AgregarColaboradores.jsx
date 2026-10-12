import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { permisos } from '../access';
import InvitationForm from '../components/InvitationForm';

export default function AgregarColaboradores() {
  const { profile } = useAuth();
  if (!permisos(profile).invitar) return <p role="alert">No tienes permisos para invitar colaboradores a esta planta.</p>;
  return <section className="agregar-colaboradores"><div className="colaboradores-intro"><h2>Haz crecer tu equipo en {profile.organizacion}</h2><p>Empieza con sus datos personales, elige su perfil y las salas a las que tendrá acceso.</p><p>Elige enviar un correo personalizado o generar un código para compartir. Si ya usa SmartView, conservará sus credenciales; si es nuevo, creará su contraseña.</p><p>Para usar el código, el colaborador debe abrir <Link to="/aceptar-invitacion">Aceptar invitación</Link>.</p></div><InvitationForm orgCodigo={profile.codigo} orgNombre={profile.organizacion} salas={profile.planta?.salas || []} enviarCorreo /><Link className="colaboradores-volver" to={`/${profile.codigo}/mensajes`}>Volver a Mensajes</Link></section>;
}
