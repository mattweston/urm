import { Effect } from "effect"
import { PublishingError } from "@urm/domain/publishing"
import { DeploymentBuildError } from "@urm/ssg/errors"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    PublishingLibrary,
    PublishingJobs,
    PublicationJobs,
    PublicationPromotionJobs,
    PublicationReleases,
    BuildPublication,
    DeployDevelopment,
    PromotePublication,
    CancelDeployment,
    PublishingRemote,
    PublishingOwners,
    PublicationOwners,
    DeploySubdomain,
} from "@urm/contracts/publishing"
import { SiteBuildWriterLive } from "@urm/ssg/write-site-build"
import { PublishingRepository } from "./repository.ts"
import { PagesRepository, type PagesPrincipal } from "../pages/repository.ts"
import { ReleaseAssetStorageLive } from "./assets.ts"
import { build_publication } from "./build.ts"
const terminal: Boundary = { _tag: "Terminal" }
const failure = (error?: unknown) =>
    new RemoteServerError({
        message:
            error instanceof PublishingError
                ? error.message
                : error instanceof DeploymentBuildError &&
                    error.operation ===
                        "copy URM landing assets: bundled assets are restricted to urm.urm.dev"
                  ? "This landing page uses URM bundled logos, which can only be built for urm.urm.dev. Replace those logos with your workspace images or use the marketing starter template."
                  : "Publication build unavailable. Check publication access and content.",
    })
