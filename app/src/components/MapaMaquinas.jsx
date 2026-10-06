import { agruparMaquinas, disposicionValida, numeroMaquina } from '../data/disposicion-maquinas';

export default function MapaMaquinas({ maquinas, disposicion, renderMaquina, mapaRef }) {
  const rendimiento = maquinas.length >= 250 ? " is-large-map" : "";
  if (!disposicionValida(disposicion, maquinas.length)) return <div className={`maquinas-grid${rendimiento}`} ref={mapaRef}>{maquinas.map(renderMaquina)}</div>;
  const grupos = agruparMaquinas(maquinas, disposicion);
  return <div className={`mapa-grupos${rendimiento}`} ref={mapaRef}>
    {grupos.map((grupo, index) => <section key={grupo.inicio} className="mapa-grupo" style={{'--grupo-columnas':Number(grupo.columnas),'--grupo-filas':Number(grupo.filas),'--grupo-ancho':`${Number(grupo.columnas)*32+24}px`}} aria-label={`Grupo ${index + 1}`}>
      <header><strong>Grupo {index + 1}</strong><span>{numeroMaquina(grupo.maquinas[0], grupo.inicio)}–{numeroMaquina(grupo.maquinas.at(-1), grupo.inicio + grupo.maquinas.length - 1)}</span></header>
      <div className="mapa-grupo-grid">{grupo.maquinas.map((maquina, offset) => renderMaquina(maquina, grupo.inicio + offset))}</div>
    </section>)}
  </div>;
}
