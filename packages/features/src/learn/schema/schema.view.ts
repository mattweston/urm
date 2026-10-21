import * as Ui from "@foldkit/ui"
import { Result } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as SchemaDemo from "./schema.ts"

type ToParentMessage<ParentMessage> = (
    message: SchemaDemo.Message
) => ParentMessage

const PANEL_CLASS =
    "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card"

const panel = <ParentMessage>(
    label: string,
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [h.Class(PANEL_CLASS)],
        [
            h.header(
                [
                    h.Class(
                        "border-b-(length:--surface-border-width) border-border px-5 py-3"
                    ),
                ],
                [
                    h.h3(
                        [
                            h.Class(
                                "text-xs font-semibold tracking-widest uppercase"
                            ),
                        ],
                        [label]
                    ),
                ]
            ),
            ...children,
        ]
    )

const action = <ParentMessage>(
    label: string,
    message: SchemaDemo.Message,
    to_parent_message: ToParentMessage<ParentMessage>,
    is_disabled: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Ui.Button.view(
        {
            onClick: to_parent_message(message),
            isDisabled: is_disabled,
            toView: (attributes) =>
                h.button(
                    [
                        ...attributes.button,
                        h.Class(
                            "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border px-3 py-2 text-xs font-semibold tracking-wide transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-40"
                        ),
                    ],
                    [label]
                ),
        },
        h
    )

const stage_tabs = <ParentMessage>(
    model: SchemaDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "grid grid-cols-2 gap-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-2 md:grid-cols-4"
            ),
            h.AriaLabel("Effect Schema examples"),
        ],
        SchemaDemo.stages.map((stage) =>
            Ui.Button.view(
                {
                    onClick: to_parent_message(
                        SchemaDemo.SelectedSchemaStage({
                            stage,
                        })
                    ),
                    isDisabled: stage === model.stage,
                    toView: (attributes) =>
                        h.button(
                            [
                                ...attributes.button,
                                h.Class(
                                    stage === model.stage
                                        ? "rounded-[var(--radius-surface)] bg-foreground px-3 py-2 text-xs font-semibold tracking-wider text-background uppercase"
                                        : "rounded-[var(--radius-surface)] px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground"
                                ),
                            ],
                            [stage]
                        ),
                },
                h
            )
        )
    )

const controls = <ParentMessage>(
    children: ReadonlyArray<Html>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "flex flex-wrap gap-2 border-t-(length:--surface-border-width) border-border p-4"
            ),
        ],
        children
    )

const field_card = <ParentMessage>(
    name: string,
    schema: string,
    encoded: string,
    decoded: string,
    optional: boolean,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
            ),
        ],
        [
            h.div(
                [h.Class("flex items-start justify-between gap-3")],
                [
                    h.div([h.Class("font-mono text-sm font-semibold")], [name]),
                    optional
                        ? h.span(
                              [
                                  h.Class(
                                      "rounded-full border border-warning/30 bg-warning/5 px-2 py-1 font-mono text-[9px] text-warning"
                                  ),
                              ],
                              ["optionalKey"]
                          )
                        : h.empty,
                ]
            ),
            h.div([h.Class("mt-3 font-mono text-xs text-chart-1")], [schema]),
            h.div(
                [h.Class("mt-4 grid grid-cols-2 gap-2")],
                [
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] bg-warning/5 p-2"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-[9px] font-semibold tracking-wider text-muted-foreground uppercase"
                                    ),
                                ],
                                ["encoded"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-1 font-mono text-[10px] text-warning"
                                    ),
                                ],
                                [encoded]
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] bg-success/5 p-2"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "text-[9px] font-semibold tracking-wider text-muted-foreground uppercase"
                                    ),
                                ],
                                ["type"]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "mt-1 font-mono text-[10px] text-success"
                                    ),
                                ],
                                [decoded]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

