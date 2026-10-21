import * as Array from "effect/Array"
import { Option, Schema as S } from "effect"
import { Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import * as Ui from "@foldkit/ui"
import { FormLinkUrl } from "@urm/domain/schemas/forms"
import type { LinkSuggestion } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"
import { bookmark_url_field_view } from "../../content/bookmarks/bookmark-url-field.view.ts"

import { Button } from "@urm/ui/foldkit/button/button.view.ts"
import {
    IconArrowDown,
    IconArrowUp,
    IconCopy,
    IconGripVertical,
    IconPlus,
    IconTrash,
} from "@urm/ui/foldkit/icons/view.ts"
import {
    AddedComponent,
    AddedComponentOption,
    ChangedComponentDescription,
    ChangedComponentLabel,
    ChangedComponentHref,
    ChangedComponentName,
    ChangedComponentOptionLabel,
    ChangedComponentOptionValue,
    ChangedComponentPlaceholder,
    DuplicatedComponent,
    GotDragAndDropMessage,
    MovedComponent,
    RemovedComponent,
    RemovedComponentOption,
    SelectedComponent,
    ToggledComponentRequired,
    type Message,
} from "./object.message.ts"
import type {
    Model,
    ObjectComponent,
    ObjectComponentKind,
} from "./object.model.ts"

type PaletteItem = Readonly<{
    kind: ObjectComponentKind
    label: string
    description: string
}>

const display_items: ReadonlyArray<PaletteItem> = [
    {
        kind: "link",
        label: "Link",
        description: "Privacy policy or supporting resource",
    },
    {
        kind: "heading",
        label: "Heading",
        description: "Introduce a section",
    },
    {
        kind: "paragraph",
        label: "Paragraph",
        description: "Add supporting copy",
    },
]

const field_items: ReadonlyArray<PaletteItem> = [
    { kind: "text", label: "Short answer", description: "Single-line text" },
    { kind: "textarea", label: "Long answer", description: "Multi-line text" },
    { kind: "email", label: "Email", description: "Email address" },
    { kind: "number", label: "Number", description: "Numeric value" },
    { kind: "tel", label: "Phone", description: "Telephone number" },
    { kind: "url", label: "Website", description: "Web address" },
    { kind: "date", label: "Date", description: "Calendar date" },
    { kind: "checkbox", label: "Checkbox", description: "Single consent" },
    { kind: "select", label: "Select", description: "Dropdown choices" },
    { kind: "radio", label: "Radio group", description: "Visible choices" },
]

const kind_label = (kind: ObjectComponentKind): string => {
    switch (kind) {
        case "link":
            return "Link"
        case "heading":
            return "Heading"
        case "paragraph":
            return "Paragraph"
        case "text":
            return "Short answer"
        case "textarea":
            return "Long answer"
        case "email":
            return "Email"
        case "number":
            return "Number"
        case "tel":
            return "Phone"
        case "url":
            return "Website"
        case "date":
            return "Date"
        case "checkbox":
            return "Checkbox"
        case "select":
            return "Select"
        case "radio":
            return "Radio group"
    }
}

const is_input = (kind: ObjectComponentKind): boolean =>
    kind !== "heading" && kind !== "paragraph" && kind !== "link"

const supports_placeholder = (kind: ObjectComponentKind): boolean =>
    kind === "text" ||
    kind === "textarea" ||
    kind === "email" ||
    kind === "number" ||
    kind === "tel" ||
    kind === "url" ||
    kind === "select"

const supports_options = (kind: ObjectComponentKind): boolean =>
    kind === "select" || kind === "radio"

const component_preview = (
    component: ObjectComponent,
    h: HtmlBuilder<Message>
): Html => {
    const control_id = `builder-preview-${component.id}`
    const description_id = `${control_id}-description`
    const described_by =
        component.description === "" ? [] : [h.AriaDescribedBy(description_id)]

    if (component.kind === "heading") {
        return h.h3([h.Class("text-lg font-semibold")], [component.label])
    }
    if (component.kind === "paragraph") {
        return h.p(
            [h.Class("text-sm text-muted-foreground")],
            [component.label]
        )
    }
    if (component.kind === "link") {
        return h.p(
            [h.Class("text-primary underline")],
            [component.label || "Link"]
        )
    }
    if (component.kind === "radio") {
        return h.fieldset(
            [h.Class("grid gap-2"), h.Disabled(true)],
            [
                h.legend([h.Class("text-sm font-medium")], [component.label]),
                ...(component.description === ""
                    ? []
                    : [
                          h.p(
                              [
                                  h.Id(description_id),
                                  h.Class("text-xs text-muted-foreground"),
                              ],
                              [component.description]
                          ),
                      ]),
                ...component.options.map((option) => {
                    const option_id = `${control_id}-${option.id}`
                    return h.label(
                        [
                            h.For(option_id),
                            h.Class("flex items-center gap-2 text-sm"),
                        ],
                        [
                            h.input([
                                h.Id(option_id),
                                h.Type("radio"),
                                h.Name(component.name),
                                h.Disabled(true),
                                ...described_by,
                            ]),
                            option.label,
                        ]
                    )
                }),
            ]
        )
    }

    const description =
        component.description === ""
            ? []
            : [
                  h.p(
                      [
                          h.Id(description_id),
                          h.Class("text-xs font-normal text-muted-foreground"),
                      ],
                      [component.description]
                  ),
              ]

    if (component.kind === "checkbox") {
        return h.div(
            [h.Class("grid gap-1")],
            [
                h.label(
                    [
                        h.For(control_id),
                        h.Class("flex items-center gap-2 text-sm"),
                    ],
                    [
                        h.input([
                            h.Id(control_id),
                            h.Type("checkbox"),
                            h.Name(component.name),
                            h.Disabled(true),
                            ...described_by,
                        ]),
                        component.label,
                    ]
                ),
                ...description,
            ]
        )
    }

    return h.div(
        [h.Class("grid gap-2")],
        [
            h.label(
                [h.For(control_id), h.Class("text-sm font-medium")],
                [component.label]
            ),
            ...description,
            component.kind === "textarea"
                ? h.textarea([
                      h.Id(control_id),
                      h.Name(component.name),
                      h.Class(
                          "min-h-24 rounded-[var(--radius-control)] border border-input bg-background px-3 py-2"
                      ),
                      h.Placeholder(component.placeholder),
                      h.Disabled(true),
                      ...described_by,
                  ])
                : component.kind === "select"
                  ? h.select(
                        [
                            h.Id(control_id),
                            h.Name(component.name),
                            h.Class(
                                "h-10 rounded-[var(--radius-control)] border border-input bg-background px-3"
                            ),
                            h.Disabled(true),
                            ...described_by,
                        ],
                        [
                            h.option([h.Value("")], [component.placeholder]),
                            ...component.options.map((option) =>
                                h.option(
                                    [h.Key(option.id), h.Value(option.value)],
                                    [option.label]
                                )
                            ),
                        ]
                    )
                  : h.input([
                        h.Id(control_id),
                        h.Name(component.name),
                        h.Type(component.kind),
                        h.Class(
                            "h-10 rounded-[var(--radius-control)] border border-input bg-background px-3 py-2"
                        ),
                        h.Placeholder(component.placeholder),
                        h.Disabled(true),
                        ...described_by,
                    ]),
        ]
    )
}

const component_card = (
    component: ObjectComponent,
    index: number,
    component_count: number,
    is_selected: boolean,
    drag_and_drop: Ui.DragAndDrop.Model,
    h: HtmlBuilder<Message>
): Html =>
    h.article(
        [
            h.Key(component.id),
            h.Class(
                `rounded-[var(--radius-surface)] border p-4 transition-colors ${is_selected ? "border-primary bg-accent/40" : "border-border bg-card hover:bg-accent/20"} ${Option.contains(Ui.DragAndDrop.maybeDraggedItemId(drag_and_drop), component.id) ? "opacity-50 ring-2 ring-primary" : ""} ${Option.exists(Ui.DragAndDrop.maybeDropTarget(drag_and_drop), (target) => target.index === index) ? "border-t-2 border-t-primary" : ""}`
            ),
        ],
        [
            h.button(
                [
                    h.Type("button"),
                    h.Class(
                        "mb-3 flex min-h-9 w-full touch-none cursor-grab items-center gap-2 rounded px-1 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)]"
                    ),
                    h.AriaLabel(`Edit and reorder ${component.label}`),
                    h.OnClick(
                        SelectedComponent({ component_id: component.id })
                    ),
                    ...Ui.DragAndDrop.draggable(
                        {
                            model: drag_and_drop,
                            itemId: component.id,
                            containerId: "form-components",
                            index,
                            toParentMessage: (message) =>
                                GotDragAndDropMessage({ message }),
                        },
                        h
                    ),
                ],
                [
                    IconGripVertical({ class: "size-4 shrink-0" }),
                    h.span(
                        [h.Class("font-medium")],
                        [kind_label(component.kind)]
                    ),
                    h.span([h.Class("truncate")], [component.name]),
                    h.span(
                        [h.Class("ml-auto text-xs font-medium")],
                        ["Edit properties"]
                    ),
                ]
            ),
            component_preview(component, h),
            h.div(
                [
                    h.Class(
                        "mt-3 flex justify-end gap-1 border-t border-border pt-3"
                    ),
                ],
                [
                    Button(
                        {
                            variant: "ghost",
                            size: "icon",
                            class: "size-8",
                            disabled: index === 0,
                            onClick: MovedComponent({
                                component_id: component.id,
                                direction: "up",
                            }),
                            attributes: [
                                h.AriaLabel(`Move ${component.label} up`),
                            ],
                            children: [IconArrowUp({ class: "size-4" })],
                        },
                        h
                    ),
                    Button(
                        {
                            variant: "ghost",
                            size: "icon",
                            class: "size-8",
                            disabled: index === component_count - 1,
                            onClick: MovedComponent({
                                component_id: component.id,
                                direction: "down",
                            }),
                            attributes: [
                                h.AriaLabel(`Move ${component.label} down`),
                            ],
                            children: [IconArrowDown({ class: "size-4" })],
                        },
                        h
                    ),
                    Button(
                        {
                            variant: "ghost",
                            size: "icon",
                            class: "size-8",
                            onClick: DuplicatedComponent({
                                component_id: component.id,
                            }),
                            attributes: [
                                h.AriaLabel(`Duplicate ${component.label}`),
                            ],
                            children: [IconCopy({ class: "size-4" })],
                        },
                        h
                    ),
                    Button(
                        {
                            variant: "ghost",
                            size: "icon",
                            class: "size-8 text-destructive",
                            onClick: RemovedComponent({
                                component_id: component.id,
                            }),
                            attributes: [
                                h.AriaLabel(`Remove ${component.label}`),
                            ],
                            children: [IconTrash({ class: "size-4" })],
                        },
                        h
                    ),
                ]
            ),
        ]
    )

const inspector_input = (
    id: string,
    label: string,
    value: string,
    on_input: (value: string) => Message,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("grid gap-2")],
        [
            h.label([h.For(id), h.Class("text-sm font-medium")], [label]),
            h.input([
                h.Id(id),
                h.Value(value),
                h.OnInput(on_input),
                h.Class(
                    "h-10 rounded-[var(--radius-control)] border border-input bg-background px-3 py-2"
                ),
            ]),
        ]
    )

