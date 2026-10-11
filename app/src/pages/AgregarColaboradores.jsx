import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { permisos } from '../access';
import InvitationForm from '../components/InvitationForm';

export default function AgregarColaboradores() {
  const { profile } = useAuth();
  if (!permisos(profile).invitar) return <p role="alert">No tienes permisos para invitar colaboradores a esta planta.</p>;
  return <section className="agregar-colaboradores"><div className="colaboradores-intro"><h2>Haz crecer tu equipo en {profile.organizacion}</h2><p>Aquí puedes agregar a tus colaboradores. Empieza con sus datos personales, elige su perfil y sus salas, y presiona Agregar colaborador.</p><p>Recibirá un enlace por correo para confirmar su identidad y entrar a esta planta. Sus accesos a otras plantas se conservarán.</p></div><InvitationForm orgCodigo={profile.codigo} orgNombre={profile.organizacion} salas={profile.planta?.salas || []} enviarCorreo /><Link className="colaboradores-volver" to={`/${profile.codigo}/mensajes`}>Volver a Mensajes</Link></section>;
}
