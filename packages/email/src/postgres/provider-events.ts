/** # Durable provider events and delivery reconciliation */
import { Effect, Schema } from "effect"
import { sql } from "drizzle-orm"
import { hashEmailValue } from "./deliveries.ts"
import { EmailSql, rows } from "./sql.ts"

/**
 * Normalized provider evidence consumed after the ingress checks its source.
 * The provider message id identifies the send; the recipient verifies that match.
 */
export type CloudflareDeliveryEvent = Readonly<{
    id: string
    message_id: string
    recipient: string
    type:
        | "delivered"
        | "deferred"
        | "bounced"
        | "failed"
        | "rejected"
        | "complained"
    bounce_type: string | null
    occurred_at: number
}>

const stored_event = Schema.Struct({
    id: Schema.String,
    provider_message_id: Schema.String,
    recipient_hash: Schema.String,
    event_type: Schema.Union([
        Schema.Literal("delivered"),
        Schema.Literal("deferred"),
        Schema.Literal("bounced"),
        Schema.Literal("failed"),
        Schema.Literal("rejected"),
        Schema.Literal("complained"),
    ]),
    bounce_type: Schema.NullOr(Schema.String),
    occurred_at: Schema.Union([Schema.NumberFromString, Schema.Number]),
    applied_at: Schema.NullOr(
        Schema.Union([Schema.NumberFromString, Schema.Number])
    ),
})

const matching_delivery = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.NullOr(Schema.String),
    contact_id: Schema.NullOr(Schema.String),
    newsletter_send_id: Schema.NullOr(Schema.String),
    status: Schema.String,
    error_class: Schema.NullOr(Schema.String),
    provider_event_at: Schema.NullOr(
        Schema.Union([Schema.NumberFromString, Schema.Number])
    ),
})

const event_status = (type: CloudflareDeliveryEvent["type"]) => {
    if (type === "deferred") return "queued"
    if (type === "rejected") return "failed"
    return type
}

const status_rank = (status: string) => {
    if (status === "complained") return 5
    if (status === "bounced") return 4
    if (status === "failed") return 3
    if (status === "delivered") return 2
    if (status === "queued") return 1
    return 0
}

/**
 * Applies an event only when exactly one delivery matches its provider message
 * id and recipient hash. Recipient, subject or time alone cannot identify a send.
 * Unmatched events remain pending because an event can precede the send response.
 *
 * Row locks and applied_at prevent duplicate application. Status precedence
 * prevents weaker late events from downgrading known outcomes; provider evidence
 * can replace OutcomeUnknown. Hard bounces and complaints also suppress the
 * matched contact's subscribed lists, in the same transaction.
 */
