import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    PagesLibrary,
    PublicationPages,
    ChangePages,
    PagesRemote,
    pages_library_id,
} from "@urm/contracts/pages"
import { PagesRepository, type PagesPrincipal } from "./repository.ts"
const terminal: Boundary = { _tag: "Terminal" }
const failure = () =>
    new RemoteServerError({
        message: "Pages operation unavailable or access denied",
    })
export const PagesServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<PagesPrincipal, PagesRepository>(PagesLibrary, {
            read: ({ ids, principal }) =>
                Effect.forEach(ids, (id) =>
                    Effect.gen(function* () {
                        const prefix = `${principal.domain_id}:`
                        if (!id.startsWith(prefix))
                            return yield* Effect.fail(failure())
                        const slug = id.slice(prefix.length)
                        return {
                            id,
                            values: yield* Effect.flatMap(
                                PagesRepository,
                                (repository) =>
                                    repository.load_library(
                                        principal,
                                        slug === "" ? null : slug
                                    )
                            ),
                        }
                    })
                ).pipe(Effect.mapError(failure)),
        }),
    ],
    queries: [
        RemoteServer.query(
            PublicationPages,
            ({
                input,
                principal,
            }: {
                input: typeof PublicationPages.Input.Type
                principal: PagesPrincipal
            }) =>
                Effect.gen(function* () {
                    yield* Effect.flatMap(PagesRepository, (repository) =>
                        repository.authorize_pages(
                            principal,
                            input.domain_id,
                            input.subdomain_slug
                        )
                    )
                    const id = pages_library_id(
                        input.domain_id,
                        input.subdomain_slug
                    )
                    return {
                        edges: [
                            {
                                entity: PagesLibrary.name,
                                id,
                                key: entityKey(PagesLibrary.name, id),
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
            ChangePages,
            ({
                input,
                principal,
            }: {
                input: typeof ChangePages.Input.Type
                principal: PagesPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.account_id !== undefined &&
                        input.account_id !== principal.account_id
                    )
                        return yield* Effect.fail(failure())
                    yield* Effect.flatMap(PagesRepository, (repository) =>
                        repository.authorize_pages(
                            principal,
                            input.domain_id,
                            input.subdomain_slug,
                            true
                        )
                    )
                    const library = yield* Effect.flatMap(
                        PagesRepository,
                        (repository) =>
                            repository.change_pages(
                                principal,
                                input.subdomain_slug,
                                input.action
                            )
                    )
                    return {
                        output: { id: library.id },
                        entities: [
                            Entity.patch(PagesLibrary.ref(library.id), library),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
})
RemoteServer.validate(PagesRemote, PagesServer)

export { PagesRepository, PagesRepositoryLive } from "./repository.ts"
