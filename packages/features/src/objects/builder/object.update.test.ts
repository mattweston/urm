import { Option } from "effect"
import { describe, expect, test } from "vitest"
import { Message as DragMessage } from "@foldkit/ui/dragAndDrop"

import {
    AddedComponent,
    AddedComponentOption,
    ChangedComponentLabel,
    ChangedComponentHref,
    ChangedComponentOptionLabel,
    DuplicatedComponent,
    GotDragAndDropMessage,
    MovedComponent,
    RemovedComponent,
    SelectedComponent,
} from "./object.message.ts"
import { ObjectDefinition } from "./object.model.ts"
import { init, update } from "./object.update.ts"

const definition = ObjectDefinition.make({
    id: "test-object",
    name: "Test object",
    components: [
        {
            id: "first",
            kind: "text",
            name: "first",
            label: "First",
            description: "",
            placeholder: "",
            required: false,
            options: [],
        },
        {
            id: "second",
            kind: "email",
            name: "second",
            label: "Second",
            description: "",
            placeholder: "",
            required: true,
            options: [],
        },
    ],
})

describe("object builder", () => {
    test("edits and duplicates a display link without changing answer fields", () => {
        const [initial] = init(definition)
        const [added] = update(initial, AddedComponent({ kind: "link" }))
        const [edited] = update(
            added,
            ChangedComponentHref({ value: "https://example.com/privacy" })
        )
        const link = edited.definition.components[2]
        if (link === undefined) throw new Error("Expected a link")
        expect(link).toMatchObject({
            kind: "link",
            href: "https://example.com/privacy",
            required: false,
        })
        const [copied] = update(
            edited,
            DuplicatedComponent({ component_id: link.id })
        )
        expect(copied.definition.components[3]).toMatchObject({
            href: "https://example.com/privacy",
        })
        const [selected] = update(
            edited,
            SelectedComponent({ component_id: "first" })
        )
        const [unchanged] = update(
            selected,
            ChangedComponentHref({ value: "https://example.com" })
        )
        expect(unchanged.definition.components[0]).not.toHaveProperty("href")
    })
    test("adds and selects a typed component", () => {
        const [model] = init(definition)
        const [updated] = update(model, AddedComponent({ kind: "textarea" }))

        expect(updated.definition.components).toHaveLength(3)
        expect(updated.definition.components[2]?.kind).toBe("textarea")
        expect(Option.isSome(updated.selected_component_id)).toBe(true)
    })

    test("edits, moves, and removes the selected component", () => {
        const [model] = init(definition)
        const [selected] = update(
            model,
            SelectedComponent({ component_id: "second" })
        )
        const [renamed] = update(
            selected,
            ChangedComponentLabel({ value: "Email address" })
        )
        const [moved] = update(
            renamed,
            MovedComponent({ component_id: "second", direction: "up" })
        )
        const [removed] = update(
            moved,
            RemovedComponent({ component_id: "second" })
        )

        expect(renamed.definition.components[1]?.label).toBe("Email address")
        expect(moved.definition.components[0]?.id).toBe("second")
        expect(removed.definition.components).toHaveLength(1)
        expect(removed.selected_component_id).toEqual(Option.some("first"))
    })

    test("duplicates a component with an independent identity", () => {
        const [model] = init(definition)
        const [updated] = update(
            model,
            DuplicatedComponent({ component_id: "first" })
        )

        expect(updated.definition.components).toHaveLength(3)
        expect(updated.definition.components[1]).toMatchObject({
            id: "draft-component-1",
            name: "first-copy-1",
            label: "First",
        })
        expect(updated.selected_component_id).toEqual(
            Option.some("draft-component-1")
        )
    })

    test("adds and edits options on choice components", () => {
        const [model] = init(definition)
        const [with_select] = update(model, AddedComponent({ kind: "select" }))
        const [with_option] = update(with_select, AddedComponentOption())
        const selected = with_option.definition.components[2]
        const option = selected?.options[2]
        expect(option).toBeDefined()
        if (option === undefined) return

        const [renamed] = update(
            with_option,
            ChangedComponentOptionLabel({
                option_id: option.id,
                value: "Another choice",
            })
        )

        expect(renamed.definition.components[2]?.options[2]?.label).toBe(
            "Another choice"
        )
    })

    test("ignores selection messages for unknown components", () => {
        const [model] = init(definition)
        const [updated] = update(
            model,
            SelectedComponent({ component_id: "missing" })
        )

        expect(updated).toEqual(model)
    })

    test("reorders components after a pointer drag", () => {
        const [model] = init(definition)
        const [pressed] = update(
            model,
            GotDragAndDropMessage({
                message: DragMessage.PressedDraggable({
                    itemId: "first",
                    containerId: "form-components",
                    index: 0,
                    screenX: 100,
                    screenY: 100,
                }),
            })
        )
        const [moved] = update(
            pressed,
            GotDragAndDropMessage({
                message: DragMessage.MovedPointer({
                    screenX: 100,
                    screenY: 200,
                    clientX: 100,
                    clientY: 200,
                    maybeDropTarget: Option.some({
                        containerId: "form-components",
                        index: 2,
                    }),
                }),
            })
        )
        const [dropped] = update(
            moved,
            GotDragAndDropMessage({
                message: DragMessage.ReleasedPointer(),
            })
        )

        expect(dropped.definition.components.map(({ id }) => id)).toEqual([
            "second",
            "first",
        ])
    })
})
