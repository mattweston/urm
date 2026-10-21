import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    AccountNavigationEntity,
    AccountNavigationQuery,
    AccountPreferencesEntity,
    AccountPreferencesQuery,
    AccountPreferencesRemote,
    SaveAccountAppearance,
    SaveAccountSpotify,
    SaveAccountSidebar,
    SaveAccountModules,
} from "@urm/contracts/account-preferences"
import {
    AccountPreferencesRepository,
    type PreferencesPrincipal,
} from "./repository.ts"

const terminal: Boundary = { _tag: "Terminal" }
const denied = () =>
    new RemoteServerError({
        message: "Preferences unavailable or access denied",
    })
const edge = (name: string, id: string) => ({
    edges: [{ entity: name, id, key: entityKey(name, id) }],
    start: terminal,
    end: terminal,
})

export const AccountPreferencesServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<PreferencesPrincipal, AccountPreferencesRepository>(
            AccountPreferencesEntity,
            {
                read: ({ ids, principal }) =>
                    Effect.gen(function* () {
                        if (ids.some((id) => id !== principal.account_id))
                            return yield* Effect.fail(denied())
                        return ids.length === 0
                            ? []
                            : [
                                  {
                                      id: principal.account_id,
                                      values: yield* Effect.flatMap(
                                          AccountPreferencesRepository,
                                          (repository) =>
                                              repository.load(principal)
                                      ),
                                  },
                              ]
                    }).pipe(Effect.mapError(denied)),
            }
        ),
        RemoteServer.entity<PreferencesPrincipal, AccountPreferencesRepository>(
            AccountNavigationEntity,
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
                                          AccountPreferencesRepository,
                                          (repository) =>
                                              repository.load_navigation(
                                                  principal
                                              )
                                      ),
                                  },
                              ]
                    }).pipe(Effect.mapError(denied)),
            }
        ),
    ],
    queries: [
        RemoteServer.query(
            AccountPreferencesQuery,
            ({
                input,
                principal,
            }: {
                input: typeof AccountPreferencesQuery.Input.Type
                principal: PreferencesPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(denied())
                    yield* Effect.flatMap(
                        AccountPreferencesRepository,
                        (repository) => repository.load(principal)
                    )
                    return edge(
                        AccountPreferencesEntity.name,
                        principal.account_id
                    )
                }).pipe(Effect.mapError(denied))
        ),
        RemoteServer.query(
            AccountNavigationQuery,
            ({
                input,
                principal,
            }: {
                input: typeof AccountNavigationQuery.Input.Type
                principal: PreferencesPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(denied())
                    yield* Effect.flatMap(
                        AccountPreferencesRepository,
                        (repository) => repository.load_navigation(principal)
                    )
                    return edge(
                        AccountNavigationEntity.name,
                        `${principal.account_id}/${principal.domain_id}`
                    )
                }).pipe(Effect.mapError(denied))
        ),
    ],
    mutations: [
        RemoteServer.mutation(
            SaveAccountAppearance,
            ({
                input,
                principal,
            }: {
                input: typeof SaveAccountAppearance.Input.Type
                principal: PreferencesPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.domain_id !== principal.domain_id ||
                        input.account_id !== principal.account_id
                    )
                        return yield* Effect.fail(denied())
                    const output = yield* Effect.flatMap(
                        AccountPreferencesRepository,
                        (repository) =>
                            repository.save_appearance(principal, input)
                    )
                    const snapshot = yield* Effect.flatMap(
                        AccountPreferencesRepository,
                        (repository) => repository.load(principal)
                    )
                    return {
                        output,
                        entities: [
                            Entity.patch(
                                AccountPreferencesEntity.ref(
                                    principal.account_id
                                ),
                                snapshot
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(denied))
        ),
        RemoteServer.mutation(
            SaveAccountSpotify,
            ({
                input,
                principal,
            }: {
                input: typeof SaveAccountSpotify.Input.Type
                principal: PreferencesPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.domain_id !== principal.domain_id ||
                        input.account_id !== principal.account_id
                    )
                        return yield* Effect.fail(denied())
                    const output = yield* Effect.flatMap(
                        AccountPreferencesRepository,
                        (repository) =>
                            repository.save_spotify(
                                principal,
                                input.playlist_id
                            )
                    )
                    const snapshot = yield* Effect.flatMap(
                        AccountPreferencesRepository,
                        (repository) => repository.load(principal)
                    )
                    return {
                        output,
                        entities: [
                            Entity.patch(
                                AccountPreferencesEntity.ref(
                                    principal.account_id
                                ),
                                snapshot
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(denied))
        ),
        RemoteServer.mutation(
            SaveAccountSidebar,
            ({
                input,
                principal,
            }: {
                input: typeof SaveAccountSidebar.Input.Type
                principal: PreferencesPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.domain_id !== principal.domain_id ||
                        input.account_id !== principal.account_id
                    )
                        return yield* Effect.fail(denied())
                    const output = yield* Effect.flatMap(
                        AccountPreferencesRepository,
                        (repository) =>
                            repository.save_sidebar(principal, input)
                    )
                    return {
                        output,
                        entities: [
                            Entity.patch(
                                AccountNavigationEntity.ref(output.id),
                                output
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(denied))
        ),
        RemoteServer.mutation(
            SaveAccountModules,
            ({
                input,
                principal,
            }: {
                input: typeof SaveAccountModules.Input.Type
                principal: PreferencesPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.domain_id !== principal.domain_id ||
                        input.account_id !== principal.account_id
                    )
                        return yield* Effect.fail(denied())
                    const output = yield* Effect.flatMap(
                        AccountPreferencesRepository,
                        (repository) =>
                            repository.save_modules(
                                principal,
                                input.enabled_modules
                            )
                    )
                    return {
                        output,
                        entities: [
                            Entity.patch(
                                AccountNavigationEntity.ref(output.id),
                                output
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(denied))
        ),
    ],
})
RemoteServer.validate(AccountPreferencesRemote, AccountPreferencesServer)
