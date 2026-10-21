import { Entity, Mutation, Query, Remote } from "foldkit-remote"
import { Schema } from "effect"
import { FormsCatalog, FormDetail, FormsAction } from "@urm/domain/forms"

export const FormsCatalogEntity = Entity.make("FormsCatalog", FormsCatalog)
export const FormDetailEntity = Entity.make("FormDetail", FormDetail)
export const FormsCatalogQuery = Query.make("FormsCatalogQuery", {
    Input: { domain_id: Schema.String },
    Result: FormsCatalogEntity,
})
export const FormDetailQuery = Query.make("FormDetailQuery", {
    Input: { domain_id: Schema.String, slug: Schema.String },
    Result: FormDetailEntity,
})
export const ChangeForms = Mutation.make("ChangeForms", {
    Input: {
        domain_id: Schema.String,
        account_id: Schema.optional(Schema.String),
        action: FormsAction,
    },
    Output: { changed_id: Schema.String, slug: Schema.String },
})
export const FormsRemote = Remote.define({
    entities: [FormsCatalogEntity, FormDetailEntity],
    queries: [FormsCatalogQuery, FormDetailQuery],
    mutations: [ChangeForms],
})
