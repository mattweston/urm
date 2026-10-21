/**
 * # Auth Context
 *
 * Client-side session shape, populated from /api/auth/me.
 */
import type { Role } from "./permissions/roles.ts"

export interface AuthContextType {
    contactId: string | null

    role: Role | null

    isAuthenticated: boolean

    isLoading: boolean
}
