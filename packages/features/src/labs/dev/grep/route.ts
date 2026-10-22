import { Schema } from "effect"
import { SearchRequest } from "./transport.ts"

const grep_path = "/dev/grep"

export const grep_href = () => `${grep_path}/`

export const is_grep_path = (pathname: string): boolean =>
    pathname === grep_path || pathname === `${grep_path}/`

export const grep_query_from_url = (href: string): string | undefined => {
    const separator = href.indexOf("?")
    const path = separator === -1 ? href : href.slice(0, separator)
    if (!is_grep_path(path)) return undefined
    return (
        new URLSearchParams(
            separator === -1 ? "" : href.slice(separator + 1)
        ).get("q") ?? "Schema.Struct"
    )
}

export const grep_url_href = (query: string, state?: SearchRequest) =>
    `${grep_path}?${new URLSearchParams(state === undefined ? { q: query } : { q: query, state: JSON.stringify(state) })}`

export const grep_request_from_url = (
    href: string
): SearchRequest | undefined => {
    const query = grep_query_from_url(href)
    if (query === undefined) return undefined
    const raw = new URLSearchParams(href.slice(href.indexOf("?") + 1)).get(
        "state"
    )
    if (raw === null) return undefined
    try {
        if (raw.length > 16_384) return undefined
        return Schema.decodeUnknownSync(SearchRequest)({
            ...Schema.decodeUnknownSync(SearchRequest)(JSON.parse(raw)),
            query,
        })
    } catch {
        return undefined
    }
}
