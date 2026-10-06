import { useRef, useState } from 'react';
import { EllipsisVertical } from 'lucide-react';
import FloatingSelect from './FloatingSelect';
import Toast from './Toast';
import { catalogoParaSala, combinarMotivos, leerPlantillaMotivos } from '../data/plantilla-motivos';
import '../styles/components/analisis.css';

export default function MotivosMenu({ sala, procesos, onGuardar, disabled = false }) {
  const archivo = useRef(null);
  const [ocupado, setOcupado] = useState(false), [mensaje, setMensaje] = useState('');
  const catalogo = catalogoParaSala(sala, procesos);
  const vacia = !(sala?.motivos || []).length;
  const guardar = async (motivos, origen) => {
    setOcupado(true);
    try {
      await onGuardar(combinarMotivos(sala?.motivos || [], motivos), origen);
      setMensaje(`${motivos.length} motivos ${origen === 'estandar' ? 'predeterminados asignados' : 'importados'}. Puedes editarlos cuando quieras.`);
    } catch (error) { setMensaje(error.message || 'No se pudieron guardar los motivos. Inténtalo de nuevo.'); }
    finally { setOcupado(false); }
  };
  return <>
    <FloatingSelect label="Opciones de motivos" icon={EllipsisVertical} iconOnly acciones width={360} disabled={disabled || ocupado} opciones={[
      ...(vacia && catalogo ? [{ value: 'estandar', label: `Asignar motivos predeterminados de ${catalogo.industria.toLocaleLowerCase('es')}` }] : []),
      { value: 'importar', label: 'Importar motivos desde plantilla' },
    ]} onChange={accion => accion === 'estandar' ? guardar(catalogo.motivos, 'estandar') : archivo.current?.click()} />
    <input ref={archivo} hidden type="file" accept=".csv,.xls,.xlsx" aria-label="Plantilla de motivos" onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      setOcupado(true);
      try { await guardar(await leerPlantillaMotivos(file), 'plantilla'); }
      catch (error) { setMensaje(error.message || 'No se pudo leer la plantilla.'); }
      finally { setOcupado(false); }
    }} />
    {mensaje && <Toast message={mensaje} onClose={() => setMensaje('')} />}
  </>;
}
