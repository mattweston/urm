import {
    decodePublishedBlockDocumentContent,
    type PublishedBlockImage,
} from "@urm/domain/schemas/block-documents"
import type { PublishedSiteLayout } from "@urm/domain/schemas/document-site-builds"
import type {
    RichTextDocument,
    RichTextMark,
    RichTextTextNode,
} from "@urm/domain/schemas/rich-text"
import { Effect, Schema } from "effect"
import {
    type Attribute,
    type Document,
    type Html,
    type HtmlBuilder,
} from "foldkit/html"
import { renderToString } from "foldkit/experimental/server"

import { PageRenderError } from "./errors.ts"
import { renderSiteLayout } from "./site-layout.ts"
import type { PublishedPage } from "./snapshot.ts"

const Message = Schema.Struct({ _tag: Schema.Literal("Noop") })
type Message = typeof Message.Type

const bundled_asset_paths = {
    "urm.integration.bento": "/assets/urm-integrations/bento.svg",
    "urm.integration.instagram": "/assets/urm-integrations/instagram.svg",
    "urm.integration.polar": "/assets/urm-integrations/polar.svg",
    "urm.integration.stripe": "/assets/urm-integrations/stripe.svg",
} satisfies Readonly<Record<string, string>>

const safe_url = (value: string): string | undefined => {
    const normalized = value.trim()
    if (normalized.startsWith("/") && !normalized.startsWith("//")) {
        return normalized
    }
    if (normalized.startsWith("#")) return normalized
    try {
        const url = new URL(normalized)
        return ["https:", "mailto:", "tel:"].includes(url.protocol) &&
            !url.username &&
            !url.password
            ? url.href
            : undefined
    } catch {
        return undefined
    }
}

const safe_image_url = (value: string): string | undefined => {
    const normalized = value.trim()
    if (normalized.startsWith("/") && !normalized.startsWith("//")) {
        return normalized
    }
    try {
        const url = new URL(normalized)
        return url.protocol === "https:" && !url.username && !url.password
            ? url.href
            : undefined
    } catch {
        return undefined
    }
}

const image_src = (image: PublishedBlockImage): string | undefined =>
    image._tag === "BundledAsset"
        ? bundled_asset_paths[image.asset_id]
        : safe_image_url(image.src)

const reveal_attributes = (
    index: number,
    h: HtmlBuilder<Message>
): ReadonlyArray<Attribute<Message>> => [
    h.DataAttribute("landing-reveal", ""),
    h.Attribute(
        "style",
        `--landing-reveal-index:${index};--landing-reveal-delay:${Math.min(index, 8) * 3}%`
    ),
]

const render_image = (
    image: PublishedBlockImage,
    class_name: string,
    eager: boolean,
    h: HtmlBuilder<Message>
): Html => {
    const src = image_src(image)
    return h.img([
        ...(src === undefined ? [] : [h.Src(src)]),
        h.Alt(image.alt),
        h.Class(class_name),
        h.Attribute("loading", eager ? "eager" : "lazy"),
        ...(eager ? [h.Attribute("fetchpriority", "high")] : []),
        ...(image._tag === "ResolvedImage" && image.width !== undefined
            ? [h.Width(String(image.width))]
            : []),
        ...(image._tag === "ResolvedImage" && image.height !== undefined
            ? [h.Height(String(image.height))]
            : []),
    ])
}

const render_actions = (
    actions: ReadonlyArray<{
        readonly label: string
        readonly href: string
        readonly style: "primary" | "secondary" | "link"
    }>,
    h: HtmlBuilder<Message>
): ReadonlyArray<Html> =>
    actions.flatMap((action) => {
        const href = safe_url(action.href)
        return href === undefined
            ? []
            : [
                  h.a(
                      [
                          h.Href(href),
                          h.Class(`site-landing-action is-${action.style}`),
                      ],
                      [action.label]
                  ),
              ]
    })

const render_mark = (
    html: Html,
    mark: RichTextMark,
    h: HtmlBuilder<Message>
): Html => {
    if (mark.type === "bold") return h.strong([], [html])
    if (mark.type === "italic") return h.em([], [html])
    const href = safe_url(mark.href)
    return href === undefined ? html : h.a([h.Href(href)], [html])
}

const render_text_node = (
    node: RichTextTextNode,
    h: HtmlBuilder<Message>
): Html =>
    (node.marks ?? []).reduce(
        (html, mark) => render_mark(html, mark, h),
        h.span([], [node.text])
    )

const render_rich_text = (
    document: RichTextDocument,
    h: HtmlBuilder<Message>
): ReadonlyArray<Html> =>
    document.children.map((block) => {
        if (block.type === "image") {
            const src = safe_image_url(block.src)
            return h.img([
                ...(src === undefined ? [] : [h.Src(src)]),
                h.Alt(block.alt),
                h.Attribute("loading", "lazy"),
            ])
        }
        const children = block.children.map((node) => render_text_node(node, h))
        if (block.type === "paragraph") return h.p([], children)
        if (block.type === "blockquote") return h.blockquote([], children)
        if (block.level === 1) return h.h2([], children)
        if (block.level === 2) return h.h3([], children)
        return h.h4([], children)
    })

