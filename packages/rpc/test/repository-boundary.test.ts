import { Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"
import { RemoteServer } from "foldkit-remote-server"
import { REMOTE_PROTOCOL_VERSION } from "foldkit-remote"
import { BookmarksWriteError } from "@urm/domain/bookmarks"
import {
    BookmarksRepository,
    BookmarksServer,
} from "../src/handlers/bookmarks/index.ts"

const principal = {
    account_id: "account",
    contact_id: null,
    session_id: "session",
    domain_id: "domain",
}
const catalog = {
    id: "domain",
    bookmarks: [
        {
            id: "bookmark",
            title: "Documentation",
            href: "https://example.com",
            tags: [],
            updated_at: 1,
        },
    ],
}
const handlers = RemoteServer.handlers(BookmarksServer, principal)

const repository_layer = (denied: boolean) =>
    Layer.succeed(
        BookmarksRepository,
        BookmarksRepository.of({
            authorize_bookmarks: () => Effect.succeed(undefined),
            load_catalog: () => Effect.succeed(catalog),
            change_bookmarks: () =>
                denied
                    ? Effect.fail(
                          new BookmarksWriteError({
                              message: "private persistence detail",
                          })
                      )
                    : Effect.succeed(catalog),
        })
    )

describe("Remote repository boundary", () => {
    it("reads and patches domain records with a repository stub and no SQL service", async () => {
        const read = await Effect.runPromise(
            handlers
                .FoldkitRemoteRead({
                    version: REMOTE_PROTOCOL_VERSION,
                    requests: [
                        {
                            entity: "BookmarkCatalog",
                            id: "domain",
                            fields: ["id", "bookmarks"],
                        },
                    ],
                })
                .pipe(Effect.provide(repository_layer(false)))
        )
        expect(JSON.stringify(read)).toContain("Documentation")
        const changed = await Effect.runPromise(
            handlers
                .FoldkitRemoteMutate({
                    requestId: "request",
                    mutation: "ChangeBookmarks",
                    input: {
                        domain_id: "domain",
                        action: { _tag: "delete", id: "bookmark" },
                    },
                })
                .pipe(Effect.provide(repository_layer(false)))
        )
        expect(JSON.stringify(changed)).toContain("Documentation")
    })

    it("maps repository failures to the transport error without exposing internal details", async () => {
        const result = await Effect.runPromise(
            handlers
                .FoldkitRemoteMutate({
                    requestId: "denied",
                    mutation: "ChangeBookmarks",
                    input: {
                        domain_id: "domain",
                        action: { _tag: "delete", id: "bookmark" },
                    },
                })
                .pipe(Effect.result, Effect.provide(repository_layer(true)))
        )
        expect(result._tag).toBe("Failure")
        expect(JSON.stringify(result)).not.toContain(
            "private persistence detail"
        )
    })
})
