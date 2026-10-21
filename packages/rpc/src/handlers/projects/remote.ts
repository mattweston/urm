import { ProjectWriteError } from "@urm/domain/projects"
import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    ChangeProjects,
    DomainProjects,
    ProjectCatalog,
    ProjectsRemote,
} from "@urm/contracts/projects"
import {
    ProjectsLibraryRepository,
    type ProjectsPrincipal,
} from "./postgres-repository.ts"
const terminal: Boundary = { _tag: "Terminal" }
const failure = (error?: unknown) =>
    new RemoteServerError({
        message:
            error instanceof ProjectWriteError
                ? error.message
                : "Project operation unavailable or access denied",
    })
export const ProjectsServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<ProjectsPrincipal, ProjectsLibraryRepository>(
            ProjectCatalog,
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
                                          ProjectsLibraryRepository,
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
            DomainProjects,
            ({
                input,
                principal,
            }: {
                input: typeof DomainProjects.Input.Type
                principal: ProjectsPrincipal
            }) =>
                Effect.gen(function* () {
                    yield* Effect.flatMap(
                        ProjectsLibraryRepository,
                        (repository) =>
                            repository.authorize_projects(
                                principal,
                                input.domain_id
                            )
                    )
                    return {
                        edges: [
                            {
                                entity: ProjectCatalog.name,
                                id: input.domain_id,
                                key: entityKey(
                                    ProjectCatalog.name,
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
            ChangeProjects,
            ({
                input,
                principal,
            }: {
                input: typeof ChangeProjects.Input.Type
                principal: ProjectsPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.account_id !== undefined &&
                        input.account_id !== principal.account_id
                    )
                        return yield* Effect.fail(failure())
                    yield* Effect.flatMap(
                        ProjectsLibraryRepository,
                        (repository) =>
                            repository.authorize_projects(
                                principal,
                                input.domain_id,
                                true
                            )
                    )
                    const library = yield* Effect.flatMap(
                        ProjectsLibraryRepository,
                        (repository) =>
                            repository.change_projects(principal, input.action)
                    )
                    return {
                        output: { domain_id: library.id },
                        entities: [
                            Entity.patch(
                                ProjectCatalog.ref(library.id),
                                library
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
})
RemoteServer.validate(ProjectsRemote, ProjectsServer)

export {
    ProjectsLibraryRepository,
    ProjectsLibraryRepositoryLive,
} from "./postgres-repository.ts"
