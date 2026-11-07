# Play & Go — ciclo de vida de derechos

## Modelo de derechos

El acceso se calcula a partir de tres datos independientes:

- base_plan: acceso permanente al curso. Solo puede ser free o enrolled.
- extension_expires_at: vencimiento acumulable de la extensión de 30 días.
- subscription_id, subscription_status y current_period_end: suscripción Pro verificada por Stripe.

El plan efectivo y los límites se derivan de esos derechos. Orden de precedencia: Pro activa (20 generaciones de proveedor y 100 locales al día), curso permanente más extensión vigente (10 y 40), curso permanente (2 y 20), extensión temporal (10 y 40), gratuito (0 generaciones de proveedor y 10 locales). Cuando caduca una extensión o termina Pro, se recupera el derecho inferior que aún siga vigente.

## Orden de despliegue

1. Crear un respaldo de la base de datos de staging y aplicar en staging todas las migraciones anteriores en orden.
2. Aplicar 20261107190000_entitlement_lifecycle.sql en staging.
3. Revisar las filas que la migración marca para reconciliación contra las sesiones de Checkout/Payments y las suscripciones actuales en Stripe.
4. Ejecutar los casos de aceptación del apartado siguiente y las pruebas RLS con dos usuarios.
5. Aplicar la migración a producción solo después de resolver las filas ambiguas y coordinar el deployment de código que usa las nuevas columnas.

No aplicar esta migración directamente en producción como una operación ciega: la implementación antigua podía sobrescribir el plan de curso con Pro o extensión, así que algunos derechos históricos no pueden deducirse de la fila actual.

## Reconciliación histórica obligatoria

La migración marca entitlement_reconciliation_required = true en todas las filas históricas Pro y en extensiones sin access_expires_at. Esas filas no se consideran evidencia suficiente de una compra permanente.

Consulta de auditoría (no incluye secretos):

    select user_id, plan, base_plan, extension_expires_at, subscription_id,
           subscription_status, current_period_end, last_stripe_session_id,
           entitlement_reconciliation_required
      from public.entitlements
     where entitlement_reconciliation_required
     order by plan, user_id;

Para cada usuario, comprobar en Stripe el producto, el estado y el periodo de la sesión de Checkout/Subscription. Después, actualizar base_plan a enrolled solo si existe evidencia de compra del curso permanente; ajustar extension_expires_at a la vigencia real de la extensión; y recuperar subscription_id, subscription_status y current_period_end desde la suscripción actual. Una extensión sola nunca demuestra una compra permanente. Una suscripción Pro no demuestra que el usuario haya comprado el curso por separado.

No borrar la marca de revisión hasta verificar todos los derechos de esa cuenta. Al terminar una fila reconciliada:

    update public.entitlements
       set entitlement_reconciliation_required = false
     where user_id = '<UUID verificado>';

Las filas Pro antiguas que no tienen subscription_id no se consideran una suscripción vigente automáticamente. Las filas de extensión sin vencimiento reciben una ventana provisional de 30 días y requieren revisión manual para no convertir el error histórico en una extensión ilimitada.

## Pruebas de aceptación

- Curso solo: base_plan=enrolled; plan efectivo enrolled; cuota 2 proveedor / 20 local sin vencimiento.
- Extensión sola: base_plan=free; extensión de 30 días; 10 proveedor / 40 local; expiración pasa a free.
- Curso y extensión: al vencer la extensión, el curso permanece enrolled y vuelve a 2 proveedor / 20 local.
- Pro y curso: termina Pro; base_plan enrolled continúa activo y ofrece el cupo del curso.
- Pro y extensión: termina Pro; extensión vigente continúa con el cupo de extensión; al vencer, pasa a free.
- Recompra extensión: suma 30 días desde el mayor entre ahora y el vencimiento que ya exista.
- Webhook de actualización: refresca estado/period_end de la suscripción exacta.
- Webhook de eliminación atrasado: si el usuario tiene otra subscription_id, el evento anterior no modifica su acceso.
- Pago antes del registro: curso, extensión y Pro se reconcilian con el producto correcto; una suscripción pendiente sin ID/estado verificado sigue pendiente.
- Dos usuarios: ninguno puede consultar o gastar el cupo del otro.

## Límites de la evidencia

El workflow de GitHub comprueba compilación y contratos HTTP sin credenciales reales. No comprueba las tablas, RLS, ni webhooks reales. Estos casos requieren una base de datos y claves Stripe de staging, nunca credenciales compartidas con producción.
