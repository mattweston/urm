import { Array, Option } from "effect"
import clsx from "clsx"
import { Submodel } from "foldkit"
import {
    childAttributes,
    createKeyedLazy,
    type Html,
    type HtmlBuilder,
} from "foldkit/html"
import { Input, VirtualList } from "@foldkit/ui"
import {
    addressLabel,
    cellId,
    COLUMN_COUNT,
    columnLabel,
    displayCell,
    editorId,
    ROW_COUNT,
    type CellAddress,
    type CellValues,
} from "./spreadsheet.domain.ts"
import {
    CancelledEditor,
    CommittedEditor,
    DoubleClickedCell,
    GotRowsMessage,
    PressedGridKey,
    SelectedCell,
    SubmittedName,
    SubmittedEditor,
    UpdatedEditorDraft,
    UpdatedNameDraft,
    type Message,
} from "./spreadsheet.message.ts"
import type { Model } from "./spreadsheet.model.ts"
import { read_cell } from "./spreadsheet.update.ts"

const columns = Array.makeBy(COLUMN_COUNT, (column) => column)
const rows = Array.makeBy(ROW_COUNT, (row) => row)
const DEFAULT_COLUMN_WIDTH = 132
const FIRST_COLUMN_WIDTH = 184
const ROW_HEADER_WIDTH = 54
const COLUMN_OVERSCAN = 2
const lazyRow = createKeyedLazy()

type ColumnWindow = Readonly<{
    start: number
    end: number
    leftSpacerWidth: number
    rightSpacerWidth: number
    gridTemplate: string
}>

const columnOffset = (column: number): number =>
    column === 0 ? 0 : FIRST_COLUMN_WIDTH + (column - 1) * DEFAULT_COLUMN_WIDTH

const columnWindow = (
    scrollLeft: number,
    viewportWidth: number,
    column_count: number
): ColumnWindow => {
    const total_grid_width =
        column_count === 0
            ? 0
            : FIRST_COLUMN_WIDTH + (column_count - 1) * DEFAULT_COLUMN_WIDTH
    const columnScrollLeft = Math.max(0, scrollLeft - ROW_HEADER_WIDTH)
    const columnViewportWidth = Math.max(0, viewportWidth - ROW_HEADER_WIDTH)
    const firstVisible =
        columnScrollLeft < FIRST_COLUMN_WIDTH
            ? 0
            : 1 +
              Math.floor(
                  (columnScrollLeft - FIRST_COLUMN_WIDTH) / DEFAULT_COLUMN_WIDTH
              )
    const lastVisible = Math.min(
        column_count,
        1 +
            Math.ceil(
                Math.max(
                    0,
                    columnScrollLeft + columnViewportWidth - FIRST_COLUMN_WIDTH
                ) / DEFAULT_COLUMN_WIDTH
            )
    )
    const start = Math.min(
        column_count,
        Math.max(0, firstVisible - COLUMN_OVERSCAN)
    )
    const end = Math.min(column_count, lastVisible + COLUMN_OVERSCAN)
    const visibleColumns = columns.slice(start, end)
    const leftSpacerWidth = Math.min(total_grid_width, columnOffset(start))
    const visibleWidth = visibleColumns.reduce(
        (width, column) =>
            width + (column === 0 ? FIRST_COLUMN_WIDTH : DEFAULT_COLUMN_WIDTH),
        0
    )
    const rightSpacerWidth = total_grid_width - leftSpacerWidth - visibleWidth
    const templates = [
        ...(leftSpacerWidth > 0 ? [`${leftSpacerWidth}px`] : []),
        ...visibleColumns.map((column) =>
            column === 0
                ? `${FIRST_COLUMN_WIDTH}px`
                : `${DEFAULT_COLUMN_WIDTH}px`
        ),
        ...(rightSpacerWidth > 0 ? [`${rightSpacerWidth}px`] : []),
    ]
    return {
        start,
        end,
        leftSpacerWidth,
        rightSpacerWidth,
        gridTemplate: `${ROW_HEADER_WIDTH}px ${templates.join(" ")}`,
    }
}

