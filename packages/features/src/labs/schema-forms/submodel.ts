import { Match as M, Schema as S } from "effect"
import { Command, Submodel } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import type { Html } from "foldkit/html"
import { Draft, Kind, TaskForm, IssueForm, example, inspect } from "./schema.ts"
import { highlight_json } from "../schema/shiki.ts"
import { task_source, issue_source } from "./source.ts"
import * as ExplainLines from "../../documents/documentation/explain-lines.ts"
import { explanations } from "./explanations.ts"
import "@urm/ui/styles/documentation.css"
import "../schema/styles.css"
import "./styles.css"

const Field = S.Literals([
    "title",
    "description",
    "status",
    "priority",
    "order",
])
export const SelectedKind = taggedStruct("SelectedKind", { kind: Kind })
const Panel = S.Literals(["json", "typescript"])
export const SelectedPanel = taggedStruct("SelectedPanel", { panel: Panel })
export const GotExplainLinesMessage = taggedStruct("GotExplainLinesMessage", {
    message: ExplainLines.Message,
})
export const ChangedField = taggedStruct("ChangedField", {
    field: Field,
    value: S.String,
})
export const ToggledCompleted = taggedStruct("ToggledCompleted")
export const Submitted = taggedStruct("Submitted")
export const Reset = taggedStruct("Reset")
export const Message = S.Union([
    SelectedKind,
    SelectedPanel,
    GotExplainLinesMessage,
    ChangedField,
    ToggledCompleted,
    Submitted,
    Reset,
])
export type Message = typeof Message.Type
export const Model = S.Struct({
    kind: Kind,
    panel: Panel,
    draft: Draft,
    accepted: S.NullOr(S.toType(S.Union([TaskForm, IssueForm]))),
    attempted: S.Boolean,
})
export type Model = typeof Model.Type
type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
export const init = (): UpdateReturn => [
    {
        kind: "task",
        panel: "json",
        draft: example("task"),
        accepted: null,
        attempted: false,
    },
    [],
]
export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            GotExplainLinesMessage: () => [model, []],
            SelectedPanel: ({ panel }) => [{ ...model, panel }, []],
            SelectedKind: ({ kind }) => [
                {
                    ...model,
                    kind,
                    draft: example(kind),
                    accepted: null,
                    attempted: false,
                },
                [],
            ],
            ChangedField: ({ field, value }) => [
                { ...model, draft: { ...model.draft, [field]: value } },
                [],
            ],
            ToggledCompleted: () => [
                {
                    ...model,
                    draft: {
                        ...model.draft,
                        completed: !model.draft.completed,
                    },
                },
                [],
            ],
            Reset: () => [
                {
                    ...model,
                    draft: example(model.kind),
                    accepted: null,
                    attempted: false,
                },
                [],
            ],
            Submitted: () => {
                const { value } = inspect(model.kind, model.draft)
                return [
                    {
                        ...model,
                        attempted: true,
                        accepted: value === null ? model.accepted : value,
                    },
                    [],
                ]
            },
        })
    )

