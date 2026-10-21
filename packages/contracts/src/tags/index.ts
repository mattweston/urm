import { TagCatalogRecord, TagAction } from "@urm/domain/tags"
export { TagFields, TagCatalogRecord, TagAction } from "@urm/domain/tags"
import { Schema } from "effect"
import { Entity, Mutation, Query, Remote } from "foldkit-remote"

export const TagCatalog = Entity.make("TagCatalog", TagCatalogRecord)
export const TagCatalogSummary = TagCatalog.select({
    id: true,
    tags: true,
    entity_tags: true,
})

export const DomainTags = Query.make("DomainTags", {
    Input: { domain_id: Schema.String },
    Result: TagCatalog,
})
export const ChangeTags = Mutation.make("ChangeTags", {
    Input: {
        account_id: Schema.optional(Schema.String),
        domain_id: Schema.String,
        action: TagAction,
    },
    Output: { domain_id: Schema.String },
})
export const TagsRemote = Remote.define({
    entities: [TagCatalog],
    queries: [DomainTags],
    mutations: [ChangeTags],
})
