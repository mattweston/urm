import { Config, Effect, Redacted, Result, Schema } from "effect"
import {
    recordCloudflareDeliveryEvent,
    reconcileCloudflareDeliveryEvents,
} from "./postgres/provider-events.ts"

export class CloudflareEventsError extends Schema.TaggedError<CloudflareEventsError>()(
    "CloudflareEventsError",
    { operation: Schema.String }
) {}

const event_type = Schema.Union([
    Schema.Literal("cf.email.sending.message.delivered"),
    Schema.Literal("cf.email.sending.message.deferred"),
    Schema.Literal("cf.email.sending.message.bounced"),
    Schema.Literal("cf.email.sending.message.failed"),
    Schema.Literal("cf.email.sending.message.rejected"),
    Schema.Literal("cf.email.sending.message.complained"),
])
const cloudflare_event = Schema.Struct({
    type: event_type,
    source: Schema.Struct({
        type: Schema.Literal("email.sending"),
        domain: Schema.String,
    }),
    payload: Schema.Struct({
        eventId: Schema.String,
        messageId: Schema.String,
        recipient: Schema.String,
        terminal: Schema.Boolean,
        bounce: Schema.optional(Schema.Struct({ type: Schema.String })),
    }),
    metadata: Schema.Struct({
        accountId: Schema.String,
        eventSubscriptionId: Schema.String,
        eventSchemaVersion: Schema.Literal(1),
        eventTimestamp: Schema.String,
    }),
})
const queue_response = Schema.Struct({
    success: Schema.Boolean,
    result: Schema.Struct({
        messages: Schema.Array(
            Schema.Struct({
                body: Schema.String,
                lease_id: Schema.String,
                metadata: Schema.optional(
                    Schema.Record(Schema.String, Schema.String)
                ),
            })
        ),
    }),
})
const acknowledgement_response = Schema.Struct({ success: Schema.Boolean })

const request_json = (url: string, token: string, body: unknown) =>
    Effect.tryPromise({
        try: async () => {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    authorization: `Bearer ${token}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(15_000),
            })
            if (!response.ok)
                throw new CloudflareEventsError({
                    operation: `http_${response.status}`,
                })
            return response.json()
        },
        catch: () => new CloudflareEventsError({ operation: "request" }),
    })

const parse_message = (body: string, content_type: string | undefined) =>
    Effect.try({
        try: () =>
            JSON.parse(
                content_type === "json"
                    ? Buffer.from(body, "base64").toString("utf8")
                    : body
            ),
        catch: () => new CloudflareEventsError({ operation: "parse_message" }),
    })

export const pollCloudflareEmailEvents = Effect.fn(
    "CloudflareEmailEvents.poll"
)(function* () {
    const config = yield* Config.all({
        enabled: Config.boolean("CLOUDFLARE_EMAIL_EVENTS_ENABLED").pipe(
            Config.withDefault(false)
        ),
        account_id: Config.string("CLOUDFLARE_ACCOUNT_ID").pipe(
            Config.withDefault("")
        ),
        queue_id: Config.string("CLOUDFLARE_EMAIL_EVENTS_QUEUE_ID").pipe(
            Config.withDefault("")
        ),
        subscription_ids: Config.string(
            "CLOUDFLARE_EMAIL_EVENTS_SUBSCRIPTION_IDS"
        ).pipe(Config.withDefault("")),
        token: Config.redacted("CLOUDFLARE_EMAIL_EVENTS_API_TOKEN").pipe(
            Config.withDefault(Redacted.make(""))
        ),
    })
    if (!config.enabled) return 0
    const subscription_ids = config.subscription_ids
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    if (
        !config.account_id ||
        !config.queue_id ||
        subscription_ids.length === 0 ||
        !Redacted.value(config.token)
    ) {
        return yield* Effect.fail(
            new CloudflareEventsError({ operation: "config" })
        )
    }
    const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.account_id)}/queues/${encodeURIComponent(config.queue_id)}/messages`
    const token = Redacted.value(config.token)
    const pulled = yield* request_json(`${url}/pull`, token, {
        visibility_timeout_ms: 60_000,
        batch_size: 20,
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(queue_response)))
    if (!pulled.success)
        return yield* Effect.fail(
            new CloudflareEventsError({ operation: "pull" })
        )

    const acks: Array<{ lease_id: string }> = []
    const retries: Array<{ lease_id: string }> = []
    for (const message of pulled.result.messages) {
        const result = yield* Effect.result(
            Effect.gen(function* () {
                const body = yield* parse_message(
                    message.body,
                    message.metadata?.["CF-Content-Type"]
                )
                const event =
                    yield* Schema.decodeUnknownEffect(cloudflare_event)(body)
                if (
                    event.metadata.accountId !== config.account_id ||
                    !subscription_ids.includes(
                        event.metadata.eventSubscriptionId
                    )
                ) {
                    return yield* Effect.fail(
                        new CloudflareEventsError({
                            operation: "source_mismatch",
                        })
                    )
                }
                const occurred_at = Date.parse(event.metadata.eventTimestamp)
                if (
                    !Number.isFinite(occurred_at) ||
                    !event.payload.eventId ||
                    !event.payload.messageId ||
                    !event.payload.recipient.includes("@")
                ) {
                    return yield* Effect.fail(
                        new CloudflareEventsError({
                            operation: "invalid_fields",
                        })
                    )
                }
                const type = event.type.replace("cf.email.sending.message.", "")
                if (
                    type !== "delivered" &&
                    type !== "deferred" &&
                    type !== "bounced" &&
                    type !== "failed" &&
                    type !== "rejected" &&
                    type !== "complained"
                ) {
                    return yield* Effect.fail(
                        new CloudflareEventsError({ operation: "invalid_type" })
                    )
                }
                yield* recordCloudflareDeliveryEvent({
                    id: event.payload.eventId,
                    message_id: event.payload.messageId,
                    recipient: event.payload.recipient,
                    type,
                    bounce_type: event.payload.bounce?.type ?? null,
                    occurred_at,
                })
            })
        )
        if (Result.isSuccess(result)) acks.push({ lease_id: message.lease_id })
        else {
            retries.push({ lease_id: message.lease_id })
            yield* Effect.logWarning(
                "Cloudflare email event could not be processed"
            )
        }
    }
    if (acks.length || retries.length) {
        const acknowledged = yield* request_json(`${url}/ack`, token, {
            acks,
            retries,
        }).pipe(
            Effect.flatMap(Schema.decodeUnknownEffect(acknowledgement_response))
        )
        if (!acknowledged.success) {
            return yield* Effect.fail(
                new CloudflareEventsError({ operation: "ack" })
            )
        }
    }
    yield* reconcileCloudflareDeliveryEvents()
    return acks.length
})
