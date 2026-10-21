import { describe, expect, it } from "vitest"

import { initial_model } from "./model.ts"
import {
    AddedElement,
    ChangedGeometry,
    ChangedPaint,
    DeletedSelected,
    DraggedTo,
    DuplicatedSelected,
    EndedDragging,
    LoadedTemplate,
    NudgedSelected,
    Redid,
    SelectedElement,
    StartedDragging,
    ToggledSnapToGrid,
    Undid,
} from "./message.ts"
import { update } from "./update.ts"

describe("logo designer update", () => {
    it("edits a semantic paint token and supports undo and redo", () => {
        const template = update(initial_model, LoadedTemplate())
        const changed = update(template, ChangedPaint({ paint: "chart-4" }))
        expect(
            changed.elements.find(
                (element) => element.id === changed.selected_element_id
            )?.paint
        ).toBe("chart-4")

        const undone = update(changed, Undid())
        expect(
            undone.elements.find(
                (element) => element.id === undone.selected_element_id
            )?.paint
        ).toBe("foreground")
        expect(update(undone, Redid()).elements).toEqual(changed.elements)
    })

    it("moves the selected vector element in scene coordinates", () => {
        const template = update(initial_model, LoadedTemplate())
        const moved = update(template, NudgedSelected({ x: 2, y: -3 }))
        const centre = moved.elements.find((element) => element.id === "centre")

        expect(centre).toMatchObject({ _tag: "Circle", cx: 52, cy: 47 })
        expect(moved.past).toHaveLength(template.past.length + 1)
    })

    it("builds a blank document as generated layers", () => {
        const rectangle = update(
            initial_model,
            AddedElement({ kind: "Rectangle" })
        )
        const circle = update(rectangle, AddedElement({ kind: "Circle" }))
        const duplicate = update(circle, DuplicatedSelected())

        expect(circle.elements.map((element) => element.name)).toEqual([
            "Rectangle 1",
            "Circle 2",
        ])
        expect(duplicate.elements).toHaveLength(3)
        expect(update(duplicate, DeletedSelected()).elements).toHaveLength(2)
    })

    it("commits a pointer drag as one undo entry", () => {
        const added = update(initial_model, AddedElement({ kind: "Circle" }))
        const started = update(
            added,
            StartedDragging({ id: "circle-1", point: { x: 50, y: 50 } })
        )
        const moved_once = update(
            started,
            DraggedTo({
                point: { x: 55, y: 52 },
                bypass_snap: false,
            })
        )
        const moved_twice = update(
            moved_once,
            DraggedTo({
                point: { x: 60, y: 55 },
                bypass_snap: false,
            })
        )
        const committed = update(moved_twice, EndedDragging())

        expect(committed.elements[0]).toMatchObject({ cx: 60, cy: 55 })
        expect(committed.past).toHaveLength(2)
        expect(update(committed, Undid()).elements[0]).toMatchObject({
            cx: 50,
            cy: 50,
        })
    })

    it("snaps pointer movement to five units and allows Alt bypass", () => {
        const added = update(initial_model, AddedElement({ kind: "Circle" }))
        const started = update(
            added,
            StartedDragging({ id: "circle-1", point: { x: 50, y: 50 } })
        )
        const snapped = update(
            started,
            DraggedTo({
                point: { x: 57, y: 53 },
                bypass_snap: false,
            })
        )
        const bypassed = update(
            started,
            DraggedTo({
                point: { x: 57, y: 53 },
                bypass_snap: true,
            })
        )

        expect(snapped.elements[0]).toMatchObject({ cx: 55, cy: 55 })
        expect(bypassed.elements[0]).toMatchObject({ cx: 57, cy: 53 })
        expect(update(added, ToggledSnapToGrid()).snap_to_grid).toBe(false)
    })

    it("changes rectangle dimensions, constrains its radius, and supports undo", () => {
        const added = update(initial_model, AddedElement({ kind: "Rectangle" }))
        const resized = update(
            added,
            ChangedGeometry({ property: "width", value: 10 })
        )

        expect(resized.elements[0]).toMatchObject({ width: 10, radius: 5 })
        expect(resized.past).toHaveLength(added.past.length + 1)
        expect(update(resized, Undid()).elements[0]).toMatchObject({
            width: 40,
            radius: 6,
        })
    })

    it("changes line endpoints and stroke-circle width within scene bounds", () => {
        const line = update(initial_model, AddedElement({ kind: "Line" }))
        const changed_line = update(
            line,
            ChangedGeometry({ property: "x2", value: 20_000 })
        )
        expect(changed_line.elements[0]).toMatchObject({ x2: 10_000 })

        const template = update(initial_model, LoadedTemplate())
        const selected_ring = update(
            template,
            SelectedElement({ id: "outer-ring" })
        )
        const changed_ring = update(
            selected_ring,
            ChangedGeometry({ property: "stroke_width", value: 4 })
        )
        expect(
            changed_ring.elements.find((element) => element.id === "outer-ring")
        ).toMatchObject({ stroke_width: 4 })
    })
})
