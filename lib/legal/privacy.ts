/**
 * Política de Privacidad de TAMV Online Network.
 *
 * Se escribe contra lo que el código hace hoy, no contra una plantilla
 * genérica: las tablas de `supabase/migrations`, los proveedores de
 * `lib/music/providers` y las claves de `localStorage` que realmente usa la
 * app. Una política que enumera terceros que no existen —o que omite los que
 * sí reciben datos— es peor que no tenerla.
 *
 * Reutiliza los tipos de bloque de `terms.ts` para que ambas páginas
 * compartan exactamente el mismo lenguaje visual.
 */

import type { LegalBlock, LegalSection } from '@/lib/legal/terms'

export const PRIVACY_VERSION = '1.1'
export const PRIVACY_EFFECTIVE_DATE = '8 de noviembre de 2026'
export const PRIVACY_RIGHTSHOLDER = 'Edwin Oswaldo Castillo Trejo'

export const PRIVACY_RESPONSIBLE = {
  name: 'TAMV Online Network',
  location: 'Calpulalpan, Tlaxcala, México',
  email: 'privacidad@tamv.org',
} as const

const DATA_TABLE: LegalBlock = {
  kind: 'table',
  head: ['Categoría', 'Datos concretos', 'Origen'],
  rows: [
    [
      'Cuenta',
      'Correo electrónico, contraseña almacenada como hash por Supabase Auth, nombre visible y rol (usuario o administrador)',
      'La persona al registrarse en /auth',
    ],
    [
      'Contenido musical',
      'Título, descripción o prompt, género, BPM, letra, estilo vocal, instrumental, estado de la generación, duración y archivo WAV',
      'La persona al usar el estudio',
    ],
    [
      'Aprendizaje',
      'Lecciones completadas, insignias obtenidas, respuestas y resultado del examen, certificados emitidos (nombre, folio y fecha)',
      'La actividad dentro del curso',
    ],
    [
      'Pagos',
      'Identificador de cliente y de suscripción de Stripe, plan, cupo, fecha de renovación y estado del pago. Los datos completos de la tarjeta los recibe Stripe; TAMV nunca los almacena',
      'Stripe al completar el checkout',
    ],
    [
      'Datos técnicos',
      'Dirección IP, agente de usuario, fecha y hora de la solicitud, ruta visitada, errores y latencia',
      'Vercel y los registros del servidor al navegar',
    ],
    [
      'Preferencias del navegador',
      'Ajuste del ecualizador y aviso de introducción ya visto, guardados en localStorage. No se envían al servidor',
      'El propio navegador',
    ],
  ],
}