const shape_view = <ParentMessage>(
    model: SchemaDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "1 · define the wire + domain shape",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3"
                            ),
                        ],
                        [
                            field_card(
                                "id",
                                "Schema.String",
                                "string",
                                "string",
                                false,
                                h
                            ),
                            field_card(
                                "name",
                                "Schema.Trim",
                                "string",
                                "string",
                                false,
                                h
                            ),
                            field_card(
                                "age",
                                "Schema.FiniteFromString",
                                "string",
                                "number",
                                false,
                                h
                            ),
                            field_card(
                                "role",
                                'Schema.Literals(["admin","member"])',
                                '"admin" | "member"',
                                '"admin" | "member"',
                                false,
                                h
                            ),
                            field_card(
                                "email",
                                "Schema.optionalKey(Schema.String)",
                                "string?",
                                "string?",
                                true,
                                h
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                model.shape_show_type
                                    ? "Show encoded type"
                                    : "Show decoded type",
                                SchemaDemo.ToggledSchemaType(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                model.shape_show_type
                    ? "Decoded TypeScript type"
                    : "Encoded wire type",
                [
                    h.pre(
                        [
                            h.Class(
                                "overflow-auto bg-background p-5 font-mono text-xs leading-6"
                            ),
                        ],
                        [
                            model.shape_show_type
                                ? `type User = {
  readonly id: string
  readonly name: string
  readonly age: number
  readonly role: "admin" | "member"
  readonly email?: string
}`
                                : `type UserEncoded = {
  readonly id: string
  readonly name: string
  readonly age: string
  readonly role: "admin" | "member"
  readonly email?: string
}`,
                        ]
                    ),
                ],
                h
            ),
        ]
    )

const decode_choice = <ParentMessage>(
    decode_case: SchemaDemo.DecodeCase,
    model: SchemaDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        decode_case,
        SchemaDemo.SelectedSchemaDecodeCase({
            decode_case,
        }),
        to_parent_message,
        model.decode_case === decode_case,
        h
    )

