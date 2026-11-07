/**
 * Términos y Condiciones de TAMMV Online Network.
 *
 * El texto se guarda como datos, no como JSX: son veinte artículos que van a
 * cambiar (revisión legal, nuevos planes, nuevas funciones de IA) y reescribir
 * marcado cada vez que cambie una coma es la forma más rápida de romper la
 * página. La vista sólo decide *cómo* se pinta cada bloque.
 */

export const TERMS_VERSION = '1.0'
export const TERMS_EFFECTIVE_DATE = '1 de noviembre de 2026'

export type LegalBlock =
  | { kind: 'p'; text: string }
  | { kind: 'subheading'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'code'; text: string }
  | { kind: 'note'; text: string }

export type LegalSection = {
  id: string
  title: string
  blocks: LegalBlock[]
}

const CATEGORIES_FORUM: LegalBlock = {
  kind: 'table',
  head: ['Categoría', 'Propósito'],
  rows: [
    ['Anuncios TAMMV', 'Comunicados, convocatorias, novedades, alianzas y decisiones institucionales'],
    ['Presentaciones', 'Presentación de miembros, áreas de interés y búsqueda de colaboración'],
    ['Investigación y método', 'Diseño de investigación, metodología, estadística, ética y publicación'],
    ['Ciencia abierta y datos', 'ORCID, DOI, datos FAIR, repositorios, licencias y acceso abierto'],
    ['Inteligencia artificial', 'Modelos, datasets, ética, aplicaciones, educación y proyectos'],
    ['Innovación y emprendimiento', 'Transferencia de conocimiento, startups, financiamiento y propiedad intelectual'],
    ['Educación y formación', 'Cursos, talleres, mentoría, becas y recursos didácticos'],
    ['Salud y bienestar', 'Investigación, práctica, políticas, salud digital y bienestar comunitario'],
    ['Política, sociedad y sostenibilidad', 'Evidencia para decisiones públicas, clima, territorio y desarrollo social'],
    ['Eventos y comunidad', 'Congresos, seminarios, voluntariado, networking y capítulos regionales'],
    ['Soporte técnico', 'Ayuda con cuenta, perfil, ORCID, pagos, certificados y accesos'],
    ['Retroalimentación', 'Ideas, reportes de errores, solicitudes de funciones y encuestas'],
  ],
}

