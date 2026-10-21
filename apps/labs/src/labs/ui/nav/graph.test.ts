import { describe, expect, test } from "vitest"
import { inertHtml } from "foldkit/html"
import { local_graph } from "@urm/ui/foldkit/graph.ts"
import { graph_view } from "./graph.ts"

const pages = [
    { id: "center", links: ["outgoing", "missing"] },
    { id: "incoming", links: ["center", "outgoing"] },
    { id: "outgoing", links: [] },
    { id: "unrelated", links: [] },
]

describe("navigation graph", () => {
    test("includes both link directions and edges between neighbors", () => {
        const graph = local_graph(pages, "center")
        expect(graph.nodes.map((node) => node.page.id)).toEqual([
            "center",
            "incoming",
            "outgoing",
        ])
        expect(graph.nodes[0]).toMatchObject({ x: 50, y: 50 })
        expect(
            graph.edges.map((edge) => [
                edge.source.page.id,
                edge.target.page.id,
            ])
        ).toEqual([
            ["center", "outgoing"],
            ["incoming", "center"],
            ["incoming", "outgoing"],
        ])
    })

    test("handles absent and isolated current nodes", () => {
        expect(local_graph(pages, "missing")).toEqual({ nodes: [], edges: [] })
        expect(local_graph(pages, "unrelated")).toEqual({
            nodes: [{ page: pages[3], x: 50, y: 50 }],
            edges: [],
        })
    })

    test("renders links to related labs with the graph itself current", () => {
        const rendered = JSON.stringify(graph_view(inertHtml))
        expect(rendered).toContain("/labs/ui/nav/graph")
        expect(rendered).toContain("/labs/ui/steps")
        expect(rendered).toContain("Related UI components")
        expect(rendered).toContain("aria-current")
    })
})
