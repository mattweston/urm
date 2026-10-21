import { createHash, randomUUID } from "node:crypto"
import { Context, Effect, Layer, Schema } from "effect"
import { sql } from "drizzle-orm"
import { EmailSql, EmailSqlLive, rows } from "./sql.ts"
import type { EmailAddress, EmailSendResult } from "../types.ts"
import { EmailDeliveryStatus } from "@urm/domain/schemas/email"

export type EmailDeliveryPurpose =
    | "newsletter"
    | "transactional"
    | "auth_email_verification"
    | "auth_password_reset"
    | "auth_password_changed"
    | "auth_email_change"
export const hashEmailValue = (value: string): string =>
    createHash("sha256").update(value).digest("hex")

export type DeliveryInput = Readonly<{
    domain_id?: string
    contact_id?: string
    newsletter_send_id?: string
    template_id: string
    purpose: EmailDeliveryPurpose
    provider: "cloudflare" | "bento"
    idempotency_key?: string
    to: EmailAddress
    subject: string
    metadata?: Readonly<Record<string, unknown>>
}>

const create = (input: DeliveryInput) =>
    Effect.gen(function* () {
        const address = (
            typeof input.to === "string" ? input.to : input.to.address
        )
            .trim()
            .toLowerCase()
        const now = Date.now()
        const result = yield* rows(
            Schema.Struct({ id: Schema.String }),
            sql`
        INSERT INTO email_deliveries
            (id, domain_id, contact_id, newsletter_send_id, template_id, purpose, provider,
             status, idempotency_key, to_hash, to_domain, subject, created_at, updated_at)
        VALUES (${randomUUID()}, ${input.domain_id ?? null}, ${input.contact_id ?? null},
            ${input.newsletter_send_id ?? null}, ${input.template_id},
            ${input.purpose === "newsletter" ? "newsletter" : "transactional"}, ${input.provider},
            'pending', ${input.idempotency_key ?? randomUUID()}, ${hashEmailValue(address)},
            ${address.split("@")[1] ?? null}, ${input.subject}, ${now}, ${now})
        ON CONFLICT (idempotency_key) DO NOTHING RETURNING id
    `
        )
        return result[0]
    })

export const completeEmailDelivery = (
    id: string,
    status: typeof EmailDeliveryStatus.Type,
    error_class: string | null = null,
    provider_message_id: string | null = null
) =>
    Effect.gen(function* () {
        const db = yield* EmailSql
        const now = Date.now()
        const accepted = ["accepted", "queued", "sent", "delivered"].includes(
            status
        )
        const provider_status =
            error_class === "OutcomeUnknown" ? "unknown" : status
        yield* db.query(sql`UPDATE email_deliveries SET status = ${status}, provider_status = ${provider_status},
        provider_message_id = ${provider_message_id},
        error_class = ${error_class}, updated_at = ${now},
        accepted_at = ${accepted ? now : null}, queued_at = ${status === "queued" ? now : null},
        sent_at = ${status === "sent" || status === "delivered" ? now : null},
        delivered_at = ${status === "delivered" ? now : null},
        failed_at = ${status === "failed" || status === "bounced" ? now : null},
        skipped_at = ${status === "skipped" ? now : null}
        WHERE id = ${id} AND status = 'pending'`)
    })

export const providerDeliveryStatus = (
    result: EmailSendResult
): typeof EmailDeliveryStatus.Type => {
    if (result.status === "skipped") return "skipped"
    if (result.permanent_bounces.length > 0) return "bounced"
    if (result.delivered.length > 0) return "delivered"
    if (result.queued.length > 0) return "queued"
    return "accepted"
}

export class DeliveryPersistence extends Context.Service<
    DeliveryPersistence,
    {
        readonly create: typeof create
        readonly complete: typeof completeEmailDelivery
    }
>()("@urm/email/DeliveryPersistence") {}

export const DeliveryPersistenceLive = Layer.succeed(DeliveryPersistence, {
    create,
    complete: completeEmailDelivery,
})
export { EmailSqlLive }
export const createEmailDelivery = (input: DeliveryInput) =>
    Effect.flatMap(DeliveryPersistence, (service) => service.create(input))
export const markEmailDeliverySent = (id: string) =>
    Effect.flatMap(DeliveryPersistence, (service) =>
        service.complete(id, "sent")
    )
export const markEmailDeliveryFailed = (id: string, error_class: string) =>
    Effect.flatMap(DeliveryPersistence, (service) =>
        service.complete(id, "failed", error_class)
    )
export const markEmailDeliverySkipped = (id: string, reason: string) =>
    Effect.flatMap(DeliveryPersistence, (service) =>
        service.complete(id, "skipped", reason)
    )
