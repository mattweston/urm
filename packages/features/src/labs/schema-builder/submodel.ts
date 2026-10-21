import { Match as M, Schema as S } from "effect"
import { Command, Submodel } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import { Field, FieldKind, initial_fields, inspect, choices } from "./schema.ts"
import { highlight } from "./highlight.ts"
import { highlight_json } from "../schema/shiki.ts"
import "../schema/styles.css"

export const AddedField = taggedStruct("AddedField")
export const RemovedField = taggedStruct("RemovedField", { id: S.Number })
export const MovedField = taggedStruct("MovedField", {
    id: S.Number,
    direction: S.Literals(["up", "down"]),
})
export const ChangedField = taggedStruct("ChangedField", {
    id: S.Number,
    property: S.Literals(["name", "minimum", "choices", "value"]),
    value: S.String,
})
export const ChangedKind = taggedStruct("ChangedKind", {
    id: S.Number,
    kind: FieldKind,
})
export const ToggledField = taggedStruct("ToggledField", {
    id: S.Number,
    property: S.Literals(["optional", "included"]),
})
export const SelectedPanel = taggedStruct("SelectedPanel", {
    panel: S.Literals(["json", "typescript"]),
})
export const Message = S.Union([
    AddedField,
    RemovedField,
    MovedField,
    ChangedField,
    ChangedKind,
    ToggledField,
    SelectedPanel,
])
export type Message = typeof Message.Type
export const Model = S.Struct({
    fields: S.Array(Field),
    next_id: S.Number,
    panel: S.Literals(["json", "typescript"]),
})
export type Model = typeof Model.Type
type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
export const init = (): UpdateReturn => [
    { fields: initial_fields, next_id: 5, panel: "json" },
    [],
]
export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            AddedField: () =>
                model.fields.length >= 20
                    ? [model, []]
                    : [
                          {
                              ...model,
                              next_id: model.next_id + 1,
                              fields: [
                                  ...model.fields,
                                  {
                                      id: model.next_id,
                                      name: `field_${model.next_id}`,
                                      kind: "text",
                                      optional: false,
                                      minimum: "",
                                      choices: "",
                                      value: "",
                                      included: true,
                                  },
                              ],
                          },
                          [],
                      ],
            RemovedField: ({ id }) => [
                {
                    ...model,
                    fields: model.fields.filter((field) => field.id !== id),
                },
                [],
            ],
            ChangedField: ({ id, property, value }) => [
                {
                    ...model,
                    fields: model.fields.map((field) =>
                        field.id === id
                            ? { ...field, [property]: value }
                            : field
                    ),
                },
                [],
            ],
            ChangedKind: ({ id, kind }) => [
                {
                    ...model,
                    fields: model.fields.map((field) =>
                        field.id === id
                            ? {
                                  ...field,
                                  kind,
                                  minimum: "",
                                  choices: "first, second",
                                  value:
                                      kind === "boolean"
                                          ? "false"
                                          : kind === "choice"
                                            ? "first"
                                            : "",
                              }
                            : field
                    ),
                },
                [],
            ],
            ToggledField: ({ id, property }) => [
                {
                    ...model,
                    fields: model.fields.map((field) =>
                        field.id === id
                            ? { ...field, [property]: !field[property] }
                            : field
                    ),
                },
                [],
            ],
            SelectedPanel: ({ panel }) => [{ ...model, panel }, []],
            MovedField: ({ id, direction }) => {
                const index = model.fields.findIndex((field) => field.id === id)
                const destination = index + (direction === "up" ? -1 : 1)
                if (
                    index < 0 ||
                    destination < 0 ||
                    destination >= model.fields.length
                )
                    return [model, []]
                const fields = model.fields.toSpliced(index, 1)
                const selected = model.fields[index]
                if (selected === undefined) return [model, []]
                return [
                    {
                        ...model,
                        fields: fields.toSpliced(destination, 0, selected),
                    },
                    [],
                ]
            },
        })
    )

