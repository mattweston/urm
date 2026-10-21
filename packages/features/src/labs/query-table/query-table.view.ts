/** # Query Table view */
import { Array as Arr, Match as M, Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Cell, TableName } from "./query-table.data.ts"
import {
    distinct_values,
    kind_of,
    qualified_columns,
    table_names,
    tables,
} from "./query-table.data.ts"
import type { ResultRow, Stage } from "./query-table.engine.ts"
import { execute } from "./query-table.engine.ts"
import { lessons } from "./query-table.lesson.ts"
import type { Message } from "./query-table.message.ts"
import {
    AddedAggregate,
    AddedCondition,
    ChangedAggregateColumn,
    ChangedAggregateFunction,
    ChangedConditionColumn,
    ChangedConditionOperator,
    ChangedConditionValue,
    ChangedHavingColumn,
    ChangedHavingFunction,
    ChangedHavingOperator,
    ChangedHavingValue,
    ChangedLimit,
    ChangedOffset,
    ClearedLesson,
    RemovedAggregate,
    RemovedCondition,
    ResetQuery,
    SelectedCombinator,
    SelectedFromTable,
    SelectedJoinKind,
    SelectedJoinLeftColumn,
    SelectedJoinRightColumn,
    SelectedJoinTable,
    SelectedLesson,
    SelectedOrderByColumn,
    SelectedOrderByDirection,
    ToggledAllColumns,
    ToggledColumn,
    ToggledDistinct,
    ToggledGroupByColumn,
    ToggledHaving,
    ToggledPipeline,
    ToggledSchema,
} from "./query-table.message.ts"
import type { Model } from "./query-table.model.ts"
import type {
    AggregateFunction,
    Combinator,
    Operator,
    Query,
} from "./query-table.query.ts"
import {
    AggregateFunction as AggregateFunctionSchema,
    COUNT_STAR,
    Operator as OperatorSchema,
    aggregate_label,
    operator_takes_value,
} from "./query-table.query.ts"
import { render } from "./query-table.sql.ts"

type Send<ParentMessage> = (message: Message) => ParentMessage

type SelectOption = Readonly<{
    value: string
    label: string
}>

const card_class =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"

const control_class =
    "w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"

const select_class = `${control_class} cursor-pointer appearance-none`

const keyword_badge_class =
    "inline-flex items-center rounded-[var(--radius-control)] bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-primary [box-shadow:var(--shadow-control)]"

const step_class =
    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"

const ghost_button_class =
    "rounded-[var(--radius-control)] border-(length:--surface-border-width) border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground [box-shadow:var(--shadow-control)]"

const primary_button_class =
    "rounded-[var(--radius-control)] bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition hover:opacity-90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"

const checkbox_label_class =
    "flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-1.5 py-1 text-xs text-foreground transition hover:bg-accent border-(length:--control-border-width) border-border [box-shadow:var(--shadow-control)]"

const AGGREGATE_FUNCTIONS: ReadonlyArray<AggregateFunction> =
    AggregateFunctionSchema.literals

const OPERATORS: ReadonlyArray<Operator> = OperatorSchema.literals

const COMBINATORS: ReadonlyArray<Combinator> = ["AND", "OR"]

const short_column = (column: string): string => {
    const dot = column.indexOf(".")

    return dot === -1 ? column : column.slice(dot + 1)
}

const format_cell = (cell: Cell): string =>
    cell === null ? "NULL" : String(cell)

const select_control = <ParentMessage>(
    h: HtmlBuilder<ParentMessage>,
    props: Readonly<{
        label: string
        value: string
        options: ReadonlyArray<SelectOption>
        on_select: (value: string) => ParentMessage
        class?: string
    }>
): Html =>
    h.select(
        [
            h.Class(props.class ?? select_class),
            h.Value(props.value),
            h.AriaLabel(props.label),
            h.OnInput(props.on_select),
        ],
        Arr.map(props.options, (option) =>
            h.option(
                [h.Key(option.value), h.Value(option.value)],
                [option.label]
            )
        )
    )

const checkbox_control = <ParentMessage>(
    h: HtmlBuilder<ParentMessage>,
    props: Readonly<{
        label: string
        title: string
        checked: boolean
        on_toggle: ParentMessage
    }>
): Html =>
    h.label(
        [h.Class(checkbox_label_class), h.Title(props.title)],
        [
            h.input([
                h.Type("checkbox"),
                h.Class("h-3.5 w-3.5 accent-primary"),
                h.Checked(props.checked),
                h.OnClick(props.on_toggle),
            ]),
            h.span([h.Class("truncate")], [props.label]),
        ]
    )

const clause_card = <ParentMessage>(
    h: HtmlBuilder<ParentMessage>,
    props: Readonly<{
        step: number
        keyword: string
        hint: string
        active: boolean
        children: ReadonlyArray<Html>
    }>
): Html =>
    h.section(
        [
            h.Class(
                `${card_class} space-y-2.5 p-3 transition ${props.active ? "" : "opacity-70"}`
            ),
        ],
        [
            h.div(
                [h.Class("flex items-center gap-2")],
                [
                    h.span([h.Class(step_class)], [String(props.step)]),
                    h.span([h.Class(keyword_badge_class)], [props.keyword]),
                ]
            ),
            h.p(
                [h.Class("text-[11px] leading-4 text-muted-foreground")],
                [props.hint]
            ),
            ...props.children,
        ]
    )

