import { Effect, Match as M } from "effect"
import { Command, type Update } from "foldkit"
import { VirtualList } from "@foldkit/ui"
import { modifyFields } from "foldkit/struct"
import {
    FocusEditor,
    FocusCell,
    LoadWorkbook,
    SaveWorkbook,
} from "./spreadsheet.command.ts"
import {
    addressLabel,
    cellId,
    cellKey,
    clampAddress,
    editorId,
    MAX_CELL_TEXT_LENGTH,
    parseAddress,
    readRaw,
    ROW_COUNT,
    COLUMN_COUNT,
} from "./spreadsheet.domain.ts"
import { GotRowsMessage, type Message } from "./spreadsheet.message.ts"
import type { Model } from "./spreadsheet.model.ts"
import { EditingCell, IdleEditor } from "./spreadsheet.model.ts"

type UpdateReturn = Update.Return<Model, Message>
const withUpdateReturn = M.withReturnType<UpdateReturn>()
const DEFAULT_COLUMN_WIDTH = 132
const FIRST_COLUMN_WIDTH = 184
const ROW_HEADER_WIDTH = 54

const mapRowsCommands = (
    commands: ReadonlyArray<Command.Command<VirtualList.Message>>
): ReadonlyArray<Command.Command<Message>> =>
    commands.map(
        Command.mapEffect(Effect.map((message) => GotRowsMessage({ message })))
    )

export const init = (): UpdateReturn => ({
    model: {
        source: "browser",
        title: "Atlas forecast",
        row_count: ROW_COUNT,
        column_labels: Array.from({ length: COLUMN_COUNT }, () => ""),
        can_write: true,
        cells: {},
        selected: { row: 0, column: 0 },
        editor: IdleEditor(),
        nameDraft: "A1",
        status: "Opening workbook",
        rows: VirtualList.init({
            id: "foldkit-spreadsheet-rows",
            rowHeightPx: 34,
        }),
        columnScrollLeft: 0,
        columnViewportWidth: 920,
    },
    commands: [LoadWorkbook()],
})

export const init_table = (): Model => ({
    ...init().model,
    source: "table",
    title: "Data",
    row_count: 0,
    column_labels: [],
    can_write: false,
    status: "Choose a table",
})

export const read_cell = (model: Model, address: Model["selected"]): string =>
    model.source === "table"
        ? (model.cells[cellKey(address)] ?? "")
        : readRaw(model.cells, address)

const bounded_address = (model: Model, address: Model["selected"]) =>
    clampAddress({
        row: Math.min(address.row, Math.max(0, model.row_count - 1)),
        column: Math.min(
            address.column,
            Math.max(0, model.column_labels.length - 1)
        ),
    })

const select = (model: Model, row: number, column: number): Model => {
    const selected = bounded_address(model, { row, column })
    return modifyFields(model, {
        selected: () => selected,
        editor: () => IdleEditor(),
        nameDraft: () => addressLabel(selected),
    })
}

const focusEditor = (address: Model["selected"]) =>
    FocusEditor({ id: editorId(address) })

const scrollLeftForColumn = (model: Model, column: number): number => {
    const left =
        column === 0
            ? ROW_HEADER_WIDTH
            : ROW_HEADER_WIDTH +
              FIRST_COLUMN_WIDTH +
              (column - 1) * DEFAULT_COLUMN_WIDTH
    const right =
        left + (column === 0 ? FIRST_COLUMN_WIDTH : DEFAULT_COLUMN_WIDTH)
    return left < model.columnScrollLeft
        ? left
        : right > model.columnScrollLeft + model.columnViewportWidth
          ? right - model.columnViewportWidth
          : model.columnScrollLeft
}

const focusCell = (address: Model["selected"]) =>
    FocusCell({ id: cellId(address) })

const submitEditor = (model: Model): UpdateReturn => {
    const { model: committed, commands = [] } = commit(model)
    const selected = bounded_address(model, {
        row: model.selected.row + 1,
        column: model.selected.column,
    })
    return {
        model: select(committed, selected.row, selected.column),
        commands: [...commands, focusCell(selected)],
    }
}

const commit = (model: Model): UpdateReturn => {
    if (!model.can_write || model.editor._tag === "IdleEditor") {
        return { model, commands: [] }
    }
    const raw = model.editor.draft.slice(0, MAX_CELL_TEXT_LENGTH)
    const cells = { ...model.cells, [cellKey(model.editor.address)]: raw }
    return {
        model: modifyFields(model, {
            cells: () => cells,
            editor: () => IdleEditor(),
            status: () => "Saving change",
        }),
        commands: model.source === "browser" ? [SaveWorkbook({ cells })] : [],
    }
}

