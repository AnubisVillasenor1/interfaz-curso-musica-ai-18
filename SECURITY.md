# Política de seguridad

## Alcance

Este repositorio contiene la aplicación Next.js, las migraciones de Supabase, el
servicio TAMV-AudioCore y los scripts de verificación de PLAY & GO.

## Cómo reportar una vulnerabilidad

Usa **GitHub Security Advisories** del repositorio
(`Security → Report a vulnerability`). No abras un issue público con detalles
explotables, credenciales, datos personales ni capturas de producción.

Incluye:

- versión o commit afectado;
- pasos mínimos de reproducción;
- impacto esperado (confidencialidad, integridad, disponibilidad o económico);
- si el fallo requiere una cuenta, una sesión o una clave concreta.

## Tiempos de respuesta

| Gravedad | Acuse | Objetivo de corrección |
|---|---|---|
| Crítica (RCE, fuga de claves, pagos) | 72 h | 7 días |
| Alta (acceso cruzado, bypass de auth) | 5 días | 30 días |
| Media/baja | 10 días | siguiente release |

Son objetivos internos, no un SLA contractual.

## Secretos

- Ningún secreto se commitea. `.env.local` y `.env*.local` están ignorados.
- Las claves `NEXT_PUBLIC_*` viajan en el bundle: no son secretos.
- Si una clave se expone, se rota en el proveedor y se redespliega. No basta con
  borrar el commit.
- Producción, Preview y Desarrollo deben usar credenciales distintas.
- `/api/health` sólo publica presencia/ausencia de configuración; nunca valores.

## Prácticas obligatorias

- Validar toda entrada del usuario en el servidor.
- Mantener RLS activo; las tablas de servicio (`stripe_events`,
  `stripe_session_grants`, `generation_callback_tickets`) no se exponen a
  `anon`/`authenticated`.
- Firmar callbacks y verificar expiración/nonce.
- Aplicar migraciones antes de desplegar el código que las requiere.
- Revisar dependencias y cabeceras antes de un release.

## Fuera de alcance

- Ingeniería social.
- Ataques de denegación de servicio volumétricos.
- Vulnerabilidades en servicios de terceros (Stripe, Supabase, Upstash,
  proveedores musicales): repórtalas a su programa correspondiente.
