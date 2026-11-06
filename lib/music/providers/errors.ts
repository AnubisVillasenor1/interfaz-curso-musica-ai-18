/**
 * Distingue "proveedor no configurado" (503, reembolsa cupo, ofrece el motor
 * local) de "proveedor caído" (502). Sin esta distinción, un despliegue sin
 * claves parecía una caída del proveedor y viceversa.
 */
export class ProviderNotConfiguredError extends Error {
  readonly code = 'not_configured'
  constructor(message: string) {
    super(message)
    this.name = 'ProviderNotConfiguredError'
  }
}

export function isNotConfigured(error: unknown): boolean {
  return error instanceof ProviderNotConfiguredError
}
