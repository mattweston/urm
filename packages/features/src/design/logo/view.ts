import type { Html, HtmlBuilder } from "foldkit/html"
import {
    IconArrowDown,
    IconArrowLeft,
    IconArrowRight,
    IconArrowUp,
    IconCircle,
    IconCloud,
    IconCopy,
    IconFilePlus,
    IconGrid3x3,
    IconMinus,
    IconRedo,
    IconSquare,
    IconTrash2,
    IconUndo,
} from "@urm/ui/foldkit/icons/view.ts"

import type { LogoElement, Model, PaintToken } from "./model.ts"
import * as Msg from "./message.ts"
import { LogoPointer } from "./pointer.ts"

const paint_tokens: ReadonlyArray<PaintToken> = [
    "background",
    "foreground",
    "card",
    "card-foreground",
    "popover",
    "popover-foreground",
    "primary",
    "primary-foreground",
    "secondary",
    "secondary-foreground",
    "muted",
    "muted-foreground",
    "accent",
    "accent-foreground",
    "destructive",
    "destructive-foreground",
    "success",
    "success-foreground",
    "warning",
    "warning-foreground",
    "border",
    "input",
    "ring",
    "chart-1",
    "chart-2",
    "chart-3",
    "chart-4",
    "chart-5",
]

const paint_value = (paint: PaintToken): string => `var(--${paint})`

const grid_view = (h: HtmlBuilder<Msg.Message>): ReadonlyArray<Html> =>
    Array.from({ length: 21 }, (_, index) => index * 5).flatMap((position) => {
        const major = position % 25 === 0
        const attributes = [
            h.Stroke("var(--foreground)"),
            h.StrokeWidth(major ? "0.3" : "0.18"),
            h.Attribute("opacity", major ? "0.12" : "0.055"),
            h.Attribute("pointer-events", "none"),
            h.Attribute("vector-effect", "non-scaling-stroke"),
        ]
        return [
            h.line(
                [
                    ...attributes,
                    h.Attribute("x1", String(position)),
                    h.Attribute("y1", "0"),
                    h.Attribute("x2", String(position)),
                    h.Attribute("y2", "100"),
                ],
                []
            ),
            h.line(
                [
                    ...attributes,
                    h.Attribute("x1", "0"),
                    h.Attribute("y1", String(position)),
                    h.Attribute("x2", "100"),
                    h.Attribute("y2", String(position)),
                ],
                []
            ),
        ]
    })

const element_view = (
    element: LogoElement,
    h: HtmlBuilder<Msg.Message>
): Html => {
    const common = [
        h.Attribute("opacity", String(element.opacity)),
        h.Attribute("data-logo-element", element.id),
        h.Class("cursor-move"),
    ]
    switch (element._tag) {
        case "Rect":
            return h.rect(
                [
                    ...common,
                    h.Attribute("x", String(element.x)),
                    h.Attribute("y", String(element.y)),
                    h.Attribute("width", String(element.width)),
                    h.Attribute("height", String(element.height)),
                    h.Attribute("rx", String(element.radius)),
                    h.Fill(paint_value(element.paint)),
                ],
                []
            )
        case "Circle":
            return h.circle(
                [
                    ...common,
                    h.Attribute("cx", String(element.cx)),
                    h.Attribute("cy", String(element.cy)),
                    h.Attribute("r", String(element.radius)),
                    ...(element.style === "Fill"
                        ? [h.Fill(paint_value(element.paint))]
                        : [
                              h.Fill("none"),
                              h.Stroke(paint_value(element.paint)),
                              h.StrokeWidth(String(element.stroke_width)),
                          ]),
                ],
                []
            )
        case "Line":
            return h.line(
                [
                    ...common,
                    h.Attribute("x1", String(element.x1)),
                    h.Attribute("y1", String(element.y1)),
                    h.Attribute("x2", String(element.x2)),
                    h.Attribute("y2", String(element.y2)),
                    h.Stroke(paint_value(element.paint)),
                    h.StrokeWidth(String(element.stroke_width)),
                ],
                []
            )
    }
}

