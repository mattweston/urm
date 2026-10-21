import { Option } from "effect"
import { Canvas } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { CanvasGrid } from "@urm/ui/foldkit/canvas-grid.view.ts"
import {
    IconPlus,
    IconMinus,
    IconMaximize,
    IconUndo,
    IconRedo,
    IconGrid3x3,
    IconMove,
} from "@urm/ui/foldkit/icons/view.ts"
import type { Model, Service } from "./model.ts"
import * as Msg from "./message.ts"

const connections = (model: Model): ReadonlyArray<Canvas.Shape> =>
    model.show_edges
        ? model.nodes.flatMap((node) => {
              const target = model.nodes.find(
                  (candidate) => candidate.id === node.target
              )
              if (target === undefined) return []
              const x = node.x + 240
              const y = node.y + 72
              const end_x = target.x
              const end_y = target.y + 72
              const bend = Math.max(60, Math.abs(end_x - x) / 2)
              return [
                  Canvas.Path({
                      instructions: [
                          Canvas.MoveTo({ x, y }),
                          Canvas.BezierTo({
                              cp1x: x + bend,
                              cp1y: y,
                              cp2x: end_x - bend,
                              cp2y: end_y,
                              x: end_x,
                              y: end_y,
                          }),
                      ],
                      stroke: "#a78bfa",
                      lineWidth: 2,
                      lineCap: "Round",
                  }),
                  Canvas.Circle({
                      x: end_x,
                      y: end_y,
                      radius: 4,
                      fill: "#a78bfa",
                  }),
              ]
          })
        : []

const key_message = (id: string, key: string): Option.Option<Msg.Message> => {
    switch (key) {
        case "ArrowLeft":
            return Option.some(Msg.Nudged({ id, x: -24, y: 0 }))
        case "ArrowRight":
            return Option.some(Msg.Nudged({ id, x: 24, y: 0 }))
        case "ArrowUp":
            return Option.some(Msg.Nudged({ id, x: 0, y: -24 }))
        case "ArrowDown":
            return Option.some(Msg.Nudged({ id, x: 0, y: 24 }))
        case "Escape":
            return Option.some(Msg.CancelledPointer())
        default:
            return Option.none()
    }
}

const card = (model: Model, node: Service, h: HtmlBuilder<Msg.Message>): Html =>
    h.button(
        [
            h.Type("button"),
            h.Class(
                `ui-canvas-service ${model.selected === node.id ? "is-selected" : ""}`
            ),
            h.Style({
                left: `${(node.x * model.zoom + model.x) / 10}%`,
                top: `${(node.y * model.zoom + model.y) / 6}%`,
                transform: `scale(${model.zoom})`,
            }),
            h.AriaLabel(`${node.title}. Use arrow keys to move this service.`),
            h.AriaPressed(model.selected === node.id ? "true" : "false"),
            h.OnClick(Msg.Selected({ id: node.id })),
            h.OnKeyDownPreventDefault((key) => key_message(node.id, key)),
        ],
        [
            h.span([h.Class("ui-canvas-service-kind")], [node.kind]),
            h.strong([], [node.title]),
            h.span(
                [h.Class("ui-canvas-service-description")],
                [node.description]
            ),
            h.span(
                [h.Class("ui-canvas-service-status")],
                [h.span([h.AriaHidden(true)], ["●"]), "Online"]
            ),
            ...(node.kind === "Database"
                ? [
                      h.span(
                          [h.Class("ui-canvas-service-volume")],
                          ["▤  postgres-volume · 3% used"]
                      ),
                  ]
                : []),
        ]
    )