const apply_stored_event = (id: string) =>
    Effect.gen(function* () {
        const db = yield* EmailSql
        return yield* db.transaction(
            Effect.gen(function* () {
                const events = yield* rows(
                    stored_event,
                    sql`SELECT id, provider_message_id, recipient_hash, event_type,
                        bounce_type, occurred_at, applied_at
                        FROM email_provider_events WHERE id=${id} FOR UPDATE`
                )
                const event = events[0]
                if (!event || event.applied_at !== null) return false

                const deliveries = yield* rows(
                    matching_delivery,
                    sql`SELECT id, domain_id, contact_id, newsletter_send_id,
                            status, error_class, provider_event_at
                        FROM email_deliveries
                        WHERE provider='cloudflare'
                            AND provider_message_id=${event.provider_message_id}
                            AND to_hash=${event.recipient_hash}
                        FOR UPDATE`
                )
                if (deliveries.length !== 1) return false
                const delivery = deliveries[0]
                if (!delivery) return false
                const next_status = event_status(event.event_type)
                const newer =
                    delivery.provider_event_at === null ||
                    event.occurred_at >= delivery.provider_event_at
                const stronger =
                    status_rank(next_status) > status_rank(delivery.status)
                const uncertain = delivery.error_class === "OutcomeUnknown"
                const should_update =
                    uncertain ||
                    stronger ||
                    (newer &&
                        status_rank(next_status) ===
                            status_rank(delivery.status))
                const now = Date.now()
                if (should_update) {
                    yield* db.query(sql`UPDATE email_deliveries SET
                        status=${next_status}::email_delivery_status,
                        provider_status=${event.event_type}, provider_event_at=${event.occurred_at},
                        error_class=NULL, error_message=NULL, updated_at=${now},
                        queued_at=CASE WHEN ${next_status}='queued' THEN ${now} ELSE queued_at END,
                        delivered_at=CASE WHEN ${next_status}='delivered' THEN ${now} ELSE delivered_at END,
                        failed_at=CASE WHEN ${next_status} IN ('failed','bounced') THEN ${now} ELSE failed_at END
                        WHERE id=${delivery.id}`)
                    if (delivery.newsletter_send_id) {
                        yield* db.query(sql`UPDATE email_newsletter_sends n SET
                            accepted_count=c.accepted, queued_count=c.queued,
                            sent_count=c.sent, failed_count=c.failed,
                            skipped_count=c.skipped,
                            status=CASE WHEN n.status='failed'
                                AND n.error_message='Send interrupted; review delivery outcomes. Do not retry automatically.'
                                AND c.failed=0 AND c.total>=n.approved_contact_count
                                THEN 'completed'::email_send_status ELSE n.status END,
                            error_message=CASE WHEN n.status='failed'
                                AND n.error_message='Send interrupted; review delivery outcomes. Do not retry automatically.'
                                AND c.failed=0 AND c.total>=n.approved_contact_count
                                THEN NULL ELSE n.error_message END,
                            updated_at=${now}
                            FROM (SELECT
                                count(*)::integer AS total,
                                count(*) FILTER (WHERE status IN ('accepted','queued','sent','delivered'))::integer AS accepted,
                                count(*) FILTER (WHERE status='queued')::integer AS queued,
                                count(*) FILTER (WHERE status IN ('sent','delivered'))::integer AS sent,
                                count(*) FILTER (WHERE status IN ('failed','bounced','complained'))::integer AS failed,
                                count(*) FILTER (WHERE status='skipped')::integer AS skipped
                                FROM email_deliveries
                                WHERE newsletter_send_id=${delivery.newsletter_send_id}) c
                            WHERE n.id=${delivery.newsletter_send_id}`)
                    }
                }
                if (
                    delivery.domain_id &&
                    delivery.contact_id &&
                    (event.event_type === "complained" ||
                        (event.event_type === "bounced" &&
                            event.bounce_type === "hard"))
                ) {
                    yield* db.query(sql`UPDATE email_subscriptions SET
                        status='suppressed', updated_at=${now}
                        WHERE domain_id=${delivery.domain_id}
                            AND contact_id=${delivery.contact_id}
                            AND status='subscribed'`)
                }
                yield* db.query(sql`UPDATE email_provider_events
                    SET delivery_id=${delivery.id}, applied_at=${now} WHERE id=${event.id}`)
                return true
            })
        )
    })

/**
 * Persists an event once by provider event id, then attempts delivery correlation.
 * Repeated ingress is safe, including after a crash between storage and applying
 * the event. A false result leaves the event stored for later reconciliation;
 * callers must await successful persistence before acknowledging queue input.
 */
export const recordCloudflareDeliveryEvent = (event: CloudflareDeliveryEvent) =>
    Effect.gen(function* () {
        const db = yield* EmailSql
        const now = Date.now()
        yield* db.query(sql`INSERT INTO email_provider_events
            (id, provider, provider_message_id, recipient_hash, event_type,
                bounce_type, occurred_at, created_at)
            VALUES (${event.id}, 'cloudflare', ${event.message_id},
                ${hashEmailValue(event.recipient.trim().toLowerCase())}, ${event.type},
                ${event.bounce_type}, ${event.occurred_at}, ${now})
            ON CONFLICT (id) DO NOTHING`)
        return yield* apply_stored_event(event.id)
    })

/**
 * Revisits a bounded batch of stored events after their delivery ids become known.
 * This closes the event-before-response race from {@link recordCloudflareDeliveryEvent}
 * without guessing a match or resending mail.
 */
export const reconcileCloudflareDeliveryEvents = (limit = 100) =>
    Effect.gen(function* () {
        const pending = yield* rows(
            Schema.Struct({ id: Schema.String }),
            sql`SELECT e.id FROM email_provider_events e
                JOIN email_deliveries d ON d.provider='cloudflare'
                    AND d.provider_message_id=e.provider_message_id
                    AND d.to_hash=e.recipient_hash
                WHERE e.applied_at IS NULL
                GROUP BY e.id, e.created_at
                HAVING count(d.id)=1
                ORDER BY e.created_at, e.id LIMIT ${limit}`
        )
        let applied = 0
        for (const event of pending) {
            if (yield* apply_stored_event(event.id)) applied++
        }
        return applied
    })
