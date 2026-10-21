/**
 * # Social webhook
 *
 * Receives Zernio's post lifecycle events. Mounted at `/webhooks/zernio` by
 * `apps/server/src/main.ts`.
 *
 * Zernio cannot reach this route yet: the API has no public origin, so Zernio's
 * configured destination still points elsewhere. Once the host is deployed,
 * repoint it at `https://api.urm.dev/webhooks/zernio` and send a Zernio test
 * event — the route accepts signed non-post events, including `webhook.test`,
 * so delivery can be confirmed without publishing a post.
 */
import { createHmac, timingSafeEqual } from "node:crypto"
import { Config, Effect, Option, Redacted, Result, Schema } from "effect"
import { Sql } from "@urm/database/sql"
import { record_social_provider_event } from "@urm/rpc/handlers/social"

const Webhook = Schema.Struct({
    id: Schema.NonEmptyString,
    event: Schema.String,
    timestamp: Schema.String,
    post: Schema.optional(Schema.Struct({ id: Schema.NonEmptyString })),
})
const WebhookEvent = Schema.Struct({ event: Schema.String })
class WebhookBodyError extends Schema.TaggedError<WebhookBodyError>()(
    "WebhookBodyError",
    {}
) {}

const post_events = new Set([
    "post.scheduled",
    "post.published",
    "post.failed",
    "post.partial",
    "post.cancelled",
])

/**
 * Constant-time HMAC-SHA256 check of `X-Zernio-Signature` over the raw request
 * body. Fails closed on a missing secret, absent header, or malformed digest.
 */
export const verify_zernio_signature = (
    body: Uint8Array,
    signature: string | null,
    secret: string
): boolean => {
    if (!secret || signature === null || !/^[a-f0-9]{64}$/i.test(signature))
        return false
    const actual = Buffer.from(signature, "hex")
    const expected = createHmac("sha256", secret).update(body).digest()
    return (
        actual.length === expected.length && timingSafeEqual(actual, expected)
    )
}

/**
 * Verifies the signature against the raw body before parsing, then records the
 * event. Returns 503 when `ZERNIO_WEBHOOK_SECRET` is unset rather than
 * accepting unverifiable deliveries.
 */
export const handle_social_webhook_request = (
    request: Request
): Effect.Effect<Response, never, Sql> =>
    Effect.gen(function* () {
        if (request.method !== "POST")
            return new Response(null, { status: 405 })
        const secret = yield* Config.Redacted("ZERNIO_WEBHOOK_SECRET").pipe(
            Config.withDefault(Redacted.make(""))
        )
        if (!Redacted.value(secret))
            return new Response("Webhook unavailable", { status: 503 })
        const raw = yield* Effect.tryPromise({
            try: () => request.arrayBuffer(),
            catch: () => new WebhookBodyError(),
        })
        const body = new Uint8Array(raw)
        if (
            !verify_zernio_signature(
                body,
                request.headers.get("x-zernio-signature"),
                Redacted.value(secret)
            )
        )
            return new Response("Invalid signature", { status: 401 })
        const decoded = yield* Effect.result(
            Effect.try({
                try: () => JSON.parse(Buffer.from(body).toString("utf8")),
                catch: () => new WebhookBodyError(),
            })
        )
        if (Result.isFailure(decoded))
            return new Response("Invalid webhook JSON", { status: 400 })
        const parsed: unknown = decoded.success
        const event = Option.getOrUndefined(
            Schema.decodeUnknownOption(WebhookEvent)(parsed)
        )
        if (event === undefined)
            return new Response("Invalid webhook payload", { status: 400 })
        if (!post_events.has(event.event))
            return new Response(null, { status: 200 })
        const webhook = Option.getOrUndefined(
            Schema.decodeUnknownOption(Webhook)(parsed)
        )
        if (webhook === undefined)
            return new Response("Invalid webhook payload", { status: 400 })
        const occurred_at = Date.parse(webhook.timestamp)
        if (webhook.post === undefined || !Number.isFinite(occurred_at))
            return new Response("Invalid post event", { status: 400 })
        yield* record_social_provider_event({
            id: webhook.id,
            event_type: webhook.event,
            provider_post_id: webhook.post.id,
            occurred_at,
        })
        return new Response(null, { status: 200 })
    }).pipe(
        Effect.catch(() =>
            Effect.succeed(new Response("Webhook unavailable", { status: 503 }))
        )
    )
