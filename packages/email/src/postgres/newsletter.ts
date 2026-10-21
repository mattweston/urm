/** # Newsletter delivery with explicit recipient audiences */
import { randomBytes, randomUUID } from "node:crypto"
import { Context, Effect, Result, Schema } from "effect"
import { sql } from "drizzle-orm"
import { AuthorizationError } from "@urm/domain/errors"
import { Email } from "@urm/domain/schemas/contacts"
import { NewsletterLink } from "@urm/domain/mail-newsletter"
import { EmailSql, EmailPersistenceError, rows } from "./sql.ts"
import {
    completeEmailDelivery,
    hashEmailValue,
    providerDeliveryStatus,
} from "./deliveries.ts"
import { EmailTransport } from "../transport.ts"
import { newsletterBasicTemplate } from "../templates.ts"
import {
    decodeEmailNewsletterBlockContent,
    emailNewsletterBlocksPlainText,
} from "../newsletter-content.ts"

export class EmailPrincipal extends Context.Service<
    EmailPrincipal,
    { readonly account_id: string }
>()("@urm/email/EmailPrincipal") {}
export class NewsletterDispatchError extends Schema.TaggedError<NewsletterDispatchError>()(
    "NewsletterDispatchError",
    {
        reason: Schema.Literals([
            "missing_config",
            "draft_incomplete",
            "no_recipients",
            "too_many_recipients",
            "conflict",
        ]),
        message: Schema.String,
    }
) {}

const bounded = (max: number) =>
    Schema.Trimmed.check(Schema.isMinLength(1), Schema.isMaxLength(max))
/**
 * Requires an explicit audience so a preview cannot default to a subscriber send.
 * Test recipients are validated before delivery records or provider calls exist.
 */
export const NewsletterSendInput = Schema.Struct({
    domain_id: bounded(255),
    request_id: bounded(255),
    name: bounded(255),
    subject: bounded(500),
    headline: bounded(500),
    body_text: Schema.String.check(Schema.isMaxLength(100_000)),
    list_key: bounded(255),
    audience: Schema.Literals(["test", "subscribers"]),
    test_recipient: Schema.optionalKey(
        Schema.Struct({
            email: Email,
            name: Schema.String.check(Schema.isMaxLength(255)),
        })
    ),
    cta_url: Schema.optionalKey(NewsletterLink),
    cta_label: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(255))),
}).check(
    Schema.makeFilter((input) =>
        input.audience !== "test" || input.test_recipient !== undefined
            ? undefined
            : "Test sends require a test recipient"
    )
)
export type NewsletterSendInput = typeof NewsletterSendInput.Type

const Recipient = Schema.Struct({
    contact_id: Schema.String,
    subscription_id: Schema.String,
    email: Email,
    name: Schema.String,
})
const Send = Schema.Struct({
    id: Schema.String,
    approved_contact_count: Schema.Number,
    accepted_count: Schema.Number,
    queued_count: Schema.Number,
    sent_count: Schema.Number,
    failed_count: Schema.Number,
    skipped_count: Schema.Number,
    status: Schema.String,
})
const Access = Schema.Struct({ slug: Schema.String })
const Job = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    slug: Schema.String,
    subject: Schema.String,
    headline: Schema.String,
    body_text: Schema.String,
    cta_url: Schema.NullOr(Schema.String),
    cta_label: Schema.NullOr(Schema.String),
    list_key: Schema.String,
})
const JobDelivery = Schema.Struct({
    id: Schema.String,
    contact_id: Schema.String,
    to_hash: Schema.String,
})

export const requireEmailAccess = (domain_id: string) =>
    Effect.gen(function* () {
        const principal = yield* EmailPrincipal
        const access = yield* rows(
            Access,
            sql`
        SELECT d.slug FROM domains d JOIN organizations o ON o.id = d.organization_id
        JOIN users u ON u.id = ${principal.account_id} AND u.deleted_at IS NULL
        LEFT JOIN organization_members m ON m.organization_id = o.id AND m.user_id = u.id
            AND m.status = 'active' AND m.deleted_at IS NULL
        WHERE d.id = ${domain_id} AND o.deleted_at IS NULL
            AND (d.enabled_modules IS NULL OR 'Mail' = ANY(d.enabled_modules))
            AND (u.platform_role = 'platform_sysadmin' OR m.id IS NOT NULL)
        LIMIT 1
    `
        )
        if (access[0] === undefined)
            return yield* new AuthorizationError({
                message: "Mail access is not permitted",
            })
        return access[0]
    })

