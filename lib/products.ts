/**
 * Catálogo de productos.
 *
 * Existían dos constantes sueltas y tres verdades distintas del precio: la
 * landing decía $490, el chat decía $500 y la pasarela cobraba 50000 centavos.
 * Aquí el número vive una sola vez y la UI lo formatea desde el mismo objeto
 * que usa `/api/checkout`, así que ninguna pantalla puede anunciar un precio
 * que ningún pago pueda cumplir.
 *
 * `mode` es lo que decide si Stripe cobra una vez o cada mes. El dueño pidió
 * explícitamente un servicio de pago para seguir usando la plataforma: eso es
 * `subscription`, y antes no existía en ningún sitio.
 */

export type ProductId = 'play-and-go-course' | 'play-and-go-extension' | 'play-and-go-pro'

export interface Product {
  id: ProductId
  name: string
  description: string
  /** Centavos MXN. Nunca unidades: Stripe cobra en la unidad menor. */
  priceInCents: number
  mode: 'payment' | 'subscription'
  /** Solo en suscripción. */
  interval?: 'month' | 'year'
  /**
   * Price ID creado en el Dashboard de Stripe. Si está definido se usa ese y
   * el precio deja de estar hardcodeado en el código; si falta, la ruta monta
   * `price_data` inline. Los descuentos y las subidas de precio se gestionan
   * entonces en Stripe, no en un deploy.
   */
  stripePriceId?: string
  /** Lo que el webhook concede al confirmar el pago. */
  grant: {
    plan: 'enrolled' | 'extension' | 'pro'
    /** Cupo diario de composiciones con el proveedor de pago. */
    dailyLimit: number
    /** Cupo diario del motor local, que no cuesta dinero. */
    localDailyLimit: number
    /** Días de validez del acceso desde la entrega; null = mientras la suscripción aguante. */
    accessDays: number | null
  }
  /**
   * Lo que la tabla de precios anuncia como detalle.
   *
   * Es sólo texto: `/api/checkout` y el webhook miran `priceInCents`, `mode` y
   * `grant`, nunca `features`. Vive aquí y no en el componente por la misma
   * razón que el precio: si la lista de bondades estuviera en la UI, alguien
   * podría prometer en pantalla algo que la entrega no concede. Cada línea está
   * escrita contra `lib/fulfilment.ts` y `read_entitlement()`.
   */
  features: readonly string[]
}

export const PRODUCTS: Record<ProductId, Product> = {
  'play-and-go-course': {
    id: 'play-and-go-course',
    name: 'Play and Go — Música con IA Pro',
    description: 'Curso completo: 5 módulos, 16 sesiones, biblioteca de prompts, ejercicios, audio e insignias.',
    priceInCents: 50000,
    mode: 'payment',
    grant: { plan: 'enrolled', dailyLimit: 2, localDailyLimit: 20, accessDays: null },
    features: [
      'Curso completo: 5 módulos y 16 sesiones prácticas',
      'Biblioteca de plantillas que abren directo en el estudio',
      'Ejercicios de escucha, audio de referencia e insignias',
      'Pagas una vez: el acceso no tiene fecha de vencimiento',
    ],
  },
  'play-and-go-extension': {
    id: 'play-and-go-extension',
    name: 'Play and Go — Extensión de canciones',
    description: 'Amplía tu cupo diario de composiciones durante tu ciclo de aprendizaje.',
    priceInCents: 22900,
    mode: 'payment',
    grant: { plan: 'extension', dailyLimit: 10, localDailyLimit: 40, accessDays: 30 },
    features: [
      'Más canciones por día, sin volver a comprar el curso',
      'Sólo suma: nunca baja un plan ni un cupo ya pagado',
      'Dura 30 días contados desde la confirmación del pago',
      'Pensado para el ciclo en que realmente compones seguido',
    ],
  },
  'play-and-go-pro': {
    id: 'play-and-go-pro',
    name: 'Play and Go — Estudio abierto (mensual)',
    description: 'Todo desbloqueado cada mes: cupo ampliado, asistente con historial ampliado y biblioteca completa.',
    priceInCents: 29900,
    mode: 'subscription',
    interval: 'month',
    grant: { plan: 'pro', dailyLimit: 20, localDailyLimit: 100, accessDays: null },
    features: [
      'El cupo diario más alto de la plataforma',
      'Incluye el curso y la biblioteca completa de prompts',
      'Se cobra cada mes hasta que canceles la suscripción',
      'Al dejar de pagar, la cuenta vuelve al plan gratuito',
    ],
  },
}

export const PRODUCT_IDS = Object.keys(PRODUCTS) as ProductId[]

/**
 * Lista blanca estricta. El webhook anterior resolvía cualquier `productId`
 * desconocido como el curso: escribir `?productId=loquesea` en una Session de
 * la extensión de $229 daba el plan de $500.
 */
export function findProduct(id: unknown): Product | null {
  if (typeof id !== 'string') return null
  const candidate = id as ProductId
  return PRODUCT_IDS.includes(candidate) ? PRODUCTS[candidate] : null
}

const priceFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
})

export function formatPrice(cents: number): string {
  return priceFormatter.format(cents / 100)
}

export function priceLabel(product: Product): string {
  const price = formatPrice(product.priceInCents)
  if (product.mode !== 'subscription') return price
  return product.interval === 'year' ? `${price}/año` : `${price}/mes`
}

/** Compatibilidad con el código que ya importaba las constantes antiguas. */
export const COURSE_PRODUCT = PRODUCTS['play-and-go-course']
export const EXTENSION_PRODUCT = PRODUCTS['play-and-go-extension']
export const PRO_PRODUCT = PRODUCTS['play-and-go-pro']

/**
 * Plan gratuito real.
 *
 * Coincide con los `default` de la tabla `entitlements` y con lo que deja
 * `deactivateSubscription`. Existe como constante porque la UI necesita
 * dibujar una columna de precios para quien no ha pagado, y si ese número
 * vive solo en la interfaz termina prometiendo un cupo que la base de datos
 * no concede.
 *
 * El motor local es generoso a propósito: no cuesta dinero, y un visitante al
 * que no se le deja hacer nada no se inscribe.
 */
export const FREE_TIER = {
  plan: 'free' as const,
  active: false,
  dailyLimit: 0,
  localDailyLimit: 10,
  /** Mismo criterio que en `Product.features`: describe lo que el sistema hace hoy. */
  features: [
    'Motor local en el navegador: 10 canciones al día sin pagar',
    'Composición con voces del proveedor: todavía no',
    'Escuchas y descargas el WAV que genera tu máquina',
    'Basta crear una cuenta: nunca pedimos tarjeta',
  ],
}
