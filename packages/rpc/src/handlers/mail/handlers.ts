/** # Legacy mail RPC adapter */
import { Effect, Layer, Schema } from "effect"
import { sql } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { ServerConfig } from "@urm/env/server"
import { MailRpcs } from "@urm/contracts/mail"
import {
    AuthorizationError,
    DatabaseError,
    ValidationError,
} from "@urm/domain/errors"
import { EmailSubscription } from "@urm/domain/schemas/email"
import { EmailTransport } from "@urm/email"
import {
    EmailSql,
    EmailPrincipal,
    requireEmailAccess,
    sendNewsletter,
} from "@urm/email/postgres"
import {
    ActiveDomainRequestContext,
    AuthenticatedRequestContext,
} from "@urm/contracts/auth-legacy"
import { MailRpcHandlersTag } from "./tag.ts"

const principal = Effect.gen(function* () {
    const authenticated = yield* AuthenticatedRequestContext
    if (authenticated.account_id === undefined)
        return yield* new AuthorizationError({
            message:
                "Account-based authentication is required for PostgreSQL mail",
        })
    return { account_id: authenticated.account_id }
})

const mail_error = (error: unknown) =>
    error instanceof AuthorizationError || error instanceof ValidationError
        ? error
        : new DatabaseError({ message: "Mail operation failed" })

const MailRpcHandlersLive = Effect.gen(function* () {
    const db = yield* EmailSql
    const transport = yield* EmailTransport
    const config = yield* ServerConfig
    return MailRpcs.of({
        "mail.newsletter.send": ({ data }) =>
            Effect.gen(function* () {
                const actor = yield* principal
                const domain = yield* ActiveDomainRequestContext
                const send = yield* sendNewsletter(
                    {
                        ...data,
                        domain_id: domain.domainId,
                        audience: "subscribers",
                        list_key: data.list_key?.trim() || "newsletter",
                    },
                    config.appUrl
                ).pipe(
                    Effect.provideService(EmailPrincipal, actor),
                    Effect.provideService(EmailSql, db),
                    Effect.provideService(EmailTransport, transport),
                    Effect.catchTag("NewsletterDispatchError", (error) =>
                        Effect.fail(
                            new ValidationError({ message: error.message })
                        )
                    )
                )
                return {
                    newsletter_send_id: send.id,
                    approved_contact_count: send.approved_contact_count,
                    queued_count: send.queued_count,
                    sent_count: send.sent_count,
                    failed_count: send.failed_count,
                    skipped_count: send.skipped_count,
                }
            }).pipe(Effect.mapError(mail_error)),
        "mail.subscriptions.list": ({ data }) =>
            Effect.gen(function* () {
                const actor = yield* principal
                const domain = yield* ActiveDomainRequestContext
                yield* requireEmailAccess(domain.domainId).pipe(
                    Effect.provideService(EmailSql, db),
                    Effect.provideService(EmailPrincipal, actor)
                )
                const rows =
                    yield* db.query(sql`SELECT c.id AS contact_id, c.name, e.email, s.list_key, s.status,
                s.source, s.subscribed_at::double precision AS subscribed_at, s.unsubscribed_at::double precision AS unsubscribed_at
                FROM email_subscriptions s JOIN contacts c ON c.id = s.contact_id AND c.deleted_at IS NULL
                JOIN domain_contacts dc ON dc.contact_id = c.id AND dc.domain_id = s.domain_id AND dc.deleted_at IS NULL AND dc.status = 'active'
                JOIN LATERAL (SELECT email FROM contact_email_addresses WHERE contact_id = c.id ORDER BY is_primary DESC, updated_at DESC, id LIMIT 1) e ON true
                WHERE s.domain_id = ${domain.domainId} AND s.list_key = ${data.list_key?.trim() || "newsletter"} ORDER BY s.updated_at DESC, s.id LIMIT 200`)
                return yield* Schema.decodeUnknownEffect(
                    Schema.Array(EmailSubscription)
                )(
                    rows.map((row) =>
                        Object.fromEntries(
                            Object.entries(row).filter(
                                ([, value]) => value !== null
                            )
                        )
                    )
                )
            }).pipe(
                Effect.mapError((error) =>
                    error instanceof AuthorizationError
                        ? error
                        : new DatabaseError({
                              message: "Mail operation failed",
                          })
                )
            ),
        "mail.subscriptions.set": ({ data }) =>
            Effect.gen(function* () {
                const actor = yield* principal
                const domain = yield* ActiveDomainRequestContext
                yield* requireEmailAccess(domain.domainId).pipe(
                    Effect.provideService(EmailSql, db),
                    Effect.provideService(EmailPrincipal, actor)
                )
                const now = Date.now()
                const rows =
                    yield* db.query(sql`INSERT INTO email_subscriptions (id, domain_id, contact_id, list_key, status, source, created_at, updated_at, subscribed_at, unsubscribed_at)
                SELECT ${randomUUID()}, ${domain.domainId}, c.id, ${data.list_key.trim()}, ${data.status}::email_subscription_status, 'admin', ${now}, ${now},
                ${data.status === "subscribed" ? now : null}, ${data.status === "unsubscribed" ? now : null}
                FROM contacts c JOIN domain_contacts dc ON dc.contact_id = c.id AND dc.domain_id = ${domain.domainId}
                WHERE c.id = ${data.contact_id} AND c.deleted_at IS NULL AND dc.deleted_at IS NULL AND dc.status = 'active'
                ON CONFLICT (domain_id, contact_id, list_key) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at,
                subscribed_at = COALESCE(excluded.subscribed_at, email_subscriptions.subscribed_at),
                unsubscribed_at = COALESCE(excluded.unsubscribed_at, email_subscriptions.unsubscribed_at)
                WHERE email_subscriptions.status <> 'suppressed'
                RETURNING contact_id`)
                if (rows.length === 0)
                    return yield* new ValidationError({
                        message:
                            "Contact is unavailable or the subscription is suppressed",
                    })
                const subscriptions =
                    yield* db.query(sql`SELECT c.id AS contact_id, c.name, e.email, s.list_key, s.status,
                s.source, s.subscribed_at::float8 AS subscribed_at, s.unsubscribed_at::float8 AS unsubscribed_at
                FROM email_subscriptions s JOIN contacts c ON c.id = s.contact_id
                JOIN LATERAL (SELECT email FROM contact_email_addresses WHERE contact_id = c.id ORDER BY is_primary DESC, updated_at DESC, id LIMIT 1) e ON true
                WHERE s.domain_id = ${domain.domainId} AND s.contact_id = ${data.contact_id} AND s.list_key = ${data.list_key.trim()}`)
                return yield* Schema.decodeUnknownEffect(EmailSubscription)(
                    Object.fromEntries(
                        Object.entries(subscriptions[0] ?? {}).filter(
                            ([, value]) => value !== null
                        )
                    )
                )
            }).pipe(Effect.mapError(mail_error)),
    })
})

export const MailRpcHandlersTagLive = Layer.effect(
    MailRpcHandlersTag,
    MailRpcHandlersLive
)
export const MailRpcLive = MailRpcs.toLayer(MailRpcHandlersLive)
