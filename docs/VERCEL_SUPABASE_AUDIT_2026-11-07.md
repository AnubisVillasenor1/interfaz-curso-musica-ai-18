# Auditoría técnica del proyecto Vercel — Play & Go

**Fecha de corte:** 7 de noviembre de 2026 (hora local de México).  
**Proyecto auditado:** interfaz-curso-musica-ai  
**ID de Vercel:** prj_ogAIlFJ2Vs9Sll0NIT0h0YKricG4  
**Equipo:** TAMV Online Network (tamvonlinenetwork)  
**Repositorio conectado:** AnubisVillasenor1/interfaz-curso-musica-ai-18  
**Rama de producción:** main

Este informe se refiere exclusivamente al ID de proyecto Vercel indicado. No describe otros repositorios con nombres similares.

## 1. Identidad y despliegue

La API de Vercel devuelve el proyecto solicitado y su deployment de producción más reciente:

- Estado del deployment: READY.
- Deployment ID: dpl_84CrzsWqXW7QYQJw11wE114Ut1nu.
- Commit desplegado: b07c42f916c12c9e5ca1ef93a2ee30c60076a1cb.
- Repositorio vinculado: AnubisVillasenor1/interfaz-curso-musica-ai-18.
- Branch: main.
- Framework: Next.js.
- Runtime configurado: Node.js 24.x.
- Región reportada para el deployment: iad1.

El HEAD de main inspeccionado coincide con el commit del deployment. Por tanto, el historial de migraciones y el código descritos aquí proceden del repositorio que Vercel realmente construye.

La configuración de protección del proyecto informa SSO habilitado para los deployments que no son dominios personalizados. El estado READY demuestra que el build terminó; por sí solo no demuestra que cualquier visitante externo pueda acceder sin autenticación de equipo.

## 2. Variables e integración Supabase

Se contaron 27 variables de entorno en la configuración del proyecto, sin descifrar ni copiar valores secretos.

La variable pública NEXT_PUBLIC_SUPABASE_URL apunta al proyecto Supabase con referencia:

- Supabase project ref: qtfuflqujpblyklewclm.
- URL pública: https://qtfuflqujpblyklewclm.supabase.co.

Las credenciales de servidor y base de datos aparecen configuradas en Vercel. Entre ellas están la clave de servicio Supabase, credenciales Postgres, claves de Stripe, callback y variables de proveedor. La existencia de variables no prueba que las credenciales sigan vigentes ni que el esquema SQL esté aplicado.

### 2.1 Aislamiento de entornos — P0

Las variables de Supabase, Postgres, Stripe, callback y proveedores tienen objetivos que abarcan Production, Preview y Development. Esto puede hacer que una Preview escriba en la misma base de datos o active servicios reales usados por producción.

**Remediación requerida:**
1. Crear un proyecto Supabase de staging independiente.
2. Usar claves Stripe de prueba y endpoint webhook de prueba.
3. Configurar Preview y Development con credenciales exclusivas de staging.
4. Mantener las credenciales productivas solo en Production.
5. Volver a desplegar Preview después de cambiar variables NEXT_PUBLIC_*, porque se incorporan durante el build.

No ejecutar pruebas de escritura, pagos, callbacks ni generación de proveedor contra Production desde una Preview que comparte secretos.

### 2.2 Hallazgos readable-secret — P0

La metadata de seguridad de Vercel marca 14 variables con el issue readable-secret. Sus nombres pertenecen a credenciales de proveedores, Stripe, callback, Supabase y Postgres. Los valores no se inspeccionaron ni se imprimen en este informe.

Se requiere revisar visibilidad y permisos, analizar acceso de miembros y builds, y coordinar rotación de cada credencial con el servicio emisor. No rotar únicamente la variable de Vercel: hay que mantener sincronizada la clave correspondiente en Supabase, Stripe o el proveedor que la emite y volver a desplegar.

## 3. Inventario de migraciones del repositorio conectado

En el commit desplegado b07c42f existen siete archivos SQL:

| Orden | Archivo | Alcance |
|---:|---|---|
| 1 | 20261105190000_schema.sql | Perfiles, canciones, entitlements, progreso, insignias, pagos pendientes y triggers |
| 2 | 20261105190100_rls.sql | Row Level Security y políticas por propietario |
| 3 | 20261105190200_functions.sql | Cuotas atómicas, progreso, insignias, callback, entrega de compras y RPC |
| 4 | 20261105190300_storage.sql | Bucket privado song-audio y políticas de objetos |
| 5 | 20261105190400_refund_grant.sql | Concede a usuarios autenticados la ejecución de devolución de cuota |
| 6 | 20261105190500_exam.sql | Intentos de examen y constancias |
| 7 | 20261107190000_entitlement_lifecycle.sql | Separa curso permanente, extensión temporal y suscripción Pro; marca derechos históricos ambiguos |

Las cuatro primeras constituyen el bloque inicial al que se refería la revisión del curso. El repositorio evolucionó después: el inventario actual en el commit desplegado contiene siete archivos antes de la nueva migración de hardening incluida en esta rama.

