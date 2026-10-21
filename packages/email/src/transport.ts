/**
 * # Email transport
 *
 * `EmailTransport` is the single seam features/handlers send mail through —
 * they depend on the service, not on a provider. Two live layers exist
 * (Cloudflare REST and Cloudflare SMTP); both read {@link CloudflareEmailConfig}.
 *
 * Failure modes of `send`:
 * - Succeeds with `{ status: "skipped", reason: "disabled" | "missing_config" }`
 *   when email is turned off or unconfigured — NOT an error; callers must
 *   branch on it (see newsletter.ts).
 * - Fails when the provider rejects or the network errors. The live send
 *   transports do not automatically retry: a timeout can occur after provider
 *   acceptance, and these APIs do not establish an idempotent resubmission.
 */
import { Context, Effect, Layer, Schedule, Schema } from "effect"
import { CloudflareEmailConfig } from "@urm/env/server"
import { sendCloudflareEmail } from "./cloudflare.ts"
import { sendCloudflareSmtpEmail } from "./smtp.ts"
import type { EmailSendInput, EmailSendResult } from "./types.ts"

export const EMAIL_SEND_MAX_RETRIES = 2

export class EmailTransportError extends Schema.TaggedError<EmailTransportError>()(
    "EmailTransportError",
    {
        operation: Schema.String,
        cause: Schema.Defect(),
    }
) {}

const email_transport_error = (operation: string) =>
    Effect.mapError(
        (cause: unknown) => new EmailTransportError({ operation, cause })
    )

// Use only for operations whose idempotency is proven at the provider boundary.
// Sending through the live transports does not meet that requirement.
const emailRetrySchedule = Schedule.max([
    Schedule.exponential("100 millis"),
    Schedule.recurs(EMAIL_SEND_MAX_RETRIES),
])

export const withEmailSendRetry = <A, E>(
    effect: Effect.Effect<A, E>
): Effect.Effect<A, E> =>
    effect.pipe(
        Effect.retry(emailRetrySchedule),
        Effect.annotateLogs({ email_retry_max: EMAIL_SEND_MAX_RETRIES })
    )

export class EmailTransport extends Context.Service<
    EmailTransport,
    {
        readonly send: (
            input: EmailSendInput
        ) => Effect.Effect<EmailSendResult, EmailTransportError>
    }
>()("EmailTransport") {}

/**
 * Safe transport for the isolated demo deployment.
 *
 * Callers retain their normal delivery-ledger behaviour while no email can
 * leave the demo environment.
 */
export const DemoEmailTransportLive = Layer.succeed(
    EmailTransport,
    EmailTransport.of({
        send: () => Effect.succeed({ status: "skipped", reason: "disabled" }),
    })
)

// #region cloudflare-rest-transport
export const CloudflareRestEmailTransportLive = Layer.effect(
    EmailTransport,
    Effect.gen(function* () {
        const config = yield* CloudflareEmailConfig

        return EmailTransport.of({
            send: (input) =>
                sendCloudflareEmail(input).pipe(
                    Effect.provideService(CloudflareEmailConfig, config),
                    email_transport_error("cloudflare_rest_send")
                ),
        })
    })
)

// #endregion cloudflare-rest-transport

export const CloudflareSmtpEmailTransportLive = Layer.effect(
    EmailTransport,
    Effect.gen(function* () {
        const config = yield* CloudflareEmailConfig

        return EmailTransport.of({
            send: (input) =>
                sendCloudflareSmtpEmail(input).pipe(
                    Effect.provideService(CloudflareEmailConfig, config),
                    email_transport_error("cloudflare_smtp_send")
                ),
        })
    })
)
