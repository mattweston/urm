import { Schema as S } from "effect"
import { Query } from "./query-table.query.ts"

export const Model = S.Struct({
    query: Query,
    // Conditions and aggregates are added and removed by hand, so each one
    // needs a stable identity for keyed rows and for targeted edits.
    next_clause_id: S.Number,
    active_lesson: S.Option(S.String),
    pipeline_open: S.Boolean,
    schema_open: S.Boolean,
})

export type Model = typeof Model.Type