### 3.1 Estado remoto: no inferir a partir de Git

Esta auditoría pudo leer el repositorio y metadatos de Vercel, así como identificar el proyecto Supabase desde la URL configurada. No pudo consultar supabase_migrations.schema_migrations directamente en la base remota.

Por tanto, no se afirma que las siete migraciones estén aplicadas ni que estén pendientes. Ese estado solo se confirma leyendo el historial de migraciones aplicado en el proyecto Supabase qtfuflqujpblyklewclm y contrastándolo con el esquema vivo.

No ejecutar db push, SQL Editor ni reparación de historial para “probar” el estado. Primero debe obtenerse un backup y contrastarse el journal remoto.

### 3.2 Riesgo especial de la migración de derechos

La séptima migración marca filas históricas Pro y extensiones ambiguas con entitlement_reconciliation_required. Las extensiones sin vencimiento reciben una ventana provisional de 30 días. El documento docs/ENTITLEMENT_LIFECYCLE.md exige contrastar cada derecho con sesiones y suscripciones reales de Stripe antes de aplicar el cambio a producción.

La migración contiene actualización de datos y cambia la lógica de acceso y los límites de cuota. No es un DDL rutinario: primero staging, reconciliación, pruebas y aprobación; después producción.

## 4. Hallazgo de seguridad del examen y constancias

En el SQL histórico 20261105190500_exam.sql se encontraron dos problemas:

1. exam_attempts_owner era una política FOR ALL, por lo que el dueño autenticado podía insertar, actualizar y borrar sus propios intentos. Un cliente podía intentar falsificar una puntuación o alterar una evaluación previamente guardada.
2. certificates_verify_public permitía lectura de toda la tabla mediante USING (true). La ruta de verificación pública ya usa un cliente administrativo y devuelve una proyección limitada; la lectura pública directa de la tabla no era necesaria.

Además, el endpoint del examen utilizaba el cliente de sesión para insertar la constancia, aunque la política histórica de constancias solo concedía SELECT al dueño. Eso podía hacer que la emisión fallara después de guardar el intento.

La rama fix/exam-rls-certificate-hardening incorpora:
- Autenticación de sesión antes de cualquier escritura.
- Validación de identificadores de pregunta e índices de opción contra el catálogo del servidor.
- Cálculo de nota únicamente con la clave privada del servidor.
- Escritura de intentos y constancias mediante el cliente administrativo de servidor, usando el ID del usuario autenticado.
- La migración 20261108190000_exam_security_hardening.sql, que sustituye el permiso FOR ALL por SELECT del propietario, retira la lectura pública directa de la tabla de constancias y reserva las escrituras a service_role.
- El contrato automatizado scripts/verify-exam-security.mjs, integrado al workflow de CI.

La rama contendrá ocho archivos SQL versionados una vez añadida esta migración. El SQL no se considera aplicado por haber sido añadido a Git.

## 5. Orden de aplicación y verificación

Para una instalación limpia, el orden cronológico de los archivos versionados es:

1. 20261105190000_schema.sql
2. 20261105190100_rls.sql
3. 20261105190200_functions.sql
4. 20261105190300_storage.sql
5. 20261105190400_refund_grant.sql
6. 20261105190500_exam.sql
7. 20261107190000_entitlement_lifecycle.sql
8. 20261108190000_exam_security_hardening.sql

Para una instalación existente, primero se compara el historial remoto con los nombres de migración; nunca se reejecutan archivos ya registrados.

| Fase | Acción | Criterio de salida |
|---|---|---|
| A | Backup y lectura del historial remoto | Inventario aplicado exacto |
| B | Comparación de schema/RLS/RPC/storage | Diferencias documentadas |
| C | Aplicar en staging solo migraciones pendientes | No errores SQL ni drift no explicado |
| D | Pruebas RLS con dos usuarios | Aislamiento de perfiles, canciones, intentos y constancias |
| E | Revisar derechos contra Stripe | Cero filas ambiguas sin decisión revisada |
| F | Checkout, webhook y callbacks con proveedores de prueba | Idempotencia, firma y devolución de cuota verificadas |
| G | Promoción de migraciones y código a Production | Revisión humana y backup recuperable |

## 6. Evidencia pendiente

- Historial remoto supabase_migrations.schema_migrations del proyecto qtfuflqujpblyklewclm.
- Resultado del diff entre el esquema real y los ocho SQL versionados.
- Prueba de RLS con dos identidades de staging.
- Reconciliación de filas Pro/extensión contra Stripe.
- Verificación de acceso del dominio productivo desde una sesión externa.
- Revisión y remediación de los 14 readable-secret reportados por Vercel.

**Conclusión:** el proyecto Vercel existe, tiene un deployment de producción en estado READY y está conectado a AnubisVillasenor1/interfaz-curso-musica-ai-18. La presencia de variables y del deployment no equivale a una base de datos validada. La remediación debe cerrarse con evidencia del historial remoto, staging, RLS, Stripe y permisos; no con una suposición basada en archivos Git.
