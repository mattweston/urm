import { Match as M, Result, Schema as S } from "effect"
import { Command, Submodel } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import type { Html, HtmlBuilder } from "foldkit/html"
import { highlight_json } from "./shiki.ts"
import "./styles.css"

import {
    Draft,
    Submission,
    empty_draft,
    valid_draft,
    invalid_draft,
    inspect,
} from "./schema.ts"

const Field = S.Literals(["name", "email", "age"])
const YearField = S.Literals(["from", "to"])
const AddressField = S.Literals(["city", "postal_code"])
export const ChangedField = taggedStruct("ChangedField", {
    field: Field,
    value: S.String,
})
export const ChangedYear = taggedStruct("ChangedYear", {
    field: YearField,
    value: S.String,
})
export const ChangedAddress = taggedStruct("ChangedAddress", {
    index: S.Number,
    field: AddressField,
    value: S.String,
})
export const AddedAddress = taggedStruct("AddedAddress")
export const RemovedAddress = taggedStruct("RemovedAddress", {
    index: S.Number,
})
export const LoadedExample = taggedStruct("LoadedExample", {
    example: S.Literals(["empty", "valid", "invalid"]),
})
export const Submitted = taggedStruct("Submitted")
export const Message = S.Union([
    ChangedField,
    ChangedYear,
    ChangedAddress,
    AddedAddress,
    RemovedAddress,
    LoadedExample,
    Submitted,
])
export type Message = typeof Message.Type

export const Model = S.Struct({
    draft: Draft,
    touched: S.Array(S.String),
    attempted: S.Boolean,
    last_submission: S.NullOr(S.toType(Submission)),
})
export type Model = typeof Model.Type
type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): UpdateReturn => [
    {
        draft: empty_draft,
        touched: [],
        attempted: false,
        last_submission: null,
    },
    [],
]

const touch = (model: Model, path: string): ReadonlyArray<string> =>
    model.touched.includes(path) ? model.touched : [...model.touched, path]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ChangedField: ({ field, value }) => [
                {
                    ...model,
                    draft: { ...model.draft, [field]: value },
                    touched: touch(model, field),
                },
                [],
            ],
            ChangedYear: ({ field, value }) => [
                {
                    ...model,
                    draft: {
                        ...model.draft,
                        availability: {
                            ...model.draft.availability,
                            [field]: value,
                        },
                    },
                    touched: touch(model, `availability.${field}`),
                },
                [],
            ],
            ChangedAddress: ({ index, field, value }) => [
                {
                    ...model,
                    draft: {
                        ...model.draft,
                        addresses: model.draft.addresses.map(
                            (address, position) =>
                                position === index
                                    ? { ...address, [field]: value }
                                    : address
                        ),
                    },
                    touched: touch(model, `addresses.${index}.${field}`),
                },
                [],
            ],
            AddedAddress: () =>
                model.draft.addresses.length >= 3
                    ? [model, []]
                    : [
                          {
                              ...model,
                              draft: {
                                  ...model.draft,
                                  addresses: [
                                      ...model.draft.addresses,
                                      { city: "", postal_code: "" },
                                  ],
                              },
                          },
                          [],
                      ],
            RemovedAddress: ({ index }) =>
                model.draft.addresses.length <= 1
                    ? [model, []]
                    : [
                          {
                              ...model,
                              draft: {
                                  ...model.draft,
                                  addresses: model.draft.addresses.filter(
                                      (_, position) => position !== index
                                  ),
                              },
                              touched: model.touched.filter(
                                  (path) => !path.startsWith("addresses.")
                              ),
                          },
                          [],
                      ],
            LoadedExample: ({ example }) => [
                {
                    draft:
                        example === "valid"
                            ? valid_draft
                            : example === "invalid"
                              ? invalid_draft
                              : empty_draft,
                    touched: [],
                    attempted: example === "invalid",
                    last_submission: null,
                },
                [],
            ],
            Submitted: () => {
                const { result } = inspect(model.draft)
                return [
                    {
                        ...model,
                        attempted: true,
                        last_submission: Result.isSuccess(result)
                            ? result.success
                            : model.last_submission,
                    },
                    [],
                ]
            },
        })
    )

const button_class =
    "rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"
const panel_class = "space-y-3 rounded-xl border border-border bg-card p-5"
const json_panel = (
    title: string,
    value: unknown,
    h: HtmlBuilder<Message>
): Html =>
    h.section(
        [h.Class(panel_class)],
        [
            h.h3([h.Class("font-semibold")], [title]),
            h.div([
                h.Class(
                    "schema-shiki max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs"
                ),
                h.InnerHTML(highlight_json(value)),
            ]),
        ]
    )