const VENDORS_TABLE: LegalBlock = {
  kind: 'table',
  head: ['Proveedor', 'Para qué', 'Qué recibe'],
  rows: [
    [
      'Supabase',
      'Autenticación, base de datos y almacenamiento privado del audio',
      'Correo, hash de contraseña, perfil, progreso, metadatos de las canciones y los archivos WAV',
    ],
    [
      'Stripe',
      'Procesamiento de pagos y suscripciones',
      'Correo, identificadores de pago y datos de la tarjeta que la persona introduce en su formulario',
    ],
    [
      'Vercel',
      'Alojamiento de la aplicación y registros de acceso',
      'Dirección IP, agente de usuario, ruta y marcas de tiempo de cada solicitud',
    ],
    [
      'Proveedor de música con IA',
      'Generar audio con voces cuando la persona elige esa opción (Hugging Face, fal, Replicate, SunoAPI o un endpoint propio, según la configuración vigente)',
      'El prompt, el género, el tempo y la letra. No recibe el correo ni la identidad de la cuenta',
    ],
    [
      'BazaarLink / FreeAI',
      'Asistente guía del curso y síntesis de voz',
      'El texto de la consulta que la persona escribe o el fragmento que pide leer en voz alta',
    ],
    [
      'Internet Archive y Jamendo',
      'Búsqueda de música de referencia y escuchas del curso',
      'Sólo el término de búsqueda. No reciben datos de la cuenta',
    ],
  ],
}

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'responsable',
    title: 'Responsable del tratamiento',
    blocks: [
      {
        kind: 'p',
        text: 'TAMV Online Network, con ubicación en Calpulalpan, Tlaxcala, México, es responsable del tratamiento de los datos personales que se recogen en esta plataforma.',
      },
      {
        kind: 'p',
        text: 'Para cualquier asunto relacionado con privacidad, el canal es privacidad@tamv.org. Las solicitudes de derechos también pueden presentarse por escrito en la dirección anterior.',
      },
    ],
  },
  {
    id: 'datos',
    title: 'Qué datos recopilamos',
    blocks: [
      {
        kind: 'p',
        text: 'Sólo tratamos los datos necesarios para operar la plataforma. El inventario completo es el siguiente:',
      },
      DATA_TABLE,
      {
        kind: 'p',
        text: 'No solicitamos datos personales sensibles (salud, origen étnico, creencias, orientación sexual, datos biométricos) y pedimos no introducirlos en los campos de texto libre del estudio o del asistente.',
      },
    ],
  },
  {
    id: 'finalidades',
    title: 'Para qué usamos los datos',
    blocks: [
      {
        kind: 'p',
        text: 'Los datos se usan para las siguientes finalidades:',
      },
      {
        kind: 'list',
        items: [
          'Crear y mantener la cuenta, autenticar el acceso y recuperar la sesión.',
          'Prestar el servicio contratado: curso, estudio de composición, biblioteca, examen y certificados.',
          'Controlar el cupo diario de composiciones y aplicar el plan que corresponde a cada cuenta.',
          'Procesar pagos, renovaciones, cancelaciones y reembolsos.',
          'Guardar el audio generado en el almacenamiento privado de la persona y permitir su descarga.',
          'Responder solicitudes de soporte y ejercer derechos de privacidad.',
          'Prevenir abuso, fraude y ataques, y diagnosticar fallos técnicos.',
          'Cumplir obligaciones legales, contables y fiscales.',
        ],
      },
      {
        kind: 'p',
        text: 'No usamos los datos para publicidad de terceros, no creamos perfiles comerciales y no vendemos información personal.',
      },
    ],
  },
  {
    id: 'bases-legales',
    title: 'Bases legales',
    blocks: [
      {
        kind: 'list',
        items: [
          'Ejecución de un contrato: la cuenta, el curso, el estudio, la biblioteca y los pagos no pueden existir sin estos datos.',
          'Consentimiento: el registro, la vinculación opcional de ORCID y cualquier comunicación que no sea necesaria para el servicio.',
          'Interés legítimo: seguridad, prevención de abuso y mejora técnica del servicio, sin afectar derechos fundamentales.',
          'Obligación legal: conservación de comprobantes fiscales y atención de requerimientos de autoridad competente.',
        ],
      },
    ],
  },
  {
    id: 'ia',
    title: 'Inteligencia artificial y contenido',
    blocks: [
      {
        kind: 'p',
        text: 'Los prompts, letras y descripciones que escribes se envían al proveedor de música únicamente cuando eliges la opción con voces, y al asistente cuando usas la guía. En el motor local, el arreglo se compone y se renderiza dentro de tu navegador: el audio no sale de tu equipo hasta que decides guardarlo en tu biblioteca.',
      },
      {
        kind: 'p',
        text: 'No utilizamos tus canciones, prompts ni conversaciones para entrenar modelos de inteligencia artificial. Los proveedores reciben la solicitud para producir el resultado y se rigen por sus propias políticas de retención.',
      },
      {
        kind: 'p',
        text: 'Conservamos registros técnicos de cada generación (fecha, modelo, consumo, costo, estado y latencia) para operar el cupo, facturar y auditar abusos. No incluyen el contenido completo de la canción.',
      },
    ],
  },
  {
    id: 'terceros',
    title: 'Proveedores y destinatarios',
    blocks: [
      {
        kind: 'p',
        text: 'Para funcionar, la plataforma se apoya en los siguientes encargados y proveedores. Cada uno trata los datos bajo sus propias condiciones y medidas de seguridad:',
      },
      VENDORS_TABLE,
      {
        kind: 'p',
        text: 'Algunos de estos proveedores están establecidos fuera de México, principalmente en Estados Unidos. Al usar la plataforma aceptas esa transferencia internacional, necesaria para prestar el servicio. Cuando la ley lo exige, se formaliza mediante cláusulas contractuales.',
      },
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies y almacenamiento local',
    blocks: [
      {
        kind: 'p',
        text: 'Usamos cookies estrictamente necesarias para mantener la sesión autenticada de Supabase. Sin ellas no es posible iniciar sesión ni distinguir una cuenta de otra.',
      },
      {
        kind: 'p',
        text: 'En el navegador guardamos dos preferencias que nunca se envían al servidor: el ajuste del ecualizador (`pg:ajustes`) y la marca de que ya viste la introducción. Puedes borrarlas desde la configuración de tu navegador; el sitio seguirá funcionando.',
      },
      {
        kind: 'p',
        text: 'No usamos cookies publicitarias, píxeles de redes sociales ni analítica de terceros con seguimiento entre sitios.',
      },
    ],
  },
  {
    id: 'conservacion',
    title: 'Cuánto tiempo conservamos los datos',
    blocks: [
      {
        kind: 'list',
        items: [
          'Cuenta y perfil: mientras la cuenta esté activa. Al eliminarla, se borran o anonimizan en un plazo máximo de 30 días naturales, salvo obligación legal de conservarlos.',
          'Canciones y audio: hasta que la persona las elimine o cierre su cuenta. El borrado de la cuenta elimina también los archivos del almacenamiento privado.',
          'Progreso, insignias y certificados: mientras la cuenta exista. Los certificados verificables pueden conservar folio y fecha de forma anonimizada tras la baja, para que la verificación pública siga siendo válida.',
          'Pagos y comprobantes: cinco años, conforme a las obligaciones fiscales y contables mexicanas.',
          'Registros técnicos: hasta 90 días, salvo investigación de un incidente de seguridad.',
        ],
      },
    ],
  },
  {
    id: 'seguridad',
    title: 'Seguridad',
    blocks: [
      {
        kind: 'p',
        text: 'Aplicamos medidas técnicas y organizativas razonables: contraseñas almacenadas con hash, sesiones firmadas, cifrado en tránsito, reglas de acceso por fila en la base de datos para que cada cuenta sólo vea lo suyo y un bucket privado para el audio, con URLs firmadas de duración limitada.',
      },
      {
        kind: 'p',
        text: 'Ningún sistema es infalible. Si ocurre una vulneración que afecte datos personales, la notificaremos a las personas afectadas y, cuando corresponda, a la autoridad, en los plazos que marca la ley.',
      },
      {
        kind: 'p',
        text: 'La persona también es responsable de su parte: usar una contraseña distinta y robusta, no compartir su cuenta y avisar de inmediato a soporte@tamv.org si detecta un acceso no autorizado.',
      },
    ],
  },
  {
    id: 'derechos',
    title: 'Tus derechos (ARCO y portabilidad)',
    blocks: [
      {
        kind: 'p',
        text: 'Puedes ejercer en cualquier momento los derechos de acceso, rectificación, cancelación, oposición, limitación del tratamiento y portabilidad de tus datos.',
      },
      {
        kind: 'p',
        text: 'Para ejercerlos, escribe a privacidad@tamv.org con el asunto “Derechos ARCO” e incluye:',
      },
      {
        kind: 'list',
        items: [
          'Nombre completo y correo asociado a la cuenta.',
          'El derecho que deseas ejercer y una descripción clara de tu solicitud.',
          'Cualquier documento que ayude a acreditar tu identidad o la representación legal.',
        ],
      },
      {
        kind: 'p',
        text: 'Responderemos en un plazo máximo de 20 días hábiles. Si la solicitud procede, se hará efectiva dentro de los 15 días hábiles siguientes. La cancelación de la cuenta implica el cese del tratamiento, pero no borra automáticamente los registros que la ley obliga a conservar.',
      },
      {
        kind: 'p',
        text: 'Si consideras que tu solicitud no fue atendida correctamente, puedes acudir a la autoridad mexicana en materia de protección de datos personales.',
      },
    ],
  },
  {
    id: 'menores',
    title: 'Menores de edad',
    blocks: [
      {
        kind: 'p',
        text: 'La plataforma está dirigida principalmente a personas mayores de 18 años. Las personas de 13 a 17 años sólo pueden usarla con el consentimiento válido de su madre, padre, tutor o representante legal.',
      },
      {
        kind: 'p',
        text: 'No recogemos conscientemente datos de menores de 13 años. Si detectamos una cuenta en ese supuesto, la suspenderemos y eliminaremos los datos asociados. Si eres tutor y crees que un menor creó una cuenta, escribe a privacidad@tamv.org.',
      },
    ],
  },
  {
    id: 'orcid',
    title: 'Vinculación con ORCID',
    blocks: [
      {
        kind: 'p',
        text: 'La vinculación con ORCID es opcional. Si la autorizas, recibimos tu ORCID iD y la información pública que decidas compartir. No solicitamos ni almacenamos tu contraseña de ORCID, y puedes revocar el permiso desde tu perfil o desde la propia plataforma de ORCID.',
      },
    ],
  },
  {
    id: 'cambios',
    title: 'Cambios a esta política',
    blocks: [
      {
        kind: 'p',
        text: 'Podemos actualizar esta política cuando cambien la ley, los proveedores o el funcionamiento del servicio. La versión vigente y su fecha aparecen al inicio de la página.',
      },
      {
        kind: 'p',
        text: 'Si el cambio es sustancial —por ejemplo, un nuevo proveedor que reciba datos personales— lo comunicaremos por correo electrónico o mediante un aviso visible en la plataforma con al menos 14 días naturales de anticipación, cuando sea posible.',
      },
    ],
  },
  {
    id: 'contacto',
    title: 'Contacto',
    blocks: [
      {
        kind: 'table',
        head: ['Asunto', 'Canal'],
        rows: [
          ['Privacidad y derechos ARCO', PRIVACY_RESPONSIBLE.email],
          ['Soporte técnico y cuenta', 'soporte@tamv.org'],
          ['Asuntos legales', 'legal@tamv.org'],
          ['Ubicación', PRIVACY_RESPONSIBLE.location],
        ],
      },
    ],
  },
]
