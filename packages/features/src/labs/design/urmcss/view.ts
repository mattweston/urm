import type { Html, HtmlBuilder } from "foldkit/html"
import { button_href } from "./route.ts"

export const view = <Message>(h: HtmlBuilder<Message>): Html =>
    h.main(
        [h.Class("urmcss-lab")],
        [
            h.header(
                [],
                [
                    h.p([], ["Design"]),
                    h.h1([], ["URMCSS migration lab"]),
                    h.p(
                        [],
                        [
                            "Explore shared presentation contracts with colocated CSS and Foldkit behavior.",
                        ]
                    ),
                ]
            ),
            h.section(
                [],
                [
                    h.h2([], ["First experiment"]),
                    h.a([h.Href(button_href())], ["Button"]),
                    h.p(
                        [],
                        [
                            "Compare Tailwind and URMCSS, explore variants and sizes, and try the same Foldkit UI primitive with keyboard and pointer input.",
                        ]
                    ),
                ]
            ),
        ]
    )