export const view = Submodel.defineView<Model, Message>((model, h) => {
    const { result, issues } = inspect(model.draft)
    const input = (
        path: string,
        label: string,
        value: string,
        on_input: (value: string) => Message,
        hint: string
    ): Html => {
        const id = `schema-${path.replaceAll(".", "-")}`
        const errors =
            model.attempted || model.touched.includes(path)
                ? issues.filter((issue) => issue.path === path)
                : []
        return h.div(
            [h.Class("space-y-1")],
            [
                h.label(
                    [h.For(id), h.Class("block text-sm font-medium")],
                    [label]
                ),
                h.input([
                    h.Id(id),
                    h.Type("text"),
                    h.Value(value),
                    h.OnInput(on_input),
                    h.Class(
                        "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-primary"
                    ),
                    h.AriaInvalid(errors.length > 0),
                    h.AriaDescribedBy(`${id}-hint ${id}-errors`),
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
                    errors.map((error) => h.p([], [error.message]))
                ),
            ]
        )
    }
    return h.div(
        [h.Class("space-y-6")],
        [
            h.p(
                [h.Class("max-w-3xl text-sm text-muted-foreground")],
                [
                    "Edit a draft and watch Schema decode it into validated data. Drafts may be incomplete. Numeric fields begin as strings; successful decoding produces numbers. Whitespace is rejected, not silently trimmed.",
                ]
            ),
            h.div(
                [h.Class("flex flex-wrap gap-2")],
                [
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(button_class),
                            h.OnClick(LoadedExample({ example: "valid" })),
                        ],
                        ["Load valid example"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(button_class),
                            h.OnClick(LoadedExample({ example: "invalid" })),
                        ],
                        ["Load invalid example"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.Class(button_class),
                            h.OnClick(LoadedExample({ example: "empty" })),
                        ],
                        ["Reset"]
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
                                ["Editable draft"]
                            ),
                            input(
                                "name",
                                "Name",
                                model.draft.name,
                                (value) =>
                                    ChangedField({ field: "name", value }),
                                "2–80 characters; no surrounding whitespace."
                            ),
                            input(
                                "email",
                                "Email",
                                model.draft.email,
                                (value) =>
                                    ChangedField({ field: "email", value }),
                                "Must match the demo email pattern."
                            ),
                            input(
                                "age",
                                "Age",
                                model.draft.age,
                                (value) =>
                                    ChangedField({ field: "age", value }),
                                "Text → integer between 18 and 120."
                            ),
                            h.fieldset(
                                [
                                    h.Class(
                                        "space-y-3 rounded-lg border border-border p-3"
                                    ),
                                ],
                                [
                                    h.legend(
                                        [h.Class("px-1 text-sm font-semibold")],
                                        ["Availability"]
                                    ),
                                    input(
                                        "availability.from",
                                        "Start year",
                                        model.draft.availability.from,
                                        (value) =>
                                            ChangedYear({
                                                field: "from",
                                                value,
                                            }),
                                        "Integer between 2020 and 2100."
                                    ),
                                    input(
                                        "availability.to",
                                        "End year",
                                        model.draft.availability.to,
                                        (value) =>
                                            ChangedYear({ field: "to", value }),
                                        "Must be on or after the start year."
                                    ),
                                ]
                            ),
                            ...model.draft.addresses.map((address, index) =>
                                h.fieldset(
                                    [
                                        h.Class(
                                            "space-y-3 rounded-lg border border-border p-3"
                                        ),
                                    ],
                                    [
                                        h.legend(
                                            [
                                                h.Class(
                                                    "px-1 text-sm font-semibold"
                                                ),
                                            ],
                                            [`Address ${index + 1}`]
                                        ),
                                        input(
                                            `addresses.${index}.city`,
                                            "City",
                                            address.city,
                                            (value) =>
                                                ChangedAddress({
                                                    index,
                                                    field: "city",
                                                    value,
                                                }),
                                            "2–80 characters."
                                        ),
                                        input(
                                            `addresses.${index}.postal_code`,
                                            "Postcode",
                                            address.postal_code,
                                            (value) =>
                                                ChangedAddress({
                                                    index,
                                                    field: "postal_code",
                                                    value,
                                                }),
                                            "UK format, e.g. LS6 1NS. Lowercase and no space also work; this does not verify the address exists."
                                        ),
                                        h.button(
                                            [
                                                h.Type("button"),
                                                h.Class(button_class),
                                                ...(model.draft.addresses
                                                    .length <= 1
                                                    ? [h.Disabled(true)]
                                                    : []),
                                                h.OnClick(
                                                    RemovedAddress({ index })
                                                ),
                                            ],
                                            ["Remove address"]
                                        ),
                                    ]
                                )
                            ),
                            h.div(
                                [h.Class("flex flex-wrap gap-2")],
                                [
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.Class(button_class),
                                            ...(model.draft.addresses.length >=
                                            3
                                                ? [h.Disabled(true)]
                                                : []),
                                            h.OnClick(AddedAddress()),
                                        ],
                                        ["Add address"]
                                    ),
                                    h.button(
                                        [
                                            h.Type("submit"),
                                            h.Class(button_class),
                                        ],
                                        ["Validate and submit"]
                                    ),
                                ]
                            ),
                            h.p(
                                [
                                    h.Role("status"),
                                    h.Class("text-sm text-muted-foreground"),
                                ],
                                [
                                    model.attempted
                                        ? Result.isSuccess(result)
                                            ? "Draft is valid. Only validated values can be submitted."
                                            : "Submission blocked. Correct the marked fields."
                                        : "Inline errors appear after editing or submitting. The inspector always shows every issue.",
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("space-y-4")],
                        [
                            json_panel("Raw input", model.draft, h),
                            Result.isSuccess(result)
                                ? json_panel(
                                      "Decoded output · valid",
                                      result.success,
                                      h
                                  )
                                : json_panel(
                                      "Validation issues · path and message",
                                      issues,
                                      h
                                  ),
                            ...(Result.isSuccess(result)
                                ? [
                                      json_panel(
                                          "Encoded again · numbers return to strings",
                                          S.encodeSync(Submission)(
                                              result.success
                                          ),
                                          h
                                      ),
                                  ]
                                : []),
                            json_panel(
                                "Last accepted submission · local only",
                                model.last_submission,
                                h
                            ),
                            h.p(
                                [h.Class("text-xs text-muted-foreground")],
                                [
                                    "Cross-field checks run once their nested fields decode successfully. No data is sent to a server.",
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
})
