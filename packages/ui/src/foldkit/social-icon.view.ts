import type { Html, HtmlBuilder } from "foldkit/html"
import type { SocialPlatform } from "@urm/domain/schemas/domains"
import { IconBrandX } from "./icons/view.ts"

const icon_attributes = <ParentMessage>(h: HtmlBuilder<ParentMessage>) => [
    h.AriaHidden(true),
    h.Class("size-6"),
    h.Xmlns("http://www.w3.org/2000/svg"),
    h.ViewBox("0 0 24 24"),
]

const facebook_icon = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.svg(
        [...icon_attributes(h), h.Fill("currentColor")],
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

const instagram_icon = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.svg(
        [
            ...icon_attributes(h),
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

const youtube_icon = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html =>
    h.svg(
        [
            ...icon_attributes(h),
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

export const socialIcon = <ParentMessage>(
    platform: SocialPlatform,
    h: HtmlBuilder<ParentMessage>
): Html => {
    switch (platform) {
        case "Facebook":
            return facebook_icon(h)
        case "Instagram":
            return instagram_icon(h)
        case "YouTube":
            return youtube_icon(h)
        case "X":
            return IconBrandX({ class: "size-6" })
    }
}
