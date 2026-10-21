import { Entity, Mutation, Query, Remote } from "foldkit-remote"
import { Schema } from "effect"
import {
    DataWorkspace,
    DataTableRows,
    DataUploadRows,
    DataAction,
} from "@urm/domain/data"

export const DataWorkspaceEntity = Entity.make("DataWorkspace", DataWorkspace)
export const DataTableRowsEntity = Entity.make("DataTableRows", DataTableRows)
export const DataUploadRowsEntity = Entity.make(
    "DataUploadRows",
    DataUploadRows
)
export const DataWorkspaceQuery = Query.make("DataWorkspaceQuery", {
    Input: { domain_id: Schema.String },
    Result: DataWorkspaceEntity,
})
export const DataTableRowsQuery = Query.make("DataTableRowsQuery", {
    Input: { domain_id: Schema.String, table_id: Schema.String },
    Result: DataTableRowsEntity,
})
export const DataUploadRowsQuery = Query.make("DataUploadRowsQuery", {
    Input: { domain_id: Schema.String, upload_id: Schema.String },
    Result: DataUploadRowsEntity,
})
export const ChangeData = Mutation.make("ChangeData", {
    Input: {
        domain_id: Schema.String,
        account_id: Schema.optional(Schema.String),
        action: DataAction,
    },
    Output: { changed_id: Schema.String },
})
export const DataRemote = Remote.define({
    entities: [DataWorkspaceEntity, DataTableRowsEntity, DataUploadRowsEntity],
    queries: [DataWorkspaceQuery, DataTableRowsQuery, DataUploadRowsQuery],
    mutations: [ChangeData],
})
