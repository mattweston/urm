import { Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import { Switch } from "@foldkit/ui"
import { Schema as S } from "effect"
import { FormLinkUrl } from "@urm/domain/schemas/forms"
import type { LinkSuggestion } from "@urm/ui/foldkit/rich-text-editor/rich-text-editor.view.ts"

import { Button } from "@urm/ui/foldkit/button/button.view.ts"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@urm/ui/foldkit/card.view.ts"
import { IconArrowRight, IconFileText } from "@urm/ui/foldkit/icons/view.ts"
import * as ObjectBuilder from "../objects/builder/submodel.ts"
import {
    ChangedNewSlug,
    ChangedNewTitle,
    ChangedTemplateMetadata,
    GotObjectBuilderMessage,
    SubmittedFormDefinition,
    SubmittedNewForm,
    SubmittedFormTemplate,
    ToggledEditing,
    ToggledCreating,
    type Message,
} from "./forms.message.ts"
import type { Model } from "./forms.model.ts"

export type ViewInputs = Readonly<{
    link_suggestions?: ReadonlyArray<LinkSuggestion>
    forms_href: string
    form_item_href: (form_id: string) => string
    form_href: (slug: string) => string
    submissions_href: (slug: string) => string
    settings_href: (slug: string) => string
}>

const page_header = (
    title: string,
    description: string,
    actions: ReadonlyArray<Html>,
    h: HtmlBuilder<Message>
): Html =>
    h.header(
        [h.Class("flex flex-wrap items-start justify-between gap-4")],
        [
            h.div(
                [h.Class("grid gap-1")],
                [
                    h.h1(
                        [h.Class("text-2xl font-semibold tracking-tight")],
                        [title]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [description]
                    ),
                ]
            ),
            ...actions,
        ]
    )

const edit_switch = (is_editing: boolean, h: HtmlBuilder<Message>): Html =>
    Switch.view<Message>(
        {
            id: "forms-edit-switch",
            isChecked: is_editing,
            onToggle: (next) => ToggledEditing({ is_editing: next }),
            toView: (attributes) =>
                h.div(
                    [h.Class("flex items-center gap-2")],
                    [
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-border bg-muted transition-colors data-[checked]:bg-primary"
                                ),
                            ],
                            [
                                h.span(
                                    [
                                        h.Class(
                                            "pointer-events-none block size-5 translate-x-0 rounded-full bg-background shadow-sm transition-transform data-[checked]:translate-x-5"
                                        ),
                                        ...(is_editing
                                            ? [h.DataAttribute("checked", "")]
                                            : []),
                                    ],
                                    []
                                ),
                            ]
                        ),
                        h.label(
                            [
                                ...attributes.label,
                                h.Class("text-sm font-medium"),
                            ],
                            ["Edit"]
                        ),
                    ]
                ),
        },
        h
    )

