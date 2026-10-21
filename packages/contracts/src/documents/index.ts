import { DocumentLibraryRecord, DocumentAction } from "@urm/domain/documents"
export {
    DocumentFields,
    DocumentRecord,
    DocumentTemplateFields,
    DocumentTemplate,
    DocumentLibraryRecord,
    DocumentAction,
} from "@urm/domain/documents"
import { Schema } from "effect"
import { Entity, Mutation, Query, Remote } from "foldkit-remote"

export const DocumentLibrary = Entity.make(
    "DocumentLibrary",
    DocumentLibraryRecord
)
export const DocumentLibrarySummary = DocumentLibrary.select({
    id: true,
    documents: true,
    templates: true,
})

export const WorkspaceDocuments = Query.make("WorkspaceDocuments", {
    Input: { domain_id: Schema.String },
    Result: DocumentLibrary,
})
export const ChangeDocuments = Mutation.make("ChangeDocuments", {
    Input: {
        account_id: Schema.optional(Schema.String),
        domain_id: Schema.String,
        action: DocumentAction,
    },
    Output: { domain_id: Schema.String },
})
export const DocumentsRemote = Remote.define({
    entities: [DocumentLibrary],
    queries: [WorkspaceDocuments],
    mutations: [ChangeDocuments],
})
