import { updateSession } from '@/lib/supabase/proxy'
import type { NextRequest } from 'next/server'
export async function proxy(request: NextRequest) { return updateSession(request) }
// El matcher corre el refresco de sesión (getUser) en cada request que atrapa.
// Se excluyen los assets (el mp3 de la intro, imágenes) y los endpoints de API
// que no dependen de la sesión de navegador: un XHR no consume las cookies que
// el proxy reescribiría, así que pasarlos por aquí sólo añade un getUser().
// Las páginas y las rutas que sí leen sesión (checkout/generate) siguen igual.
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|audio|api/music|api/agent|api/stripe|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav|ogg|m4a|ico)$).*)'] }
