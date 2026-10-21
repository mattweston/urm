import { Schema } from "effect"
import { Entity, Mutation, Query, Remote } from "foldkit-remote"
import {
    LogoDraftCatalog,
    LogoDraftDetail,
    SaveLogoDraftInput,
} from "@urm/domain/logo-drafts"

export const LogoDraftCatalogEntity = Entity.make(
    "LogoDraftCatalog",
    LogoDraftCatalog
)
export const LogoDraftDetailEntity = Entity.make(
    "LogoDraftDetail",
    LogoDraftDetail
)
export const LogoDraftCatalogQuery = Query.make("LogoDraftCatalogQuery", {
    Input: { domain_id: Schema.String },
    Result: LogoDraftCatalogEntity,
})
export const LogoDraftDetailQuery = Query.make("LogoDraftDetailQuery", {
    Input: { domain_id: Schema.String },
    Result: LogoDraftDetailEntity,
})
export const SaveLogoDraft = Mutation.make("SaveLogoDraft", {
    Input: {
        domain_id: Schema.String,
        account_id: Schema.String,
        draft: SaveLogoDraftInput,
    },
    Output: { detail: LogoDraftDetail, catalog: LogoDraftCatalog },
})
export const LogoDraftsRemote = Remote.define({
    entities: [LogoDraftCatalogEntity, LogoDraftDetailEntity],
    queries: [LogoDraftCatalogQuery, LogoDraftDetailQuery],
    mutations: [SaveLogoDraft],
})
