import { Array } from "effect"
import { Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    ChangedComposer,
    ChangedRoute,
    DismissedNotice,
    ReceivedLivePost,
    RetriedNotice,
    SubmittedPost,
    ToggledFollow,
    ToggledLike,
    ToggledOnline,
    ToggledSave,
    type Message,
} from "./threadline.message.ts"
import {
    Route,
    personForHandle,
    people,
    postsForRoute,
    type Model,
    type Post,
} from "./threadline.model.ts"

const button_class =
    "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40 [box-shadow:var(--shadow-control)]"

const postView = (model: Model, post: Post, h: HtmlBuilder<Message>): Html => {
    const author = personForHandle(post.author)
    const pending = model.pending_likes.some((item) => item.post_id === post.id)
    return h.article(
        [
            h.Class(
                "grid grid-cols-[3rem_1fr] gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4"
            ),
        ],
        [
            h.button(
                [
                    h.Type("button"),
                    h.OnClick(
                        ChangedRoute({
                            route: Route.cases.Profile.make({
                                handle: author.handle,
                            }),
                        })
                    ),
                    h.Class(
                        "flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
                    ),
                    h.Style({ backgroundColor: author.accent }),
                ],
                [author.initials]
            ),
            h.div(
                [],
                [
                    h.header(
                        [h.Class("flex flex-wrap items-baseline gap-2")],
                        [
                            h.strong([], [author.name]),
                            h.span(
                                [h.Class("text-sm text-muted-foreground")],
                                [`@${author.handle} · ${post.time}`]
                            ),
                            post.status === "Sending"
                                ? h.span(
                                      [
                                          h.Class(
                                              "text-xs text-muted-foreground"
                                          ),
                                      ],
                                      ["Sending…"]
                                  )
                                : post.author === "avery"
                                  ? h.span(
                                        [h.Class("text-xs text-primary")],
                                        ["Published"]
                                    )
                                  : h.span([], []),
                        ]
                    ),
                    h.p([h.Class("mt-2 leading-7")], [post.body]),
                    h.footer(
                        [h.Class("mt-4 flex flex-wrap gap-2")],
                        [
                            h.span(
                                [
                                    h.Class(
                                        `${button_class} text-muted-foreground`
                                    ),
                                ],
                                [`Replies ${post.replies}`]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(ToggledLike({ id: post.id })),
                                    h.Disabled(pending),
                                    h.Class(
                                        `${button_class} ${post.liked ? "bg-muted text-primary" : ""}`
                                    ),
                                ],
                                [
                                    `${post.liked ? "Liked" : "Like"} ${post.likes}`,
                                ]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(ToggledSave({ id: post.id })),
                                    h.Class(
                                        `${button_class} ${post.saved ? "bg-muted text-primary" : ""}`
                                    ),
                                ],
                                [post.saved ? "Saved" : "Save"]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
}

const profileView = (
    model: Model,
    handle: string,
    h: HtmlBuilder<Message>
): Html => {
    const person = personForHandle(handle)
    const following = model.following.includes(handle)
    return h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-6"
            ),
        ],
        [
            h.div(
                [h.Class("flex flex-wrap items-start justify-between gap-4")],
                [
                    h.div(
                        [h.Class("flex gap-4")],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-white"
                                    ),
                                    h.Style({ backgroundColor: person.accent }),
                                ],
                                [person.initials]
                            ),
                            h.div(
                                [],
                                [
                                    h.h1(
                                        [h.Class("text-2xl font-bold")],
                                        [person.name]
                                    ),
                                    h.p(
                                        [h.Class("text-muted-foreground")],
                                        [`@${person.handle}`]
                                    ),
                                    h.p(
                                        [h.Class("mt-2 max-w-xl")],
                                        [person.bio]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    handle === "avery"
                        ? h.span([], [])
                        : h.button(
                              [
                                  h.Type("button"),
                                  h.OnClick(ToggledFollow({ handle })),
                                  h.Class(button_class),
                              ],
                              [following ? "Unfollow" : "Follow"]
                          ),
                ]
            ),
            h.div(
                [h.Class("mt-5 flex gap-6 text-sm")],
                [
                    h.span([], [`${person.following} following`]),
                    h.span([], [`${person.followers} followers`]),
                ]
            ),
        ]
    )
}

const threadlineView = (model: Model, h: HtmlBuilder<Message>): Html => {
    const visible = postsForRoute(model.posts, model.route)
    const heading = Route.match(model.route, {
        Home: () => "Home timeline",
        Saved: () => "Saved posts",
        Profile: ({ handle }) => personForHandle(handle).name,
    })
    return h.div(
        [h.Class("grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)_15rem]")],
        [
            h.aside(
                [
                    h.Class(
                        "space-y-2 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4"
                    ),
                ],
                [
                    h.p([h.Class("mb-4 text-xl font-bold")], ["Threadline"]),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(
                                ChangedRoute({
                                    route: Route.cases.Home.make({}),
                                })
                            ),
                            h.Class(`${button_class} w-full justify-start`),
                        ],
                        ["Home"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(
                                ChangedRoute({
                                    route: Route.cases.Saved.make({}),
                                })
                            ),
                            h.Class(`${button_class} w-full justify-start`),
                        ],
                        ["Saved"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(
                                ChangedRoute({
                                    route: Route.cases.Profile.make({
                                        handle: "avery",
                                    }),
                                })
                            ),
                            h.Class(`${button_class} w-full justify-start`),
                        ],
                        ["Profile"]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(ToggledOnline()),
                            h.Class(`${button_class} mt-5 w-full`),
                        ],
                        [model.online ? "Work offline" : "Reconnect"]
                    ),
                ]
            ),
            h.main(
                [h.Class("min-w-0 space-y-4")],
                [
                    !model.online
                        ? h.div(
                              [
                                  h.Class(
                                      "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted p-4"
                                  ),
                              ],
                              [
                                  h.strong([], ["You’re offline."]),
                                  h.span(
                                      [
                                          h.Class(
                                              "ml-2 text-sm text-muted-foreground"
                                          ),
                                      ],
                                      [
                                          "Optimistic changes roll back and remain retryable.",
                                      ]
                                  ),
                              ]
                          )
                        : h.span([], []),
                    ...model.notices.map((notice) =>
                        h.keyed("div")(
                            notice.id,
                            [
                                h.Class(
                                    `rounded-lg border p-4 ${notice.tone === "Error" ? "border-destructive/40" : "border-border"}`
                                ),
                            ],
                            [
                                h.strong([], [notice.title]),
                                h.p(
                                    [
                                        h.Class(
                                            "mt-1 text-sm text-muted-foreground"
                                        ),
                                    ],
                                    [notice.detail]
                                ),
                                h.div(
                                    [h.Class("mt-2 flex gap-2")],
                                    [
                                        notice.retry_kind !== "None"
                                            ? h.button(
                                                  [
                                                      h.Type("button"),
                                                      h.OnClick(
                                                          RetriedNotice({
                                                              id: notice.id,
                                                          })
                                                      ),
                                                      h.Disabled(!model.online),
                                                      h.Class(button_class),
                                                  ],
                                                  ["Retry"]
                                              )
                                            : h.span([], []),
                                        h.button(
                                            [
                                                h.Type("button"),
                                                h.OnClick(
                                                    DismissedNotice({
                                                        id: notice.id,
                                                    })
                                                ),
                                                h.Class(button_class),
                                            ],
                                            ["Dismiss"]
                                        ),
                                    ]
                                ),
                            ]
                        )
                    ),
                    Route.match(model.route, {
                        Home: () =>
                            h.section(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4"
                                    ),
                                ],
                                [
                                    h.label(
                                        [h.Class("sr-only")],
                                        ["What would you like to share?"]
                                    ),
                                    h.textarea([
                                        h.Rows(4),
                                        h.Value(model.composer),
                                        h.OnInput((value) =>
                                            ChangedComposer({ value })
                                        ),
                                        h.Placeholder(
                                            "What would you like to share?"
                                        ),
                                        h.Class(
                                            "w-full resize-none bg-transparent p-2 outline-none"
                                        ),
                                    ]),
                                    h.div(
                                        [
                                            h.Class(
                                                "flex items-center justify-between border-t-(length:--surface-border-width) border-border pt-3"
                                            ),
                                        ],
                                        [
                                            h.span(
                                                [
                                                    h.Class(
                                                        "text-sm text-muted-foreground"
                                                    ),
                                                ],
                                                [
                                                    `${280 - model.composer.length} characters remaining`,
                                                ]
                                            ),
                                            h.button(
                                                [
                                                    h.Type("button"),
                                                    h.OnClick(SubmittedPost()),
                                                    h.Disabled(
                                                        model.composer.trim() ===
                                                            ""
                                                    ),
                                                    h.Class(button_class),
                                                ],
                                                ["Post"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        Saved: () => h.span([], []),
                        Profile: ({ handle }) => profileView(model, handle, h),
                    }),
                    h.header(
                        [h.Class("flex items-center justify-between")],
                        [
                            h.h2([h.Class("text-2xl font-bold")], [heading]),
                            model.route._tag === "Home"
                                ? h.button(
                                      [
                                          h.Type("button"),
                                          h.OnClick(ReceivedLivePost()),
                                          h.Class(button_class),
                                      ],
                                      ["Receive live post"]
                                  )
                                : h.span([], []),
                        ]
                    ),
                    Array.match(visible, {
                        onEmpty: () =>
                            h.div(
                                [
                                    h.Class(
                                        "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card py-16 text-center"
                                    ),
                                ],
                                [
                                    h.h3(
                                        [h.Class("text-xl font-bold")],
                                        [
                                            model.route._tag === "Saved"
                                                ? "No saved posts yet"
                                                : model.route._tag === "Profile"
                                                  ? `${heading} has not posted yet`
                                                  : "Your timeline is quiet",
                                        ]
                                    ),
                                    h.p(
                                        [h.Class("mt-2 text-muted-foreground")],
                                        [
                                            model.route._tag === "Saved"
                                                ? "Bookmark a useful post and it will wait for you here."
                                                : "This quiet timeline is ready for a first update.",
                                        ]
                                    ),
                                ]
                            ),
                        onNonEmpty: (posts) =>
                            h.div(
                                [h.Class("space-y-3")],
                                posts.map((post) =>
                                    h.keyed("div")(
                                        post.id,
                                        [],
                                        [postView(model, post, h)]
                                    )
                                )
                            ),
                    }),
                ]
            ),
            h.aside(
                [
                    h.Class(
                        "hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4 lg:block"
                    ),
                ],
                [
                    h.p(
                        [
                            h.Class(
                                "text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                            ),
                        ],
                        ["People to follow"]
                    ),
                    h.div(
                        [h.Class("mt-4 space-y-3")],
                        people
                            .filter((person) => person.handle !== "avery")
                            .slice(0, 3)
                            .map((person) =>
                                h.div(
                                    [
                                        h.Class(
                                            "flex items-center justify-between gap-2"
                                        ),
                                    ],
                                    [
                                        h.button(
                                            [
                                                h.Type("button"),
                                                h.OnClick(
                                                    ChangedRoute({
                                                        route: Route.cases.Profile.make(
                                                            {
                                                                handle: person.handle,
                                                            }
                                                        ),
                                                    })
                                                ),
                                                h.Class(
                                                    "text-left text-sm font-medium hover:underline"
                                                ),
                                            ],
                                            [person.name]
                                        ),
                                        h.button(
                                            [
                                                h.Type("button"),
                                                h.OnClick(
                                                    ToggledFollow({
                                                        handle: person.handle,
                                                    })
                                                ),
                                                h.Class(button_class),
                                            ],
                                            [
                                                model.following.includes(
                                                    person.handle
                                                )
                                                    ? "Following"
                                                    : "Follow",
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
export const view = Submodel.defineView<Model, Message>(threadlineView)