const spacerView = (key: string, h: HtmlBuilder<Message>): Html =>
    h.keyed("div")(key, [h.AriaHidden(true)])

const cell = (
    cells: CellValues,
    address: CellAddress,
    selectedColumn: number | undefined,
    editingColumn: number | undefined,
    editorDraft: string,
    is_table: boolean,
    h: HtmlBuilder<Message>
): Html => {
    const display = is_table
        ? (cells[`${address.row}:${address.column}`] ?? "")
        : displayCell(cells, address)
    const isSelected = selectedColumn === address.column
    const isEditing = editingColumn === address.column
    const className = clsx(
        "flex h-[34px] min-w-0 select-none items-center overflow-hidden whitespace-nowrap border-b border-r-(length:--surface-border-width) border-border bg-card px-2.5 text-xs leading-none text-foreground outline-none",
        {
            "relative z-10 ring-2 ring-inset ring-primary": isSelected,
            "hover:bg-muted/50": !isSelected,
        }
    )
    return h.keyed("div")(
        `${address.row}:${address.column}`,
        [
            h.Class(className),
            h.Id(cellId(address)),
            h.Tabindex(isSelected ? 0 : -1),
            h.AriaLabel(`${addressLabel(address)} ${display}`),
            h.OnClick(SelectedCell({ address })),
            h.OnDoubleClick(DoubleClickedCell({ address })),
            ...(isEditing
                ? []
                : [
                      h.OnKeyDownPreventDefault((key) =>
                          [
                              "ArrowUp",
                              "ArrowDown",
                              "ArrowLeft",
                              "ArrowRight",
                              "Enter",
                          ].includes(key)
                              ? Option.some(PressedGridKey({ key }))
                              : Option.none()
                      ),
                  ]),
        ],
        isEditing ? [editorView(address, editorDraft, h)] : [display]
    )
}

const editorView = (
    address: CellAddress,
    editorDraft: string,
    h: HtmlBuilder<Message>
): Html =>
    Input.view(
        {
            id: editorId(address),
            value: editorDraft,
            onInput: (value) => UpdatedEditorDraft({ value }),
            toView: (attributes) =>
                h.input([
                    ...attributes.input,
                    h.Class(
                        "absolute inset-0 z-20 h-full w-full border-0 bg-card px-2.5 text-center text-xs outline-none ring-0 shadow-none focus:ring-0 focus-visible:ring-0"
                    ),
                    h.AriaLabel(`Edit ${addressLabel(address)}`),
                    h.OnBlur(CommittedEditor()),
                    h.OnKeyDownPreventDefault((key) =>
                        key === "Enter"
                            ? Option.some(SubmittedEditor())
                            : key === "Escape"
                              ? Option.some(CancelledEditor())
                              : Option.none()
                    ),
                ]),
        },
        h
    )

const rowView = (
    cells: CellValues,
    row: number,
    selectedColumn: number | undefined,
    editingColumn: number | undefined,
    editorDraft: string,
    columnStart: number,
    columnEnd: number,
    leftSpacerWidth: number,
    rightSpacerWidth: number,
    gridTemplate: string,
    columnScrollLeft: number,
    is_table: boolean,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("grid"), h.Style({ gridTemplateColumns: gridTemplate })],
        [
            h.div(
                [
                    h.Class(
                        "relative z-20 grid h-[34px] w-[54px] select-none place-items-center border-b border-r-(length:--surface-border-width) border-border bg-muted text-[11px] font-bold text-muted-foreground"
                    ),
                    h.Style({
                        transform: `translateX(${columnScrollLeft}px)`,
                    }),
                    h.AriaHidden(true),
                ],
                [`${row + 1}`]
            ),
            ...(leftSpacerWidth > 0 ? [spacerView(`left-${row}`, h)] : []),
            ...Array.map(columns.slice(columnStart, columnEnd), (column) =>
                cell(
                    cells,
                    { row, column },
                    selectedColumn,
                    editingColumn,
                    editorDraft,
                    is_table,
                    h
                )
            ),
            ...(rightSpacerWidth > 0 ? [spacerView(`right-${row}`, h)] : []),
        ]
    )