export const dispatchNewsletterSend = Effect.fn("EmailNewsletter.dispatch")(
    function* (send_id: string, unsubscribe_origin: string) {
        const db = yield* EmailSql
        const transport = yield* EmailTransport
        const jobs = yield* rows(
            Job,
            sql`SELECT n.id, n.domain_id, d.slug, n.subject, n.headline,
                n.body_text, n.cta_url, n.cta_label, n.list_key
                FROM email_newsletter_sends n JOIN domains d ON d.id=n.domain_id
                WHERE n.id=${send_id} AND n.status='sending'
                    AND n.headline IS NOT NULL AND n.body_text IS NOT NULL`
        )
        const job = jobs[0]
        if (job === undefined) {
            const existing = yield* rows(
                Send,
                sql`SELECT * FROM email_newsletter_sends WHERE id=${send_id}`
            )
            if (existing[0] !== undefined) return existing[0]
            return yield* new EmailPersistenceError({
                operation: "load_newsletter_job",
            })
        }
        const content = decodeEmailNewsletterBlockContent(job.body_text)
        const plain_text = emailNewsletterBlocksPlainText(content)
        const unsubscribe_base = new URL(
            "/mail/unsubscribe",
            unsubscribe_origin
        )
        const deliveries = yield* rows(
            JobDelivery,
            sql`SELECT id, contact_id, to_hash FROM email_deliveries
                WHERE newsletter_send_id=${send_id} AND status='pending'
                    AND provider_status='unattempted'
                ORDER BY created_at, id`
        )
        yield* Effect.forEach(
            deliveries,
            (delivery) =>
                Effect.gen(function* () {
                    const claimed = yield* db.transaction(
                        Effect.gen(function* () {
                            const tx = yield* EmailSql
                            const waiting = yield* rows(
                                JobDelivery,
                                sql`SELECT id, contact_id, to_hash FROM email_deliveries
                                    WHERE id=${delivery.id} AND status='pending'
                                        AND provider_status='unattempted' FOR UPDATE`
                            )
                            if (waiting[0] === undefined) return null
                            const recipients = yield* rows(
                                Recipient,
                                sql`SELECT c.id AS contact_id, s.id AS subscription_id,
                                    e.email, c.name FROM email_subscriptions s
                                    JOIN contacts c ON c.id=s.contact_id AND c.deleted_at IS NULL
                                    JOIN domain_contacts dc ON dc.contact_id=c.id
                                        AND dc.domain_id=s.domain_id AND dc.status='active'
                                        AND dc.deleted_at IS NULL
                                    JOIN LATERAL (SELECT email FROM contact_email_addresses
                                        WHERE contact_id=c.id ORDER BY is_primary DESC,
                                        updated_at DESC, id LIMIT 1) e ON true
                                    WHERE s.domain_id=${job.domain_id}
                                        AND s.contact_id=${delivery.contact_id}
                                        AND s.list_key=${job.list_key}
                                        AND s.status='subscribed' FOR UPDATE OF s`
                            )
                            const recipient = recipients[0]
                            const now = Date.now()
                            if (
                                recipient === undefined ||
                                hashEmailValue(recipient.email) !==
                                    delivery.to_hash
                            ) {
                                yield* tx.query(sql`UPDATE email_deliveries SET
                                    status='skipped', provider_status='skipped',
                                    error_class='SubscriptionInactive', skipped_at=${now},
                                    updated_at=${now} WHERE id=${delivery.id}`)
                                yield* tx.query(sql`UPDATE email_newsletter_sends SET
                                    updated_at=${now} WHERE id=${send_id}`)
                                return null
                            }
                            const token = randomBytes(32).toString("hex")
                            yield* tx.query(sql`INSERT INTO email_unsubscribe_tokens
                                (id, domain_id, contact_id, subscription_id, list_key,
                                token_hash, created_at)
                                VALUES (${randomUUID()}, ${job.domain_id},
                                ${recipient.contact_id}, ${recipient.subscription_id},
                                ${job.list_key}, ${hashEmailValue(token)}, ${now})`)
                            yield* tx.query(sql`UPDATE email_deliveries SET
                                provider_status='submitting', updated_at=${now}
                                WHERE id=${delivery.id}`)
                            yield* tx.query(sql`UPDATE email_newsletter_sends SET
                                updated_at=${now} WHERE id=${send_id}`)
                            return { recipient, token }
                        })
                    )
                    if (claimed === null) return
                    const unsubscribe_url = new URL(unsubscribe_base)
                    unsubscribe_url.searchParams.set("token", claimed.token)
                    const email = newsletterBasicTemplate.render({
                        to: {
                            address: claimed.recipient.email,
                            name: claimed.recipient.name,
                        },
                        subject: job.subject,
                        headline: job.headline,
                        body_text: plain_text,
                        block_document: content,
                        ...(job.cta_url === null
                            ? {}
                            : { cta_url: job.cta_url }),
                        ...(job.cta_label === null
                            ? {}
                            : { cta_label: job.cta_label }),
                        unsubscribe_url: unsubscribe_url.toString(),
                    })
                    const outcome = yield* Effect.result(
                        transport.send({
                            ...email,
                            from: `newsletter@newsletter.${job.slug}.urm.dev`,
                            unsubscribe_url: unsubscribe_url.toString(),
                        })
                    )
                    yield* Result.match(outcome, {
                        onFailure: () =>
                            completeEmailDelivery(
                                delivery.id,
                                "failed",
                                "OutcomeUnknown"
                            ),
                        onSuccess: (result) =>
                            completeEmailDelivery(
                                delivery.id,
                                providerDeliveryStatus(result),
                                null,
                                result.status === "sent"
                                    ? (result.message_id ?? null)
                                    : null
                            ),
                    })
                }),
            { concurrency: 1, discard: true }
        )
        const now = Date.now()
        const finished = yield* rows(
            Send,
            sql`UPDATE email_newsletter_sends n SET
                accepted_count=c.accepted, queued_count=c.queued, sent_count=c.sent,
                failed_count=c.failed, skipped_count=c.skipped,
                status=CASE WHEN c.failed > 0 THEN 'failed'::email_send_status
                    ELSE 'completed'::email_send_status END,
                error_message=CASE WHEN c.failed > 0
                    THEN 'One or more deliveries failed or have an uncertain outcome'
                    ELSE NULL END,
                updated_at=${now}, completed_at=${now}
                FROM (SELECT count(*) FILTER (WHERE status IN
                    ('accepted', 'queued', 'sent', 'delivered'))::integer AS accepted,
                    count(*) FILTER (WHERE status='queued')::integer AS queued,
                    count(*) FILTER (WHERE status IN ('sent', 'delivered'))::integer AS sent,
                    count(*) FILTER (WHERE status IN
                    ('failed', 'bounced', 'complained'))::integer AS failed,
                    count(*) FILTER (WHERE status='skipped')::integer AS skipped
                    FROM email_deliveries WHERE newsletter_send_id=${send_id}) c
                WHERE n.id=${send_id} AND n.status='sending'
                    AND NOT EXISTS (SELECT 1 FROM email_deliveries
                        WHERE newsletter_send_id=${send_id} AND status='pending')
                RETURNING n.*`
        )
        if (finished[0] !== undefined) return finished[0]
        const current = yield* rows(
            Send,
            sql`SELECT * FROM email_newsletter_sends WHERE id=${send_id}`
        )
        if (current[0] !== undefined) return current[0]
        return yield* new EmailPersistenceError({
            operation: "finalize_newsletter_job",
        })
    }
)

