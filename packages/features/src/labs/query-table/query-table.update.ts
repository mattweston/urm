import { Array as Arr, Match as M, Option, Schema as S } from "effect"
import type { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"
import type { TableName } from "./query-table.data.ts"
import { qualified_columns } from "./query-table.data.ts"
import { lesson_by_id, reset_query } from "./query-table.lesson.ts"
import type { Message } from "./query-table.message.ts"
import type { Model } from "./query-table.model.ts"
import type {
    Aggregate,
    Condition,
    Having,
    Query,
} from "./query-table.query.ts"
import {
    COUNT_STAR,
    JoinKind,
    JoinOn,
    NoJoin,
    aggregate_label,
    empty_query,
} from "./query-table.query.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const decode_join_kind = S.decodeUnknownOption(JoinKind)

const toggle_member = (
    members: ReadonlyArray<string>,
    value: string
): ReadonlyArray<string> =>
    Arr.contains(members, value)
        ? Arr.filter(members, (member) => member !== value)
        : [...members, value]

// Columns of the joined table stay selectable only while the join is in place;
// dropping or repointing a join has to prune everything that referred to it.
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

const prune_to_scope = (query: Query): Query => {
    const scope = columns_in_scope(query)
    const in_scope = (column: string) => Arr.contains(scope, column)

    const aggregates = Arr.filter(
        query.aggregates,
        (aggregate) =>
            aggregate.column === COUNT_STAR || in_scope(aggregate.column)
    )
    const group_by = Arr.filter(query.group_by, in_scope)
    const selected_columns = Arr.filter(query.selected_columns, in_scope)

    const output_columns = [
        ...group_by,
        ...Arr.map(aggregates, (aggregate) =>
            aggregate_label(aggregate.fn, aggregate.column)
        ),
        ...selected_columns,
    ]

    return modifyFields(query, {
        selected_columns: () => selected_columns,
        conditions: (conditions) =>
            Arr.filter(conditions, (condition) => in_scope(condition.column)),
        group_by: () => group_by,
        aggregates: () => aggregates,
        having: (having) =>
            Option.filter(
                having,
                (clause) =>
                    clause.column === COUNT_STAR || in_scope(clause.column)
            ),
        order_by: (order_by) =>
            Option.filter(order_by, (clause) =>
                Arr.contains(output_columns, clause.column)
            ),
    })
}

const first_column_of = (table: TableName): string =>
    Option.getOrElse(Arr.get(qualified_columns(table), 0), () => "")

const first_column_in_scope = (query: Query): string =>
    Option.getOrElse(Arr.get(columns_in_scope(query), 0), () => COUNT_STAR)

const default_join = (query: Query, table: TableName, kind: string) =>
    JoinOn({
        kind: Option.getOrElse(decode_join_kind(kind), () => "INNER" as const),
        table,
        left_column: first_column_of(query.from_table),
        right_column: first_column_of(table),
    })

const other_table = (table: TableName): TableName =>
    table === "contacts" ? "companies" : "contacts"

const parse_positive = (value: string): Option.Option<number> => {
    const trimmed = value.trim()

    if (trimmed === "") {
        return Option.none()
    }

    const parsed = Number(trimmed)

    return Number.isNaN(parsed) || parsed < 0
        ? Option.none()
        : Option.some(Math.floor(parsed))
}

const map_condition = (
    query: Query,
    id: string,
    edit: (condition: Condition) => Condition
): Query =>
    modifyFields(query, {
        conditions: (conditions) =>
            Arr.map(conditions, (condition) =>
                condition.id === id ? edit(condition) : condition
            ),
    })

const map_aggregate = (
    query: Query,
    id: string,
    edit: (aggregate: Aggregate) => Aggregate
): Query =>
    modifyFields(query, {
        aggregates: (aggregates) =>
            Arr.map(aggregates, (aggregate) =>
                aggregate.id === id ? edit(aggregate) : aggregate
            ),
    })

const map_having = (query: Query, edit: (having: Having) => Having): Query =>
    modifyFields(query, { having: (having) => Option.map(having, edit) })

const with_join = (query: Query, edit: (join: JoinOn) => Query): Query =>
    M.value(query.join).pipe(
        M.withReturnType<Query>(),
        M.tagsExhaustive({
            NoJoin: () => query,
            JoinOn: (join) => edit(join),
        })
    )

export const update = (model: Model, message: Message): UpdateReturn => {
    // Any hand edit means the model no longer matches the lesson that loaded
    // it, so the lesson card stops claiming credit for what is on screen.
    const detached = modifyFields(model, { active_lesson: () => Option.none() })

    const edit_query = (edit: (query: Query) => Query): UpdateReturn => [
        modifyFields(detached, { query: edit }),
        [],
    ]

    return M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            SelectedFromTable: ({ table }) =>
                edit_query(() =>
                    prune_to_scope(
                        modifyFields(empty_query, {
                            from_table: () => table,
                            selected_columns: () => qualified_columns(table),
                            join: () => NoJoin(),
                        })
                    )
                ),

            ToggledColumn: ({ column }) =>
                edit_query((query) =>
                    modifyFields(query, {
                        selected_columns: (columns) =>
                            toggle_member(columns, column),
                    })
                ),

            ToggledAllColumns: () =>
                edit_query((query) =>
                    modifyFields(query, {
                        selected_columns: (columns) =>
                            columns.length === columns_in_scope(query).length
                                ? []
                                : columns_in_scope(query),
                    })
                ),

            ToggledDistinct: () =>
                edit_query((query) =>
                    modifyFields(query, { distinct: (distinct) => !distinct })
                ),

            SelectedJoinKind: ({ kind }) =>
                edit_query((query) =>
                    Option.match(decode_join_kind(kind), {
                        onNone: () =>
                            prune_to_scope(
                                modifyFields(query, { join: () => NoJoin() })
                            ),
                        onSome: (decoded) =>
                            M.value(query.join).pipe(
                                M.withReturnType<Query>(),
                                M.tagsExhaustive({
                                    NoJoin: () =>
                                        modifyFields(query, {
                                            join: () =>
                                                default_join(
                                                    query,
                                                    other_table(
                                                        query.from_table
                                                    ),
                                                    decoded
                                                ),
                                        }),
                                    JoinOn: (join) =>
                                        modifyFields(query, {
                                            join: () =>
                                                modifyFields(join, {
                                                    kind: () => decoded,
                                                }),
                                        }),
                                })
                            ),
                    })
                ),

            SelectedJoinTable: ({ table }) =>
                edit_query((query) =>
                    with_join(query, (join) =>
                        prune_to_scope(
                            modifyFields(query, {
                                join: () =>
                                    default_join(query, table, join.kind),
                            })
                        )
                    )
                ),

            SelectedJoinLeftColumn: ({ column }) =>
                edit_query((query) =>
                    with_join(query, (join) =>
                        modifyFields(query, {
                            join: () =>
                                modifyFields(join, { left_column: () => column }),
                        })
                    )
                ),

            SelectedJoinRightColumn: ({ column }) =>
                edit_query((query) =>
                    with_join(query, (join) =>
                        modifyFields(query, {
                            join: () =>
                                modifyFields(join, { right_column: () => column }),
                        })
                    )
                ),

            AddedCondition: () => {
                const condition: Condition = {
                    id: `c${model.next_clause_id}`,
                    column: first_column_in_scope(model.query),
                    operator: "=",
                    value: "",
                }

                return [
                    modifyFields(detached, {
                        next_clause_id: (value) => value + 1,
                        query: (query) =>
                            modifyFields(query, {
                                conditions: (conditions) => [
                                    ...conditions,
                                    condition,
                                ],
                            }),
                    }),
                    [],
                ]
            },

            RemovedCondition: ({ id }) =>
                edit_query((query) =>
                    modifyFields(query, {
                        conditions: (conditions) =>
                            Arr.filter(
                                conditions,
                                (condition) => condition.id !== id
                            ),
                    })
                ),

            ChangedConditionColumn: ({ id, column }) =>
                edit_query((query) =>
                    map_condition(query, id, (condition) =>
                        modifyFields(condition, {
                            column: () => column,
                            value: () => "",
                        })
                    )
                ),

            ChangedConditionOperator: ({ id, operator }) =>
                edit_query((query) =>
                    map_condition(query, id, (condition) =>
                        modifyFields(condition, { operator: () => operator })
                    )
                ),

            ChangedConditionValue: ({ id, value }) =>
                edit_query((query) =>
                    map_condition(query, id, (condition) =>
                        modifyFields(condition, { value: () => value })
                    )
                ),

            SelectedCombinator: ({ combinator }) =>
                edit_query((query) =>
                    modifyFields(query, { combinator: () => combinator })
                ),

            ToggledGroupByColumn: ({ column }) =>
                edit_query((query) =>
                    modifyFields(query, {
                        group_by: (group_by) => toggle_member(group_by, column),
                    })
                ),

            AddedAggregate: () => {
                const aggregate: Aggregate = {
                    id: `a${model.next_clause_id}`,
                    fn: "COUNT",
                    column: COUNT_STAR,
                }

                return [
                    modifyFields(detached, {
                        next_clause_id: (value) => value + 1,
                        query: (query) =>
                            modifyFields(query, {
                                aggregates: (aggregates) => [
                                    ...aggregates,
                                    aggregate,
                                ],
                            }),
                    }),
                    [],
                ]
            },

            RemovedAggregate: ({ id }) =>
                edit_query((query) =>
                    modifyFields(query, {
                        aggregates: (aggregates) =>
                            Arr.filter(
                                aggregates,
                                (aggregate) => aggregate.id !== id
                            ),
                    })
                ),

            // Only COUNT accepts the star, so moving away from it has to land
            // the aggregate on a real column.
            ChangedAggregateFunction: ({ id, fn }) =>
                edit_query((query) =>
                    map_aggregate(query, id, (aggregate) =>
                        modifyFields(aggregate, {
                            fn: () => fn,
                            column: (column) =>
                                fn !== "COUNT" && column === COUNT_STAR
                                    ? first_column_in_scope(query)
                                    : column,
                        })
                    )
                ),

            ChangedAggregateColumn: ({ id, column }) =>
                edit_query((query) =>
                    map_aggregate(query, id, (aggregate) =>
                        modifyFields(aggregate, { column: () => column })
                    )
                ),

            ToggledHaving: () => {
                const having: Having = {
                    fn: "COUNT",
                    column: COUNT_STAR,
                    operator: ">",
                    value: "1",
                }

                return edit_query((query) =>
                    modifyFields(query, {
                        having: (current) =>
                            Option.isSome(current)
                                ? Option.none()
                                : Option.some(having),
                    })
                )
            },

            ChangedHavingFunction: ({ fn }) =>
                edit_query((query) =>
                    map_having(query, (clause) =>
                        modifyFields(clause, {
                            fn: () => fn,
                            column: (column) =>
                                fn !== "COUNT" && column === COUNT_STAR
                                    ? first_column_in_scope(query)
                                    : column,
                        })
                    )
                ),

            ChangedHavingColumn: ({ column }) =>
                edit_query((query) =>
                    map_having(query, (clause) =>
                        modifyFields(clause, { column: () => column })
                    )
                ),

            ChangedHavingOperator: ({ operator }) =>
                edit_query((query) =>
                    map_having(query, (clause) =>
                        modifyFields(clause, { operator: () => operator })
                    )
                ),

            ChangedHavingValue: ({ value }) =>
                edit_query((query) =>
                    map_having(query, (clause) =>
                        modifyFields(clause, { value: () => value })
                    )
                ),

            SelectedOrderByColumn: ({ column }) =>
                edit_query((query) =>
                    modifyFields(query, {
                        order_by: (order_by) =>
                            column === ""
                                ? Option.none()
                                : Option.some({
                                      column,
                                      direction: Option.match(order_by, {
                                          onNone: () => "ASC" as const,
                                          onSome: (clause) => clause.direction,
                                      }),
                                  }),
                    })
                ),

            SelectedOrderByDirection: ({ direction }) =>
                edit_query((query) =>
                    modifyFields(query, {
                        order_by: (order_by) =>
                            Option.map(order_by, (clause) =>
                                modifyFields(clause, { direction: () => direction })
                            ),
                    })
                ),

            ChangedLimit: ({ value }) =>
                edit_query((query) =>
                    modifyFields(query, { limit: () => parse_positive(value) })
                ),

            ChangedOffset: ({ value }) =>
                edit_query((query) =>
                    modifyFields(query, {
                        offset: () =>
                            Option.getOrElse(parse_positive(value), () => 0),
                    })
                ),

            SelectedLesson: ({ id }) =>
                Option.match(lesson_by_id(id), {
                    onNone: (): UpdateReturn => [model, []],
                    onSome: (lesson) => [
                        modifyFields(model, {
                            query: () => lesson.query,
                            active_lesson: () => Option.some(lesson.id),
                        }),
                        [],
                    ],
                }),

            ClearedLesson: () => [detached, []],

            ResetQuery: () => [modifyFields(detached, { query: () => reset_query }), []],

            ToggledPipeline: () => [
                modifyFields(model, { pipeline_open: (open) => !open }),
                [],
            ],

            ToggledSchema: () => [
                modifyFields(model, { schema_open: (open) => !open }),
                [],
            ],
        })
    )
}

export const init = (): UpdateReturn => [
    {
        query: empty_query,
        next_clause_id: 1,
        active_lesson: Option.none(),
        pipeline_open: true,
        schema_open: false,
    },
    [],
]
