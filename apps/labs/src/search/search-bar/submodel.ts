import { Effect, Option, Schema, Stream } from "effect"
import { Subscription, type Update } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import type { Html, HtmlBuilder } from "foldkit/html"
import * as SearchBar from "@urm/features/labs/search/search-bar"

export const search_bar_href = () => SearchBar.searchBarHref()
export const is_search_bar_path = SearchBar.isSearchBarPath
export const Model = Schema.Struct({
    header: SearchBar.Model,
    demo: SearchBar.Model,
})
export type Model = typeof Model.Type
export const GotHeaderMessage = taggedStruct("GotHeaderMessage", {
    message: SearchBar.Message,
})
export const GotDemoMessage = taggedStruct("GotDemoMessage", {
    message: SearchBar.Message,
})
export const Message = Schema.Union([GotHeaderMessage, GotDemoMessage])
export type Message = typeof Message.Type
export const init = (): Model => ({
    header: SearchBar.init()[0],
    demo: SearchBar.init()[0],
})
export const changed_route = (): Model => init()

export const update = (
    model: Model,
    message: Message
): Update.Return<Model, Message> => {
    if (message._tag === "GotHeaderMessage") {
        const [header] = SearchBar.update(model.header, message.message)
        return {
            model: {
                ...model,
                header,
                demo: header.isOpen ? SearchBar.init()[0] : model.demo,
            },
        }
    }
    const [demo] = SearchBar.update(model.demo, message.message)
    return {
        model: {
            ...model,
            demo,
            header: demo.isOpen ? SearchBar.init()[0] : model.header,
        },
    }
}

type NavItem = Readonly<{
    label: string
    href: string
    children?: ReadonlyArray<NavItem>
}>

// Keep the deepest label when a group and its only demo share a destination.
export const search_sections = (
    items: ReadonlyArray<NavItem>
): ReadonlyArray<SearchBar.SearchSection> => {
    const pages = new Map<
        string,
        Readonly<{ group: string; label: string; href: string }>
    >()
    const visit = (items: ReadonlyArray<NavItem>, group: string): void => {
        for (const item of items) {
            pages.set(item.href, { group, label: item.label, href: item.href })
            if (item.children)
                visit(
                    item.children,
                    group === "Pages" ? item.label : `${group} / ${item.label}`
                )
        }
    }
    visit(items, "Pages")
    const groups = new Map<
        string,
        Array<Readonly<{ label: string; href: string }>>
    >()
    for (const page of pages.values()) {
        const group = groups.get(page.group) ?? []
        group.push({ label: page.label, href: page.href })
        groups.set(page.group, group)
    }
    return [...groups].map(([label, pages]) => ({ label, pages }))
}

export const handle_keyboard_event = (
    event: Pick<
        KeyboardEvent,
        | "defaultPrevented"
        | "repeat"
        | "isComposing"
        | "altKey"
        | "ctrlKey"
        | "metaKey"
        | "key"
        | "preventDefault"
    >
): Option.Option<Message> => {
    if (
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.altKey ||
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "k"
    )
        return Option.none()
    // Let other modal surfaces retain their own keyboard interactions.
    if (
        typeof document !== "undefined" &&
        document.querySelector("dialog[open]:not([data-page-search])")
    )
        return Option.none()
    event.preventDefault()
    return Option.some(
        GotHeaderMessage({ message: { _tag: "ToggledSearchBarIsOpen" } })
    )
}

export const subscriptions = Subscription.make<Model, Message>()(() => ({
    page_search_keyboard: Subscription.persistentEntry(
        Stream.unwrap(
            Effect.sync(() =>
                Stream.fromEventListener<KeyboardEvent>(
                    document,
                    "keydown"
                ).pipe(
                    Stream.map(handle_keyboard_event),
                    Stream.filter(Option.isSome),
                    Stream.map((message) => message.value)
                )
            )
        )
    ),
}))

export const header_view = <ParentMessage>(
    model: Model,
    sections: ReadonlyArray<SearchBar.SearchSection>,
    to_parent: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    SearchBar.view(
        model.header,
        sections,
        (message) => to_parent(GotHeaderMessage({ message })),
        h
    )

export const view = <ParentMessage>(
    model: Model,
    sections: ReadonlyArray<SearchBar.SearchSection>,
    to_parent: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.section(
        [
            h.Class(
                "mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"
            ),
        ],
        [
            h.div(
                [h.Class("space-y-2")],
                [
                    h.h1([h.Class("text-2xl font-semibold")], ["Search Bar"]),
                    h.p(
                        [h.Class("text-muted-foreground")],
                        [
                            "Find a page by name or section, then select a result to open it.",
                        ]
                    ),
                ]
            ),
            SearchBar.view(
                model.demo,
                sections,
                (message) => to_parent(GotDemoMessage({ message })),
                h
            ),
            h.p(
                [h.Class("text-sm text-muted-foreground")],
                [
                    "Press Ctrl+K or ⌘K to open header search from any page. Use Tab to move through results, Enter to open a page, and Escape to close.",
                ]
            ),
        ]
    )
