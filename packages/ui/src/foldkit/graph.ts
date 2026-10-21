export type GraphPage = Readonly<{
    id: string
    links: ReadonlyArray<string>
}>

export const related_pages = <Page extends GraphPage>(
    pages: ReadonlyArray<Page>,
    id: string
) => {
    const current = pages.find((page) => page.id === id)
    return {
        outgoing: pages.filter((page) => current?.links.includes(page.id)),
        incoming: pages.filter((page) => page.links.includes(id)),
    }
}

export const local_graph = <Page extends GraphPage>(
    pages: ReadonlyArray<Page>,
    id: string
) => {
    const visible_pages = pages
    const { incoming, outgoing } = related_pages(visible_pages, id)
    const neighbours = visible_pages.filter(
        (page) =>
            page.id !== id &&
            (incoming.includes(page) || outgoing.includes(page))
    )
    const current = visible_pages.find((page) => page.id === id)
    const nodes =
        current === undefined
            ? []
            : [
                  { page: current, x: 50, y: 50 },
                  ...neighbours.map((page, index) => ({
                      page,
                      x:
                          50 +
                          32 *
                              Math.cos(
                                  (index / neighbours.length) * Math.PI * 2 -
                                      Math.PI / 2
                              ),
                      y:
                          50 +
                          33 *
                              Math.sin(
                                  (index / neighbours.length) * Math.PI * 2 -
                                      Math.PI / 2
                              ),
                  })),
              ]
    const edges = nodes.flatMap((node) =>
        node.page.links.flatMap((target) => {
            const destination = nodes.find(
                (candidate) => candidate.page.id === target
            )
            return destination === undefined
                ? []
                : [{ source: node, target: destination }]
        })
    )
    return { nodes, edges }
}