export const view = Submodel.defineView<Model, Message>((model, h) => {
    const result = inspect(model.fields)
    const button_class =
        "rounded border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40 aria-pressed:bg-muted"
    const input_class =
        "w-full rounded border border-border bg-background px-3 py-2 text-sm"
    const panel_class =
        "min-w-0 space-y-3 rounded-xl border border-border bg-card p-4"
    const edit = (
        field: Field,
        property: "name" | "minimum" | "choices",
        label: string
    ) =>
        h.label(
            [h.Class("block space-y-1 text-sm")],
            [
                label,
                h.input([
                    h.Class(input_class),
                    h.Value(field[property]),
                    h.OnInput((value) =>
                        ChangedField({ id: field.id, property, value })
                    ),
                ]),
            ]
        )
    const json = (title: string, value: unknown) =>
        h.section(
            [h.Class(panel_class)],
            [
                h.h3([h.Class("font-semibold")], [title]),
                h.div([
                    h.Class("schema-shiki max-h-80 overflow-auto text-xs"),
                    h.InnerHTML(highlight_json(value)),
                ]),
            ]
        )
    return h.div(
        [h.Class("space-y-6")],
        [
            h.h2([h.Class("text-xl font-semibold")], ["Schema builder"]),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    "Build a flat object schema and try its form. Everything stays in memory; generated TypeScript is a preview, never executed. Required strings may be empty unless a minimum length is set. Up to 20 fields.",
                ]
            ),
            h.div(
                [h.Class("grid items-start gap-5 xl:grid-cols-2")],
                [
                    h.section(
                        [h.Class("space-y-3")],
                        [
                            h.h3(
                                [h.Class("font-semibold")],
                                ["Field definitions"]
                            ),
                            ...model.fields.map((field, index) =>
                                h.fieldset(
                                    [
                                        h.Key(String(field.id)),
                                        h.Class(panel_class),
                                    ],
                                    [
                                        h.legend(
                                            [h.Class("text-sm font-semibold")],
                                            [`Field ${index + 1}`]
                                        ),
                                        edit(field, "name", "Name"),
                                        h.label(
                                            [
                                                h.Class(
                                                    "block space-y-1 text-sm"
                                                ),
                                            ],
                                            [
                                                "Type",
                                                h.select(
                                                    [
                                                        h.Class(input_class),
                                                        h.Value(field.kind),
                                                        h.OnChange((value) => {
                                                            const result =
                                                                S.decodeUnknownResult(
                                                                    FieldKind
                                                                )(value)
                                                            return ChangedKind({
                                                                id: field.id,
                                                                kind:
                                                                    result._tag ===
                                                                    "Success"
                                                                        ? result.success
                                                                        : field.kind,
                                                            })
                                                        }),
                                                    ],
                                                    FieldKind.literals.map(
                                                        (kind) =>
                                                            h.option(
                                                                [h.Value(kind)],
                                                                [kind]
                                                            )
                                                    )
                                                ),
                                            ]
                                        ),
                                        h.label(
                                            [h.Class("flex gap-2 text-sm")],
                                            [
                                                h.input([
                                                    h.Type("checkbox"),
                                                    h.Checked(field.optional),
                                                    h.OnClick(
                                                        ToggledField({
                                                            id: field.id,
                                                            property:
                                                                "optional",
                                                        })
                                                    ),
                                                ]),
                                                "Optional key",
                                            ]
                                        ),
                                        ...(field.kind === "text" ||
                                        field.kind === "number"
                                            ? [
                                                  edit(
                                                      field,
                                                      "minimum",
                                                      field.kind === "text"
                                                          ? "Minimum length (blank = none)"
                                                          : "Minimum value (blank = none)"
                                                  ),
                                              ]
                                            : []),
                                        ...(field.kind === "choice"
                                            ? [
                                                  edit(
                                                      field,
                                                      "choices",
                                                      "Choices (comma-separated)"
                                                  ),
                                              ]
                                            : []),
                                        h.div(
                                            [h.Class("flex gap-2")],
                                            [
                                                h.button(
                                                    [
                                                        h.Type("button"),
                                                        h.Class(button_class),
                                                        ...(index === 0
                                                            ? [h.Disabled(true)]
                                                            : []),
                                                        h.OnClick(
                                                            MovedField({
                                                                id: field.id,
                                                                direction: "up",
                                                            })
                                                        ),
                                                    ],
                                                    ["Move up"]
                                                ),
                                                h.button(
                                                    [
                                                        h.Type("button"),
                                                        h.Class(button_class),
                                                        ...(index ===
                                                        model.fields.length - 1
                                                            ? [h.Disabled(true)]
                                                            : []),
                                                        h.OnClick(
                                                            MovedField({
                                                                id: field.id,
                                                                direction:
                                                                    "down",
                                                            })
                                                        ),
                                                    ],
                                                    ["Move down"]
                                                ),
                                                h.button(
                                                    [
                                                        h.Type("button"),
                                                        h.Class(button_class),
                                                        h.OnClick(
                                                            RemovedField({
                                                                id: field.id,
                                                            })
                                                        ),
                                                    ],
                                                    ["Remove"]
                                                ),
                                            ]
                                        ),
                                    ]
                                )
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Class(button_class),
                                    ...(model.fields.length >= 20
                                        ? [h.Disabled(true)]
                                        : []),
                                    h.OnClick(AddedField()),
                                ],
                                ["Add field"]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("min-w-0 space-y-4")],
                        result.errors.length > 0
                            ? [
                                  h.section(
                                      [h.Class(panel_class), h.Role("status")],
                                      [
                                          h.h3(
                                              [h.Class("font-semibold")],
                                              ["Fix field definitions"]
                                          ),
                                          ...result.errors.map((error) =>
                                              h.p(
                                                  [
                                                      h.Class(
                                                          "text-sm text-destructive"
                                                      ),
                                                  ],
                                                  [error]
                                              )
                                          ),
                                      ]
                                  ),
                              ]
                            : [
                                  h.section(
                                      [h.Class(panel_class)],
                                      [
                                          h.h3(
                                              [h.Class("font-semibold")],
                                              [
                                                  "Generated form · live validation",
                                              ]
                                          ),
                                          ...model.fields.map((field) => {
                                              const id = `builder-value-${field.id}`
                                              const errors =
                                                  result.issues.filter(
                                                      (issue) =>
                                                          issue.path ===
                                                          field.name
                                                  )
                                              const attrs = [
                                                  h.Id(id),
                                                  h.Class(input_class),
                                                  h.Value(field.value),
                                                  h.AriaInvalid(
                                                      errors.length > 0
                                                  ),
                                                  h.AriaDescribedBy(
                                                      `${id}-errors`
                                                  ),
                                                  ...(field.optional &&
                                                  !field.included
                                                      ? [h.Disabled(true)]
                                                      : []),
                                              ]
                                              return h.div(
                                                  [
                                                      h.Key(String(field.id)),
                                                      h.Class("space-y-1"),
                                                  ],
                                                  [
                                                      h.label(
                                                          [
                                                              h.For(id),
                                                              h.Class(
                                                                  "text-sm font-medium"
                                                              ),
                                                          ],
                                                          [field.name]
                                                      ),
                                                      ...(field.optional
                                                          ? [
                                                                h.label(
                                                                    [
                                                                        h.Class(
                                                                            "flex gap-2 text-xs"
                                                                        ),
                                                                    ],
                                                                    [
                                                                        h.input(
                                                                            [
                                                                                h.Type(
                                                                                    "checkbox"
                                                                                ),
                                                                                h.Checked(
                                                                                    field.included
                                                                                ),
                                                                                h.OnClick(
                                                                                    ToggledField(
                                                                                        {
                                                                                            id: field.id,
                                                                                            property:
                                                                                                "included",
                                                                                        }
                                                                                    )
                                                                                ),
                                                                            ]
                                                                        ),
                                                                        "Include key (unchecked = omitted)",
                                                                    ]
                                                                ),
                                                            ]
                                                          : []),
                                                      field.kind ===
                                                          "boolean" ||
                                                      field.kind === "choice"
                                                          ? h.select(
                                                                [
                                                                    ...attrs,
                                                                    h.OnChange(
                                                                        (
                                                                            value
                                                                        ) =>
                                                                            ChangedField(
                                                                                {
                                                                                    id: field.id,
                                                                                    property:
                                                                                        "value",
                                                                                    value,
                                                                                }
                                                                            )
                                                                    ),
                                                                ],
                                                                [
                                                                    h.option(
                                                                        [
                                                                            h.Value(
                                                                                ""
                                                                            ),
                                                                        ],
                                                                        [
                                                                            "Choose…",
                                                                        ]
                                                                    ),
                                                                    ...(field.kind ===
                                                                    "boolean"
                                                                        ? [
                                                                              "false",
                                                                              "true",
                                                                          ]
                                                                        : choices(
                                                                              field
                                                                          )
                                                                    ).map(
                                                                        (
                                                                            value
                                                                        ) =>
                                                                            h.option(
                                                                                [
                                                                                    h.Value(
                                                                                        value
                                                                                    ),
                                                                                ],
                                                                                [
                                                                                    value,
                                                                                ]
                                                                            )
                                                                    ),
                                                                ]
                                                            )
                                                          : h.input([
                                                                ...attrs,
                                                                h.Type("text"),
                                                                h.OnInput(
                                                                    (value) =>
                                                                        ChangedField(
                                                                            {
                                                                                id: field.id,
                                                                                property:
                                                                                    "value",
                                                                                value,
                                                                            }
                                                                        )
                                                                ),
                                                            ]),
                                                      h.div(
                                                          [
                                                              h.Id(
                                                                  `${id}-errors`
                                                              ),
                                                              h.Class(
                                                                  "text-xs text-destructive"
                                                              ),
                                                          ],
                                                          errors.map((issue) =>
                                                              h.p(
                                                                  [],
                                                                  [
                                                                      issue.message,
                                                                  ]
                                                              )
                                                          )
                                                      ),
                                                  ]
                                              )
                                          }),
                                      ]
                                  ),
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
                                                      String(
                                                          model.panel === "json"
                                                      )
                                                  ),
                                                  h.OnClick(
                                                      SelectedPanel({
                                                          panel: "json",
                                                      })
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
                                                          model.panel ===
                                                              "typescript"
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
                                            json("Encoded input", result.draft),
                                            json(
                                                result.value === null
                                                    ? "Validation issues"
                                                    : "Decoded value",
                                                result.value ?? result.issues
                                            ),
                                        ]
                                      : [
                                            h.section(
                                                [h.Class(panel_class)],
                                                [
                                                    h.h3(
                                                        [
                                                            h.Class(
                                                                "font-semibold"
                                                            ),
                                                        ],
                                                        [
                                                            "Generated TypeScript schema",
                                                        ]
                                                    ),
                                                    h.div([
                                                        h.Class(
                                                            "schema-shiki overflow-auto text-xs"
                                                        ),
                                                        h.InnerHTML(
                                                            highlight(
                                                                result.source
                                                            )
                                                        ),
                                                    ]),
                                                ]
                                            ),
                                        ]),
                              ]
                    ),
                ]
            ),
        ]
    )
})
