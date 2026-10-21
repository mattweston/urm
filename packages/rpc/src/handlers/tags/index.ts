import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    ChangeTags,
    DomainTags,
    TagCatalog,
    TagsRemote,
} from "@urm/contracts/tags"
import { TagsRepository, type TagsPrincipal } from "./repository.ts"
const terminal: Boundary = { _tag: "Terminal" }
const failure = () =>
    new RemoteServerError({
        message: "Tag operation unavailable or access denied",
    })
export const TagsServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<TagsPrincipal, TagsRepository>(TagCatalog, {
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
                                      TagsRepository,
                                      (repository) =>
                                          repository.load_catalog(principal)
                                  ),
                              },
                          ]
                }).pipe(Effect.mapError(failure)),
        }),
    ],
    queries: [
        RemoteServer.query(
            DomainTags,
            ({
                input,
                principal,
            }: {
                input: typeof DomainTags.Input.Type
                principal: TagsPrincipal
            }) =>
                Effect.gen(function* () {
                    yield* Effect.flatMap(TagsRepository, (repository) =>
                        repository.authorize_tags(principal, input.domain_id)
                    )
                    return {
                        edges: [
                            {
                                entity: TagCatalog.name,
                                id: input.domain_id,
                                key: entityKey(
                                    TagCatalog.name,
                                    input.domain_id
                                ),
                            },
                        ],
                        start: terminal,
                        end: terminal,
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
    mutations: [
        RemoteServer.mutation(
            ChangeTags,
            ({
                input,
                principal,
            }: {
                input: typeof ChangeTags.Input.Type
                principal: TagsPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.account_id !== undefined &&
                        input.account_id !== principal.account_id
                    )
                        return yield* Effect.fail(failure())
                    yield* Effect.flatMap(TagsRepository, (repository) =>
                        repository.authorize_tags(
                            principal,
                            input.domain_id,
                            input.action._tag !== "sync_directory"
                        )
                    )
                    const library = yield* Effect.flatMap(
                        TagsRepository,
                        (repository) =>
                            repository.change_tags(principal, input.action)
                    )
                    return {
                        output: { domain_id: library.id },
                        entities: [
                            Entity.patch(TagCatalog.ref(library.id), library),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
})
RemoteServer.validate(TagsRemote, TagsServer)

export { TagsRepository, TagsRepositoryLive } from "./repository.ts"
