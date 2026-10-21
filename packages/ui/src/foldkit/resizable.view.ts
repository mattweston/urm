import { type Html, inertHtml } from "foldkit/html"

type WithClassProps = Readonly<{
    class?: string
    children?: ReadonlyArray<Html | string>
}>

type ResizableProps = WithClassProps &
    Readonly<{
        orientation?: "horizontal" | "vertical"
    }>

type ResizablePanelProps = WithClassProps &
    Readonly<{
        initialSize?: number
        minSize?: number
    }>

type ResizableHandleProps = WithClassProps &
    Readonly<{
        orientation?: "horizontal" | "vertical"
        withHandle?: boolean
    }>

const joinClassName = (base: string, className?: string) =>
    className ? `${base} ${className}` : base

export const Resizable = (props: ResizableProps): Html => {
    const h = inertHtml

    return h.div(
        [
            h.DataAttribute("resizable-root", ""),
            h.DataAttribute("orientation", props.orientation ?? "horizontal"),
            h.Class(
                joinClassName(
                    "flex size-full data-[orientation=vertical]:flex-col",
                    props.class
                )
            ),
        ],
        props.children ?? []
    )
}

export const ResizablePanel = (props: ResizablePanelProps): Html => {
    const h = inertHtml

    return h.div(
        [
            h.DataAttribute("resizable-panel", ""),
            ...(props.initialSize !== undefined
                ? [h.DataAttribute("initial-size", `${props.initialSize}`)]
                : []),
            ...(props.minSize !== undefined
                ? [h.DataAttribute("min-size", `${props.minSize}`)]
                : []),
            h.Class(joinClassName("min-h-0 min-w-0", props.class)),
        ],
        props.children ?? []
    )
}

export const ResizableHandle = (props: ResizableHandleProps): Html => {
    const h = inertHtml

    return h.button(
        [
            h.Type("button"),
            h.AriaLabel("Resize panels"),
            h.DataAttribute("resizable-handle", ""),
            h.DataAttribute("orientation", props.orientation ?? "horizontal"),
            h.Class(
                joinClassName(
                    "relative flex w-px shrink-0 items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 touch-none select-none data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:h-1 data-[orientation=vertical]:after:w-full data-[orientation=vertical]:after:-translate-y-1/2 data-[orientation=vertical]:after:translate-x-0 [&[data-orientation=vertical]>div]:rotate-90",
                    props.class
                )
            ),
        ],
        props.withHandle
            ? [
                  h.div(
                      [
                          h.Class(
                              "z-10 flex h-4 w-3 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) bg-border"
                          ),
                      ],
                      [
                          h.svg(
                              [
                                  h.Xmlns("http://www.w3.org/2000/svg"),
                                  h.ViewBox("0 0 24 24"),
                                  h.Fill("none"),
                                  h.Stroke("currentColor"),
                                  h.StrokeWidth("2"),
                                  h.StrokeLinecap("round"),
                                  h.StrokeLinejoin("round"),
                                  h.Class("size-2.5"),
                              ],
                              [
                                  h.path(
                                      [
                                          h.D(
                                              "M9 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"
                                          ),
                                      ],
                                      []
                                  ),
                                  h.path(
                                      [
                                          h.D(
                                              "M9 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"
                                          ),
                                      ],
                                      []
                                  ),
                                  h.path(
                                      [
                                          h.D(
                                              "M9 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"
                                          ),
                                      ],
                                      []
                                  ),
                                  h.path(
                                      [
                                          h.D(
                                              "M15 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"
                                          ),
                                      ],
                                      []
                                  ),
                                  h.path(
                                      [
                                          h.D(
                                              "M15 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"
                                          ),
                                      ],
                                      []
                                  ),
                                  h.path(
                                      [
                                          h.D(
                                              "M15 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"
                                          ),
                                      ],
                                      []
                                  ),
                              ]
                          ),
                      ]
                  ),
              ]
            : []
    )
}
