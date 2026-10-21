import { Match as M } from "effect"

import {
    type ElementKind,
    type LogoElement,
    type Model,
    urm_template_elements,
} from "./model.ts"
import type { GeometryProperty, Message } from "./message.ts"

const GRID_SIZE = 5
const MAX_GEOMETRY_VALUE = 10_000

const bounded_dimension = (value: number): number =>
    Math.min(MAX_GEOMETRY_VALUE, Math.max(0, value))

const bounded_coordinate = (value: number): number =>
    Math.min(MAX_GEOMETRY_VALUE, Math.max(-MAX_GEOMETRY_VALUE, value))

const remember = (
    model: Model,
    elements: ReadonlyArray<LogoElement>,
    selected_element_id: string
): Model => ({
    ...model,
    elements,
    selected_element_id,
    past: [...model.past.slice(-49), model.elements],
    future: [],
    drag: null,
})

const move_element = (
    element: LogoElement,
    x: number,
    y: number
): LogoElement => {
    switch (element._tag) {
        case "Rect":
            return { ...element, x: element.x + x, y: element.y + y }
        case "Circle":
            return { ...element, cx: element.cx + x, cy: element.cy + y }
        case "Line":
            return {
                ...element,
                x1: element.x1 + x,
                y1: element.y1 + y,
                x2: element.x2 + x,
                y2: element.y2 + y,
            }
    }
}

const change_geometry = (
    element: LogoElement,
    property: GeometryProperty,
    value: number
): LogoElement => {
    if (!Number.isFinite(value)) return element

    switch (element._tag) {
        case "Rect": {
            switch (property) {
                case "width": {
                    const width = bounded_dimension(value)
                    return {
                        ...element,
                        width,
                        radius: Math.min(
                            element.radius,
                            width / 2,
                            element.height / 2
                        ),
                    }
                }
                case "height": {
                    const height = bounded_dimension(value)
                    return {
                        ...element,
                        height,
                        radius: Math.min(
                            element.radius,
                            element.width / 2,
                            height / 2
                        ),
                    }
                }
                case "radius":
                    return {
                        ...element,
                        radius: Math.min(
                            bounded_dimension(value),
                            element.width / 2,
                            element.height / 2
                        ),
                    }
                case "x1":
                case "y1":
                case "x2":
                case "y2":
                case "stroke_width":
                    return element
            }
        }
        case "Circle":
            switch (property) {
                case "radius":
                    return { ...element, radius: bounded_dimension(value) }
                case "stroke_width":
                    return {
                        ...element,
                        stroke_width: bounded_dimension(value),
                    }
                case "width":
                case "height":
                case "x1":
                case "y1":
                case "x2":
                case "y2":
                    return element
            }
        case "Line":
            switch (property) {
                case "x1":
                    return { ...element, x1: bounded_coordinate(value) }
                case "y1":
                    return { ...element, y1: bounded_coordinate(value) }
                case "x2":
                    return { ...element, x2: bounded_coordinate(value) }
                case "y2":
                    return { ...element, y2: bounded_coordinate(value) }
                case "stroke_width":
                    return {
                        ...element,
                        stroke_width: bounded_dimension(value),
                    }
                case "width":
                case "height":
                case "radius":
                    return element
            }
    }
}

const new_element = (kind: ElementKind, number: number): LogoElement => {
    switch (kind) {
        case "Rectangle":
            return {
                _tag: "Rect",
                id: `rectangle-${number}`,
                name: `Rectangle ${number}`,
                x: 30,
                y: 35,
                width: 40,
                height: 30,
                radius: 6,
                paint: "foreground",
                opacity: 1,
            }
        case "Circle":
            return {
                _tag: "Circle",
                id: `circle-${number}`,
                name: `Circle ${number}`,
                cx: 50,
                cy: 50,
                radius: 18,
                style: "Fill",
                stroke_width: 0,
                paint: "chart-4",
                opacity: 1,
            }
        case "Line":
            return {
                _tag: "Line",
                id: `line-${number}`,
                name: `Line ${number}`,
                x1: 30,
                y1: 50,
                x2: 70,
                y2: 50,
                stroke_width: 3,
                paint: "foreground",
                opacity: 1,
            }
    }
}

const selected_index = (model: Model): number =>
    model.elements.findIndex(
        (element) => element.id === model.selected_element_id
    )

const selected_for = (
    elements: ReadonlyArray<LogoElement>,
    preferred: string
): string =>
    elements.some((element) => element.id === preferred)
        ? preferred
        : (elements.at(-1)?.id ?? "")

const element_anchor = (
    element: LogoElement
): Readonly<{ x: number; y: number }> => {
    switch (element._tag) {
        case "Rect":
            return { x: element.x, y: element.y }
        case "Circle":
            return { x: element.cx, y: element.cy }
        case "Line":
            return { x: element.x1, y: element.y1 }
    }
}

const snapped_delta = (
    element: LogoElement,
    x: number,
    y: number
): Readonly<{ x: number; y: number }> => {
    const anchor = element_anchor(element)
    return {
        x: Math.round((anchor.x + x) / GRID_SIZE) * GRID_SIZE - anchor.x,
        y: Math.round((anchor.y + y) / GRID_SIZE) * GRID_SIZE - anchor.y,
    }
}

