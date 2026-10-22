/** # Search Bar view */
import { Array } from "effect"
import type { Html, HtmlBuilder } from "foldkit/html"
import {
    SearchBar,
    type SearchBarItem,
} from "@urm/ui/foldkit/search-bar.view.ts"

import type { Message } from "./search-bar.message.ts"
import {
    ChangedSearchBarQuery,
    ClickedSearchBarItem,
    ClosedSearchBar,
    MountedSearchBar,
    ToggledSearchBarIsOpen,
} from "./search-bar.message.ts"
import type { Model } from "./search-bar.model.ts"

// NOTE: sections are passed in rather than imported from the navigation
// registry, which imports this view to render the demo.
export type SearchSection = Readonly<{
    label: string
    pages: ReadonlyArray<Readonly<{ label: string; href: string }>>
}>

const toItems = (
    sections: ReadonlyArray<SearchSection>
): ReadonlyArray<SearchBarItem> =>
    Array.flatMap(sections, (section) =>
        Array.map(section.pages, (page) => ({
            group: section.label,
            title: page.label,
            href: page.href,
        }))
    )

/**
 * Open the search control and find a page by name or section. The client supplies
 * visible navigation destinations and renders the same control in its header and
 * at `/search/search-bar/`, with separate state for each instance.
 */
export const view = <ParentMessage>(
    model: Model,
    sections: ReadonlyArray<SearchSection>,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    SearchBar<ParentMessage>(
        {
            isOpen: model.isOpen,
            onMounted: toParentMessage(MountedSearchBar()),
            query: model.query,
            items: toItems(sections),
            onToggleOpen: toParentMessage(ToggledSearchBarIsOpen()),
            onClose: toParentMessage(ClosedSearchBar()),
            onQueryChanged: (value) =>
                toParentMessage(ChangedSearchBarQuery({ value })),
            onSelectItem: (href) =>
                toParentMessage(ClickedSearchBarItem({ href })),
        },
        h
    )
