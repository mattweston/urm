import {
    data_templates,
    contact_destination,
    suggest_header,
} from "@urm/domain/data-templates"
import { contact_import_errors } from "@urm/domain/contact-import"
import { Effect, Option, Schema as S } from "effect"
import { Command } from "foldkit"
import {
    ColumnType,
    DataColumns,
    TableName,
    raw_values,
    validate_columns,
    validate_row,
    type RawRow,
} from "@urm/domain/schemas/data-tables"
import { blank_column, type Model } from "./model.ts"
import * as Spreadsheet from "../../spreadsheet/index.ts"
import { sync_spreadsheet, update_spreadsheet } from "./spreadsheet.ts"
import {
    CompletedRequest,
    FailedRequest,
    Request,
    type Message,
} from "./message.ts"

export const PersistTable = Command.define("PersistTable", {
    args: { domain_id: S.String, request: Request },
    messages: [CompletedRequest, FailedRequest],
    execute: ({
        domain_id,
    }): Effect.Effect<
        typeof CompletedRequest.Type | typeof FailedRequest.Type
    > =>
        Effect.succeed(
            FailedRequest({
                domain_id,
                error: "Table persistence is unavailable in this host",
            })
        ),
})
type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
export const selected_table = (model: Model) =>
    model.contact_import
        ? contact_destination
        : model.tables.find((table) => table.id === model.selected_id)
export const mapped_rows = (model: Model): ReadonlyArray<RawRow> => {
    const table = selected_table(model)
    if (table === undefined) throw new Error("Choose a table")
    if (model.source_rows.length === 0 || model.source_rows.length > 200)
        throw new Error("Choose an upload containing 1–200 rows")
    const rows = model.source_rows.map((row) =>
        Object.fromEntries(
            table.columns.map((column) => [
                column.key,
                row[model.mapping[column.key] ?? ""] ?? "",
            ])
        )
    )
    if (JSON.stringify(rows).length > 100_000)
        throw new Error(
            "Import exceeds 100,000 characters; use a smaller upload"
        )
    if (table.row_count + rows.length > 1000)
        throw new Error("This import would exceed the 1,000-row table limit")
    return rows
}
export const preview_errors = (model: Model): ReadonlyArray<string> => {
    const table = selected_table(model)
    if (table === undefined) return ["Choose a table"]
    try {
        const errors: string[] = []
        if (model.contact_import)
            return contact_import_errors(mapped_rows(model))
        mapped_rows(model).forEach((row, index) => {
            try {
                validate_row(table.columns, row)
            } catch (error) {
                errors.push(`Row ${index + 1}: ${String(error)}`)
            }
        })
        return errors
    } catch (error) {
        return [String(error)]
    }
}
const persist = (model: Model, request: Request): UpdateReturn =>
    model.can_write && !model.busy && model.domain_id !== ""
        ? [
              { ...model, busy: true, error: "", notice: "" },
              [PersistTable({ domain_id: model.domain_id, request })],
          ]
        : [model, []]