export const update = (model: Model, message: Message): Model =>
    M.value(message).pipe(
        M.withReturnType<Model>(),
        M.tagsExhaustive({
            SelectedElement: ({ id }) => ({
                ...model,
                selected_element_id: model.elements.some(
                    (element) => element.id === id
                )
                    ? id
                    : model.selected_element_id,
            }),
            LoadedBlank: () =>
                model.elements.length === 0 ? model : remember(model, [], ""),
            LoadedTemplate: () =>
                remember(model, urm_template_elements, "centre"),
            AddedElement: ({ kind }) => {
                const element = new_element(kind, model.next_element_number)
                return {
                    ...remember(
                        model,
                        [...model.elements, element],
                        element.id
                    ),
                    next_element_number: model.next_element_number + 1,
                }
            },
            DuplicatedSelected: () => {
                const index = selected_index(model)
                const selected = model.elements[index]
                if (selected === undefined) return model
                const duplicate = {
                    ...move_element(selected, 4, 4),
                    id: `${selected._tag.toLowerCase()}-${model.next_element_number}`,
                    name: `${selected.name} copy`,
                }
                return {
                    ...remember(
                        model,
                        [...model.elements, duplicate],
                        duplicate.id
                    ),
                    next_element_number: model.next_element_number + 1,
                }
            },
            DeletedSelected: () => {
                const index = selected_index(model)
                if (index < 0) return model
                const elements = model.elements.filter(
                    (element) => element.id !== model.selected_element_id
                )
                return remember(
                    model,
                    elements,
                    elements[index]?.id ?? elements[index - 1]?.id ?? ""
                )
            },
            NudgedSelected: ({ x, y }) => {
                const index = selected_index(model)
                if (index < 0) return model
                return remember(
                    model,
                    model.elements.map((element, element_index) =>
                        element_index === index
                            ? move_element(element, x, y)
                            : element
                    ),
                    model.selected_element_id
                )
            },
            StartedDragging: ({ id, point }) =>
                model.elements.some((element) => element.id === id)
                    ? {
                          ...model,
                          selected_element_id: id,
                          drag: { id, start: point, before: model.elements },
                      }
                    : model,
            DraggedTo: ({ point, bypass_snap }) => {
                const drag = model.drag
                if (drag === null) return model
                const raw_x = point.x - drag.start.x
                const raw_y = point.y - drag.start.y
                const dragged_element = drag.before.find(
                    (element) => element.id === drag.id
                )
                const delta =
                    model.snap_to_grid &&
                    !bypass_snap &&
                    dragged_element !== undefined
                        ? snapped_delta(dragged_element, raw_x, raw_y)
                        : { x: raw_x, y: raw_y }
                return {
                    ...model,
                    elements: drag.before.map((element) =>
                        element.id === drag.id
                            ? move_element(element, delta.x, delta.y)
                            : element
                    ),
                }
            },
            EndedDragging: () => {
                const drag = model.drag
                if (drag === null) return model
                const changed = model.elements.some(
                    (element, index) => element !== drag.before[index]
                )
                return changed
                    ? {
                          ...model,
                          past: [...model.past.slice(-49), drag.before],
                          future: [],
                          drag: null,
                      }
                    : { ...model, drag: null }
            },
            CancelledDragging: () =>
                model.drag === null
                    ? model
                    : {
                          ...model,
                          elements: model.drag.before,
                          drag: null,
                      },
            ChangedPaint: ({ paint }) => {
                const index = selected_index(model)
                if (index < 0) return model
                return remember(
                    model,
                    model.elements.map((element, element_index) =>
                        element_index === index
                            ? { ...element, paint }
                            : element
                    ),
                    model.selected_element_id
                )
            },
            ChangedGeometry: ({ property, value }) => {
                const index = selected_index(model)
                const selected = model.elements[index]
                if (selected === undefined) return model
                const changed = change_geometry(selected, property, value)
                if (changed === selected) return model
                return remember(
                    model,
                    model.elements.map((element, element_index) =>
                        element_index === index ? changed : element
                    ),
                    model.selected_element_id
                )
            },
            ToggledSnapToGrid: () => ({
                ...model,
                snap_to_grid: !model.snap_to_grid,
            }),
            RequestedSave: () => model,
            StartedSaving: () => ({
                ...model,
                save_status: "saving",
                save_message: "Saving draft…",
            }),
            Saved: () => ({
                ...model,
                save_status: "saved",
                save_message: "Draft saved",
            }),
            FailedSaving: ({ details }) => ({
                ...model,
                save_status: "error",
                save_message: details,
            }),
            Undid: () => {
                const elements = model.past.at(-1)
                return elements === undefined
                    ? model
                    : {
                          ...model,
                          elements,
                          selected_element_id: selected_for(
                              elements,
                              model.selected_element_id
                          ),
                          past: model.past.slice(0, -1),
                          future: [...model.future, model.elements],
                          drag: null,
                      }
            },
            Redid: () => {
                const elements = model.future.at(-1)
                return elements === undefined
                    ? model
                    : {
                          ...model,
                          elements,
                          selected_element_id: selected_for(
                              elements,
                              model.selected_element_id
                          ),
                          past: [...model.past, model.elements],
                          future: model.future.slice(0, -1),
                          drag: null,
                      }
            },
        })
    )
