import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    ConfigurationLibrary,
    PublicationConfiguration,
    ChangePublicationConfiguration,
    ConfigurationRemote,
} from "@urm/contracts/publication-config"
import { PagesRepository, type PagesPrincipal } from "../pages/repository.ts"
import { PublicationConfigurationRepository } from "./repository.ts"
import { pages_library_id } from "@urm/domain/pages"
const terminal: Boundary = { _tag: "Terminal" }
const failure = () =>
    new RemoteServerError({
        message: "Pages operation unavailable or access denied",
    })
export const ConfigurationServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<PagesPrincipal, PublicationConfigurationRepository>(
            ConfigurationLibrary,
            {
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
                                    PublicationConfigurationRepository,
                                    (repository) =>
                                        repository.load_library(
                                            principal,
                                            slug === "" ? null : slug
                                        )
                                ),
                            }
                        })
                    ).pipe(Effect.mapError(failure)),
            }
        ),
    ],
    queries: [
        RemoteServer.query(
            PublicationConfiguration,
            ({
                input,
                principal,
            }: {
                input: typeof PublicationConfiguration.Input.Type
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
                                entity: ConfigurationLibrary.name,
                                id,
                                key: entityKey(ConfigurationLibrary.name, id),
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
            ChangePublicationConfiguration,
            ({
                input,
                principal,
            }: {
                input: typeof ChangePublicationConfiguration.Input.Type
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
                        PublicationConfigurationRepository,
                        (repository) =>
                            repository.change(
                                principal,
                                input.subdomain_slug,
                                input.action
                            )
                    )
                    return {
                        output: { id: library.id },
                        entities: [
                            Entity.patch(
                                ConfigurationLibrary.ref(library.id),
                                library
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
})
RemoteServer.validate(ConfigurationRemote, ConfigurationServer)

export {
    PublicationConfigurationRepository,
    PublicationConfigurationRepositoryLive,
} from "./repository.ts"
