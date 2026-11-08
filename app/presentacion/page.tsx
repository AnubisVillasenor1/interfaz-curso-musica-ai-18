import { redirect } from 'next/navigation'

/**
 * Entrada directa a la presentación cinematográfica.
 * El query param fuerza la intro aunque ya se haya visto en este navegador;
 * al finalizar, IntroGate la cierra y deja visible el dashboard real.
 */
export default function PresentacionPage() {
  redirect('/?intro=on')
}
