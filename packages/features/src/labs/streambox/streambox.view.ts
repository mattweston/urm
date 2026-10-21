import { Array, Match as M } from "effect"
import { Submodel } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    ChangedCatalogQuery,
    ChangedCommentQuery,
    ChangedCommentSort,
    ChangedVideo,
    SelectedPanel,
    SoughtVideo,
    ToggledFollow,
    ToggledLike,
    ToggledMute,
    ToggledOnline,
    ToggledPlayback,
    ToggledSave,
    ToggledTheater,
    type Message,
} from "./streambox.message.ts"
import {
    commentsForVideo,
    videoForId,
    videos,
    type Model,
} from "./streambox.model.ts"

const button_class =
    "inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40 [box-shadow:var(--shadow-control)]"
const formatTime = (time: number) =>
    `0:${String(Math.round(time)).padStart(2, "0")}`

const overviewView = (model: Model, h: HtmlBuilder<Message>): Html => {
    const video = videoForId(model.video_id)
    return h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5"
            ),
        ],
        [
            h.p(
                [h.Class("leading-7 text-muted-foreground")],
                [video.description]
            ),
            h.h2([h.Class("mt-6 text-lg font-bold")], ["Chapters"]),
            h.div(
                [h.Class("mt-3 grid gap-2 sm:grid-cols-3")],
                video.chapters.map((chapter) =>
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(SoughtVideo({ time: chapter.start })),
                            h.Class(`${button_class} justify-start`),
                        ],
                        [`${formatTime(chapter.start)} · ${chapter.title}`]
                    )
                )
            ),
        ]
    )
}

const commentsView = (model: Model, h: HtmlBuilder<Message>): Html => {
    const query = model.comment_query.trim().toLocaleLowerCase()
    const comments = commentsForVideo(model.video_id).filter(
        (comment) =>
            query === "" ||
            `${comment.author} ${comment.body}`
                .toLocaleLowerCase()
                .includes(query)
    )
    const visible =
        model.comment_sort === "Newest"
            ? comments.toReversed().slice(0, 30)
            : comments.slice(0, 30)
    return h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5"
            ),
        ],
        [
            h.div(
                [h.Class("flex flex-wrap items-center justify-between gap-3")],
                [
                    h.h2([h.Class("text-xl font-bold")], ["180 comments"]),
                    h.div(
                        [h.Class("flex gap-2")],
                        [
                            h.input([
                                h.Value(model.comment_query),
                                h.OnInput((value) =>
                                    ChangedCommentQuery({ value })
                                ),
                                h.Placeholder("Search comments"),
                                h.Class(
                                    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2"
                                ),
                            ]),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(
                                        ChangedCommentSort({
                                            sort:
                                                model.comment_sort ===
                                                "Featured"
                                                    ? "Newest"
                                                    : "Featured",
                                        })
                                    ),
                                    h.Class(button_class),
                                ],
                                [model.comment_sort]
                            ),
                        ]
                    ),
                ]
            ),
            Array.match(visible, {
                onEmpty: () =>
                    h.div(
                        [h.Class("py-12 text-center")],
                        [
                            h.h3([h.Class("font-bold")], ["No comments found"]),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.OnClick(
                                        ChangedCommentQuery({ value: "" })
                                    ),
                                    h.Class(`${button_class} mt-3`),
                                ],
                                ["Clear comment search"]
                            ),
                        ]
                    ),
                onNonEmpty: (items) =>
                    h.div(
                        [h.Class("mt-4 max-h-[600px] space-y-3 overflow-auto")],
                        items.map((comment) =>
                            h.article(
                                [
                                    h.Class(
                                        "grid grid-cols-[2.5rem_1fr] gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border p-3 bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
                                    ),
                                ],
                                [
                                    h.div(
                                        [
                                            h.Class(
                                                "flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-bold"
                                            ),
                                        ],
                                        [comment.initials]
                                    ),
                                    h.div(
                                        [],
                                        [
                                            h.header(
                                                [
                                                    h.Class(
                                                        "flex flex-wrap gap-2"
                                                    ),
                                                ],
                                                [
                                                    h.strong(
                                                        [],
                                                        [comment.author]
                                                    ),
                                                    h.span(
                                                        [
                                                            h.Class(
                                                                "text-xs text-muted-foreground"
                                                            ),
                                                        ],
                                                        [comment.when]
                                                    ),
                                                    comment.creator_liked
                                                        ? h.span(
                                                              [
                                                                  h.Class(
                                                                      "text-xs text-primary"
                                                                  ),
                                                              ],
                                                              ["Creator liked"]
                                                          )
                                                        : h.span([], []),
                                                ]
                                            ),
                                            h.p(
                                                [h.Class("mt-1")],
                                                [comment.body]
                                            ),
                                            h.button(
                                                [
                                                    h.Type("button"),
                                                    h.OnClick(
                                                        SoughtVideo({
                                                            time: comment.timecode,
                                                        })
                                                    ),
                                                    h.Class(
                                                        "mt-2 text-sm font-medium text-primary hover:underline"
                                                    ),
                                                ],
                                                [formatTime(comment.timecode)]
                                            ),
                                            h.span(
                                                [
                                                    h.Class(
                                                        "ml-3 text-xs text-muted-foreground"
                                                    ),
                                                ],
                                                [`${comment.likes} likes`]
                                            ),
                                        ]
                                    ),
                                ]
                            )
                        )
                    ),
            }),
        ]
    )
}

