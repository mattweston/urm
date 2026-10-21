import { Option, Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { TableName, qualify } from "./query-table.data.ts"

export const Operator = S.Literals([
    "=",
    "<>",
    ">",
    "<",
    ">=",
    "<=",
    "LIKE",
    "NOT LIKE",
    "IN",
    "IS NULL",
    "IS NOT NULL",
])
export type Operator = typeof Operator.Type

// Operators whose right-hand side is unused; the view hides the value input.
export const operator_takes_value = (operator: Operator): boolean =>
    operator !== "IS NULL" && operator !== "IS NOT NULL"

export const AggregateFunction = S.Literals([
    "COUNT",
    "SUM",
    "AVG",
    "MIN",
    "MAX",
])
export type AggregateFunction = typeof AggregateFunction.Type

export const JoinKind = S.Literals(["INNER", "LEFT", "RIGHT", "FULL"])
export type JoinKind = typeof JoinKind.Type

export const Combinator = S.Literals(["AND", "OR"])
export type Combinator = typeof Combinator.Type

export const Direction = S.Literals(["ASC", "DESC"])
export type Direction = typeof Direction.Type

export const Condition = S.Struct({
    id: S.String,
    column: S.String,
    operator: Operator,
    value: S.String,
})
export type Condition = typeof Condition.Type

// COUNT(*) is the one aggregate with no column, so the star is spelled out
// rather than modelled as an absent column.
export const COUNT_STAR = "*"

export const Aggregate = S.Struct({
    id: S.String,
    fn: AggregateFunction,
    column: S.String,
})
export type Aggregate = typeof Aggregate.Type

export const NoJoin = taggedStruct("NoJoin")
export type NoJoin = typeof NoJoin.Type

export const JoinOn = taggedStruct("JoinOn", {
    kind: JoinKind,
    table: TableName,
    left_column: S.String,
    right_column: S.String,
})
export type JoinOn = typeof JoinOn.Type

export const Join = S.Union([NoJoin, JoinOn])
export type Join = typeof Join.Type

export const OrderBy = S.Struct({
    column: S.String,
    direction: Direction,
})
export type OrderBy = typeof OrderBy.Type

export const Having = S.Struct({
    fn: AggregateFunction,
    column: S.String,
    operator: Operator,
    value: S.String,
})
export type Having = typeof Having.Type

export const Query = S.Struct({
    from_table: TableName,
    distinct: S.Boolean,
    selected_columns: S.Array(S.String),
    join: Join,
    conditions: S.Array(Condition),
    combinator: Combinator,
    group_by: S.Array(S.String),
    aggregates: S.Array(Aggregate),
    having: S.Option(Having),
    order_by: S.Option(OrderBy),
    limit: S.Option(S.Number),
    offset: S.Number,
})
export type Query = typeof Query.Type

export const aggregate_label = (
    fn: AggregateFunction,
    column: string
): string => `${fn}(${column})`

export const empty_query: Query = {
    from_table: "contacts",
    distinct: false,
    selected_columns: [
        qualify("contacts", "first_name"),
        qualify("contacts", "last_name"),
        qualify("contacts", "city"),
        qualify("contacts", "country"),
        qualify("contacts", "status"),
        qualify("contacts", "lifetime_value"),
    ],
    join: NoJoin(),
    conditions: [],
    combinator: "AND",
    group_by: [],
    aggregates: [],
    having: Option.none(),
    order_by: Option.none(),
    limit: Option.none(),
    offset: 0,
}
