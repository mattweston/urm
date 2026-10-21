import { Nav } from "@foldkit/ui"
import type { Html, HtmlBuilder } from "foldkit/html"
import { demo_href } from "./catalog.ts"

export const nav_view = <Message>(h: HtmlBuilder<Message>): Html =>
    Nav.view<string>({
        items: ["nav", "nav/graph", "button", "input", "tabs"],
        ariaLabel: "UI lab examples",
        toHref: demo_href,
        isItemCurrent: (item) => item === "nav",
        toView: ({ nav, items }) =>
            h.nav(
                [
                    ...nav,
                    h.Class(
                        "flex flex-wrap gap-2 rounded border border-border p-2"
                    ),
                ],
                items.map((item) =>
                    h.a(
                        [
                            ...item.link,
                            h.Class(
                                "rounded px-4 py-2 capitalize hover:bg-accent data-[current]:bg-primary data-[current]:text-primary-foreground"
                            ),
                        ],
                        [item.value]
                    )
                )
            ),
    })
