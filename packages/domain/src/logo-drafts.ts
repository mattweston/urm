import { Schema } from "effect"
import { LogoScene } from "./schemas/logos.ts"

export const LogoDraftRecord = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.NullOr(Schema.String),
    organization_id: Schema.String,
    name: Schema.String,
    scene: LogoScene,
    revision: Schema.Number,
    created_by_user_id: Schema.String,
    updated_by_user_id: Schema.String,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export type LogoDraftRecord = typeof LogoDraftRecord.Type
export const LogoDraftSummary = Schema.Struct({
    domain_id: Schema.String,
    slug: Schema.String,
    scene: LogoScene,
})
export const LogoDraftCatalog = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    drafts: Schema.Array(LogoDraftSummary),
})
export type LogoDraftCatalog = typeof LogoDraftCatalog.Type
export const LogoDraftDetail = Schema.Struct({
    id: Schema.String,
    logo: Schema.NullOr(LogoDraftRecord),
})
export type LogoDraftDetail = typeof LogoDraftDetail.Type
export const SaveLogoDraftInput = Schema.Struct({
    logo_id: Schema.NullOr(Schema.String),
    expected_revision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    name: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(160)),
    scene: LogoScene,
})
export type SaveLogoDraftInput = typeof SaveLogoDraftInput.Type
export class LogoDraftError extends Schema.TaggedError<LogoDraftError>()(
    "LogoDraftError",
    { message: Schema.String }
) {}
