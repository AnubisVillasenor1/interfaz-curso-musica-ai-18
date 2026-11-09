import type { User } from '@supabase/supabase-js'

/** Cuenta propietaria inicial. La comparación siempre usa el email verificado por Supabase. */
export const ADMIN_EMAIL = 'tamvonlinenetwork@outlook.es'

export function isAdminUser(user: Pick<User, 'email'> | null | undefined): boolean {
  return user?.email?.trim().toLowerCase() === ADMIN_EMAIL
}
