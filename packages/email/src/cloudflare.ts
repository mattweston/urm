import { Effect, Redacted, Schema } from "effect"
import { CloudflareEmailConfig } from "@urm/env/server"
import { validateEmailAttachments } from "./attachments.ts"
import type {
    EmailAttachment,
    EmailFetch,
    EmailSendInput,
    EmailSendResult,
} from "./types.ts"

const CLOUDFLARE_EMAIL_SEND_URL =
    "https://api.cloudflare.com/client/v4/accounts"

export class CloudflareEmailError extends Schema.TaggedError<CloudflareEmailError>()(
    "CloudflareEmailError",
    {
        operation: Schema.String,
        message: Schema.String,
        cause: Schema.Defect(),
    }
) {}

const defaultFetch: EmailFetch = (url, init) => fetch(url, init)

const stringArray = (value: unknown): ReadonlyArray<string> => {
    if (!Array.isArray(value)) {
        return []
    }

    return value.filter((item): item is string => typeof item === "string")
}

const readSendResult = (value: unknown): EmailSendResult => {
    const envelope = Object(value)
    const resultValue = envelope.result

    if (typeof resultValue !== "object" || resultValue === null) {
        return {
            status: "sent",
            delivered: [],
            queued: [],
            permanent_bounces: [],
        }
    }

    const result = Object(resultValue)

    return {
        status: "sent",
        ...(typeof result.message_id === "string" && result.message_id !== ""
            ? { message_id: result.message_id }
            : {}),
        delivered: stringArray(result.delivered),
        queued: stringArray(result.queued),
        permanent_bounces: stringArray(result.permanent_bounces),
    }
}

const attachmentToBase64 = (content: EmailAttachment["content"]): string => {
    if (typeof content === "string") {
        return Buffer.from(content, "utf-8").toString("base64")
    }
    const buffer =
        content instanceof ArrayBuffer
            ? Buffer.from(content)
            : Buffer.from(content)
    return buffer.toString("base64")
}

const attachmentsToRestPayload = (
    attachments: ReadonlyArray<EmailAttachment>
): ReadonlyArray<Readonly<Record<string, string>>> =>
    attachments.map((attachment) => {
        const payload: Record<string, string> = {
            filename: attachment.filename,
            content: attachmentToBase64(attachment.content),
            type: attachment.type,
            disposition: attachment.disposition,
        }

        if (attachment.content_id !== undefined) {
            payload.content_id = attachment.content_id
        }

        return payload
    })

export const sendCloudflareEmail = (
    input: EmailSendInput,
    fetchEmail: EmailFetch = defaultFetch
): Effect.Effect<
    EmailSendResult,
    CloudflareEmailError,
    CloudflareEmailConfig
> =>
    Effect.gen(function* () {
        const config = yield* CloudflareEmailConfig
        const apiToken = Redacted.value(config.apiToken)

        if (!config.enabled) {
            return { status: "skipped", reason: "disabled" }
        }

        if (config.accountId === "" || apiToken === "" || config.from === "") {
            return { status: "skipped", reason: "missing_config" }
        }

        const validatedAttachments =
            input.attachments === undefined
                ? []
                : validateEmailAttachments(input.attachments)

        const body: Record<string, unknown> = {
            to: input.to,
            cc: input.cc,
            bcc: input.bcc,
            from: input.from ?? config.from,
            reply_to: input.reply_to,
            subject: input.subject,
            text: input.text,
            html: input.html,
            ...(input.unsubscribe_url === undefined
                ? {}
                : {
                      headers: {
                          "List-Unsubscribe": `<${input.unsubscribe_url}>`,
                          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                      },
                  }),
        }

        if (validatedAttachments.length > 0) {
            body.attachments = attachmentsToRestPayload(validatedAttachments)
        }

        const response = yield* Effect.tryPromise({
            try: () =>
                fetchEmail(
                    `${CLOUDFLARE_EMAIL_SEND_URL}/${config.accountId}/email/sending/send`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${apiToken}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(body),
                    }
                ),
            catch: (cause) =>
                new CloudflareEmailError({
                    operation: "send_request",
                    message:
                        cause instanceof Error ? cause.message : String(cause),
                    cause,
                }),
        })

        if (!response.ok) {
            const message = `Cloudflare email send failed: ${response.status}`
            return yield* new CloudflareEmailError({
                operation: "send_request",
                message,
                cause: message,
            })
        }

        const responseBody = yield* Effect.tryPromise({
            try: () => response.json(),
            catch: (cause) =>
                new CloudflareEmailError({
                    operation: "decode_response",
                    message:
                        cause instanceof Error ? cause.message : String(cause),
                    cause,
                }),
        })

        if (Object(responseBody).success !== true) {
            const message = "Cloudflare email send was rejected"
            return yield* new CloudflareEmailError({
                operation: "validate_response",
                message,
                cause: responseBody,
            })
        }

        return readSendResult(responseBody)
    })
