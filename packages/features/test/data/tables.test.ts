import type { TableDefinition } from "@urm/domain/schemas/data-tables"
import { expect, test } from "vitest"
import { init } from "../../src/data/tables/model.ts"
import * as M from "../../src/data/tables/message.ts"
import { update, preview_errors } from "../../src/data/tables/update.ts"

const table: TableDefinition = {
    id: "table-1",
    name: "Orders",
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
    revision: 1,
    row_count: 0,
}
const loaded = () =>
    update(
        init("domain-1"),
        M.LoadedTables({
            domain_id: "domain-1",
            can_write: true,
            tables: [table],
        })
    )[0]

test("ignores stale domain and selected-table responses", () => {
    const model = loaded()
    expect(
        update(
            model,
            M.LoadedTables({
                domain_id: "domain-2",
                can_write: true,
                tables: [],
            })
        )[0]
    ).toBe(model)
    expect(
        update(
            model,
            M.LoadedRows({ domain_id: "domain-1", table_id: "old", rows: [] })
        )[0]
    ).toBe(model)
})
test("validates mapped uploads before issuing an atomic import command", () => {
    let model = update(loaded(), M.SelectedTable({ id: "table-1" }))[0]
    model = update(
        model,
        M.CompletedRequest({
            domain_id: "domain-1",
            operation: "ReadUpload",
            created_id: "",
            source_rows: [{ Quantity: "bad" }],
        })
    )[0]
    expect(preview_errors(model)[0]).toContain("Row 1")
    expect(update(model, M.SubmittedImport())[1]).toHaveLength(0)
    model = update(
        model,
        M.CompletedRequest({
            domain_id: "domain-1",
            operation: "ReadUpload",
            created_id: "",
            source_rows: [{ Quantity: "4" }],
        })
    )[0]
    expect(update(model, M.SubmittedImport())[1]).toHaveLength(0)
    model = update(model, M.PreviewedImport())[0]
    const [saving, commands] = update(model, M.SubmittedImport())
    expect(commands).toHaveLength(1)
    expect(commands[0]?.args).toMatchObject({
        domain_id: "domain-1",
        request: { _tag: "Append", rows: [{ quantity: "4" }] },
    })
    expect(update(saving, M.SubmittedImport())[1]).toHaveLength(0)
})
test("members cannot issue write commands", () => {
    const model = {
        ...loaded(),
        selected_id: "table-1",
        can_write: false,
        editing_id: "new",
        draft: { quantity: "2" },
    }
    expect(update(model, M.SubmittedRow())[1]).toHaveLength(0)
})