export const renderComposedPage = Effect.fn("ComposedPage.render")(function* (
    page: PublishedPage,
    layout?: PublishedSiteLayout
) {
    const document = yield* decodePublishedBlockDocumentContent(page.body).pipe(
        Effect.mapError(
            (cause) =>
                new PageRenderError({
                    path: page.path,
                    content_type: page.content_type,
                    reason: cause.message,
                    cause,
                })
        )
    )
    return yield* renderToString(
        {
            Flags: Schema.Void,
            init: () => ({ model: undefined, commands: [] }),
            view: (_flags: void, h: HtmlBuilder<Message>): Document => {
                const blocks = document.blocks.map((block, index) => {
                    switch (block._tag) {
                        case "Hero":
                            return h.section(
                                [
                                    ...reveal_attributes(index, h),
                                    h.Class(
                                        "site-landing-block site-landing-hero"
                                    ),
                                ],
                                [
                                    h.div(
                                        [h.Class("site-landing-copy")],
                                        [
                                            ...(block.eyebrow === undefined
                                                ? []
                                                : [
                                                      h.p(
                                                          [
                                                              h.Class(
                                                                  "site-landing-eyebrow"
                                                              ),
                                                          ],
                                                          [block.eyebrow]
                                                      ),
                                                  ]),
                                            h.h1([], [block.heading]),
                                            h.p(
                                                [h.Class("site-landing-lede")],
                                                [block.body]
                                            ),
                                            h.div(
                                                [
                                                    h.Class(
                                                        "site-landing-actions"
                                                    ),
                                                ],
                                                render_actions(block.actions, h)
                                            ),
                                        ]
                                    ),
                                    ...(block.image === undefined
                                        ? []
                                        : [
                                              render_image(
                                                  block.image,
                                                  "site-landing-hero-image",
                                                  index === 0,
                                                  h
                                              ),
                                          ]),
                                ]
                            )
                        case "Intro":
                            return h.section(
                                [
                                    ...reveal_attributes(index, h),
                                    h.Class(
                                        "site-landing-block site-landing-intro"
                                    ),
                                ],
                                [
                                    ...(block.eyebrow === undefined
                                        ? []
                                        : [
                                              h.p(
                                                  [
                                                      h.Class(
                                                          "site-landing-eyebrow"
                                                      ),
                                                  ],
                                                  [block.eyebrow]
                                              ),
                                          ]),
                                    h.h2([], [block.heading]),
                                    h.p([], [block.body]),
                                ]
                            )
                        case "RichText":
                            return h.section(
                                [
                                    ...reveal_attributes(index, h),
                                    h.Class("site-landing-block"),
                                ],
                                render_rich_text(block.document, h)
                            )
                        case "FeatureGrid":
                            return h.section(
                                [
                                    ...reveal_attributes(index, h),
                                    h.Class("site-landing-block"),
                                ],
                                [
                                    ...(block.heading === undefined
                                        ? []
                                        : [h.h2([], [block.heading])]),
                                    h.div(
                                        [h.Class("site-landing-grid")],
                                        block.items.map((item) =>
                                            h.article(
                                                [h.Class("site-landing-card")],
                                                [
                                                    h.h3([], [item.heading]),
                                                    h.p([], [item.body]),
                                                ]
                                            )
                                        )
                                    ),
                                ]
                            )
                        case "LogoGrid":
                            return h.section(
                                [
                                    ...reveal_attributes(index, h),
                                    h.Class("site-landing-block"),
                                ],
                                [
                                    ...(block.heading === undefined
                                        ? []
                                        : [h.h2([], [block.heading])]),
                                    h.ul(
                                        [h.Class("site-landing-logo-grid")],
                                        block.logos.map((logo) =>
                                            h.li(
                                                [h.Class("site-landing-logo")],
                                                [
                                                    render_image(
                                                        logo.image,
                                                        "site-landing-logo-image",
                                                        false,
                                                        h
                                                    ),
                                                    h.span(
                                                        [
                                                            h.Class(
                                                                "site-visually-hidden"
                                                            ),
                                                        ],
                                                        [logo.name]
                                                    ),
                                                ]
                                            )
                                        )
                                    ),
                                ]
                            )
                        case "Faq":
                            return h.section(
                                [
                                    ...reveal_attributes(index, h),
                                    h.Class("site-landing-block"),
                                ],
                                [
                                    ...(block.heading === undefined
                                        ? []
                                        : [h.h2([], [block.heading])]),
                                    ...block.items.map((item) =>
                                        h.details(
                                            [h.Class("site-landing-faq")],
                                            [
                                                h.summary([], [item.question]),
                                                h.p([], [item.answer]),
                                            ]
                                        )
                                    ),
                                ]
                            )
                        case "Cta":
                            return h.section(
                                [
                                    ...reveal_attributes(index, h),
                                    h.Class(
                                        "site-landing-block site-landing-cta"
                                    ),
                                ],
                                [
                                    h.h2([], [block.heading]),
                                    h.p([], [block.body]),
                                    h.div(
                                        [h.Class("site-landing-actions")],
                                        render_actions(block.actions, h)
                                    ),
                                ]
                            )
                    }
                })
                const body = h.main(
                    [
                        h.DataAttribute(
                            "landing-motion",
                            document.motion ?? "none"
                        ),
                        h.Class("site-landing-page"),
                    ],
                    blocks
                )
                return {
                    title: page.title,
                    body: renderSiteLayout(layout, page.path, body, h),
                }
            },
        },
        { flags: undefined, isHydratable: false }
    )
})
