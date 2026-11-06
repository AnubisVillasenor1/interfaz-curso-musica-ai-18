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
 */
export default function StudioPage() {
  return <main className="min-h-screen bg-[#07121f] text-[#edfaff]">
    <div className="mx-auto max-w-5xl px-5 pt-10 sm:px-8">
      <a href="/" className="text-sm text-[#8cecf3] hover:underline">← Volver a Play and Go</a>
      <header className="mb-8 mt-6">
        <p className="text-[10px] uppercase tracking-[.24em] text-[#75e9f2]">Estudio Play and Go</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Crea, escucha y guarda</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#9fb8c7]">
          El motor local compone y renderiza en tu navegador sin costo. Cuando tengas una inscripción activa, el
          estudio con voces añade voz cantada y mezcla completa.
        </p>
      </header>
      <LocalComposer />
    </div>
    <MusicStudio />
    <div className="mx-auto max-w-5xl px-5 pb-12 sm:px-8"><RealAudioStudio /></div>
  </main>
}
