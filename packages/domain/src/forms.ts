import { Schema } from "effect"
import {
    ContentTemplateSource,
    ContentTemplateName,
    ContentTemplateDescription,
    ContentTemplateTags,
} from "./schemas/content-templates.ts"
import {
    FormDefinition,
    FormFieldKind,
    FormSlug,
    FormTitle,
    FormStatus,
} from "./schemas/forms.ts"

export const StoredForm = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    title: Schema.String,
    slug: Schema.String,
    status: FormStatus,
    submission_count: Schema.Number,
    template_source: Schema.NullOr(ContentTemplateSource),
    updated_at: Schema.Number,
})
export type StoredForm = typeof StoredForm.Type

export const StoredFormField = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    form_id: Schema.String,
    component_id: Schema.String,
    kind: FormFieldKind,
    href: Schema.NullOr(Schema.String),
    name: Schema.String,
    label: Schema.String,
    description: Schema.String,
    placeholder: Schema.String,
    required: Schema.Boolean,
    options: Schema.Array(
        Schema.Struct({
            id: Schema.String,
            label: Schema.String,
            value: Schema.String,
        })
    ),
    order_position: Schema.Number,
    updated_at: Schema.Number,
})
export type StoredFormField = typeof StoredFormField.Type

export const StoredFormTemplate = Schema.Struct({
    id: Schema.String,
    organization_id: Schema.String,
    name: Schema.String,
    description: Schema.String,
    tags: Schema.Array(Schema.String),
    fields: FormDefinition,
    revision: Schema.Number,
    created_by_user_id: Schema.String,
    updated_by_user_id: Schema.String,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export type StoredFormTemplate = typeof StoredFormTemplate.Type

export const FormsCatalog = Schema.Struct({
    id: Schema.String,
    can_write: Schema.Boolean,
    forms: Schema.Array(StoredForm),
    templates: Schema.Array(StoredFormTemplate),
})
export type FormsCatalog = typeof FormsCatalog.Type

export const FormDetail = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    form: Schema.NullOr(StoredForm),
    fields: Schema.Array(StoredFormField),
})
export type FormDetail = typeof FormDetail.Type

export const FormsAction = Schema.Union([
    Schema.TaggedStruct("CreateForm", {
        title: FormTitle,
        slug: FormSlug,
        template_id: Schema.NullOr(Schema.String),
    }),
    Schema.TaggedStruct("SaveDefinition", {
        form_id: Schema.String,
        fields: FormDefinition,
    }),
    Schema.TaggedStruct("SaveTemplate", {
        template_id: Schema.NullOr(Schema.String),
        expected_revision: Schema.Number,
        name: ContentTemplateName,
        description: ContentTemplateDescription,
        tags: ContentTemplateTags,
        fields: FormDefinition,
    }),
    Schema.TaggedStruct("RemoveTemplate", { template_id: Schema.String }),
])
export type FormsAction = typeof FormsAction.Type

export class FormsWriteError extends Schema.TaggedError<FormsWriteError>()(
    "FormsWriteError",
    { message: Schema.String }
) {}
