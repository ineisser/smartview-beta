import TabSwitch from './TabSwitch';
import { crearGrupos, gruposConfigurados, errorDisposicion } from '../data/disposicion-maquinas';

export default function DisposicionSala({ sala, value, onChange }) {
  const total=(sala.maquinas||[]).length, grupos=gruposConfigurados(value,total);
  const modo=value?.modo||'auto', error=errorDisposicion(value,total);
  const cambiarGrupos = nuevos => onChange({modo:'grupos',grupos:nuevos});
  const editar=(index,key,valor)=>cambiarGrupos(grupos.map((g,i)=>i===index?{...g,[key]:valor}:g));
  return <section className="disposicion-config" aria-labelledby="disposicion-titulo">
    <hr className="config-rule" />
    <h2 id="disposicion-titulo" className="setup-general-title">Configuración de mapa</h2>
    <div className="config-row"><span className="config-copy"><strong>Distribución</strong><small>Configura los bloques de máquinas que se mostrarán en el mapa de esta sala.</small></span><TabSwitch value={modo} onChange={modo=>onChange(modo==='grupos'?{modo,grupos:grupos.length?grupos:crearGrupos(Math.max(1,Math.ceil(total/50)),total)}:{modo})} items={[{id:'auto',label:'Automática'},{id:'grupos',label:'Por grupos'}]} /></div>
    {modo==='grupos'&&<>
      <label className="config-row"><span className="config-copy"><strong>Cantidad de grupos</strong><small>Al cambiar esta cantidad se reparten las máquinas. Después puedes ajustar cada grupo.</small></span><input className="umbral-oee" aria-label="Cantidad de grupos" type="number" min="1" max={Math.max(1,total)} step="1" inputMode="numeric" value={grupos.length} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=Math.max(1,total))cambiarGrupos(crearGrupos(n,total));}} /></label>
      <div className="disposicion-grupos">
        {grupos.map((g,i)=><fieldset key={i} className="disposicion-grupo"><legend>Grupo {i+1}</legend><div className="disposicion-campos">
          {[['cantidad','Máquinas',Math.max(1,total)],['columnas','Columnas',50],['filas','Filas',50]].map(([key,label,max])=><label key={key}><span>{label}</span><input aria-label={`${label} del grupo ${i+1}`} type="number" min="1" max={max} step="1" required inputMode="numeric" value={g[key]} onChange={e=>editar(i,key,e.target.value)} /></label>)}
          <button className="btn btn-ghost btn-compact" type="button" aria-label={`Quitar grupo ${i+1}`} onClick={()=>cambiarGrupos(grupos.filter((_,index)=>index!==i))}>Quitar</button>
        </div></fieldset>)}
      </div>
      <div className="disposicion-acciones"><button className="btn btn-ghost btn-compact" type="button" disabled={grupos.length>=total} onClick={()=>cambiarGrupos([...grupos,{cantidad:Math.max(1,total-grupos.reduce((n,g)=>n+Number(g.cantidad||0),0)),filas:10,columnas:5}])}>Agregar grupo</button><span>{grupos.reduce((n,g)=>n+Number(g.cantidad||0),0)} de {total} máquinas asignadas</span></div>
      {error&&<p className="disposicion-error" role="alert">{error}</p>}
    </>}
  </section>;
}
