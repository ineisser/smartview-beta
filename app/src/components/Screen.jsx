export default function Screen({ title, lede, step, children }) {
  return (
    <main className="screen">
      <section className="panel">
        <p className="brand">Smart View</p>
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
        {step ? <p className="caption" style={{ marginTop: 14 }}>Paso {step} de 5</p> : null}
        {children}
      </section>
    </main>
  );
}
