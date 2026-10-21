import { SubdomainError } from "@urm/domain/subdomains"
import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    ChangeSubdomains,
    DomainSubdomains,
    SubdomainCatalog,
    SubdomainsRemote,
} from "@urm/contracts/subdomains"
import { SubdomainsRepository, type SubdomainsPrincipal } from "./repository.ts"
const terminal: Boundary = { _tag: "Terminal" }
const failure = (error?: unknown) =>
    new RemoteServerError({
        message:
            error instanceof SubdomainError
                ? error.message
                : "Subdomain operation unavailable or access denied",
    })
export const SubdomainsServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<SubdomainsPrincipal, SubdomainsRepository>(
            SubdomainCatalog,
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
                                          SubdomainsRepository,
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
            DomainSubdomains,
            ({
                input,
                principal,
            }: {
                input: typeof DomainSubdomains.Input.Type
                principal: SubdomainsPrincipal
            }) =>
                Effect.gen(function* () {
                    yield* Effect.flatMap(SubdomainsRepository, (repository) =>
                        repository.authorize_subdomains(
                            principal,
                            input.domain_id
                        )
                    )
                    return {
                        edges: [
                            {
                                entity: SubdomainCatalog.name,
                                id: input.domain_id,
                                key: entityKey(
                                    SubdomainCatalog.name,
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
            ChangeSubdomains,
            ({
                input,
                principal,
            }: {
                input: typeof ChangeSubdomains.Input.Type
                principal: SubdomainsPrincipal
            }) =>
                Effect.gen(function* () {
                    yield* Effect.flatMap(SubdomainsRepository, (repository) =>
                        repository.authorize_subdomains(
                            principal,
                            input.domain_id,
                            true
                        )
                    )
                    const library = yield* Effect.flatMap(
                        SubdomainsRepository,
                        (repository) =>
                            repository.change_subdomains(
                                principal,
                                input.action
                            )
                    )
                    return {
                        output: { domain_id: library.id },
                        entities: [
                            Entity.patch(
                                SubdomainCatalog.ref(library.id),
                                library
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
})
RemoteServer.validate(SubdomainsRemote, SubdomainsServer)

export { SubdomainsRepository, SubdomainsRepositoryLive } from "./repository.ts"
