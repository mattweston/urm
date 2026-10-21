import type { Html, HtmlBuilder } from "foldkit/html"
import { IconBrandX } from "@urm/ui/foldkit/icons/view.ts"

const iconAttributes = <ParentMessage>(h: HtmlBuilder<ParentMessage>) => [
    h.AriaHidden(true),
    h.Class("size-6"),
    h.Xmlns("http://www.w3.org/2000/svg"),
    h.ViewBox("0 0 24 24"),
]

const facebookIcon = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.svg(
        [...iconAttributes(h), h.Fill("currentColor")],
        [
            h.path(
                [
                    h.D(
                        "M14.25 4.5H18V0h-3.75A5.25 5.25 0 0 0 9 5.25V7.5H6v4.5h3v12h4.5V12h3.75L18 7.5h-4.5V5.25a.75.75 0 0 1 .75-.75Z"
                    ),
                ],
                []
            ),
        ]
    )

const instagramIcon = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.svg(
        [
            ...iconAttributes(h),
            h.Fill("none"),
            h.Stroke("currentColor"),
            h.StrokeWidth("2"),
            h.StrokeLinecap("round"),
            h.StrokeLinejoin("round"),
        ],
        [
            h.rect(
                [
                    h.Attribute("x", "2"),
                    h.Attribute("y", "2"),
                    h.Attribute("width", "20"),
                    h.Attribute("height", "20"),
                    h.Attribute("rx", "5"),
                ],
                []
            ),
            h.path([h.D("M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z")]),
            h.line(
                [
                    h.Attribute("x1", "17.5"),
                    h.Attribute("y1", "6.5"),
                    h.Attribute("x2", "17.51"),
                    h.Attribute("y2", "6.5"),
                ],
                []
            ),
        ]
    )

const youtubeIcon = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.svg(
        [
            ...iconAttributes(h),
            h.Fill("none"),
            h.Stroke("currentColor"),
            h.StrokeWidth("2"),
            h.StrokeLinecap("round"),
            h.StrokeLinejoin("round"),
        ],
        [
            h.path([
                h.D(
                    "M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33Z"
                ),
            ]),
            h.polygon(
                [h.Attribute("points", "9.75 15.02 15.5 11.75 9.75 8.48")],
                []
            ),
        ]
    )

const x_icon = <ParentMessage>(_h: HtmlBuilder<ParentMessage>): Html =>
    IconBrandX({ class: "size-6" })

const socialLink = <ParentMessage>(
    label: string,
    href: string,
    hoverClassName: string,
    icon: (h: HtmlBuilder<ParentMessage>) => Html,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.span(
        [
            h.Class(
                `group grid size-12 place-items-center rounded-full outline-2 outline-border transition-all duration-300 hover:outline-offset-2 ${hoverClassName}`
            ),
        ],
        [
            h.a(
                [
                    h.Href(href),
                    h.Target("_blank"),
                    h.Rel("noopener noreferrer"),
                    h.AriaLabel(label),
                    h.Class(
                        "grid size-12 place-items-center text-foreground transition-all duration-300 group-hover:text-white hover:scale-125 focus-visible:scale-125 focus-visible:outline-none"
                    ),
                ],
                [icon(h)]
            ),
        ]
    )

export const view = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.div(
        [h.Class("space-y-6")],
        [
            h.div(
                [h.Class("space-y-2")],
                [
                    h.h2(
                        [h.Class("text-2xl font-bold text-foreground")],
                        ["Social Links"]
                    ),
                    h.p(
                        [h.Class("max-w-2xl text-sm text-muted-foreground")],
                        [
                            "Animated social profile links with branded hover states.",
                        ]
                    ),
                ]
            ),
            h.div(
                [
                    h.Class(
                        "grid min-h-40 place-items-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                    ),
                ],
                [
                    h.span(
                        [h.Class("flex flex-wrap justify-center gap-6")],
                        [
                            socialLink(
                                "Facebook",
                                "https://www.facebook.com/ilkleyfestivalfringe/",
                                "hover:bg-[#4267b2]",
                                facebookIcon,
                                h
                            ),
                            socialLink(
                                "Instagram",
                                "https://instagram.com/dreadcabbage/",
                                "hover:bg-[radial-gradient(circle_at_30%_107%,#fdf497_0%,#fdf497_5%,#fd5949_45%,#d6249f_60%,#285aeb_90%)]",
                                instagramIcon,
                                h
                            ),
                            socialLink(
                                "YouTube",
                                "https://youtube.com/@johnnysolstice8550/videos",
                                "hover:bg-[#e52d27]",
                                youtubeIcon,
                                h
                            ),
                            socialLink(
                                "X",
                                "https://x.com/soltys_joh35317",
                                "hover:bg-black",
                                x_icon,
                                h
                            ),
                        ]
                    ),
                ]
            ),
        ]
    )
