import { Equal, Option, Schema } from "effect"
import { Command, Submodel } from "foldkit"
import { Url } from "foldkit/url"
import * as QuerySyncTable from "@urm/features/labs/routing/query-sync-table"
import type { DesktopRoute } from "../../../routing/route.ts"

const to_internal_href = (href: string): string => href

export const query_sync_table_href = () =>
    to_internal_href(QuerySyncTable.querySyncTableHref())

export const is_query_sync_table_path = (path: string): boolean =>
    QuerySyncTable.isQuerySyncTablePath(path.split("?")[0] ?? path)

export const Model = Schema.Struct({
    active: Schema.Boolean,
    table: QuerySyncTable.Model,
})
export type Model = typeof Model.Type
export const Message = QuerySyncTable.Message
export type Message = QuerySyncTable.MessageType

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (route: DesktopRoute): Model => {
    const active =
        route._tag === "Labs" && is_query_sync_table_path(route.labs_path)
    const path = active ? route.labs_path : QuerySyncTable.querySyncTableHref()
    const query_index = path.indexOf("?")
    const url = Url.make({
        protocol: "https:",
        host: "urm.invalid",
        port: Option.none(),
        pathname: query_index < 0 ? path : path.slice(0, query_index),
        search:
            query_index < 0
                ? Option.none()
                : Option.some(path.slice(query_index + 1)),
        hash: Option.none(),
    })
    const [table] = QuerySyncTable.init(
        QuerySyncTable.urlToQuerySyncTableRoute(url)
    )
    return { active, table }
}

export const changed_route = (model: Model, route: DesktopRoute): Model => {
    const next = init(route)
    return next.active === model.active &&
        Equal.equals(next.table.route, model.table.route)
        ? model
        : next
}

export const update = (model: Model, message: Message): UpdateReturn => {
    if (!model.active) return [model, []]
    const [table, commands] = QuerySyncTable.update(
        model.table,
        message,
        "Browser",
        to_internal_href
    )
    return [{ ...model, table }, commands]
}

export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.div(
        [h.Class("mx-auto min-w-0 w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8")],
        [
            QuerySyncTable.view(
                model.table,
                (message) => message,
                h,
                query_sync_table_href()
            ),
        ]
    )
)