const lazyRowView = (
    model: Model,
    row: number,
    visibleWindow: ColumnWindow,
    h: HtmlBuilder<Message>
): Html => {
    const selectedColumn =
        model.selected.row === row ? model.selected.column : undefined
    const editingColumn =
        model.editor._tag === "EditingCell" && model.editor.address.row === row
            ? model.editor.address.column
            : undefined
    const editorDraft =
        model.editor._tag === "EditingCell" && editingColumn !== undefined
            ? model.editor.draft
            : ""

    return lazyRow(String(row), rowView, [
        model.cells,
        row,
        selectedColumn,
        editingColumn,
        editorDraft,
        visibleWindow.start,
        visibleWindow.end,
        visibleWindow.leftSpacerWidth,
        visibleWindow.rightSpacerWidth,
        visibleWindow.gridTemplate,
        model.columnScrollLeft,
        model.source === "table",
        h,
    ])
}

const addressInputView = (model: Model, h: HtmlBuilder<Message>): Html =>
    Input.view(
        {
            id: "spreadsheet-cell-address",
            value: model.nameDraft,
            onInput: (value) => UpdatedNameDraft({ value }),
            toView: (attributes) =>
                h.input([
                    ...attributes.input,
                    h.Class(
                        "h-8 w-24 rounded border-(length:--field-border-width) border-input bg-background px-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    ),
                    h.AriaLabel("Cell address"),
                ]),
        },
        h
    )

const contentView = (model: Model, h: HtmlBuilder<Message>): Html => {
    const is_table = model.source === "table"
    const grid_width =
        ROW_HEADER_WIDTH +
        (model.column_labels.length === 0
            ? 0
            : FIRST_COLUMN_WIDTH +
              (model.column_labels.length - 1) * DEFAULT_COLUMN_WIDTH)
    const visibleWindow = columnWindow(
        model.columnScrollLeft,
        model.columnViewportWidth,
        model.column_labels.length
    )
    return h.div(
        [
            h.Class(
                clsx(
                    "flex max-w-full flex-col overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]",
                    is_table ? "min-w-0" : "mx-auto min-h-[38rem] w-full"
                )
            ),
            ...(is_table
                ? [
                      h.Style({
                          width: `calc(${grid_width}px + 2rem + 4 * var(--surface-border-width))`,
                      }),
                  ]
                : []),
        ],
        [
            h.header(
                [
                    h.Class(
                        "flex flex-wrap items-center justify-between gap-3 border-b-(length:--surface-border-width) border-border px-4 py-3"
                    ),
                ],
                [
                    h.div(
                        [],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"
                                    ),
                                ],
                                [model.title]
                            ),
                            h.h1(
                                [h.Class("text-lg font-semibold")],
                                ["Spreadsheet"]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class("text-xs text-muted-foreground"),
                            h.AriaLive("polite"),
                        ],
                        [model.status]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "flex items-center gap-2 border-b-(length:--surface-border-width) border-border bg-muted/30 p-2"
                    ),
                ],
                [
                    h.form(
                        [h.Class("contents"), h.OnSubmit(SubmittedName())],
                        [addressInputView(model, h)]
                    ),
                    h.div([h.Class("h-5 w-px bg-border")]),
                    h.div(
                        [h.Class("min-w-0 flex-1 truncate font-mono text-xs")],
                        [read_cell(model, model.selected)]
                    ),
                ]
            ),
            h.main(
                [h.Class("min-h-0 min-w-0 bg-background p-4")],
                [
                    h.div(
                        [
                            h.Class(
                                "relative w-full min-h-0 min-w-0 max-w-full overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"
                            ),
                            h.Id("foldkit-spreadsheet-grid"),
                            h.AriaLabel(`${model.title} spreadsheet`),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "sticky top-0 z-20 grid w-max border-b-(length:--surface-border-width) border-border bg-muted"
                                    ),
                                    h.Style({
                                        gridTemplateColumns:
                                            visibleWindow.gridTemplate,
                                        transform: `translateX(${-model.columnScrollLeft}px)`,
                                    }),
                                ],
                                [
                                    h.div([
                                        h.Class(
                                            "relative z-30 h-8 w-[54px] border-b border-r-(length:--surface-border-width) border-border bg-muted"
                                        ),
                                        h.Style({
                                            transform: `translateX(${model.columnScrollLeft}px)`,
                                        }),
                                        h.AriaHidden(true),
                                    ]),
                                    ...(visibleWindow.leftSpacerWidth > 0
                                        ? [spacerView("header-left", h)]
                                        : []),
                                    ...Array.map(
                                        columns.slice(
                                            visibleWindow.start,
                                            visibleWindow.end
                                        ),
                                        (column) =>
                                            h.div(
                                                [
                                                    h.Class(
                                                        "h-8 truncate border-r-(length:--surface-border-width) border-border px-2 text-center text-[11px] font-semibold leading-8 text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    model.column_labels[column]
                                                        ? `${columnLabel(column)} · ${model.column_labels[column]}`
                                                        : columnLabel(column),
                                                ]
                                            )
                                    ),
                                    ...(visibleWindow.rightSpacerWidth > 0
                                        ? [spacerView("header-right", h)]
                                        : []),
                                ]
                            ),
                            h.submodel({
                                slotId: model.rows.id,
                                model: model.rows,
                                view: VirtualList.view<number>(),
                                viewInputs: {
                                    items:
                                        model.row_count === ROW_COUNT
                                            ? rows
                                            : rows.slice(0, model.row_count),
                                    itemToKey: (row) => String(row),
                                    itemToView: (row) =>
                                        lazyRowView(
                                            model,
                                            row,
                                            visibleWindow,
                                            h
                                        ),
                                    containerClassName:
                                        "w-full min-w-0 overscroll-contain",
                                    containerAttributes: childAttributes([
                                        h.Style({
                                            height: is_table
                                                ? `${Math.min(model.row_count * 34, 512)}px`
                                                : "512px",
                                            overflow: is_table
                                                ? "auto"
                                                : "scroll",
                                            "scrollbar-width": "thin",
                                            "list-style": "none",
                                            margin: "0",
                                            padding: "0",
                                        }),
                                    ]),
                                },
                                toParentMessage: (message) =>
                                    GotRowsMessage({ message }),
                            }),
                        ]
                    ),
                ]
            ),
            h.footer(
                [
                    h.Class(
                        "flex min-h-[34px] flex-wrap items-center justify-between gap-3 border-t-(length:--surface-border-width) border-border px-3 py-1.5 text-[11px] text-muted-foreground"
                    ),
                ],
                [
                    h.div(
                        [h.AriaLive("polite")],
                        [`${addressLabel(model.selected)} selected`]
                    ),
                    h.div(
                        [h.Class("flex flex-wrap items-center gap-3")],
                        [
                            h.span(
                                [h.Class("flex items-center gap-1")],
                                [
                                    h.kbd(
                                        [
                                            h.Class(
                                                "rounded border-(length:--surface-border-width) border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                                            ),
                                        ],
                                        ["Enter"]
                                    ),
                                    "edit",
                                ]
                            ),
                            h.span(
                                [h.Class("flex items-center gap-1")],
                                [
                                    h.kbd(
                                        [
                                            h.Class(
                                                "rounded border-(length:--surface-border-width) border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                                            ),
                                        ],
                                        ["Shift"]
                                    ),
                                    "+ arrows select",
                                ]
                            ),
                            h.span(
                                [h.Class("flex items-center gap-1")],
                                [
                                    h.kbd(
                                        [
                                            h.Class(
                                                "rounded border-(length:--surface-border-width) border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                                            ),
                                        ],
                                        ["Ctrl/⌘ C"]
                                    ),
                                    "copy",
                                ]
                            ),
                            h.strong(
                                [h.Class("text-foreground")],
                                [
                                    `${model.row_count.toLocaleString()} rows × ${model.column_labels.length} columns`,
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

export const view = Submodel.defineView<Model, Message>(contentView)
