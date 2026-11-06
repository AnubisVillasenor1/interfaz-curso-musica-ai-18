'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, LockKeyhole, Sparkles } from 'lucide-react'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login'); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('')
    const supabase = createClient()
    // Sin credenciales públicas no hay Supabase al que hablarle. Se lo decimos
    // al usuario en la pantalla, en lugar de lanzar un TypeError en el click.
    if (!supabase) { setBusy(false); setMessage('El acceso no está configurado en este entorno. Vuelve más tarde.'); return }
    const result = mode === 'login' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`, data: { display_name: name } } }); setBusy(false); if (result.error) setMessage(result.error.message.includes('confirm') ? 'Revisa tu correo para confirmar la cuenta.' : 'No pudimos completar el acceso. Revisa tus datos.'); else if (mode === 'signup') setMessage('Cuenta creada. Revisa tu correo para confirmar el acceso.'); else window.location.href = '/'; }
  return <main className="pg-shell flex min-h-screen items-center justify-center px-5" style={{ background: 'var(--pg-bg)' }}><div className="pg-card w-full max-w-md p-8"><a href="/" className="pg-navlink mb-8 inline-flex items-center gap-2"><ArrowLeft /> Volver a Play and Go</a><div className="mb-8 flex items-center gap-3"><div className="pg-mark"><Sparkles /></div><div><p className="pg-item-title">PLAY <span className="pg-accent-cyan">AND GO</span></p><p className="pg-label" data-tone="muted">by TAMV ONLINE</p></div></div><h1 className="pg-title">{mode === 'login' ? 'Entra a tu estudio' : 'Crea tu cuenta'}</h1><p className="pg-lede">Guarda tus canciones, avances e insignias en un solo lugar.</p><form onSubmit={submit} className="mt-7 flex flex-col gap-4">{mode === 'signup' && <input required value={name} onChange={e => setName(e.target.value)} placeholder="Nombre artístico" className="pg-field" />}<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo electrónico" className="pg-field" /><input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña (mínimo 8 caracteres)" className="pg-field" /><button disabled={busy} className="pg-btn pg-btn-primary mt-1 w-full">{busy ? 'Conectando...' : mode === 'login' ? 'Entrar al estudio' : 'Crear cuenta'} <LockKeyhole /></button></form>{message && <p className="pg-callout mt-4 block text-center">{message}</p>}<button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="pg-minilink mt-6 w-full text-center">{mode === 'login' ? '¿Primera vez? Crear cuenta' : 'Ya tengo cuenta · Iniciar sesión'}</button></div></main>
}
