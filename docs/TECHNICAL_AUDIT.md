# Auditoría técnica inicial y mejoras implementadas

Fecha de revisión: 2026-11-04. Alcance: inspección estática de los archivos visibles del repositorio; no se ejecutó el proyecto ni se verificó el esquema remoto de Supabase.

## Hallazgos de prioridad alta

- `app/api/generate/route.ts`: cuota diaria se consulta y actualiza en dos operaciones separadas. Solicitudes concurrentes pueden exceder el límite. La excepción de administrador se basa en un correo compilado en el código. Hay dependencia fuerte en el proveedor externo `sunoapi.org` y `API_KEY`; la función no ofrece una alternativa libre cuando falta la clave.
- `app/api/generate/callback/route.ts`: el callback público no verifica firma del proveedor antes de modificar canciones usando un UUID recibido. Es necesario configurar secreto HMAC/verificación del proveedor y validar el estado de propiedad antes de aceptar callbacks.
- `app/api/stripe/webhook/route.ts`: el webhook busca usuarios enumerando como máximo 1.000 cuentas, no registra idempotencia/event IDs y considera cualquier `productId` desconocido como el producto principal. Errores de Supabase no se propagan de manera visible.
- `app/api/checkout/route.ts`: la URL de retorno se construye a partir del header `Origin`, en vez de un dominio de aplicación configurado y permitido.
- El árbol visible no contiene migraciones SQL, pruebas, lint/typecheck, documentación de configuración, control de abuso ni almacenamiento de resultados musicales. Hay referencias a tablas `songs` y `entitlements` cuyo esquema no está presente en los archivos revisados.
- `components/course-dashboard.tsx`: landing, autenticación, checkout, chat y estudio están mezclados en un componente cliente grande; el asistente principal usa respuestas deterministas, no un agente/modelo. El flujo de generación solo reporta texto al usuario y no muestra una biblioteca persistente.
- `package.json`: nombre genérico `my-project`; solo scripts visibles son dev/build/start, no hay scripts de chequeo o pruebas.

## Mejoras añadidas en esta rama

- Ruta `/studio` con un flujo funcional sin servicios de pago: agente local basado en reglas, integración opcional con Ollama configurado por el operador y exportación procedural de archivo MIDI (melodía y acordes).
- API `POST /api/agent` con validación de longitud, timeout y fallback local si Ollama está ausente o no responde.
- API `POST /api/music/compose` con validación de tempo/tonalidad y descarga MIDI; no presenta MIDI como audio generado.
- API `GET /api/music/search` agrega búsqueda de Internet Archive y Jamendo opcional (`JAMENDO_CLIENT_ID`), con límite de resultados, timeout y aviso de licencias.
- UI en español, estados de operación, validaciones de formulario y descargo responsable de resultados externos.

## Riesgos pendientes antes de producción

1. Añadir rate limiting compartido (Redis/Upstash u otro proveedor), autenticación y cuotas atómicas del lado de servidor; el límite de tamaño no es control contra abuso distribuido.
2. Verificar firmas de callbacks, aplicar idempotencia transaccional a Stripe y al motor musical, validar los IDs de producto contra una lista permitida y usar `APP_URL` fija para callbacks de pago.
3. Definir/versionar migraciones de Supabase, políticas RLS, esquema de proyectos/artefactos y almacenamiento de audio.
4. Instalar/configurar lint, pruebas unitarias/integración/E2E, CI, logging estructurado, métricas y alertas; ejecutar `pnpm build` y `pnpm exec tsc --noEmit` en un entorno con dependencias.
5. Revisar por separado las licencias y derechos de cada modelo, dataset, grabación y resultado antes de despliegues comerciales. “Open source” y “gratis” no implican automáticamente uso comercial libre.
6. El MIDI es composición procedural útil como boceto, no una inferencia de modelo de audio. Para renderizar audio de alta fidelidad hace falta desplegar un modelo/servicio compatible con el hardware y sus licencias.

## Fuentes de datos

Internet Archive y Jamendo son catálogos externos. Los resultados no se copian ni se alojan; la app enlaza a su ficha original y presenta la licencia que expone el proveedor. Sin `JAMENDO_CLIENT_ID`, la búsqueda de Internet Archive sigue disponible.
