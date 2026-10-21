import { Context, Effect, Layer } from "effect"
import {
    DB,
    DatabaseOperationError,
    databaseOperationError,
    schema,
} from "@urm/database"

/**
 * Outcome of the audited action.
 */
export type AuditEventResult = "succeeded" | "failed" | "blocked"

/**
 * Machine-readable classification of why an audited action failed or was
 * blocked.
 */
export type AuditEventReasonClass =
    | "invalid_credentials"
    | "invalid_password"
    | "unknown_contact"
    | "unverified_email"
    | "expired_session"
    | "revoked_session"
    | "invalid_oauth_state"
    | "oauth_provider_error"
    | "rate_limited"
    | "policy_denied"
    | "validation_failed"
    | "internal_error"

/**
 * Free-form metadata attached to an audit event. Secret-looking keys are
 * redacted by {@link sanitizeAuditMetadata} before persistence.
 */
export type AuditEventMetadata = Readonly<Record<string, unknown>>

/**
 * A single audit event: what happened, to which entity, by whom, with
 * optional correlation ids and metadata.
 */
export type AuditEventInput = Readonly<{
    action: string
    entity_type: string
    entity_id?: string | undefined
    actor_contact_id?: string | undefined
    contact_id?: string | undefined
    domain_id?: string | undefined
    org_id?: string | undefined
    session_id?: string | undefined
    request_id?: string | undefined
    trace_id?: string | undefined
    result?: AuditEventResult | undefined
    reason_class?: AuditEventReasonClass | undefined
    metadata?: AuditEventMetadata | undefined
}>

/**
 * Shape of the audit-event persistence service: a single `write` operation.
 */
export type AuditEventPersistenceShape = {
    readonly write: (
        input: AuditEventInput
    ) => Effect.Effect<void, DatabaseOperationError>
}

/**
 * Context service tag for audit-event persistence; tests can substitute an
 * in-memory implementation.
 */
export class AuditEventPersistence extends Context.Service<
    AuditEventPersistence,
    AuditEventPersistenceShape
>()("@urm/auth/AuditEventPersistence") {}

const SECRET_METADATA_KEY_PATTERN =
    /password|token|secret|cookie|authorization|credential/i

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
    typeof value === "object" && value !== null && !Array.isArray(value)

const sanitizeMetadataValue = (key: string, value: unknown): unknown => {
    if (SECRET_METADATA_KEY_PATTERN.test(key)) {
        return "[redacted]"
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeMetadataValue(key, item))
    }

    if (isRecord(value)) {
        return sanitizeAuditMetadata(value)
    }

    return value
}

/**
 * Recursively redact metadata values whose keys look secret (password,
 * token, secret, cookie, authorization, credential).
 */
export const sanitizeAuditMetadata = (
    metadata: AuditEventMetadata
): Record<string, unknown> => {
    const sanitized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(metadata)) {
        sanitized[key] = sanitizeMetadataValue(key, value)
    }

    return sanitized
}

/**
 * Production layer writing audit events to the `audit_events` table.
 */
export const AuditEventPersistenceLive = Layer.effect(
    AuditEventPersistence,
    Effect.gen(function* () {
        const db = yield* DB

        return AuditEventPersistence.of({
            write: (input) =>
                db
                    .insert(schema.audit_events)
                    .values({
                        action: input.action,
                        entity_type: input.entity_type,
                        entity_id: input.entity_id,
                        actor_contact_id: input.actor_contact_id,
                        contact_id: input.contact_id,
                        domain_id: input.domain_id,
                        org_id: input.org_id,
                        session_id: input.session_id,
                        request_id: input.request_id,
                        trace_id: input.trace_id,
                        result: input.result ?? "succeeded",
                        reason_class: input.reason_class,
                        metadata: sanitizeAuditMetadata(input.metadata ?? {}),
                    })
                    .pipe(
                        Effect.asVoid,
                        Effect.mapError((cause) =>
                            databaseOperationError(
                                "AuditEventPersistence.write",
                                "Failed to persist audit event",
                                cause
                            )
                        )
                    ),
        })
    })
)

/**
 * Record a single audit event through the persistence service, wrapped in
 * a tracing span.
 */
export const recordAuditEvent = (input: AuditEventInput) =>
    Effect.gen(function* () {
        const persistence = yield* AuditEventPersistence
        yield* persistence.write(input)
    }).pipe(
        Effect.withSpan("auth.audit_event.write"),
        Effect.withLogSpan("auth.audit_event.write")
    )