const dashboard_view = (
    model: Model,
    inputs: ViewInputs,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("grid gap-6")],
        [
            page_header(
                "Forms",
                "Build reusable forms from typed Foldkit UI components.",
                [
                    Button(
                        {
                            onClick: ToggledCreating(),
                            children: [
                                model.is_creating ? "Cancel" : "New form",
                            ],
                        },
                        h
                    ),
                ],
                h
            ),
            ...(model.is_creating
                ? [
                      Card({
                          class: "max-w-2xl",
                          children: [
                              CardHeader({
                                  children: [
                                      CardTitle({ children: ["Create form"] }),
                                      CardDescription({
                                          children: [
                                              model.creation_template_name ===
                                              null
                                                  ? "Start with an empty draft. Components can be added after creation."
                                                  : `Start with the ${model.creation_template_name} organization template.`,
                                          ],
                                      }),
                                  ],
                              }),
                              CardContent({
                                  children: [
                                      h.form(
                                          [
                                              h.Class("grid gap-4"),
                                              h.OnSubmit(SubmittedNewForm()),
                                          ],
                                          [
                                              h.div(
                                                  [h.Class("grid gap-2")],
                                                  [
                                                      h.label(
                                                          [
                                                              h.For(
                                                                  "new-form-title"
                                                              ),
                                                              h.Class(
                                                                  "text-sm font-medium"
                                                              ),
                                                          ],
                                                          ["Form name"]
                                                      ),
                                                      h.input([
                                                          h.Id(
                                                              "new-form-title"
                                                          ),
                                                          h.Name("title"),
                                                          h.Value(
                                                              model.new_title
                                                          ),
                                                          h.Required(true),
                                                          h.OnInput((value) =>
                                                              ChangedNewTitle({
                                                                  value,
                                                              })
                                                          ),
                                                          h.Class(
                                                              "h-10 rounded-[var(--radius-control)] border border-input bg-background px-3 py-2"
                                                          ),
                                                      ]),
                                                  ]
                                              ),
                                              h.div(
                                                  [h.Class("grid gap-2")],
                                                  [
                                                      h.label(
                                                          [
                                                              h.For(
                                                                  "new-form-slug"
                                                              ),
                                                              h.Class(
                                                                  "text-sm font-medium"
                                                              ),
                                                          ],
                                                          ["URL slug"]
                                                      ),
                                                      h.p(
                                                          [
                                                              h.Id(
                                                                  "new-form-slug-hint"
                                                              ),
                                                              h.Class(
                                                                  "text-xs text-muted-foreground"
                                                              ),
                                                          ],
                                                          [
                                                              "Lowercase letters, numbers, and hyphens.",
                                                          ]
                                                      ),
                                                      h.input([
                                                          h.Id("new-form-slug"),
                                                          h.Name("slug"),
                                                          h.Value(
                                                              model.new_slug
                                                          ),
                                                          h.Required(true),
                                                          h.AriaDescribedBy(
                                                              "new-form-slug-hint"
                                                          ),
                                                          h.OnInput((value) =>
                                                              ChangedNewSlug({
                                                                  value,
                                                              })
                                                          ),
                                                          h.Class(
                                                              "h-10 rounded-[var(--radius-control)] border border-input bg-background px-3 py-2"
                                                          ),
                                                      ]),
                                                  ]
                                              ),
                                              Button(
                                                  {
                                                      type: "submit",
                                                      disabled:
                                                          model.create_status ===
                                                          "saving",
                                                      children: [
                                                          model.create_status ===
                                                          "saving"
                                                              ? "Creating…"
                                                              : "Create form",
                                                      ],
                                                  },
                                                  h
                                              ),
                                          ]
                                      ),
                                  ],
                              }),
                          ],
                      }),
                  ]
                : []),
            ...(model.feedback === ""
                ? []
                : [
                      h.p(
                          [
                              h.Class("text-sm text-muted-foreground"),
                              h.AriaLive("polite"),
                          ],
                          [model.feedback]
                      ),
                  ]),
            h.div(
                [h.Class("grid gap-4 sm:grid-cols-2 xl:grid-cols-3")],
                !model.forms_loaded
                    ? [
                          h.p(
                              [h.Class("text-sm text-muted-foreground")],
                              ["Loading forms…"]
                          ),
                      ]
                    : model.forms.length === 0
                      ? [
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border border-dashed border-border p-6 text-sm text-muted-foreground"
                                    ),
                                ],
                                ["No forms yet. Create the first draft."]
                            ),
                        ]
                      : model.forms.map((form) =>
                            h.a(
                                [
                                    h.Href(inputs.form_item_href(form.id)),
                                    h.Class(
                                        "group block rounded-[var(--radius-surface)] focus-visible:outline-(length:--focus-outline-width) focus-visible:outline-ring focus-visible:outline-offset-[var(--focus-outline-offset)]"
                                    ),
                                ],
                                [
                                    Card({
                                        class: "h-full transition-colors group-hover:bg-accent/30",
                                        children: [
                                            CardHeader({
                                                children: [
                                                    h.div(
                                                        [
                                                            h.Class(
                                                                "flex items-start justify-between gap-3"
                                                            ),
                                                        ],
                                                        [
                                                            h.div(
                                                                [
                                                                    h.Class(
                                                                        "grid gap-2"
                                                                    ),
                                                                ],
                                                                [
                                                                    IconFileText(
                                                                        {
                                                                            class: "size-5 text-muted-foreground",
                                                                        }
                                                                    ),
                                                                    CardTitle({
                                                                        children:
                                                                            [
                                                                                form.title,
                                                                            ],
                                                                    }),
                                                                ]
                                                            ),
                                                            h.span(
                                                                [
                                                                    h.Class(
                                                                        "rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted-foreground"
                                                                    ),
                                                                ],
                                                                [form.status]
                                                            ),
                                                        ]
                                                    ),
                                                    CardDescription({
                                                        children: [
                                                            `/${form.slug}`,
                                                        ],
                                                    }),
                                                ],
                                            }),
                                            CardContent({
                                                class: "flex items-center justify-between text-sm",
                                                children: [
                                                    `${form.submission_count} submissions`,
                                                    IconArrowRight({
                                                        class: "size-4",
                                                    }),
                                                ],
                                            }),
                                        ],
                                    }),
                                ]
                            )
                        )
            ),
        ]
    )

