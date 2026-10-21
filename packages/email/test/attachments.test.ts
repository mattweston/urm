import { assert, describe, it } from "@effect/vitest"
import {
    EmailAttachmentValidationError,
    MAX_ATTACHMENT_TOTAL_BYTES,
    validateEmailAttachments,
} from "../src/attachments.ts"
import type { EmailAttachment } from "../src/types.ts"

const validAttachment = (
    overrides?: Partial<EmailAttachment>
): EmailAttachment => ({
    filename: "report.pdf",
    content: Buffer.from("test content"),
    type: "application/pdf",
    disposition: "attachment",
    ...overrides,
})

const expectValidationError = (fn: () => unknown, reason: string) => {
    try {
        fn()
        assert.fail(
            `Expected EmailAttachmentValidationError with reason ${reason}`
        )
    } catch (error) {
        if (error instanceof EmailAttachmentValidationError) {
            assert.strictEqual(error.reason, reason)
            return
        }
        assert.fail(
            `Expected EmailAttachmentValidationError, got ${String(error)}`
        )
    }
}

describe("@urm/email - attachment validation", () => {
    it("accepts valid attachments", () => {
        const result = validateEmailAttachments([validAttachment()])
        assert.strictEqual(result.length, 1)
        assert.strictEqual(result[0]!.filename, "report.pdf")
    })

    it("rejects empty attachments", () => {
        expectValidationError(
            () =>
                validateEmailAttachments([
                    validAttachment({ content: new Uint8Array(0) }),
                ]),
            "empty"
        )
    })

    it("rejects missing filename", () => {
        expectValidationError(
            () =>
                validateEmailAttachments([validAttachment({ filename: "  " })]),
            "missing_filename"
        )
    })

    it("rejects disallowed MIME types", () => {
        expectValidationError(
            () =>
                validateEmailAttachments([
                    validAttachment({ type: "application/x-msdownload" }),
                ]),
            "mime_not_allowed"
        )
    })

    it("rejects dangerous extensions", () => {
        for (const ext of [".exe", ".bat", ".cmd", ".scr", ".vbs", ".js"]) {
            expectValidationError(
                () =>
                    validateEmailAttachments([
                        validAttachment({
                            filename: `file${ext}`,
                            type: "application/octet-stream",
                        }),
                    ]),
                "dangerous_extension"
            )
        }
    })

    it("rejects inline attachments without content_id", () => {
        expectValidationError(
            () =>
                validateEmailAttachments([
                    validAttachment({ disposition: "inline" }),
                ]),
            "inline_without_content_id"
        )
    })

    it("accepts inline attachments with content_id", () => {
        const result = validateEmailAttachments([
            validAttachment({ disposition: "inline", content_id: "logo-img" }),
        ])
        assert.strictEqual(result.length, 1)
    })

    it("rejects attachments exceeding 5 MiB total", () => {
        const largeContent = new Uint8Array(4 * 1024 * 1024)
        expectValidationError(
            () =>
                validateEmailAttachments([
                    validAttachment({
                        content: largeContent,
                        type: "application/octet-stream",
                    }),
                    validAttachment({
                        content: largeContent,
                        filename: "big2.bin",
                        type: "application/octet-stream",
                    }),
                ]),
            "too_large"
        )
    })

    it("accepts the encoded-size limit and rejects one byte above it", () => {
        const maxRawBytes = Math.floor(MAX_ATTACHMENT_TOTAL_BYTES / 1.37)

        assert.strictEqual(
            validateEmailAttachments([
                validAttachment({
                    content: new Uint8Array(maxRawBytes),
                    type: "application/octet-stream",
                }),
            ]).length,
            1
        )
        expectValidationError(
            () =>
                validateEmailAttachments([
                    validAttachment({
                        content: new Uint8Array(maxRawBytes + 1),
                        type: "application/octet-stream",
                    }),
                ]),
            "too_large"
        )
    })

    it("sanitizes filenames", () => {
        const result = validateEmailAttachments([
            validAttachment({ filename: "../../etc/passwd.pdf" }),
        ])
        assert.strictEqual(result[0]!.filename, ".._.._etc_passwd.pdf")
    })

    it("passes through empty arrays", () => {
        const result = validateEmailAttachments([])
        assert.strictEqual(result.length, 0)
    })
})
