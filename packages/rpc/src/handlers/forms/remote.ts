import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import { FormsWriteError } from "@urm/domain/forms"
import {
    FormsCatalogEntity,
    FormDetailEntity,
    FormsCatalogQuery,
    FormDetailQuery,
    ChangeForms,
    FormsRemote,
} from "@urm/contracts/forms"
import { FormsRepository, type FormsPrincipal } from "./repository.ts"

const terminal: Boundary = { _tag: "Terminal" }
const edge = (name: string, id: string) => ({
    edges: [{ entity: name, id, key: entityKey(name, id) }],
    start: terminal,
    end: terminal,
})
const failure = (error?: unknown) =>
    new RemoteServerError({
        message:
            error instanceof FormsWriteError
                ? error.message
                : "Forms unavailable or access denied",
    })

export const FormsServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<FormsPrincipal, FormsRepository>(
            FormsCatalogEntity,
            {
                read: ({ ids, principal }) =>
                    Effect.gen(function* () {
                        if (ids.some((id) => id !== principal.domain_id))
                            return yield* Effect.fail(failure())
                        return ids.length === 0
                            ? []
                            : [
                                  {
                                      id: principal.domain_id,
                                      values: yield* Effect.flatMap(
                                          FormsRepository,
                                          (repository) =>
                                              repository.load_catalog(principal)
                                      ),
                                  },
                              ]
                    }).pipe(Effect.mapError(failure)),
            }
        ),
        RemoteServer.entity<FormsPrincipal, FormsRepository>(FormDetailEntity, {
            read: ({ ids, principal }) =>
                Effect.forEach(ids, (id) =>
                    Effect.gen(function* () {
                        const prefix = `${principal.domain_id}:`
                        if (!id.startsWith(prefix))
                            return yield* Effect.fail(failure())
                        const values = yield* Effect.flatMap(
                            FormsRepository,
                            (repository) =>
                                repository.load_detail(
                                    principal,
                                    id.slice(prefix.length)
                                )
                        )
                        return { id, values }
                    })
                ).pipe(Effect.mapError(failure)),
        }),
    ],
    queries: [
        RemoteServer.query(
            FormsCatalogQuery,
            ({
                input,
                principal,
            }: {
                input: typeof FormsCatalogQuery.Input.Type
                principal: FormsPrincipal
            }) =>
                Effect.gen(function* () {
                    yield* Effect.flatMap(FormsRepository, (repository) =>
                        repository.authorize(principal, input.domain_id)
                    )
                    return edge(FormsCatalogEntity.name, input.domain_id)
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.query(
            FormDetailQuery,
            ({
                input,
                principal,
            }: {
                input: typeof FormDetailQuery.Input.Type
                principal: FormsPrincipal
            }) =>
                Effect.gen(function* () {
                    yield* Effect.flatMap(FormsRepository, (repository) =>
                        repository.authorize(principal, input.domain_id)
                    )
                    return edge(
                        FormDetailEntity.name,
                        `${input.domain_id}:${input.slug}`
                    )
                }).pipe(Effect.mapError(failure))
        ),
    ],
    mutations: [
        RemoteServer.mutation(
            ChangeForms,
            ({
                input,
                principal,
            }: {
                input: typeof ChangeForms.Input.Type
                principal: FormsPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.domain_id !== principal.domain_id ||
                        (input.account_id !== undefined &&
                            input.account_id !== principal.account_id)
                    )
                        return yield* Effect.fail(failure())
                    const outcome = yield* Effect.flatMap(
                        FormsRepository,
                        (repository) =>
                            repository.change(principal, input.action)
                    )
                    const catalog = yield* Effect.flatMap(
                        FormsRepository,
                        (repository) => repository.load_catalog(principal)
                    )
                    return {
                        output: outcome,
                        entities: [
                            Entity.patch(
                                FormsCatalogEntity.ref(principal.domain_id),
                                catalog
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
})
RemoteServer.validate(FormsRemote, FormsServer)
