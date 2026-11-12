# Play & Go — sistema de activación y onboarding

**Estado:** especificación de producto y contenido. La presencia de estas plantillas en el repositorio no significa que los envíos estén automatizados. Antes de activar correos deben configurarse Resend/SMTP, las plantillas de Supabase Auth, eventos fiables de producto, consentimiento y reglas de supresión.

## Posicionamiento

**PLAY & GO — Creator Operating System™**  
**Aprende. Crea. Analiza. Evoluciona.**

Promesa central: aprender producción musical con IA aplicada, crear desde el navegador y entender el sonido con herramientas de análisis técnico. No se debe prometer una canción lista para publicar ni atribuir métricas a un análisis que no se haya ejecutado.

## Secuencia de experiencia

1. Video breve que explica la visión y demuestra el producto.
2. Registro y confirmación de correo.
3. Onboarding breve: objetivo, nivel, resultado deseado y primera experiencia.
4. Primera acción real en Studio, Academy o AudioCore.
5. Resultado visible; invitar a escuchar, analizar o guardar según la capacidad real.
6. Recomendación de siguiente paso basada en la acción completada.
7. Correos de activación únicamente cuando el usuario aún no completó el evento objetivo.

El onboarding web se encuentra en `/onboarding`. La navegación principal se orienta a Academy, Studio, AudioCore, AI Lab, Community y Pricing. Creator Hub debe ser un espacio personal posterior al inicio de sesión, no un pilar principal de navegación.

## Video — 60 segundos

- **00:00–00:04 · Apertura.** Negro profundo. Una partícula de luz vibra como una onda sonora. Texto: “Toda gran producción comienza con una idea”.
- **00:04–00:10 · Presentación.** La partícula forma un núcleo digital, ondas y nodos. Voz: “Play & Go es el sistema operativo del creador musical”. Texto: “PLAY & GO · Creator Operating System™”.
- **00:10–00:18 · Aprende.** Interfaz de Academy, módulos y progreso. Voz: “Aprende producción musical, inteligencia artificial, DSP y masterización con un método práctico”.
- **00:18–00:28 · Crea.** Se escribe: “Sierreño melancólico con guitarras acústicas, voz profunda y atmósfera nocturna”. Texto: “Escribe tu idea”.
- **00:28–00:36 · Genera.** La interfaz muestra progreso de generación y una forma de onda solo cuando exista un resultado real. Voz: “Convierte tu idea en una base musical editable”.
- **00:36–00:46 · Analiza.** AudioCore muestra waveform, espectro, chroma y tonalidad cuando estén disponibles. Voz: “Entiende lo que estás creando con análisis de audio”.
- **00:46–00:53 · Evoluciona.** Guardado del proyecto y progreso. Mostrar certificado solo si se ha emitido realmente. Voz: “Guarda tu trabajo. Mide tu progreso. Evoluciona como creador”.
- **00:53–01:00 · Cierre.** Logo y CTA. Voz: “Aprende. Crea. Analiza. Evoluciona”. Texto: “PLAY & GO · Creator Operating System™ · Comienza gratis”.

### Versión de 15 segundos

- **0–3 s:** “Toda producción comienza con una idea”.
- **3–7 s:** “Play & Go la convierte en aprendizaje, sonido y análisis”.
- **7–11 s:** “Aprende. Crea. Analiza. Evoluciona”.
- **11–15 s:** “PLAY & GO — Creator Operating System™. Comienza gratis”.

## Emails

### 1. Confirmación de cuenta — transaccional

**Asunto:** Confirma tu cuenta de Play & Go

Hola,

Bienvenido a Play & Go, el sistema operativo para creadores musicales.

Confirma tu dirección de correo para activar tu cuenta y comenzar tu recorrido.

**CTA:** Confirmar mi cuenta

Si no creaste esta cuenta, puedes ignorar este mensaje.

PLAY & GO  
Aprende. Crea. Analiza. Evoluciona.

> Implementar mediante plantilla de Supabase Auth. No incluir datos personales adicionales en este correo.

### 2. Bienvenida — tras confirmar el correo

**Asunto:** Tu primer proyecto musical comienza aquí  
**Objetivo único:** iniciar la primera experiencia de creación.

