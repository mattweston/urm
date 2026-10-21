import { Effect, Schema as S } from "effect"
import { Command } from "foldkit"
import { focus } from "foldkit/dom"
import {
    CompletedFocusEditor,
    CompletedFocusCell,
    FailedLoadWorkbook,
    FailedSaveWorkbook,
    SucceededLoadWorkbook,
    SucceededSaveWorkbook,
} from "./spreadsheet.message.ts"
import {
    MAX_CELL_TEXT_LENGTH,
    ROW_COUNT,
    COLUMN_COUNT,
    WORKBOOK_STORAGE_KEY,
} from "./spreadsheet.domain.ts"

export const FocusEditor = Command.define("FocusEditor", {
    args: { id: S.String },
    messages: [CompletedFocusEditor],
    execute: ({ id }) =>
        focus(`#${id}`, { preventScroll: true }).pipe(
            Effect.ignore,
            Effect.as(CompletedFocusEditor())
        ),
})

export const FocusCell = Command.define("FocusCell", {
    args: { id: S.String },
    messages: [CompletedFocusCell],
    execute: ({ id }) =>
        focus(`#${id}`).pipe(Effect.ignore, Effect.as(CompletedFocusCell())),
})

const validCells = (value: unknown): Record<string, string> => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return {}
    }
    const cells: Record<string, string> = {}
    for (const [key, cell] of Object.entries(value)) {
        const match = /^(0|[1-9]\d*):(0|[1-9]\d*)$/.exec(key)
        if (
            match === null ||
            typeof cell !== "string" ||
            cell.length > MAX_CELL_TEXT_LENGTH
        ) {
            return {}
        }
        const row = Number(match[1])
        const column = Number(match[2])
        if (row >= ROW_COUNT || column >= COLUMN_COUNT) {
            return {}
        }
        cells[key] = cell
    }
    return cells
}

export const LoadWorkbook = Command.define("LoadWorkbook", {
    messages: [SucceededLoadWorkbook, FailedLoadWorkbook],
    execute: Effect.sync(() => {
        try {
            const source = localStorage.getItem(WORKBOOK_STORAGE_KEY)
            if (source === null) {
                return SucceededLoadWorkbook({ cells: {} })
            }
            const parsed = S.decodeUnknownSync(
                S.Struct({
                    version: S.Number,
                    cells: S.Unknown,
                })
            )(JSON.parse(source))
            return SucceededLoadWorkbook({
                cells: parsed.version === 1 ? validCells(parsed.cells) : {},
            })
        } catch {
            return FailedLoadWorkbook()
        }
    }),
})

export const SaveWorkbook = Command.define("SaveWorkbook", {
    args: { cells: S.Record(S.String, S.String) },
    messages: [SucceededSaveWorkbook, FailedSaveWorkbook],
    execute: ({ cells }) =>
        Effect.sync(() => {
            try {
                localStorage.setItem(
                    WORKBOOK_STORAGE_KEY,
                    JSON.stringify({ version: 1, cells })
                )
                return SucceededSaveWorkbook()
            } catch {
                return FailedSaveWorkbook()
            }
        }),
})
