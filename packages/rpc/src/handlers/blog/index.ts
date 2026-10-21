import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    BlogLibrary,
    PublicationBlog,
    ChangeBlog,
    BlogRemote,
    blog_library_id,
} from "@urm/contracts/blog"
import { BlogRepository, type BlogPrincipal } from "./repository.ts"
const terminal: Boundary = { _tag: "Terminal" }
const failure = () =>
    new RemoteServerError({
        message: "Blog operation unavailable or access denied",
    })
export const BlogServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<BlogPrincipal, BlogRepository>(BlogLibrary, {
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
                                BlogRepository,
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
            PublicationBlog,
            ({
                input,
                principal,
            }: {
                input: typeof PublicationBlog.Input.Type
                principal: BlogPrincipal
            }) =>
                Effect.gen(function* () {
                    yield* Effect.flatMap(BlogRepository, (repository) =>
                        repository.authorize_blog(
                            principal,
                            input.domain_id,
                            input.subdomain_slug
                        )
                    )
                    const id = blog_library_id(
                        input.domain_id,
                        input.subdomain_slug
                    )
                    return {
                        edges: [
                            {
                                entity: BlogLibrary.name,
                                id,
                                key: entityKey(BlogLibrary.name, id),
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
            ChangeBlog,
            ({
                input,
                principal,
            }: {
                input: typeof ChangeBlog.Input.Type
                principal: BlogPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.account_id !== undefined &&
                        input.account_id !== principal.account_id
                    )
                        return yield* Effect.fail(failure())
                    yield* Effect.flatMap(BlogRepository, (repository) =>
                        repository.authorize_blog(
                            principal,
                            input.domain_id,
                            input.subdomain_slug,
                            true
                        )
                    )
                    const library = yield* Effect.flatMap(
                        BlogRepository,
                        (repository) =>
                            repository.change_blog(
                                principal,
                                input.subdomain_slug,
                                input.action
                            )
                    )
                    return {
                        output: { id: library.id },
                        entities: [
                            Entity.patch(BlogLibrary.ref(library.id), library),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
})
RemoteServer.validate(BlogRemote, BlogServer)

export { BlogRepository, BlogRepositoryLive } from "./repository.ts"
