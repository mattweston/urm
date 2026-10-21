import { inertHtml as h, type Html } from "foldkit/html"
import type { GraphPage } from "./graph.ts"

export type GraphNode<Page> = Readonly<{ page: Page; x: number; y: number }>
export type GraphData<Page> = Readonly<{
    nodes: ReadonlyArray<GraphNode<Page>>
    edges: ReadonlyArray<
        Readonly<{ source: GraphNode<Page>; target: GraphNode<Page> }>
    >
}>
export type GraphProps<Page> = Readonly<{
    graph: GraphData<Page>
    current_id: string
    aria_label?: string
    class?: string
    to_href: (page: Page) => string
    to_content: (page: Page) => ReadonlyArray<Html | string>
}>

export const Graph = <Page extends Pick<GraphPage, "id">>(
    props: GraphProps<Page>
): Html =>
    h.div(
        [
            h.Class(`ui-graph ${props.class ?? ""}`),
            h.Role("group"),
            h.AriaLabel(props.aria_label ?? "Navigation graph"),
        ],
        [
            h.svg(
                [
                    h.ViewBox("0 0 100 100"),
                    h.AriaHidden(true),
                    h.PreserveAspectRatio("none"),
                ],
                props.graph.edges.map((edge) =>
                    h.line([
                        h.X1(String(edge.source.x)),
                        h.Y1(String(edge.source.y)),
                        h.X2(String(edge.target.x)),
                        h.Y2(String(edge.target.y)),
                        h.Stroke("currentColor"),
                        h.StrokeWidth("0.35"),
                    ])
                )
            ),
            ...props.graph.nodes.map((node) =>
                h.a(
                    [
                        h.Href(props.to_href(node.page)),
                        h.Class(
                            node.page.id === props.current_id
                                ? "ui-graph-node current"
                                : "ui-graph-node"
                        ),
                        h.Style({ left: `${node.x}%`, top: `${node.y}%` }),
                        ...(node.page.id === props.current_id
                            ? [h.AriaCurrent("page")]
                            : []),
                    ],
                    props.to_content(node.page)
                )
            ),
        ]
    )
