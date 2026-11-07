# Play & Go — protocolo de Preview y aceptación funcional

**Objetivo:** desplegar una versión revisable en Vercel Preview sin promover cambios a producción y dejar evidencia verificable por función.

## 1. Flujo de trabajo

1. Trabajar en una rama distinta de main.
2. Abrir un Pull Request contra main.
3. Esperar el workflow canónico **ci**: instalación reproducible, typecheck, build de producción y smoke tests HTTP.
4. Revisar el deployment Preview asociado al commit del PR en Vercel.
5. Ejecutar la matriz funcional de este documento y adjuntar resultados al PR.
6. No fusionar ni promover a producción hasta que los criterios obligatorios estén aprobados.

El workflow CI automatizado no recibe credenciales de servicios externos. Comprueba que la aplicación compila y que las rutas/API se comportan de forma segura sin credenciales reales; no habilita autenticación, cobros ni generación externa. No añadir secretos de producción al workflow.

## 2. Variables y servicios del entorno de pruebas

Configurar las variables en **Vercel → Project → Settings → Environment Variables**, seleccionando únicamente **Preview**. No copiar credenciales de producción a Preview.

| Variable | Preview | Criterio |
|---|---|---|
| PREVIEW_APP_URL | Opcional: URL HTTPS estable y exclusiva para Preview | Si se omite, la app usa VERCEL_URL para construir el origen del deployment actual; Preview nunca debe caer al origen de producción |
| NEXT_PUBLIC_APP_URL | URL HTTPS canónica de producción | Se utiliza fuera de Preview; no debe usarse para enrutar callbacks de Preview |
| NEXT_PUBLIC_SUPABASE_URL | Proyecto Supabase de staging | Proyecto separado de producción |
| NEXT_PUBLIC_SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Clave pública de staging | Una de las dos, de ese mismo proyecto |
| SUPABASE_SERVICE_ROLE_KEY | Clave de servidor de staging | Nunca usar una clave de producción ni exponerla como NEXT_PUBLIC_* |
| STRIPE_SECRET_KEY | Clave de prueba sk_test_... | No usar sk_live_... |
| STRIPE_WEBHOOK_SECRET | Secreto del endpoint de Stripe test | Debe corresponder al endpoint que recibe eventos de Preview |
| GENERATOR_CALLBACK_SECRET | Secreto aleatorio propio de staging | Debe coincidir con la firma del callback de prueba |
| API_KEY | Vacío salvo que el proveedor histórico sea el que se prueba | No compartir con producción |
| AI_AGENT_API_KEY | Clave limitada de prueba o vacío | Definir límites de gasto en el proveedor |
| AI_AGENT_BASE_URL, AI_AGENT_MODEL | Proveedor/modelo de prueba | Verificar compatibilidad con OpenAI API |

Las variables NEXT_PUBLIC_* se incorporan al bundle durante el build; después de cambiarlas hay que generar un nuevo deployment. No enviar secretos en issues, capturas, logs ni archivos versionados.

### Supabase

- Crear un proyecto de staging separado.
- Revisar las migraciones de supabase/migrations/ y aplicarlas en orden a staging, nunca a producción como parte de una prueba automática.
- Comprobar RLS en las tablas de progreso, canciones, entitlement y perfil.
- Probar lectura y escritura con dos cuentas distintas para verificar aislamiento entre usuarios.
- Configurar las URL de sitio y redirect allow-list para el origen de Preview utilizado.

### Stripe

- Mantener el modo de prueba.
- Configurar el webhook de staging para la ruta implementada en app/api/stripe/.
- Verificar firma, reintentos e idempotencia del evento; el retorno del navegador por sí solo no prueba que un pago fue concedido.
- Confirmar que una compra de prueba actualiza el entitlement correcto y que un usuario no puede reclamarlo manipulando el cliente.

### Generación musical y agente

- Empezar con el motor local del navegador y el fallback del agente, que no requieren un proveedor externo.
- Probar proveedores externos únicamente con credenciales de staging y límites de gasto.
- Verificar que una llamada sin configuración devuelve el error documentado (por ejemplo, 503) en lugar de fingir que generó audio.
- No publicar un Preview con endpoints de generación pagada abiertos sin límites y autorización comprobados.

## 3. Matriz de revisión manual

Registrar cada fila como **PASS**, **FAIL**, **BLOCKED** o **NOT TESTED**. Un estado PASS requiere ejecutar la acción y observar el resultado; la mera existencia de una página no basta.

