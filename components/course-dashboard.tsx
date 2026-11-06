'use client'

import { useRef, useState } from 'react'
import { ArrowRight, Award, BadgeCheck, BookOpen, Check, ChevronRight, Clock3, Headphones, LockKeyhole, Menu, MessageCircle, Music2, Play, Send, Sparkles, Star, Trophy, Video, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { COURSE_PRODUCT } from '@/lib/products'
import { createClient } from '@/lib/supabase/client'

/**
 * Ambos recursos eran enlaces a `*.public.blob.vercel-storage.com`, un bucket
 * ajeno al proyecto: si se limpia o caduca, la portada se queda en blanco y el
 * logotipo desaparece. Ahora son archivos locales versionados con el código,
 * y la muestra de audio es la pista real del intro cinemático.
 */
const heroImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Gemini_Generated_Image_hi55a9hi55a9hi55-OPBoBGaw8KYoHSuXcugNi9LtKJeZlm.jpg'
const logoImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logoplayandgo-8ZZZTdsW2ueYIcVxJscglJWiPeHgov.jpg'
const tamvLogoImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/tamvlogo1-i0HazgHWGLPPtgpiy0SnmCir2lextV.jpg'
const sampleAudio = '/audio/pista2.mp3'

/**
 * Precio único de verdad: se lee de `lib/products.ts`, que es lo que cobra el
 * checkout. Estaba escrito a mano como "$490 MXN" mientras la pasarela pedía
 * $500, así que la landing anunciaba un precio que ningún pago podía cumplir.
 */
const coursePrice = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(COURSE_PRODUCT.priceInCents / 100)

const modules = [
  ['01', 'Fundamentos de música con IA', '3 lecciones · 42 min', 'done'],
  ['02', 'Tu primer prompt musical', '4 lecciones · 1 h 15 min', 'current'],
  ['03', 'Voces, letras y emoción', '3 lecciones · 58 min', 'locked'],
  ['04', 'Géneros, instrumentación y tempo', '3 lecciones · 1 h 08 min', 'locked'],
  ['05', 'Producción: de idea a canción', '3 lecciones · 1 h 20 min', 'locked'],
]

const prompts = [
  ['Pop cinematográfico', '96 BPM · voz femenina íntima · piano felt · cuerdas amplias', 'Pop alternativo cinematográfico, 96 BPM, voz femenina íntima y aireada, versos minimalistas con piano felt, pre-coro ascendente, coro amplio con cuerdas y batería orgánica, mezcla cálida y dinámica.'],
  ['Reggaetón nocturno', '92 BPM · voz masculina suave · dembow profundo', 'Reggaetón oscuro y elegante, 92 BPM, voz masculina suave con flow conversado, dembow profundo, synth bass cálido, percusión seca, atmósfera nocturna y hook memorable.'],
  ['Lo-fi para estudiar', '78 BPM · instrumental · Rhodes · swing humano', 'Lo-fi hip hop instrumental, 78 BPM, acordes de jazz en Rhodes, batería con swing humano, textura de vinilo, bajo redondo, ambiente de cafetería y dinámica relajada.'],
]

const curriculum = [
  { module: 'Módulo 01', title: 'El mapa sonoro', duration: '42 min', objective: 'Entender el lenguaje mínimo para dirigir una generación musical con intención.', lessons: ['Sesión 01 · Qué es la música generativa y cómo pensar como director', 'Sesión 02 · BPM, tonalidad, energía y estructura sin tecnicismos', 'Sesión 03 · Ejercicio: describe una escena en cinco decisiones musicales'], deliverable: 'Brief de una canción con emoción, referencia, energía y estructura.' },
  { module: 'Módulo 02', title: 'Prompting musical', duration: '1 h 15 min', objective: 'Construir instrucciones reproducibles que puedas comparar, iterar y mejorar.', lessons: ['Sesión 04 · La anatomía de un prompt reproducible', 'Sesión 05 · Voz, género, instrumentación, tempo y mezcla en una sola dirección', 'Sesión 06 · Cómo iterar: una variable a la vez y escucha crítica', 'Sesión 07 · Ejercicio: tres versiones del mismo hook y checklist de calidad'], deliverable: 'Tres generaciones documentadas y una versión seleccionada con justificación.' },
  { module: 'Módulo 03', title: 'Voz, letra y emoción', duration: '58 min', objective: 'Dirigir una interpretación vocal coherente con el mensaje y la audiencia.', lessons: ['Sesión 08 · Registro, textura, articulación y acento de voz', 'Sesión 09 · Escribir versos, pre-coro, coro y puente con métrica funcional', 'Sesión 10 · Ejercicio: dirección vocal para una interpretación real'], deliverable: 'Letra completa con anotaciones de interpretación y dinámica.' },
  { module: 'Módulo 04', title: 'Género y producción', duration: '1 h 08 min', objective: 'Elegir capas sonoras que sostengan el groove sin saturar la producción.', lessons: ['Sesión 11 · Instrumentación por género y función de cada capa', 'Sesión 12 · Tempo, groove, dinámica, tonalidad y referencias', 'Sesión 13 · Ejercicio: transformar una idea pop en tres géneros'], deliverable: 'Matriz comparativa con tres arreglos y el prompt final de producción.' },
  { module: 'Módulo 05', title: 'De idea a release', duration: '1 h 20 min', objective: 'Pasar de una generación prometedora a una entrega presentable y trazable.', lessons: ['Sesión 14 · Selección, edición y control de versiones', 'Sesión 15 · Brief profesional para colaborar y publicar', 'Sesión 16 · Proyecto final: produce dos canciones y presenta tu portafolio'], deliverable: 'Portafolio final con dos canciones, prompts, decisiones y reflexión de aprendizaje.' },
]

export function CourseDashboard() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [prompt, setPrompt] = useState<string | null>(null)
  const [showRegister, setShowRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [studioOpen, setStudioOpen] = useState(false)
  const [songTitle, setSongTitle] = useState('')
  const [songPrompt, setSongPrompt] = useState('')
  const [songStatus, setSongStatus] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [chatMessages, setChatMessages] = useState([{ from: 'bot', text: 'Hola, soy el guía de Play and Go. Pregúntame por el curso, el precio, los pagos, tu idea musical o tus letras.', source: 'guide' }])

  /**
   * Pregunta al guía del curso.
   *
   * `askCourseBot` era una cadena de `if` con palabras clave que se llamaba a
   * sí misma "asistente de IA" y nunca llamaba a un modelo. Ahora la respuesta
   * viene de `/api/agent`, que usa el proveedor configurado y, si falta o
   * falla, contesta con el contenido real del curso. La procedencia viaja en
   * `source` para que la burbuja lo diga, en lugar de fingir IA.
   */
  async function sendChat(event: React.FormEvent) {
    event.preventDefault()
    const text = chatInput.trim()
    if (!text || chatBusy) return

    setChatBusy(true)
    setChatMessages((messages) => [...messages, { from: 'user', text, source: 'user' }])
    setChatInput('')

    const history = chatMessages.slice(-6).map((message) => ({
      role: message.from === 'user' ? 'user' : 'assistant',
      content: message.text,
    }))

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })
      const data = await response.json().catch(() => null)
      const answer = data?.answer ?? 'No pude responder ahora. Prueba otra vez en un minuto.'
      setChatMessages((messages) => [...messages, { from: 'bot', text: answer, source: data?.source === 'llm' ? 'model' : 'guide' }])
    } catch {
      setChatMessages((messages) => [...messages, { from: 'bot', text: 'Se cortó la conexión con el guía. Vuelve a preguntar.', source: 'guide' }])
    } finally {
      setChatBusy(false)
    }
  }

  /**
   * La muestra del hero antes solo movía una animación: el botón prometía audio
   * y no sonaba nada. Ahora reproduce la pista real del intro cinemático y el
   * ecualizador se aparta de la animación genérica al estado del elemento.
   */
  function toggleSample() {
    const el = audioRef.current
    if (!el) {
      setPlaying((value) => !value)
      return
    }
    if (el.paused) {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false))
    } else {
      el.pause()
      setPlaying(false)
    }
  }

  async function openStudio() {
    const supabase = createClient()
    if (!supabase) { window.location.href = '/auth'; return }
    const { data } = await supabase.auth.getUser()
    if (!data.user) { window.location.href = '/auth'; return }
    setUser(data.user); setStudioOpen(true)
  }

  async function generateSong(event: React.FormEvent) {
    event.preventDefault(); setSongStatus('Guardando y enviando al motor musical...')
    const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: songTitle, prompt: songPrompt, genre: 'Pop alternativo', tempo: 96, vocalStyle: 'Voz íntima y aireada', instrumentation: 'Piano, cuerdas y batería orgánica' }) })
    const result = await response.json(); setSongStatus(result.error || result.warning || 'Proyecto enviado. Revisa tu biblioteca en unos instantes.')
  }

  async function startCheckout(event: React.FormEvent) {
    event.preventDefault(); setStatus('Preparando tu acceso...')
    const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: COURSE_PRODUCT.id }) })
    const data = await response.json()
    if (data.url) window.location.href = data.url
    else setStatus(data.error ?? 'Revisa tus datos e intenta de nuevo.')
  }

  return <main className="min-h-screen overflow-hidden bg-[#07121f] text-[#edfaff] selection:bg-[#6feaff]/30">
    <div className="fixed inset-0 -z-0 bg-[radial-gradient(circle_at_75%_5%,rgba(88,213,230,.18),transparent_30%),radial-gradient(circle_at_15%_80%,rgba(155,92,226,.16),transparent_32%)]" />
    <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-10">
      <div className="flex items-center gap-3"><img src={logoImage} alt="Play and Go by TAMV ONLINE" className="size-11 rounded-xl object-cover object-center" /><div><p className="font-semibold tracking-tight">PLAY <span className="text-[#75e9f2]">AND GO</span></p><p className="text-[9px] uppercase tracking-[.24em] text-[#9fb8c7]">by TAMV ONLINE</p></div></div>
      <nav className="hidden items-center gap-8 text-sm text-[#a9c0ca] md:flex"><a href="/curso">Programa</a><a href="#ruta">Ruta</a><a href="#prompts">Prompts</a><a href="#logros">Logros</a><a href="/precios">Precios</a><Button onClick={openStudio} className="rounded-full bg-[#75e9f2] px-5 text-[#06131e] hover:bg-[#a0f4f9]">Entrar al estudio</Button></nav>
      <button className="md:hidden" aria-label="Abrir menú" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
    </header>
    {menuOpen && <nav className="relative z-20 flex flex-col gap-4 border-y border-white/10 bg-[#0a1b2b] px-5 py-5 text-sm md:hidden"><a href="/curso">Programa completo</a><a href="#ruta">Ruta de aprendizaje</a><a href="#prompts">Biblioteca de prompts</a><a href="/precios">Precios</a><a href="/perfil">Mi cuenta</a><Button onClick={() => setShowRegister(true)} className="rounded-full bg-[#75e9f2] text-[#06131e]">Inscribirme</Button></nav>}

    <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-8 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:pb-24 lg:pt-20">
      <div><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#75e9f2]/30 bg-[#75e9f2]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.2em] text-[#8cecf3]"><Sparkles size={13} /> Música aumentada por IA</div><h1 className="max-w-2xl text-5xl font-semibold leading-[.95] tracking-[-.065em] sm:text-7xl">Convierte tus ideas en <span className="bg-gradient-to-r from-[#78eaf0] via-[#b4a5ff] to-[#ff9eea] bg-clip-text text-transparent">canciones.</span></h1><p className="mt-7 max-w-xl text-base leading-7 text-[#aac3ce]">Aprende desde cero a crear música con inteligencia artificial y desarrolla un criterio profesional para dirigir voces, géneros, tempos e instrumentaciones.</p><div className="mt-8 flex flex-wrap gap-3"><Button onClick={() => setShowRegister(true)} className="rounded-full bg-[#75e9f2] px-6 py-6 font-semibold text-[#06131e] hover:bg-[#a0f4f9]">Comenzar la ruta <ArrowRight data-icon="inline-end" /></Button><a href="#ruta" className="flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm text-[#c4d8df] hover:bg-white/5">Explorar programa</a></div><div className="mt-10 flex items-center gap-6 text-xs text-[#7f9aa7]"><span className="flex items-center gap-2"><BadgeCheck className="text-[#75e9f2]" /> Certificado final</span><span className="flex items-center gap-2"><Headphones className="text-[#c09eff]" /> Audio + video</span></div></div>
      <div className="relative"><div className="absolute -inset-6 rounded-[2rem] bg-[#75e9f2]/10 blur-3xl" /><div className="relative overflow-hidden rounded-[2rem] border border-[#75e9f2]/25 bg-[#0c2432] p-2 shadow-2xl shadow-[#55d4ee]/10"><img src={heroImage} alt="Productor explorando música con inteligencia artificial" className="aspect-[4/3] w-full rounded-[1.5rem] object-cover" /><audio ref={audioRef} src={sampleAudio} loop preload="none" onEnded={() => setPlaying(false)} /><div className="absolute bottom-7 left-7 right-7 flex items-center justify-between rounded-2xl border border-white/15 bg-[#071522]/80 p-4 backdrop-blur-xl"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#75e9f2]">Ahora sonando</p><p className="mt-1 text-sm font-medium">Diseña tu primer universo sonoro</p></div><button aria-label={playing ? 'Pausar muestra' : 'Reproducir muestra'} aria-pressed={playing} onClick={toggleSample} className="flex size-10 items-center justify-center rounded-full bg-[#75e9f2] text-[#06131e]">{playing ? <span className="text-xs">||</span> : <Play size={16} fill="currentColor" />}</button></div></div><div className="equalizer absolute -bottom-5 -right-5 flex h-16 items-end gap-1 rounded-xl border border-white/10 bg-[#0d2030]/95 p-3 shadow-[0_0_28px_rgba(117,233,242,.18)]">{[3,7,5,9,4,8,6,10,5,7].map((height, i) => <span key={i} className={`equalizer-bar w-1 rounded-full bg-gradient-to-t from-[#9a72e8] via-[#75e9f2] to-[#ffcf72] ${playing ? 'equalizer-bar-active' : ''}`} style={{ height: `${height * 4}px`, animationDelay: `${i * 80}ms` }} />)}</div></div>
    </section>

    <section id="ruta" className="relative z-10 mx-auto max-w-7xl px-5 py-16 lg:px-10"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[.24em] text-[#75e9f2]">Tu recorrido</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">De la primera idea al release</h2></div><div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-[#a9c0ca]">24% completado · nivel 1</div></div><div className="grid gap-3">{modules.map(([number, title, meta, state]) => <button key={number} className={`group flex items-center gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${state === 'current' ? 'border-[#75e9f2]/50 bg-[#75e9f2]/[.08]' : 'border-white/10 bg-white/[.035] hover:border-white/20'}`}><span className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${state === 'done' ? 'bg-[#83d7b4]/15 text-[#83d7b4]' : state === 'current' ? 'bg-[#75e9f2] text-[#06131e]' : 'bg-white/10 text-white/40'}`}>{state === 'done' ? <Check /> : state === 'locked' ? <LockKeyhole size={17} /> : number}</span><span className="min-w-0 flex-1"><strong className="block text-sm">{title}</strong><small className="mt-1 block text-xs text-[#7f9aa7]">{meta}</small></span>{state === 'current' && <span className="hidden rounded-full bg-[#75e9f2]/15 px-3 py-1 text-[10px] text-[#8cecf3] sm:block">Siguiente</span>}<ChevronRight className="text-[#6f8995]" size={18} /></button>)}</div></section>

    <section id="sesiones" className="relative z-10 mx-auto max-w-7xl px-5 py-16 lg:px-10"><div className="mb-8"><p className="text-[10px] uppercase tracking-[.24em] text-[#75e9f2]">Programa completo · 5 módulos</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Cada sesión termina en una práctica.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#8fa9b5]">Lecciones breves, ejemplos guiados y ejercicios con entregables para pasar de explorar herramientas a tomar decisiones de productor.</p></div><div className="grid gap-4 lg:grid-cols-2">{curriculum.map((item, index) => <details key={item.module} className="group rounded-2xl border border-white/10 bg-white/[.035] p-5 open:border-[#75e9f2]/40 open:bg-[#75e9f2]/[.05]"><summary className="flex cursor-pointer list-none items-start gap-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#c09eff]/15 text-xs font-semibold text-[#d4c7ff]">0{index + 1}</span><span className="flex-1"><span className="text-[10px] uppercase tracking-[.18em] text-[#ff9eea]">{item.module} · {item.duration}</span><strong className="mt-1 block text-lg">{item.title}</strong><span className="mt-2 block text-xs leading-5 text-[#8fa9b5]">{item.objective}</span></span><ChevronRight className="mt-2 text-[#75e9f2] transition group-open:rotate-90" /></summary><ol className="mt-5 flex flex-col gap-3 border-l border-[#75e9f2]/20 pl-14">{item.lessons.map((lesson, lessonIndex) => <li key={lesson} className="text-sm leading-6 text-[#b5cbd4]"><span className="mr-2 text-xs text-[#75e9f2]">{lessonIndex + 1}.</span>{lesson}</li>)}</ol><div className="mt-5 rounded-xl border border-[#ffcf72]/20 bg-[#ffcf72]/5 p-3 text-xs leading-5 text-[#d8c99d]"><strong className="text-[#ffcf72]">Entregable:</strong> {item.deliverable}</div></details>)}</div></section>

    <section id="prompts" className="relative z-10 mx-auto max-w-7xl px-5 py-16 lg:px-10"><div className="mb-8"><p className="text-[10px] uppercase tracking-[.24em] text-[#ff9eea]">Laboratorio creativo</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Prompts que sí producen resultados</h2><p className="mt-3 max-w-xl text-sm text-[#8fa9b5]">Plantillas con dirección de voz, BPM, instrumentación, dinámica y mezcla para dejar de improvisar.</p></div><div className="grid gap-4 lg:grid-cols-3">{prompts.map(([name, meta, copy]) => <button key={name} onClick={() => setPrompt(copy)} className="group rounded-2xl border border-white/10 bg-white/[.035] p-5 text-left transition hover:-translate-y-1 hover:border-[#75e9f2]/40"><div className="mb-8 flex items-center justify-between"><span className="rounded-full border border-[#c09eff]/25 bg-[#c09eff]/10 px-2.5 py-1 text-[9px] uppercase tracking-wider text-[#d4c7ff]">Plantilla pro</span><Music2 className="text-[#75e9f2]" size={20} /></div><h3 className="font-medium">{name}</h3><p className="mt-2 text-xs text-[#75e9f2]">{meta}</p><p className="mt-4 line-clamp-2 text-xs leading-5 text-[#829ca8]">{copy}</p><span className="mt-5 flex items-center gap-1 text-xs text-[#ffb1ed]">Usar plantilla <ArrowRight size={13} /></span></button>)}</div></section>

    <section id="estudio" className="relative z-10 mx-auto max-w-7xl px-5 py-16 lg:px-10"><div className="overflow-hidden rounded-[2rem] border border-[#75e9f2]/30 bg-[#0b1f2e] p-6 shadow-2xl shadow-[#75e9f2]/10 sm:p-10"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-[10px] uppercase tracking-[.24em] text-[#75e9f2]">Estudio Play and Go</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Pon a prueba lo aprendido</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#9fb8c7]">Crea hasta 2 canciones diarias con tu inscripción activa. El motor recibe tu dirección de voz, tempo, género e instrumentación para convertirla en una producción real.</p></div><div className="rounded-2xl border border-[#ffcf72]/25 bg-[#ffcf72]/10 px-4 py-3 text-center"><p className="text-2xl font-semibold text-[#ffcf72]">2 / día</p><p className="text-[10px] uppercase tracking-wider text-[#cdbd8a]">Inscripción Pro</p></div></div><Button onClick={openStudio} className="mt-7 rounded-full bg-[#75e9f2] px-6 py-5 font-semibold text-[#06131e]">Abrir compositor <Music2 data-icon="inline-start" /></Button></div></section>

    <section id="logros" className="relative z-10 mx-auto max-w-7xl px-5 py-16 lg:px-10"><div className="rounded-[2rem] border border-[#c09eff]/20 bg-gradient-to-br from-[#171b39] to-[#0e2130] p-6 sm:p-10"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="text-[10px] uppercase tracking-[.24em] text-[#ffcf72]">Progreso visible</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Cada práctica desbloquea una nueva frecuencia.</h2><p className="mt-4 text-sm leading-6 text-[#a6bbc5]">Colecciona insignias, construye tu portafolio y demuestra que puedes dirigir una producción completa.</p></div><div className="grid grid-cols-3 gap-3">{[['Primer beat', Zap, 'Completado'], ['Oído crítico', Award, 'Desbloqueada'], ['Productor IA', Trophy, '24%']].map(([label, Icon, state]) => <div key={label as string} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#ffcf72]/15 text-[#ffcf72]"><Icon /></div><p className="mt-3 text-xs font-medium">{label as string}</p><p className="mt-1 text-[10px] text-[#7f9aa7]">{state as string}</p></div>)}</div></div></div></section>
    <footer className="relative z-10 border-t border-white/10 px-5 py-10 text-center text-xs text-[#78919d]"><div className="mx-auto mb-4 flex items-center justify-center gap-3"><img src={tamvLogoImage} alt="TAMV ONLINE" className="size-10 rounded-lg object-cover ring-1 ring-[#ffcf72]/30" /><span className="text-left"><strong className="block text-sm tracking-[.16em] text-[#d8c99d]">TAMV ONLINE</strong><span className="text-[9px] uppercase tracking-[.18em] text-[#75e9f2]">Tecnología · música · futuro</span></span></div><span>Play and Go by TAMV ONLINE</span> <span className="mx-2 text-[#75e9f2]">•</span> Orgullosamente Realmontenses</footer>

    <button aria-label="Abrir asistente del curso" onClick={() => setChatOpen(!chatOpen)} className="fixed bottom-5 right-5 z-40 flex size-14 items-center justify-center rounded-full border border-[#75e9f2]/60 bg-[#0b2635] text-[#75e9f2] shadow-2xl shadow-[#75e9f2]/20 transition hover:scale-105"><MessageCircle /></button>
    {chatOpen && <aside className="fixed bottom-24 right-5 z-40 flex w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl border border-[#75e9f2]/35 bg-[#0b1d2b]/95 shadow-2xl shadow-[#75e9f2]/15 backdrop-blur-xl"><div className="flex items-center justify-between border-b border-white/10 p-4"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#75e9f2]">Guía Play and Go</p><h2 className="mt-1 font-semibold">Asistente del curso</h2></div><button aria-label="Cerrar asistente" onClick={() => setChatOpen(false)}><X size={18} /></button></div><div className="flex max-h-80 flex-col gap-3 overflow-y-auto p-4">{chatMessages.map((message, index) => <div key={index} className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-5 ${message.from === 'user' ? 'self-end bg-[#75e9f2] text-[#06131e]' : 'self-start border border-white/10 bg-white/5 text-[#c5d8df]'}`}>{message.text}</div>)}</div><form onSubmit={sendChat} className="flex gap-2 border-t border-white/10 p-3"><input aria-label="Pregunta al asistente" value={chatInput} onChange={event => setChatInput(event.target.value)} placeholder="¿Qué quieres saber?" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-xs outline-none focus:border-[#75e9f2]" /><Button type="submit" aria-label="Enviar pregunta" className="size-10 shrink-0 rounded-xl bg-[#75e9f2] p-0 text-[#06131e]"><Send size={16} /></Button></form></aside>}

    {prompt && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02080e]/80 p-4 backdrop-blur-sm" onClick={() => setPrompt(null)}><div className="w-full max-w-lg rounded-3xl border border-[#75e9f2]/30 bg-[#0d2230] p-6 shadow-2xl" onClick={e => e.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#75e9f2]">Prompt listo para adaptar</p><h2 className="mt-2 text-xl font-semibold">Biblioteca Play and Go</h2></div><button aria-label="Cerrar prompt" onClick={() => setPrompt(null)}><X className="text-[#8fa9b5]" /></button></div><p className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-[#c5d8df]">{prompt}</p><Button className="mt-5 w-full rounded-full bg-[#75e9f2] text-[#06131e]" onClick={() => setPrompt(null)}>Copiar y personalizar <Sparkles data-icon="inline-end" /></Button></div></div>}
    {studioOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02080e]/85 p-4 backdrop-blur-sm" onClick={() => setStudioOpen(false)}><div className="w-full max-w-2xl rounded-3xl border border-[#75e9f2]/30 bg-[#0d2230] p-6 shadow-2xl" onClick={e => e.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#75e9f2]">{user?.email}</p><h2 className="mt-2 text-2xl font-semibold">Nuevo universo sonoro</h2></div><button aria-label="Cerrar compositor" onClick={() => setStudioOpen(false)}><X className="text-[#8fa9b5]" /></button></div><form onSubmit={generateSong} className="mt-6 flex flex-col gap-4"><input required value={songTitle} onChange={e => setSongTitle(e.target.value)} placeholder="Título de la canción" className="h-12 rounded-xl border border-white/10 bg-black/20 px-4 text-sm outline-none focus:border-[#75e9f2]" /><textarea required value={songPrompt} onChange={e => setSongPrompt(e.target.value)} placeholder="Describe la canción: género, emoción, estructura, voz, tempo e instrumentos..." className="min-h-36 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 outline-none focus:border-[#75e9f2]" /><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs"><span className="text-[#75e9f2]">96 BPM</span><p className="mt-1 text-[#8fa9b5]">Tempo sugerido</p></div><div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs"><span className="text-[#ff9eea]">Voz aireada</span><p className="mt-1 text-[#8fa9b5]">Perfil vocal</p></div><div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs"><span className="text-[#ffcf72]">Piano + cuerdas</span><p className="mt-1 text-[#8fa9b5]">Instrumentación</p></div></div><Button type="submit" className="h-12 rounded-full bg-[#75e9f2] font-semibold text-[#06131e]">Generar canción <Sparkles data-icon="inline-end" /></Button>{songStatus && <p className="rounded-xl bg-[#75e9f2]/10 p-3 text-center text-xs text-[#8cecf3]">{songStatus}</p>}</form></div></div>}
    {showRegister && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02080e]/80 p-4 backdrop-blur-sm" onClick={() => setShowRegister(false)}><div className="w-full max-w-md rounded-3xl border border-[#75e9f2]/30 bg-[#0d2230] p-6 shadow-2xl" onClick={e => e.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[.2em] text-[#75e9f2]">Inscripción segura</p><h2 className="mt-2 text-2xl font-semibold">Activa tu acceso Pro</h2></div><button aria-label="Cerrar registro" onClick={() => setShowRegister(false)}><X className="text-[#8fa9b5]" /></button></div><div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center justify-between"><span className="text-sm">Curso completo</span><strong className="text-xl">{coursePrice}</strong></div><p className="mt-2 text-xs text-[#8fa9b5]">Acceso a lecciones, prompts, ejercicios, audio, video e insignias.</p></div><form onSubmit={startCheckout} className="mt-5 flex flex-col gap-3"><label className="text-xs text-[#a9c0ca]" htmlFor="email">Tu correo electrónico</label><input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" className="h-12 rounded-xl border border-white/10 bg-black/20 px-4 text-sm outline-none placeholder:text-[#58717e] focus:border-[#75e9f2]" /><Button type="submit" className="h-12 rounded-full bg-[#75e9f2] font-semibold text-[#06131e] hover:bg-[#a0f4f9]">Continuar al pago <ArrowRight data-icon="inline-end" /></Button>{status && <p className="text-center text-xs text-[#ffcf72]">{status}</p>}</form><p className="mt-4 text-center text-[10px] text-[#6f8995]">Pago procesado de forma segura por Stripe.</p></div></div>}
  </main>
}
