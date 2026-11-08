'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, LockKeyhole, Sparkles } from 'lucide-react'

type Tone = 'pending' | 'error'
type Mode = 'login' | 'signup'

/**
 * Formulario de acceso y registro.
 *
 * El modo llega desde el servidor (`/auth?mode=signup`) en lugar de leerse en un
 * `useEffect`. Antes, quien pulsaba «Crear cuenta» veía un instante el título de
 * acceso y el formulario cambiaba después de hidratar: el mismo parpadeo que
 * hacía dudar de si estaba en el sitio correcto. Ahora el HTML ya sale con el
 * formulario correcto.
 */
export function AuthForm({ initialMode, next }: { initialMode: Mode; next: string }) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  // El texto del aviso y su semántica viajan juntos: «revisa tu correo» es un paso
  // pendiente, «no pudimos completar el acceso» es un fallo. Pintarlos del mismo
  // color obliga a leer para saber en qué caso se está uno.
  const [tone, setTone] = useState<Tone>('pending')
  const [busy, setBusy] = useState(false)

  function say(text: string, as: Tone = 'pending') {
    setMessage(text)
    setTone(as)
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode)
    say('')
    // Mantiene la URL en sintonía con lo que se ve: recargar o compartir el
    // enlace no devuelve a la persona al formulario contrario.
    const url = new URL(window.location.href)
    if (nextMode === 'signup') url.searchParams.set('mode', 'signup')
    else url.searchParams.delete('mode')
    window.history.replaceState(null, '', url)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    say('')
    const supabase = createClient()
    // Sin credenciales públicas no hay Supabase al que hablarle. Se lo decimos
    // al usuario en la pantalla, en lugar de lanzar un TypeError en el click.
    if (!supabase) {
      setBusy(false)
      say('El acceso no está configurado en este entorno. Vuelve más tarde.', 'error')
      return
    }
    const result =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo:
                process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`,
              data: { display_name: name },
            },
          })
    setBusy(false)
    if (result.error) {
      // Supabase confirma por correo, y ese camino no es un error: el texto
      // literal que devuelve el proveedor dice 'confirm'.
      const pideConfirmar = result.error.message.toLowerCase().includes('confirm')
      say(
        pideConfirmar
          ? 'Revisa tu correo para confirmar la cuenta.'
          : 'No pudimos completar el acceso. Revisa tus datos.',
        pideConfirmar ? 'pending' : 'error',
      )
    } else if (mode === 'signup') {
      // Con la confirmación por correo desactivada, Supabase devuelve sesión en
      // el propio alta. Antes se le pedía a la persona revisar un correo que
      // nunca iba a llegar, aunque ya estaba dentro.
      if (result.data.session) {
        window.location.href = next
      } else {
        say('Cuenta creada. Revisa tu correo para confirmar el acceso.')
      }
    } else if (mode === 'login') {
      // `next` ya viene saneado desde el servidor: sólo rutas internas.
      window.location.href = next
    }
  }

  return (
    <main className="pg-shell flex min-h-screen items-center justify-center px-5" style={{ background: 'var(--pg-bg)' }}>
      <div className="pg-card w-full max-w-md p-8">
        <a href="/" className="pg-navlink mb-8 inline-flex items-center gap-2">
          <ArrowLeft /> Volver a Play and Go
        </a>

        <div className="mb-8 flex items-center gap-3">
          <div className="pg-mark">
            <Sparkles />
          </div>
          <div>
            <p className="pg-item-title">
              PLAY <span className="pg-accent-cyan">AND GO</span>
            </p>
            <p className="pg-label" data-tone="muted">
              by TAMV ONLINE
            </p>
          </div>
        </div>

        <h1 className="pg-title">{mode === 'login' ? 'Entra a tu estudio' : 'Crea tu cuenta'}</h1>
        <p className="pg-lede">Guarda tus canciones, avances e insignias en un solo lugar.</p>
        <p className="pg-meta mt-2">
          {mode === 'signup'
            ? 'Es gratis y no pedimos tarjeta. El curso completo se compra aparte, cuando tú decidas.'
            : 'Si es tu primera vez, cambia a «Crear cuenta» aquí abajo.'}
        </p>

        <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
          {/* Etiqueta + campo, no solo placeholder: un placeholder desaparece en
              cuanto se escribe y deja el campo sin nombre para el lector de
              pantalla. `htmlFor`/`id` es lo que hace que el aviso de «este campo
              es obligatorio» se lea junto al campo correcto. */}
          {mode === 'signup' && (
            <div className="flex flex-col gap-1.5">
              <label className="pg-label" htmlFor="auth-name">
                Nombre artístico
              </label>
              <input
                id="auth-name"
                name="name"
                required
                autoComplete="nickname"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Como quieres aparecer en el curso"
                className="pg-field"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="pg-label" htmlFor="auth-email">
              Correo electrónico
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
              className="pg-field"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="pg-label" htmlFor="auth-password">
              Contraseña
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              required
              minLength={8}
              // `new-password` en el alta y `current-password` en el acceso: es lo
              // que evita que el gestor ofrezca una clave de otro sitio al crear la
              // cuenta, y lo que permite autocompletar al entrar.
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="pg-field"
            />
          </div>

          <button disabled={busy} className="pg-btn pg-btn-primary mt-1 w-full">
            {busy ? 'Conectando...' : mode === 'login' ? 'Entrar al estudio' : 'Crear cuenta'} <LockKeyhole />
          </button>
        </form>

        {/* Región viva montada siempre: creada junto con el mensaje, el aviso no se
            anuncia. Con `empty:hidden` desaparece sin dejar el hueco en el flujo. */}
        <p
          role={tone === 'error' ? 'alert' : 'status'}
          aria-live={tone === 'error' ? 'assertive' : 'polite'}
          className="pg-status mt-4 text-center empty:hidden"
          data-tone={tone}
        >
          {message}
        </p>

        <button
          onClick={() => changeMode(mode === 'login' ? 'signup' : 'login')}
          className="pg-minilink mt-6 w-full text-center"
        >
          {mode === 'login' ? '¿Primera vez? Crear cuenta' : 'Ya tengo cuenta · Iniciar sesión'}
        </button>
      </div>
    </main>
  )
}
