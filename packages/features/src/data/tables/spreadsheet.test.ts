import { Effect, Option } from "effect"
import { describe, expect, it } from "vitest"
import { Server } from "foldkit/experimental"
import { VirtualList } from "@foldkit/ui"
import type { HtmlBuilder } from "foldkit/html"
import * as Sheet from "../../spreadsheet/spreadsheet.message.ts"
import { init, type Model } from "./model.ts"
import * as Msg from "./message.ts"
import { update } from "./update.ts"
import { view } from "./view.ts"

const ready = (can_write = true): Model => {
    const [tables] = update(
        init("domain-a"),
        Msg.LoadedTables({
            domain_id: "domain-a",
            can_write,
            tables: [
                {
                    id: "table-a",
                    name: "Orders",
                    revision: 4,
                    row_count: 1,
                    columns: [
                        {
                            key: "quantity",
                            name: "Quantity",
                            type: "number",
                            required: true,
                            choices: [],
                            default_value: "",
                        },
                        {
                            key: "note",
                            name: "Note",
                            type: "text",
                            required: false,
                            choices: [],
                            default_value: "",
                        },
                    ],
                },
            ],
        })
    )
    const [selected] = update(tables, Msg.SelectedTable({ id: "table-a" }))
    return update(
        selected,
        Msg.LoadedRows({
            domain_id: "domain-a",
            table_id: "table-a",
            rows: [
                {
                    id: "row-a",
                    revision: 7,
                    values: { quantity: 2, note: "=1+2" },
                },
            ],
        })
    )[0]
}
const send = (model: Model, message: Sheet.Message) =>
    update(model, Msg.GotSpreadsheetMessage({ message }))
const edit_quantity = (model: Model, value: string): Model =>
    send(
        send(
            model,
            Sheet.DoubleClickedCell({ address: { row: 0, column: 0 } })
        )[0],
        Sheet.UpdatedEditorDraft({ value })
    )[0]