const update_table = (model: Model, message: Message): UpdateReturn => {
    if ("domain_id" in message && message.domain_id !== model.domain_id)
        return [model, []]
    if (
        model.busy &&
        !("domain_id" in message) &&
        !(
            message._tag === "GotSpreadsheetMessage" &&
            (message.message._tag === "GotRowsMessage" ||
                message.message._tag === "ScrolledColumns")
        )
    )
        return [model, []]
    switch (message._tag) {
        case "GotSpreadsheetMessage":
            return update_spreadsheet(model, message.message, persist)
        case "LoadedTables":
            return [
                {
                    ...model,
                    loaded: true,
                    tables: message.tables,
                    can_write: message.can_write,
                },
                [],
            ]
        case "LoadedRows":
            return message.table_id === model.selected_id
                ? [{ ...model, rows: message.rows, rows_loaded: true }, []]
                : [model, []]
        case "FailedRequest":
            return [
                {
                    ...model,
                    busy: false,
                    error:
                        message.error +
                        (Option.isSome(model.cell_edit)
                            ? " Your cell edit is retained. Press Escape to reload the current row."
                            : ""),
                    spreadsheet: Option.isSome(model.cell_edit)
                        ? {
                              ...model.spreadsheet,
                              editor: Spreadsheet.EditingCell({
                                  address: model.cell_edit.value.address,
                                  draft: model.cell_edit.value.draft,
                              }),
                          }
                        : model.spreadsheet,
                },
                [],
            ]
        case "CompletedRequest": {
            if (message.operation === "ReadUpload") {
                const headers = Object.keys(message.source_rows[0] ?? {})
                return [
                    {
                        ...model,
                        busy: false,
                        source_rows: message.source_rows,
                        previewed: false,
                        mapping: Object.fromEntries(
                            (selected_table(model)?.columns ?? []).map(
                                (column) => [
                                    column.key,
                                    suggest_header(column, headers),
                                ]
                            )
                        ),
                    },
                    [],
                ]
            }
            return [
                {
                    ...model,
                    busy: false,
                    creating: false,
                    cell_edit: Option.none(),
                    editing_id: "",
                    draft: {},
                    source_rows: [],
                    previewed: false,
                    notice:
                        message.operation === "Create"
                            ? "Table created"
                            : message.operation === "ImportContacts"
                              ? `${model.source_rows.length} contacts imported; 0 rejected, 0 skipped`
                              : `${model.source_rows.length || 1} rows saved`,
                    ...(message.created_id === ""
                        ? {}
                        : {
                              selected_id: message.created_id,
                              rows: [],
                              rows_loaded: false,
                          }),
                },
                [],
            ]
        }
        case "SelectedTable":
            return model.busy
                ? [model, []]
                : [
                      {
                          ...model,
                          selected_id: message.id,
                          spreadsheet: {
                              ...Spreadsheet.init_table(),
                              // The mounted container keeps its size and scroll
                              // position; it will not emit another measurement.
                              rows: model.spreadsheet.rows,
                              columnScrollLeft:
                                  model.spreadsheet.columnScrollLeft,
                              columnViewportWidth:
                                  model.spreadsheet.columnViewportWidth,
                          },
                          cell_edit: Option.none(),
                          contact_import: false,
                          creating: false,
                          rows: [],
                          rows_loaded: false,
                          editing_id: "",
                          source_rows: [],
                          previewed: false,
                          error: "",
                          notice: "",
                          page: 0,
                      },
                      [],
                  ]
        case "StartedCreate":
            return model.busy
                ? [model, []]
                : [
                      {
                          ...model,
                          creating: true,
                          contact_import: false,
                          name: "",
                          columns: [{ ...blank_column }],
                          error: "",
                          notice: "",
                      },
                      [],
                  ]
        case "SelectedTemplate": {
            if (!model.can_write || !model.creating) return [model, []]
            const template = data_templates.find(
                (template) => template.id === message.id
            )
            return template === undefined
                ? [model, []]
                : [
                      {
                          ...model,
                          name: template.name,
                          columns: template.columns.map((column) => ({
                              ...column,
                              choices: column.choices.join(", "),
                          })),
                          error: "",
                      },
                      [],
                  ]
        }
        case "ChangedName":
            return [{ ...model, name: message.value, error: "" }, []]
        case "AddedColumn":
            return model.columns.length < 32
                ? [
                      {
                          ...model,
                          columns: [...model.columns, { ...blank_column }],
                      },
                      [],
                  ]
                : [model, []]
        case "RemovedColumn":
            return [
                {
                    ...model,
                    columns: model.columns.filter(
                        (_, index) => index !== message.index
                    ),
                },
                [],
            ]
        case "ChangedColumn":
            return [
                {
                    ...model,
                    error: "",
                    columns: model.columns.map((column, index) => {
                        if (index !== message.index) return column
                        if (message.field === "type")
                            return {
                                ...column,
                                type: Option.getOrElse(
                                    S.decodeUnknownOption(ColumnType)(
                                        message.value
                                    ),
                                    () => column.type
                                ),
                            }
                        if (message.field === "required")
                            return {
                                ...column,
                                required: message.value === "true",
                            }
                        return { ...column, [message.field]: message.value }
                    }),
                },
                [],
            ]
        case "SubmittedCreate": {
            try {
                const name = S.decodeUnknownResult(TableName)(model.name.trim())
                const columns = S.decodeUnknownResult(DataColumns)(
                    model.columns.map((column) => ({
                        ...column,
                        name: column.name.trim(),
                        key: column.key.trim(),
                        choices:
                            column.type === "choice"
                                ? column.choices
                                      .split(",")
                                      .map((value) => value.trim())
                                : [],
                    }))
                )
                if (name._tag === "Failure")
                    return [
                        {
                            ...model,
                            error: "Enter a table name of 1–100 characters",
                        },
                        [],
                    ]
                if (columns._tag === "Failure")
                    return [
                        {
                            ...model,
                            error: "Each column needs a name and a lowercase key starting with a letter (up to 64 characters)",
                        },
                        [],
                    ]
                validate_columns(columns.success)
                return persist(model, {
                    _tag: "Create",
                    name: name.success,
                    columns: columns.success,
                })
            } catch (error) {
                return [{ ...model, error: String(error) }, []]
            }
        }
        case "SelectedUpload":
            return [
                {
                    ...model,
                    upload_id: message.id,
                    source_rows: [],
                    previewed: false,
                },
                [],
            ]
        case "ReadUpload":
            return model.upload_id === ""
                ? [{ ...model, error: "Choose an upload first" }, []]
                : persist(model, {
                      _tag: "ReadUpload",
                      upload_id: model.upload_id,
                  })
        case "ChangedMapping":
            return [
                {
                    ...model,
                    mapping: { ...model.mapping, [message.key]: message.value },
                    previewed: false,
                },
                [],
            ]
        case "PreviewedImport":
            return [{ ...model, previewed: true }, []]
        case "SubmittedImport": {
            const table = selected_table(model)
            const errors = preview_errors(model)
            if (!model.previewed || table === undefined || errors.length > 0)
                return [
                    {
                        ...model,
                        previewed: true,
                        error: errors[0] ?? "Preview the import first",
                    },
                    [],
                ]
            if (model.contact_import)
                return persist(model, {
                    _tag: "ImportContacts",
                    upload_id: model.upload_id,
                    rows: mapped_rows(model),
                })
            return persist(model, {
                _tag: "Append",
                upload_id: model.upload_id,
                table_id: table.id,
                schema_revision: table.revision,
                rows: mapped_rows(model),
            })
        }
        case "StartedRow": {
            const row = model.rows.find((row) => row.id === message.id)
            return [
                {
                    ...model,
                    editing_id: row?.id ?? "new",
                    editing_revision: row?.revision ?? 0,
                    draft: row === undefined ? {} : raw_values(row.values),
                    error: "",
                    notice: "",
                },
                [],
            ]
        }
        case "ChangedCell":
            return [
                {
                    ...model,
                    draft: { ...model.draft, [message.key]: message.value },
                    error: "",
                },
                [],
            ]
        case "CancelledEdit":
            return [
                { ...model, editing_id: "", creating: false, error: "" },
                [],
            ]
        case "ChangedPage":
            return [
                {
                    ...model,
                    page: Math.max(
                        0,
                        Math.min(
                            Math.ceil(model.rows.length / 50) - 1,
                            message.page
                        )
                    ),
                },
                [],
            ]
        case "SubmittedRow": {
            const table = selected_table(model)
            if (table === undefined) return [model, []]
            try {
                validate_row(table.columns, model.draft)
            } catch (error) {
                return [{ ...model, error: String(error) }, []]
            }
            return persist(
                model,
                model.editing_id === "new"
                    ? {
                          _tag: "Append",
                          table_id: table.id,
                          schema_revision: table.revision,
                          rows: [model.draft],
                      }
                    : {
                          _tag: "UpdateRow",
                          table_id: table.id,
                          schema_revision: table.revision,
                          row_id: model.editing_id,
                          row_revision: model.editing_revision,
                          values: model.draft,
                      }
            )
        }
    }
}

export const update = (model: Model, message: Message): UpdateReturn => {
    const [updated, commands] = update_table(model, message)
    if (
        message._tag === "GotSpreadsheetMessage" &&
        !updated.busy &&
        message.message._tag !== "CancelledEditor"
    )
        return [updated, commands]
    return updated === model
        ? [model, commands]
        : [sync_spreadsheet(updated), commands]
}
