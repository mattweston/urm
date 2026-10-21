import { Schema } from "effect"

// The copy schemas are shared with the renderer in `@urm/email`; this module
// adds only the catalog and the operation inputs.
export const TransactionalTemplateId = Schema.Literals([
    "auth_email_verification",
    "auth_password_reset",
    "auth_password_changed",
])
export type TransactionalTemplateId = typeof TransactionalTemplateId.Type

export const TransactionalCopy = Schema.Struct({
    subject: Schema.String,
    heading: Schema.String,
    introduction: Schema.String,
})
export type TransactionalCopy = typeof TransactionalCopy.Type

export const TransactionalVersion = Schema.Struct({
    version: Schema.Number,
    copy: TransactionalCopy,
})
export type TransactionalVersion = typeof TransactionalVersion.Type

export const TransactionalTemplateState = Schema.Struct({
    template_id: TransactionalTemplateId,
    latest: Schema.NullOr(TransactionalVersion),
    active: Schema.NullOr(TransactionalVersion),
})
export type TransactionalTemplateState = typeof TransactionalTemplateState.Type

export const TransactionalHistoryEntry = Schema.Struct({
    version: Schema.Number,
    copy: TransactionalCopy,
    created_at: Schema.Number,
    restored_from_version: Schema.NullOr(Schema.Number),
})
export type TransactionalHistoryEntry = typeof TransactionalHistoryEntry.Type

export const TransactionalDelivery = Schema.Struct({
    id: Schema.String,
    contact_id: Schema.NullOr(Schema.String),
    template_id: Schema.String,
    subject: Schema.String,
    status: Schema.Literals([
        "pending",
        "accepted",
        "queued",
        "sent",
        "delivered",
        "bounced",
        "complained",
        "failed",
        "skipped",
    ]),
    provider_status: Schema.NullOr(Schema.String),
    to_domain: Schema.NullOr(Schema.String),
    error_message: Schema.NullOr(Schema.String),
    is_test: Schema.Boolean,
    purpose: Schema.Literals(["newsletter", "transactional"]),
    created_at: Schema.Number,
    sent_at: Schema.NullOr(Schema.Number),
})
export type TransactionalDelivery = typeof TransactionalDelivery.Type

export const TransactionalCatalogRecord = Schema.Struct({
    id: Schema.String,
    templates: Schema.Array(TransactionalTemplateState),
    history: Schema.Array(TransactionalHistoryEntry),
    history_template_id: Schema.NullOr(TransactionalTemplateId),
    next_before_version: Schema.NullOr(Schema.Number),
    deliveries: Schema.Array(TransactionalDelivery),
})
export type TransactionalCatalogRecord = typeof TransactionalCatalogRecord.Type

const line = (max: number) =>
    Schema.Trimmed.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(max),
        Schema.isPattern(/^[^\r\n]+$/)
    )

export const TransactionalCopyInput = Schema.Struct({
    subject: line(200),
    heading: line(200),
    introduction: Schema.Trimmed.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(2000)
    ),
})
export type TransactionalCopyInput = typeof TransactionalCopyInput.Type

/**
 * One operation covers the editor's three actions. `expected_version` is the
 * latest version the editor had loaded; a mismatch is refused rather than
 * overwriting a change made elsewhere.
 */
export const TransactionalOperationInput = Schema.Struct({
    template_id: TransactionalTemplateId,
    expected_version: Schema.NullOr(Schema.Number),
    operation: Schema.Literals(["save", "activate", "restore"]),
    copy: Schema.NullOr(TransactionalCopyInput),
    source_version: Schema.NullOr(Schema.Number),
    expected_active_version: Schema.NullOr(Schema.Number),
})
export type TransactionalOperationInput =
    typeof TransactionalOperationInput.Type

export const SendTransactionalInput = Schema.Struct({
    contact_id: Schema.String.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(128)
    ),
    request_id: Schema.Trimmed.check(
        Schema.isMinLength(1),
        Schema.isMaxLength(255)
    ),
    template_id: Schema.NullOr(TransactionalTemplateId),
    subject: Schema.NullOr(Schema.String.check(Schema.isMaxLength(500))),
    body_text: Schema.NullOr(Schema.String.check(Schema.isMaxLength(20_000))),
})
export type SendTransactionalInput = typeof SendTransactionalInput.Type

export class TransactionalWriteError extends Schema.TaggedError<TransactionalWriteError>()(
    "TransactionalWriteError",
    { message: Schema.String }
) {}

export const TRANSACTIONAL_HISTORY_PAGE = 20
export const TRANSACTIONAL_DELIVERY_LIMIT = 100

export const transactional_catalog_id = (domain_id: string): string =>
    `${domain_id}/transactional`
