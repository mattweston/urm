import { IssueWriteError } from "@urm/domain/issues"
import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    ChangeIssues,
    DomainIssues,
    IssueCatalog,
    IssuesRemote,
} from "@urm/contracts/issues"
import {
    IssuesLibraryRepository,
    type IssuesPrincipal,
} from "./postgres-repository.ts"
const terminal: Boundary = { _tag: "Terminal" }
const failure = (error?: unknown) =>
    new RemoteServerError({
        message:
            error instanceof IssueWriteError
                ? error.message
                : "Issue operation unavailable or access denied",
    })
export const IssuesServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<IssuesPrincipal, IssuesLibraryRepository>(
            IssueCatalog,
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
                                          IssuesLibraryRepository,
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
            DomainIssues,
            ({
                input,
                principal,
            }: {
                input: typeof DomainIssues.Input.Type
                principal: IssuesPrincipal
            }) =>
                Effect.gen(function* () {
                    yield* Effect.flatMap(
                        IssuesLibraryRepository,
                        (repository) =>
                            repository.authorize_issues(
                                principal,
                                input.domain_id
                            )
                    )
                    return {
                        edges: [
                            {
                                entity: IssueCatalog.name,
                                id: input.domain_id,
                                key: entityKey(
                                    IssueCatalog.name,
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
            ChangeIssues,
            ({
                input,
                principal,
            }: {
                input: typeof ChangeIssues.Input.Type
                principal: IssuesPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.account_id !== undefined &&
                        input.account_id !== principal.account_id
                    )
                        return yield* Effect.fail(failure())
                    yield* Effect.flatMap(
                        IssuesLibraryRepository,
                        (repository) =>
                            repository.authorize_issues(
                                principal,
                                input.domain_id,
                                true
                            )
                    )
                    const library = yield* Effect.flatMap(
                        IssuesLibraryRepository,
                        (repository) =>
                            repository.change_issues(principal, input.actions)
                    )
                    return {
                        output: { domain_id: library.id },
                        entities: [
                            Entity.patch(IssueCatalog.ref(library.id), library),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
})
RemoteServer.validate(IssuesRemote, IssuesServer)

export {
    IssuesLibraryRepository,
    IssuesLibraryRepositoryLive,
} from "./postgres-repository.ts"
