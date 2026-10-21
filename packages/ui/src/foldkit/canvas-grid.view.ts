import { Canvas } from "foldkit"
import type { Attribute, Html, HtmlBuilder } from "foldkit/html"

export type CanvasGridProps<Message> = Readonly<{
    x: number
    y: number
    zoom: number
    show_grid: boolean
    shapes: ReadonlyArray<Canvas.Shape>
    children: ReadonlyArray<Html>
    attributes?: ReadonlyArray<Attribute<Message>>
    on_pointer_down: (point: Canvas.Point) => Message
    on_pointer_move: (point: Canvas.Point) => Message
    on_pointer_up: (point: Canvas.Point) => Message
}>

export const canvas_width = 1000
export const canvas_height = 600

export const CanvasGrid = <Message>(
    props: CanvasGridProps<Message>,
    h: HtmlBuilder<Message>
): Html => {
    const spacing = 24 * props.zoom
    const start_x = ((props.x % spacing) + spacing) % spacing
    const start_y = ((props.y % spacing) + spacing) % spacing
    const dots = props.show_grid
        ? Array.from(
              { length: Math.ceil(canvas_width / spacing) },
              (_, column) =>
                  Array.from(
                      { length: Math.ceil(canvas_height / spacing) },
                      (_, row) =>
                          Canvas.Circle({
                              x: start_x + column * spacing,
                              y: start_y + row * spacing,
                              radius: 0.75,
                              fill: "#85809188",
                          })
                  )
          ).flat()
        : []
    return h.div(
        [
            h.Class("ui-canvas-grid"),
            h.Role("group"),
            h.AriaLabel("Service architecture canvas"),
            ...(props.attributes ?? []),
        ],
        [
            Canvas.view(
                {
                    width: canvas_width,
                    height: canvas_height,
                    className: "ui-canvas-grid-surface",
                    shapes: [
                        ...dots,
                        Canvas.Group({
                            translate: { x: props.x, y: props.y },
                            scale: { x: props.zoom, y: props.zoom },
                            shapes: props.shapes,
                        }),
                    ],
                    onPointerDown: props.on_pointer_down,
                    onPointerMove: props.on_pointer_move,
                    onPointerUp: props.on_pointer_up,
                },
                h
            ),
            ...props.children,
        ]
    )
}
