import { Effect, Schema } from "effect"
import { Remote } from "foldkit-remote"
import { Surface } from "foldkit-surface"
import { defineMessageUnion } from "foldkit/message"
import {
    SysadminSessionsEntity,
    SysadminSessionsQuery,
    SysadminTelemetryEntity,
    SysadminTelemetryQuery,
    SysadminProcessEntity,
    SysadminProcessQuery,
} from "@urm/contracts/sysadmin"
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
    entities: [
        SysadminSessionsEntity,
        SysadminTelemetryEntity,
        SysadminProcessEntity,
    ],
    queries: [
        SysadminSessionsQuery,
        SysadminTelemetryQuery,
        SysadminProcessQuery,
    ],
})
export const load_sessions = Effect.fn("Sysadmin.loadSessions")(function* (
    domain_id: string,
    all_tenants: boolean,
    as_of: number
) {
    const api = yield* ContactsApi
    const query = Data.query(
        SysadminSessionsQuery,
        { domain_id, all_tenants, as_of },
        {
            select: SysadminSessionsEntity.select({
                id: true,
                sessions: true,
                as_of: true,
                has_more: true,
                scope_name: true,
                can_view_all: true,
            }),
            first: 1,
        }
    )
    const loaded = yield* Data.prefetch({ remote: Remote.initial }, query).pipe(
        Effect.provide(api.remote(domain_id))
    )
    const result = query.read(loaded)
    if (result._tag !== "Ready" || !result.value.items[0])
        return yield* Effect.fail(
            new AccountRequestError({
                status: 403,
                message:
                    "Sysadmin sessions are unavailable or access was denied.",
            })
        )
    return result.value.items[0]
})

export const load_telemetry = Effect.fn("Sysadmin.loadTelemetry")(function* (
    input: typeof SysadminTelemetryQuery.Input.Type
) {
    const api = yield* ContactsApi
    const query = Data.query(SysadminTelemetryQuery, input, {
        select: SysadminTelemetryEntity.select({
            id: true,
            events: true,
            logs: true,
            errors: true,
            spans: true,
            has_more: true,
            scope_name: true,
            can_view_all: true,
        }),
        first: 1,
    })
    const loaded = yield* Data.prefetch({ remote: Remote.initial }, query).pipe(
        Effect.provide(api.remote(input.domain_id))
    )
    const result = query.read(loaded)
    if (result._tag !== "Ready" || !result.value.items[0])
        return yield* Effect.fail(
            new AccountRequestError({
                status: 403,
                message:
                    "Sysadmin telemetry is unavailable or access was denied.",
            })
        )
    return result.value.items[0]
})

export const load_process = Effect.fn("Sysadmin.loadProcess")(function* (
    domain_id: string,
    refresh: number
) {
    const api = yield* ContactsApi
    const query = Data.query(
        SysadminProcessQuery,
        { domain_id, refresh },
        {
            select: SysadminProcessEntity.select({
                id: true,
                metrics: true,
                system: true,
            }),
            first: 1,
        }
    )
    const loaded = yield* Data.prefetch({ remote: Remote.initial }, query).pipe(
        Effect.provide(api.remote(domain_id))
    )
    const result = query.read(loaded)
    if (result._tag !== "Ready" || !result.value.items[0])
        return yield* Effect.fail(
            new AccountRequestError({
                status: 403,
                message:
                    "Sysadmin process data is unavailable or access was denied.",
            })
        )
    return result.value.items[0]
})
