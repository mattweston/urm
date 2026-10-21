import { translate_csv_preview } from "./csv.ts"
import { translate_table_command } from "./tables.ts"
import { change_data, load_workspace, load_table_rows } from "./api.ts"
import { Effect, Option, Schema as S } from "effect"
import { Command, File } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { ContactsApi } from "../contacts/api.ts"
import { DataWorkspace } from "@urm/domain/data"
import * as Data from "@urm/features/data/submodel"
import * as CsvUpload from "@urm/features/data/upload-csv"

export const Model = Data.Model
export type Model = Data.ModelType
const LoadedWorkspace = taggedStruct("LoadedDataWorkspace", {
    domain_id: S.String,
    workspace: DataWorkspace,
})
const FailedWorkspace = taggedStruct("FailedDataWorkspace", {
    domain_id: S.String,
    error: S.String,
})
export const Message = S.Union([Data.Message, LoadedWorkspace, FailedWorkspace])
export type Message = typeof Message.Type
type Commands = ReadonlyArray<Command.Command<Message, never, ContactsApi>>
export type UpdateReturn = readonly [Model, Commands]
class CsvRecoveryError extends S.TaggedErrorClass<CsvRecoveryError>()(
    "CsvRecoveryError",
    { message: S.String }
) {}

const LoadDataWorkspace = Command.define("LoadDataWorkspace", {
    args: { domain_id: S.String },
    messages: [LoadedWorkspace, FailedWorkspace],
    execute: ({ domain_id }) =>
        load_workspace(domain_id).pipe(
            Effect.map((workspace) =>
                LoadedWorkspace({ domain_id, workspace })
            ),
            Effect.catch((error) =>
                Effect.succeed(
                    FailedWorkspace({ domain_id, error: String(error) })
                )
            )
        ),
})
const LoadDataRows = Command.define("LoadDataRows", {
    args: { domain_id: S.String, table_id: S.String },
    messages: [Data.Message],
    execute: ({ domain_id, table_id }) =>
        load_table_rows(domain_id, table_id).pipe(
            Effect.map((result) =>
                Data.GotTableMessage({
                    message: Data.LoadedRows({
                        domain_id,
                        table_id,
                        rows: result.rows,
                    }),
                })
            ),
            Effect.catch((error) =>
                Effect.succeed(
                    Data.GotTableMessage({
                        message: Data.FailedTableRequest({
                            domain_id,
                            error: String(error),
                        }),
                    })
                )
            )
        ),
})

const upload_csv = (
    domain_id: string,
    file: File.File,
    upload_id: string,
    retry_id?: string
) =>
    Effect.gen(function* () {
        const source = yield* Effect.tryPromise(() => file.text())
        const rows = yield* Effect.try(() => CsvUpload.parseCsv(source))
        if (retry_id !== undefined) {
            const workspace = yield* load_workspace(domain_id)
            const retry = workspace.uploads.find(
                (upload) => upload.id === retry_id
            )
            if (
                !retry ||
                retry.filename !== File.name(file) ||
                retry.row_count !== rows.length ||
                retry.status === "completed"
            )
                return yield* Effect.fail(
                    new CsvRecoveryError({
                        message:
                            "Select the original CSV with the same filename and row count; completed uploads cannot be retried",
                    })
                )
        }
        yield* change_data(domain_id, {
            _tag: "StoreCsv",
            id: upload_id,
            filename: File.name(file),
            rows,
        })
    })
