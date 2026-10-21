import { AccountRequestError, ContactsApi } from "../contacts/api.ts"
import { change_data, load_upload_rows } from "./api.ts"
import { Effect, Option, Schema as S } from "effect"
import { Command } from "foldkit"
import { RemoteMutationError, RemoteQueryError } from "foldkit-remote"
import * as Data from "@urm/features/data/submodel"
import { RawRow } from "@urm/domain/schemas/data-tables"

export const table_request_error = (error: unknown): string =>
    error instanceof AccountRequestError ||
    error instanceof RemoteMutationError ||
    error instanceof RemoteQueryError
        ? error.message
        : "Could not complete this table request. Please try again."

const FeatureArgs = S.Struct({
    domain_id: S.String,
    request: Data.TableRequest,
})
const ExecuteArgs = S.Struct({
    ...FeatureArgs.fields,
    created_id: S.String,
    row_ids: S.Array(S.String),
})
const ExecuteTableRequest = Command.define("ExecuteTableRequest", {
    args: ExecuteArgs.fields,
    messages: [Data.Message],
    execute: ({ domain_id, request, created_id: requested_id, row_ids }) =>
        Effect.gen(function* () {
            let created_id = ""
            let source_rows: ReadonlyArray<RawRow> = []
            switch (request._tag) {
                case "Create": {
                    created_id = requested_id
                    yield* change_data(domain_id, {
                        _tag: "CreateTable",
                        id: created_id,
                        name: request.name,
                        columns: request.columns,
                    })
                    break
                }
                case "ReadUpload": {
                    const source = yield* load_upload_rows(
                        domain_id,
                        request.upload_id
                    )
                    source_rows = yield* Effect.forEach(source.rows, (row) =>
                        S.decodeUnknownEffect(S.fromJsonString(RawRow))(
                            row.data
                        )
                    )
                    break
                }
                case "ImportContacts": {
                    const api = yield* ContactsApi
                    const session = yield* api.session()
                    const domain = session.domains.find(
                        (item) => item.id === domain_id
                    )
                    if (!domain)
                        return yield* Effect.fail(
                            new AccountRequestError({
                                status: 403,
                                message:
                                    "This workspace is no longer available.",
                            })
                        )
                    yield* api.import_rows({
                        slug: domain.slug,
                        rows: request.rows,
                        source_id: `postgres:${request.upload_id}`,
                    })
                    yield* change_data(domain_id, {
                        _tag: "RecordContactImport",
                        upload_id: request.upload_id,
                    })
                    break
                }
                case "Append":
                    yield* change_data(domain_id, {
                        _tag: "AppendRows",
                        table_id: request.table_id,
                        schema_revision: request.schema_revision,
                        rows: request.rows,
                        row_ids,
                        ...(request.upload_id === undefined
                            ? {}
                            : { upload_id: request.upload_id }),
                    })
                    break
                case "UpdateRow":
                    yield* change_data(domain_id, {
                        _tag: "UpdateRow",
                        table_id: request.table_id,
                        row_id: request.row_id,
                        schema_revision: request.schema_revision,
                        row_revision: request.row_revision,
                        values: request.values,
                    })
                    break
            }
            return Data.GotTableMessage({
                message: Data.CompletedTableRequest({
                    domain_id,
                    created_id,
                    source_rows,
                    operation: request._tag,
                }),
            })
        }).pipe(
            Effect.catch((error) =>
                Effect.succeed(
                    Data.GotTableMessage({
                        message: Data.FailedTableRequest({
                            domain_id,
                            error: table_request_error(error),
                        }),
                    })
                )
            )
        ),
})
export const translate_table_command = (
    active_domain_id: Option.Option<string>,
    command: Command.Command<Data.MessageType>
): ReadonlyArray<Command.Command<Data.MessageType, never, ContactsApi>> => {
    const decoded = S.decodeUnknownOption(FeatureArgs)(command.args)
    if (
        Option.isNone(active_domain_id) ||
        Option.isNone(decoded) ||
        active_domain_id.value !== decoded.value.domain_id
    )
        return []
    return [
        ExecuteTableRequest({
            domain_id: active_domain_id.value,
            request: decoded.value.request,
            created_id:
                decoded.value.request._tag === "Create"
                    ? crypto.randomUUID()
                    : "",
            row_ids:
                decoded.value.request._tag === "Append"
                    ? decoded.value.request.rows.map(() => crypto.randomUUID())
                    : [],
        }),
    ]
}
