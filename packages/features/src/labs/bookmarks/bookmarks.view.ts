import { Array, Order } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import bookmarks, { type Bookmark } from "./sample-data.ts"
import {
    UpdatedBookmarkSearchQuery,
    type Message,
} from "./bookmarks.message.ts"
import type { Model } from "./bookmarks.model.ts"

const allBookmarks: ReadonlyArray<Bookmark> = Array.sortWith(
    Array.flatMap(bookmarks, (bookmark) => [bookmark, ...bookmark.paths]),
    (bookmark) => bookmark.title,
    Order.String
)

const hasMatchingTag = (bookmark: Bookmark, normalisedQuery: string): boolean =>
    Array.some(bookmark.tags, (tag) =>
        tag.toLowerCase().includes(normalisedQuery)
    )

export const filterBookmarks = (query: string): ReadonlyArray<Bookmark> => {
    const normalisedQuery = query.trim().toLowerCase()

    if (normalisedQuery === "") {
        return allBookmarks
    }

    return Array.filter(allBookmarks, (bookmark) =>
        hasMatchingTag(bookmark, normalisedQuery)
    )
}

const bookmarkView = <ParentMessage>(
    bookmark: Bookmark,
    h: HtmlBuilder<ParentMessage>
): Html => {
    return h.keyed("li")(
        bookmark.url,
        [
            h.Class(
                "w-full min-w-0 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4"
            ),
        ],
        [
            h.a(
                [
                    h.Href(bookmark.url),
                    h.Target("_blank"),
                    h.Rel("noopener noreferrer"),
                    h.Class(
                        "font-medium text-primary underline-offset-4 hover:underline"
                    ),
                ],
                [bookmark.title]
            ),
            h.p(
                [h.Class("mt-1 break-all text-sm text-muted-foreground")],
                [bookmark.url]
            ),
            h.ul(
                [h.Class("mt-3 flex flex-wrap gap-2")],
                Array.map(bookmark.tags, (tag) =>
                    h.li(
                        [
                            h.Class(
                                "rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                            ),
                        ],
                        [tag]
                    )
                )
            ),
        ]
    )
}

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const matchingBookmarks = filterBookmarks(model.query)

    return h.section(
        [h.Class("w-full min-w-0 space-y-6")],
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
                        ["Bookmarks"]
                    ),
                    h.p(
                        [h.Class("text-muted-foreground")],
                        ["Filter bookmarks by tag."]
                    ),
                ]
            ),
            h.div(
                [h.Class("w-full")],
                [
                    h.label(
                        [
                            h.For("bookmark-tag-filter"),
                            h.Class("text-sm font-medium text-foreground"),
                        ],
                        ["Tags"]
                    ),
                    h.input([
                        h.Id("bookmark-tag-filter"),
                        h.Type("search"),
                        h.Value(model.query),
                        h.Placeholder("Filter by tag"),
                        h.OnInput((value) =>
                            toParentMessage(
                                UpdatedBookmarkSearchQuery({ value })
                            )
                        ),
                        h.Class(
                            "mt-1.5 block w-full min-w-0 rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                        ),
                    ]),
                ]
            ),
            Array.isReadonlyArrayEmpty(matchingBookmarks)
                ? h.p(
                      [
                          h.Class("text-sm text-muted-foreground"),
                          h.Role("status"),
                      ],
                      ["No bookmarks match that tag."]
                  )
                : h.ul(
                      [h.Class("grid w-full gap-3")],
                      Array.map(matchingBookmarks, (bookmark) =>
                          bookmarkView<ParentMessage>(bookmark, h)
                      )
                  ),
        ]
    )
}
