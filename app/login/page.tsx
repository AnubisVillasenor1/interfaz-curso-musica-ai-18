import { redirect } from 'next/navigation'

/** Alias de acceso. La pantalla real vive en `/auth`. */
export default function LoginPage() {
  redirect('/auth')
}