const UploadDesktopCsv = Command.define("UploadDesktopCsv", {
    args: {
        domain_id: S.String,
        file: File.File,
        upload_id: S.String,
        retry_id: S.optional(S.String),
    },
    messages: [Data.Message],
    execute: ({ domain_id, file, upload_id, retry_id }) =>
        upload_csv(domain_id, file, upload_id, retry_id).pipe(
            Effect.as(
                Data.GotCsvUploadMessage({ message: CsvUpload.UploadedCsv() })
            ),
            Effect.catch((error) =>
                Effect.succeed(
                    Data.GotCsvUploadMessage({
                        message: CsvUpload.UploadCsvFailed({
                            error: String(error),
                        }),
                    })
                )
            )
        ),
})
const DeleteDesktopCsv = Command.define("DeleteDesktopCsv", {
    args: { domain_id: S.String, upload_id: S.String },
    messages: [Data.Message],
    execute: ({ domain_id, upload_id }) =>
        change_data(domain_id, { _tag: "DeleteCsv", id: upload_id }).pipe(
            Effect.as(
                Data.GotCsvUploadMessage({
                    message: CsvUpload.DeletedUpload({ uploadId: upload_id }),
                })
            ),
            Effect.catch((error) =>
                Effect.succeed(
                    Data.GotCsvUploadMessage({
                        message: CsvUpload.DeleteUploadFailed({
                            error: String(error),
                        }),
                    })
                )
            )
        ),
})
const translate_command = (
    model: Model,
    command: Command.Command<Data.MessageType>
): Commands => {
    const domain_id = model.tables.domain_id
    const active =
        domain_id === "" ? Option.none<string>() : Option.some(domain_id)
    if (command.name === "PersistTable")
        return translate_table_command(active, command)
    if (command.name === "LoadCsvPreview")
        return translate_csv_preview(active, command)
    if (command.name === "LoadUploads")
        return domain_id === "" ? [] : [LoadDataWorkspace({ domain_id })]
    if (command.name === "RetryUpload") {
        const args = S.decodeUnknownOption(S.Struct({ upload_id: S.String }))(
            command.args
        )
        const file = model.csvUpload.selectedUploadFiles[0]
        return domain_id !== "" && Option.isSome(args) && file !== undefined
            ? [
                  UploadDesktopCsv({
                      domain_id,
                      file,
                      upload_id: args.value.upload_id,
                      retry_id: args.value.upload_id,
                  }),
              ]
            : []
    }
    if (command.name === "UploadCsv") {
        const file = model.csvUpload.selectedUploadFiles[0]
        return domain_id !== "" && file !== undefined
            ? [
                  UploadDesktopCsv({
                      domain_id,
                      file,
                      upload_id: crypto.randomUUID(),
                  }),
              ]
            : []
    }
    if (command.name === "DeleteUpload") {
        const upload_id = model.csvUpload.pendingDeleteUploadId
        return domain_id !== "" && upload_id !== null
            ? [DeleteDesktopCsv({ domain_id, upload_id })]
            : []
    }
    return [command]
}
export const init = (pathname: string): Model => Data.init(pathname, "")[0]
export const update = (
    model: Model,
    message: Message,
    _active_domain_id?: Option.Option<string>
): UpdateReturn => {
    if (message._tag === "LoadedDataWorkspace") {
        if (message.domain_id !== model.tables.domain_id) return [model, []]
        const [tables] = Data.update(
            model,
            Data.GotTableMessage({
                message: Data.LoadedTables({
                    domain_id: message.domain_id,
                    can_write: message.workspace.can_write,
                    tables: message.workspace.tables,
                }),
            })
        )
        const [next] = Data.update(
            tables,
            Data.GotCsvUploadMessage({
                message: CsvUpload.LoadedUploads({
                    uploads: message.workspace.uploads,
                }),
            })
        )
        return [
            next,
            next.tables.selected_id === ""
                ? []
                : [
                      LoadDataRows({
                          domain_id: message.domain_id,
                          table_id: next.tables.selected_id,
                      }),
                  ],
        ]
    }
    if (message._tag === "FailedDataWorkspace") {
        if (message.domain_id !== model.tables.domain_id) return [model, []]
        const [tables] = Data.update(
            model,
            Data.GotTableMessage({
                message: Data.FailedTableRequest({
                    domain_id: message.domain_id,
                    error: message.error,
                }),
            })
        )
        const [next] = Data.update(
            tables,
            Data.GotCsvUploadMessage({
                message: CsvUpload.FailedLoadingUploads({
                    error: message.error,
                }),
            })
        )
        return [next, []]
    }
    const [next_model, commands] = Data.update(model, message)
    const result = commands.flatMap((command) =>
        translate_command(next_model, command)
    )
    if (
        message._tag === "GotTableMessage" &&
        message.message._tag === "SelectedTable" &&
        next_model.tables.selected_id !== ""
    )
        return [
            next_model,
            [
                ...result,
                LoadDataRows({
                    domain_id: next_model.tables.domain_id,
                    table_id: next_model.tables.selected_id,
                }),
            ],
        ]
    if (
        message._tag === "GotTableMessage" &&
        message.message._tag === "CompletedRequest" &&
        message.message.operation !== "ReadUpload"
    )
        return [
            next_model,
            [
                ...result,
                LoadDataWorkspace({ domain_id: next_model.tables.domain_id }),
            ],
        ]
    return [next_model, result]
}
export const changed_path = (
    model: Model,
    pathname: string,
    active_domain_id: Option.Option<string>
): UpdateReturn =>
    update(model, Data.ChangedPath({ pathname }), active_domain_id)
export const with_domain = (
    model: Model,
    _maybe_domain_id: Option.Option<string>
): Model => ({
    ...model,
    csvUpload: CsvUpload.initDeferred("")[0],
    csv_import_open: false,
    tables: Data.initTables(""),
})
export const synchronize = (
    model: Model,
    account: { domain_id: string; can_write: boolean } | null
): UpdateReturn => {
    if (!account || account.domain_id === "")
        return [with_domain(model, Option.none()), []]
    if (
        model.tables.domain_id === account.domain_id &&
        model.tables.can_write === account.can_write
    )
        return [model, []]
    const [csvUpload] = CsvUpload.init(account.domain_id)
    return [
        { ...model, csvUpload, tables: Data.initTables(account.domain_id) },
        [LoadDataWorkspace({ domain_id: account.domain_id })],
    ]
}
export const loaded_uploads = (
    uploads: ReadonlyArray<(typeof DataWorkspace.Type)["uploads"][number]>
): Message =>
    Data.GotCsvUploadMessage({ message: CsvUpload.LoadedUploads({ uploads }) })
export const view = Data.view
