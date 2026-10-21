import { Command, given, message, model, story } from "foldkit/story"
import { describe, expect, test } from "vitest"
import { FocusCell, FocusEditor, SaveWorkbook } from "./spreadsheet.command.ts"
import {
    CompletedFocusCell,
    CompletedFocusEditor,
    DoubleClickedCell,
    CommittedEditor,
    SucceededLoadWorkbook,
    SucceededSaveWorkbook,
    SubmittedEditor,
    UpdatedEditorDraft,
} from "./spreadsheet.message.ts"
import { init, update } from "./spreadsheet.update.ts"

const initialModel = init().model

describe("spreadsheet update", () => {
    test("restores persisted cells", () => {
        story(
            update,
            given(initialModel),
            message(SucceededLoadWorkbook({ cells: { "0:0": "Roadmap" } })),
            model((model) => {
                expect(model.cells["0:0"]).toBe("Roadmap")
                expect(model.status).toBe("Workbook restored from this browser")
            })
        )
    })

    test("edits and saves a cell", () => {
        story(
            update,
            given(initialModel),
            message(DoubleClickedCell({ address: { row: 0, column: 0 } })),
            Command.resolve(FocusEditor, CompletedFocusEditor()),
            message(UpdatedEditorDraft({ value: "Quarterly roadmap" })),
            message(CommittedEditor()),
            Command.resolve(SaveWorkbook, SucceededSaveWorkbook()),
            model((model) => {
                expect(model.cells["0:0"]).toBe("Quarterly roadmap")
                expect(model.status).toBe("All changes saved")
            })
        )
    })

    test("submits an edit and selects the cell below", () => {
        story(
            update,
            given(initialModel),
            message(DoubleClickedCell({ address: { row: 0, column: 1 } })),
            Command.resolve(FocusEditor, CompletedFocusEditor()),
            message(UpdatedEditorDraft({ value: "Updated forecast" })),
            message(SubmittedEditor()),
            Command.resolve(SaveWorkbook, SucceededSaveWorkbook()),
            Command.resolve(FocusCell, CompletedFocusCell()),
            model((model) => {
                expect(model.cells["0:1"]).toBe("Updated forecast")
                expect(model.selected).toEqual({ row: 1, column: 1 })
                expect(model.editor._tag).toBe("IdleEditor")
            })
        )
    })
})
