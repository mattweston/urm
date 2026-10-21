import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    ChangeDocuments,
    WorkspaceDocuments,
    DocumentLibrary,
    DocumentsRemote,
} from "@urm/contracts/documents"
import { DocumentsRepository, type DocumentsPrincipal } from "./repository.ts"
const terminal: Boundary = { _tag: "Terminal" }
const failure = () =>
    new RemoteServerError({
        message: "Document operation unavailable or access denied",
    })
export const DocumentsServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<DocumentsPrincipal, DocumentsRepository>(
            DocumentLibrary,
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
                                          DocumentsRepository,
                                          (repository) =>
                                              repository.load_library(principal)
                                      ),
                                  },
                              ]
                    }).pipe(Effect.mapError(failure)),
            }
        ),
    ],
    queries: [
        RemoteServer.query(
            WorkspaceDocuments,
            ({
                input,
                principal,
            }: {
                input: typeof WorkspaceDocuments.Input.Type
                principal: DocumentsPrincipal
            }) =>
                Effect.gen(function* () {
                    yield* Effect.flatMap(DocumentsRepository, (repository) =>
                        repository.authorize_documents(
                            principal,
                            input.domain_id
                        )
                    )
                    return {
                        edges: [
                            {
                                entity: DocumentLibrary.name,
                                id: input.domain_id,
                                key: entityKey(
                                    DocumentLibrary.name,
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
            ChangeDocuments,
            ({
                input,
                principal,
            }: {
                input: typeof ChangeDocuments.Input.Type
                principal: DocumentsPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.account_id !== undefined &&
                        input.account_id !== principal.account_id
                    )
                        return yield* Effect.fail(failure())
                    yield* Effect.flatMap(DocumentsRepository, (repository) =>
                        repository.authorize_documents(
                            principal,
                            input.domain_id,
                            true
                        )
                    )
                    const library = yield* Effect.flatMap(
                        DocumentsRepository,
                        (repository) =>
                            repository.change_documents(principal, input.action)
                    )
                    return {
                        output: { domain_id: library.id },
                        entities: [
                            Entity.patch(
                                DocumentLibrary.ref(library.id),
                                library
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
})
RemoteServer.validate(DocumentsRemote, DocumentsServer)

export { DocumentsRepository, DocumentsRepositoryLive } from "./repository.ts"
