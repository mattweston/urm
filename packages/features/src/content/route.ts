import { Option, Schema as S } from "effect"

import { ContentKind, type ContentKind as ContentKindType } from "./catalog.ts"

export const content_href = (): string => "/content"
export const content_new_href = (): string => "/content/new"
export const content_documents_href = (): string => "/content/documents"
export const content_documents_new_href = (): string => "/content/documents/new"
export const content_blog_new_href = (): string => "/content/blog/new"
export const content_email_new_href = (): string => "/content/email/new"
export const content_form_new_href = (): string => "/content/form/new"
export const content_bookmarks_href = (): string => "/content/bookmarks"
export const content_social_new_href = (): string => "/content/social/new"
export const content_templates_href = (): string => "/content/templates"

export const ContentRoute = "index"
export const ContentNewRoute = "new"
export const ContentDocumentsRoute = "documents"
export const ContentBookmarksRoute = "bookmarks"
export const ContentTemplatesRoute = "templates"
export const ContentItemRoute = "item"
export const ContentNotFoundRoute = "not_found"

export type ContentItemLocation = Readonly<{
    content_kind: ContentKindType
    content_id: string
}>

export const content_item_href = (
    content_kind: ContentKindType,
    content_id: string
): string =>
    `/content/${encodeURIComponent(content_kind)}/${encodeURIComponent(content_id)}`

export const content_email_draft_href = (
    draft_id: string,
    edit = false
): string => {
    const href = content_item_href("email", draft_id)
    return edit ? `${href}?mode=edit` : href
}

export const content_item_route_for_path = (
    pathname: string
): ContentItemLocation | null => {
    const match = /^\/content\/([^/]+)\/([^/]+)\/?$/.exec(pathname)
    const encoded_kind = match?.[1]
    const encoded_id = match?.[2]
    if (encoded_kind === undefined || encoded_id === undefined) return null

    try {
        const content_kind = S.decodeUnknownOption(ContentKind)(
            decodeURIComponent(encoded_kind)
        )
        if (Option.isNone(content_kind)) return null
        const content_id = decodeURIComponent(encoded_id)
        return content_id === ""
            ? null
            : { content_kind: content_kind.value, content_id }
    } catch {
        return null
    }
}

export const content_item_id_for_path = (
    pathname: string,
    content_kind: ContentKindType
): string | null => {
    const item = content_item_route_for_path(pathname)
    return item === null || item.content_kind !== content_kind
        ? null
        : item.content_id
}

export const is_content_creation_path = (
    pathname: string,
    content_kind: ContentKindType
): boolean => content_item_id_for_path(pathname, content_kind) === "new"

export const is_content_edit_requested = (search: string): boolean =>
    new URLSearchParams(search).get("mode") === "edit"

export const content_email_draft_id_for_path = (
    pathname: string
): string | null => {
    const draft_id = content_item_id_for_path(pathname, "email")
    return draft_id === "new" ? null : draft_id
}

export const is_content_email_path = (pathname: string): boolean =>
    is_content_creation_path(pathname, "email") ||
    content_email_draft_id_for_path(pathname) !== null

export type Route =
    | typeof ContentRoute
    | typeof ContentNewRoute
    | typeof ContentDocumentsRoute
    | typeof ContentBookmarksRoute
    | typeof ContentTemplatesRoute
    | typeof ContentItemRoute
    | typeof ContentNotFoundRoute

export const route_for_path = (pathname: string): Route => {
    const path = pathname.replace(/\/$/, "")
    if (path === content_href()) return ContentRoute
    if (path === content_new_href()) return ContentNewRoute
    if (path === content_documents_href()) return ContentDocumentsRoute
    if (path === content_bookmarks_href()) return ContentBookmarksRoute
    if (path === content_templates_href()) return ContentTemplatesRoute
    if (content_item_route_for_path(path) !== null) return ContentItemRoute
    return ContentNotFoundRoute
}