const options_editor = (
    component: ObjectComponent,
    h: HtmlBuilder<Message>
): Html =>
    h.fieldset(
        [h.Class("grid gap-3")],
        [
            h.div(
                [h.Class("flex items-center justify-between gap-2")],
                [
                    h.legend([h.Class("text-sm font-medium")], ["Options"]),
                    Button(
                        {
                            type: "button",
                            variant: "outline",
                            size: "sm",
                            class: "gap-1",
                            onClick: AddedComponentOption(),
                            children: [
                                IconPlus({ class: "size-3.5" }),
                                "Add option",
                            ],
                        },
                        h
                    ),
                ]
            ),
            ...(component.options.length === 0
                ? [
                      h.p(
                          [h.Class("text-xs text-muted-foreground")],
                          ["Add at least one option for respondents to choose."]
                      ),
                  ]
                : component.options.map((option, index) => {
                      const label_id = `builder-option-label-${option.id}`
                      const value_id = `builder-option-value-${option.id}`
                      return h.div(
                          [
                              h.Key(option.id),
                              h.Class(
                                  "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2rem] gap-2"
                              ),
                          ],
                          [
                              h.div(
                                  [h.Class("grid gap-1")],
                                  [
                                      h.label(
                                          [
                                              h.For(label_id),
                                              h.Class(
                                                  "text-xs text-muted-foreground"
                                              ),
                                          ],
                                          [`Label ${index + 1}`]
                                      ),
                                      h.input([
                                          h.Id(label_id),
                                          h.Value(option.label),
                                          h.OnInput((value) =>
                                              ChangedComponentOptionLabel({
                                                  option_id: option.id,
                                                  value,
                                              })
                                          ),
                                          h.Class(
                                              "h-9 min-w-0 rounded-[var(--radius-control)] border border-input bg-background px-2"
                                          ),
                                      ]),
                                  ]
                              ),
                              h.div(
                                  [h.Class("grid gap-1")],
                                  [
                                      h.label(
                                          [
                                              h.For(value_id),
                                              h.Class(
                                                  "text-xs text-muted-foreground"
                                              ),
                                          ],
                                          ["Value"]
                                      ),
                                      h.input([
                                          h.Id(value_id),
                                          h.Value(option.value),
                                          h.OnInput((value) =>
                                              ChangedComponentOptionValue({
                                                  option_id: option.id,
                                                  value,
                                              })
                                          ),
                                          h.Class(
                                              "h-9 min-w-0 rounded-[var(--radius-control)] border border-input bg-background px-2"
                                          ),
                                      ]),
                                  ]
                              ),
                              Button(
                                  {
                                      type: "button",
                                      variant: "ghost",
                                      size: "icon",
                                      class: "mt-5 size-8 text-destructive",
                                      onClick: RemovedComponentOption({
                                          option_id: option.id,
                                      }),
                                      attributes: [
                                          h.AriaLabel(`Remove ${option.label}`),
                                      ],
                                      children: [
                                          IconTrash({ class: "size-4" }),
                                      ],
                                  },
                                  h
                              ),
                          ]
                      )
                  })),
        ]
    )

