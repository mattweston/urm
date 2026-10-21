import { Schema as S } from "effect"
import { taggedStruct } from "foldkit/schema"
import { TableName } from "./query-table.data.ts"
import {
    AggregateFunction,
    Combinator,
    Direction,
    Operator,
} from "./query-table.query.ts"

export const SelectedFromTable = taggedStruct("SelectedFromTable", {
    table: TableName,
})
export const ToggledColumn = taggedStruct("ToggledColumn", { column: S.String })
export const ToggledAllColumns = taggedStruct("ToggledAllColumns")
export const ToggledDistinct = taggedStruct("ToggledDistinct")

export const SelectedJoinKind = taggedStruct("SelectedJoinKind", {
    kind: S.String,
})
export const SelectedJoinTable = taggedStruct("SelectedJoinTable", {
    table: TableName,
})
export const SelectedJoinLeftColumn = taggedStruct("SelectedJoinLeftColumn", {
    column: S.String,
})
export const SelectedJoinRightColumn = taggedStruct("SelectedJoinRightColumn", {
    column: S.String,
})

export const AddedCondition = taggedStruct("AddedCondition")
export const RemovedCondition = taggedStruct("RemovedCondition", {
    id: S.String,
})
export const ChangedConditionColumn = taggedStruct("ChangedConditionColumn", {
    id: S.String,
    column: S.String,
})
export const ChangedConditionOperator = taggedStruct(
    "ChangedConditionOperator",
    {
        id: S.String,
        operator: Operator,
    }
)
export const ChangedConditionValue = taggedStruct("ChangedConditionValue", {
    id: S.String,
    value: S.String,
})
export const SelectedCombinator = taggedStruct("SelectedCombinator", {
    combinator: Combinator,
})

export const ToggledGroupByColumn = taggedStruct("ToggledGroupByColumn", {
    column: S.String,
})
export const AddedAggregate = taggedStruct("AddedAggregate")
export const RemovedAggregate = taggedStruct("RemovedAggregate", {
    id: S.String,
})
export const ChangedAggregateFunction = taggedStruct(
    "ChangedAggregateFunction",
    {
        id: S.String,
        fn: AggregateFunction,
    }
)
export const ChangedAggregateColumn = taggedStruct("ChangedAggregateColumn", {
    id: S.String,
    column: S.String,
})

export const ToggledHaving = taggedStruct("ToggledHaving")
export const ChangedHavingFunction = taggedStruct("ChangedHavingFunction", {
    fn: AggregateFunction,
})
export const ChangedHavingColumn = taggedStruct("ChangedHavingColumn", {
    column: S.String,
})
export const ChangedHavingOperator = taggedStruct("ChangedHavingOperator", {
    operator: Operator,
})
export const ChangedHavingValue = taggedStruct("ChangedHavingValue", {
    value: S.String,
})

export const SelectedOrderByColumn = taggedStruct("SelectedOrderByColumn", {
    column: S.String,
})
export const SelectedOrderByDirection = taggedStruct(
    "SelectedOrderByDirection",
    {
        direction: Direction,
    }
)
export const ChangedLimit = taggedStruct("ChangedLimit", { value: S.String })
export const ChangedOffset = taggedStruct("ChangedOffset", { value: S.String })

export const SelectedLesson = taggedStruct("SelectedLesson", { id: S.String })
export const ClearedLesson = taggedStruct("ClearedLesson")
export const ResetQuery = taggedStruct("ResetQuery")
export const ToggledPipeline = taggedStruct("ToggledPipeline")
export const ToggledSchema = taggedStruct("ToggledSchema")

export const Message = S.Union([
    SelectedFromTable,
    ToggledColumn,
    ToggledAllColumns,
    ToggledDistinct,
    SelectedJoinKind,
    SelectedJoinTable,
    SelectedJoinLeftColumn,
    SelectedJoinRightColumn,
    AddedCondition,
    RemovedCondition,
    ChangedConditionColumn,
    ChangedConditionOperator,
    ChangedConditionValue,
    SelectedCombinator,
    ToggledGroupByColumn,
    AddedAggregate,
    RemovedAggregate,
    ChangedAggregateFunction,
    ChangedAggregateColumn,
    ToggledHaving,
    ChangedHavingFunction,
    ChangedHavingColumn,
    ChangedHavingOperator,
    ChangedHavingValue,
    SelectedOrderByColumn,
    SelectedOrderByDirection,
    ChangedLimit,
    ChangedOffset,
    SelectedLesson,
    ClearedLesson,
    ResetQuery,
    ToggledPipeline,
    ToggledSchema,
])

export type Message = typeof Message.Type
