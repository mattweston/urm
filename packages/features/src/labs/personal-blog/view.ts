import clsx from "clsx"
import { Match as M, Option } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"

import * as Markdown from "@foldkit/markdown"

import {
    about,
    aboutHighlightedCode,
    findPost,
    posts,
    type Post,
} from "./content.ts"
import { islandAttributes } from "./island/attributes.ts"
import * as Counter from "./island/counter.ts"
import {
    ChangedBlogRoute,
    GotCounterMessage,
    type PersonalBlogMessage,
} from "./message.ts"
import type { PersonalBlogModel } from "./model.ts"
import { proseView } from "./prose.ts"
import {
    BlogAbout,
    BlogPost,
    BlogPosts,
    isPostOrPosts,
    type BlogRoute,
} from "./route.ts"

// The blog is hosted at paths the application owns, so the view receives its
// links instead of importing the app's route module.
export type PersonalBlogHrefs = Readonly<{
    index: () => string
    posts: () => string
    post: (slug: string) => string
}>

// Where the prose stops being inert. Everything a document renders goes through
// inertHtml except these, and an island is exactly the seam where a live view
// is spliced back in.
const islandViews = <ParentMessage>(
    model: PersonalBlogModel,
    toParentMessage: (message: PersonalBlogMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Markdown.Islands =>
    Markdown.islandsFor(islandAttributes, {
        Counter: ({ label }, _content, occurrenceIndex) =>
            h.div(
                [
                    h.Class(
                        "my-2 flex flex-col items-center gap-3 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card py-6"
                    ),
                ],
                [
                    h.span(
                        [h.Class("text-sm text-muted-foreground")],
                        [label ?? "Counter"]
                    ),
                    h.submodel({
                        // One slot per occurrence: two directives in a document
                        // are two positions in the tree, even when they read the
                        // same Submodel.
                        slotId: `personal-blog-counter-${occurrenceIndex}`,
                        model: model.counter,
                        view: Counter.view,
                        toParentMessage: (message) =>
                            toParentMessage(GotCounterMessage({ message })),
                    }),
                ]
            ),

        Note: (_attributes, content) =>
            h.aside(
                [
                    h.Class(
                        "space-y-4 rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-muted p-4"
                    ),
                ],
                content
            ),
    })

const navLinkClass = (isActive: boolean): string =>
    clsx("text-sm transition motion-reduce:transition-none", {
        "font-semibold text-foreground": isActive,
        "text-muted-foreground hover:text-foreground": !isActive,
    })

const headerView = <ParentMessage>(
    route: BlogRoute,
    hrefs: PersonalBlogHrefs,
    toParentMessage: (message: PersonalBlogMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.header(
        [h.Class("border-b-(length:--surface-border-width) border-border")],
        [
            h.div(
                [
                    h.Class(
                        "flex items-baseline justify-between gap-6 px-6 py-5"
                    ),
                ],
                [
                    h.a(
                        [
                            h.Href(hrefs.index()),
                            h.OnClick(
                                toParentMessage(
                                    ChangedBlogRoute({ route: BlogAbout() })
                                )
                            ),
                            h.Class("font-semibold text-foreground"),
                        ],
                        ["A weblog"]
                    ),
                    h.nav(
                        [],
                        [
                            h.ul(
                                [h.Class("flex list-none gap-6")],
                                [
                                    h.li(
                                        [],
                                        [
                                            h.a(
                                                [
                                                    h.Href(hrefs.index()),
                                                    h.OnClick(
                                                        toParentMessage(
                                                            ChangedBlogRoute({
                                                                route: BlogAbout(),
                                                            })
                                                        )
                                                    ),
                                                    h.Class(
                                                        navLinkClass(
                                                            route._tag ===
                                                                "BlogAbout"
                                                        )
                                                    ),
                                                ],
                                                ["About"]
                                            ),
                                        ]
                                    ),
                                    h.li(
                                        [],
                                        [
                                            h.a(
                                                [
                                                    h.Href(hrefs.posts()),
                                                    h.OnClick(
                                                        toParentMessage(
                                                            ChangedBlogRoute({
                                                                route: BlogPosts(),
                                                            })
                                                        )
                                                    ),
                                                    h.Class(
                                                        navLinkClass(
                                                            isPostOrPosts(route)
                                                        )
                                                    ),
                                                ],
                                                ["Posts"]
                                            ),
                                        ]
                                    ),
                                ]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )

const aboutView = <ParentMessage>(
    model: PersonalBlogModel,
    toParentMessage: (message: PersonalBlogMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    proseView(
        about,
        aboutHighlightedCode,
        islandViews(model, toParentMessage, h)
    )

const postCardView = <ParentMessage>(
    post: Post,
    hrefs: PersonalBlogHrefs,
    toParentMessage: (message: PersonalBlogMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.keyed("li")(
        post.slug,
        [],
        [
            h.a(
                [
                    h.Href(hrefs.post(post.slug)),
                    h.OnClick(
                        toParentMessage(
                            ChangedBlogRoute({
                                route: BlogPost({ slug: post.slug }),
                            })
                        )
                    ),
                    h.Class("group block"),
                ],
                [
                    h.h3(
                        [
                            h.Class(
                                "text-xl font-semibold text-foreground group-hover:underline"
                            ),
                        ],
                        [post.title]
                    ),
                    h.p(
                        [h.Class("mt-1 text-sm text-muted-foreground")],
                        [post.publishedOn]
                    ),
                    h.p(
                        [h.Class("mt-2 leading-relaxed text-muted-foreground")],
                        [post.summary]
                    ),
                ]
            ),
        ]
    )

const postsView = <ParentMessage>(
    hrefs: PersonalBlogHrefs,
    toParentMessage: (message: PersonalBlogMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [],
        [
            h.h3(
                [h.Class("mb-8 text-2xl font-bold text-foreground")],
                ["Posts"]
            ),
            h.ul(
                [h.Class("list-none space-y-8")],
                posts.map((post) =>
                    postCardView(post, hrefs, toParentMessage, h)
                )
            ),
        ]
    )

const missingPostView = <ParentMessage>(
    slug: string,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.div(
        [],
        [
            h.h3(
                [h.Class("text-2xl font-bold text-foreground")],
                ["Post not found"]
            ),
            h.p(
                [h.Class("mt-4 leading-relaxed text-muted-foreground")],
                [`There is no post named "${slug}".`]
            ),
        ]
    )

const postView = <ParentMessage>(
    slug: string,
    model: PersonalBlogModel,
    hrefs: PersonalBlogHrefs,
    toParentMessage: (message: PersonalBlogMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const maybePost = findPost(slug)

    // Keyed by the post rather than by position: one view function renders
    // every slug, so without this the DOM from the previous post would be
    // patched into the next one.
    const contentKey = Option.match(maybePost, {
        onNone: () => "Missing",
        onSome: (post) => `Post-${post.slug}`,
    })

    const content = Option.match(maybePost, {
        onNone: () => missingPostView(slug, h),
        onSome: (post) =>
            h.article(
                [],
                [
                    h.h3(
                        [h.Class("text-2xl font-bold text-foreground")],
                        [post.title]
                    ),
                    h.p(
                        [h.Class("mt-2 mb-8 text-sm text-muted-foreground")],
                        [post.publishedOn]
                    ),
                    proseView(
                        post.document,
                        post.highlightedCode,
                        islandViews(model, toParentMessage, h)
                    ),
                ]
            ),
    })

    return h.div(
        [],
        [
            h.a(
                [
                    h.Href(hrefs.posts()),
                    h.OnClick(
                        toParentMessage(
                            ChangedBlogRoute({ route: BlogPosts() })
                        )
                    ),
                    h.Class(
                        "mb-8 inline-block text-sm text-muted-foreground hover:text-foreground"
                    ),
                ],
                ["← All posts"]
            ),
            h.keyed("div")(contentKey, [], [content]),
        ]
    )
}

export const personalBlogView = <ParentMessage>(
    model: PersonalBlogModel,
    hrefs: PersonalBlogHrefs,
    toParentMessage: (message: PersonalBlogMessage) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const routeContent = M.value(model.route).pipe(
        M.withReturnType<Html>(),
        M.tagsExhaustive({
            BlogAbout: () => aboutView(model, toParentMessage, h),
            BlogPosts: () => postsView(hrefs, toParentMessage, h),
            BlogPost: ({ slug }) =>
                postView(slug, model, hrefs, toParentMessage, h),
        })
    )

    return h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border overflow-hidden bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"
            ),
        ],
        [
            headerView(model.route, hrefs, toParentMessage, h),
            h.div(
                [h.Class("px-6 py-8")],
                [h.keyed("div")(model.route._tag, [], [routeContent])]
            ),
        ]
    )
}
