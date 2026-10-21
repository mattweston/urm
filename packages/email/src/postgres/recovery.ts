/** # Recovery of interrupted email delivery records */
import { Effect, Schema } from "effect"
import { sql } from "drizzle-orm"
import { EmailSql, rows } from "./sql.ts"

const recovered_row = Schema.Struct({ id: Schema.String })

/**
 * Grace period before {@link recoverStaleEmailDeliveries} classifies an outcome.
 * Another server process may still have a slow provider request in flight, so
 * recovery waits well beyond the normal send window.
 */
export const EMAIL_DELIVERY_RECOVERY_AGE_MS = 24 * 60 * 60 * 1_000

/**
 * Reconciles interrupted deliveries and newsletter totals without sending mail.
 * A provider may have accepted a message before its response was lost; retrying
 * a claimed delivery could therefore send a duplicate. Stale pending claims are
 * recorded as OutcomeUnknown, which expresses uncertainty rather than confirmed
 * provider rejection.
 *
 * Explicitly unattempted rows remain available to the dispatch worker, and their
 * parent sends remain open. Other stale sends are reconciled atomically from
 * their delivery ledger. Later correlated provider events can resolve unknown
 * outcomes without submitting the message again.
 */
export const recoverStaleEmailDeliveries = Effect.fn(
    "EmailDelivery.recoverStale"
)(function* (now = Date.now()) {
    const db = yield* EmailSql
    const cutoff = now - EMAIL_DELIVERY_RECOVERY_AGE_MS

    return yield* db.transaction(
        Effect.gen(function* () {
            const deliveries = yield* rows(
                recovered_row,
                sql`UPDATE email_deliveries SET
                    status='failed', provider_status='unknown',
                    error_class='OutcomeUnknown',
                    error_message='Send interrupted; provider outcome unknown. Do not retry automatically.',
                    failed_at=${now}, updated_at=${now}
                    WHERE status='pending' AND updated_at < ${cutoff}
                        AND provider_status IS DISTINCT FROM 'unattempted'
                    RETURNING id`
            )
            const sends = yield* rows(
                recovered_row,
                sql`UPDATE email_newsletter_sends n SET
                    accepted_count=c.accepted,
                    queued_count=c.queued,
                    sent_count=c.sent,
                    failed_count=c.failed + greatest(n.approved_contact_count - c.total, 0),
                    skipped_count=c.skipped,
                    status=CASE WHEN c.failed > 0 OR c.total < n.approved_contact_count
                        THEN 'failed'::email_send_status ELSE 'completed'::email_send_status END,
                    error_message=CASE WHEN c.failed > 0 OR c.total < n.approved_contact_count
                        THEN 'Send interrupted; review delivery outcomes. Do not retry automatically.'
                        ELSE NULL END,
                    updated_at=${now}, completed_at=${now}
                    FROM (
                        SELECT n2.id,
                            count(d.id)::integer AS total,
                            count(d.id) FILTER (WHERE d.status IN ('accepted', 'queued', 'sent', 'delivered'))::integer AS accepted,
                            count(d.id) FILTER (WHERE d.status = 'queued')::integer AS queued,
                            count(d.id) FILTER (WHERE d.status IN ('sent', 'delivered'))::integer AS sent,
                            count(d.id) FILTER (WHERE d.status IN ('pending', 'failed', 'bounced', 'complained'))::integer AS failed,
                            count(d.id) FILTER (WHERE d.status = 'skipped')::integer AS skipped
                        FROM email_newsletter_sends n2
                        LEFT JOIN email_deliveries d ON d.newsletter_send_id=n2.id
                        WHERE n2.status='sending' AND n2.updated_at < ${cutoff}
                        GROUP BY n2.id
                    ) c
                    WHERE n.id=c.id AND n.status='sending' AND n.updated_at < ${cutoff}
                        AND NOT EXISTS (SELECT 1 FROM email_deliveries waiting
                            WHERE waiting.newsletter_send_id=n.id
                                AND waiting.status='pending'
                                AND waiting.provider_status='unattempted')
                    RETURNING n.id`
            )
            return { deliveries: deliveries.length, sends: sends.length }
        })
    )
})