const PLANS: LegalBlock = {
  kind: 'table',
  head: ['Plan', 'Precio', 'Beneficios principales'],
  rows: [
    ['Público', 'Gratuito', 'Acceso al portal, noticias, agenda pública, resúmenes y contacto'],
    ['Miembro TAMMV', 'Gratuito', 'Perfil, foro, boletín, directorio básico y eventos gratuitos'],
    ['Miembro Verificado', 'Gratuito o cuota simbólica anual', 'ORCID vinculado, TAMMV Member ID, mayor visibilidad y grupos temáticos'],
    ['Profesional', 'MXN 199–399 mensuales o MXN 1,900–3,500 anuales', 'Cursos, mentoría, recursos premium, certificados y estadísticas de perfil'],
    ['Institucional', 'MXN 15,000–60,000 anuales', 'Cuentas para equipo, repositorio institucional, informes, convenios y accesos múltiples'],
    ['Patrocinador / Aliado', 'MXN 25,000–150,000 anuales', 'Presencia de marca, eventos, proyectos conjuntos, informes y reconocimiento'],
    ['Autor / Ponente', 'Pago por evento o publicación', 'Certificado, difusión, depósito con DOI, grabación y materiales del evento'],
  ],
}

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 'aceptacion',
    title: 'Aceptación',
    blocks: [
      {
        kind: 'p',
        text: 'Al crear una cuenta, utilizar la plataforma, participar en el foro, adquirir una membresía, inscribirse a un evento o utilizar cualquier servicio de TAMMV Online Network (“TAMMV”, “la Plataforma” o “la Red”), usted acepta estos Términos y Condiciones.',
      },
      { kind: 'p', text: 'Usted declara que:' },
      {
        kind: 'list',
        items: [
          'Tiene al menos 18 años; o',
          'Tiene entre 13 y 17 años y cuenta con el consentimiento válido de su madre, padre, tutor o representante legal.',
          'Si utiliza TAMMV en nombre de una institución, empresa, asociación, universidad, hospital u otra organización, declara contar con la autoridad para vincular a dicha organización a estos Términos.',
        ],
      },
      {
        kind: 'p',
        text: 'TAMMV podrá solicitar documentación o verificación adicional para confirmar la identidad, afiliación, edad, representación legal o elegibilidad de un usuario.',
      },
    ],
  },
  {
    id: 'servicio',
    title: 'Descripción del servicio',
    blocks: [
      {
        kind: 'p',
        text: 'TAMMV Online Network es una plataforma digital institucional orientada a la colaboración académica, científica, profesional, educativa y comunitaria.',
      },
      { kind: 'p', text: 'La Plataforma podrá incluir, según su disponibilidad:' },
      {
        kind: 'list',
        items: [
          'Portal institucional y publicaciones.',
          'Perfiles de miembros.',
          'Directorio de personas e instituciones.',
          'Foro comunitario y espacios de discusión.',
          'Repositorio de documentos, artículos, datasets, presentaciones, software y materiales.',
          'Eventos, congresos, seminarios, talleres y transmisiones.',
          'Cursos, certificaciones y recursos formativos.',
          'Herramientas de colaboración, mensajería, notificaciones y gestión de proyectos.',
          'Servicios de inteligencia artificial, cuando estén disponibles y sean autorizados.',
          'Membresías gratuitas, de pago, institucionales y de patrocinio.',
        ],
      },
      {
        kind: 'p',
        text: 'TAMMV puede modificar, suspender, limitar o retirar funcionalidades, contenidos, servicios o integraciones cuando sea necesario por razones técnicas, legales, de seguridad, de calidad o de sostenibilidad del servicio.',
      },
    ],
  },
  {
    id: 'cuenta',
    title: 'Cuenta, identidad y claves de acceso',
    blocks: [
      { kind: 'p', text: 'Cada usuario es responsable de:' },
      {
        kind: 'list',
        items: [
          'Mantener la confidencialidad de su contraseña, códigos de verificación y credenciales de acceso.',
          'No compartir su cuenta con terceros.',
          'Proporcionar información veraz, completa y actualizada.',
          'Notificar de inmediato a TAMMV cualquier acceso no autorizado, suplantación de identidad o incidente de seguridad.',
          'Cumplir con estos Términos y con las políticas aplicables de la Plataforma.',
        ],
      },
      {
        kind: 'p',
        text: 'TAMMV podrá emitir un TAMMV Member ID único para identificar la membresía, los permisos y la participación del usuario dentro de la Red.',
      },
      {
        kind: 'p',
        text: 'El TAMMV Member ID no sustituye al ORCID iD. El ORCID identifica de forma persistente a una persona investigadora a nivel internacional; el TAMMV Member ID identifica su relación, rol, membresía y accesos dentro de TAMMV Online Network.',
      },
      { kind: 'p', text: 'Ejemplo de formato:' },
      { kind: 'code', text: 'TAMMV-MX-2026-000123-R' },
      { kind: 'p', text: 'Donde:' },
      {
        kind: 'list',
        items: [
          'TAMMV: identificador de la Red.',
          'MX: país o región.',
          '2026: año de alta.',
          '000123: consecutivo único.',
          'R: tipo de rol, como investigador, estudiante, profesional, institución o colaborador.',
        ],
      },
      {
        kind: 'p',
        text: 'TAMMV podrá suspender, desactivar o eliminar un Member ID en caso de fraude, suplantación, incumplimiento de estas condiciones, uso indebido de la plataforma o requerimiento legal.',
      },
    ],
  },
  {
    id: 'orcid',
    title: 'Identidad académica y ORCID',
    blocks: [
      {
        kind: 'p',
        text: 'TAMMV podrá ofrecer la vinculación opcional de la cuenta del usuario con su perfil de ORCID.',
      },
      {
        kind: 'p',
        text: 'Al conectar su cuenta de ORCID, el usuario autoriza a TAMMV a obtener, según los permisos que acepte:',
      },
      {
        kind: 'list',
        items: [
          'Su ORCID iD autenticado.',
          'Información pública de su perfil ORCID.',
          'Afiliaciones, áreas de investigación, publicaciones, datasets y otros recursos públicos, cuando el usuario lo autorice.',
          'Permisos de actualización, únicamente si el usuario los concede expresamente y TAMMV cuenta con la integración correspondiente.',
        ],
      },
      {
        kind: 'p',
        text: 'TAMMV no solicitará ni almacenará la contraseña de ORCID del usuario. La conexión se realizará mediante el flujo de autorización de ORCID, y el usuario podrá desconectar su cuenta o revocar los permisos desde su perfil o desde ORCID.',
      },
      {
        kind: 'p',
        text: 'TAMMV podrá mostrar un distintivo de “Perfil verificado” cuando el usuario haya vinculado y autenticado correctamente su ORCID iD.',
      },
      {
        kind: 'p',
        text: 'El usuario es responsable de la exactitud de la información que proporcione y de los contenidos que publique o vincule a su perfil.',
      },
    ],
  },
  {
    id: 'uso-aceptable',
    title: 'Uso aceptable',
    blocks: [
      {
        kind: 'p',
        text: 'Al utilizar TAMMV Online Network, usted acepta no utilizar la Plataforma para:',
      },
      {
        kind: 'list',
        items: [
          'Realizar actividades ilegales, fraudulentas, engañosas, difamatorias, discriminatorias, violentas o que vulneren derechos de terceros.',
          'Publicar, compartir o distribuir contenido sexual explícito, pornográfico o no apto para menores.',
          'Generar, solicitar o difundir contenido que sexualice, explote o ponga en riesgo a menores de edad.',
          'Crear, solicitar o facilitar deepfakes, suplantación de identidad, manipulación facial, voz sintética engañosa o contenidos que representen a personas reales sin autorización.',
          'Infringir derechos de autor, marca, patente, secreto empresarial, imagen, privacidad, datos personales u otros derechos de terceros.',
          'Publicar información médica, psicológica, financiera o personal sensible propia o de terceros sin autorización válida.',
          'Suplantar a otra persona, institución, investigador, autor, ponente o miembro de TAMMV.',
          'Distribuir malware, realizar ataques de denegación de servicio, extraer datos de forma automatizada no autorizada o intentar vulnerar la seguridad de la Plataforma.',
          'Usar bots, scripts o herramientas automatizadas para manipular métricas, votos, reputación, registros, sorteos, certificados o accesos.',
          'Revender, sublicenciar o redistribuir credenciales, accesos, membresías, claves API o servicios de TAMMV sin autorización previa por escrito.',
          'Utilizar la Plataforma para entrenar, validar o mejorar modelos de inteligencia artificial con datos de terceros sin contar con los derechos, consentimientos o autorizaciones necesarios.',
          'Eludir controles de seguridad, límites de uso, sistemas de moderación o restricciones de acceso.',
        ],
      },
      {
        kind: 'p',
        text: 'TAMMV podrá aplicar filtros de seguridad, bloqueos automáticos, advertencias, límites de publicación, revisión manual, suspensión temporal o cancelación definitiva de cuentas ante contenidos o conductas que contravengan estos Términos.',
      },
    ],
  },
  {
    id: 'ia',
    title: 'Contenido generado por inteligencia artificial',
    blocks: [
      {
        kind: 'p',
        text: 'Cuando TAMMV ofrezca herramientas de inteligencia artificial, el usuario reconoce que:',
      },
      {
        kind: 'list',
        items: [
          'Los resultados pueden contener errores, imprecisiones, sesgos, información incompleta o contenido inadecuado.',
          'Los resultados generados por IA no constituyen asesoramiento médico, legal, financiero, psicológico, académico ni profesional.',
          'Debe verificar cualquier información antes de utilizarla para decisiones personales, clínicas, académicas, legales, editoriales, financieras o institucionales.',
          'Es responsable de revisar, contextualizar, citar y validar los materiales generados antes de publicarlos o utilizarlos.',
          'No debe ingresar datos personales sensibles, datos clínicos identificables, información confidencial, secretos industriales, datos de menores ni materiales de terceros sin contar con los permisos correspondientes.',
        ],
      },
      {
        kind: 'p',
        text: 'TAMMV podrá conservar registros técnicos necesarios para operación, seguridad, facturación, auditoría, prevención de abuso y cumplimiento legal, tales como fecha, identificador de solicitud, modelo utilizado, consumo, costo, estado de la solicitud y latencia.',
      },
      {
        kind: 'p',
        text: 'Cuando sea técnicamente posible, TAMMV podrá ofrecer un modo de retención de datos cero o configuraciones de privacidad reforzada para servicios de IA. La disponibilidad, alcance y condiciones de dichos modos serán informados en la documentación correspondiente.',
      },
    ],
  },
  {
    id: 'foro',
    title: 'Foro, comunidad y moderación',
    blocks: [
      {
        kind: 'p',
        text: 'El foro de TAMMV es un espacio de colaboración, aprendizaje, debate y apoyo mutuo. La participación implica aceptar las reglas de convivencia y moderación.',
      },
      { kind: 'subheading', text: 'Categorías propuestas' },
      CATEGORIES_FORUM,
      { kind: 'subheading', text: 'Reglas del foro' },
      {
        kind: 'list',
        items: [
          'Respetar la dignidad, diversidad y seguridad de todas las personas.',
          'Citar fuentes cuando se presenten afirmaciones, datos, imágenes o resultados de investigación.',
          'Declarar conflictos de interés cuando corresponda.',
          'No publicar contenido ilegal, difamatorio, discriminatorio, violento, sexualmente explícito o que incite al odio.',
          'No compartir datos personales, clínicos o confidenciales sin autorización.',
          'No publicar enlaces maliciosos, phishing, spam, publicidad no autorizada o contenido engañoso.',
          'Identificar claramente el contenido generado o asistido por IA cuando sea relevante.',
          'Distinguir entre opinión personal, experiencia profesional y posición oficial de TAMMV.',
        ],
      },
      {
        kind: 'p',
        text: 'TAMMV podrá editar, ocultar, eliminar, mover o restringir publicaciones que incumplan estas reglas. Las decisiones de moderación podrán ser revisadas por el equipo correspondiente, sin que ello implique obligación de restaurar contenido eliminado.',
      },
    ],
  },
  {
    id: 'propiedad-intelectual',
    title: 'Propiedad intelectual y licencias',
    blocks: [
      {
        kind: 'p',
        text: 'El usuario conserva la titularidad de los derechos sobre los contenidos originales que carga, publica o comparte en TAMMV, en la medida en que dichos derechos le correspondan.',
      },
      {
        kind: 'p',
        text: 'Al publicar contenido en TAMMV, el usuario otorga a la Red una licencia mundial, no exclusiva, gratuita y sublicenciable para almacenar, reproducir, distribuir, adaptar técnicamente, mostrar y promover dicho contenido dentro de la Plataforma y sus servicios.',
      },
      { kind: 'p', text: 'El usuario declara que:' },
      {
        kind: 'list',
        items: [
          'Es titular de los derechos o cuenta con autorización para publicar el material.',
          'El contenido no infringe derechos de terceros.',
          'Ha obtenido los consentimientos necesarios para utilizar imágenes, voces, datos, entrevistas, textos, fotografías, videos, datasets o materiales de investigación.',
          'Ha respetado las políticas de su institución, financiador, editorial o repositorio de origen.',
        ],
      },
      {
        kind: 'p',
        text: 'TAMMV podrá solicitar que el usuario seleccione una licencia para cada recurso publicado, tales como:',
      },
      {
        kind: 'list',
        items: [
          'CC BY: atribución.',
          'CC BY-SA: atribución y compartir igual.',
          'CC BY-NC: atribución, no comercial.',
          'CC0: dominio público, cuando sea aplicable.',
          'Licencia restrictiva: para materiales con condiciones específicas.',
        ],
      },
      {
        kind: 'p',
        text: 'TAMMV respeta los derechos de propiedad intelectual. Si considera que un contenido publicado en la Plataforma infringe sus derechos, podrá enviar una notificación a legal@tammv.org —o al correo institucional que TAMMV designe— incluyendo:',
      },
      {
        kind: 'list',
        items: [
          'Identificación de la obra protegida.',
          'Identificación del contenido presuntamente infractor.',
          'Datos de contacto del titular o representante.',
          'Declaración de buena fe sobre la falta de autorización.',
          'Declaración de que la información proporcionada es exacta.',
        ],
      },
      {
        kind: 'p',
        text: 'TAMMV podrá retirar o restringir el acceso al contenido reportado mientras realiza la revisión correspondiente.',
      },
    ],
  },
  {
    id: 'pagos',
    title: 'Membresías, suscripciones y pagos',
    blocks: [
      {
        kind: 'p',
        text: 'TAMMV podrá ofrecer membresías gratuitas, de pago, institucionales, eventuales y de patrocinio.',
      },
      { kind: 'subheading', text: 'Planes propuestos' },
      PLANS,
      {
        kind: 'p',
        text: 'Los precios, beneficios, límites de uso y condiciones de cada plan serán publicados en la página de precios de TAMMV. TAMMV podrá modificar precios, beneficios o condiciones de los planes, notificando los cambios con anticipación razonable cuando sea posible.',
      },
      {
        kind: 'p',
        text: 'Las suscripciones se renuevan automáticamente salvo cancelación previa por el usuario antes de la fecha de renovación, salvo que la ley aplicable disponga otra cosa.',
      },
      {
        kind: 'p',
        text: 'Los pagos podrán procesarse mediante pasarelas de pago autorizadas. TAMMV no almacena datos completos de tarjetas de crédito o débito, salvo la información mínima necesaria para gestionar la suscripción o cumplir obligaciones legales.',
      },
      { kind: 'subheading', text: 'Reembolsos' },
      {
        kind: 'p',
        text: 'Los reembolsos estarán sujetos a la política publicada por TAMMV y a la legislación aplicable. En general:',
      },
      {
        kind: 'list',
        items: [
          'Los servicios ya consumidos, cursos iniciados, eventos realizados, certificados emitidos o contenidos digitales entregados no son reembolsables.',
          'Podrán solicitarse reembolsos por cargos duplicados, errores técnicos confirmados o transacciones no autorizadas, dentro del plazo que establezca la política de reembolsos.',
          'Las membresías institucionales, patrocinios y convenios podrán estar sujetos a condiciones contractuales específicas.',
          'TAMMV podrá retener o suspender accesos ante saldos vencidos, fraude, contracargos indebidos o incumplimiento de estos Términos.',
        ],
      },
    ],
  },
  {
    id: 'disponibilidad',
    title: 'Disponibilidad del servicio',
    blocks: [
      {
        kind: 'p',
        text: 'TAMMV se esfuerza por mantener una plataforma disponible, segura y estable. Sin embargo, no garantiza un servicio ininterrumpido ni libre de errores.',
      },
      {
        kind: 'p',
        text: 'TAMMV podrá realizar mantenimiento programado o de emergencia, actualizar sistemas, cambiar proveedores tecnológicos o suspender temporalmente servicios por razones de seguridad, capacidad, cumplimiento legal o fallas de terceros.',
      },
      {
        kind: 'p',
        text: 'TAMMV no será responsable por pérdidas derivadas de interrupciones, demoras, pérdida de datos no respaldados por el usuario, fallas de internet, fallas de proveedores externos, ataques informáticos, desastres naturales, acciones gubernamentales u otras circunstancias fuera de su control razonable.',
      },
    ],
  },
  {
    id: 'datos',
    title: 'Protección de datos personales',
    blocks: [
      {
        kind: 'p',
        text: 'TAMMV tratará los datos personales conforme a la legislación mexicana aplicable, en particular la Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados o la normativa privada aplicable, según corresponda.',
      },
      { kind: 'p', text: 'El usuario podrá consultar la Política de Privacidad para conocer:' },
      {
        kind: 'list',
        items: [
          'Qué datos se recopilan.',
          'Finalidades del tratamiento.',
          'Bases legales y consentimientos.',
          'Destinatarios y encargados del tratamiento.',
          'Tiempos de conservación.',
          'Derechos de acceso, rectificación, cancelación, oposición, limitación y portabilidad.',
          'Procedimientos para ejercer derechos ARCO.',
          'Uso de cookies, analíticas y tecnologías de seguimiento.',
        ],
      },
      {
        kind: 'p',
        text: 'TAMMV no venderá datos personales. No utilizará contenidos enviados por los usuarios para entrenar modelos de IA sin una base legal, consentimiento expreso o autorización válida, según corresponda.',
      },
    ],
  },
  {
    id: 'menores',
    title: 'Protección de menores',
    blocks: [
      { kind: 'p', text: 'TAMMV está dirigido principalmente a personas mayores de 18 años.' },
      {
        kind: 'p',
        text: 'Las personas de 13 a 17 años podrán utilizar la Plataforma únicamente con el consentimiento válido de su madre, padre, tutor o representante legal, conforme a la legislación aplicable.',
      },
      {
        kind: 'p',
        text: 'TAMMV podrá solicitar verificación de edad o consentimiento parental. Si se detecta que un menor utiliza la Plataforma sin autorización válida, TAMMV podrá suspender o cancelar la cuenta de inmediato.',
      },
    ],
  },
  {
    id: 'responsabilidad',
    title: 'Limitación de responsabilidad',
    blocks: [
      {
        kind: 'p',
        text: 'La Plataforma se proporciona “tal cual” y “según disponibilidad”, en la máxima medida permitida por la ley.',
      },
      { kind: 'p', text: 'TAMMV no garantiza que:' },
      {
        kind: 'list',
        items: [
          'El servicio sea ininterrumpido, seguro o libre de errores.',
          'Los contenidos de terceros sean exactos, completos, actualizados o legales.',
          'Los resultados generados por IA sean precisos, adecuados o aptos para un propósito específico.',
          'El uso de la Plataforma produzca resultados académicos, profesionales, comerciales o científicos determinados.',
        ],
      },
      {
        kind: 'p',
        text: 'En la máxima medida permitida por la ley, la responsabilidad total de TAMMV frente a un usuario estará limitada al monto efectivamente pagado por dicho usuario a TAMMV durante los tres meses anteriores al evento que origine la reclamación.',
      },
      {
        kind: 'p',
        text: 'TAMMV no será responsable por daños indirectos, incidentales, especiales, consecuentes o por lucro cesante, pérdida de datos, pérdida de oportunidades, daño reputacional o costos de reemplazo, salvo que la ley aplicable disponga otra cosa.',
      },
    ],
  },
  {
    id: 'terminacion',
    title: 'Terminación y suspensión',
    blocks: [
      {
        kind: 'p',
        text: 'El usuario puede cancelar su cuenta en cualquier momento desde su perfil o solicitándolo al equipo de soporte.',
      },
      {
        kind: 'p',
        text: 'TAMMV podrá suspender o cancelar una cuenta, de forma temporal o definitiva, cuando detecte:',
      },
      {
        kind: 'list',
        items: [
          'Incumplimiento de estos Términos.',
          'Fraude, suplantación de identidad o uso indebido del Member ID.',
          'Publicación de contenido ilegal, dañino, discriminatorio o infractor.',
          'Intentos de evadir controles de seguridad.',
          'Falta de pago o contracargos indebidos.',
          'Riesgo para la seguridad, integridad o reputación de la Plataforma.',
          'Requerimiento de una autoridad competente.',
        ],
      },
      {
        kind: 'p',
        text: 'Tras la terminación, TAMMV podrá desactivar accesos, revocar credenciales y conservar o eliminar datos conforme a su Política de Privacidad, obligaciones legales y periodos de respaldo.',
      },
    ],
  },
  {
    id: 'ley',
    title: 'Ley aplicable y jurisdicción',
    blocks: [
      { kind: 'p', text: 'Estos Términos se regirán por las leyes de los Estados Unidos Mexicanos.' },
      {
        kind: 'p',
        text: 'Cualquier controversia derivada de la interpretación o ejecución de estos Términos será resuelta ante los tribunales competentes del estado de Tlaxcala, México, salvo que la legislación aplicable otorgue al consumidor un fuero distinto.',
      },
    ],
  },
  {
    id: 'cambios',
    title: 'Cambios a estos Términos',
    blocks: [
      {
        kind: 'p',
        text: 'TAMMV podrá actualizar estos Términos para reflejar cambios legales, tecnológicos, operativos o de servicios.',
      },
      {
        kind: 'p',
        text: 'Los cambios sustanciales serán comunicados por correo electrónico, aviso en la Plataforma o publicación en esta página con al menos 14 días naturales de anticipación, cuando sea posible.',
      },
      {
        kind: 'p',
        text: 'El uso continuado de TAMMV después de la entrada en vigor de los cambios implica la aceptación de la versión actualizada.',
      },
    ],
  },
  {
    id: 'contacto',
    title: 'Contacto',
    blocks: [
      {
        kind: 'table',
        head: ['Canal', 'Contacto'],
        rows: [
          ['Correo institucional', 'contacto@tammv.org'],
          ['Soporte técnico', 'soporte@tammv.org'],
          ['Asuntos legales y propiedad intelectual', 'legal@tammv.org'],
          ['Protección de datos', 'privacidad@tammv.org'],
          ['Ubicación', 'Calpulalpan, Tlaxcala, México'],
        ],
      },
    ],
  },
  {
    id: 'seguridad-contenidos',
    title: 'Política de seguridad de contenidos',
    blocks: [
      {
        kind: 'p',
        text: 'TAMMV mantiene controles técnicos, humanos y procedimentales para prevenir el uso indebido de la Plataforma.',
      },
      { kind: 'subheading', text: 'Contenido prohibido' },
      { kind: 'p', text: 'No se permite generar, publicar, almacenar, distribuir o facilitar:' },
      {
        kind: 'list',
        items: [
          'Contenido ilegal, fraudulento, violento, extremista o que incite al odio.',
          'Contenido sexual explícito, pornográfico o no apto para menores.',
          'Contenido que sexualice, explote, coaccione o ponga en riesgo a menores.',
          'Contenido que promueva violencia, autolesión, terrorismo, tráfico de personas, armas ilegales o actividades delictivas.',
          'Deepfakes, suplantación de identidad, manipulación facial o de voz sin consentimiento.',
          'Contenido que vulnere derechos de autor, marca, privacidad, imagen o datos personales.',
          'Desinformación deliberada, phishing, fraude, estafas o engaños.',
          'Contenido que evade, engañe o desactive los sistemas de moderación.',
        ],
      },
      { kind: 'subheading', text: 'Salvaguardas' },
      { kind: 'p', text: 'TAMMV podrá utilizar:' },
      {
        kind: 'list',
        items: [
          'Filtros automáticos de contenido.',
          'Clasificación de riesgo y detección de abusos.',
          'Límites de publicación y tasa de uso.',
          'Revisión manual por moderadores.',
          'Cuarentena temporal de contenidos.',
          'Advertencias, sanciones y suspensiones.',
          'Bloqueo de cuentas, direcciones IP o dispositivos.',
          'Conservación temporal de evidencias para investigación, auditoría o cumplimiento legal.',
        ],
      },
      {
        kind: 'p',
        text: 'Los contenidos que no activen mecanismos de seguridad podrán no conservarse íntegramente, salvo que sea necesario para operación, seguridad, facturación, respaldo, cumplimiento legal o investigación de incidentes.',
      },
    ],
  },
  {
    id: 'responsabilidad-usuario',
    title: 'Responsabilidad del usuario y reventa',
    blocks: [
      { kind: 'p', text: 'El usuario es responsable de:' },
      {
        kind: 'list',
        items: [
          'Decidir qué consulta, publica, comparte o solicita.',
          'Determinar el propósito y el uso de los resultados.',
          'Verificar la legalidad, exactitud y adecuación de los contenidos.',
          'Contar con los derechos, consentimientos y autorizaciones necesarias.',
          'Cumplir con las leyes de protección de datos, propiedad intelectual y derechos de terceros.',
          'No enviar información que no esté autorizado a procesar o compartir.',
        ],
      },
      {
        kind: 'p',
        text: 'La reventa, redistribución comercial, sublicenciamiento o uso de los servicios de TAMMV para beneficiar a terceros requerirá autorización previa por escrito de TAMMV.',
      },
      {
        kind: 'p',
        text: 'El usuario que redistribuya servicios de TAMMV deberá imponer a sus clientes finales condiciones no menos protectoras que estas y será responsable de sus actos como si fueran propios.',
      },
    ],
  },
  {
    id: 'reembolsos-creditos',
    title: 'Política de reembolsos y créditos',
    blocks: [
      {
        kind: 'p',
        text: 'Si TAMMV implementa créditos prepagados para servicios de IA, almacenamiento, eventos o formación, aplicarán las siguientes reglas:',
      },
      {
        kind: 'list',
        items: [
          'Los créditos serán prepagados y tendrán una vigencia de 18 meses a partir de la fecha de cada recarga.',
          'Los créditos no utilizados expirarán al término de dicho periodo.',
          'Los créditos otorgados como recompensa, beca, cortesía o compensación tendrán la misma vigencia, salvo disposición contraria.',
          'Los usuarios consumidores podrán solicitar reembolso de créditos no utilizados dentro de los primeros 7 días naturales posteriores a la compra, conforme a la legislación aplicable.',
          'Los créditos ya consumidos no serán reembolsables.',
          'Las cuentas empresariales, institucionales o de uso comercial no tendrán derecho al periodo de reflexión de consumidor, salvo que la ley aplicable disponga otra cosa.',
          'TAMMV podrá revisar solicitudes posteriores caso por caso y aplicar una comisión administrativa de hasta 30% del monto reembolsable.',
          'Los reembolsos aprobados se realizarán dentro de 15 días hábiles mediante el método de pago o cuenta bancaria designada por el solicitante.',
          'No habrá reembolso cuando el saldo pendiente sea inferior a MXN 100, salvo obligación legal en contrario.',
        ],
      },
      {
        kind: 'note',
        text: 'Nota de redacción: esta política debe adaptarse a la normativa mexicana de protección al consumidor antes de su publicación definitiva. La referencia de BazaarLink establece un periodo de revisión de siete días para consumidores individuales, exclusiones para cuentas empresariales, vigencia de créditos de 18 meses y revisión posterior caso por caso.',
      },
    ],
  },
]

export const TERMS_CONTACT = {
  institutional: 'contacto@tammv.org',
  support: 'soporte@tammv.org',
  legal: 'legal@tammv.org',
  privacy: 'privacidad@tammv.org',
  location: 'Calpulalpan, Tlaxcala, México',
} as const