const json_block = <ParentMessage>(
    value: unknown,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.pre(
        [
            h.Class(
                "overflow-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4 font-mono text-xs leading-6"
            ),
        ],
        [JSON.stringify(value, null, 2)]
    )

const decode_view = <ParentMessage>(
    model: SchemaDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const input = SchemaDemo.decode_input(model.decode_case)
    const result = SchemaDemo.decode_result(model.decode_case)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "2 · unknown input → typed Result",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            decode_choice("Valid", model, to_parent_message, h),
                            decode_choice(
                                "BadAge",
                                model,
                                to_parent_message,
                                h
                            ),
                            decode_choice(
                                "BadRole",
                                model,
                                to_parent_message,
                                h
                            ),
                            decode_choice(
                                "MissingName",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-start"
                            ),
                        ],
                        [
                            h.div(
                                [],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["unknown"]
                                    ),
                                    json_block(input, h),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-chart-1"
                                    ),
                                ],
                                ["decodeUnknownResult →"]
                            ),
                            h.div(
                                [],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Result"]
                                    ),
                                    Result.isSuccess(result)
                                        ? h.div(
                                              [
                                                  h.Class(
                                                      "rounded-[var(--radius-surface)] border border-success/40 bg-success/5 p-4"
                                                  ),
                                              ],
                                              [
                                                  h.div(
                                                      [
                                                          h.Class(
                                                              "font-mono text-xs font-semibold text-success"
                                                          ),
                                                      ],
                                                      ["Success<User>"]
                                                  ),
                                                  h.pre(
                                                      [
                                                          h.Class(
                                                              "mt-3 overflow-auto font-mono text-xs leading-6"
                                                          ),
                                                      ],
                                                      [
                                                          JSON.stringify(
                                                              result.success,
                                                              null,
                                                              2
                                                          ),
                                                      ]
                                                  ),
                                              ]
                                          )
                                        : h.div(
                                              [
                                                  h.Class(
                                                      "rounded-[var(--radius-surface)] border border-destructive/40 bg-destructive/5 p-4"
                                                  ),
                                              ],
                                              [
                                                  h.div(
                                                      [
                                                          h.Class(
                                                              "font-mono text-xs font-semibold text-destructive"
                                                          ),
                                                      ],
                                                      ["Failure<SchemaError>"]
                                                  ),
                                                  h.div(
                                                      [
                                                          h.Class(
                                                              "mt-3 max-h-44 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-5 text-muted-foreground"
                                                          ),
                                                      ],
                                                      [
                                                          SchemaDemo.schema_error_summary(
                                                              result
                                                          ),
                                                      ]
                                                  ),
                                              ]
                                          ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
            panel(
                "Decoder choice",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "decodeUnknownResult is useful at untrusted boundaries: the input is unknown and schema mismatches become Failure<SchemaError>. Effect 4 also exposes Option, Exit, Effect, Promise, and throwing/sync decoder adapters for different boundaries.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const number_codec_choice = <ParentMessage>(
    number_codec: SchemaDemo.NumberCodec,
    model: SchemaDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    action(
        number_codec,
        SchemaDemo.SelectedNumberCodec({
            number_codec,
        }),
        to_parent_message,
        model.number_codec === number_codec,
        h
    )

const transform_view = <ParentMessage>(
    model: SchemaDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const result = SchemaDemo.number_codec_result(model)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "3 · decode can transform representation",
                [
                    h.div(
                        [h.Class("flex flex-wrap gap-2 p-4")],
                        [
                            number_codec_choice(
                                "NumberFromString",
                                model,
                                to_parent_message,
                                h
                            ),
                            number_codec_choice(
                                "FiniteFromString",
                                model,
                                to_parent_message,
                                h
                            ),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 border-t-(length:--surface-border-width) border-border p-5 md:grid-cols-[1fr_auto_1fr] md:items-center"
                            ),
                        ],
                        [
                            h.label(
                                [h.Class("block space-y-2")],
                                [
                                    h.span(
                                        [
                                            h.Class(
                                                "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["Encoded string"]
                                    ),
                                    h.input([
                                        h.Class(
                                            "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2 font-mono outline-none"
                                        ),
                                        h.Value(model.transform_input),
                                        h.OnInput((value) =>
                                            to_parent_message(
                                                SchemaDemo.UpdatedSchemaTransformInput(
                                                    { value }
                                                )
                                            )
                                        ),
                                    ]),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-chart-1"
                                    ),
                                ],
                                [`Schema.${model.number_codec} →`]
                            ),
                            Result.isSuccess(result)
                                ? h.div(
                                      [
                                          h.Class(
                                              "rounded-[var(--radius-surface)] border border-success/40 bg-success/5 p-4"
                                          ),
                                      ],
                                      [
                                          h.div(
                                              [
                                                  h.Class(
                                                      "text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                                  ),
                                              ],
                                              ["Decoded number"]
                                          ),
                                          h.div(
                                              [
                                                  h.Class(
                                                      "mt-2 font-mono text-2xl font-bold text-success"
                                                  ),
                                              ],
                                              [String(result.success)]
                                          ),
                                      ]
                                  )
                                : h.div(
                                      [
                                          h.Class(
                                              "rounded-[var(--radius-surface)] border border-destructive/40 bg-destructive/5 p-4"
                                          ),
                                      ],
                                      [
                                          h.div(
                                              [
                                                  h.Class(
                                                      "text-[10px] font-semibold tracking-wider text-destructive uppercase"
                                                  ),
                                              ],
                                              ["SchemaError"]
                                          ),
                                          h.div(
                                              [
                                                  h.Class(
                                                      "mt-2 whitespace-pre-wrap font-mono text-[10px] text-muted-foreground"
                                                  ),
                                              ],
                                              [String(result.failure)]
                                          ),
                                      ]
                                  ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                '"36"',
                                SchemaDemo.UpdatedSchemaTransformInput({
                                    value: "36",
                                }),
                                to_parent_message,
                                model.transform_input === "36",
                                h
                            ),
                            action(
                                '"3.14"',
                                SchemaDemo.UpdatedSchemaTransformInput({
                                    value: "3.14",
                                }),
                                to_parent_message,
                                model.transform_input === "3.14",
                                h
                            ),
                            action(
                                '"not-a-number"',
                                SchemaDemo.UpdatedSchemaTransformInput({
                                    value: "not-a-number",
                                }),
                                to_parent_message,
                                model.transform_input === "not-a-number",
                                h
                            ),
                            action(
                                '"Infinity"',
                                SchemaDemo.UpdatedSchemaTransformInput({
                                    value: "Infinity",
                                }),
                                to_parent_message,
                                model.transform_input === "Infinity",
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Validation vs transformation",
                [
                    h.p(
                        [
                            h.Class(
                                "px-5 py-4 text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            model.number_codec === "NumberFromString"
                                ? "NumberFromString uses JavaScript number coercion, so non-finite outputs such as NaN and Infinity are still numbers. Use FiniteFromString when the decoded domain must exclude them."
                                : "FiniteFromString decodes the same string representation to a number but rejects NaN, Infinity, and -Infinity. The encoded side remains string.",
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

const encode_view = <ParentMessage>(
    model: SchemaDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const domain = SchemaDemo.encode_domain_value(model.encode_has_email)
    const encoded = SchemaDemo.encode_result(model.encode_has_email)

    return h.div(
        [h.Class("space-y-5")],
        [
            panel(
                "4 · typed domain → encoded wire value",
                [
                    h.div(
                        [
                            h.Class(
                                "grid gap-4 p-5 md:grid-cols-[1fr_auto_1fr] md:items-start"
                            ),
                        ],
                        [
                            h.div(
                                [],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["User"]
                                    ),
                                    json_block(domain, h),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "self-center text-center font-mono text-xs text-chart-1"
                                    ),
                                ],
                                ["Schema.encodeResult →"]
                            ),
                            h.div(
                                [],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase"
                                            ),
                                        ],
                                        ["UserEncoded"]
                                    ),
                                    Result.isSuccess(encoded)
                                        ? json_block(encoded.success, h)
                                        : h.div(
                                              [
                                                  h.Class(
                                                      "rounded-[var(--radius-surface)] border border-destructive/40 bg-destructive/5 p-4 font-mono text-xs text-destructive"
                                                  ),
                                              ],
                                              [String(encoded.failure)]
                                          ),
                                ]
                            ),
                        ]
                    ),
                    controls(
                        [
                            action(
                                model.encode_has_email
                                    ? "Remove email"
                                    : "Add email",
                                SchemaDemo.ToggledSchemaEncodeEmail(),
                                to_parent_message,
                                false,
                                h
                            ),
                        ],
                        h
                    ),
                ],
                h
            ),
            panel(
                "Codec direction",
                [
                    h.div(
                        [
                            h.Class(
                                "grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0"
                            ),
                        ],
                        [
                            h.div(
                                [h.Class("p-4")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold text-chart-2"
                                            ),
                                        ],
                                        ["decode"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-xs leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            'age: "36" → age: 36; name whitespace is trimmed.',
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [h.Class("p-4")],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "font-mono text-xs font-semibold text-chart-1"
                                            ),
                                        ],
                                        ["encode"]
                                    ),
                                    h.p(
                                        [
                                            h.Class(
                                                "mt-2 text-xs leading-5 text-muted-foreground"
                                            ),
                                        ],
                                        [
                                            'age: 36 → age: "36"; optional email stays omitted when absent.',
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
                h
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: SchemaDemo.Model,
    to_parent_message: ToParentMessage<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-5")],
        [
            stage_tabs(model, to_parent_message, h),
            model.stage === "Shape"
                ? shape_view(model, to_parent_message, h)
                : model.stage === "Decode"
                  ? decode_view(model, to_parent_message, h)
                  : model.stage === "Transform"
                    ? transform_view(model, to_parent_message, h)
                    : encode_view(model, to_parent_message, h),
        ]
    )