const selection_view = (
    element: LogoElement,
    h: HtmlBuilder<Msg.Message>
): Html => {
    const bounds = (() => {
        switch (element._tag) {
            case "Rect":
                return {
                    x: element.x,
                    y: element.y,
                    width: element.width,
                    height: element.height,
                }
            case "Circle":
                return {
                    x: element.cx - element.radius,
                    y: element.cy - element.radius,
                    width: element.radius * 2,
                    height: element.radius * 2,
                }
            case "Line":
                return {
                    x: Math.min(element.x1, element.x2),
                    y: Math.min(element.y1, element.y2),
                    width: Math.abs(element.x2 - element.x1),
                    height: Math.abs(element.y2 - element.y1),
                }
        }
    })()
    return h.rect(
        [
            h.Attribute("x", String(bounds.x - 2)),
            h.Attribute("y", String(bounds.y - 2)),
            h.Attribute("width", String(Math.max(bounds.width, 1) + 4)),
            h.Attribute("height", String(Math.max(bounds.height, 1) + 4)),
            h.Fill("none"),
            h.Stroke("var(--primary)"),
            h.StrokeWidth("0.75"),
            h.Attribute("stroke-dasharray", "2 1"),
            h.Attribute("pointer-events", "none"),
        ],
        []
    )
}

const icon_button = (
    label: string,
    message: Msg.Message,
    icon: Html,
    h: HtmlBuilder<Msg.Message>,
    disabled = false
): Html =>
    h.button(
        [
            h.Type("button"),
            h.Class(
                "grid size-10 place-items-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-accent active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
            ),
            h.AriaLabel(label),
            h.OnClick(message),
            ...(disabled ? [h.Disabled(true)] : []),
        ],
        [icon]
    )