const preview_component = (
    component: ObjectBuilder.ObjectComponentType,
    h: HtmlBuilder<Message>
): Html => {
    const control_id = `form-preview-${component.id}`
    const description_id = `${control_id}-description`
    const described_by =
        component.description === "" ? [] : [h.AriaDescribedBy(description_id)]

    if (component.kind === "heading") {
        return h.h2([h.Class("text-2xl font-semibold")], [component.label])
    }
    if (component.kind === "paragraph") {
        return h.p(
            [h.Class("text-sm text-muted-foreground")],
            [component.label]
        )
    }
    if (component.kind === "link") {
        return S.is(FormLinkUrl)(component.href)
            ? h.a(
                  [
                      h.Href(component.href),
                      h.Target("_blank"),
                      h.Rel("noopener noreferrer"),
                      h.Class(
                          "text-sm text-primary underline focus-visible:outline-2"
                      ),
                  ],
                  [component.label || "Link"]
              )
            : h.p(
                  [h.Class("text-sm text-muted-foreground")],
                  [component.label || "Link"]
              )
    }
    if (component.kind === "radio") {
        return h.fieldset(
            [h.Class("grid gap-2")],
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
                                h.Value(option.value),
                                ...(component.required
                                    ? [h.Required(true)]
                                    : []),
                                ...described_by,
                            ]),
                            option.label,
                        ]
                    )
                }),
            ]
        )
    }
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
                            ...(component.required ? [h.Required(true)] : []),
                            ...described_by,
                        ]),
                        component.label,
                    ]
                ),
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
            component.kind === "textarea"
                ? h.textarea([
                      h.Id(control_id),
                      h.Name(component.name),
                      h.Class(
                          "min-h-28 rounded-[var(--radius-control)] border border-input bg-background px-3 py-2"
                      ),
                      h.Placeholder(component.placeholder),
                      ...(component.required ? [h.Required(true)] : []),
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
                            ...(component.required ? [h.Required(true)] : []),
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
                            "rounded-[var(--radius-control)] border border-input bg-background px-3 py-2"
                        ),
                        h.Placeholder(component.placeholder),
                        ...(component.required ? [h.Required(true)] : []),
                        ...described_by,
                    ]),
        ]
    )
}

const form_navigation = (
    slug: string,
    active: "preview" | "submissions" | "settings",
    inputs: ViewInputs,
    h: HtmlBuilder<Message>
): Html =>
    h.nav(
        [
            h.Class("flex flex-wrap gap-1 border-b border-border"),
            h.AriaLabel("Form sections"),
        ],
        (
            [
                ["preview", "Form", inputs.form_href(slug)],
                ["submissions", "Submissions", inputs.submissions_href(slug)],
                ["settings", "Settings", inputs.settings_href(slug)],
            ] satisfies ReadonlyArray<
                readonly [
                    "preview" | "submissions" | "settings",
                    string,
                    string,
                ]
            >
        ).map(([key, label, href]) =>
            h.a(
                [
                    h.Href(href),
                    h.Class(
                        `border-b-2 px-3 py-2 text-sm font-medium ${key === active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`
                    ),
                ],
                [label]
            )
        )
    )