Hola, {{first_name}},

Bienvenido a Play & Go.

Aquí puedes aprender producción musical, crear ideas y entender mejor el sonido.

Tu primer paso es simple: describe lo que imaginas y abre Studio para empezar a trabajar.

Ejemplo: “Sierreño melancólico con guitarras acústicas y atmósfera nocturna”.

**CTA:** Crear mi primera idea

PLAY & GO  
Aprende. Crea. Analiza. Evoluciona.

### 3. Activación — día 3, solo si no hay evento de activación

**Evento de supresión:** el usuario no ha generado ni analizado audio y no ha completado el primer laboratorio.

**Asunto:** Tu primera idea musical te espera

Hola, {{first_name}},

Tu espacio de creación sigue disponible. No necesitas empezar con una producción compleja: comienza con una idea breve y desarrolla el sonido paso a paso.

**CTA:** Abrir Studio

PLAY & GO  
Aprende. Crea. Analiza. Evoluciona.

### 4. Activación — día 7, solo si continúa sin activar

**Evento de supresión:** no hay generación, análisis ni laboratorio completado.

**Asunto:** Descubre cómo suena tu música por dentro

Hola, {{first_name}},

AudioCore reúne herramientas y contratos de análisis de audio para ayudarte a entender mejor lo que escuchas. También puedes comenzar por los fundamentos de producción musical.

**CTA principal:** Explorar AudioCore

PLAY & GO  
Aprende. Crea. Analiza. Evoluciona.

### 5. Reactivación — día 14, solo si no hay actividad reciente

**Evento de elegibilidad:** sin actividad significativa durante los últimos siete días, con consentimiento válido cuando el correo sea marketing.

**Asunto:** Tu próxima idea musical puede comenzar hoy

Hola, {{first_name}},

Puedes volver a tu proceso creativo cuando quieras. Abre Studio para comenzar una idea o retoma tu ruta de aprendizaje en Academy.

**CTA principal:** Abrir Studio

PLAY & GO  
Aprende. Crea. Analiza. Evoluciona.

## Reglas operativas del email

- Un mensaje, un objetivo y un CTA principal.
- Separar confirmación de cuenta y mensajes de marketing.
- No enviar recordatorios si ya se produjo el evento objetivo.
- Mantener al menos tres días entre mensajes de activación.
- Aplicar consentimiento, baja, supresión por rebotes y límites de frecuencia.
- Registrar `delivered`, `clicked`, `activated` y `converted`; no usar aperturas como única señal de éxito.
- Evitar enlaces con información personal o tokens fuera de los mecanismos seguros de autenticación.
- En producción, usar dominio verificado, SPF, DKIM y DMARC; mantener credenciales solo en variables de entorno.

## Métricas a instrumentar

- Tiempo desde registro hasta primera acción de valor.
- Onboarding iniciado/completado.
- Primera generación, primera escucha, primer análisis y primer laboratorio.
- Proyecto guardado.
- Conversión por CTA y activación por cohorte.
- Bajas, rebotes, quejas de spam y conversión de plan.

## Pricing: regla de integridad comercial

La interfaz de cobro existente usa `lib/products.ts` como fuente de verdad para precio, modalidad y límites. No introducir precios ni cuotas Starter/Core/Pro hasta mapearlos explícitamente al catálogo, a los permisos del backend y a los productos/precios de Stripe. El copy no puede prometer generaciones, duración, almacenamiento, certificaciones ni funciones que no estén respaldadas por entitlement y pruebas reales.

## Estado técnico

- [x] CTA principal del Hero dirigido a `/onboarding`.
- [x] Ruta de onboarding con selección de objetivo, nivel, objetivo de aprendizaje y primera experiencia.
- [x] Navegación principal alineada con los seis pilares.
- [x] Alias de rutas en inglés para mantener URLs de producto coherentes.
- [x] Documento maestro de video y ciclo de email.
- [ ] Integración de Resend/SMTP y plantilla de confirmación en el proyecto Supabase real.
- [ ] Eventos de activación persistentes y workflow de supresión.
- [ ] Prueba de envío, rebote, baja y reintento en staging.
- [ ] Revisión legal de consentimiento y privacidad antes de marketing en producción.