const toolbar_button = (
    label: string,
    message: Msg.Message,
    icon: Html,
    h: HtmlBuilder<Msg.Message>
): Html =>
    h.button(
        [
            h.Type("button"),
            h.Class(
                "flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            ),
            h.OnClick(message),
        ],
        [icon, label]
    )

const toggle_button = (
    label: string,
    pressed: boolean,
    message: Msg.Message,
    icon: Html,
    h: HtmlBuilder<Msg.Message>
): Html =>
    h.button(
        [
            h.Type("button"),
            h.Class(
                `flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    pressed
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-accent"
                }`
            ),
            h.AriaPressed(pressed ? "true" : "false"),
            h.OnClick(message),
        ],
        [icon, label]
    )

const geometry_field = (
    label: string,
    property: Msg.GeometryProperty,
    value: number,
    minimum: number,
    maximum: number,
    h: HtmlBuilder<Msg.Message>
): Html => {
    const id = `logo-geometry-${property}`
    return h.div(
        [h.Class("grid gap-1.5")],
        [
            h.label(
                [
                    h.For(id),
                    h.Class("text-xs font-medium text-muted-foreground"),
                ],
                [label]
            ),
            h.input([
                h.Id(id),
                h.Name(property),
                h.Type("number"),
                h.Min(String(minimum)),
                h.Max(String(maximum)),
                h.Step("1"),
                h.Value(String(value)),
                h.Class(
                    "min-h-10 w-full rounded-md border border-input bg-background px-3 text-base tabular-nums text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:text-sm"
                ),
                h.OnChange((next_value) => {
                    const parsed = Number(next_value)
                    return Msg.ChangedGeometry({
                        property,
                        value: Number.isFinite(parsed) ? parsed : value,
                    })
                }),
            ]),
        ]
    )
}

const geometry_fields = (
    element: LogoElement,
    h: HtmlBuilder<Msg.Message>
): ReadonlyArray<Html> => {
    switch (element._tag) {
        case "Rect":
            return [
                geometry_field("Width", "width", element.width, 0, 10_000, h),
                geometry_field(
                    "Height",
                    "height",
                    element.height,
                    0,
                    10_000,
                    h
                ),
                geometry_field(
                    "Corner radius",
                    "radius",
                    element.radius,
                    0,
                    Math.min(element.width, element.height) / 2,
                    h
                ),
            ]
        case "Circle":
            return [
                geometry_field(
                    "Radius",
                    "radius",
                    element.radius,
                    0,
                    10_000,
                    h
                ),
                ...(element.style === "Stroke"
                    ? [
                          geometry_field(
                              "Stroke width",
                              "stroke_width",
                              element.stroke_width,
                              0,
                              10_000,
                              h
                          ),
                      ]
                    : []),
            ]
        case "Line":
            return [
                geometry_field("Start X", "x1", element.x1, -10_000, 10_000, h),
                geometry_field("Start Y", "y1", element.y1, -10_000, 10_000, h),
                geometry_field("End X", "x2", element.x2, -10_000, 10_000, h),
                geometry_field("End Y", "y2", element.y2, -10_000, 10_000, h),
                geometry_field(
                    "Stroke width",
                    "stroke_width",
                    element.stroke_width,
                    0,
                    10_000,
                    h
                ),
            ]
    }
}

export const view = (model: Model, h: HtmlBuilder<Msg.Message>): Html => {
    const selected = model.elements.find(
        (element) => element.id === model.selected_element_id
    )
    const icon_props = { class: "size-4" }
    return h.main(
        [h.Class("mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6")],
        [
            h.header(
                [h.Class("flex flex-wrap items-end justify-between gap-4")],
                [
                    h.div(
                        [h.Class("max-w-2xl space-y-1")],
                        [
                            h.h1(
                                [
                                    h.Class(
                                        "text-balance text-2xl font-semibold tracking-tight"
                                    ),
                                ],
                                ["Logo designer"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-pretty text-sm text-muted-foreground"
                                    ),
                                ],
                                [
                                    "A typed, theme-aware SVG scene rendered as native inline elements.",
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("flex items-center gap-2")],
                        [
                            ...(model.save_message === ""
                                ? []
                                : [
                                      h.span(
                                          [
                                              h.Class(
                                                  `text-sm ${model.save_status === "error" ? "text-destructive" : "text-muted-foreground"}`
                                              ),
                                              h.Attribute("role", "status"),
                                          ],
                                          [model.save_message]
                                      ),
                                  ]),
                            toolbar_button(
                                model.save_status === "saving"
                                    ? "Saving…"
                                    : "Save draft",
                                Msg.RequestedSave(),
                                IconCloud(icon_props),
                                h
                            ),
                            toggle_button(
                                "Snap to grid",
                                model.snap_to_grid,
                                Msg.ToggledSnapToGrid(),
                                IconGrid3x3(icon_props),
                                h
                            ),
                            icon_button(
                                "Undo",
                                Msg.Undid(),
                                IconUndo(icon_props),
                                h,
                                model.past.length === 0
                            ),
                            icon_button(
                                "Redo",
                                Msg.Redid(),
                                IconRedo(icon_props),
                                h,
                                model.future.length === 0
                            ),
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-2"
                    ),
                    h.AriaLabel("Logo document controls"),
                ],
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2")],
                        [
                            toolbar_button(
                                "Blank",
                                Msg.LoadedBlank(),
                                IconFilePlus(icon_props),
                                h
                            ),
                            toolbar_button(
                                "URM template",
                                Msg.LoadedTemplate(),
                                IconCopy(icon_props),
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("flex flex-wrap gap-2")],
                        [
                            toolbar_button(
                                "Rectangle",
                                Msg.AddedElement({ kind: "Rectangle" }),
                                IconSquare(icon_props),
                                h
                            ),
                            toolbar_button(
                                "Circle",
                                Msg.AddedElement({ kind: "Circle" }),
                                IconCircle(icon_props),
                                h
                            ),
                            toolbar_button(
                                "Line",
                                Msg.AddedElement({ kind: "Line" }),
                                IconMinus(icon_props),
                                h
                            ),
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "grid min-h-[38rem] overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:grid-cols-[15rem_minmax(0,1fr)_17rem]"
                    ),
                ],
                [
                    h.aside(
                        [
                            h.Class(
                                "border-b border-border bg-muted/30 p-4 lg:border-r lg:border-b-0"
                            ),
                            h.AriaLabel("Logo layers"),
                        ],
                        [
                            h.h2(
                                [h.Class("mb-3 text-sm font-semibold")],
                                ["Layers"]
                            ),
                            h.ul(
                                [h.Class("space-y-1")],
                                model.elements.map((element) =>
                                    h.keyed("li")(
                                        element.id,
                                        [],
                                        [
                                            h.button(
                                                [
                                                    h.Type("button"),
                                                    h.Class(
                                                        `min-h-10 w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                                                            element.id ===
                                                            model.selected_element_id
                                                                ? "bg-accent font-medium text-accent-foreground"
                                                                : "text-muted-foreground"
                                                        }`
                                                    ),
                                                    h.AriaPressed(
                                                        element.id ===
                                                            model.selected_element_id
                                                            ? "true"
                                                            : "false"
                                                    ),
                                                    h.OnClick(
                                                        Msg.SelectedElement({
                                                            id: element.id,
                                                        })
                                                    ),
                                                ],
                                                [element.name]
                                            ),
                                        ]
                                    )
                                )
                            ),
                            ...(model.elements.length === 0
                                ? [
                                      h.p(
                                          [
                                              h.Class(
                                                  "text-sm text-muted-foreground"
                                              ),
                                          ],
                                          ["No layers yet."]
                                      ),
                                  ]
                                : []),
                        ]
                    ),
                    h.figure(
                        [
                            h.Class(
                                "relative grid min-h-[28rem] place-items-center bg-muted/50 p-8 sm:p-12"
                            ),
                        ],
                        [
                            h.svg(
                                [
                                    h.Class(
                                        "size-full max-h-[30rem] max-w-[30rem] touch-none drop-shadow-sm"
                                    ),
                                    h.Attribute("role", "img"),
                                    h.Xmlns("http://www.w3.org/2000/svg"),
                                    h.ViewBox("0 0 100 100"),
                                    h.OnMount(LogoPointer()),
                                ],
                                [
                                    h.title([], ["Theme-aware logo preview"]),
                                    h.rect(
                                        [
                                            h.Attribute("x", "0"),
                                            h.Attribute("y", "0"),
                                            h.Attribute("width", "100"),
                                            h.Attribute("height", "100"),
                                            h.Fill("var(--card)"),
                                            h.Attribute(
                                                "pointer-events",
                                                "none"
                                            ),
                                        ],
                                        []
                                    ),
                                    ...grid_view(h),
                                    ...model.elements.map((element) =>
                                        element_view(element, h)
                                    ),
                                    ...(selected === undefined
                                        ? []
                                        : [selection_view(selected, h)]),
                                ]
                            ),
                            ...(model.elements.length === 0
                                ? [
                                      h.div(
                                          [
                                              h.Class(
                                                  "pointer-events-none absolute max-w-xs space-y-1 text-center"
                                              ),
                                          ],
                                          [
                                              h.p(
                                                  [
                                                      h.Class(
                                                          "font-medium text-foreground"
                                                      ),
                                                  ],
                                                  ["Blank logo"]
                                              ),
                                              h.p(
                                                  [
                                                      h.Class(
                                                          "text-sm text-muted-foreground"
                                                      ),
                                                  ],
                                                  [
                                                      "Add a rectangle, circle, or line to generate the first layer.",
                                                  ]
                                              ),
                                          ]
                                      ),
                                  ]
                                : []),
                            h.figcaption(
                                [h.Class("sr-only")],
                                [
                                    "The preview uses semantic CSS color tokens from the active URM theme.",
                                ]
                            ),
                        ]
                    ),
                    h.aside(
                        [
                            h.Class(
                                "border-t border-border bg-background p-4 lg:border-t-0 lg:border-l"
                            ),
                            h.AriaLabel("Selected layer properties"),
                        ],
                        selected === undefined
                            ? [
                                  h.p(
                                      [
                                          h.Class(
                                              "text-sm text-muted-foreground"
                                          ),
                                      ],
                                      ["Add or select a layer to edit it."]
                                  ),
                              ]
                            : [
                                  h.h2(
                                      [h.Class("text-sm font-semibold")],
                                      [selected.name]
                                  ),
                                  h.p(
                                      [
                                          h.Class(
                                              "mt-1 text-xs text-muted-foreground"
                                          ),
                                      ],
                                      [selected._tag]
                                  ),
                                  h.div(
                                      [h.Class("mt-4 flex gap-2")],
                                      [
                                          icon_button(
                                              "Duplicate layer",
                                              Msg.DuplicatedSelected(),
                                              IconCopy(icon_props),
                                              h
                                          ),
                                          icon_button(
                                              "Delete layer",
                                              Msg.DeletedSelected(),
                                              IconTrash2(icon_props),
                                              h
                                          ),
                                      ]
                                  ),
                                  h.fieldset(
                                      [h.Class("mt-6")],
                                      [
                                          h.legend(
                                              [h.Class("text-sm font-medium")],
                                              ["Geometry"]
                                          ),
                                          h.div(
                                              [
                                                  h.Class(
                                                      "mt-2 grid grid-cols-2 gap-3"
                                                  ),
                                              ],
                                              geometry_fields(selected, h)
                                          ),
                                      ]
                                  ),
                                  h.label(
                                      [
                                          h.Class(
                                              "mt-6 block text-sm font-medium"
                                          ),
                                          h.For("logo-paint-token"),
                                      ],
                                      ["Theme paint"]
                                  ),
                                  h.select(
                                      [
                                          h.Id("logo-paint-token"),
                                          h.Class(
                                              "mt-2 min-h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                          ),
                                          h.Value(selected.paint),
                                          h.OnInput((value) => {
                                              const paint =
                                                  paint_tokens.find(
                                                      (candidate) =>
                                                          candidate === value
                                                  ) ?? selected.paint
                                              return Msg.ChangedPaint({ paint })
                                          }),
                                      ],
                                      paint_tokens.map((paint) =>
                                          h.option([h.Value(paint)], [paint])
                                      )
                                  ),
                                  h.fieldset(
                                      [h.Class("mt-6")],
                                      [
                                          h.legend(
                                              [h.Class("text-sm font-medium")],
                                              ["Position"]
                                          ),
                                          h.div(
                                              [
                                                  h.Class(
                                                      "mt-2 grid w-fit grid-cols-3 gap-1"
                                                  ),
                                              ],
                                              [
                                                  h.span([], []),
                                                  icon_button(
                                                      "Move layer up",
                                                      Msg.NudgedSelected({
                                                          x: 0,
                                                          y: -1,
                                                      }),
                                                      IconArrowUp(icon_props),
                                                      h
                                                  ),
                                                  h.span([], []),
                                                  icon_button(
                                                      "Move layer left",
                                                      Msg.NudgedSelected({
                                                          x: -1,
                                                          y: 0,
                                                      }),
                                                      IconArrowLeft(icon_props),
                                                      h
                                                  ),
                                                  icon_button(
                                                      "Move layer down",
                                                      Msg.NudgedSelected({
                                                          x: 0,
                                                          y: 1,
                                                      }),
                                                      IconArrowDown(icon_props),
                                                      h
                                                  ),
                                                  icon_button(
                                                      "Move layer right",
                                                      Msg.NudgedSelected({
                                                          x: 1,
                                                          y: 0,
                                                      }),
                                                      IconArrowRight(
                                                          icon_props
                                                      ),
                                                      h
                                                  ),
                                              ]
                                          ),
                                      ]
                                  ),
                                  h.dl(
                                      [
                                          h.Class(
                                              "mt-6 grid grid-cols-2 gap-2 border-t border-border pt-4 text-xs tabular-nums"
                                          ),
                                      ],
                                      [
                                          h.dt(
                                              [
                                                  h.Class(
                                                      "text-muted-foreground"
                                                  ),
                                              ],
                                              ["Element ID"]
                                          ),
                                          h.dd(
                                              [
                                                  h.Class(
                                                      "truncate text-right font-mono"
                                                  ),
                                              ],
                                              [selected.id]
                                          ),
                                          h.dt(
                                              [
                                                  h.Class(
                                                      "text-muted-foreground"
                                                  ),
                                              ],
                                              ["Paint"]
                                          ),
                                          h.dd(
                                              [h.Class("text-right font-mono")],
                                              [`--${selected.paint}`]
                                          ),
                                      ]
                                  ),
                              ]
                    ),
                ]
            ),
        ]
    )
}
