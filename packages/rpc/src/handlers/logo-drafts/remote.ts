import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    LogoDraftCatalogEntity,
    LogoDraftCatalogQuery,
    LogoDraftDetailEntity,
    LogoDraftDetailQuery,
    LogoDraftsRemote,
    SaveLogoDraft,
} from "@urm/contracts/logo-drafts"
import { LogoDraftRepository, type LogoDraftPrincipal } from "./repository.ts"

const terminal: Boundary = { _tag: "Terminal" }
const denied = () =>
    new RemoteServerError({
        message: "Logo draft unavailable or access denied",
    })
const edge = (name: string, id: string) => ({
    edges: [{ entity: name, id, key: entityKey(name, id) }],
    start: terminal,
    end: terminal,
})

export const LogoDraftsServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<LogoDraftPrincipal, LogoDraftRepository>(
            LogoDraftCatalogEntity,
            {
                read: ({ ids, principal }) =>
                    Effect.gen(function* () {
                        const id = `${principal.account_id}/${principal.domain_id}`
                        if (ids.some((candidate) => candidate !== id))
                            return yield* Effect.fail(denied())
                        return ids.length === 0
                            ? []
                            : [
                                  {
                                      id,
                                      values: yield* Effect.flatMap(
                                          LogoDraftRepository,
                                          (repository) =>
                                              repository.load_catalog(principal)
                                      ),
                                  },
                              ]
                    }).pipe(Effect.mapError(denied)),
            }
        ),
        RemoteServer.entity<LogoDraftPrincipal, LogoDraftRepository>(
            LogoDraftDetailEntity,
            {
                read: ({ ids, principal }) =>
                    Effect.gen(function* () {
                        if (ids.some((id) => id !== principal.domain_id))
                            return yield* Effect.fail(denied())
                        return ids.length === 0
                            ? []
                            : [
                                  {
                                      id: principal.domain_id,
                                      values: yield* Effect.flatMap(
                                          LogoDraftRepository,
                                          (repository) =>
                                              repository.load_detail(principal)
                                      ),
                                  },
                              ]
                    }).pipe(Effect.mapError(denied)),
            }
        ),
    ],
    queries: [
        RemoteServer.query(
            LogoDraftCatalogQuery,
            ({
                input,
                principal,
            }: {
                input: typeof LogoDraftCatalogQuery.Input.Type
                principal: LogoDraftPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(denied())
                    yield* Effect.flatMap(LogoDraftRepository, (repository) =>
                        repository.load_catalog(principal)
                    )
                    return edge(
                        LogoDraftCatalogEntity.name,
                        `${principal.account_id}/${principal.domain_id}`
                    )
                }).pipe(Effect.mapError(denied))
        ),
        RemoteServer.query(
            LogoDraftDetailQuery,
            ({
                input,
                principal,
            }: {
                input: typeof LogoDraftDetailQuery.Input.Type
                principal: LogoDraftPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(denied())
                    yield* Effect.flatMap(LogoDraftRepository, (repository) =>
                        repository.load_detail(principal)
                    )
                    return edge(LogoDraftDetailEntity.name, principal.domain_id)
                }).pipe(Effect.mapError(denied))
        ),
    ],
    mutations: [
        RemoteServer.mutation(
            SaveLogoDraft,
            ({
                input,
                principal,
            }: {
                input: typeof SaveLogoDraft.Input.Type
                principal: LogoDraftPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.domain_id !== principal.domain_id ||
                        input.account_id !== principal.account_id
                    )
                        return yield* Effect.fail(denied())
                    const output = yield* Effect.flatMap(
                        LogoDraftRepository,
                        (repository) => repository.save(principal, input.draft)
                    )
                    return {
                        output,
                        entities: [
                            Entity.patch(
                                LogoDraftDetailEntity.ref(principal.domain_id),
                                output.detail
                            ),
                            Entity.patch(
                                LogoDraftCatalogEntity.ref(
                                    `${principal.account_id}/${principal.domain_id}`
                                ),
                                output.catalog
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(denied))
        ),
    ],
})
RemoteServer.validate(LogoDraftsRemote, LogoDraftsServer)