const form_view = (
    model: Model,
    slug: string,
    inputs: ViewInputs,
    h: HtmlBuilder<Message>
): Html => {
    if (!model.forms_loaded) {
        return h.p(
            [h.Class("text-sm text-muted-foreground")],
            ["Loading form…"]
        )
    }

    const form = model.forms.find((candidate) => candidate.slug === slug)
    if (form === undefined) {
        return h.div(
            [h.Class("grid gap-3")],
            [
                h.h1([h.Class("text-2xl font-semibold")], ["Form not found"]),
                h.a(
                    [
                        h.Href(inputs.forms_href),
                        h.Class("text-sm text-primary hover:underline"),
                    ],
                    ["Back to Forms"]
                ),
            ]
        )
    }

    return h.div(
        [h.Class("grid gap-6")],
        [
            page_header(
                form.title,
                "Preview is the default. Switch on editing to compose its object definition.",
                [
                    h.div(
                        [h.Class("flex items-center gap-3")],
                        [
                            ...(model.is_editing
                                ? [
                                      Button(
                                          {
                                              disabled:
                                                  !model.dirty ||
                                                  model.save_status ===
                                                      "saving",
                                              onClick:
                                                  SubmittedFormDefinition(),
                                              children: [
                                                  model.save_status === "saving"
                                                      ? "Saving…"
                                                      : model.dirty
                                                        ? "Save form"
                                                        : "Saved",
                                              ],
                                          },
                                          h
                                      ),
                                  ]
                                : []),
                            edit_switch(model.is_editing, h),
                        ]
                    ),
                ],
                h
            ),
            form_navigation(slug, "preview", inputs, h),
            ...(model.feedback === ""
                ? []
                : [
                      h.p(
                          [
                              h.Class("text-sm text-muted-foreground"),
                              h.AriaLive("polite"),
                          ],
                          [model.feedback]
                      ),
                  ]),
            !model.detail_loaded
                ? h.div(
                      [
                          h.Class(
                              "grid min-h-48 place-items-center text-sm text-muted-foreground"
                          ),
                      ],
                      ["Loading form definition…"]
                  )
                : model.is_editing
                  ? h.div(
                        [h.Class("grid gap-6")],
                        [
                            Card({
                                children: [
                                    CardHeader({
                                        children: [
                                            CardTitle({
                                                children: ["Save as template"],
                                            }),
                                            CardDescription({
                                                children: [
                                                    "Reuse this field definition across the organization.",
                                                ],
                                            }),
                                        ],
                                    }),
                                    CardContent({
                                        children: [
                                            h.form(
                                                [
                                                    h.Class(
                                                        "grid gap-4 sm:grid-cols-3"
                                                    ),
                                                    h.OnSubmit(
                                                        SubmittedFormTemplate()
                                                    ),
                                                ],
                                                [
                                                    ...(
                                                        [
                                                            [
                                                                "form-template-name",
                                                                "Template name",
                                                                "name",
                                                                model.template_name,
                                                                "160",
                                                            ],
                                                            [
                                                                "form-template-description",
                                                                "Description",
                                                                "description",
                                                                model.template_description,
                                                                "500",
                                                            ],
                                                            [
                                                                "form-template-tags",
                                                                "Tags (comma-separated)",
                                                                "tags",
                                                                model.template_tags,
                                                                "500",
                                                            ],
                                                        ] satisfies ReadonlyArray<
                                                            readonly [
                                                                string,
                                                                string,
                                                                (
                                                                    | "name"
                                                                    | "description"
                                                                    | "tags"
                                                                ),
                                                                string,
                                                                string,
                                                            ]
                                                        >
                                                    ).map(
                                                        ([
                                                            id,
                                                            label,
                                                            field,
                                                            value,
                                                            maxlength,
                                                        ]) =>
                                                            h.label(
                                                                [
                                                                    h.For(id),
                                                                    h.Class(
                                                                        "grid gap-1 text-sm font-medium"
                                                                    ),
                                                                ],
                                                                [
                                                                    label,
                                                                    h.input([
                                                                        h.Id(
                                                                            id
                                                                        ),
                                                                        h.Name(
                                                                            field
                                                                        ),
                                                                        h.Value(
                                                                            value
                                                                        ),
                                                                        h.Maxlength(
                                                                            Number(
                                                                                maxlength
                                                                            )
                                                                        ),
                                                                        ...(field ===
                                                                        "name"
                                                                            ? [
                                                                                  h.Required(
                                                                                      true
                                                                                  ),
                                                                              ]
                                                                            : []),
                                                                        h.OnInput(
                                                                            (
                                                                                next
                                                                            ) =>
                                                                                ChangedTemplateMetadata(
                                                                                    {
                                                                                        field,
                                                                                        value: next,
                                                                                    }
                                                                                )
                                                                        ),
                                                                        h.Class(
                                                                            "min-h-10 rounded-[var(--radius-control)] border border-input bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                                                        ),
                                                                    ]),
                                                                ]
                                                            )
                                                    ),
                                                    Button(
                                                        {
                                                            type: "submit",
                                                            disabled:
                                                                model.template_save_status ===
                                                                "saving",
                                                            children: [
                                                                model.template_save_status ===
                                                                "saving"
                                                                    ? "Saving…"
                                                                    : "Save as template",
                                                            ],
                                                        },
                                                        h
                                                    ),
                                                ]
                                            ),
                                        ],
                                    }),
                                ],
                            }),
                            h.submodel({
                                slotId: "forms-object-builder",
                                model: model.builder,
                                view: ObjectBuilder.view,
                                viewInputs: {
                                    link_suggestions:
                                        inputs.link_suggestions ?? [],
                                },
                                toParentMessage: (message) =>
                                    GotObjectBuilderMessage({ message }),
                            }),
                        ]
                    )
                  : Card({
                        class: "mx-auto w-full max-w-2xl",
                        children: [
                            h.div(
                                [h.Class("grid gap-5 p-6")],
                                [
                                    ...model.builder.definition.components.map(
                                        (component) =>
                                            preview_component(component, h)
                                    ),
                                    Button(
                                        {
                                            type: "button",
                                            disabled: true,
                                            class: "w-full sm:w-auto",
                                            children: ["Submit preview"],
                                            attributes: [
                                                h.Title(
                                                    "Response capture is not connected yet"
                                                ),
                                            ],
                                        },
                                        h
                                    ),
                                ]
                            ),
                        ],
                    }),
        ]
    )
}

const pending_section = (
    slug: string,
    section: "submissions" | "settings",
    inputs: ViewInputs,
    h: HtmlBuilder<Message>
): Html => {
    const title = section === "submissions" ? "Submissions" : "Form settings"
    const description =
        section === "submissions"
            ? "Responses will load only when this child route is opened."
            : "Publication, access, notifications, and site placement will live here."

    return h.div(
        [h.Class("grid gap-6")],
        [
            page_header(title, description, [], h),
            form_navigation(slug, section, inputs, h),
            Card({
                children: [
                    CardContent({
                        class: "grid min-h-48 place-items-center text-center",
                        children: [
                            h.div(
                                [h.Class("grid max-w-md gap-2")],
                                [
                                    h.h2(
                                        [h.Class("font-semibold")],
                                        [
                                            section === "submissions"
                                                ? "Response capture pending"
                                                : "Form settings pending",
                                        ]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "text-sm text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            section === "submissions"
                                                ? "This boundary will use a paginated, domain-scoped submissions query rather than loading responses with the Forms list."
                                                : "A form will be attachable to a production, staging, prototype, survey, or document site without putting publishing concerns into the generic object builder.",
                                        ]
                                    ),
                                ]
                            ),
                        ],
                    }),
                ],
            }),
        ]
    )
}

const forms_view = (
    model: Model,
    inputs: ViewInputs,
    h: HtmlBuilder<Message>
): Html =>
    h.main(
        [h.Class("mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8")],
        [
            model.route._tag === "Forms"
                ? dashboard_view(model, inputs, h)
                : model.route._tag === "Form"
                  ? form_view(model, model.route.slug, inputs, h)
                  : model.route._tag === "FormSubmissions"
                    ? pending_section(
                          model.route.slug,
                          "submissions",
                          inputs,
                          h
                      )
                    : pending_section(model.route.slug, "settings", inputs, h),
        ]
    )

export const view = Submodel.defineView<Model, Message, ViewInputs>(forms_view)
