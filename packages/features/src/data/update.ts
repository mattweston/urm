import { focus } from "foldkit/dom"
import { SelectedTable, ReadUpload } from "./tables/message.ts"
import { CompletedImportFocus } from "./message.ts"
import { init as initTables } from "./tables/model.ts"
import { update as updateTables } from "./tables/update.ts"
import { GotTableMessage } from "./message.ts"
import { Effect, Match as M } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"
import * as CsvUpload from "./upload-csv/index.ts"
import { isCsvPath, isSpreadsheetsPath } from "./route.ts"
import { GotCsvUploadMessage, type Message } from "./message.ts"
import type { Model, Route } from "./model.ts"

const FocusCsvImport = Command.define("FocusCsvImport", {
    messages: [CompletedImportFocus],
    execute: focus("#csv-import-heading").pipe(
        Effect.ignore,
        Effect.as(CompletedImportFocus())
    ),
})

const FocusCsvLibrary = Command.define("FocusCsvLibrary", {
    messages: [CompletedImportFocus],
    execute: focus("#csv-upload-search").pipe(
        Effect.ignore,
        Effect.as(CompletedImportFocus())
    ),
})

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const routeForPath = (pathname: string): Route =>
    isCsvPath(pathname)
        ? "Csv"
        : isSpreadsheetsPath(pathname)
          ? "Spreadsheets"
          : "Home"

const mapCsvUploadCommands = (
    commands: ReadonlyArray<Command.Command<CsvUpload.MessageType>>
) =>
    Command.mapMessages(commands, (message) => GotCsvUploadMessage({ message }))

export const init = (pathname: string, domain_id: string): UpdateReturn => {
    const [csvUpload, csv_commands] =
        domain_id === ""
            ? CsvUpload.initDeferred(domain_id)
            : CsvUpload.init(domain_id)

    return [
        {
            route: routeForPath(pathname),
            csv_import_open: false,
            csvUpload,
            tables: initTables(domain_id),
        },
        mapCsvUploadCommands(csv_commands),
    ]
}

export const activateDomain = (
    model: Model,
    domain_id: string
): UpdateReturn => {
    const [csvUpload, commands] = CsvUpload.init(domain_id)
    return [
        evo(model, {
            csvUpload: () => csvUpload,
            csv_import_open: () => false,
            tables: () => initTables(domain_id),
        }),
        mapCsvUploadCommands(commands),
    ]
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            CompletedImportFocus: () => [model, []],
            ClosedCsvImport: () =>
                model.tables.busy
                    ? [model, []]
                    : [
                          {
                              ...model,
                              csv_import_open: false,
                              tables: {
                                  ...model.tables,
                                  contact_import: false,
                              },
                          },
                          [FocusCsvLibrary()],
                      ],
            SelectedImportTable: ({ table_id }) => {
                if (
                    !model.csv_import_open ||
                    model.tables.busy ||
                    !model.tables.can_write
                )
                    return [model, []]
                const [selected] = updateTables(
                    model.tables,
                    SelectedTable({ id: table_id })
                )
                if (!selected.tables.some((table) => table.id === table_id))
                    return [{ ...model, tables: selected }, []]
                const [tables, commands] = updateTables(selected, ReadUpload())
                return [
                    { ...model, tables },
                    Command.mapMessages(commands, (message) =>
                        GotTableMessage({ message })
                    ),
                ]
            },
            GotTableMessage: ({ message }) => {
                const [tables, commands] = updateTables(model.tables, message)
                return [
                    {
                        ...model,
                        tables,
                        csvUpload: {
                            ...model.csvUpload,
                            can_write: tables.can_write,
                        },
                    },
                    Command.mapMessages(commands, (message) =>
                        GotTableMessage({ message })
                    ),
                ]
            },
            ChangedPath: ({ pathname }) => [
                evo(model, {
                    route: () => routeForPath(pathname),
                    tables: (tables) =>
                        routeForPath(pathname) !== "Csv" &&
                        tables.contact_import
                            ? evo(tables, { contact_import: () => false })
                            : tables,
                }),
                [],
            ],
            GotCsvUploadMessage: ({ message }) => {
                if (
                    message._tag === "ClickedTableImport" ||
                    message._tag === "ClickedImportUpload"
                ) {
                    const contact_import =
                        message._tag === "ClickedImportUpload"
                    const upload_id =
                        message._tag === "ClickedImportUpload"
                            ? message.uploadId
                            : message.upload_id
                    const upload = model.csvUpload.uploads.find(
                        (upload) => upload.id === upload_id
                    )
                    if (
                        !model.tables.can_write ||
                        model.tables.busy ||
                        upload?.status !== "completed"
                    )
                        return [model, []]
                    const [tables] = updateTables(
                        model.tables,
                        SelectedTable({ id: "" })
                    )
                    const prepared = {
                        ...tables,
                        upload_id: upload.id,
                        contact_import,
                    }
                    const [import_tables, commands] = contact_import
                        ? updateTables(prepared, ReadUpload())
                        : [prepared, []]
                    return [
                        {
                            ...model,
                            csv_import_open: true,
                            csvUpload: {
                                ...model.csvUpload,
                                preview_id: "",
                                preview_rows: [],
                            },
                            tables: import_tables,
                        },
                        [
                            FocusCsvImport(),
                            ...Command.mapMessages(commands, (message) =>
                                GotTableMessage({ message })
                            ),
                        ],
                    ]
                }
                const [csvUpload, commands] = CsvUpload.update(
                    model.csvUpload,
                    message
                )
                return [
                    evo(model, {
                        csvUpload: () => csvUpload,
                        tables: (tables) =>
                            evo(tables, {
                                uploads: () =>
                                    csvUpload.uploads
                                        .filter(
                                            (upload) =>
                                                upload.status === "completed"
                                        )
                                        .map((upload) => ({
                                            id: upload.id,
                                            filename: upload.filename,
                                        })),
                            }),
                    }),
                    mapCsvUploadCommands(commands),
                ]
            },
        })
    )
