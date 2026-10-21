import { connect as tlsConnect, type TLSSocket } from "node:tls"
import { Effect, Redacted, Schema } from "effect"
import { CloudflareEmailConfig } from "@urm/env/server"
import { validateEmailAttachments } from "./attachments.ts"
import type {
    EmailAttachment,
    EmailAddress,
    EmailRecipients,
    EmailSendInput,
    EmailSendResult,
} from "./types.ts"

export class CloudflareSmtpError extends Schema.TaggedError<CloudflareSmtpError>()(
    "CloudflareSmtpError",
    {
        operation: Schema.String,
        message: Schema.String,
        cause: Schema.Defect(),
    }
) {}

const cloudflare_smtp_error = (
    operation: string,
    cause: unknown,
    message: string
) => new CloudflareSmtpError({ operation, message, cause })

const emailAddressString = (addr: EmailAddress): string =>
    typeof addr === "string" ? addr : addr.address

const emailAddressName = (addr: EmailAddress): string | undefined =>
    typeof addr === "string" ? undefined : addr.name

const flattenRecipients = (recipients: EmailRecipients): Array<EmailAddress> =>
    Array.isArray(recipients) ? [...recipients] : [recipients as EmailAddress]

const formatRecipientForRcpt = (addr: EmailAddress): string =>
    `<${emailAddressString(addr)}>`

const formatRecipientForHeader = (addr: EmailAddress): string => {
    const name = emailAddressName(addr)
    const email = emailAddressString(addr)

    return name === undefined ? email : `${name} <${email}>`
}

const formatFromHeader = (addr: EmailAddress): string => {
    const name = emailAddressName(addr)
    const email = emailAddressString(addr)

    return name === undefined ? email : `${name} <${email}>`
}

const encodeBase64 = (value: string): string =>
    Buffer.from(value, "utf-8").toString("base64")

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

const buildAttachmentPart = (attachment: EmailAttachment): string => {
    const headers: Array<string> = [
        "Content-Transfer-Encoding: base64",
        `Content-Type: ${attachment.type}; name="${attachment.filename}"`,
        `Content-Disposition: ${attachment.disposition}; filename="${attachment.filename}"`,
    ]

    if (attachment.content_id !== undefined) {
        headers.push(`Content-ID: <${attachment.content_id}>`)
    }

    const encoded = attachmentToBase64(attachment.content)
    const chunks: Array<string> = []
    for (let index = 0; index < encoded.length; index += 76) {
        chunks.push(encoded.slice(index, index + 76))
    }

    return [...headers, "", chunks.join("\r\n")].join("\r\n")
}

const buildMimeMessage = (
    input: EmailSendInput,
    from: string,
    attachments: ReadonlyArray<EmailAttachment>
): string => {
    const fromAddr = input.from ?? from
    const toRecipients = flattenRecipients(input.to)
    const ccRecipients =
        input.cc === undefined ? [] : flattenRecipients(input.cc)
    const replyTo =
        input.reply_to === undefined
            ? undefined
            : formatRecipientForHeader(input.reply_to)

    const hasAttachments = attachments.length > 0
    const mixedBoundary = `----=_Part_Mixed_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const altBoundary = `----=_Part_Alt_${Date.now()}_${Math.random().toString(36).slice(2)}`

    const contentType = hasAttachments
        ? `multipart/mixed; boundary="${mixedBoundary}"`
        : `multipart/alternative; boundary="${altBoundary}"`

    const headers: Array<string> = [
        `From: ${formatFromHeader(fromAddr)}`,
        `To: ${toRecipients.map(formatRecipientForHeader).join(", ")}`,
        `Subject: ${input.subject}`,
        "MIME-Version: 1.0",
        `Content-Type: ${contentType}`,
    ]

    if (ccRecipients.length > 0) {
        headers.push(
            `Cc: ${ccRecipients.map(formatRecipientForHeader).join(", ")}`
        )
    }

    if (replyTo !== undefined) {
        headers.push(`Reply-To: ${replyTo}`)
    }

    const bodyParts: Array<string> = [
        `--${altBoundary}`,
        "Content-Type: text/plain; charset=utf-8",
        "Content-Transfer-Encoding: 7bit",
        "",
        input.text,
    ]

    if (input.html !== undefined) {
        bodyParts.push(
            `--${altBoundary}`,
            "Content-Type: text/html; charset=utf-8",
            "Content-Transfer-Encoding: 7bit",
            "",
            input.html
        )
    }

    bodyParts.push(`--${altBoundary}--`)

    if (!hasAttachments) {
        return [...headers, "", bodyParts.join("\r\n")].join("\r\n")
    }

    const mixedParts: Array<string> = [
        `--${mixedBoundary}`,
        `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
        "",
        bodyParts.join("\r\n"),
    ]

    for (const attachment of attachments) {
        mixedParts.push(`--${mixedBoundary}`, buildAttachmentPart(attachment))
    }

    mixedParts.push(`--${mixedBoundary}--`)

    return [...headers, "", mixedParts.join("\r\n")].join("\r\n")
}

type SmtpResponse = Readonly<{
    code: number
    message: string
}>

