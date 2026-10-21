import { Match } from "effect"
import type { Model, Service } from "./model.ts"
import type { Message } from "./message.ts"

const remember = (model: Model, nodes: ReadonlyArray<Service>): Model => ({
    ...model,
    nodes,
    past: [...model.past.slice(-49), model.nodes],
    future: [],
})
const snap = (value: number) => Math.round(value / 24) * 24

export const update = (model: Model, message: Message): Model =>
    Match.value(message).pipe(
        Match.withReturnType<Model>(),
        Match.tagsExhaustive({
            StartedPointer: ({ point }) => {
                const world = {
                    x: (point.x - model.x) / model.zoom,
                    y: (point.y - model.y) / model.zoom,
                }
                const node = model.nodes.findLast(
                    (node) =>
                        world.x >= node.x &&
                        world.x <= node.x + 240 &&
                        world.y >= node.y &&
                        world.y <= node.y + 144
                )
                return {
                    ...model,
                    selected: node?.id ?? "",
                    drag: {
                        id: node?.id ?? "",
                        start: point,
                        origin:
                            node === undefined
                                ? { x: model.x, y: model.y }
                                : { x: node.x, y: node.y },
                        before: model.nodes,
                    },
                }
            },
            MovedPointer: ({ point }) => {
                const drag = model.drag
                if (drag === null) return model
                const dx = point.x - drag.start.x
                const dy = point.y - drag.start.y
                if (drag.id === "")
                    return {
                        ...model,
                        x: drag.origin.x + dx,
                        y: drag.origin.y + dy,
                    }
                return {
                    ...model,
                    nodes: model.nodes.map((node) =>
                        node.id === drag.id
                            ? {
                                  ...node,
                                  x: drag.origin.x + dx / model.zoom,
                                  y: drag.origin.y + dy / model.zoom,
                              }
                            : node
                    ),
                }
            },
            EndedPointer: () => {
                const drag = model.drag
                if (drag === null) return model
                const moved = model.nodes.some(
                    (node, index) =>
                        node.x !== drag.before[index]?.x ||
                        node.y !== drag.before[index]?.y
                )
                if (drag.id === "" || !moved) return { ...model, drag: null }
                return {
                    ...model,
                    drag: null,
                    nodes: model.nodes.map((node) =>
                        node.id === drag.id
                            ? { ...node, x: snap(node.x), y: snap(node.y) }
                            : node
                    ),
                    past: [...model.past.slice(-49), drag.before],
                    future: [],
                }
            },
            CancelledPointer: () =>
                model.drag === null
                    ? model
                    : {
                          ...model,
                          nodes: model.drag.before,
                          x:
                              model.drag.id === ""
                                  ? model.drag.origin.x
                                  : model.x,
                          y:
                              model.drag.id === ""
                                  ? model.drag.origin.y
                                  : model.y,
                          drag: null,
                      },
            Zoomed: ({ factor }) => {
                const zoom = Math.max(0.4, Math.min(2, model.zoom * factor))
                const ratio = zoom / model.zoom
                return {
                    ...model,
                    zoom,
                    x: 500 - (500 - model.x) * ratio,
                    y: 300 - (300 - model.y) * ratio,
                    drag: null,
                }
            },
            Centered: () => {
                const left = Math.min(...model.nodes.map((node) => node.x))
                const right = Math.max(
                    ...model.nodes.map((node) => node.x + 240)
                )
                const top = Math.min(...model.nodes.map((node) => node.y))
                const bottom = Math.max(
                    ...model.nodes.map((node) => node.y + 144)
                )
                const zoom = Math.max(
                    0.4,
                    Math.min(1, 880 / (right - left), 480 / (bottom - top))
                )
                return {
                    ...model,
                    zoom,
                    x: 500 - ((left + right) / 2) * zoom,
                    y: 300 - ((top + bottom) / 2) * zoom,
                    drag: null,
                }
            },
            Selected: ({ id }) => ({ ...model, selected: id }),
            Nudged: ({ id, x, y }) =>
                id === ""
                    ? { ...model, x: model.x + x, y: model.y + y }
                    : remember(
                          model,
                          model.nodes.map((node) =>
                              node.id === id
                                  ? { ...node, x: node.x + x, y: node.y + y }
                                  : node
                          )
                      ),
            Added: () => {
                const id = `worker-${model.nodes.length + 1}`
                return {
                    ...remember(model, [
                        ...model.nodes,
                        {
                            id,
                            title: `Worker ${model.nodes.length + 1}`,
                            description: "New service · local demo",
                            kind: "Worker",
                            x: snap((500 - model.x) / model.zoom - 120),
                            y: snap((300 - model.y) / model.zoom - 72),
                            target: "database",
                        },
                    ]),
                    selected: id,
                }
            },
            Undid: () => {
                const nodes = model.past.at(-1)
                return nodes === undefined
                    ? model
                    : {
                          ...model,
                          nodes,
                          past: model.past.slice(0, -1),
                          future: [...model.future, model.nodes],
                          selected: "",
                          drag: null,
                      }
            },
            Redid: () => {
                const nodes = model.future.at(-1)
                return nodes === undefined
                    ? model
                    : {
                          ...model,
                          nodes,
                          future: model.future.slice(0, -1),
                          past: [...model.past, model.nodes],
                          selected: "",
                          drag: null,
                      }
            },
            ToggledGrid: () => ({ ...model, show_grid: !model.show_grid }),
            ToggledEdges: () => ({ ...model, show_edges: !model.show_edges }),
        })
    )
