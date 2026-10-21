import { Schema } from "effect"

import {
    PageTitle,
    PageContent,
    PageContentType,
    InternalDocumentStatus,
} from "./schemas/publications.ts"

import {
    ContentTemplateName,
    ContentTemplateDescription,
    ContentTemplateTags,
    ContentTemplateSource,
} from "./schemas/content-templates.ts"

export const DocumentFields = Schema.Struct({
    title: PageTitle,
    content: PageContent,
    content_type: PageContentType,
    status: InternalDocumentStatus,
})
export const DocumentRecord = Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    content: Schema.String,
    content_type: PageContentType,
    status: InternalDocumentStatus,
    template_source: Schema.NullOr(ContentTemplateSource),
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export const DocumentTemplateFields = Schema.Struct({
    name: ContentTemplateName,
    description: ContentTemplateDescription,
    tags: ContentTemplateTags,
    title: PageTitle,
    content: PageContent,
    content_type: PageContentType,
})
export const DocumentTemplate = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    description: Schema.String,
    tags: Schema.Array(Schema.String),
    title: Schema.String,
    content: Schema.String,
    content_type: PageContentType,
    revision: Schema.Number,
    created_at: Schema.Number,
    updated_at: Schema.Number,
})
export const DocumentLibraryRecord = Schema.Struct({
    id: Schema.String,
    documents: Schema.Array(DocumentRecord),
    templates: Schema.Array(DocumentTemplate),
})
export const DocumentAction = Schema.Union([
    Schema.Struct({
        _tag: Schema.Literal("create"),
        id: Schema.String,
        ...DocumentFields.fields,
    }),
    Schema.Struct({
        _tag: Schema.Literal("update"),
        id: Schema.String,
        ...DocumentFields.fields,
    }),
    Schema.Struct({ _tag: Schema.Literal("delete"), id: Schema.String }),
    Schema.Struct({
        _tag: Schema.Literal("from_template"),
        id: Schema.String,
        template_id: Schema.String,
    }),
    Schema.Struct({
        _tag: Schema.Literal("save_template"),
        id: Schema.String,
        expected_revision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
        ...DocumentTemplateFields.fields,
    }),
    Schema.Struct({
        _tag: Schema.Literal("delete_template"),
        id: Schema.String,
    }),
])
export type DocumentAction = typeof DocumentAction.Type

export type DocumentFields = typeof DocumentFields.Type

export type DocumentRecord = typeof DocumentRecord.Type

export type DocumentTemplateFields = typeof DocumentTemplateFields.Type

export type DocumentTemplate = typeof DocumentTemplate.Type

export type DocumentLibraryRecord = typeof DocumentLibraryRecord.Type

export class DocumentsWriteError extends Schema.TaggedError<DocumentsWriteError>()(
    "DocumentsWriteError",
    { message: Schema.String }
) {}
