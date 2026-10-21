/**
 * # Credentials
 *
 * Input schemas for the credentials endpoints, plus the session shape they
 * return.
 */

import { Schema } from "effect"

// Attacker-supplied: carried across a cross-domain login to say where to land.
// The length checks only prove signature and expires_at are present — the
// handler must verify the signature, or this becomes an open redirect.
export const DomainLoginIntent = Schema.Struct({
    hostname: Schema.String.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(255)
    ),
    destination: Schema.Literals(["admin", "marketing"]),
    expires_at: Schema.Number,
    signature: Schema.String.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(128)
    ),
})
export type DomainLoginIntent = Schema.Schema.Type<typeof DomainLoginIntent>

// email is bounded, not validated: a malformed address should fail in the
// handler as a domain error, not as a decode failure at the edge.
export const CredentialsLoginInput = Schema.Struct({
    email: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(255)),
    password: Schema.String.check(Schema.isMinLength(1)),
    domain_login_intent: Schema.optional(DomainLoginIntent),
})
export type CredentialsLoginInput = Schema.Schema.Type<
    typeof CredentialsLoginInput
>

export const CredentialsSignUpInput = Schema.Struct({
    name: Schema.String.check(Schema.isMinLength(2), Schema.isMaxLength(255)),
    email: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(255)),
    password: Schema.String.check(Schema.isMinLength(1)),
    domain_login_intent: Schema.optional(DomainLoginIntent),
})
export type CredentialsSignUpInput = Schema.Schema.Type<
    typeof CredentialsSignUpInput
>

export const EmailVerificationRequestInput = Schema.Struct({
    email: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(255)),
})
export type EmailVerificationRequestInput = Schema.Schema.Type<
    typeof EmailVerificationRequestInput
>

export const EmailVerificationConfirmInput = Schema.Struct({
    token: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(2048)),
})
export type EmailVerificationConfirmInput = Schema.Schema.Type<
    typeof EmailVerificationConfirmInput
>

export const EmailChangeInput = Schema.Struct({
    new_email: Schema.String.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(255)
    ),
})
export type EmailChangeInput = Schema.Schema.Type<typeof EmailChangeInput>

export const EmailChangeConfirmInput = Schema.Struct({
    token: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(2048)),
})
export type EmailChangeConfirmInput = Schema.Schema.Type<
    typeof EmailChangeConfirmInput
>

export const PasswordResetRequestInput = Schema.Struct({
    email: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(255)),
})
export type PasswordResetRequestInput = Schema.Schema.Type<
    typeof PasswordResetRequestInput
>

export const PasswordResetConfirmInput = Schema.Struct({
    token: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(2048)),
    password: Schema.String.check(Schema.isMinLength(1)),
})
export type PasswordResetConfirmInput = Schema.Schema.Type<
    typeof PasswordResetConfirmInput
>

export const PasswordChangeInput = Schema.Struct({
    current_password: Schema.String.check(Schema.isMinLength(1)),
    new_password: Schema.String.check(Schema.isMinLength(1)),
})
export type PasswordChangeInput = Schema.Schema.Type<typeof PasswordChangeInput>

export const AuthContact = Schema.Struct({
    id: Schema.String,
    email: Schema.optional(Schema.String),
    name: Schema.String,
})
export type AuthContact = Schema.Schema.Type<typeof AuthContact>

export const AuthPlatformAdmin = Schema.Struct({
    role: Schema.Literals(["sysadmin", "support", "viewer"]),
})
export type AuthPlatformAdmin = Schema.Schema.Type<typeof AuthPlatformAdmin>

export const AuthCurrentDomain = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    admin_role: Schema.optional(
        Schema.Literals(["owner", "admin", "editor", "support", "viewer"])
    ),
})
export type AuthCurrentDomain = Schema.Schema.Type<typeof AuthCurrentDomain>

// Compatibility response for the restored HTTP handlers. This contact projection
// is not an authentication account or a source of authorization.
export const AuthSession = Schema.Struct({
    authenticated: Schema.Boolean,
    contact: Schema.optional(AuthContact),
    platform_admin: Schema.optional(AuthPlatformAdmin),
    current_domain: Schema.optional(AuthCurrentDomain),
})
export type AuthSession = Schema.Schema.Type<typeof AuthSession>

export const AuthResponse = Schema.Struct({
    session: AuthSession,
})
export type AuthResponse = Schema.Schema.Type<typeof AuthResponse>

export { ContactId } from "./schemas/contacts.ts"

export const AuthAccountId = Schema.NonEmptyString.pipe(
    Schema.brand("AuthAccountId")
)
export type AuthAccountId = typeof AuthAccountId.Type

export const AuthAccount = Schema.Struct({
    id: AuthAccountId,
    contact_id: Schema.optionalKey(Schema.String),
})
export type AuthAccount = typeof AuthAccount.Type

export const AuthAccountSession = Schema.Union([
    Schema.Struct({ authenticated: Schema.Literal(false) }),
    Schema.Struct({
        authenticated: Schema.Literal(true),
        account: AuthAccount,
        contact: Schema.optionalKey(AuthContact),
    }),
])
export type AuthAccountSession = typeof AuthAccountSession.Type

export type Role =
    | "member"
    | "visitor"
    | "customer"
    | "trustee"
    | "volunteer"
    | "staff"
    | "viewer"
    | "support"
    | "editor"
    | "admin"
    | "owner"
    | "sysadmin"

export interface AuthContextType {
    contactId: string | null
    role: Role | null
    isAuthenticated: boolean
    isLoading: boolean
}

// Legacy UI ordering only. Server authorization must use scoped membership.
export const hasRoleOrHigher = (
    actual_role: Role | null,
    required_role: Role
): boolean => {
    if (actual_role === null) return false
    const levels: Record<Role, number> = {
        visitor: 1,
        customer: 1,
        member: 2,
        volunteer: 2,
        staff: 2,
        trustee: 3,
        viewer: 4,
        support: 5,
        editor: 6,
        admin: 7,
        owner: 8,
        sysadmin: 9,
    }
    return levels[actual_role] >= levels[required_role]
}

export type AuthResponseType = AuthResponse

export type AuthSessionType = AuthSession

export type AuthContactType = AuthContact

export type AuthCurrentDomainType = AuthCurrentDomain

export type AuthPlatformAdminType = AuthPlatformAdmin

export type CredentialsLoginInputType = CredentialsLoginInput

export type CredentialsSignUpInputType = CredentialsSignUpInput

export type EmailChangeInputType = EmailChangeInput

export type EmailChangeConfirmInputType = EmailChangeConfirmInput

export type EmailVerificationConfirmInputType = EmailVerificationConfirmInput

export type EmailVerificationRequestInputType = EmailVerificationRequestInput

export type PasswordChangeInputType = PasswordChangeInput

export type PasswordResetConfirmInputType = PasswordResetConfirmInput

export type PasswordResetRequestInputType = PasswordResetRequestInput