const transcriptView = (model: Model, h: HtmlBuilder<Message>): Html => {
    const video = videoForId(model.video_id)
    return h.section(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5"
            ),
        ],
        [
            h.h2([h.Class("text-xl font-bold")], ["Interactive transcript"]),
            h.div(
                [h.Class("mt-4 space-y-2")],
                video.transcript.map((cue) =>
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(SoughtVideo({ time: cue.start })),
                            h.Class(
                                `grid w-full grid-cols-[3rem_1fr] rounded-lg p-3 text-left hover:bg-muted ${model.current_time >= cue.start && model.current_time < cue.start + 2 ? "bg-muted" : ""}`
                            ),
                        ],
                        [
                            h.span(
                                [h.Class("font-mono text-sm text-primary")],
                                [formatTime(cue.start)]
                            ),
                            h.span([], [cue.text]),
                        ]
                    )
                )
            ),
        ]
    )
}

const streamboxView = (model: Model, h: HtmlBuilder<Message>): Html => {
    const video = videoForId(model.video_id)
    const liked = model.liked_video_ids.includes(model.video_id)
    const saved = model.saved_video_ids.includes(model.video_id)
    const followed = model.followed_creators.includes(video.creator)
    const catalog_query = model.catalog_query.trim().toLocaleLowerCase()
    const recommendations = videos.filter(
        (item) =>
            catalog_query === "" ||
            `${item.title} ${item.creator}`
                .toLocaleLowerCase()
                .includes(catalog_query)
    )
    return h.div(
        [
            h.Class(
                `grid gap-5 ${model.is_theater ? "" : "xl:grid-cols-[1fr_19rem]"}`
            ),
        ],
        [
            h.main(
                [h.Class("min-w-0 space-y-4")],
                [
                    !model.is_online
                        ? h.div(
                              [
                                  h.Class(
                                      "flex items-center justify-between rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted p-3"
                                  ),
                              ],
                              [
                                  h.span(
                                      [],
                                      [
                                          "This video stays available; actions sync on reconnect.",
                                      ]
                                  ),
                                  h.button(
                                      [
                                          h.Type("button"),
                                          h.OnClick(ToggledOnline()),
                                          h.Class(button_class),
                                      ],
                                      ["Reconnect"]
                                  ),
                              ]
                          )
                        : h.span([], []),
                    h.section(
                        [
                            h.Class(
                                "overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-black text-white"
                            ),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "relative flex aspect-video items-center justify-center overflow-hidden"
                                    ),
                                    h.Style({
                                        background: `radial-gradient(circle at 30% 30%, ${video.accent}, #111827 65%)`,
                                    }),
                                ],
                                [
                                    h.div(
                                        [h.Class("text-center")],
                                        [
                                            h.p(
                                                [
                                                    h.Class(
                                                        "text-xs uppercase tracking-[0.3em] opacity-70"
                                                    ),
                                                ],
                                                [video.category]
                                            ),
                                            h.p(
                                                [
                                                    h.Class(
                                                        "mt-2 text-3xl font-bold"
                                                    ),
                                                ],
                                                [video.creator]
                                            ),
                                            h.p(
                                                [h.Class("mt-2 font-mono")],
                                                [formatTime(model.current_time)]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                            h.div(
                                [
                                    h.Class(
                                        "flex flex-wrap items-center gap-3 p-3"
                                    ),
                                ],
                                [
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.OnClick(ToggledPlayback()),
                                            h.Class(button_class),
                                        ],
                                        [
                                            model.is_playing
                                                ? "Pause video"
                                                : "Play video",
                                        ]
                                    ),
                                    h.span(
                                        [h.Class("text-sm tabular-nums")],
                                        [
                                            `${formatTime(model.current_time)} / ${formatTime(model.duration)}`,
                                        ]
                                    ),
                                    h.input([
                                        h.Type("range"),
                                        h.Min("0"),
                                        h.Max(String(model.duration)),
                                        h.Step("0.1"),
                                        h.Value(String(model.current_time)),
                                        h.OnInput((value) =>
                                            SoughtVideo({ time: Number(value) })
                                        ),
                                        h.Class("min-w-40 flex-1"),
                                    ]),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.OnClick(ToggledMute()),
                                            h.Class(button_class),
                                        ],
                                        [
                                            model.is_muted
                                                ? "Unmute video"
                                                : "Mute video",
                                        ]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.OnClick(ToggledTheater()),
                                            h.Class(button_class),
                                        ],
                                        [
                                            model.is_theater
                                                ? "Exit theater mode"
                                                : "Enter theater mode",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.section(
                        [
                            h.Class(
                                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-5"
                            ),
                        ],
                        [
                            h.p(
                                [
                                    h.Class(
                                        "text-xs font-semibold uppercase tracking-wider text-primary"
                                    ),
                                ],
                                [video.category]
                            ),
                            h.h1(
                                [h.Class("mt-1 text-3xl font-bold")],
                                [video.title]
                            ),
                            h.p(
                                [h.Class("mt-2 text-sm text-muted-foreground")],
                                [`${video.views} · ${video.published}`]
                            ),
                            h.div(
                                [h.Class("mt-4 flex flex-wrap gap-2")],
                                [
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.OnClick(ToggledLike()),
                                            h.Class(button_class),
                                        ],
                                        [liked ? "Liked" : "Like"]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.OnClick(ToggledSave()),
                                            h.Class(button_class),
                                        ],
                                        [saved ? "Saved" : "Save"]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.OnClick(ToggledFollow()),
                                            h.Class(button_class),
                                        ],
                                        [followed ? "Following" : "Follow"]
                                    ),
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.OnClick(ToggledOnline()),
                                            h.Class(button_class),
                                        ],
                                        [
                                            model.is_online
                                                ? "Go offline"
                                                : "Reconnect",
                                        ]
                                    ),
                                ]
                            ),
                            h.nav(
                                [
                                    h.Class(
                                        "mt-5 flex gap-2 border-t-(length:--surface-border-width) border-border pt-4"
                                    ),
                                ],
                                (
                                    [
                                        "Overview",
                                        "Comments",
                                        "Transcript",
                                    ] as const
                                ).map((panel) =>
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.OnClick(SelectedPanel({ panel })),
                                            h.Class(
                                                `${button_class} ${model.panel === panel ? "bg-muted" : ""}`
                                            ),
                                        ],
                                        [
                                            panel === "Comments"
                                                ? "Comments 180"
                                                : panel,
                                        ]
                                    )
                                )
                            ),
                        ]
                    ),
                    M.value(model.panel).pipe(
                        M.when("Overview", () => overviewView(model, h)),
                        M.when("Comments", () => commentsView(model, h)),
                        M.when("Transcript", () => transcriptView(model, h)),
                        M.exhaustive
                    ),
                ]
            ),
            model.is_theater
                ? h.span([], [])
                : h.aside(
                      [
                          h.Class(
                              "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card p-4"
                          ),
                      ],
                      [
                          h.h2([h.Class("font-bold")], ["Up next"]),
                          h.input([
                              h.Value(model.catalog_query),
                              h.OnInput((value) =>
                                  ChangedCatalogQuery({ value })
                              ),
                              h.Placeholder("Search videos"),
                              h.Class(
                                  "mt-3 w-full rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background px-3 py-2"
                              ),
                          ]),
                          Array.match(recommendations, {
                              onEmpty: () =>
                                  h.p(
                                      [
                                          h.Class(
                                              "mt-4 text-sm text-muted-foreground"
                                          ),
                                      ],
                                      ["No videos match that search."]
                                  ),
                              onNonEmpty: (items) =>
                                  h.div(
                                      [h.Class("mt-4 space-y-2")],
                                      items.map((item) =>
                                          h.button(
                                              [
                                                  h.Type("button"),
                                                  h.OnClick(
                                                      ChangedVideo({
                                                          id: item.id,
                                                      })
                                                  ),
                                                  h.Class(
                                                      `w-full rounded-lg border border-border p-3 text-left hover:bg-muted ${item.id === model.video_id ? "bg-muted" : ""}`
                                                  ),
                                              ],
                                              [
                                                  h.strong(
                                                      [
                                                          h.Class(
                                                              "block text-sm"
                                                          ),
                                                      ],
                                                      [item.title]
                                                  ),
                                                  h.span(
                                                      [
                                                          h.Class(
                                                              "text-xs text-muted-foreground"
                                                          ),
                                                      ],
                                                      [item.creator]
                                                  ),
                                              ]
                                          )
                                      )
                                  ),
                          }),
                      ]
                  ),
        ]
    )
}
export const view = Submodel.defineView<Model, Message>(streamboxView)
