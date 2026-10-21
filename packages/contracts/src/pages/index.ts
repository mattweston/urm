import { PagesLibraryRecord, PagesScope, PageAction } from "@urm/domain/pages"
export {
    PageFields,
    PageRecord,
    PagesLibraryRecord,
    PagesScope,
    PageAction,
    pages_library_id,
} from "@urm/domain/pages"
import { Schema } from "effect"
import { Entity, Mutation, Query, Remote } from "foldkit-remote"

export const PagesLibrary = Entity.make("PagesLibrary", PagesLibraryRecord)
export const PagesLibrarySummary = PagesLibrary.select({
    id: true,
    pages: true,
})

export const PublicationPages = Query.make("PublicationPages", {
    Input: PagesScope,
    Result: PagesLibrary,
})
export const ChangePages = Mutation.make("ChangePages", {
    Input: {
        account_id: Schema.optional(Schema.String),
        ...PagesScope,
        action: PageAction,
    },
    Output: { id: Schema.String },
})
export const PagesRemote = Remote.define({
    entities: [PagesLibrary],
    queries: [PublicationPages],
    mutations: [ChangePages],
})
