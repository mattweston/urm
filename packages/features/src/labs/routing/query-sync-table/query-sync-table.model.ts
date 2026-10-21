import { Schema as S } from "effect"
import { QuerySyncTableRoute } from "./query-sync-table.route.ts"

export const Model = S.Struct({
    route: QuerySyncTableRoute,
})

export type Model = typeof Model.Type
