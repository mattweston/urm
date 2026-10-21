import { expect, given, label, role, scene, text, type } from "foldkit/scene"
import { test } from "vitest"
import { initDeferred, update } from "./app.update.ts"
import { view } from "./index.ts"
import type { Model } from "./app.model.ts"

const model: Model = {
    ...initDeferred("domain-1")[0],
    uploads: [
        {
            id: "upload-1",
            filename: "orders.csv",
            row_count: 1,
            status: "completed",
            updated_at: 1,
        },
    ],
}

test("renders the upload library with labeled search and read-only preview actions", () => {
    scene(
        {
            update: (
                model: Parameters<typeof update>[0],
                message: Parameters<typeof update>[1]
            ) => {
                const [next_model, commands] = update(model, message)
                return { model: next_model, commands }
            },
            view,
        },
        given(model),
        expect(role("heading", { name: "CSV uploads" })).toExist(),
        expect(role("button", { name: "Preview rows orders.csv" })).toExist(),
        type(label("Search filenames"), "missing"),
        expect(text("No uploads match these filters.")).toExist()
    )
})

test("renders parsed cells as text in the file preview", () => {
    scene(
        {
            update: (
                model: Parameters<typeof update>[0],
                message: Parameters<typeof update>[1]
            ) => {
                const [next_model, commands] = update(model, message)
                return { model: next_model, commands }
            },
            view,
        },
        given({
            ...model,
            preview_id: "upload-1",
            preview_rows: [
                {
                    id: "row-1",
                    row_index: 0,
                    values: {
                        note: '<script>alert("x")</script>',
                        formula: "=1+2",
                    },
                },
            ],
        }),
        expect(text('<script>alert("x")</script>')).toExist(),
        expect(text("=1+2")).toExist(),
        expect(role("button", { name: "Back to uploads" })).toExist()
    )
})
