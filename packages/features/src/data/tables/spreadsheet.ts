import { Option } from "effect"
import { Command } from "foldkit"
import { raw_values, validate_row } from "@urm/domain/schemas/data-tables"
import * as Spreadsheet from "../../spreadsheet/index.ts"
import { CommittedEditor } from "../../spreadsheet/spreadsheet.message.ts"
import { addressLabel } from "../../spreadsheet/spreadsheet.domain.ts"
import type { Model } from "./model.ts"
import { GotSpreadsheetMessage, type Message, type Request } from "./message.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const sync_spreadsheet = (model: Model): Model => {
    const table = model.tables.find((table) => table.id === model.selected_id)
    const can_write =
        model.can_write &&
        !model.busy &&
        model.rows_loaded &&
        model.editing_id === "" &&
        table !== undefined
    const status = model.busy
        ? "Saving change…"
        : model.error !== ""
          ? "Check the error above"
          : !model.can_write
            ? "Read-only"
            : model.notice || "Changes save to this table"
    if (Option.isSome(model.cell_edit))
        return {
            ...model,
            spreadsheet: { ...model.spreadsheet, can_write, status },
        }
    const selected = {
        row: Math.min(
            model.spreadsheet.selected.row,
            Math.max(0, model.rows.length - 1)
        ),
        column: Math.min(
            model.spreadsheet.selected.column,
            Math.max(0, (table?.columns.length ?? 0) - 1)
        ),
    }
    const cells = Object.fromEntries(
        model.rows.flatMap((row, row_index) =>
            (table?.columns ?? []).map((column, column_index) => [
                `${row_index}:${column_index}`,
                String(row.values[column.key] ?? ""),
            ])
        )
    )
    return {
        ...model,
        spreadsheet: {
            ...model.spreadsheet,
            cells,
            selected,
            nameDraft:
                selected.row === model.spreadsheet.selected.row &&
                selected.column === model.spreadsheet.selected.column
                    ? model.spreadsheet.nameDraft
                    : addressLabel(selected),
            row_count: model.rows.length,
            column_labels: table?.columns.map((column) => column.name) ?? [],
            title: table?.name ?? "Data",
            can_write,
            status:
                table === undefined
                    ? "Create or choose a table"
                    : !model.rows_loaded
                      ? "Loading rows…"
                      : status,
        },
    }
}

export const update_spreadsheet = (
    model: Model,
    message: Spreadsheet.SpreadsheetMessage,
    persist: (model: Model, request: Request) => UpdateReturn
): UpdateReturn => {
    const editing = model.spreadsheet.editor
    const is_commit =
        editing._tag === "EditingCell" &&
        (message._tag === "CommittedEditor" ||
            message._tag === "SubmittedEditor" ||
            (message._tag === "PressedGridKey" && message.key === "Enter") ||
            ((message._tag === "SelectedCell" ||
                message._tag === "DoubleClickedCell") &&
                (message.address.row !== editing.address.row ||
                    message.address.column !== editing.address.column)))
    if (
        editing._tag === "EditingCell" &&
        (message._tag === "SelectedCell" ||
            message._tag === "DoubleClickedCell") &&
        !is_commit
    )
        return [model, []]
    if (is_commit && editing._tag === "EditingCell") {
        if (!model.can_write || model.busy || Option.isNone(model.cell_edit))
            return [model, []]
        const table = model.tables.find(
            (table) => table.id === model.selected_id
        )
        if (table === undefined) return [model, []]
        const edit = model.cell_edit.value
        const values = { ...edit.values, [edit.column_key]: editing.draft }
        try {
            validate_row(table.columns, values)
        } catch (error) {
            return [{ ...model, error: String(error) }, []]
        }
        const { model: spreadsheet } = Spreadsheet.update(
            model.spreadsheet,
            CommittedEditor()
        )
        return persist(
            {
                ...model,
                spreadsheet,
                cell_edit: Option.some({ ...edit, draft: editing.draft }),
            },
            {
                _tag: "UpdateRow",
                table_id: table.id,
                schema_revision: edit.schema_revision,
                row_id: edit.row_id,
                row_revision: edit.row_revision,
                values,
            }
        )
    }
    const { model: spreadsheet, commands = [] } = Spreadsheet.update(
        model.spreadsheet,
        message
    )
    let cell_edit = model.cell_edit
    if (spreadsheet.editor._tag === "EditingCell" && Option.isNone(cell_edit)) {
        const address = spreadsheet.editor.address
        const row = model.rows[address.row]
        const table = model.tables.find(
            (table) => table.id === model.selected_id
        )
        const column = table?.columns[address.column]
        if (row === undefined || table === undefined || column === undefined)
            return [model, []]
        cell_edit = Option.some({
            row_id: row.id,
            row_revision: row.revision,
            schema_revision: table.revision,
            column_key: column.key,
            values: raw_values(row.values),
            address,
            draft: spreadsheet.editor.draft,
        })
    }
    if (message._tag === "CancelledEditor") cell_edit = Option.none()
    return [
        {
            ...model,
            spreadsheet,
            cell_edit,
            error:
                message._tag === "CancelledEditor" ||
                message._tag === "UpdatedEditorDraft"
                    ? ""
                    : model.error,
        },
        Command.mapMessages(commands, (message) =>
            GotSpreadsheetMessage({ message })
        ),
    ]
}
