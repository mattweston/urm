import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import { DataWriteError } from "@urm/domain/data"
import {
    DataWorkspaceEntity,
    DataTableRowsEntity,
    DataUploadRowsEntity,
    DataWorkspaceQuery,
    DataTableRowsQuery,
    DataUploadRowsQuery,
    ChangeData,
    DataRemote,
} from "@urm/contracts/data"
import { DataRepository, type DataPrincipal } from "./repository.ts"

const terminal: Boundary = { _tag: "Terminal" }
const failure = (error?: unknown) =>
    new RemoteServerError({
        message:
            error instanceof DataWriteError
                ? error.message
                : "Data unavailable or access denied",
    })
const edge = (name: string, id: string) => ({
    edges: [{ entity: name, id, key: entityKey(name, id) }],
    start: terminal,
    end: terminal,
})
export const DataServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<DataPrincipal, DataRepository>(
            DataWorkspaceEntity,
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
                                          DataRepository,
                                          (repository) =>
                                              repository.load_workspace(
                                                  principal
                                              )
                                      ),
                                  },
                              ]
                    }).pipe(Effect.mapError(failure)),
            }
        ),
        RemoteServer.entity<DataPrincipal, DataRepository>(
            DataTableRowsEntity,
            {
                read: ({ ids, principal }) =>
                    Effect.forEach(ids, (id) =>
                        Effect.flatMap(DataRepository, (repository) =>
                            repository.load_table_rows(principal, id)
                        ).pipe(Effect.map((values) => ({ id, values })))
                    ).pipe(Effect.mapError(failure)),
            }
        ),
        RemoteServer.entity<DataPrincipal, DataRepository>(
            DataUploadRowsEntity,
            {
                read: ({ ids, principal }) =>
                    Effect.forEach(ids, (id) =>
                        Effect.flatMap(DataRepository, (repository) =>
                            repository.load_upload_rows(principal, id)
                        ).pipe(Effect.map((values) => ({ id, values })))
                    ).pipe(Effect.mapError(failure)),
            }
        ),
    ],
    queries: [
        RemoteServer.query(
            DataWorkspaceQuery,
            ({
                input,
                principal,
            }: {
                input: typeof DataWorkspaceQuery.Input.Type
                principal: DataPrincipal
            }) =>
                Effect.gen(function* () {
                    yield* Effect.flatMap(DataRepository, (repository) =>
                        repository.authorize(principal, input.domain_id)
                    )
                    return edge(DataWorkspaceEntity.name, input.domain_id)
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.query(
            DataTableRowsQuery,
            ({
                input,
                principal,
            }: {
                input: typeof DataTableRowsQuery.Input.Type
                principal: DataPrincipal
            }) =>
                Effect.gen(function* () {
                    yield* Effect.flatMap(DataRepository, (repository) =>
                        repository.authorize(principal, input.domain_id)
                    )
                    return edge(DataTableRowsEntity.name, input.table_id)
                }).pipe(Effect.mapError(failure))
        ),
        RemoteServer.query(
            DataUploadRowsQuery,
            ({
                input,
                principal,
            }: {
                input: typeof DataUploadRowsQuery.Input.Type
                principal: DataPrincipal
            }) =>
                Effect.gen(function* () {
                    yield* Effect.flatMap(DataRepository, (repository) =>
                        repository.authorize(principal, input.domain_id)
                    )
                    return edge(DataUploadRowsEntity.name, input.upload_id)
                }).pipe(Effect.mapError(failure))
        ),
    ],
    mutations: [
        RemoteServer.mutation(
            ChangeData,
            ({
                input,
                principal,
            }: {
                input: typeof ChangeData.Input.Type
                principal: DataPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.domain_id !== principal.domain_id ||
                        (input.account_id !== undefined &&
                            input.account_id !== principal.account_id)
                    )
                        return yield* Effect.fail(failure())
                    const result = yield* Effect.flatMap(
                        DataRepository,
                        (repository) =>
                            repository.change(principal, input.action)
                    )
                    return {
                        output: { changed_id: result.changed_id },
                        entities: [
                            Entity.patch(
                                DataWorkspaceEntity.ref(result.workspace.id),
                                result.workspace
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(failure))
        ),
    ],
})
RemoteServer.validate(DataRemote, DataServer)
export { DataRepository, DataRepositoryLive } from "./repository.ts"