export const PublishingServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<PagesPrincipal, PublishingRepository>(
            PublishingOwners,
            {
                read: ({ ids, principal }) =>
                    Effect.forEach(ids, (id) =>
                        Effect.gen(function* () {
                            if (id !== principal.domain_id)
                                return yield* Effect.fail(failure())
                            const repository = yield* PublishingRepository
                            return {
                                id,
                                values: yield* repository.load_owners(
                                    principal
                                ),
                            }
                        })
                    ).pipe(Effect.mapError(failure)),
            }
        ),
        RemoteServer.entity<
            PagesPrincipal,
            PagesRepository | PublishingRepository
        >(PublishingJobs, {
            read: ({ ids, principal }) =>
                Effect.forEach(ids, (id) =>
                    Effect.gen(function* () {
                        const repository = yield* PublishingRepository
                        const prefix = `${principal.domain_id}:`
                        if (!id.startsWith(prefix))
                            return yield* Effect.fail(failure())
                        const pages = yield* PagesRepository
                        const owner = yield* pages.authorize_pages(
                            principal,
                            principal.domain_id,
                            id.slice(prefix.length) || null
                        )
                        return {
                            id,
                            values: {
                                id,
                                jobs: yield* repository.load_jobs(
                                    principal.domain_id,
                                    owner.subdomain_id
                                ),
                            },
                        }
                    })
                ).pipe(Effect.mapError(failure)),
        }),
        RemoteServer.entity<PagesPrincipal, PublishingRepository>(
            PublishingLibrary,
            {
                read: ({ ids, principal }) =>
                    Effect.forEach(ids, (id) =>
                        Effect.gen(function* () {
                            const prefix = `${principal.domain_id}:`
                            if (!id.startsWith(prefix))
                                return yield* Effect.fail(failure())
                            const repository = yield* PublishingRepository
                            return {
                                id,
                                values: yield* repository.load_library(
                                    principal,
                                    id.slice(prefix.length) || null
                                ),
                            }
                        })
                    ).pipe(Effect.mapError(failure)),
            }
        ),
    ],
    queries: [
        RemoteServer.query(
            PublicationOwners,
            ({
                input,
                principal,
            }: {
                input: typeof PublicationOwners.Input.Type
                principal: PagesPrincipal
            }) =>
                Effect.gen(function* () {
                    const pages = yield* PagesRepository
                    yield* pages.authorize_pages(
                        principal,
                        input.domain_id,
                        null
                    )
                    return {
                        edges: [
                            {
                                entity: PublishingOwners.name,
                                id: input.domain_id,
                                key: entityKey(
                                    PublishingOwners.name,
                                    input.domain_id
                                ),
                            },
                        ],
                        start: terminal,
                        end: terminal,
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.query(
            PublicationJobs,
            ({
                input,
                principal,
            }: {
                input: typeof PublicationJobs.Input.Type
                principal: PagesPrincipal
            }) =>
                Effect.gen(function* () {
                    const pages = yield* PagesRepository
                    yield* pages.authorize_pages(
                        principal,
                        input.domain_id,
                        input.subdomain_slug
                    )
                    const id = `${input.domain_id}:${input.subdomain_slug ?? ""}`
                    return {
                        edges: [
                            {
                                entity: PublishingJobs.name,
                                id,
                                key: entityKey(PublishingJobs.name, id),
                            },
                        ],
                        start: terminal,
                        end: terminal,
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.query(
            PublicationPromotionJobs,
            ({
                input,
                principal,
            }: {
                input: typeof PublicationPromotionJobs.Input.Type
                principal: PagesPrincipal
            }) =>
                Effect.gen(function* () {
                    const pages = yield* PagesRepository
                    yield* pages.authorize_pages(
                        principal,
                        input.domain_id,
                        input.subdomain_slug
                    )
                    const id = `${input.domain_id}:${input.subdomain_slug ?? ""}`
                    return {
                        edges: [
                            {
                                entity: PublishingJobs.name,
                                id,
                                key: entityKey(PublishingJobs.name, id),
                            },
                        ],
                        start: terminal,
                        end: terminal,
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.query(
            PublicationReleases,
            ({
                input,
                principal,
            }: {
                input: typeof PublicationReleases.Input.Type
                principal: PagesPrincipal
            }) =>
                Effect.gen(function* () {
                    const repository = yield* PagesRepository
                    yield* repository.authorize_pages(
                        principal,
                        input.domain_id,
                        input.subdomain_slug
                    )
                    const id = `${input.domain_id}:${input.subdomain_slug ?? ""}`
                    return {
                        edges: [
                            {
                                entity: PublishingLibrary.name,
                                id,
                                key: entityKey(PublishingLibrary.name, id),
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
            DeployDevelopment,
            ({
                input,
                principal,
            }: {
                input: typeof DeployDevelopment.Input.Type
                principal: PagesPrincipal
            }) =>
                Effect.gen(function* () {
                    const repository = yield* PublishingRepository
                    const id = yield* repository.request_development(
                        principal,
                        input
                    )
                    const library = yield* repository.load_library(
                        principal,
                        input.subdomain_slug
                    )
                    return {
                        output: { id },
                        entities: [
                            Entity.patch(
                                PublishingLibrary.ref(library.id),
                                library
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.mutation(
            PromotePublication,
            ({
                input,
                principal,
            }: {
                input: typeof PromotePublication.Input.Type
                principal: PagesPrincipal
            }) =>
                Effect.gen(function* () {
                    const repository = yield* PublishingRepository
                    const id = yield* repository.request_promotion(
                        principal,
                        input
                    )
                    const library = yield* repository.load_library(
                        principal,
                        input.subdomain_slug
                    )
                    return {
                        output: { id },
                        entities: [
                            Entity.patch(
                                PublishingLibrary.ref(library.id),
                                library
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.mutation(
            DeploySubdomain,
            ({
                input,
                principal,
            }: {
                input: typeof DeploySubdomain.Input.Type
                principal: PagesPrincipal
            }) =>
                Effect.gen(function* () {
                    const repository = yield* PublishingRepository
                    const id = yield* repository.request_subdomain(
                        principal,
                        input
                    )
                    const library = yield* repository.load_library(
                        principal,
                        input.subdomain_slug
                    )
                    return {
                        output: { id },
                        entities: [
                            Entity.patch(
                                PublishingLibrary.ref(library.id),
                                library
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.mutation(
            CancelDeployment,
            ({
                input,
                principal,
            }: {
                input: typeof CancelDeployment.Input.Type
                principal: PagesPrincipal
            }) =>
                Effect.gen(function* () {
                    const repository = yield* PublishingRepository
                    const id = yield* repository.cancel_development(
                        principal,
                        input
                    )
                    const library = yield* repository.load_library(
                        principal,
                        input.subdomain_slug
                    )
                    return {
                        output: { id },
                        entities: [
                            Entity.patch(
                                PublishingLibrary.ref(library.id),
                                library
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.mutation(
            BuildPublication,
            ({
                input,
                principal,
            }: {
                input: typeof BuildPublication.Input.Type
                principal: PagesPrincipal
            }) =>
                Effect.gen(function* () {
                    const id = yield* build_publication(principal, input)
                    const repository = yield* PublishingRepository
                    const library = yield* repository.load_library(
                        principal,
                        input.subdomain_slug
                    )
                    return {
                        output: { id },
                        entities: [
                            Entity.patch(
                                PublishingLibrary.ref(library.id),
                                library
                            ),
                        ],
                    }
                }).pipe(
                    Effect.provide([
                        SiteBuildWriterLive,
                        ReleaseAssetStorageLive,
                    ]),
                    Effect.mapError(failure)
                )
        ),
    ],
})
RemoteServer.validate(PublishingRemote, PublishingServer)
export { PublishingRepository, PublishingRepositoryLive } from "./repository.ts"

export { build_publication } from "./build.ts"
export { ReleaseAssetStorage } from "./assets.ts"

export { development_worker_live, run_development_job } from "./deployment.ts"
