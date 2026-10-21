import { type Html, inertHtml as h } from "foldkit/html"

export const searchView = (): Html => {
    return h.div(
        [h.Class("w-full md:w-[180px] lg:w-[300px]")],
        [
            h.input([
                h.Type("search"),
                h.Placeholder("Search..."),
                h.AriaLabel("Search"),
                h.Class(
                    "h-10 w-full rounded-[var(--radius-surface)] border-(length:--field-border-width) border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring"
                ),
            ]),
        ]
    )
}