const field_row = <ParentMessage>(
    h: HtmlBuilder<ParentMessage>,
    label: string,
    control: Html
): Html =>
    h.div(
        [h.Class("space-y-1")],
        [
            h.span(
                [
                    h.Class(
                        "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                    ),
                ],
                [label]
            ),
            control,
        ]
    )

const column_options = (
    columns: ReadonlyArray<string>
): ReadonlyArray<SelectOption> =>
    Arr.map(columns, (column) => ({ value: column, label: column }))

const columns_in_scope = (query: Query): ReadonlyArray<string> => [
    ...qualified_columns(query.from_table),
    ...M.value(query.join).pipe(
        M.withReturnType<ReadonlyArray<string>>(),
        M.tagsExhaustive({
            NoJoin: () => [],
            JoinOn: ({ table }) => qualified_columns(table),
        })
    ),
]

const lesson_strip = <ParentMessage>(
    model: Model,
    send: Send<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("space-y-3")],
        [
            h.div(
                [h.Class("flex flex-wrap gap-1.5")],
                Arr.map(lessons, (lesson) => {
                    const active = Option.contains(
                        model.active_lesson,
                        lesson.id
                    )

                    return h.button(
                        [
                            h.Key(lesson.id),
                            h.Class(
                                `rounded-full border px-3 py-1 text-xs font-medium transition ${
                                    active
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                }`
                            ),
                            h.Title(lesson.title),
                            h.OnClick(send(SelectedLesson({ id: lesson.id }))),
                        ],
                        [lesson.keyword]
                    )
                })
            ),
            Option.match(model.active_lesson, {
                onNone: () =>
                    h.p(
                        [h.Class("text-xs text-muted-foreground")],
                        [
                            "Pick a keyword above to load a worked example, or build a query from scratch with the controls.",
                        ]
                    ),
                onSome: (id) =>
                    Option.match(
                        Arr.findFirst(lessons, (lesson) => lesson.id === id),
                        {
                            onNone: () => h.div([], []),
                            onSome: (lesson) =>
                                h.div(
                                    [
                                        h.Class(
                                            `${card_class} space-y-2 border-primary/40 bg-primary/5 p-4`
                                        ),
                                    ],
                                    [
                                        h.div(
                                            [
                                                h.Class(
                                                    "flex items-start justify-between gap-3"
                                                ),
                                            ],
                                            [
                                                h.h2(
                                                    [
                                                        h.Class(
                                                            "text-sm font-semibold text-foreground"
                                                        ),
                                                    ],
                                                    [lesson.title]
                                                ),
                                                h.button(
                                                    [
                                                        h.Class(
                                                            ghost_button_class
                                                        ),
                                                        h.OnClick(
                                                            send(
                                                                ClearedLesson()
                                                            )
                                                        ),
                                                    ],
                                                    ["Dismiss"]
                                                ),
                                            ]
                                        ),
                                        h.p(
                                            [
                                                h.Class(
                                                    "text-sm leading-6 text-foreground"
                                                ),
                                            ],
                                            [lesson.brief]
                                        ),
                                        h.p(
                                            [
                                                h.Class(
                                                    "text-sm leading-6 text-muted-foreground"
                                                ),
                                            ],
                                            [`Try this: ${lesson.takeaway}`]
                                        ),
                                    ]
                                ),
                        }
                    ),
            }),
        ]
    )

const sql_panel = <ParentMessage>(
    model: Model,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [
            h.Class(
                `${card_class} overflow-x-auto bg-muted/30 p-4 font-mono text-sm leading-6`
            ),
        ],
        Arr.map(render(model.query), (line) =>
            h.div(
                [
                    h.Key(line.clause),
                    h.Class("flex flex-wrap gap-x-2 whitespace-pre-wrap"),
                ],
                [
                    h.span(
                        [h.Class("font-semibold text-primary")],
                        [line.keyword]
                    ),
                    h.span([h.Class("text-foreground")], [line.body]),
                ]
            )
        )
    )

