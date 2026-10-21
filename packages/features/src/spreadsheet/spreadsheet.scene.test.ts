import {
    expect,
    given,
    label,
    role,
    scene,
    submit,
    text,
    type,
} from "foldkit/scene"
import { describe, test } from "vitest"
import { init, update } from "./spreadsheet.update.ts"
import { view } from "./spreadsheet.view.ts"

const initialModel = init().model

describe("spreadsheet view", () => {
    test("renders workbook controls", () => {
        scene(
            { update, view },
            given(initialModel),
            expect(label("Cell address")).toHaveValue("A1")
        )
    })

    test("reports an invalid address", () => {
        scene(
            { update, view },
            given(initialModel),
            type(label("Cell address"), "INVALID"),
            submit(role("form")),
            expect(text("Enter a cell such as A1")).toExist()
        )
    })
})