| Área | Prueba | Evidencia de aceptación |
|---|---|---|
| Landing e intro | Abrir en escritorio y móvil; avanzar, pausar, saltar y completar intro | Sin errores de consola, controles accesibles y salida a la aplicación |
| Accesibilidad | Navegar con teclado; probar prefers-reduced-motion | Foco visible, etiquetas accesibles y animación reducida respetada |
| Catálogo | Abrir curso, módulos y sesiones | IDs, títulos y navegación coinciden con lib/course.ts |
| Autenticación | Registro, login, logout, callback y sesión expirada | Mensajes claros; redirects allow-listed; sin bucles |
| Perfil y progreso | Abrir perfil, completar una sesión y recargar | Progreso persiste para la cuenta y no se filtra a otra |
| Estudio local | Iniciar audio, cambiar parámetros y detenerlo | Audio real del navegador, stop limpio, sin duplicación de nodos ni errores |
| Plan de música | Enviar prompt válido e inválido a /api/music/plan | Validación y respuestas coherentes; fallback explícito |
| Agente | Pregunta sobre contenido real del curso; exceder límite | Respuesta con fallback honesto, límite con 429 y Retry-After |
| Biblioteca | Crear/listar/consultar canción con sesión y sin sesión | Autorización aplicada y estado vacío explicado |
| Checkout | Crear checkout en Stripe test y regresar cancelado/completado | Precios proceden del catálogo del servidor; sin cobro real |
| Webhook | Enviar evento válido, firma inválida y el mismo evento dos veces | Firma validada, idempotencia y entitlement correcto |
| Generación externa | Probar sin clave, éxito, fallo y callback duplicado | Sin falsos éxitos; callback autenticado; errores recuperables |
| Seguridad | Revisar RLS, cabeceras, secretos, autorización y límites | Sin secretos en bundle/logs; aislamiento por usuario |
| SEO y rutas | Abrir robots.txt, sitemap.xml y metadatos | Preview no indexable; producción con URL canónica válida |
| Observabilidad | Revisar logs de Vercel para una solicitud exitosa y otra fallida | Errores diagnosticables sin tokens ni datos personales innecesarios |

## 4. Pruebas automáticas

El workflow canónico .github/workflows/ci.yml ejecuta:

- pnpm install --frozen-lockfile
- pnpm typecheck
- pnpm build
- Inicio del servidor compilado con pnpm start
- Smoke tests HTTP para landing, curso, precios, perfil, biblioteca, estudio, robots y sitemap.

El smoke test demuestra que las rutas responden HTTP 200 en el build de CI. **No demuestra** que el login funcione, que las tablas existan, que RLS sea correcta, que un cobro se liquide o que la generación externa esté configurada. Esas pruebas requieren el entorno Preview y los servicios de staging.

## 5. Criterios de salida a producción

- [ ] Workflow verde en el commit exacto del PR.
- [ ] Deployment Preview READY y URL revisada manualmente.
- [ ] Matriz funcional cumplimentada, sin FAIL en flujos críticos.
- [ ] Migraciones aplicadas a staging y pruebas RLS aprobadas.
- [ ] Checkout y webhook probados en Stripe test, incluidos eventos duplicados.
- [ ] Autenticación y aislamiento de datos verificados con dos cuentas.
- [ ] Variables Preview comprobadas sin mostrar sus valores secretos.
- [ ] Ningún endpoint reporta éxito falso si falta una credencial o falla un proveedor.
- [ ] Evidencias adjuntas al PR: commit SHA, URL Preview, resultado del workflow y notas de pruebas.
- [ ] Aprobación explícita antes de fusionar a main o promover producción.

## 6. Rollback y protección

Si Preview falla, corregir en la rama del PR; no se requiere tocar producción. Si el despliegue de producción se actualiza accidentalmente, usar la opción de rollback de Vercel al último deployment conocido como bueno y revisar qué commit disparó el cambio. No aplicar migraciones destructivas ni cambios de DNS como parte de este flujo de pruebas.


### Entitlements migration gate

The migration 20261107190000_entitlement_lifecycle.sql changes schema and quota semantics. Apply it in staging first, and reconcile rows marked entitlement_reconciliation_required using verified Stripe session/subscription evidence before production rollout. See docs/ENTITLEMENT_LIFECYCLE.md for the exact query and acceptance matrix. Do not infer lifetime course access from a standalone extension.


## 8. Aceptación académica del laboratorio técnico

- Rutas que deben devolver HTTP 200 en CI: /curso/laboratorio-audio, /curso/laboratorio-audio/modulo-1, /curso/laboratorio-audio/modulo-2 y /curso/laboratorio-audio/evaluacion.
- GET /api/advanced-audio/exam?module=dsp y ?module=mastering debe devolver 20 preguntas y opciones, sin exponer correctIndex ni claves correctas.
- Las pruebas Python se ejecutan en el trabajo paralelo de CI desde laboratorio-audio-ia/: instalar requirements.txt, compileall y unittest discover. Son pruebas de contrato con audio sintético, no una aprobación artística ni una verificación de licencias de una entrega real.
- El examen técnico debe mostrar retroalimentación después del envío, distinguir aprobación teórica (80/100) de dominio teórico sólido (85/100) y no emitir certificados de grado.
- La evaluación con IA requiere Supabase configurado, sesión autenticada y AI_AGENT_API_KEY. Si falta cualquiera, debe fallar con mensaje explícito; nunca debe devolver una nota simulada.
- La evaluación con IA recibe solo un resumen textual. Para una calificación válida, una persona revisa los archivos, código ejecutado, audio, gráfica, procedencia y límites descritos por el estudiante.
- El camino técnico es complementario; la cuenta central del curso sigue teniendo 16 sesiones. No renumerar lecciones ni cambiar el contrato de badges/progreso como parte de esta ampliación.