export const dispatchPendingNewsletterSends = Effect.fn(
    "EmailNewsletter.dispatchPending"
)(function* (unsubscribe_origin: string) {
    const send_ids = yield* rows(
        Schema.Struct({ id: Schema.String }),
        sql`SELECT DISTINCT n.id FROM email_newsletter_sends n
            JOIN email_deliveries d ON d.newsletter_send_id=n.id
            WHERE n.status='sending' AND d.status='pending'
                AND d.provider_status='unattempted'
            ORDER BY n.id LIMIT 25`
    )
    yield* Effect.forEach(
        send_ids,
        ({ id }) =>
            dispatchNewsletterSend(id, unsubscribe_origin).pipe(
                Effect.tapError((error) =>
                    Effect.logError("Newsletter delivery failed", error).pipe(
                        Effect.annotateLogs({ send_id: id })
                    )
                ),
                Effect.ignore
            ),
        { concurrency: 1, discard: true }
    )
    return send_ids.length
})

/**
 * Records and dispatches the audience selected by {@link NewsletterSendInput}.
 * Test sends address only the supplied recipient, without subscriber tokens, and
 * reserve their delivery before provider I/O so the subscriber worker cannot
 * pick them up. Reusing a request id must not dispatch the message again.
 */
export const sendNewsletter = (value: unknown, unsubscribe_origin: string) =>
    Effect.gen(function* () {
        const input =
            yield* Schema.decodeUnknownEffect(NewsletterSendInput)(value)
        const db = yield* EmailSql
        const content = decodeEmailNewsletterBlockContent(input.body_text)
        const plain_text = emailNewsletterBlocksPlainText(content)
        if (plain_text.trim() === "")
            return yield* new NewsletterDispatchError({
                reason: "draft_incomplete",
                message: "Newsletter body is required",
            })
        const prepared = yield* db.transaction(
            Effect.gen(function* () {
                const access = yield* requireEmailAccess(input.domain_id)
                const tx = yield* EmailSql
                yield* tx.query(
                    sql`SELECT id FROM domains WHERE id = ${input.domain_id} FOR UPDATE`
                )
                const existing = yield* rows(
                    Send,
                    sql`SELECT * FROM email_newsletter_sends WHERE domain_id = ${input.domain_id} AND idempotency_key = ${input.request_id}`
                )
                if (existing[0] !== undefined)
                    return {
                        send: existing[0],
                        queued: false,
                        slug: access.slug,
                        test_delivery_id: null,
                    }
                const stream = yield* tx.query(
                    sql`SELECT id FROM domain_email_streams WHERE domain_id = ${input.domain_id} AND kind = 'bulk' AND provider = 'cloudflare' AND status = 'verified'`
                )
                if (stream.length === 0)
                    return yield* new NewsletterDispatchError({
                        reason: "missing_config",
                        message:
                            "A verified Cloudflare bulk stream is required",
                    })
                const recipients =
                    input.audience === "test" &&
                    input.test_recipient !== undefined
                        ? [{ ...input.test_recipient, contact_id: null }]
                        : yield* rows(
                              Recipient,
                              sql`
            SELECT c.id AS contact_id, s.id AS subscription_id, e.email, c.name
            FROM email_subscriptions s JOIN contacts c ON c.id = s.contact_id AND c.deleted_at IS NULL
            JOIN domain_contacts dc ON dc.contact_id = c.id AND dc.domain_id = s.domain_id
                AND dc.status = 'active' AND dc.deleted_at IS NULL
            JOIN LATERAL (SELECT email FROM contact_email_addresses WHERE contact_id = c.id
                ORDER BY is_primary DESC, updated_at DESC, id LIMIT 1) e ON true
            WHERE s.domain_id = ${input.domain_id} AND s.list_key = ${input.list_key} AND s.status = 'subscribed'
            ORDER BY s.updated_at DESC, s.id LIMIT 51
        `
                          )
                if (recipients.length === 0 || recipients.length > 50)
                    return yield* new NewsletterDispatchError({
                        reason:
                            recipients.length === 0
                                ? "no_recipients"
                                : "too_many_recipients",
                        message:
                            "Newsletter requires between 1 and 50 subscribed contacts",
                    })
                const now = Date.now()
                const sends = yield* rows(
                    Send,
                    sql`INSERT INTO email_newsletter_sends
            (id, domain_id, name, template_id, subject, list_key, provider, audience, idempotency_key,
            headline, body_text, cta_url, cta_label, status, approved_contact_count, accepted_count,
            queued_count, sent_count, failed_count, skipped_count, created_at, updated_at, started_at)
            VALUES (${randomUUID()}, ${input.domain_id}, ${input.name}, 'newsletter_basic', ${input.subject},
            ${input.list_key}, 'cloudflare', ${input.audience}, ${input.request_id}, ${input.headline}, ${input.body_text},
            ${input.cta_url ?? null}, ${input.cta_label ?? null}, 'sending', ${recipients.length}, 0, 0, 0, 0, 0, ${now}, ${now}, ${now}) RETURNING *`
                )
                const send = sends[0]
                if (send === undefined)
                    return yield* new EmailPersistenceError({
                        operation: "prepare_send",
                    })
                const test_delivery_id =
                    input.audience === "test" ? randomUUID() : null
                yield* Effect.forEach(
                    recipients,
                    (recipient) =>
                        tx.query(sql`INSERT INTO email_deliveries
                            (id, domain_id, contact_id, newsletter_send_id, template_id, purpose, provider,
                            status, provider_status, is_test, to_hash, to_domain, subject, idempotency_key, created_at, updated_at)
                            VALUES (${test_delivery_id ?? randomUUID()}, ${input.domain_id}, ${recipient.contact_id}, ${send.id},
                            'newsletter_basic', 'newsletter', 'cloudflare', 'pending', ${input.audience === "test" ? "submitting" : "unattempted"}, ${input.audience === "test"},
                            ${hashEmailValue(recipient.email)}, ${recipient.email.split("@")[1] ?? null},
                            ${input.subject}, ${`${send.id}:${recipient.contact_id ?? "test"}`}, ${now}, ${now})`),
                    { concurrency: 1, discard: true }
                )
                return {
                    send,
                    queued: true,
                    slug: access.slug,
                    test_delivery_id,
                }
            })
        )
        if (!prepared.queued) return prepared.send
        // Test recipients never enter the subscriber worker or receive a real
        // unsubscribe token. Claim before I/O so retries cannot send twice.
        if (
            prepared.test_delivery_id !== null &&
            input.test_recipient !== undefined
        ) {
            const transport = yield* EmailTransport
            const email = newsletterBasicTemplate.render({
                ...input,
                to: {
                    address: input.test_recipient.email,
                    name: input.test_recipient.name,
                },
                body_text: plain_text,
                block_document: content,
            })
            const outcome = yield* Effect.result(
                transport.send({
                    ...email,
                    from: `newsletter@newsletter.${prepared.slug}.urm.dev`,
                })
            )
            const delivery_id = prepared.test_delivery_id
            yield* Result.match(outcome, {
                onFailure: () =>
                    completeEmailDelivery(
                        delivery_id,
                        "failed",
                        "OutcomeUnknown"
                    ),
                onSuccess: (result) =>
                    completeEmailDelivery(
                        delivery_id,
                        providerDeliveryStatus(result),
                        null,
                        result.status === "sent"
                            ? (result.message_id ?? null)
                            : null
                    ),
            })
        }
        return yield* dispatchNewsletterSend(
            prepared.send.id,
            unsubscribe_origin
        )
    })

export const consumeUnsubscribeToken = (token: string) =>
    Effect.gen(function* () {
        const db = yield* EmailSql
        return yield* db.transaction(
            Effect.gen(function* () {
                const tx = yield* EmailSql
                const tokens = yield* rows(
                    Schema.Struct({
                        id: Schema.String,
                        subscription_id: Schema.String,
                        contact_id: Schema.String,
                        list_key: Schema.String,
                    }),
                    sql`SELECT id, subscription_id, contact_id, list_key FROM email_unsubscribe_tokens WHERE token_hash = ${hashEmailValue(token)} FOR UPDATE`
                )
                const found = tokens[0]
                if (found === undefined) return undefined
                const now = Date.now()
                yield* tx.query(sql`UPDATE email_subscriptions SET status = 'unsubscribed', unsubscribed_at = ${now}, updated_at = ${now}
            WHERE id = ${found.subscription_id} AND status = 'subscribed'
            AND EXISTS (SELECT 1 FROM email_unsubscribe_tokens WHERE id = ${found.id} AND used_at IS NULL)`)
                yield* tx.query(
                    sql`UPDATE email_unsubscribe_tokens SET used_at = COALESCE(used_at, ${now}) WHERE id = ${found.id}`
                )
                return found
            })
        )
    })
