import { Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import { Button } from "@urm/ui/foldkit/button/button.view.ts"
import type { Model, Bookmark } from "./bookmarks.model.ts"
import {
    ClickedCancelBookmark,
    ClickedDeleteBookmark,
    ClickedEditBookmark,
    SubmittedBookmark,
    UpdatedBookmarkHref,
    UpdatedBookmarkQuery,
    UpdatedBookmarkTags,
    UpdatedBookmarkTitle,
    type Message,
} from "./bookmarks.message.ts"

const input_class =
    "mt-1.5 block w-full rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"

const filtered_bookmarks = (model: Model): ReadonlyArray<Bookmark> => {
    const query = model.query.trim().toLowerCase()
    if (query === "") return model.bookmarks
    return model.bookmarks.filter(
        (bookmark) =>
            bookmark.title.toLowerCase().includes(query) ||
            bookmark.href.toLowerCase().includes(query) ||
            bookmark.tags.some((tag) => tag.toLowerCase().includes(query))
    )
}

export const view = <ParentMessage>(
    model: Model,
    to_parent_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const is_saving = model.status === "saving"
    const cannot_write = is_saving || model.can_write === false
    const bookmarks = filtered_bookmarks(model)
    return h.main(
        [h.Class("mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 sm:px-6")],
        [
            h.header(
                [h.Class("grid gap-1")],
                [
                    h.h1(
                        [h.Class("text-2xl font-semibold tracking-tight")],
                        ["Bookmarks"]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            "Manage reusable links offered to Web, email, social, and rich-text editors.",
                        ]
                    ),
                ]
            ),
            h.form(
                [
                    h.Class(
                        "grid gap-4 rounded-[var(--radius-frame)] border border-border bg-card p-5"
                    ),
                    h.OnSubmit(to_parent_message(SubmittedBookmark())),
                ],
                [
                    h.h2(
                        [h.Class("text-lg font-semibold")],
                        [
                            Option.isSome(model.editing_id)
                                ? "Edit saved link"
                                : "Add saved link",
                        ]
                    ),
                    h.label(
                        [
                            h.For("saved-link-title"),
                            h.Class("grid text-sm font-medium"),
                        ],
                        [
                            "Title",
                            h.input([
                                h.Id("saved-link-title"),
                                h.Type("text"),
                                h.Value(model.title),
                                h.Required(true),
                                h.Disabled(cannot_write),
                                h.OnInput((value) =>
                                    to_parent_message(
                                        UpdatedBookmarkTitle({ value })
                                    )
                                ),
                                h.Class(input_class),
                            ]),
                        ]
                    ),
                    h.label(
                        [
                            h.For("saved-link-href"),
                            h.Class("grid text-sm font-medium"),
                        ],
                        [
                            "URL or anchor",
                            h.input([
                                h.Id("saved-link-href"),
                                h.Type("text"),
                                h.Value(model.href),
                                h.Required(true),
                                h.Disabled(cannot_write),
                                h.Placeholder(
                                    "https://example.com or #section"
                                ),
                                h.OnInput((value) =>
                                    to_parent_message(
                                        UpdatedBookmarkHref({ value })
                                    )
                                ),
                                h.Class(input_class),
                            ]),
                        ]
                    ),
                    h.label(
                        [
                            h.For("saved-link-tags"),
                            h.Class("grid text-sm font-medium"),
                        ],
                        [
                            "Tags",
                            h.input([
                                h.Id("saved-link-tags"),
                                h.Type("text"),
                                h.Value(model.tags),
                                h.Disabled(cannot_write),
                                h.Placeholder("docs, support, internal"),
                                h.OnInput((value) =>
                                    to_parent_message(
                                        UpdatedBookmarkTags({ value })
                                    )
                                ),
                                h.Class(input_class),
                            ]),
                            h.span(
                                [h.Class("mt-1 text-xs text-muted-foreground")],
                                ["Separate tags with commas."]
                            ),
                        ]
                    ),
                    Option.isSome(model.error)
                        ? h.p(
                              [
                                  h.Class("text-sm text-destructive"),
                                  h.Role("alert"),
                              ],
                              [model.error.value]
                          )
                        : "",
                    h.div(
                        [h.Class("flex flex-wrap gap-2")],
                        [
                            Button<ParentMessage>(
                                {
                                    type: "submit",
                                    isDisabled: cannot_write,
                                    children: [
                                        is_saving
                                            ? "Saving…"
                                            : Option.isSome(model.editing_id)
                                              ? "Save link"
                                              : "Add link",
                                    ],
                                },
                                h
                            ),
                            ...(Option.isSome(model.editing_id)
                                ? [
                                      Button<ParentMessage>(
                                          {
                                              variant: "secondary",
                                              onClick: to_parent_message(
                                                  ClickedCancelBookmark()
                                              ),
                                              isDisabled: cannot_write,
                                              children: ["Cancel"],
                                          },
                                          h
                                      ),
                                  ]
                                : []),
                        ]
                    ),
                ]
            ),
            h.section(
                [h.Class("grid gap-4")],
                [
                    h.div(
                        [
                            h.Class(
                                "flex flex-wrap items-end justify-between gap-3"
                            ),
                        ],
                        [
                            h.h2(
                                [h.Class("text-lg font-semibold")],
                                [`Bookmarks (${model.bookmarks.length})`]
                            ),
                            h.label(
                                [
                                    h.For("saved-links-filter"),
                                    h.Class(
                                        "grid w-full text-sm font-medium sm:w-72"
                                    ),
                                ],
                                [
                                    "Filter bookmarks",
                                    h.input([
                                        h.Id("saved-links-filter"),
                                        h.Type("search"),
                                        h.Value(model.query),
                                        h.OnInput((value) =>
                                            to_parent_message(
                                                UpdatedBookmarkQuery({ value })
                                            )
                                        ),
                                        h.Class(input_class),
                                    ]),
                                ]
                            ),
                        ]
                    ),
                    bookmarks.length === 0
                        ? h.p(
                              [
                                  h.Class("text-sm text-muted-foreground"),
                                  h.Role("status"),
                              ],
                              [
                                  model.status === "loading"
                                      ? "Loading bookmarks…"
                                      : "No bookmarks found.",
                              ]
                          )
                        : h.ul(
                              [h.Class("grid gap-3")],
                              bookmarks.map((bookmark) =>
                                  h.keyed("li")(
                                      bookmark.id,
                                      [
                                          h.Class(
                                              "grid gap-3 rounded-[var(--radius-surface)] border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                                          ),
                                      ],
                                      [
                                          h.div(
                                              [h.Class("min-w-0")],
                                              [
                                                  h.a(
                                                      [
                                                          h.Href(bookmark.href),
                                                          h.Class(
                                                              "font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                                          ),
                                                      ],
                                                      [bookmark.title]
                                                  ),
                                                  h.p(
                                                      [
                                                          h.Class(
                                                              "mt-1 break-all text-sm text-muted-foreground"
                                                          ),
                                                      ],
                                                      [bookmark.href]
                                                  ),
                                                  bookmark.tags.length === 0
                                                      ? ""
                                                      : h.p(
                                                            [
                                                                h.Class(
                                                                    "mt-2 text-xs text-muted-foreground"
                                                                ),
                                                            ],
                                                            [
                                                                bookmark.tags.join(
                                                                    ", "
                                                                ),
                                                            ]
                                                        ),
                                              ]
                                          ),
                                          h.div(
                                              [h.Class("flex gap-2")],
                                              [
                                                  Button<ParentMessage>(
                                                      {
                                                          variant: "secondary",
                                                          isDisabled:
                                                              cannot_write,
                                                          attributes: [
                                                              h.AriaLabel(
                                                                  `Edit ${bookmark.title}`
                                                              ),
                                                          ],
                                                          onClick:
                                                              to_parent_message(
                                                                  ClickedEditBookmark(
                                                                      {
                                                                          bookmark,
                                                                      }
                                                                  )
                                                              ),
                                                          children: ["Edit"],
                                                      },
                                                      h
                                                  ),
                                                  Button<ParentMessage>(
                                                      {
                                                          variant: "secondary",
                                                          isDisabled:
                                                              cannot_write,
                                                          attributes: [
                                                              h.AriaLabel(
                                                                  `Delete ${bookmark.title}`
                                                              ),
                                                          ],
                                                          className:
                                                              "text-destructive hover:bg-destructive/10",
                                                          onClick:
                                                              to_parent_message(
                                                                  ClickedDeleteBookmark(
                                                                      {
                                                                          bookmark_id:
                                                                              bookmark.id,
                                                                      }
                                                                  )
                                                              ),
                                                          children: ["Delete"],
                                                      },
                                                      h
                                                  ),
                                              ]
                                          ),
                                      ]
                                  )
                              )
                          ),
                ]
            ),
        ]
    )
}