const inspector = (
    model: Model,
    link_suggestions: ReadonlyArray<LinkSuggestion>,
    h: HtmlBuilder<Message>
): Html =>
    Option.match(
        Option.flatMap(model.selected_component_id, (component_id) =>
            Array.findFirst(
                model.definition.components,
                (component) => component.id === component_id
            )
        ),
        {
            onNone: () =>
                h.div(
                    [
                        h.Class(
                            "rounded-[var(--radius-surface)] border border-dashed border-border p-5 text-sm text-muted-foreground"
                        ),
                    ],
                    ["Select a component to edit its properties."]
                ),
            onSome: (component) => {
                const required_id = `builder-required-${component.id}`
                return h.div(
                    [h.Class("grid gap-4")],
                    [
                        h.div(
                            [h.Class("grid gap-1 border-b border-border pb-4")],
                            [
                                h.p(
                                    [h.Class("text-sm font-medium")],
                                    [kind_label(component.kind)]
                                ),
                                h.p(
                                    [h.Class("text-xs text-muted-foreground")],
                                    [component.id]
                                ),
                            ]
                        ),
                        inspector_input(
                            `builder-label-${component.id}`,
                            component.kind === "paragraph"
                                ? "Content"
                                : "Label",
                            component.label,
                            (value) => ChangedComponentLabel({ value }),
                            h
                        ),
                        ...(is_input(component.kind)
                            ? [
                                  inspector_input(
                                      `builder-name-${component.id}`,
                                      "Field name",
                                      component.name,
                                      (value) =>
                                          ChangedComponentName({ value }),
                                      h
                                  ),
                                  inspector_input(
                                      `builder-description-${component.id}`,
                                      "Description",
                                      component.description,
                                      (value) =>
                                          ChangedComponentDescription({
                                              value,
                                          }),
                                      h
                                  ),
                              ]
                            : []),
                        ...(component.kind === "link"
                            ? [
                                  bookmark_url_field_view(
                                      {
                                          id: `builder-link-${component.id}`,
                                          label: "Destination URL",
                                          value: component.href,
                                          suggestions: link_suggestions,
                                          on_input: (value) =>
                                              ChangedComponentHref({ value }),
                                      },
                                      h
                                  ),
                                  h.p(
                                      [
                                          h.Class(
                                              "text-xs text-muted-foreground"
                                          ),
                                      ],
                                      [
                                          "Choose a Bookmark or enter an HTTP(S) URL. Saved forms keep a copy of this URL.",
                                      ]
                                  ),
                                  ...(S.is(FormLinkUrl)(component.href)
                                      ? [
                                            h.a(
                                                [
                                                    h.Href(component.href),
                                                    h.Target("_blank"),
                                                    h.Rel(
                                                        "noopener noreferrer"
                                                    ),
                                                    h.Class(
                                                        "text-sm text-primary underline focus-visible:outline-2"
                                                    ),
                                                ],
                                                [
                                                    "Open destination in a new tab",
                                                ]
                                            ),
                                        ]
                                      : []),
                              ]
                            : []),
                        ...(supports_placeholder(component.kind)
                            ? [
                                  inspector_input(
                                      `builder-placeholder-${component.id}`,
                                      "Placeholder",
                                      component.placeholder,
                                      (value) =>
                                          ChangedComponentPlaceholder({
                                              value,
                                          }),
                                      h
                                  ),
                              ]
                            : []),
                        ...(supports_options(component.kind)
                            ? [options_editor(component, h)]
                            : []),
                        ...(is_input(component.kind)
                            ? [
                                  h.label(
                                      [
                                          h.For(required_id),
                                          h.Class(
                                              "flex items-center gap-2 text-sm"
                                          ),
                                      ],
                                      [
                                          h.input([
                                              h.Id(required_id),
                                              h.Type("checkbox"),
                                              h.Checked(component.required),
                                              h.OnClick(
                                                  ToggledComponentRequired({
                                                      required:
                                                          !component.required,
                                                  })
                                              ),
                                          ]),
                                          "Required",
                                      ]
                                  ),
                              ]
                            : []),
                    ]
                )
            },
        }
    )

