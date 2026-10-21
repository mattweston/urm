import { describe, expect, it } from "vitest"
import {
    AddedRectangle,
    ChangedZoom,
    ClickedUndo,
    CompletedSave,
    ToggledOnline,
} from "./draftboard.message.ts"
import { init, update } from "./draftboard.update.ts"

describe("Draftboard update", () => {
    it("records mutations and supports undo", () => {
        const [model] = init()
        const [added, save_commands] = update(model, AddedRectangle())
        const [undone, undo_commands] = update(added, ClickedUndo())

        expect(added.document.shapes).toHaveLength(5)
        expect(added.undo_stack).toHaveLength(1)
        expect(save_commands).toHaveLength(1)
        expect(undone.document.shapes).toHaveLength(4)
        expect(undone.redo_stack).toHaveLength(1)
        expect(undo_commands).toHaveLength(1)
    })

    it("queues offline edits and saves them after reconnecting", () => {
        const [model] = init()
        const [offline] = update(model, ToggledOnline())
        const [queued, offline_commands] = update(offline, AddedRectangle())
        const [saving, reconnect_commands] = update(queued, ToggledOnline())

        expect(queued.sync_state).toBe("Queued")
        expect(offline_commands).toHaveLength(0)
        expect(saving.sync_state).toBe("Saving")
        expect(reconnect_commands).toHaveLength(1)
    })

    it("ignores stale save completions", () => {
        const [model] = init()
        const [first] = update(model, AddedRectangle())
        const [second] = update(first, AddedRectangle())
        const [unchanged] = update(
            second,
            CompletedSave({
                revision: first.revision,
                document: first.document,
                is_success: true,
            })
        )

        expect(unchanged).toEqual(second)
    })

    it("clamps zoom to the supported range", () => {
        const [model] = init()
        const [minimum] = update(model, ChangedZoom({ amount: -10 }))
        const [maximum] = update(minimum, ChangedZoom({ amount: 10 }))

        expect(minimum.zoom).toBe(0.5)
        expect(maximum.zoom).toBe(2)
    })
})
