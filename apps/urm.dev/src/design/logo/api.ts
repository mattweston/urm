import { Effect, Schema } from "effect"
import { Remote } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import { defineMessageUnion } from "foldkit/message"
import {
    LogoDraftCatalogEntity,
    LogoDraftCatalogQuery,
    LogoDraftDetailEntity,
    LogoDraftDetailQuery,
    SaveLogoDraft,
} from "@urm/contracts/logo-drafts"
import type { SaveLogoDraftInput } from "@urm/domain/logo-drafts"
import { ContactsApi, AccountRequestError } from "../../contacts/api.ts"

const Cache = Surface.application({
    Model: Schema.Struct({ remote: Remote.Model }),
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: { readonly remote: typeof Remote.Model.Type }) => ({
        model,
    }),
})
const LogoDrafts = Remote.make({
    model: Cache.model.remote,
    entities: [LogoDraftCatalogEntity, LogoDraftDetailEntity],
    queries: [LogoDraftCatalogQuery, LogoDraftDetailQuery],
    mutations: [SaveLogoDraft],
})
const unavailable = () =>
    new AccountRequestError({
        status: 404,
        message: "Logo drafts could not be loaded. Refresh and try again.",
    })
export const load_logo_catalog = Effect.fn("LogoDrafts.loadCatalog")(function* (
    domain_id: string
) {
    const api = yield* ContactsApi
    const query = LogoDrafts.query(
        LogoDraftCatalogQuery,
        { domain_id },
        {
            select: LogoDraftCatalogEntity.select({
                id: true,
                domain_id: true,
                drafts: true,
            }),
            first: 1,
        }
    )
    const loaded = yield* LogoDrafts.prefetch(
        { remote: Remote.initial },
        query
    ).pipe(Effect.provide(api.remote(domain_id)))
    const result = query.read(loaded)
    if (result._tag !== "Ready" || !result.value.items[0])
        return yield* Effect.fail(unavailable())
    return result.value.items[0]
})
export const load_logo_detail = Effect.fn("LogoDrafts.loadDetail")(function* (
    domain_id: string
) {
    const api = yield* ContactsApi
    const query = LogoDrafts.query(
        LogoDraftDetailQuery,
        { domain_id },
        {
            select: LogoDraftDetailEntity.select({ id: true, logo: true }),
            first: 1,
        }
    )
    const loaded = yield* LogoDrafts.prefetch(
        { remote: Remote.initial },
        query
    ).pipe(Effect.provide(api.remote(domain_id)))
    const result = query.read(loaded)
    if (result._tag !== "Ready" || !result.value.items[0])
        return yield* Effect.fail(unavailable())
    return result.value.items[0]
})
export const save_logo_draft = Effect.fn("LogoDrafts.save")(function* (
    domain_id: string,
    account_id: string,
    draft: SaveLogoDraftInput
) {
    const api = yield* ContactsApi
    const result = yield* Remote.mutate(
        SaveLogoDraft,
        { domain_id, account_id, draft },
        crypto.randomUUID()
    ).pipe(Effect.provide(api.remote(domain_id)))
    return result.output
})