const palette_group = (
    title: string,
    items: ReadonlyArray<PaletteItem>,
    h: HtmlBuilder<Message>
): Html =>
    h.section(
        [h.Class("grid gap-2")],
        [
            h.h4(
                [
                    h.Class(
                        "text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    ),
                ],
                [title]
            ),
            ...items.map(({ kind, label, description }) =>
                Button(
                    {
                        variant: "ghost",
                        class: "h-auto justify-start gap-3 px-2 py-2 text-left",
                        onClick: AddedComponent({ kind }),
                        children: [
                            h.span(
                                [
                                    h.Class(
                                        "grid size-8 shrink-0 place-items-center rounded-[var(--radius-control)] border border-dashed border-border bg-muted"
                                    ),
                                ],
                                [IconPlus({ class: "size-4" })]
                            ),
                            h.span(
                                [h.Class("grid min-w-0")],
                                [
                                    h.span([h.Class("text-sm")], [label]),
                                    h.span(
                                        [
                                            h.Class(
                                                "truncate text-xs font-normal text-muted-foreground"
                                            ),
                                        ],
                                        [description]
                                    ),
                                ]
                            ),
                        ],
                    },
                    h
                )
            ),
        ]
    )

type ViewInputs = Readonly<{ link_suggestions?: ReadonlyArray<LinkSuggestion> }>
const object_builder_view = (
    model: Model,
    inputs: ViewInputs,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [
            h.Class(
                "grid min-h-[34rem] gap-4 xl:grid-cols-[15rem_minmax(0,1fr)_20rem]"
            ),
        ],
        [
            ...Option.match(Ui.DragAndDrop.ghostStyle(model.drag_and_drop), {
                onNone: () => [],
                onSome: (style) => [
                    h.div(
                        [
                            h.Style(style),
                            h.AriaHidden(true),
                            h.Class(
                                "rounded-[var(--radius-surface)] border border-primary bg-card px-4 py-3 shadow-lg"
                            ),
                        ],
                        ["Move form component"]
                    ),
                ],
            }),
            h.aside(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border border-border bg-card p-4"
                    ),
                    h.AriaLabel("Form components"),
                ],
                [
                    h.h3([h.Class("font-semibold")], ["Components"]),
                    h.p(
                        [h.Class("mt-1 text-xs text-muted-foreground")],
                        ["Add an element to the end of the form."]
                    ),
                    h.div(
                        [
                            h.Class(
                                "mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-1"
                            ),
                        ],
                        [
                            palette_group("Content", display_items, h),
                            palette_group("Fields", field_items, h),
                        ]
                    ),
                ]
            ),
            h.section(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border border-border bg-muted/20 p-4 sm:p-6"
                    ),
                    h.AriaLabel("Form canvas"),
                ],
                [
                    h.div(
                        [
                            h.Class("mx-auto grid max-w-2xl gap-3"),
                            ...Ui.DragAndDrop.droppable(
                                "form-components",
                                "Form components"
                            ),
                        ],
                        model.definition.components.length === 0
                            ? [
                                  h.div(
                                      [
                                          h.Class(
                                              "grid min-h-64 place-items-center rounded-[var(--radius-surface)] border border-dashed border-border bg-card p-8 text-center"
                                          ),
                                      ],
                                      [
                                          h.div(
                                              [h.Class("grid max-w-sm gap-2")],
                                              [
                                                  h.h3(
                                                      [h.Class("font-medium")],
                                                      ["Start with a component"]
                                                  ),
                                                  h.p(
                                                      [
                                                          h.Class(
                                                              "text-sm text-muted-foreground"
                                                          ),
                                                      ],
                                                      [
                                                          "Choose a content or field element from the component palette.",
                                                      ]
                                                  ),
                                              ]
                                          ),
                                      ]
                                  ),
                              ]
                            : model.definition.components.map(
                                  (component, index) =>
                                      component_card(
                                          component,
                                          index,
                                          model.definition.components.length,
                                          Option.contains(
                                              model.selected_component_id,
                                              component.id
                                          ),
                                          model.drag_and_drop,
                                          h
                                      )
                              )
                    ),
                ]
            ),
            h.aside(
                [
                    h.Class(
                        "rounded-[var(--radius-surface)] border border-border bg-card p-4"
                    ),
                    h.AriaLabel("Component properties"),
                ],
                [
                    h.h3([h.Class("font-semibold")], ["Properties"]),
                    h.div(
                        [h.Class("mt-4")],
                        [inspector(model, inputs.link_suggestions ?? [], h)]
                    ),
                ]
            ),
        ]
    )

export const view = Submodel.defineView<Model, Message, ViewInputs>(
    object_builder_view
)
