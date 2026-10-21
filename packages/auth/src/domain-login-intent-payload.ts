export type DomainLoginDestination = "admin" | "marketing"

export const DOMAIN_LOGIN_INTENT_TTL_MS = 60_000

export const domainLoginIntentPayload = (
    hostname: string,
    destination: DomainLoginDestination,
    expires_at: number
): string => `${hostname}\n${destination}\n${expires_at}`
