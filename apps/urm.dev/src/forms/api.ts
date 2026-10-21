import { Effect, Schema } from "effect"
import { Remote } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import { defineMessageUnion } from "foldkit/message"
import {
    FormsCatalogEntity,
    FormDetailEntity,
    FormsCatalogQuery,
    FormDetailQuery,
    ChangeForms,
} from "@urm/contracts/forms"
import { FormsAction } from "@urm/domain/forms"
import { ContactsApi, AccountRequestError } from "../contacts/api.ts"

const Cache = Surface.application({
    Model: Schema.Struct({ remote: Remote.Model }),
    Message: defineMessageUnion({ ...Remote.messages }),
    initial: { remote: Remote.initial },
    update: (model: { readonly remote: typeof Remote.Model.Type }) => ({
        model,
    }),
})
const Forms = Remote.make({
    model: Cache.model.remote,
    entities: [FormsCatalogEntity, FormDetailEntity],
    queries: [FormsCatalogQuery, FormDetailQuery],
    mutations: [ChangeForms],
})
const catalog_query = (domain_id: string) =>
    Forms.query(
        FormsCatalogQuery,
        { domain_id },
        {
            select: FormsCatalogEntity.select({
                id: true,
                can_write: true,
                forms: true,
                templates: true,
            }),
            first: 1,
        }
    )
const detail_query = (domain_id: string, slug: string) =>
    Forms.query(
        FormDetailQuery,
        { domain_id, slug },
        {
            select: FormDetailEntity.select({
                id: true,
                domain_id: true,
                form: true,
                fields: true,
            }),
            first: 1,
        }
    )
const missing = () =>
    new AccountRequestError({
        status: 404,
        message: "Forms could not be loaded. Refresh and try again.",
    })

export const load_catalog = Effect.fn("Forms.loadCatalog")(function* (
    domain_id: string
) {
    const api = yield* ContactsApi
    const query = catalog_query(domain_id)
    const loaded = yield* Forms.prefetch(
        { remote: Remote.initial },
        query
    ).pipe(Effect.provide(api.remote(domain_id)))
    const result = query.read(loaded)
    if (result._tag !== "Ready" || !result.value.items[0])
        return yield* Effect.fail(missing())
    return result.value.items[0]
})
export const load_detail = Effect.fn("Forms.loadDetail")(function* (
    domain_id: string,
    slug: string
) {
    const api = yield* ContactsApi
    const query = detail_query(domain_id, slug)
    const loaded = yield* Forms.prefetch(
        { remote: Remote.initial },
        query
    ).pipe(Effect.provide(api.remote(domain_id)))
    const result = query.read(loaded)
    if (result._tag !== "Ready" || !result.value.items[0])
        return yield* Effect.fail(missing())
    return result.value.items[0]
})
export const change_forms = Effect.fn("Forms.change")(function* (
    domain_id: string,
    action: FormsAction
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
                message: "Forms access changed. Sign in or refresh.",
            })
        )
    const result = yield* Remote.mutate(
        ChangeForms,
        { domain_id, account_id: session.account_id, action },
        crypto.randomUUID()
    ).pipe(Effect.provide(api.remote(domain_id)))
    return result.output
})
