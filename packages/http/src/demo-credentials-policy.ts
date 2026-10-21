import type { AuditEventReasonClass } from "@urm/auth/audit-events"

export type DemoCredentialsPolicyResult =
    | Readonly<{ allowed: true }>
    | Readonly<{
          allowed: false
          reason_class: AuditEventReasonClass
      }>

// The flag is the whole decision — `NODE_ENV` is deliberately not consulted.
// Deriving the verdict from `NODE_ENV` failed open, because `NODE_ENV` itself
// defaults to "development" when unset, so a deploy that forgot to set it would
// silently accept the demo password. An unset flag fails closed.
export const demoCredentialsPolicy = (
    demoCredentialsEnabled: boolean
): DemoCredentialsPolicyResult => {
    if (demoCredentialsEnabled) {
        return { allowed: true }
    }

    return {
        allowed: false,
        reason_class: "policy_denied",
    }
}
