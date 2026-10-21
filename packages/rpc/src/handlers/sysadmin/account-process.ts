import { Effect, Metric, Schema } from "effect"
import { entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import type { AccountPrincipal } from "@urm/auth"
import {
    SysadminProcessEntity,
    SysadminProcessQuery,
    SysadminRemote,
} from "@urm/contracts/sysadmin"
import { SysadminSessionsRepository } from "./account-sessions.ts"
import { systemSnapshot, toStudioMetric } from "./handlers.ts"

interface Principal extends AccountPrincipal {
    readonly domain_id: string
}
const Key = Schema.Struct({
    domain_id: Schema.String,
    refresh: Schema.Number,
})
const denied = () =>
    new RemoteServerError({ message: "Sysadmin access denied" })
const key = (input: typeof Key.Type) => JSON.stringify(input)
const load = Effect.fn("Sysadmin.loadProcess")(function* (
    principal: Principal,
    input: typeof Key.Type
) {
    if (!Number.isFinite(input.refresh)) return yield* Effect.fail(denied())
    const repository = yield* SysadminSessionsRepository
    yield* repository.authorize(principal, {
        domain_id: input.domain_id,
        all_tenants: true,
        as_of: Date.now(),
    })
    const metrics = yield* Metric.snapshot
    return {
        id: key(input),
        metrics: metrics.map(toStudioMetric),
        system: systemSnapshot(),
    }
})
const terminal: Boundary = { _tag: "Terminal" }

export const SysadminProcessServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<Principal, SysadminSessionsRepository>(
            SysadminProcessEntity,
            {
                read: ({ ids, principal }) =>
                    Effect.forEach(ids, (id) =>
                        Effect.gen(function* () {
                            const parsed = yield* Effect.try(() =>
                                JSON.parse(id)
                            )
                            const input =
                                yield* Schema.decodeUnknownEffect(Key)(parsed)
                            return { id, values: yield* load(principal, input) }
                        })
                    ).pipe(Effect.mapError(denied)),
            }
        ),
    ],
    queries: [
        RemoteServer.query(
            SysadminProcessQuery,
            ({
                input,
                principal,
            }: {
                input: typeof Key.Type
                principal: Principal
            }) =>
                load(principal, input).pipe(
                    Effect.as({
                        edges: [
                            {
                                entity: SysadminProcessEntity.name,
                                id: key(input),
                                key: entityKey(
                                    SysadminProcessEntity.name,
                                    key(input)
                                ),
                            },
                        ],
                        start: terminal,
                        end: terminal,
                    }),
                    Effect.mapError(denied)
                )
        ),
    ],
})
RemoteServer.validate(SysadminRemote, SysadminProcessServer)
export const sysadmin_process_handlers = (principal: Principal) =>
    RemoteServer.handlers(SysadminProcessServer, principal)
