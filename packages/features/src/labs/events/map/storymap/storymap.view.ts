import { Array, Equal, Match as M, Option } from "effect"
import { Mount } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    storyByline,
    storySubtitle,
    storyTitle,
    type Chapter,
    type ChapterAlignment,
} from "./storymap.chapter.ts"
import type { Message } from "./storymap.message.ts"
import { ClickedChapter } from "./storymap.message.ts"
import type { Model } from "./storymap.model.ts"
import { studiosInArea } from "../interactive-map/interactive-map.studio.ts"
import { mountChapter, mountMap, storyHostId } from "./storymap.mount.ts"

export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [h.Class("relative w-full bg-background text-foreground")],
        [
            // Sticky rather than fixed: the map holds the viewport while the
            // story scrolls past it, and it still releases at the end of the
            // demo instead of covering the rest of the page.
            h.div(
                [h.Class("sticky top-0 h-screen w-full overflow-hidden")],
                [
                    h.div(
                        [
                            h.Class("h-full w-full relative"),
                            h.AriaLabel("Story map"),
                            h.OnMount(
                                Mount.mapMessage(
                                    mountMap(storyHostId),
                                    toParentMessage
                                )
                            ),
                        ],
                        []
                    ),
                    mapErrorBannerView<ParentMessage>(model.maybeMapError, h),
                ]
            ),
            // Pulled back over the sticky map so the two share the same space.
            h.div(
                [h.Class("relative z-10"), h.Style({ marginTop: "-100vh" })],
                [
                    headerView<ParentMessage>(h),
                    ...Array.map(model.chapters, (chapter) =>
                        chapterView<ParentMessage>(
                            model.maybeActiveChapterId,
                            toParentMessage
                        )(chapter, h)
                    ),
                    footerView<ParentMessage>(h),
                ]
            ),
            chapterNavView(model, toParentMessage, h),
        ]
    )

const headerView = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.header(
        [
            h.Class(
                "h-screen flex flex-col items-center justify-center text-center px-6"
            ),
        ],
        [
            h.div(
                [
                    h.Class(
                        "bg-card/90 backdrop-blur-sm border-(length:--surface-border-width) border-border rounded-[var(--radius-surface)] px-8 py-6 max-w-xl"
                    ),
                ],
                [
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-semibold tracking-tight text-card-foreground"
                            ),
                        ],
                        [storyTitle]
                    ),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [storySubtitle]
                    ),
                    h.p(
                        [h.Class("mt-4 text-xs text-muted-foreground")],
                        [storyByline]
                    ),
                ]
            ),
        ]
    )

const alignmentClass = (alignment: ChapterAlignment): string =>
    M.value(alignment).pipe(
        M.withReturnType<string>(),
        M.when("left", () => "justify-start"),
        M.when("right", () => "justify-end"),
        M.when("center", () => "justify-center"),
        M.when("full", () => "justify-center"),
        M.exhaustive
    )

const chapterWidthClass = (alignment: ChapterAlignment): string =>
    alignment === "full" ? "max-w-3xl" : "max-w-md"

