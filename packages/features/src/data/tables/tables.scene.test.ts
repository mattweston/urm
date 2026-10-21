import {
    click,
    expect,
    given,
    label,
    role,
    Command,
    scene,
    submit,
    text,
    type,
} from "foldkit/scene"
import { test } from "vitest"
import { init, type Model } from "./model.ts"
import { CompletedRequest } from "./message.ts"
import { PersistTable, update } from "./update.ts"
import { view } from "./view.ts"

const admin: Model = { ...init("domain-1"), loaded: true, can_write: true }

test("an admin can open and fill the schema designer through labeled controls", () => {
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
        given(admin),
        click(role("button", { name: "Create table" })),
        type(label("Table name"), "Orders"),
        type(label("Name"), "Quantity"),
        type(label("Key"), "quantity"),
        expect(label("Table name")).toHaveValue("Orders"),
        expect(label("Key")).toHaveValue("quantity"),
        submit(role("form", { name: "Table schema" })),
        expect(text("Creating…")).toExist(),
        Command.resolve(
            PersistTable,
            CompletedRequest({
                domain_id: "domain-1",
                operation: "Create",
                created_id: "table-1",
                source_rows: [],
            })
        ),
        expect(text("Table created")).toExist()
    )
})

test("invalid cell edits display the shared validation error", () => {
    const model: Model = {
        ...admin,
        selected_id: "table-1",
        rows_loaded: true,
        tables: [
            {
                id: "table-1",
                name: "Orders",
                revision: 1,
                row_count: 0,
                columns: [
                    {
                        key: "quantity",
                        name: "Quantity",
                        type: "number",
                        required: true,
                        choices: [],
                        default_value: "",
                    },
                ],
            },
        ],
    }
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
        click(role("button", { name: "Add row" })),
        type(label("Quantity (required) · number"), "wrong"),
        submit(role("form", { name: "Table row" })),
        expect(text("Error: Quantity must be a finite number")).toExist()
    )
})
