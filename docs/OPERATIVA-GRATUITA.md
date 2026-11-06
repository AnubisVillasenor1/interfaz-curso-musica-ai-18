# Operación de costo mínimo — Play and Go / TAMV

Meta: que la infraestructura cueste casi cero hasta que el ingreso la cubra.
Todo lo de abajo es open source o tier gratis; sin ads pagados, sin GPU en la nube por defecto.

## Stack y su costo

| Pieza | Servicio | Tier | Costo |
|---|---|---|---|
| Web | Vercel Hobby | gratis | 0 |
| Base de datos + auth + storage | Supabase | gratis (500MB BD, 1GB storage, 50k MAU) | 0 |
| Cobros | Stripe | por venta | 0 fijo |
| Chat del asistente | Ollama local (`OLLAMA_*`) o guía determinista sin clave | gratis | 0 |
| Música: composición local | Tone.js en el navegador (`engine: local`) | gratis | 0 |
| Música: voces | `MUSIC_PROVIDER=local` (Ace-Step propio, `music-engine/`) | tu hardware | 0 |
| Alternativa voces sin servidor | `MUSIC_PROVIDER=huggingface` (MusicGen, token gratis) | gratis con rate limit | 0 |
| Imágenes/marca | SVG local + `images.unoptimized` | sin CDN | 0 |
| Analítica | Vercel Analytics | incluido | 0 |

## Reglas que mantienen el costo en 0

1. **Sin proveedor configurado, no se cobra cupo**: `/api/generate` HTTP 503 + `fallback: local`. Un proveedor caído no cuesta dinero ni canciones.
2. **Estimación honestamente degradada**: sin `AI_AGENT_API_KEY` el chat responde con el contenido real del curso (`source: fallback`) — nunca factura por inferencia que no ocurrió.
3. **Cuotas duras**: `consume_generation_quota` atómica por día UTC; `MAX_MESSAGE_CHARS`, `maxDuration` y timeouts de 20–30s en proveedores externos.
4. **Caché agresiva en lo estático**: audio y marca con `max-age=86400 + stale-while-revalidate`; páginas de cuenta con `private, no-store` (privacidad > rendimiento).
5. **Build prerenderizado**: 34/35 rutas estáticas; el servidor solo responde API y páginas por usuario.
6. **Sin logs ni terceros de pago**: `console.error` estructurado, sin Sentry/DataDog — migrar solo si el tráfico lo justifica.

## Embudo de ingreso (sin vender humo)

El código maximiza lo que sí controla: precio único en `lib/products.ts` (landing, checkout y schema JSON-LD leen el mismo objeto), páginas de precios claras, curso con progreso e insignias que empujan a terminar, y motor local gratis que deja probar antes de pagar. Nada de esto garantiza ventas ni cubre Isabella, TAMV ni publicación en Frontiers — eso depende de audiencia, contenido y conversión real. El trabajo de ingeniería es que cada venta sea casi 100% margen (costo fijo ≈ 0).

## Licencias (revisar antes de monetizar)

- MusicGen (Meta) = `CC-BY-NC` · Ace-Step/YuE = revisar licencia de pesos por modelo.
- "Open source" no es sinonimo de uso comercial libre en todos los casos.