const schema_panel = <ParentMessage>(
    model: Model,
    send: Send<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class(`${card_class} p-3`)],
        [
            h.button(
                [
                    h.Class(
                        "flex w-full items-center justify-between text-xs font-semibold text-foreground"
                    ),
                    h.OnClick(send(ToggledSchema())),
                ],
                [
                    "Schema",
                    h.span(
                        [h.Class("text-muted-foreground")],
                        [model.schema_open ? "Hide" : "Show"]
                    ),
                ]
            ),
            ...(model.schema_open
                ? [
                      h.div(
                          [h.Class("mt-3 space-y-3")],
                          Arr.map(table_names, (name) =>
                              h.div(
                                  [h.Key(name), h.Class("space-y-1")],
                                  [
                                      h.div(
                                          [
                                              h.Class(
                                                  "flex items-baseline gap-2"
                                              ),
                                          ],
                                          [
                                              h.span(
                                                  [
                                                      h.Class(
                                                          "font-mono text-xs font-semibold text-foreground"
                                                      ),
                                                  ],
                                                  [name]
                                              ),
                                              h.span(
                                                  [
                                                      h.Class(
                                                          "text-[11px] text-muted-foreground"
                                                      ),
                                                  ],
                                                  [
                                                      `${tables[name].rows.length} rows`,
                                                  ]
                                              ),
                                          ]
                                      ),
                                      h.p(
                                          [
                                              h.Class(
                                                  "text-[11px] leading-4 text-muted-foreground"
                                              ),
                                          ],
                                          [tables[name].note]
                                      ),
                                      h.div(
                                          [h.Class("flex flex-wrap gap-1")],
                                          Arr.map(
                                              tables[name].columns,
                                              (column) =>
                                                  h.span(
                                                      [
                                                          h.Key(
                                                              `${name}.${column.name}`
                                                          ),
                                                          h.Class(
                                                              "rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                                                          ),
                                                          h.Title(column.kind),
                                                      ],
                                                      [column.name]
                                                  )
                                          )
                                      ),
                                  ]
                              )
                          )
                      ),
                  ]
                : []),
        ]
    )