const updateEditorDraft = (model: Model, value: string): UpdateReturn => {
    if (model.editor._tag === "IdleEditor") {
        return { model, commands: [] }
    }
    const address = model.editor.address
    return {
        model: modifyFields(model, {
            editor: () => EditingCell({ address, draft: value }),
        }),
        commands: [],
    }
}

export const update = (model: Model, message: Message): UpdateReturn => {
    if (
        model.source === "table" &&
        [
            "SucceededLoadWorkbook",
            "FailedLoadWorkbook",
            "SucceededSaveWorkbook",
            "FailedSaveWorkbook",
        ].includes(message._tag)
    )
        return { model, commands: [] }
    if (
        (!model.can_write || model.row_count === 0) &&
        (message._tag === "DoubleClickedCell" ||
            (message._tag === "PressedGridKey" && message.key === "Enter"))
    )
        return { model, commands: [] }
    return M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            GotRowsMessage: ({ message: rowsMessage }) => {
                const { model: rows, commands = [] } = VirtualList.update(
                    model.rows,
                    rowsMessage
                )
                return {
                    model: modifyFields(model, { rows: () => rows }),
                    commands: mapRowsCommands(commands),
                }
            },
            SelectedCell: ({ address }) => ({
                model: select(model, address.row, address.column),
                commands: [],
            }),
            DoubleClickedCell: ({ address }) => ({
                model: modifyFields(select(model, address.row, address.column), {
                    editor: () =>
                        EditingCell({
                            address,
                            draft: read_cell(model, address),
                        }),
                }),
                commands: [focusEditor(address)],
            }),
            UpdatedEditorDraft: ({ value }) => updateEditorDraft(model, value),
            CommittedEditor: () => commit(model),
            SubmittedEditor: () => submitEditor(model),
            CancelledEditor: () => ({
                model: modifyFields(model, { editor: () => IdleEditor() }),
                commands: [],
            }),
            CompletedFocusEditor: () => ({ model, commands: [] }),
            CompletedFocusCell: () => ({ model, commands: [] }),
            PressedGridKey: ({ key }) => {
                if (key === "Enter") {
                    return model.editor._tag === "EditingCell"
                        ? commit(model)
                        : {
                              model: modifyFields(model, {
                                  editor: () =>
                                      EditingCell({
                                          address: model.selected,
                                          draft: read_cell(
                                              model,
                                              model.selected
                                          ),
                                      }),
                              }),
                              commands: [focusEditor(model.selected)],
                          }
                }
                const rowDelta =
                    key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0
                const columnDelta =
                    key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0
                return rowDelta === 0 && columnDelta === 0
                    ? { model, commands: [] }
                    : (() => {
                          const selected = bounded_address(model, {
                              row: model.selected.row + rowDelta,
                              column: model.selected.column + columnDelta,
                          })
                          const columnScrollLeft = scrollLeftForColumn(
                              model,
                              selected.column
                          )
                          return {
                              model: modifyFields(
                                  select(model, selected.row, selected.column),
                                  {
                                      columnScrollLeft: () => columnScrollLeft,
                                  }
                              ),
                              commands: [focusCell(selected)],
                          }
                      })()
            },
            UpdatedNameDraft: ({ value }) => ({
                model: modifyFields(model, { nameDraft: () => value }),
                commands: [],
            }),
            SubmittedName: () => {
                const address = parseAddress(model.nameDraft)
                return address === undefined ||
                    address.row >= model.row_count ||
                    address.column >= model.column_labels.length
                    ? {
                          model: modifyFields(model, {
                              status: () => "Enter a cell such as A1",
                          }),
                          commands: [],
                      }
                    : {
                          model: select(model, address.row, address.column),
                          commands: [],
                      }
            },
            ScrolledColumns: ({ scrollLeft, viewportWidth }) => ({
                model: modifyFields(model, {
                    columnScrollLeft: () => scrollLeft,
                    columnViewportWidth: () => viewportWidth,
                }),
                commands: [],
            }),
            SucceededLoadWorkbook: ({ cells }) => ({
                model: modifyFields(model, {
                    cells: () => cells,
                    status: () => "Workbook restored from this browser",
                }),
                commands: [],
            }),
            FailedLoadWorkbook: () => ({
                model: modifyFields(model, {
                    status: () => "Local storage unavailable",
                }),
                commands: [],
            }),
            SucceededSaveWorkbook: () => ({
                model: modifyFields(model, { status: () => "All changes saved" }),
                commands: [],
            }),
            FailedSaveWorkbook: () => ({
                model: modifyFields(model, {
                    status: () => "Local storage unavailable",
                }),
                commands: [],
            }),
        })
    )
}