export const view = Submodel.defineView<Model, Message>((model, h) => {
    const { value, issues } = inspect(model.kind, model.draft)
    const task = model.kind === "task"
    const control_class =
        "w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
    const button_class =
        "rounded-md border border-border px-3 py-2 text-sm hover:bg-muted aria-pressed:bg-muted aria-pressed:font-semibold"
    const panel_class =
        "min-w-0 space-y-3 rounded-xl border border-border bg-card p-5"
    const field = (
        name: typeof Field.Type,
        label: string,
        hint: string,
        options?: ReadonlyArray<string>
    ): Html => {
        const id = `schema-forms-${name}`
        const path =
            name === "title" && task
                ? "text"
                : name === "order" && !task
                  ? "order_position"
                  : name
        const errors = issues.filter((issue) => issue.path === path)
        const attrs = [
            h.Id(id),
            h.Class(control_class),
            h.Value(model.draft[name]),
            h.AriaInvalid(errors.length > 0),
            h.AriaDescribedBy(`${id}-hint ${id}-errors`),
        ]
        return h.div(
            [h.Class("space-y-1")],
            [
                h.label([h.For(id), h.Class("text-sm font-medium")], [label]),
                options
                    ? h.select(
                          [
                              ...attrs,
                              h.OnChange((value) =>
                                  ChangedField({ field: name, value })
                              ),
                          ],
                          options.map((option) =>
                              h.option([h.Value(option)], [option || "Not set"])
                          )
                      )
                    : name === "description"
                      ? h.textarea([
                            ...attrs,
                            h.OnInput((value) =>
                                ChangedField({ field: name, value })
                            ),
                        ])
                      : h.input([
                            ...attrs,
                            h.Type("text"),
                            h.OnInput((value) =>
                                ChangedField({ field: name, value })
                            ),
                        ]),
                h.p(
                    [
                        h.Id(`${id}-hint`),
                        h.Class("text-xs text-muted-foreground"),
                    ],
                    [hint]
                ),
                h.div(
                    [h.Id(`${id}-errors`), h.Class("text-xs text-destructive")],
                    errors.map((issue) => h.p([], [issue.message]))
                ),
            ]
        )
    }
    const json = (title: string, data: unknown) =>
        h.section(
            [h.Class(panel_class)],
            [
                h.h3([h.Class("font-semibold")], [title]),
                h.div([
                    h.Class(
                        "schema-shiki max-h-80 overflow-auto rounded bg-muted p-3 text-xs"
                    ),
                    h.InnerHTML(highlight_json(data)),
                ]),
            ]
        )
    const code = (title: string, html: string) =>
        h.section(
            [h.Key(`schema-explanations-${model.kind}`), h.Class(panel_class)],
            [
                h.h3([h.Class("font-semibold")], [title]),
                h.p(
                    [h.Class("text-xs text-muted-foreground")],
                    [
                        "Select an annotated line, or focus it and press Enter or Space, to toggle its explanation.",
                    ]
                ),
                ExplainLines.view(
                    [
                        h.div([
                            h.Class(
                                "schema-forms-source max-h-96 overflow-auto text-xs"
                            ),
                            h.InnerHTML(html),
                        ]),
                        ...explanations(model.kind).map((explanation) =>
                            h.div(
                                [
                                    h.Class(
                                        "documentation-line-explanation-source"
                                    ),
                                    h.DataAttribute(
                                        "line-explanation-source",
                                        ""
                                    ),
                                    h.DataAttribute(
                                        "explanation-line",
                                        String(explanation.line)
                                    ),
                                    h.DataAttribute(
                                        "explanation-title",
                                        explanation.title
                                    ),
                                ],
                                [
                                    h.p(
                                        [h.Class("font-semibold")],
                                        [explanation.title]
                                    ),
                                    h.p([], [explanation.text]),
                                ]
                            )
                        ),
                    ],
                    (message) => GotExplainLinesMessage({ message }),
                    h
                ),
            ]
        )
    return h.div(
        [h.Class("space-y-6")],
        [
            h.h2([h.Class("text-xl font-semibold")], ["URM schemas as forms"]),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    "Real domain fields, hand-written controls, and explicit draft conversion. This sandbox validates local edit values only; it never saves tasks or issues. Switching examples resets the form.",
                ]
            ),
            h.div(
                [h.Class("flex gap-2")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(button_class),
                            h.AriaPressed(String(task)),
                            h.OnClick(SelectedKind({ kind: "task" })),
                        ],
                        ["Task"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(button_class),
                            h.AriaPressed(String(!task)),
                            h.OnClick(SelectedKind({ kind: "issue" })),
                        ],
                        ["Issue"]
                    ),
                ]
            ),
            h.div(
                [h.Class("grid items-start gap-6 xl:grid-cols-2")],
                [
                    h.form(
                        [h.Class(panel_class), h.OnSubmit(Submitted())],
                        [
                            h.h3(
                                [h.Class("font-semibold")],
                                [
                                    task
                                        ? "Task edit values"
                                        : "Issue edit values",
                                ]
                            ),
                            field(
                                "title",
                                task ? "Task text" : "Issue title",
                                "Trimmed + length checks: lab-only rules; the domain read field is a plain String."
                            ),
                            field(
                                "status",
                                "Status",
                                "Literals: the exact domain vocabulary.",
                                task
                                    ? ["active", "done", "deleted"]
                                    : [
                                          "open",
                                          "in_progress",
                                          "closed",
                                          "archived",
                                          "on_hold",
                                      ]
                            ),
                            field(
                                "priority",
                                "Priority",
                                task
                                    ? "optional + NullOr: Not set becomes null."
                                    : "optional: Not set omits the key.",
                                task
                                    ? ["", "low", "medium", "high"]
                                    : ["", "low", "medium", "high", "urgent"]
                            ),
                            field(
                                "order",
                                task ? "Order" : "Order position",
                                "NumberFromString converts input text. Integer and non-negative checks are lab-only."
                            ),
                            ...(task
                                ? [
                                      h.label(
                                          [
                                              h.Class(
                                                  "flex items-center gap-2 text-sm"
                                              ),
                                          ],
                                          [
                                              h.input([
                                                  h.Type("checkbox"),
                                                  h.Checked(
                                                      model.draft.completed
                                                  ),
                                                  h.OnClick(ToggledCompleted()),
                                              ]),
                                              "Completed — Boolean, independent of status in the domain schema.",
                                          ]
                                      ),
                                  ]
                                : [
                                      field(
                                          "description",
                                          "Description",
                                          "optional(String): this form explicitly omits an empty description."
                                      ),
                                  ]),
                            h.div(
                                [h.Class("flex gap-2")],
                                [
                                    h.button(
                                        [
                                            h.Type("submit"),
                                            h.Class(button_class),
                                        ],
                                        ["Validate locally"]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.Class(button_class),
                                            h.OnClick(Reset()),
                                        ],
                                        ["Reset example"]
                                    ),
                                ]
                            ),
                            h.p(
                                [h.Role("status"), h.Class("text-sm")],
                                [
                                    model.attempted
                                        ? value === null
                                            ? "Fix the field errors. The previous accepted snapshot is unchanged."
                                            : "Valid edit values. Nothing was sent to the server."
                                        : "Validation previews update while you edit.",
                                ]
                            ),
                            h.a(
                                [
                                    h.Href(
                                        "https://docs.urm.dev/docs/design/schema-forms-styleguide/"
                                    ),
                                    h.Target("_blank"),
                                    h.Rel("noopener noreferrer"),
                                    h.Class("text-sm text-primary underline"),
                                ],
                                ["Schema forms styleguide"]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("min-w-0 space-y-4")],
                        [
                            h.div(
                                [
                                    h.Class("flex gap-2"),
                                    h.Role("group"),
                                    h.AriaLabel("Inspector view"),
                                ],
                                [
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.Class(button_class),
                                            h.AriaPressed(
                                                String(model.panel === "json")
                                            ),
                                            h.OnClick(
                                                SelectedPanel({ panel: "json" })
                                            ),
                                        ],
                                        ["JSON"]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.Class(button_class),
                                            h.AriaPressed(
                                                String(
                                                    model.panel === "typescript"
                                                )
                                            ),
                                            h.OnClick(
                                                SelectedPanel({
                                                    panel: "typescript",
                                                })
                                            ),
                                        ],
                                        ["TypeScript schema"]
                                    ),
                                ]
                            ),
                            ...(model.panel === "json"
                                ? [
                                      json("Raw draft · JSON", model.draft),
                                      json(
                                          value === null
                                              ? "Validation issues"
                                              : "Decoded edit values · JSON",
                                          value ?? issues
                                      ),
                                      json(
                                          "Last accepted local snapshot",
                                          model.accepted
                                      ),
                                  ]
                                : [
                                      code(
                                          task ? "Task schema" : "Issue schema",
                                          task ? task_source : issue_source
                                      ),
                                  ]),
                        ]
                    ),
                ]
            ),
        ]
    )
})
