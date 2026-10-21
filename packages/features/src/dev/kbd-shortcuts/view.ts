/** # Keyboard Shortcuts view */
import { Array, Option, String } from "effect"
import { inertHtml } from "foldkit/html"
import type { Html, HtmlBuilder } from "foldkit/html"

import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@urm/ui/foldkit/data-table.view.ts"

import type { AppId, Shortcut } from "./data.ts"
import { shortcutApps, shortcuts } from "./data.ts"
import { ChangedSearchInput, ClickedClearSearch } from "./message.ts"
import type { Message } from "./message.ts"
import type { Model } from "./model.ts"

const cardClass =
    "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-card text-card-foreground [box-shadow:var(--shadow-surface)]"

const controlClass =
    "w-full rounded-[var(--radius-control)] border-(length:--field-border-width) border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"

const kbdClass =
    "rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground"

const commandCellClass = "p-2 align-middle text-sm text-foreground"

const matchedCellClass = `${commandCellClass} bg-primary/10`

const unboundCellClass = `${commandCellClass} text-muted-foreground/60`

const commandFor = (shortcut: Shortcut, app: AppId): Option.Option<string> =>
    shortcut.commands[app]

const matchesQuery = (command: string, query: string): boolean =>
    String.toLowerCase(command).includes(query)

// The search runs over the command descriptions only, so "save" surfaces
// every combo that saves something in at least one app, whatever its keys.
const shortcutMatches = (shortcut: Shortcut, query: string): boolean =>
    Array.some(shortcutApps, (app) =>
        Option.match(commandFor(shortcut, app.id), {
            onNone: () => false,
            onSome: (command) => matchesQuery(command, query),
        })
    )

const filterShortcuts = (query: string): ReadonlyArray<Shortcut> =>
    query === ""
        ? shortcuts
        : Array.filter(shortcuts, (shortcut) =>
              shortcutMatches(shortcut, query)
          )

const keyCombinationView = (keys: ReadonlyArray<string>): Html => {
    const h = inertHtml

    return h.div(
        [h.Class("flex items-center gap-1 whitespace-nowrap")],
        Array.flatMap(keys, (key, index) =>
            index === 0
                ? [h.kbd([h.Class(kbdClass)], [key])]
                : [
                      h.span(
                          [h.Class("text-[10px] text-muted-foreground")],
                          ["+"]
                      ),
                      h.kbd([h.Class(kbdClass)], [key]),
                  ]
        )
    )
}

const commandCellView = (shortcut: Shortcut, app: AppId, query: string): Html =>
    Option.match(commandFor(shortcut, app), {
        onNone: () =>
            TableCell({
                class: unboundCellClass,
                children: ["—"],
            }),
        onSome: (command) =>
            TableCell({
                class:
                    query !== "" && matchesQuery(command, query)
                        ? matchedCellClass
                        : commandCellClass,
                children: [command],
            }),
    })

const shortcutRowView = (shortcut: Shortcut, query: string): Html =>
    TableRow({
        key: Array.join(shortcut.keys, "+"),
        children: [
            TableCell({
                class: "p-2 align-middle",
                children: [keyCombinationView(shortcut.keys)],
            }),
            ...Array.map(shortcutApps, (app) =>
                commandCellView(shortcut, app.id, query)
            ),
        ],
    })

const shortcutTableView = (
    rows: ReadonlyArray<Shortcut>,
    query: string
): Html => {
    const h = inertHtml

    return Table({
        class: "border-collapse",
        children: [
            TableCaption({
                children: [
                    "The same chord, read four different ways. Empty cells are combos the app leaves unbound.",
                ],
            }),
            TableHeader({
                class: "border-b-(length:--surface-border-width) border-border bg-muted/40",
                children: [
                    h.tr(
                        [],
                        [
                            TableHead({
                                class: "text-foreground",
                                children: ["Key combo"],
                            }),
                            ...Array.map(shortcutApps, (app) =>
                                TableHead({
                                    class: "text-foreground",
                                    children: [app.label],
                                })
                            ),
                        ]
                    ),
                ],
            }),
            TableBody({
                children: Array.map(rows, (shortcut) =>
                    shortcutRowView(shortcut, query)
                ),
            }),
        ],
    })
}

const emptyView = (): Html => {
    const h = inertHtml

    return h.div(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-dashed border-border bg-card p-8 text-center text-muted-foreground"
            ),
        ],
        ["No shortcut description matches that search."]
    )
}

/**
 * Search the shortcut catalogue by application, command, or key sequence. The
 * filtered reference is derived directly from the search value in the model.
 */
export const view = <ParentMessage>(
    model: Model,
    toParentMessage: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>
): Html => {
    const query = String.toLowerCase(model.search)
    const visibleShortcuts = filterShortcuts(query)
    const totalCount = Array.length(shortcuts)
    const visibleCount = Array.length(visibleShortcuts)

    return h.div(
        [h.Class("space-y-6")],
        [
            h.div(
                [h.Class("space-y-2")],
                [
                    h.h1(
                        [
                            h.Class(
                                "text-3xl font-bold tracking-tight text-foreground"
                            ),
                        ],
                        ["Keyboard Shortcuts"]
                    ),
                    h.p(
                        [
                            h.Class(
                                "max-w-2xl text-sm leading-6 text-muted-foreground"
                            ),
                        ],
                        [
                            'One key combo per row, and what each app does with it. Search matches the command descriptions, not the keys — type "save" to find every combo that saves in any app.',
                        ]
                    ),
                ]
            ),
            h.div(
                [h.Class(`${cardClass} grid gap-4 p-4 md:grid-cols-3`)],
                [
                    h.div(
                        [h.Class("space-y-2 md:col-span-2")],
                        [
                            h.label(
                                [
                                    h.Class(
                                        "block text-sm font-medium text-foreground"
                                    ),
                                    h.For("dev-kbd-shortcuts-search"),
                                ],
                                ["Filter by command"]
                            ),
                            h.input([
                                h.Id("dev-kbd-shortcuts-search"),
                                h.Type("search"),
                                h.Value(model.search),
                                h.Placeholder(
                                    "Try save, undo, history, close..."
                                ),
                                h.Class(controlClass),
                                h.OnInput((value) =>
                                    toParentMessage(
                                        ChangedSearchInput({ value })
                                    )
                                ),
                            ]),
                        ]
                    ),
                    h.div(
                        [
                            h.Class(
                                "flex items-end justify-between gap-3 text-sm text-muted-foreground"
                            ),
                        ],
                        [
                            h.span(
                                [],
                                [
                                    `Showing ${visibleCount} of ${totalCount} shortcuts`,
                                ]
                            ),
                            h.button(
                                [
                                    h.Type("button"),
                                    h.Disabled(model.search === ""),
                                    h.OnClick(
                                        toParentMessage(ClickedClearSearch())
                                    ),
                                    h.Class(
                                        "rounded-[var(--radius-control)] border-(length:--control-outline-border-width) border-border px-3 py-1.5 text-sm text-foreground transition hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 [box-shadow:var(--shadow-control)]"
                                    ),
                                ],
                                ["Clear"]
                            ),
                        ]
                    ),
                ]
            ),
            Array.match(visibleShortcuts, {
                onEmpty: () => emptyView(),
                onNonEmpty: (rows) =>
                    h.div(
                        [h.Class(`${cardClass} p-4`)],
                        [shortcutTableView(rows, query)]
                    ),
            }),
        ]
    )
}
