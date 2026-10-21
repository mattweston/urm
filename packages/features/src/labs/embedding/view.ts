import type { Html, HtmlBuilder } from "foldkit/html"

export const EMBEDDING_HREF = "/marketing/portals/embedding/"

// NOTE: the host page is plain TypeScript with no Foldkit runtime of its own, so
// Astro serves it as its own document. The link opens in a new tab, which also
// stops the router treating it as an internal navigation.
export const view = <ParentMessage>(h: HtmlBuilder<ParentMessage>): Html => {
    return h.div(
        [h.Class("flex flex-col gap-4")],
        [
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    "The host page mounts a Foldkit widget with Runtime.embed and talks to it only through the handle: Flags at mount, send in, subscribe out, dispose on unmount.",
                ]
            ),
            h.a(
                [
                    h.Href(EMBEDDING_HREF),
                    h.Target("_blank"),
                    h.Rel("noopener noreferrer"),
                    h.Class(
                        "w-fit rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground no-underline hover:bg-primary/90 border-(length:--control-border-width) border-border [box-shadow:var(--shadow-primary)]"
                    ),
                ],
                ["Open the host page"]
            ),
        ]
    )
}
