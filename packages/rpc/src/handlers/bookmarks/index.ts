import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    ChangeBookmarks,
    DomainBookmarks,
    BookmarkCatalog,
    BookmarksRemote,
} from "@urm/contracts/bookmarks"
import { BookmarksRepository, type BookmarksPrincipal } from "./repository.ts"
const terminal: Boundary = { _tag: "Terminal" }
const failure = () =>
    new RemoteServerError({
        message: "Bookmark operation unavailable or access denied",
    })
export const BookmarksServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<BookmarksPrincipal, BookmarksRepository>(
            BookmarkCatalog,
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
                                          BookmarksRepository,
                                          (repository) =>
                                              repository.load_catalog(principal)
                                      ),
                                  },
                              ]
                    }).pipe(Effect.mapError(failure)),
            }
        ),
    ],
    queries: [
        RemoteServer.query(
            DomainBookmarks,
            ({
                input,
                principal,
            }: {
                input: typeof DomainBookmarks.Input.Type
                principal: BookmarksPrincipal
            }) =>
                Effect.gen(function* () {
                    yield* Effect.flatMap(BookmarksRepository, (repository) =>
                        repository.authorize_bookmarks(
                            principal,
                            input.domain_id
                        )
                    )
                    return {
                        edges: [
                            {
                                entity: BookmarkCatalog.name,
                                id: input.domain_id,
                                key: entityKey(
                                    BookmarkCatalog.name,
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
            ChangeBookmarks,
            ({
                input,
                principal,
            }: {
                input: typeof ChangeBookmarks.Input.Type
                principal: BookmarksPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.account_id !== undefined &&
                        input.account_id !== principal.account_id
                    )
                        return yield* Effect.fail(failure())
                    yield* Effect.flatMap(BookmarksRepository, (repository) =>
                        repository.authorize_bookmarks(
                            principal,
                            input.domain_id,
                            true
                        )
                    )
                    const library = yield* Effect.flatMap(
                        BookmarksRepository,
                        (repository) =>
                            repository.change_bookmarks(principal, input.action)
                    )
                    return {
                        output: { domain_id: library.id },
                        entities: [
                            Entity.patch(
                                BookmarkCatalog.ref(library.id),
                                library
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
})
RemoteServer.validate(BookmarksRemote, BookmarksServer)

export { BookmarksRepository, BookmarksRepositoryLive } from "./repository.ts"
