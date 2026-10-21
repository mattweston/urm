import { describe, expect, test } from "vitest"
import { initial_model } from "./model.ts"
import * as Msg from "./message.ts"
import { update } from "./update.ts"

describe("service canvas", () => {
    test("drags nodes in world coordinates at non-default zoom and records one undo", () => {
        const model = { ...initial_model, x: 40, y: 20, zoom: 0.5 }
        const started = update(
            model,
            Msg.StartedPointer({ point: { x: 100, y: 100 } })
        )
        expect(started.drag?.id).toBe("web")
        const moved = update(
            started,
            Msg.MovedPointer({ point: { x: 124, y: 112 } })
        )
        expect(moved.nodes[0]).toMatchObject({ x: 148, y: 124 })
        const ended = update(moved, Msg.EndedPointer())
        expect(ended.nodes[0]).toMatchObject({ x: 144, y: 120 })
        expect(ended.past).toHaveLength(1)
        const undone = update(ended, Msg.Undid())
        expect(undone.nodes).toEqual(model.nodes)
        expect(update(undone, Msg.Redid()).nodes).toEqual(ended.nodes)
    })

    test("pans empty space without modifying nodes or history", () => {
        const started = update(
            initial_model,
            Msg.StartedPointer({ point: { x: 0, y: 0 } })
        )
        const moved = update(
            started,
            Msg.MovedPointer({ point: { x: 60, y: -30 } })
        )
        const ended = update(moved, Msg.EndedPointer())
        expect(ended).toMatchObject({ x: 60, y: -30, drag: null, past: [] })
        expect(ended.nodes).toBe(initial_model.nodes)
    })

    test("cancels an in-progress drag without adding history", () => {
        const started = update(
            initial_model,
            Msg.StartedPointer({ point: { x: 110, y: 110 } })
        )
        const moved = update(
            started,
            Msg.MovedPointer({ point: { x: 300, y: 220 } })
        )
        const cancelled = update(moved, Msg.CancelledPointer())
        expect(cancelled.nodes).toEqual(initial_model.nodes)
        expect(cancelled.past).toHaveLength(0)
        expect(cancelled.drag).toBeNull()
    })

    test("clamps zoom while keeping the viewport center anchored", () => {
        const zoomed = update(initial_model, Msg.Zoomed({ factor: 20 }))
        expect(zoomed.zoom).toBe(2)
        expect((500 - zoomed.x) / zoomed.zoom).toBe(500)
        expect((300 - zoomed.y) / zoomed.zoom).toBe(300)
        expect(update(zoomed, Msg.Zoomed({ factor: 0.001 })).zoom).toBe(0.4)
    })

    test("supports keyboard movement and clears redo after a new edit", () => {
        const added = update(initial_model, Msg.Added())
        expect(added.nodes).toHaveLength(4)
        const undone = update(added, Msg.Undid())
        const nudged = update(undone, Msg.Nudged({ id: "web", x: 24, y: 0 }))
        expect(nudged.nodes[0]?.x).toBe(124)
        expect(nudged.future).toHaveLength(0)
        expect(update(nudged, Msg.Undid()).nodes).toEqual(initial_model.nodes)
    })
})
