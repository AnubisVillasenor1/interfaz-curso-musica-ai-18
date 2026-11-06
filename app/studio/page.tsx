import { LocalComposer } from '@/components/local-composer'
import { MusicStudio } from '@/components/music-studio'
import { RealAudioStudio } from '@/components/real-audio-studio'

/**
 * Estudio.
 *
 * El orden importa: arriba está lo que produce una canción guardable sin
 * pagar (motor local), y debajo queda el taller experimental —bocetos MIDI y
 * analizador FFT— que sirve para las sesiones de escucha del curso. Antes lo
 * primero que veía quien entraba era un exportador de MIDI, cuando lo que la
 * plataforma promete es audio.
 *
 * `?prompt=` existe porque la landing tiene plantillas que prometían llevar al
 * estudio y no llevaban a ninguna parte: el visitante copiaba el texto, abría
 * otra pestaña y lo pegaba a mano. Aquí se recibe en el servidor y se entrega
 * ya escrito al compositor. Se limita a los 2.000 caracteres que admite el
 * propio campo, para que un enlace manipulable no inyecte un texto infinito.
 */
export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const raw = Array.isArray(params.prompt) ? params.prompt[0] : params.prompt
  const initialPrompt = typeof raw === 'string' ? raw.slice(0, 2000) : ''

  return <main className="pg-shell min-h-screen" style={{ background: 'var(--pg-bg)', color: 'var(--pg-ink)' }}>
    <div className="pg-container" style={{ maxWidth: '68rem', paddingTop: '2.5rem' }}>
      <a href="/" className="pg-navlink">← Volver a Play and Go</a>
      <header className="mb-8 mt-6">
        <p className="pg-eyebrow">Estudio Play and Go</p>
        <h1 className="pg-title">Crea, escucha y guarda</h1>
        <p className="pg-lede">
          El motor local compone y renderiza en tu navegador sin costo. Cuando tengas una inscripción activa, el
          estudio con voces añade voz cantada y mezcla completa.
        </p>
      </header>
      {initialPrompt && (
        <p
          className="pg-chip mb-5"
          data-tone="mint"
          style={{ letterSpacing: '.14em' }}
        >
          Plantilla cargada desde la biblioteca
        </p>
      )}
      <LocalComposer initialPrompt={initialPrompt} />
    </div>
    <MusicStudio />
    <div className="pg-container" style={{ maxWidth: '68rem', paddingBottom: '3rem' }}><RealAudioStudio /></div>
  </main>
}
