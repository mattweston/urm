import { Option } from "effect"
import type { Url } from "foldkit/url"
import type { Model } from "@urm/features/labs/dev/submodel"
import { restore_query, restore_navigation } from "@urm/features/labs/dev/grep"
import {
    grep_query_from_url,
    grep_request_from_url,
} from "@urm/features/labs/dev/grep/route"

export const restore_grep_route = (model: Model, url: Url): Model => {
    const search = Option.getOrElse(url.search, () => "").replace(/^\?/, "")
    const route = search === "" ? url.pathname : `${url.pathname}?${search}`
    const state = grep_request_from_url(route)
    if (state !== undefined)
        return { ...model, grep: restore_navigation(model.grep, state) }
    const query = grep_query_from_url(route)
    return query === undefined
        ? model
        : { ...model, grep: restore_query(model.grep, query) }
}
