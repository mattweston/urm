import { Graph } from "@urm/ui/foldkit/graph.view.ts"
import { local_graph } from "@urm/ui/foldkit/graph.ts"
import type { Html, HtmlBuilder } from "foldkit/html"
import { demo_href } from "../catalog.ts"

const pages = [
    {
        id: "nav/graph",
        title: "Navigation graph",
        kind: "Current component",
        links: ["nav", "button", "tabs", "callout"],
    },
    {
        id: "nav",
        title: "Navigation",
        kind: "Component",
        links: ["nav/graph", "tabs"],
    },
    { id: "button", title: "Button", kind: "Component", links: [] },
    { id: "tabs", title: "Tabs", kind: "Component", links: ["nav"] },
    { id: "callout", title: "Callout", kind: "Component", links: [] },
    { id: "steps", title: "Steps", kind: "Component", links: ["nav/graph"] },
]

export const graph_view = <Message>(h: HtmlBuilder<Message>): Html =>
    h.div(
        [h.Class("space-y-4")],
        [
            h.p(
                [h.Class("text-muted-foreground")],
                [
                    "The current page sits at the center, surrounded by incoming and outgoing links. Select a node to open its UI lab.",
                ]
            ),
            Graph({
                graph: local_graph(pages, "nav/graph"),
                current_id: "nav/graph",
                aria_label: "Related UI components",
                to_href: (page) => demo_href(page.id),
                to_content: (page) => [h.small([], [page.kind]), page.title],
            }),
        ]
    )