const from_card = <ParentMessage>(
    model: Model,
    send: Send<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    clause_card(h, {
        step: 1,
        keyword: "FROM",
        hint: "The starting row set. Everything below narrows or reshapes it.",
        active: true,
        children: [
            select_control(h, {
                label: "Source table",
                value: model.query.from_table,
                options: Arr.map(table_names, (name) => ({
                    value: name,
                    label: `${name} (${tables[name].rows.length} rows)`,
                })),
                on_select: (value) =>
                    Option.match(
                        Arr.findFirst(table_names, (name) => name === value),
                        {
                            onNone: () =>
                                send(
                                    SelectedFromTable({
                                        table: model.query.from_table,
                                    })
                                ),
                            onSome: (table: TableName) =>
                                send(SelectedFromTable({ table })),
                        }
                    ),
            }),
        ],
    })

const join_card = <ParentMessage>(
    model: Model,
    send: Send<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const join = model.query.join
    const joined = join._tag === "JoinOn"

    const kind_options: ReadonlyArray<SelectOption> = [
        { value: "", label: "No join" },
        { value: "INNER", label: "INNER JOIN — matches only" },
        { value: "LEFT", label: "LEFT JOIN — keep every left row" },
        { value: "RIGHT", label: "RIGHT JOIN — keep every right row" },
        { value: "FULL", label: "FULL JOIN — keep both sides" },
    ]

    const join_fields = M.value(join).pipe(
        M.withReturnType<ReadonlyArray<Html>>(),
        M.tagsExhaustive({
            NoJoin: () => [],
            JoinOn: (clause) => [
                field_row(
                    h,
                    "Join table",
                    select_control(h, {
                        label: "Join table",
                        value: clause.table,
                        options: Arr.map(
                            Arr.filter(
                                table_names,
                                (name) => name !== model.query.from_table
                            ),
                            (name) => ({ value: name, label: name })
                        ),
                        on_select: (value) =>
                            Option.match(
                                Arr.findFirst(
                                    table_names,
                                    (name) => name === value
                                ),
                                {
                                    onNone: () =>
                                        send(
                                            SelectedJoinTable({
                                                table: clause.table,
                                            })
                                        ),
                                    onSome: (table: TableName) =>
                                        send(SelectedJoinTable({ table })),
                                }
                            ),
                    })
                ),
                h.div(
                    [
                        h.Class(
                            "grid grid-cols-[1fr_auto_1fr] items-end gap-1.5"
                        ),
                    ],
                    [
                        field_row(
                            h,
                            "ON",
                            select_control(h, {
                                label: "Left join column",
                                value: clause.left_column,
                                options: column_options(
                                    qualified_columns(model.query.from_table)
                                ),
                                on_select: (column) =>
                                    send(SelectedJoinLeftColumn({ column })),
                            })
                        ),
                        h.span(
                            [
                                h.Class(
                                    "pb-2 font-mono text-sm text-muted-foreground"
                                ),
                            ],
                            ["="]
                        ),
                        field_row(
                            h,
                            " ",
                            select_control(h, {
                                label: "Right join column",
                                value: clause.right_column,
                                options: column_options(
                                    qualified_columns(clause.table)
                                ),
                                on_select: (column) =>
                                    send(SelectedJoinRightColumn({ column })),
                            })
                        ),
                    ]
                ),
            ],
        })
    )

    return clause_card(h, {
        step: 2,
        keyword: "JOIN",
        hint: "Pairs each row with matching rows of a second table. The kind decides what happens to rows with no partner.",
        active: joined,
        children: [
            select_control(h, {
                label: "Join kind",
                value: joined ? join.kind : "",
                options: kind_options,
                on_select: (kind) => send(SelectedJoinKind({ kind })),
            }),
            ...join_fields,
        ],
    })
}

const condition_value_control = <ParentMessage>(
    h: HtmlBuilder<ParentMessage>,
    props: Readonly<{
        column: string
        operator: Operator
        value: string
        on_change: (value: string) => ParentMessage
    }>
): Html => {
    if (!operator_takes_value(props.operator)) {
        return h.div(
            [
                h.Class(
                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground"
                ),
            ],
            ["no value needed"]
        )
    }

    const suggestions = distinct_values(props.column)
    const exact = props.operator === "=" || props.operator === "<>"

    if (exact && suggestions.length > 0 && suggestions.length <= 12) {
        return select_control(h, {
            label: "Value",
            value: props.value,
            options: [
                { value: "", label: "choose a value" },
                ...Arr.map(suggestions, (value) => ({ value, label: value })),
            ],
            on_select: props.on_change,
        })
    }

    return h.input([
        h.Type("text"),
        h.Class(control_class),
        h.Value(props.value),
        h.AriaLabel("Value"),
        h.Placeholder(
            props.operator === "IN"
                ? "a, b, c"
                : kind_of(props.column) === "number"
                  ? "0"
                  : "value"
        ),
        h.OnInput(props.on_change),
    ])
}

const where_card = <ParentMessage>(
    model: Model,
    send: Send<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const scope = columns_in_scope(model.query)

    return clause_card(h, {
        step: 3,
        keyword: "WHERE",
        hint: "Tested once per row, before any grouping. Aggregates are not allowed here — that is what HAVING is for.",
        active: model.query.conditions.length > 0,
        children: [
            ...(model.query.conditions.length > 1
                ? [
                      h.div(
                          [h.Class("flex gap-1")],
                          Arr.map(COMBINATORS, (combinator) =>
                              h.button(
                                  [
                                      h.Key(combinator),
                                      h.Class(
                                          `flex-1 rounded-lg border px-2 py-1 font-mono text-xs transition ${
                                              model.query.combinator ===
                                              combinator
                                                  ? "border-primary bg-primary/10 text-primary"
                                                  : "border-border text-muted-foreground hover:bg-accent"
                                          }`
                                      ),
                                      h.OnClick(
                                          send(
                                              SelectedCombinator({
                                                  combinator,
                                              })
                                          )
                                      ),
                                  ],
                                  [combinator]
                              )
                          )
                      ),
                  ]
                : []),
            ...Arr.map(model.query.conditions, (condition) =>
                h.div(
                    [
                        h.Key(condition.id),
                        h.Class(
                            "space-y-1.5 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background/60 p-2"
                        ),
                    ],
                    [
                        select_control(h, {
                            label: "Condition column",
                            value: condition.column,
                            options: column_options(scope),
                            on_select: (column) =>
                                send(
                                    ChangedConditionColumn({
                                        id: condition.id,
                                        column,
                                    })
                                ),
                        }),
                        h.div(
                            [h.Class("grid grid-cols-[7rem_1fr] gap-1.5")],
                            [
                                select_control(h, {
                                    label: "Operator",
                                    value: condition.operator,
                                    options: Arr.map(OPERATORS, (operator) => ({
                                        value: operator,
                                        label: operator,
                                    })),
                                    on_select: (value) =>
                                        Option.match(
                                            Arr.findFirst(
                                                OPERATORS,
                                                (operator) => operator === value
                                            ),
                                            {
                                                onNone: () =>
                                                    send(
                                                        ChangedConditionOperator(
                                                            {
                                                                id: condition.id,
                                                                operator:
                                                                    condition.operator,
                                                            }
                                                        )
                                                    ),
                                                onSome: (operator) =>
                                                    send(
                                                        ChangedConditionOperator(
                                                            {
                                                                id: condition.id,
                                                                operator,
                                                            }
                                                        )
                                                    ),
                                            }
                                        ),
                                }),
                                condition_value_control(h, {
                                    column: condition.column,
                                    operator: condition.operator,
                                    value: condition.value,
                                    on_change: (value) =>
                                        send(
                                            ChangedConditionValue({
                                                id: condition.id,
                                                value,
                                            })
                                        ),
                                }),
                            ]
                        ),
                        h.div(
                            [h.Class("flex justify-end")],
                            [
                                h.button(
                                    [
                                        h.Class(ghost_button_class),
                                        h.OnClick(
                                            send(
                                                RemovedCondition({
                                                    id: condition.id,
                                                })
                                            )
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
                    h.Class(primary_button_class),
                    h.OnClick(send(AddedCondition())),
                ],
                ["Add condition"]
            ),
        ],
    })
}

const group_card = <ParentMessage>(
    model: Model,
    send: Send<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const scope = columns_in_scope(model.query)
    const grouping =
        model.query.group_by.length > 0 || model.query.aggregates.length > 0

    return clause_card(h, {
        step: 4,
        keyword: "GROUP BY",
        hint: "Collapses rows that share a value into one row per group. Add an aggregate to summarise what fell into each group.",
        active: grouping,
        children: [
            h.div(
                [
                    h.Class(
                        "max-h-40 space-y-0.5 overflow-y-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-1 bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                Arr.map(scope, (column) =>
                    h.div(
                        [h.Key(column)],
                        [
                            checkbox_control(h, {
                                label: column,
                                title: column,
                                checked: Arr.contains(
                                    model.query.group_by,
                                    column
                                ),
                                on_toggle: send(
                                    ToggledGroupByColumn({ column })
                                ),
                            }),
                        ]
                    )
                )
            ),
            h.div(
                [h.Class("space-y-1.5")],
                Arr.map(model.query.aggregates, (aggregate) =>
                    h.div(
                        [
                            h.Key(aggregate.id),
                            h.Class(
                                "grid grid-cols-[5.5rem_1fr_auto] items-center gap-1.5"
                            ),
                        ],
                        [
                            select_control(h, {
                                label: "Aggregate function",
                                value: aggregate.fn,
                                options: Arr.map(AGGREGATE_FUNCTIONS, (fn) => ({
                                    value: fn,
                                    label: fn,
                                })),
                                on_select: (value) =>
                                    Option.match(
                                        Arr.findFirst(
                                            AGGREGATE_FUNCTIONS,
                                            (fn) => fn === value
                                        ),
                                        {
                                            onNone: () =>
                                                send(
                                                    ChangedAggregateFunction({
                                                        id: aggregate.id,
                                                        fn: aggregate.fn,
                                                    })
                                                ),
                                            onSome: (fn) =>
                                                send(
                                                    ChangedAggregateFunction({
                                                        id: aggregate.id,
                                                        fn,
                                                    })
                                                ),
                                        }
                                    ),
                            }),
                            select_control(h, {
                                label: "Aggregate column",
                                value: aggregate.column,
                                options: [
                                    ...(aggregate.fn === "COUNT"
                                        ? [
                                              {
                                                  value: COUNT_STAR,
                                                  label: "* (every row)",
                                              },
                                          ]
                                        : []),
                                    ...column_options(scope),
                                ],
                                on_select: (column) =>
                                    send(
                                        ChangedAggregateColumn({
                                            id: aggregate.id,
                                            column,
                                        })
                                    ),
                            }),
                            h.button(
                                [
                                    h.Class(ghost_button_class),
                                    h.AriaLabel("Remove aggregate"),
                                    h.OnClick(
                                        send(
                                            RemovedAggregate({
                                                id: aggregate.id,
                                            })
                                        )
                                    ),
                                ],
                                ["×"]
                            ),
                        ]
                    )
                )
            ),
            h.button(
                [
                    h.Class(primary_button_class),
                    h.OnClick(send(AddedAggregate())),
                ],
                ["Add aggregate"]
            ),
        ],
    })
}

const having_card = <ParentMessage>(
    model: Model,
    send: Send<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const scope = columns_in_scope(model.query)

    return clause_card(h, {
        step: 5,
        keyword: "HAVING",
        hint: "The same test as WHERE, but run against each group after GROUP BY. This is the only place an aggregate may be compared.",
        active: Option.isSome(model.query.having),
        children: [
            h.div(
                [],
                [
                    checkbox_control(h, {
                        label: "Filter groups by an aggregate",
                        title: "Toggle HAVING",
                        checked: Option.isSome(model.query.having),
                        on_toggle: send(ToggledHaving()),
                    }),
                ]
            ),
            ...Option.match(model.query.having, {
                onNone: (): ReadonlyArray<Html> => [],
                onSome: (having) => [
                    h.div(
                        [h.Class("grid grid-cols-[5.5rem_1fr] gap-1.5")],
                        [
                            select_control(h, {
                                label: "Having function",
                                value: having.fn,
                                options: Arr.map(AGGREGATE_FUNCTIONS, (fn) => ({
                                    value: fn,
                                    label: fn,
                                })),
                                on_select: (value) =>
                                    Option.match(
                                        Arr.findFirst(
                                            AGGREGATE_FUNCTIONS,
                                            (fn) => fn === value
                                        ),
                                        {
                                            onNone: () =>
                                                send(
                                                    ChangedHavingFunction({
                                                        fn: having.fn,
                                                    })
                                                ),
                                            onSome: (fn) =>
                                                send(
                                                    ChangedHavingFunction({
                                                        fn,
                                                    })
                                                ),
                                        }
                                    ),
                            }),
                            select_control(h, {
                                label: "Having column",
                                value: having.column,
                                options: [
                                    ...(having.fn === "COUNT"
                                        ? [
                                              {
                                                  value: COUNT_STAR,
                                                  label: "* (every row)",
                                              },
                                          ]
                                        : []),
                                    ...column_options(scope),
                                ],
                                on_select: (column) =>
                                    send(ChangedHavingColumn({ column })),
                            }),
                        ]
                    ),
                    h.div(
                        [h.Class("grid grid-cols-[7rem_1fr] gap-1.5")],
                        [
                            select_control(h, {
                                label: "Having operator",
                                value: having.operator,
                                options: Arr.map(OPERATORS, (operator) => ({
                                    value: operator,
                                    label: operator,
                                })),
                                on_select: (value) =>
                                    Option.match(
                                        Arr.findFirst(
                                            OPERATORS,
                                            (operator) => operator === value
                                        ),
                                        {
                                            onNone: () =>
                                                send(
                                                    ChangedHavingOperator({
                                                        operator:
                                                            having.operator,
                                                    })
                                                ),
                                            onSome: (operator) =>
                                                send(
                                                    ChangedHavingOperator({
                                                        operator,
                                                    })
                                                ),
                                        }
                                    ),
                            }),
                            h.input([
                                h.Type("text"),
                                h.Class(control_class),
                                h.Value(having.value),
                                h.AriaLabel("Having value"),
                                h.OnInput((value) =>
                                    send(ChangedHavingValue({ value }))
                                ),
                            ]),
                        ]
                    ),
                ],
            }),
        ],
    })
}

const select_card = <ParentMessage>(
    model: Model,
    send: Send<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const scope = columns_in_scope(model.query)
    const grouping =
        model.query.group_by.length > 0 || model.query.aggregates.length > 0

    return clause_card(h, {
        step: 6,
        keyword: "SELECT",
        hint: grouping
            ? "Once you group, only grouped columns and aggregates may be selected. Anything else is greyed out."
            : "Chooses which columns come back. It changes the width of each row, never how many rows there are.",
        active: true,
        children: [
            h.div(
                [h.Class("flex items-center justify-between gap-2")],
                [
                    checkbox_control(h, {
                        label: "DISTINCT",
                        title: "Remove duplicate output rows",
                        checked: model.query.distinct,
                        on_toggle: send(ToggledDistinct()),
                    }),
                    h.button(
                        [
                            h.Class(ghost_button_class),
                            h.OnClick(send(ToggledAllColumns())),
                        ],
                        [
                            model.query.selected_columns.length === scope.length
                                ? "None"
                                : "All",
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "max-h-56 space-y-0.5 overflow-y-auto rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-1 bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                Arr.map(scope, (column) => {
                    const allowed =
                        !grouping || Arr.contains(model.query.group_by, column)

                    return h.div(
                        [h.Key(column), h.Class(allowed ? "" : "opacity-40")],
                        [
                            checkbox_control(h, {
                                label: column,
                                title: allowed
                                    ? column
                                    : `${column} is not in GROUP BY, so it cannot be selected`,
                                checked: Arr.contains(
                                    model.query.selected_columns,
                                    column
                                ),
                                on_toggle: send(ToggledColumn({ column })),
                            }),
                        ]
                    )
                })
            ),
        ],
    })
}

const order_card = <ParentMessage>(
    model: Model,
    result_columns: ReadonlyArray<string>,
    send: Send<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    clause_card(h, {
        step: 7,
        keyword: "ORDER BY / LIMIT",
        hint: "Sorting happens after SELECT, so it can name an aggregate. LIMIT then slices the sorted result; OFFSET skips ahead.",
        active:
            Option.isSome(model.query.order_by) ||
            Option.isSome(model.query.limit) ||
            model.query.offset > 0,
        children: [
            h.div(
                [h.Class("grid grid-cols-[1fr_5.5rem] gap-1.5")],
                [
                    select_control(h, {
                        label: "Order by column",
                        value: Option.match(model.query.order_by, {
                            onNone: () => "",
                            onSome: (order_by) => order_by.column,
                        }),
                        options: [
                            { value: "", label: "unordered" },
                            ...column_options(result_columns),
                        ],
                        on_select: (column) =>
                            send(SelectedOrderByColumn({ column })),
                    }),
                    select_control(h, {
                        label: "Order direction",
                        value: Option.match(model.query.order_by, {
                            onNone: () => "ASC",
                            onSome: (order_by) => order_by.direction,
                        }),
                        options: [
                            { value: "ASC", label: "ASC" },
                            { value: "DESC", label: "DESC" },
                        ],
                        on_select: (value) =>
                            send(
                                SelectedOrderByDirection({
                                    direction:
                                        value === "DESC" ? "DESC" : "ASC",
                                })
                            ),
                    }),
                ]
            ),
            h.div(
                [h.Class("grid grid-cols-2 gap-1.5")],
                [
                    field_row(
                        h,
                        "LIMIT",
                        h.input([
                            h.Type("number"),
                            h.Min("0"),
                            h.Class(control_class),
                            h.Value(
                                Option.match(model.query.limit, {
                                    onNone: () => "",
                                    onSome: (limit) => String(limit),
                                })
                            ),
                            h.AriaLabel("Limit"),
                            h.Placeholder("all"),
                            h.OnInput((value) => send(ChangedLimit({ value }))),
                        ])
                    ),
                    field_row(
                        h,
                        "OFFSET",
                        h.input([
                            h.Type("number"),
                            h.Min("0"),
                            h.Class(control_class),
                            h.Value(String(model.query.offset)),
                            h.AriaLabel("Offset"),
                            h.OnInput((value) =>
                                send(ChangedOffset({ value }))
                            ),
                        ])
                    ),
                ]
            ),
        ],
    })

const pipeline_panel = <ParentMessage>(
    model: Model,
    stages: ReadonlyArray<Stage>,
    send: Send<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class(`${card_class} p-3`)],
        [
            h.button(
                [
                    h.Class(
                        "flex w-full items-center justify-between text-xs font-semibold text-foreground"
                    ),
                    h.OnClick(send(ToggledPipeline())),
                ],
                [
                    "Logical execution order",
                    h.span(
                        [h.Class("font-normal text-muted-foreground")],
                        [model.pipeline_open ? "Hide" : "Show"]
                    ),
                ]
            ),
            ...(model.pipeline_open
                ? [
                      h.p(
                          [
                              h.Class(
                                  "mt-2 text-[11px] leading-4 text-muted-foreground"
                              ),
                          ],
                          [
                              "SQL is written SELECT-first but runs in this order. Watch the row count change as each clause takes effect.",
                          ]
                      ),
                      h.ol(
                          [h.Class("mt-2 space-y-1")],
                          Arr.map(stages, (stage, index) =>
                              h.li(
                                  [
                                      h.Key(stage.clause),
                                      h.Class(
                                          `grid grid-cols-[1.25rem_6.5rem_1fr_auto] items-baseline gap-2 rounded-lg px-2 py-1 text-xs ${
                                              stage.applied
                                                  ? "bg-primary/5"
                                                  : "opacity-50"
                                          }`
                                      ),
                                  ],
                                  [
                                      h.span(
                                          [
                                              h.Class(
                                                  "text-[10px] text-muted-foreground"
                                              ),
                                          ],
                                          [String(index + 1)]
                                      ),
                                      h.span(
                                          [
                                              h.Class(
                                                  "font-mono text-[11px] font-semibold text-foreground"
                                              ),
                                          ],
                                          [stage.clause]
                                      ),
                                      h.span(
                                          [
                                              h.Class(
                                                  "text-[11px] leading-4 text-muted-foreground"
                                              ),
                                          ],
                                          [stage.detail]
                                      ),
                                      h.span(
                                          [
                                              h.Class(
                                                  "whitespace-nowrap font-mono text-[11px] tabular-nums text-foreground"
                                              ),
                                          ],
                                          [`${stage.row_count} rows`]
                                      ),
                                  ]
                              )
                          )
                      ),
                  ]
                : []),
        ]
    )

const results_panel = <ParentMessage>(
    model: Model,
    columns: ReadonlyArray<string>,
    rows: ReadonlyArray<ResultRow>,
    warnings: ReadonlyArray<string>,
    send: Send<ParentMessage>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class(`${card_class} overflow-hidden`)],
        [
            h.div(
                [
                    h.Class(
                        "flex flex-wrap items-center justify-between gap-2 border-b-(length:--surface-border-width) border-border px-4 py-2.5"
                    ),
                ],
                [
                    h.span(
                        [h.Class("text-xs font-semibold text-foreground")],
                        ["Result"]
                    ),
                    h.span(
                        [
                            h.Class(
                                "font-mono text-xs tabular-nums text-muted-foreground"
                            ),
                        ],
                        [
                            `${rows.length} row${rows.length === 1 ? "" : "s"} · ${columns.length} column${columns.length === 1 ? "" : "s"}`,
                        ]
                    ),
                ]
            ),
            ...Arr.map(warnings, (warning) =>
                h.p(
                    [
                        h.Key(warning),
                        h.Class(
                            "border-b-(length:--surface-border-width) border-border bg-amber-500/10 px-4 py-2 text-xs leading-5 text-amber-700 dark:text-amber-300"
                        ),
                    ],
                    [warning]
                )
            ),
            columns.length === 0
                ? h.p(
                      [
                          h.Class(
                              "px-4 py-10 text-center text-sm text-muted-foreground"
                          ),
                      ],
                      ["Nothing selected yet."]
                  )
                : h.div(
                      [h.Class("max-h-[32rem] overflow-auto")],
                      [
                          h.table(
                              [h.Class("w-full border-collapse text-sm")],
                              [
                                  h.thead(
                                      [
                                          h.Class(
                                              "sticky top-0 z-10 bg-muted/80 backdrop-blur"
                                          ),
                                      ],
                                      [
                                          h.tr(
                                              [],
                                              Arr.map(columns, (column) => {
                                                  const sorted = Option.match(
                                                      model.query.order_by,
                                                      {
                                                          onNone: () => "",
                                                          onSome: (order_by) =>
                                                              order_by.column ===
                                                              column
                                                                  ? order_by.direction ===
                                                                    "ASC"
                                                                      ? "↑"
                                                                      : "↓"
                                                                  : "",
                                                      }
                                                  )

                                                  return h.th(
                                                      [
                                                          h.Key(column),
                                                          h.Scope("col"),
                                                          h.Class(
                                                              "border-b-(length:--surface-border-width) border-border p-0 text-left"
                                                          ),
                                                      ],
                                                      [
                                                          h.button(
                                                              [
                                                                  h.Class(
                                                                      "flex w-full items-center gap-1.5 px-3 py-2 text-left font-mono text-[11px] font-semibold text-foreground transition hover:bg-accent"
                                                                  ),
                                                                  h.Title(
                                                                      `Sort by ${column}`
                                                                  ),
                                                                  h.OnClick(
                                                                      send(
                                                                          SelectedOrderByColumn(
                                                                              {
                                                                                  column,
                                                                              }
                                                                          )
                                                                      )
                                                                  ),
                                                              ],
                                                              [
                                                                  short_column(
                                                                      column
                                                                  ),
                                                                  h.span(
                                                                      [
                                                                          h.Class(
                                                                              "text-primary"
                                                                          ),
                                                                      ],
                                                                      [sorted]
                                                                  ),
                                                              ]
                                                          ),
                                                      ]
                                                  )
                                              })
                                          ),
                                      ]
                                  ),
                                  h.tbody(
                                      [],
                                      rows.length === 0
                                          ? [
                                                h.tr(
                                                    [h.Key("empty")],
                                                    [
                                                        h.td(
                                                            [
                                                                h.Colspan(
                                                                    columns.length
                                                                ),
                                                                h.Class(
                                                                    "px-4 py-10 text-center text-sm text-muted-foreground"
                                                                ),
                                                            ],
                                                            [
                                                                "No rows matched. Loosen a condition, or switch the join kind.",
                                                            ]
                                                        ),
                                                    ]
                                                ),
                                            ]
                                          : Arr.map(rows, (row) =>
                                                h.tr(
                                                    [
                                                        h.Key(row.key),
                                                        h.Class(
                                                            "border-b-(length:--surface-border-width) border-border/60 last:border-0 hover:bg-accent/40"
                                                        ),
                                                    ],
                                                    Arr.map(
                                                        columns,
                                                        (column) => {
                                                            const cell =
                                                                row.cells[
                                                                    column
                                                                ] ?? null

                                                            return h.td(
                                                                [
                                                                    h.Key(
                                                                        column
                                                                    ),
                                                                    h.Class(
                                                                        `px-3 py-1.5 ${
                                                                            cell ===
                                                                            null
                                                                                ? "font-mono text-xs italic text-muted-foreground"
                                                                                : typeof cell ===
                                                                                    "number"
                                                                                  ? "text-right tabular-nums text-foreground"
                                                                                  : "text-foreground"
                                                                        }`
                                                                    ),
                                                                ],
                                                                [
                                                                    format_cell(
                                                                        cell
                                                                    ),
                                                                ]
                                                            )
                                                        }
                                                    )
                                                )
                                            )
                                  ),
                              ]
                          ),
                      ]
                  ),
        ]
    )

/**
 * Build a local query by adding conditions, groups, aggregates, and sorting.
 * The result table and pipeline explanation are derived from the query model on
 * every update without a server request.
 */
export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const send: Send<ParentMessage> = (message) => toParentMessage(message)
    const result = execute(model.query)

    const sortable_columns = Arr.dedupe([
        ...result.columns,
        ...Arr.map(model.query.aggregates, (aggregate) =>
            aggregate_label(aggregate.fn, aggregate.column)
        ),
    ])

    return h.div(
        [h.Class("space-y-6")],
        [
            h.div(
                [h.Class("flex flex-wrap items-start justify-between gap-3")],
                [
                    h.div(
                        [h.Class("space-y-2")],
                        [
                            h.h1(
                                [
                                    h.Class(
                                        "text-3xl font-bold tracking-tight text-foreground"
                                    ),
                                ],
                                ["Query Table"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "max-w-2xl text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    "A contact database you query by clicking. Every control is one SQL clause: change it and the statement, the execution pipeline, and the rows below all move together.",
                                ]
                            ),
                        ]
                    ),
                    h.button(
                        [
                            h.Class(ghost_button_class),
                            h.OnClick(send(ResetQuery())),
                        ],
                        ["Reset query"]
                    ),
                ]
            ),
            lesson_strip(model, send, h),
            sql_panel(model, h),
            h.div(
                [
                    h.Class(
                        "grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"
                    ),
                ],
                [
                    h.div(
                        [h.Class("space-y-3")],
                        [
                            from_card(model, send, h),
                            join_card(model, send, h),
                            where_card(model, send, h),
                            group_card(model, send, h),
                            having_card(model, send, h),
                            select_card(model, send, h),
                            order_card(model, sortable_columns, send, h),
                            schema_panel(model, send, h),
                        ]
                    ),
                    h.div(
                        [h.Class("space-y-3")],
                        [
                            pipeline_panel(model, result.stages, send, h),
                            results_panel(
                                model,
                                result.columns,
                                result.rows,
                                result.warnings,
                                send,
                                h
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}