const chapterView =
    <ParentMessage>(
        maybeActiveChapterId: Option.Option<string>,
        toParentMessage: (message: Message) => ParentMessage
    ) =>
    (chapter: Chapter, h: HtmlBuilder<ParentMessage>): Html => {
        const isActive = Option.exists(
            maybeActiveChapterId,
            Equal.equals(chapter.id)
        )

        return h.section(
            [
                h.Key(chapter.id),
                h.Attribute("data-chapter-id", chapter.id),
                h.OnMount(
                    Mount.mapMessage(mountChapter(storyHostId), toParentMessage)
                ),
                h.Class(
                    `min-h-screen flex items-center px-6 py-24 ${alignmentClass(chapter.alignment)}`
                ),
            ],
            [
                h.article(
                    [
                        h.Class(
                            `${chapterWidthClass(chapter.alignment)} w-full bg-card/90 backdrop-blur-sm border border-border rounded-lg overflow-hidden transition-opacity duration-500 ${isActive ? "opacity-100" : "opacity-60"}`
                        ),
                    ],
                    [
                        h.img([
                            h.Attribute("src", chapter.imageUrl),
                            h.Attribute("alt", chapter.title),
                            h.Attribute("loading", "lazy"),
                            h.Class(
                                "w-full aspect-[16/9] object-cover bg-muted"
                            ),
                        ]),
                        h.div(
                            [h.Class("px-6 py-5")],
                            [
                                h.div(
                                    [h.Class("flex items-center gap-2")],
                                    [
                                        h.span(
                                            [
                                                h.Class(
                                                    "w-2.5 h-2.5 rounded-full shrink-0"
                                                ),
                                                h.Style({
                                                    backgroundColor:
                                                        chapter.color,
                                                }),
                                                h.AriaHidden(true),
                                            ],
                                            []
                                        ),
                                        h.h2(
                                            [
                                                h.Class(
                                                    "text-xl font-semibold text-card-foreground"
                                                ),
                                            ],
                                            [chapter.title]
                                        ),
                                        h.span(
                                            [
                                                h.Class(
                                                    "ml-auto text-xs text-muted-foreground"
                                                ),
                                            ],
                                            [
                                                `${studiosInArea(chapter.id).length} studios`,
                                            ]
                                        ),
                                    ]
                                ),
                                ...Array.map(chapter.paragraphs, (paragraph) =>
                                    h.p(
                                        [
                                            h.Key(paragraph.slice(0, 24)),
                                            h.Class(
                                                "mt-3 text-sm leading-relaxed text-muted-foreground"
                                            ),
                                        ],
                                        [paragraph]
                                    )
                                ),
                            ]
                        ),
                    ]
                ),
            ]
        )
    }

const footerView = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.footer(
        [h.Class("h-screen flex items-center justify-center px-6")],
        [
            h.div(
                [
                    h.Class(
                        "bg-card/90 backdrop-blur-sm border-(length:--surface-border-width) border-border rounded-[var(--radius-surface)] px-8 py-6 max-w-xl text-center"
                    ),
                ],
                [
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            "Studio locations and areas are shared with the interactive map demo.",
                        ]
                    ),
                    h.p(
                        [h.Class("mt-2 text-xs text-muted-foreground")],
                        [
                            "Scroll-driven camera after the Mapbox Storytelling template, rebuilt as Foldkit Messages and Commands.",
                        ]
                    ),
                ]
            ),
        ]
    )

// The original hid this behind `hideChapterNav`. It earns its place: without it
// there is no way to tell how long the story is or to skip to a city.
const chapterNavView = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.nav(
        [
            h.Class(
                "sticky bottom-6 z-20 flex justify-center gap-2 pointer-events-none"
            ),
            h.AriaLabel("Chapters"),
        ],
        [
            h.div(
                [
                    h.Class(
                        "pointer-events-auto flex gap-2 bg-card/90 backdrop-blur-sm border-(length:--surface-border-width) border-border rounded-full px-3 py-2 [box-shadow:var(--shadow-surface)]"
                    ),
                ],
                Array.map(model.chapters, (chapter) => {
                    const isActive = Option.exists(
                        model.maybeActiveChapterId,
                        Equal.equals(chapter.id)
                    )

                    return h.button(
                        [
                            h.Key(chapter.id),
                            h.Type("button"),
                            h.AriaLabel(chapter.title),
                            h.AriaPressed(isActive ? "true" : "false"),
                            h.OnClick(
                                toParentMessage(
                                    ClickedChapter({ chapterId: chapter.id })
                                )
                            ),
                            h.Class(
                                isActive
                                    ? "w-2.5 h-2.5 rounded-full bg-primary cursor-pointer"
                                    : "w-2.5 h-2.5 rounded-full bg-muted-foreground/40 hover:bg-muted-foreground cursor-pointer"
                            ),
                        ],
                        []
                    )
                })
            ),
        ]
    )

const mapErrorBannerView = <ParentMessage>(
    maybeReason: Option.Option<string>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    Option.match(maybeReason, {
        onNone: () => h.empty,
        onSome: (reason) =>
            h.div(
                [
                    h.AriaLabel("Map failed to load"),
                    h.Class(
                        "absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-md bg-card border-(length:--surface-border-width) border-border text-card-foreground rounded-[var(--radius-surface)] [box-shadow:var(--shadow-surface)] px-4 py-3 text-sm"
                    ),
                ],
                [
                    h.div(
                        [h.Class("font-semibold mb-0.5")],
                        ["Could not load the map."]
                    ),
                    h.div([h.Class("text-xs text-muted-foreground")], [reason]),
                ]
            ),
    })