describe("canonical spreadsheet data adapter", () => {
    it("populates only table records and preserves formula-like text literally", async () => {
        const initial = ready()
        const [measured] = send(
            initial,
            Sheet.GotRowsMessage({
                message: VirtualList.Message.MeasuredContainer({
                    containerHeight: 512,
                }),
            })
        )
        const [selected] = update(
            measured,
            Msg.SelectedTable({ id: "table-a" })
        )
        const [model] = update(
            selected,
            Msg.LoadedRows({
                domain_id: "domain-a",
                table_id: "table-a",
                rows: initial.rows,
            })
        )
        expect(model.spreadsheet.source).toBe("table")
        expect(model.spreadsheet.cells).toEqual({ "0:0": "2", "0:1": "=1+2" })
        expect(model.spreadsheet.row_count).toBe(1)
        const rendered = await Effect.runPromise(
            Server.renderToString(
                {
                    init: () => ({ model, commands: [] }),
                    view: (model: Model, h: HtmlBuilder<Msg.Message>) => ({
                        title: "Data spreadsheet",
                        body: h.submodel({
                            slotId: "data-test",
                            model,
                            view,
                            toParentMessage: (message) => message,
                        }),
                    }),
                },
                { buildId: "data-spreadsheet" }
            )
        )
        expect(rendered.html).toContain("spreadsheet-cell-address")
        expect(rendered.html).toContain("Orders spreadsheet")
        expect(rendered.html).toContain("A · Quantity")
        expect(rendered.html).toContain('aria-label="B1 =1+2"')
        expect(rendered.html).toContain("1 rows × 2 columns")
        expect(rendered.html).not.toContain("Atlas forecast")
    })

    it("accepts viewport measurements while a save is pending", () => {
        const [saving] = send(
            edit_quantity(ready(), "5"),
            Sheet.CommittedEditor()
        )
        const [measured] = send(
            saving,
            Sheet.GotRowsMessage({
                message: VirtualList.Message.MeasuredContainer({
                    containerHeight: 512,
                }),
            })
        )
        expect(measured.spreadsheet.rows.measurement).toEqual({
            _tag: "Measured",
            containerHeight: 512,
        })
        expect(measured.busy).toBe(true)
    })

    it("uses the existing persistence request with captured row and schema revisions", () => {
        const model = edit_quantity(ready(), "5")
        const [saving, commands] = send(model, Sheet.CommittedEditor())
        expect(saving.busy).toBe(true)
        expect(commands.map((command) => command.name)).toEqual([
            "PersistTable",
        ])
        expect(commands[0]?.args).toEqual({
            domain_id: "domain-a",
            request: {
                _tag: "UpdateRow",
                table_id: "table-a",
                row_id: "row-a",
                schema_revision: 4,
                row_revision: 7,
                values: { quantity: "5", note: "=1+2" },
            },
        })
        expect(send(saving, Sheet.CommittedEditor())[1]).toEqual([])
    })

    it("rejects invalid typed cells and blocks read-only edits", () => {
        const [invalid, commands] = send(
            edit_quantity(ready(), "wrong"),
            Sheet.CommittedEditor()
        )
        expect(commands).toEqual([])
        expect(invalid.error).toContain("finite number")
        expect(invalid.spreadsheet.editor._tag).toBe("EditingCell")
        const readonly = ready(false)
        expect(
            send(
                readonly,
                Sheet.DoubleClickedCell({ address: { row: 0, column: 0 } })
            )[1]
        ).toEqual([])
        expect(
            send(readonly, Sheet.PressedGridKey({ key: "Enter" }))[0]
                .spreadsheet.editor._tag
        ).toBe("IdleEditor")
    })

    it("does not retarget an active edit when reactive rows reorder", () => {
        const editing = edit_quantity(ready(), "5")
        const [refreshed] = update(
            editing,
            Msg.LoadedRows({
                domain_id: "domain-a",
                table_id: "table-a",
                rows: [
                    { id: "row-b", revision: 1, values: { quantity: 10 } },
                    { id: "row-a", revision: 8, values: { quantity: 3 } },
                ],
            })
        )
        expect(refreshed.spreadsheet.cells).toEqual(editing.spreadsheet.cells)
        const [, commands] = send(refreshed, Sheet.CommittedEditor())
        expect(commands[0]?.args).toMatchObject({
            request: { row_id: "row-a", row_revision: 7 },
        })
    })

    it("retains a failed draft and restores the current snapshot on Escape", () => {
        const [saving] = send(
            edit_quantity(ready(), "5"),
            Sheet.CommittedEditor()
        )
        const [failed] = update(
            saving,
            Msg.FailedRequest({
                domain_id: "domain-a",
                error: "Revision conflict",
            })
        )
        expect(failed.spreadsheet.editor).toMatchObject({
            _tag: "EditingCell",
            draft: "5",
        })
        expect(failed.error).toContain("retained")
        const [cancelled] = send(failed, Sheet.CancelledEditor())
        expect(Option.isNone(cancelled.cell_edit)).toBe(true)
        expect(cancelled.spreadsheet.cells["0:0"]).toBe("2")
    })

    it("ignores stale domain data and resets the grid when selecting another table", () => {
        const model = ready()
        expect(
            update(
                model,
                Msg.LoadedRows({
                    domain_id: "domain-b",
                    table_id: "table-a",
                    rows: [],
                })
            )[0]
        ).toBe(model)
        const [reset] = update(
            edit_quantity(model, "5"),
            Msg.SelectedTable({ id: "" })
        )
        expect(reset.spreadsheet.cells).toEqual({})
        expect(Option.isNone(reset.cell_edit)).toBe(true)
    })

    it("clears pending edits after successful persistence and applies the reactive snapshot", () => {
        const [saving] = send(
            edit_quantity(ready(), "5"),
            Sheet.CommittedEditor()
        )
        const [refreshed] = update(
            saving,
            Msg.LoadedRows({
                domain_id: "domain-a",
                table_id: "table-a",
                rows: [
                    {
                        id: "row-a",
                        revision: 8,
                        values: { quantity: 5, note: "=1+2" },
                    },
                ],
            })
        )
        const [completed] = update(
            refreshed,
            Msg.CompletedRequest({
                domain_id: "domain-a",
                operation: "UpdateRow",
                created_id: "",
                source_rows: [],
            })
        )
        expect(completed.busy).toBe(false)
        expect(completed.spreadsheet.cells["0:0"]).toBe("5")
        expect(Option.isNone(completed.cell_edit)).toBe(true)
    })
})
