import { Effect, Schema } from "effect"
import { Remote } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import { defineMessageUnion } from "foldkit/message"
import {
    DataWorkspaceEntity,
    DataTableRowsEntity,
    DataUploadRowsEntity,
    DataWorkspaceQuery,
    DataTableRowsQuery,
    DataUploadRowsQuery,
    ChangeData,
} from "@urm/contracts/data"
import { DataAction } from "@urm/domain/data"
import { ContactsApi, AccountRequestError } from "../contacts/api.ts"

const Cache = Surface.application({
    Model: Schema.Struct({ remote: Remote.Model }),
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: { readonly remote: typeof Remote.Model.Type }) => ({
        model,
    }),
})
const Data = Remote.make({
    model: Cache.model.remote,
    entities: [DataWorkspaceEntity, DataTableRowsEntity, DataUploadRowsEntity],
    queries: [DataWorkspaceQuery, DataTableRowsQuery, DataUploadRowsQuery],
    mutations: [ChangeData],
})
const workspace_query = (domain_id: string) =>
    Data.query(
        DataWorkspaceQuery,
        { domain_id },
        {
            select: DataWorkspaceEntity.select({
                id: true,
                can_write: true,
                tables: true,
                uploads: true,
            }),
            first: 1,
        }
    )
const table_rows_query = (domain_id: string, table_id: string) =>
    Data.query(
        DataTableRowsQuery,
        { domain_id, table_id },
        {
            select: DataTableRowsEntity.select({
                id: true,
                domain_id: true,
                rows: true,
            }),
            first: 1,
        }
    )
const upload_rows_query = (domain_id: string, upload_id: string) =>
    Data.query(
        DataUploadRowsQuery,
        { domain_id, upload_id },
        {
            select: DataUploadRowsEntity.select({
                id: true,
                domain_id: true,
                rows: true,
            }),
            first: 1,
        }
    )
const missing = () =>
    new AccountRequestError({
        status: 404,
        message: "Data could not be loaded. Refresh and try again.",
    })
export const load_workspace = Effect.fn("Data.loadWorkspace")(function* (
    domain_id: string
) {
    const api = yield* ContactsApi
    const query = workspace_query(domain_id)
    const loaded = yield* Data.prefetch({ remote: Remote.initial }, query).pipe(
        Effect.provide(api.remote(domain_id))
    )
    const result = query.read(loaded)
    if (result._tag !== "Ready" || !result.value.items[0])
        return yield* Effect.fail(missing())
    return result.value.items[0]
})
export const load_table_rows = Effect.fn("Data.loadTableRows")(function* (
    domain_id: string,
    table_id: string
) {
    const api = yield* ContactsApi
    const query = table_rows_query(domain_id, table_id)
    const loaded = yield* Data.prefetch({ remote: Remote.initial }, query).pipe(
        Effect.provide(api.remote(domain_id))
    )
    const result = query.read(loaded)
    if (result._tag !== "Ready" || !result.value.items[0])
        return yield* Effect.fail(missing())
    return result.value.items[0]
})
export const load_upload_rows = Effect.fn("Data.loadUploadRows")(function* (
    domain_id: string,
    upload_id: string
) {
    const api = yield* ContactsApi
    const query = upload_rows_query(domain_id, upload_id)
    const loaded = yield* Data.prefetch({ remote: Remote.initial }, query).pipe(
        Effect.provide(api.remote(domain_id))
    )
    const result = query.read(loaded)
    if (result._tag !== "Ready" || !result.value.items[0])
        return yield* Effect.fail(missing())
    return result.value.items[0]
})
export const change_data = Effect.fn("Data.change")(function* (
    domain_id: string,
    action: DataAction
) {
    const api = yield* ContactsApi
    const session = yield* api.session()
    if (
        !session.domains.some(
            (workspace) => workspace.id === domain_id && workspace.can_write
        )
    )
        return yield* Effect.fail(
            new AccountRequestError({
                status: 403,
                message: "Data access changed. Sign in or refresh.",
            })
        )
    const outcome = yield* Remote.mutate(
        ChangeData,
        { domain_id, account_id: session.account_id, action },
        crypto.randomUUID()
    ).pipe(Effect.provide(api.remote(domain_id)))
    return outcome.output.changed_id
})