export const view = (model: Model, h: HtmlBuilder<Msg.Message>): Html => {
    const control = (
        label: string,
        message: Msg.Message,
        icon: Html,
        disabled = false
    ): Html =>
        h.button(
            [
                h.Type("button"),
                h.Class("ui-canvas-control"),
                h.AriaLabel(label),
                h.Title(label),
                h.OnClick(message),
                ...(disabled ? [h.Disabled(true)] : []),
            ],
            [icon]
        )
    const icon_props = { class: "size-4" }
    const selected = model.nodes.find((node) => node.id === model.selected)
    return h.div(
        [h.Class("ui-canvas-lab")],
        [
            h.div(
                [h.Class("ui-canvas-header")],
                [
                    h.div(
                        [],
                        [
                            h.h2([h.Class("font-semibold")], ["Architecture"]),
                            h.p(
                                [h.Class("text-xs text-muted-foreground")],
                                ["Example project / Production"]
                            ),
                        ]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class("ui-canvas-add"),
                            h.OnClick(Msg.Added()),
                        ],
                        [IconPlus(icon_props), "Add service"]
                    ),
                ]
            ),
            CanvasGrid(
                {
                    x: model.x,
                    y: model.y,
                    zoom: model.zoom,
                    show_grid: model.show_grid,
                    shapes: connections(model),
                    attributes: [
                        h.OnPointerLeave(() => Option.some(Msg.EndedPointer())),
                    ],
                    on_pointer_down: (point) => Msg.StartedPointer({ point }),
                    on_pointer_move: (point) => Msg.MovedPointer({ point }),
                    on_pointer_up: () => Msg.EndedPointer(),
                    children: model.nodes.map((node) => card(model, node, h)),
                },
                h
            ),
            h.div(
                [
                    h.Class("ui-canvas-toolbar"),
                    h.Role("group"),
                    h.AriaLabel("Canvas controls"),
                ],
                [
                    control(
                        "Zoom in",
                        Msg.Zoomed({ factor: 1.2 }),
                        IconPlus(icon_props),
                        model.zoom >= 2
                    ),
                    control(
                        "Zoom out",
                        Msg.Zoomed({ factor: 1 / 1.2 }),
                        IconMinus(icon_props),
                        model.zoom <= 0.4
                    ),
                    h.span(
                        [h.Class("ui-canvas-zoom")],
                        [`${Math.round(model.zoom * 100)}%`]
                    ),
                    control(
                        "Center canvas",
                        Msg.Centered(),
                        IconMaximize(icon_props)
                    ),
                    control(
                        "Undo layout change",
                        Msg.Undid(),
                        IconUndo(icon_props),
                        model.past.length === 0
                    ),
                    control(
                        "Redo layout change",
                        Msg.Redid(),
                        IconRedo(icon_props),
                        model.future.length === 0
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class("ui-canvas-control"),
                            h.AriaLabel("Show grid"),
                            h.Title("Show grid"),
                            h.AriaPressed(model.show_grid ? "true" : "false"),
                            h.OnClick(Msg.ToggledGrid()),
                        ],
                        [IconGrid3x3(icon_props)]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class("ui-canvas-control"),
                            h.AriaLabel("Pan canvas with arrow keys"),
                            h.Title("Pan canvas with arrow keys"),
                            h.OnKeyDownPreventDefault((key) =>
                                key_message("", key)
                            ),
                        ],
                        [IconMove(icon_props)]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class("ui-canvas-add"),
                            h.AriaPressed(model.show_edges ? "true" : "false"),
                            h.OnClick(Msg.ToggledEdges()),
                        ],
                        ["Connections"]
                    ),
                ]
            ),
            h.div(
                [h.Class("ui-canvas-footer"), h.AriaLive("polite")],
                [
                    selected === undefined
                        ? "Drag the background to pan. Drag a service to move it."
                        : `${selected.title} selected · ${Math.round(selected.x)}, ${Math.round(selected.y)}`,
                ]
            ),
            h.p(
                [h.Class("text-xs text-muted-foreground px-4 pb-4")],
                [
                    "Tab to a service and use arrow keys to move it. Changes are local to this lab.",
                ]
            ),
        ]
    )
}
