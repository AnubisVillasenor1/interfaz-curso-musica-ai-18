import { redirect } from 'next/navigation'

/**
 * Alias de registro.
 *
 * La pantalla real es `/auth?mode=signup`. Buena parte de la confusión venía de
 * que no existía ninguna URL que se llamara «registro»: quien la escribía a
 * mano recibía un 404. Este alias no duplica el formulario, sólo lleva a él.
 */
export default function RegistroPage() {
  redirect('/auth?mode=signup')
}