const readSmtpResponse = (
    socket: TLSSocket
): Effect.Effect<SmtpResponse, CloudflareSmtpError> =>
    Effect.suspend(() => {
        return Effect.callback<SmtpResponse, CloudflareSmtpError>((resume) => {
            let buffer = ""
            const onData = (chunk: Buffer): void => {
                buffer += chunk.toString("utf-8")
                const lines = buffer.split("\r\n")
                if (lines.length < 2) {
                    return
                }
                buffer = lines[lines.length - 1] ?? ""
                const responseLines = lines.slice(0, -1)
                const lastLine = responseLines[responseLines.length - 1] ?? ""
                const codeMatch = lastLine.match(/^(\d{3})\s(.*)$/)
                if (codeMatch === null) {
                    socket.off("data", onData)
                    const message = `Invalid SMTP response: ${lastLine}`
                    resume(
                        cloudflare_smtp_error("read_response", message, message)
                    )
                    return
                }
                socket.off("data", onData)
                resume(
                    Effect.succeed({
                        code: parseInt(codeMatch[1] ?? "0", 10),
                        message: codeMatch[2] ?? "",
                    })
                )
            }
            socket.on("data", onData)
        })
    })

const sendSmtpCommand = (
    socket: TLSSocket,
    command: string
): Effect.Effect<void, CloudflareSmtpError> =>
    Effect.try({
        try: () => {
            socket.write(command + "\r\n")
        },
        catch: (cause) =>
            cloudflare_smtp_error(
                "send_command",
                cause,
                cause instanceof Error ? cause.message : String(cause)
            ),
    })

const expectCode = (
    response: SmtpResponse,
    expectedCode: number
): Effect.Effect<void, CloudflareSmtpError> =>
    response.code === expectedCode
        ? Effect.void
        : cloudflare_smtp_error(
              "validate_response",
              response,
              `SMTP expected ${expectedCode}, got ${response.code} ${response.message}`
          )

const connectSmtp = (
    host: string,
    port: number
): Effect.Effect<TLSSocket, CloudflareSmtpError> =>
    Effect.callback<TLSSocket, CloudflareSmtpError>((resume) => {
        const socket = tlsConnect({ host, port, rejectUnauthorized: true })
        socket.setEncoding("utf-8")
        socket.once("secureConnect", () => {
            resume(Effect.succeed(socket))
        })
        socket.once("error", (cause: Error) => {
            resume(cloudflare_smtp_error("connect", cause, cause.message))
        })
    })

const closeSmtp = (socket: TLSSocket): Effect.Effect<void, never> =>
    Effect.sync(() => {
        socket.destroy()
    })

export const sendCloudflareSmtpEmail = (
    input: EmailSendInput
): Effect.Effect<EmailSendResult, CloudflareSmtpError, CloudflareEmailConfig> =>
    Effect.gen(function* () {
        const config = yield* CloudflareEmailConfig
        const apiToken = Redacted.value(config.apiToken)

        if (!config.enabled) {
            const result: EmailSendResult = {
                status: "skipped",
                reason: "disabled",
            }
            return result
        }

        if (apiToken === "" || config.from === "") {
            const result: EmailSendResult = {
                status: "skipped",
                reason: "missing_config",
            }
            return result
        }

        const validatedAttachments =
            input.attachments === undefined
                ? []
                : validateEmailAttachments(input.attachments)

        const socket = yield* Effect.acquireRelease(
            connectSmtp(config.smtpHost, config.smtpPort),
            (sock) => closeSmtp(sock)
        )

        const greeting = yield* readSmtpResponse(socket)
        yield* expectCode(greeting, 220)

        yield* sendSmtpCommand(socket, "EHLO urm.local")
        const ehlo = yield* readSmtpResponse(socket)
        yield* expectCode(ehlo, 250)

        yield* sendSmtpCommand(socket, "AUTH LOGIN")
        const authPrompt = yield* readSmtpResponse(socket)
        yield* expectCode(authPrompt, 334)

        yield* sendSmtpCommand(socket, encodeBase64("api_token"))
        const authUserPrompt = yield* readSmtpResponse(socket)
        yield* expectCode(authUserPrompt, 334)

        yield* sendSmtpCommand(socket, encodeBase64(apiToken))
        const authResult = yield* readSmtpResponse(socket)
        yield* expectCode(authResult, 235)

        const fromAddr = input.from ?? config.from
        const fromEmail = emailAddressString(fromAddr)
        yield* sendSmtpCommand(socket, `MAIL FROM:<${fromEmail}>`)
        const mailFrom = yield* readSmtpResponse(socket)
        yield* expectCode(mailFrom, 250)

        const allRecipients = [
            ...flattenRecipients(input.to),
            ...(input.cc === undefined ? [] : flattenRecipients(input.cc)),
            ...(input.bcc === undefined ? [] : flattenRecipients(input.bcc)),
        ]

        for (const recipient of allRecipients) {
            yield* sendSmtpCommand(
                socket,
                `RCPT TO:${formatRecipientForRcpt(recipient)}`
            )
            const rcptTo = yield* readSmtpResponse(socket)
            yield* expectCode(rcptTo, 250)
        }

        yield* sendSmtpCommand(socket, "DATA")
        const dataPrompt = yield* readSmtpResponse(socket)
        yield* expectCode(dataPrompt, 354)

        const mimeMessage = buildMimeMessage(
            input,
            config.from,
            validatedAttachments
        )
        const dataWithTerminator =
            mimeMessage.replaceAll(/\r?\n/g, "\r\n") + "\r\n.\r\n"
        yield* Effect.sync(() => {
            socket.write(dataWithTerminator)
        })

        const dataResult = yield* readSmtpResponse(socket)
        yield* expectCode(dataResult, 250)

        yield* sendSmtpCommand(socket, "QUIT")
        yield* readSmtpResponse(socket).pipe(Effect.catch(() => Effect.void))

        const recipientEmails = allRecipients.map(emailAddressString)

        const result: EmailSendResult = {
            status: "sent",
            delivered: recipientEmails,
            queued: [],
            permanent_bounces: [],
        }
        return result
    }).pipe(Effect.scoped)
