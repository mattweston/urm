import { Option } from "effect"
import * as Ui from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    IconChevronLeft,
    IconChevronRight,
    IconGripVertical,
} from "@urm/ui/foldkit/icons/view.ts"

import * as YouTubeEmbed from "../../labs/media/youtube-embed/submodel.ts"
import {
    ChangedNewVideoTitle,
    ChangedNewVideoUrl,
    ClickedMoveVideo,
    ClickedDeleteVideo,
    ClickedSaveVideoEdits,
    ClosedVideoEditor,
    EditingVideoTitleChanged,
    EditingVideoUrlChanged,
    GotDragAndDropMessage,
    GotVideoYouTubeMessage,
    OpenedVideoEditor,
    SubmittedNewVideo,
    ToggledVideoEditing,
    ToggledVideoTheatreMode,
    type Message,
} from "../platform/app.message.ts"
import type { Model } from "../platform/app.model.ts"
import { videoDetailHref } from "../platform/route.ts"
import { video_for_slug, type Video, type VideoSlug } from "./video.ts"

const video_thumbnail_radius_class_name = "rounded-[0.5rem]"

const video_navigation_item = (
    model: Model,
    selected_slug: VideoSlug,
    video: Video,
    index: number,
    video_count: number,
    video_detail_href: (slug: VideoSlug) => string,
    show_edit_controls: boolean,
    h: HtmlBuilder<Message>
): Html => {
    const is_dragged = Option.contains(
        Ui.DragAndDrop.maybeDraggedItemId(model.dragAndDrop),
        video.id
    )
    const is_keyboard_dragged =
        model.dragAndDrop.dragState._tag === "KeyboardDragging" && is_dragged
    const is_pointer_dragged =
        model.dragAndDrop.dragState._tag === "Dragging" && is_dragged
    const is_editing = model.editing_video_id === video.id

    return h.keyed("li")(
        video.id,
        [
            h.Class(
                [
                    video.slug === selected_slug
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground transition-colors hover:bg-accent/60 hover:text-accent-foreground",
                    is_keyboard_dragged ? "outline-2 outline-primary" : "",
                    is_pointer_dragged ? "opacity-40" : "",
                ].join(" ")
            ),
            ...(show_edit_controls && !is_editing
                ? [
                      ...Ui.DragAndDrop.draggable<Message>(
                          {
                              model: model.dragAndDrop,
                              toParentMessage: (message) =>
                                  GotDragAndDropMessage({ message }),
                              itemId: video.id,
                              containerId: "media-videos",
                              index,
                          },
                          h
                      ),
                      ...Ui.DragAndDrop.sortable(video.id),
                  ]
                : []),
        ],
        [
            h.div(
                [],
                is_editing
                    ? [
                          h.form(
                              [
                                  h.Class("grid gap-3 p-3"),
                                  h.OnSubmit(ClickedSaveVideoEdits()),
                              ],
                              [
                                  h.label(
                                      [h.Class("grid gap-1 text-xs")],
                                      [
                                          h.span([], ["Title"]),
                                          h.input([
                                              h.Value(
                                                  model.editing_video_title
                                              ),
                                              h.Disabled(model.videosBusy),
                                              h.OnInput((value) =>
                                                  EditingVideoTitleChanged({
                                                      value,
                                                  })
                                              ),
                                              h.Class(
                                                  "h-9 min-w-0 rounded-[var(--radius-control)] border border-input bg-background px-3 text-sm"
                                              ),
                                          ]),
                                      ]
                                  ),
                                  h.label(
                                      [h.Class("grid gap-1 text-xs")],
                                      [
                                          h.span([], ["YouTube URL"]),
                                          h.input([
                                              h.Type("url"),
                                              h.Value(model.editing_video_url),
                                              h.Disabled(model.videosBusy),
                                              h.OnInput((value) =>
                                                  EditingVideoUrlChanged({
                                                      value,
                                                  })
                                              ),
                                              h.Class(
                                                  "h-9 min-w-0 rounded-[var(--radius-control)] border border-input bg-background px-3 text-sm"
                                              ),
                                          ]),
                                      ]
                                  ),
                                  h.div(
                                      [h.Class("flex justify-end gap-2")],
                                      [
                                          h.button(
                                              [
                                                  h.Type("button"),
                                                  h.Disabled(model.videosBusy),
                                                  h.OnClick(
                                                      ClosedVideoEditor()
                                                  ),
                                                  h.Class(
                                                      "rounded-[var(--radius-control)] border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                                                  ),
                                              ],
                                              ["Cancel"]
                                          ),
                                          h.button(
                                              [
                                                  h.Type("submit"),
                                                  h.Disabled(model.videosBusy),
                                                  h.Class(
                                                      "rounded-[var(--radius-control)] bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                                                  ),
                                              ],
                                              [
                                                  model.videosBusy
                                                      ? "Saving…"
                                                      : "Save",
                                              ]
                                          ),
                                      ]
                                  ),
                              ]
                          ),
                      ]
                    : [
                          h.a(
                              [
                                  h.Href(video_detail_href(video.slug)),
                                  ...(video.slug === selected_slug
                                      ? [h.Attribute("aria-current", "page")]
                                      : []),
                                  h.Class(
                                      "flex min-w-0 items-start gap-3 p-2 text-inherit no-underline"
                                  ),
                              ],
                              [
                                  h.div(
                                      [
                                          h.Class(
                                              "relative w-32 flex-none sm:w-40"
                                          ),
                                      ],
                                      [
                                          h.div(
                                              [
                                                  h.Class(
                                                      `aspect-video overflow-hidden ${video_thumbnail_radius_class_name}`
                                                  ),
                                              ],
                                              [
                                                  h.img([
                                                      h.Src(
                                                          video.thumbnail_src
                                                      ),
                                                      h.Alt(""),
                                                      h.Loading("lazy"),
                                                      h.Draggable(false),
                                                      h.Class(
                                                          "h-full w-full object-cover"
                                                      ),
                                                  ]),
                                              ]
                                          ),
                                      ]
                                  ),
                                  h.span(
                                      [
                                          h.Class(
                                              "py-1 text-sm font-medium leading-tight"
                                          ),
                                      ],
                                      [video.title]
                                  ),
                              ]
                          ),
                          ...(show_edit_controls
                              ? [
                                    h.div(
                                        [
                                            h.Class(
                                                "flex items-center justify-between gap-2 px-2 pb-2"
                                            ),
                                        ],
                                        [
                                            h.button(
                                                [
                                                    h.Type("button"),
                                                    h.AriaLabel(
                                                        `Drag ${video.title}`
                                                    ),
                                                    h.Class(
                                                        "grid size-7 touch-none cursor-grab place-items-center rounded-[var(--radius-control)] text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
                                                    ),
                                                ],
                                                [
                                                    IconGripVertical({
                                                        class: "size-4",
                                                    }),
                                                ]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "flex items-center gap-1"
                                                    ),
                                                ],
                                                [
                                                    h.button(
                                                        [
                                                            h.Type("button"),
                                                            h.AriaLabel(
                                                                `Move ${video.title} earlier`
                                                            ),
                                                            h.Disabled(
                                                                index === 0 ||
                                                                    model.videosBusy
                                                            ),
                                                            h.OnClick(
                                                                ClickedMoveVideo(
                                                                    {
                                                                        videoId:
                                                                            video.id,
                                                                        direction:
                                                                            "earlier",
                                                                    }
                                                                )
                                                            ),
                                                            h.Class(
                                                                "grid size-7 place-items-center rounded-[var(--radius-control)] text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-35"
                                                            ),
                                                        ],
                                                        [
                                                            IconChevronLeft({
                                                                class: "size-3.5",
                                                            }),
                                                        ]
                                                    ),
                                                    h.button(
                                                        [
                                                            h.Type("button"),
                                                            h.AriaLabel(
                                                                `Move ${video.title} later`
                                                            ),
                                                            h.Disabled(
                                                                index ===
                                                                    video_count -
                                                                        1 ||
                                                                    model.videosBusy
                                                            ),
                                                            h.OnClick(
                                                                ClickedMoveVideo(
                                                                    {
                                                                        videoId:
                                                                            video.id,
                                                                        direction:
                                                                            "later",
                                                                    }
                                                                )
                                                            ),
                                                            h.Class(
                                                                "grid size-7 place-items-center rounded-[var(--radius-control)] text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-35"
                                                            ),
                                                        ],
                                                        [
                                                            IconChevronRight({
                                                                class: "size-3.5",
                                                            }),
                                                        ]
                                                    ),
                                                    h.button(
                                                        [
                                                            h.Type("button"),
                                                            h.OnClick(
                                                                OpenedVideoEditor(
                                                                    {
                                                                        videoId:
                                                                            video.id,
                                                                    }
                                                                )
                                                            ),
                                                            h.Class(
                                                                "rounded-[var(--radius-control)] px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                                                            ),
                                                        ],
                                                        ["Edit"]
                                                    ),
                                                    h.button(
                                                        [
                                                            h.Type("button"),
                                                            h.OnClick(
                                                                ClickedDeleteVideo(
                                                                    {
                                                                        videoId:
                                                                            video.id,
                                                                    }
                                                                )
                                                            ),
                                                            h.Class(
                                                                "rounded-[var(--radius-control)] px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                            ),
                                                        ],
                                                        ["Delete"]
                                                    ),
                                                ]
                                            ),
                                        ]
                                    ),
                                ]
                              : []),
                      ]
            ),
        ]
    )
}

const video_drag_ghost = (model: Model, h: HtmlBuilder<Message>): Html => {
    if (!model.videos_editing) {
        return h.empty
    }

    return Option.match(Ui.DragAndDrop.ghostStyle(model.dragAndDrop), {
        onNone: () => h.empty,
        onSome: (ghost_style) =>
            Option.match(Ui.DragAndDrop.maybeDraggedItemId(model.dragAndDrop), {
                onNone: () => h.empty,
                onSome: (video_id) => {
                    const video = model.videos.find(
                        (current) => current.id === video_id
                    )

                    if (video === undefined) {
                        return h.empty
                    }

                    return h.div(
                        [
                            h.Style(ghost_style),
                            h.Class(
                                "flex w-72 items-center gap-3 rounded-[var(--radius-surface)] border border-border bg-card p-2 text-card-foreground [box-shadow:var(--shadow-overlay)]"
                            ),
                            h.AriaHidden(true),
                        ],
                        [
                            h.div(
                                [
                                    h.Class(
                                        "aspect-video w-28 flex-none overflow-hidden rounded-[0.5rem] bg-muted"
                                    ),
                                ],
                                [
                                    h.img([
                                        h.Src(video.thumbnail_src),
                                        h.Alt(""),
                                        h.Class("h-full w-full object-cover"),
                                    ]),
                                ]
                            ),
                            h.span(
                                [h.Class("line-clamp-2 text-sm font-medium")],
                                [video.title]
                            ),
                        ]
                    )
                },
            }),
    })
}

const comments_placeholder = (h: HtmlBuilder<Message>): Html =>
    h.section(
        [
            h.AriaLabel("Comments"),
            h.Class("border-t border-border bg-card p-5 md:p-6"),
        ],
        [
            h.h2(
                [h.Class("text-lg font-semibold text-card-foreground")],
                ["Comments"]
            ),
            h.div(
                [
                    h.Class(
                        "mt-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-muted/40 px-5 py-8 text-center"
                    ),
                ],
                [
                    h.p(
                        [h.Class("text-sm font-medium text-foreground")],
                        ["No comments yet"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            "Comments will appear here when video discussions are connected to the backend.",
                        ]
                    ),
                ]
            ),
        ]
    )

const video_create_item = (
    title: string,
    url: string,
    busy: boolean,
    h: HtmlBuilder<Message>
): Html =>
    h.li(
        [
            h.Class(
                "m-2 rounded-[var(--radius-surface)] border-2 border-dashed border-border bg-muted/30"
            ),
        ],
        [
            h.form(
                [h.Class("grid gap-3 p-3"), h.OnSubmit(SubmittedNewVideo())],
                [
                    h.div(
                        [h.Class("text-xs font-medium text-muted-foreground")],
                        ["Add video"]
                    ),
                    h.label(
                        [h.Class("grid gap-1 text-xs")],
                        [
                            h.span([], ["Title"]),
                            h.input([
                                h.Value(title),
                                h.Placeholder("Video title"),
                                h.Disabled(busy),
                                h.OnInput((value) =>
                                    ChangedNewVideoTitle({ value })
                                ),
                                h.Class(
                                    "h-9 min-w-0 rounded-[var(--radius-control)] border border-input bg-background px-3 text-sm"
                                ),
                            ]),
                        ]
                    ),
                    h.label(
                        [h.Class("grid gap-1 text-xs")],
                        [
                            h.span([], ["YouTube URL"]),
                            h.input([
                                h.Type("url"),
                                h.Value(url),
                                h.Placeholder(
                                    "https://www.youtube.com/watch?v=…"
                                ),
                                h.Disabled(busy),
                                h.OnInput((value) =>
                                    ChangedNewVideoUrl({ value })
                                ),
                                h.Class(
                                    "h-9 min-w-0 rounded-[var(--radius-control)] border border-input bg-background px-3 text-sm"
                                ),
                            ]),
                        ]
                    ),
                    h.div(
                        [h.Class("flex justify-end")],
                        [
                            h.button(
                                [
                                    h.Type("submit"),
                                    h.Disabled(busy),
                                    h.Class(
                                        "rounded-[var(--radius-control)] bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                                    ),
                                ],
                                [busy ? "Adding…" : "Add video"]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

export const videoContent = (
    model: Model,
    selected_slug: VideoSlug,
    h: HtmlBuilder<Message>,
    video_detail_href: (slug: VideoSlug) => string = videoDetailHref,
    manage_videos = false
): Html => {
    const videos = model.videos
    const ordered_videos = [...videos].sort((left, right) => {
        if (left.order_position !== right.order_position) {
            return left.order_position - right.order_position
        }

        return left.updated_at - right.updated_at
    })
    const youtube_player = model.youtubePlayer
    const videos_busy = model.videosBusy
    const videos_editing = model.videos_editing
    const selected_video = video_for_slug(videos, selected_slug)
    const active_slug = selected_video?.slug ?? selected_slug
    const show_edit_controls = manage_videos && videos_editing

    return h.div(
        [
            h.Class(
                `mx-auto flex flex-col gap-6 p-4 md:p-8 ${model.video_theatre_mode ? "w-full" : "max-w-7xl"}`
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
                    ),
                ],
                [
                    h.div(
                        [],
                        [
                            h.h1(
                                [
                                    h.Class(
                                        "text-3xl font-bold tracking-tight text-foreground"
                                    ),
                                ],
                                ["Videos"]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "mt-2 max-w-2xl text-sm leading-6 text-muted-foreground"
                                    ),
                                ],
                                [
                                    selected_video === undefined
                                        ? "No videos have been added to this domain yet."
                                        : selected_video.title,
                                ]
                            ),
                        ]
                    ),
                    ...(manage_videos
                        ? [
                              h.div(
                                  [
                                      h.Class(
                                          "flex self-start items-center gap-3 text-sm font-medium text-foreground"
                                      ),
                                  ],
                                  [
                                      h.span([], ["Edit"]),
                                      h.button(
                                          [
                                              h.Type("button"),
                                              h.Role("switch"),
                                              h.AriaChecked(videos_editing),
                                              h.AriaLabel("Edit videos"),
                                              h.Disabled(videos_busy),
                                              h.OnClick(ToggledVideoEditing()),
                                              h.Class(
                                                  videos_editing
                                                      ? "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-(length:--control-border-width) border-border bg-primary transition-colors [box-shadow:var(--shadow-primary)]"
                                                      : "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-input transition-colors"
                                              ),
                                          ],
                                          [
                                              h.span(
                                                  [
                                                      h.AriaHidden(true),
                                                      h.Class(
                                                          videos_editing
                                                              ? "pointer-events-none inline-block size-4 translate-x-6 rounded-full bg-background shadow transition-transform"
                                                              : "pointer-events-none inline-block size-4 translate-x-1 rounded-full bg-background shadow transition-transform"
                                                      ),
                                                  ],
                                                  []
                                              ),
                                          ]
                                      ),
                                  ]
                              ),
                          ]
                        : []),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "relative grid w-full grid-cols-1 overflow-hidden rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)] lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr]"
                    ),
                ],
                [
                    h.div(
                        [
                            h.Class(
                                `relative z-20 w-full min-w-0 bg-card ${model.video_theatre_mode ? "lg:col-span-2" : ""}`
                            ),
                        ],
                        [
                            ...(selected_video === undefined
                                ? [
                                      h.div(
                                          [
                                              h.Class(
                                                  "relative aspect-video w-full bg-black"
                                              ),
                                          ],
                                          [
                                              h.span(
                                                  [h.Class("sr-only")],
                                                  ["No video selected"]
                                              ),
                                          ]
                                      ),
                                  ]
                                : selected_video.youtube_id === undefined
                                  ? [
                                        h.div(
                                            [
                                                h.Class(
                                                    "relative aspect-video w-full bg-black"
                                                ),
                                            ],
                                            [
                                                h.keyed("iframe")(
                                                    selected_video.slug,
                                                    [
                                                        h.Src(
                                                            selected_video.embed_url
                                                        ),
                                                        h.Title(
                                                            `${selected_video.title} video player`
                                                        ),
                                                        h.Allow(
                                                            "autoplay; fullscreen"
                                                        ),
                                                        h.Referrerpolicy(
                                                            "strict-origin-when-cross-origin"
                                                        ),
                                                        h.Attribute(
                                                            "allowfullscreen",
                                                            ""
                                                        ),
                                                        h.Class(
                                                            "absolute inset-0 h-full w-full border-0"
                                                        ),
                                                    ],
                                                    []
                                                ),
                                            ]
                                        ),
                                    ]
                                  : [
                                        YouTubeEmbed.view(
                                            youtube_player,
                                            (message) =>
                                                GotVideoYouTubeMessage({
                                                    message,
                                                }),
                                            h
                                        ),
                                    ]),
                            h.div(
                                [h.Class("flex justify-end p-3")],
                                [
                                    h.button(
                                        [
                                            h.Type("button"),
                                            h.AriaLabel("Theatre mode"),
                                            h.AriaPressed(
                                                String(model.video_theatre_mode)
                                            ),
                                            h.Disabled(
                                                selected_video === undefined
                                            ),
                                            h.OnClick(
                                                ToggledVideoTheatreMode()
                                            ),
                                            h.Class(
                                                "rounded-[var(--radius-control)] border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                                            ),
                                        ],
                                        [
                                            model.video_theatre_mode
                                                ? "Exit theatre mode"
                                                : "Theatre mode",
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("min-w-0 lg:col-start-1 lg:row-start-2")],
                        [comments_placeholder(h)]
                    ),
                    h.aside(
                        [
                            h.Class(
                                `relative z-10 w-full min-w-0 border-t border-border lg:col-start-2 lg:border-l lg:border-t-0 ${model.video_theatre_mode ? "lg:row-start-2" : "lg:row-span-2 lg:row-start-1"}`
                            ),
                        ],
                        [
                            h.nav(
                                [h.AriaLabel("Videos")],
                                [
                                    h.ul(
                                        [
                                            h.Class("divide-y divide-border"),
                                            ...(show_edit_controls
                                                ? Ui.DragAndDrop.droppable(
                                                      "media-videos",
                                                      "Videos"
                                                  )
                                                : []),
                                        ],
                                        [
                                            ...(ordered_videos.length === 0 &&
                                            !show_edit_controls
                                                ? [
                                                      h.li(
                                                          [
                                                              h.Class(
                                                                  "p-5 text-sm text-muted-foreground"
                                                              ),
                                                          ],
                                                          ["No videos yet"]
                                                      ),
                                                  ]
                                                : []),
                                            ...ordered_videos.map(
                                                (video, index) =>
                                                    video_navigation_item(
                                                        model,
                                                        active_slug,
                                                        video,
                                                        index,
                                                        ordered_videos.length,
                                                        video_detail_href,
                                                        show_edit_controls,
                                                        h
                                                    )
                                            ),
                                            ...(show_edit_controls
                                                ? [
                                                      video_create_item(
                                                          model.newVideoTitle,
                                                          model.newVideoUrl,
                                                          videos_busy,
                                                          h
                                                      ),
                                                  ]
                                                : []),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
            video_drag_ghost(model, h),
        ]
    )
}
