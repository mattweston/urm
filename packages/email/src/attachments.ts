import * as Schema from "effect/Schema"
import type { EmailAttachment } from "./types.ts"

export const MAX_ATTACHMENT_TOTAL_BYTES = 5 * 1024 * 1024

const MIME_ALLOWLIST: ReadonlySet<string> = new Set([
    "text/plain",
    "text/csv",
    "text/html",
    "application/pdf",
    "application/json",
    "application/zip",
    "application/octet-stream",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
])

const DANGEROUS_EXTENSIONS: ReadonlySet<string> = new Set([
    ".exe",
    ".bat",
    ".cmd",
    ".scr",
    ".vbs",
    ".js",
    ".jar",
    ".com",
    ".ps1",
    ".sh",
    ".msi",
])

export class EmailAttachmentValidationError extends Schema.TaggedError<EmailAttachmentValidationError>()(
    "EmailAttachmentValidationError",
    {
        reason: Schema.Union([
            Schema.Literal("empty"),
            Schema.Literal("too_large"),
            Schema.Literal("mime_not_allowed"),
            Schema.Literal("dangerous_extension"),
            Schema.Literal("missing_filename"),
            Schema.Literal("inline_without_content_id"),
        ]),
        message: Schema.String,
    }
) {}

const sanitizeFilename = (filename: string): string =>
    filename
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_{2,}/g, "_")
        .slice(0, 255)

const attachmentSize = (content: EmailAttachment["content"]): number => {
    if (typeof content === "string") {
        return Buffer.byteLength(content, "utf-8")
    }
    if (content instanceof ArrayBuffer) {
        return content.byteLength
    }
    return content.byteLength
}

const totalAttachmentSize = (
    attachments: ReadonlyArray<EmailAttachment>
): number =>
    attachments.reduce(
        (sum, attachment) => sum + attachmentSize(attachment.content),
        0
    )

export const validateEmailAttachments = (
    attachments: ReadonlyArray<EmailAttachment>
): ReadonlyArray<EmailAttachment> => {
    if (attachments.length === 0) {
        return attachments
    }

    const totalSize = totalAttachmentSize(attachments)
    const encodedEstimate = Math.ceil(totalSize * 1.37)
    if (encodedEstimate > MAX_ATTACHMENT_TOTAL_BYTES) {
        throw new EmailAttachmentValidationError({
            reason: "too_large",
            message: `Attachments exceed 5 MiB limit (encoded estimate: ${encodedEstimate} bytes)`,
        })
    }

    return attachments.map((attachment) => {
        if (attachment.filename.trim().length === 0) {
            throw new EmailAttachmentValidationError({
                reason: "missing_filename",
                message: "Attachment filename is required",
            })
        }

        if (attachmentSize(attachment.content) === 0) {
            throw new EmailAttachmentValidationError({
                reason: "empty",
                message: `Attachment ${attachment.filename} is empty`,
            })
        }

        if (!MIME_ALLOWLIST.has(attachment.type)) {
            throw new EmailAttachmentValidationError({
                reason: "mime_not_allowed",
                message: `Attachment ${attachment.filename} has disallowed MIME type: ${attachment.type}`,
            })
        }

        const lowerFilename = attachment.filename.toLowerCase()
        for (const ext of DANGEROUS_EXTENSIONS) {
            if (lowerFilename.endsWith(ext)) {
                throw new EmailAttachmentValidationError({
                    reason: "dangerous_extension",
                    message: `Attachment ${attachment.filename} has dangerous extension: ${ext}`,
                })
            }
        }

        if (
            attachment.disposition === "inline" &&
            attachment.content_id === undefined
        ) {
            throw new EmailAttachmentValidationError({
                reason: "inline_without_content_id",
                message: `Inline attachment ${attachment.filename} requires content_id`,
            })
        }

        return {
            ...attachment,
            filename: sanitizeFilename(attachment.filename),
        }
    })
}
