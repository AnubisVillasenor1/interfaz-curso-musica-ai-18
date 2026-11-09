import Link from 'next/link'

const chapters = [
  ['01', 'Core // Atom Inspector Active', 'Play & Go by TAMV Online Network', 'Una bienvenida a una plataforma creada desde Realmontes para convertir la música y el conocimiento técnico en una experiencia viva.'],
  ['02', 'Critique // Deviation Point', 'El giro erróneo de la industria', 'Durante años, la industria tecnológica prometió facilitar la vida humana. En algún punto crítico, esa misión se desvió hacia la dependencia y la aceleración permanente.'],
  ['03', 'Analysis // Cognitive Overload', 'Desorientación y dependencia', 'Las herramientas cambian antes de que podamos dominarlas. Play & Go responde con rutas guiadas, práctica real y un lenguaje que devuelve control al creador.'],
  ['04', 'Solution // Master-level sovereignty', 'Más que una aplicación', 'Integramos un curso de nivel máster para pasar de consumidores de tecnología a personas capaces de comprender, crear y decidir con herramientas propias.'],
  ['05', 'Declaration of existence', 'TAMV Online Network & Play and Go', 'Esto es tecnología latinoamericana: sofisticada, accesible, creativa y orgullosamente Realmontense.'],
]

export default function VisionPage() {
  return (
    <main className="pg-shell min-h-screen" style={{ background: 'var(--pg-bg)' }}>
      <header className="pg-container flex items-center justify-between py-6">
        <Link href="/" className="pg-navlink">Play & Go <span className="pg-accent-cyan">by TAMV</span></Link>
        <Link href="/auth" className="pg-btn pg-btn-secondary">Entrar al estudio</Link>
      </header>
      <section className="pg-section pt-12">
        <div className="pg-container">
          <p className="pg-eyebrow">Manifiesto abierto · acceso público</p>
          <h1 className="pg-title max-w-4xl">El sistema nervioso tecnológico de una nueva generación creadora.</h1>
          <p className="pg-lede mt-5 max-w-2xl">La visión de Play & Go nace para reducir la dependencia, elevar el aprendizaje y convertir la música en una puerta de entrada al dominio técnico real.</p>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {chapters.map(([number, code, title, copy]) => (
              <article key={number} className="pg-card pg-card-hover p-6">
                <div className="flex items-start justify-between gap-4"><span className="pg-label" data-tone="muted">{number} / 05</span><span className="pg-chip" data-tone={number === '04' ? 'amber' : 'cyan'}>{code}</span></div>
                <h2 className="mt-8 text-2xl font-semibold text-white">{title}</h2>
                <p className="mt-3 text-lg text-white/75">{copy}</p>
              </article>
            ))}
          </div>
          <div className="pg-card mt-5 border border-[var(--pg-amber)]/40 p-7 text-center"><p className="pg-eyebrow">Declaración</p><p className="mt-3 text-2xl font-semibold text-white">Orgullosamente Realmontenses. Esto es tecnología latinoamericana.</p></div>
        </div>
      </section>
    </main>
  )
}
