import { Schema } from "effect"
import {
    LandingPageDocument,
    LandingTemplateCategory,
    LandingTemplateDescription,
    LandingTemplateName,
    LandingTemplateTags,
} from "./schemas/landing-pages.ts"

export const LandingTemplateRecord = Schema.Struct({
    id: Schema.String,
    organization_id: Schema.String,
    name: Schema.String,
    description: Schema.NullOr(Schema.String),
    category: Schema.NullOr(Schema.String),
    tags: Schema.Array(Schema.String),
    document: LandingPageDocument,
    revision: Schema.Number,
    created_by_user_id: Schema.String,
    updated_by_user_id: Schema.String,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export type LandingTemplateRecord = typeof LandingTemplateRecord.Type

export const LandingTemplateCatalog = Schema.Struct({
    id: Schema.String,
    templates: Schema.Array(LandingTemplateRecord),
})
export type LandingTemplateCatalog = typeof LandingTemplateCatalog.Type

export const SaveLandingTemplateInput = Schema.Struct({
    template_id: Schema.NullOr(Schema.String),
    expected_revision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
    name: LandingTemplateName,
    description: Schema.optional(LandingTemplateDescription),
    category: Schema.optional(LandingTemplateCategory),
    tags: Schema.optional(LandingTemplateTags),
    document: LandingPageDocument,
})
export type SaveLandingTemplateInput = typeof SaveLandingTemplateInput.Type

export class LandingTemplateError extends Schema.TaggedError<LandingTemplateError>()(
    "LandingTemplateError",
    { message: Schema.String }
) {}
